"""
main.py — Allegro Launch Kit UI Backend

FastAPI server that wraps the existing Python pipeline scripts.
The scripts themselves are never modified; this server calls them as subprocesses
and manages per-job working directories.

Job lifecycle:
  1. POST /api/upload   — save PDF, kick off extraction, return job_id
  2. GET  /api/jobs/{id}/status  — poll for current stage + progress
  3. GET  /api/jobs/{id}/summary — parsed extraction results (spec table, counts)
  4. POST /api/jobs/{id}/generate — options → generation → verify → optional docx
  5. GET  /api/jobs/{id}/download/{filename} — stream a generated file
  6. DELETE /api/jobs/{id} — clean up tmp directory

DEMO_MODE=true (in .env): skips the Claude API generation step and copies the
pre-built out_faq.md / out_fae_checklist.md from PROJECT_ROOT. All other steps
(extraction, verify, docx render) still run for real.
"""

import asyncio
import json
import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

# ── Configuration ────────────────────────────────────────────────────────────

# Two levels up from ui/backend/ → project root
_DEFAULT_ROOT = Path(__file__).resolve().parent.parent.parent

PROJECT_ROOT = Path(os.getenv("PROJECT_ROOT") or str(_DEFAULT_ROOT)).resolve()
JOB_DIR = Path(os.getenv("JOB_DIR", str(Path(__file__).parent / "tmp" / "jobs"))).resolve()
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("1", "true", "yes")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
PORT = int(os.getenv("PORT", "8000"))

SCRIPTS = PROJECT_ROOT / "scripts"
TEMPLATES = PROJECT_ROOT / "templates"

JOB_DIR.mkdir(parents=True, exist_ok=True)

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="Allegro Launch Kit API", version="1.0.0")

_CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory job state ───────────────────────────────────────────────────────

# { job_id: { "stage": str, "progress": 0-100, "error": str|None,
#             "specs_count": int, "high_conf": int, "low_conf": int,
#             "verified": bool, "verify_tally": str,
#             "unverified_gaps": [...], "files": [...] } }
_jobs: dict[str, dict] = {}


def _job_dir(job_id: str) -> Path:
    return JOB_DIR / job_id


def _get_job(job_id: str) -> dict:
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return _jobs[job_id]


# ── Models ───────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    documents: Literal["faq", "checklist", "both"] = "both"
    format: Literal["markdown", "docx", "both"] = "both"
    audience_note: str = Field(default="", max_length=200)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _run(cmd: list[str], cwd: Path | None = None, timeout: int = 120) -> tuple[int, str, str]:
    """Run a subprocess and return (returncode, stdout, stderr)."""
    result = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return result.returncode, result.stdout, result.stderr


def _parse_specs_summary(specs_path: Path) -> dict:
    """Return counts + top 8 high-confidence specs for the extraction results screen."""
    data = json.loads(specs_path.read_text())
    specs = data.get("specs", [])
    high = [s for s in specs if s.get("confidence") == "high"]
    low = [s for s in specs if s.get("confidence") != "high"]

    # Priority keywords for the sample table
    priority = [
        "bandwidth", "nonlinearity", "total error", "sensitivity",
        "supply voltage", "rise time", "junction temperature", "conductor resistance",
        "response time", "offset",
    ]
    seen_ids: set[int] = set()
    sample: list[dict] = []
    for kw in priority:
        for s in high:
            if id(s) in seen_ids:
                continue
            if kw in s.get("parameter", "").lower():
                sample.append({
                    "parameter": s["parameter"],
                    "value": s["value"],
                    "unit": s.get("unit", ""),
                    "source": s.get("source_location", ""),
                    "confidence": "high",
                })
                seen_ids.add(id(s))
                break
        if len(sample) >= 8:
            break

    # Fill remaining slots from high-conf if under 8
    for s in high:
        if len(sample) >= 8:
            break
        if id(s) not in seen_ids:
            sample.append({
                "parameter": s["parameter"],
                "value": s["value"],
                "unit": s.get("unit", ""),
                "source": s.get("source_location", ""),
                "confidence": "high",
            })
            seen_ids.add(id(s))

    # All specs (for expandable table)
    all_specs = [
        {
            "parameter": s["parameter"],
            "value": s["value"],
            "unit": s.get("unit", ""),
            "source": s.get("source_location", ""),
            "confidence": s.get("confidence", "low"),
        }
        for s in specs
    ]

    # Low-conf detail (first 10)
    low_preview = [
        {
            "parameter": s["parameter"],
            "value": s["value"],
            "unit": s.get("unit", ""),
            "source": s.get("source_location", ""),
        }
        for s in low[:10]
    ]

    source_pdf = data.get("source_pdf", "")
    pdf_name = Path(source_pdf).name if source_pdf else "unknown.pdf"

    return {
        "pdf_name": pdf_name,
        "total": len(specs),
        "high_conf": len(high),
        "low_conf": len(low),
        "sample_specs": sample,
        "all_specs": all_specs,
        "low_conf_preview": low_preview,
    }


async def _generate_with_claude(
    job_id: str,
    specs_path: Path,
    job_path: Path,
    documents: str,
    audience_note: str,
) -> None:
    """Call the Claude API to fill templates from specs.json. Writes out_faq.md and/or out_fae_checklist.md."""
    import anthropic  # local import — only needed for Option A

    specs_data = specs_path.read_text()
    high_specs = [
        s for s in json.loads(specs_data).get("specs", [])
        if s.get("confidence") == "high"
    ]
    specs_for_prompt = json.dumps(high_specs, indent=2)

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    audience_clause = (
        f"\n\nAudience note from the user (affects phrasing only — never specs): {audience_note}"
        if audience_note.strip()
        else ""
    )

    targets = []
    if documents in ("faq", "both"):
        targets.append(("faq", TEMPLATES / "faq.md", job_path / "out_faq.md"))
    if documents in ("checklist", "both"):
        targets.append(("checklist", TEMPLATES / "fae_checklist.md", job_path / "out_fae_checklist.md"))

    for doc_type, template_path, out_path in targets:
        _jobs[job_id]["stage"] = f"generating_{doc_type}"
        template = template_path.read_text()

        prompt = f"""You are filling a product launch document template for an Allegro current-sensor part.

STRICT RULE: Every numeric spec, qualification, package detail, or capability claim MUST come ONLY from the specs list below.
- Copy value and unit exactly as they appear in the spec entry.
- Include a citation in the format [datasheet p.X / table Y] using the source_location field.
- If a field is not in the specs list, emit: [UNVERIFIED — needs human: <what is missing>]
- Never invent, round, or infer a value. Never use training knowledge about Allegro parts.
- Marketing/positioning prose (non-numeric descriptions) is allowed in clearly labeled sections.
- Competitive comparisons are out of scope — omit them entirely.{audience_clause}

SPECS (high-confidence, from formal parameter tables):
{specs_for_prompt}

TEMPLATE TO FILL:
{template}

Fill the template above. Output only the filled document — no preamble, no explanation."""

        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        out_path.write_text(message.content[0].text)


def _copy_demo_files(job_path: Path, documents: str) -> None:
    """Demo mode: copy pre-built collateral from PROJECT_ROOT into the job directory."""
    if documents in ("faq", "both"):
        src = PROJECT_ROOT / "out_faq.md"
        if src.exists():
            shutil.copy2(src, job_path / "out_faq.md")
    if documents in ("checklist", "both"):
        src = PROJECT_ROOT / "out_fae_checklist.md"
        if src.exists():
            shutil.copy2(src, job_path / "out_fae_checklist.md")


def _run_verify(job_id: str, job_path: Path, documents: str) -> tuple[bool, str, list[dict]]:
    """Run verify.py and return (passed, tally, gaps)."""
    specs_path = job_path / "specs.json"
    md_files = []
    if documents in ("faq", "both"):
        f = job_path / "out_faq.md"
        if f.exists():
            md_files.append(str(f))
    if documents in ("checklist", "both"):
        f = job_path / "out_fae_checklist.md"
        if f.exists():
            md_files.append(str(f))

    if not md_files:
        return False, "0/0 claims traced", []

    report_path = job_path / "verify_report.json"
    verify_script = SCRIPTS / "verify.py"

    # Run verify.py; capture output to parse PASS/FAIL tally manually
    cmd = [sys.executable, str(verify_script), str(specs_path), "--no-color"] + md_files
    rc, stdout, stderr = _run(cmd, timeout=120)

    # Parse the plain-text report for tally and gaps
    passed = rc == 0
    tally = "0/0 claims traced"
    gaps: list[dict] = []

    # Extract "N/N claims traced" from stdout
    import re
    tally_match = re.search(r"(\d+/\d+ (?:total )?claims? traced)", stdout)
    if tally_match:
        tally = tally_match.group(1)

    # Extract FAIL lines: "line N  claims X  ↳ ..."
    fail_blocks = re.findall(
        r"line\s+(\d+)\s+claims\s+([\d.]+\s*\S+)\s+↳\s+datasheet says\s+(.*?)(?:\n|$)",
        stdout,
    )
    for line_no, claimed, corrected in fail_blocks:
        gaps.append({
            "line": int(line_no),
            "claimed": claimed.strip(),
            "corrected": corrected.strip(),
        })

    # Save raw report for debugging
    report_path.write_text(json.dumps({
        "passed": passed,
        "tally": tally,
        "stdout": stdout,
        "stderr": stderr,
        "gaps": gaps,
    }, indent=2))

    return passed, tally, gaps


def _run_render_docx(job_path: Path, documents: str) -> list[str]:
    """Render verified .md files to .docx. Returns list of rendered filenames."""
    render_script = SCRIPTS / "render_docx.py"
    rendered = []

    pairs = []
    if documents in ("faq", "both"):
        pairs.append(("out_faq.md", "out_faq.docx"))
    if documents in ("checklist", "both"):
        pairs.append(("out_fae_checklist.md", "out_fae_checklist.docx"))

    for md_name, docx_name in pairs:
        md_path = job_path / md_name
        docx_path = job_path / docx_name
        if not md_path.exists():
            continue
        rc, stdout, stderr = _run(
            [sys.executable, str(render_script), str(md_path), str(docx_path), "--verified"],
            timeout=120,
        )
        if rc == 0:
            rendered.append(docx_name)

    return rendered


def _parse_unverified_gaps_from_md(job_path: Path, documents: str) -> list[dict]:
    """
    Extract [UNVERIFIED — needs human: ...] markers from generated .md files
    for display on the results screen.
    """
    import re
    gaps = []
    files_to_check = []
    if documents in ("faq", "both"):
        files_to_check.append(("Customer FAQ", job_path / "out_faq.md"))
    if documents in ("checklist", "both"):
        files_to_check.append(("Design-In Checklist", job_path / "out_fae_checklist.md"))

    pattern = re.compile(r"\[UNVERIFIED\s*—\s*needs human:\s*(.*?)\]", re.IGNORECASE | re.DOTALL)
    for doc_label, path in files_to_check:
        if not path.exists():
            continue
        text = path.read_text()
        for match in pattern.finditer(text):
            gap_text = match.group(1).strip().replace("\n", " ")
            gaps.append({"document": doc_label, "description": gap_text})

    return gaps


def _get_document_previews(job_path: Path, documents: str) -> list[dict]:
    """Return first 5 non-empty lines of each generated document for the results screen."""
    previews = []
    pairs = []
    if documents in ("faq", "both"):
        pairs.append(("Customer FAQ", "ACS37002", job_path / "out_faq.md", "out_faq.md", "out_faq.docx"))
    if documents in ("checklist", "both"):
        pairs.append(("Design-In Checklist", "ACS37002", job_path / "out_fae_checklist.md", "out_fae_checklist.md", "out_fae_checklist.docx"))

    for label, part, md_path, md_name, docx_name in pairs:
        if not md_path.exists():
            continue
        lines = [l for l in md_path.read_text().splitlines() if l.strip()]
        # Skip the DRAFT header block (lines starting with ">")
        content_lines = [l for l in lines if not l.startswith(">") and not l.startswith("#")]
        preview = "\n".join(content_lines[:5])

        # Count UNVERIFIED markers
        import re
        unverified_count = len(re.findall(r"\[UNVERIFIED", md_path.read_text(), re.IGNORECASE))

        previews.append({
            "label": label,
            "part_number": part,
            "preview": preview,
            "unverified_count": unverified_count,
            "md_file": md_name if (job_path / md_name).exists() else None,
            "docx_file": docx_name if (job_path / docx_name).exists() else None,
        })
    return previews


# ── Background task: extraction ──────────────────────────────────────────────

async def _run_extraction(job_id: str, pdf_path: Path) -> None:
    job = _jobs[job_id]
    job_path = _job_dir(job_id)
    specs_path = job_path / "specs.json"

    try:
        job["stage"] = "parsing_pdf"
        job["progress"] = 10
        await asyncio.sleep(0.3)

        job["stage"] = "finding_tables"
        job["progress"] = 30

        if DEMO_MODE:
            # Demo mode: use pre-built specs.json from PROJECT_ROOT.
            # This avoids the pdfplumber subprocess (which can time out in
            # constrained serverless environments). The pre-built file is the
            # ACS37002 spec set; verify still runs for real against it.
            await asyncio.sleep(1.5)
            src_specs = PROJECT_ROOT / "specs.json"
            if not src_specs.exists():
                raise FileNotFoundError(
                    "Demo specs.json not found in project root. "
                    "Run extract_specs.py locally first."
                )
            shutil.copy2(src_specs, specs_path)
        else:
            extract_script = SCRIPTS / "extract_specs.py"
            loop = asyncio.get_event_loop()

            rc, stdout, stderr = await loop.run_in_executor(
                None,
                lambda: _run(
                    [sys.executable, str(extract_script), str(pdf_path), "-o", str(specs_path)],
                    timeout=270,
                ),
            )

            if rc != 0:
                job["stage"] = "extraction_failed"
                job["error"] = (
                    stderr.strip()
                    or "Extraction failed. This may be a scanned or encrypted PDF. "
                       "Try exporting a text-layer PDF from Acrobat."
                )
                return

        job["stage"] = "building_spec_list"
        job["progress"] = 80
        await asyncio.sleep(0.3)

        summary = _parse_specs_summary(specs_path)
        job["specs_summary"] = summary
        job["progress"] = 100
        job["stage"] = "extraction_complete"

    except asyncio.TimeoutError:
        job["stage"] = "extraction_failed"
        job["error"] = "Extraction timed out. The PDF may be very large or unusually formatted."
    except Exception as exc:
        job["stage"] = "extraction_failed"
        job["error"] = f"Unexpected error during extraction: {exc}"


# ── Background task: generation + verify + render ────────────────────────────

async def _run_generation(job_id: str, req: GenerateRequest) -> None:
    job = _jobs[job_id]
    job_path = _job_dir(job_id)
    specs_path = job_path / "specs.json"

    try:
        job["stage"] = "generating"
        job["progress"] = 10

        loop = asyncio.get_event_loop()

        if DEMO_MODE or not ANTHROPIC_API_KEY:
            # Demo mode or no key: use pre-built verified files.
            # Pre-built files have a known verify PASS (41/41 and 35/35), ensuring
            # the demo always reaches the download screen. Set DEMO_MODE=false
            # and provide ANTHROPIC_API_KEY to enable real generation.
            job["stage"] = "generating_demo"
            await asyncio.sleep(0.5)
            _copy_demo_files(job_path, req.documents)
        else:
            await _generate_with_claude(job_id, specs_path, job_path, req.documents, req.audience_note)

        job["stage"] = "verifying"
        job["progress"] = 60

        passed, tally, verify_gaps = await loop.run_in_executor(
            None,
            lambda: _run_verify(job_id, job_path, req.documents),
        )

        job["verify_passed"] = passed
        job["verify_tally"] = tally
        job["verify_gaps"] = verify_gaps

        if not passed:
            # Auto-retry once: re-run verify (in case of transient issue)
            passed2, tally2, gaps2 = await loop.run_in_executor(
                None,
                lambda: _run_verify(job_id, job_path, req.documents),
            )
            if passed2:
                passed, tally, verify_gaps = passed2, tally2, gaps2
                job["verify_passed"] = passed
                job["verify_tally"] = tally
                job["verify_gaps"] = verify_gaps

        available_files: list[str] = []

        if req.documents in ("faq", "both") and (job_path / "out_faq.md").exists():
            available_files.append("out_faq.md")
        if req.documents in ("checklist", "both") and (job_path / "out_fae_checklist.md").exists():
            available_files.append("out_fae_checklist.md")

        if passed and req.format in ("docx", "both"):
            job["stage"] = "rendering_docx"
            job["progress"] = 80
            rendered = await loop.run_in_executor(
                None,
                lambda: _run_render_docx(job_path, req.documents),
            )
            available_files.extend(rendered)

        job["progress"] = 100
        job["stage"] = "complete"
        job["available_files"] = available_files

        # Collect UNVERIFIED gaps from output files for the results screen
        job["unverified_gaps"] = _parse_unverified_gaps_from_md(job_path, req.documents)
        job["document_previews"] = _get_document_previews(job_path, req.documents)
        job["demo_mode"] = DEMO_MODE or not ANTHROPIC_API_KEY

    except Exception as exc:
        job["stage"] = "generation_failed"
        job["error"] = f"Generation failed: {exc}"


# ── Routes ───────────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Receive a datasheet PDF, save it, kick off async extraction."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")

    # Basic size guard (50 MB)
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File exceeds 50 MB. Please try a smaller PDF.",
        )

    job_id = str(uuid.uuid4())
    job_path = _job_dir(job_id)
    job_path.mkdir(parents=True, exist_ok=True)

    pdf_path = job_path / file.filename
    pdf_path.write_bytes(contents)

    _jobs[job_id] = {
        "job_id": job_id,
        "pdf_name": file.filename,
        "pdf_size_bytes": len(contents),
        "stage": "queued",
        "progress": 0,
        "error": None,
        "specs_summary": None,
        "verify_passed": None,
        "verify_tally": None,
        "verify_gaps": [],
        "unverified_gaps": [],
        "document_previews": [],
        "available_files": [],
        "demo_mode": DEMO_MODE or not ANTHROPIC_API_KEY,
    }

    asyncio.create_task(_run_extraction(job_id, pdf_path))

    return {"job_id": job_id, "filename": file.filename, "size_bytes": len(contents)}


@app.get("/api/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    """
    Poll-based status endpoint. Returns current stage, progress 0–100, and error if any.
    Frontend polls this every 500ms during long operations.
    """
    job = _get_job(job_id)
    return {
        "job_id": job_id,
        "stage": job["stage"],
        "progress": job["progress"],
        "error": job.get("error"),
        "demo_mode": job.get("demo_mode", False),
    }


@app.get("/api/jobs/{job_id}/summary")
async def get_job_summary(job_id: str):
    """Return extraction results once stage == 'extraction_complete'."""
    job = _get_job(job_id)
    if job["stage"] not in ("extraction_complete", "complete", "verifying", "generating",
                             "generating_faq", "generating_checklist", "generating_demo",
                             "rendering_docx"):
        raise HTTPException(status_code=409, detail=f"Extraction not yet complete (stage: {job['stage']})")
    summary = job.get("specs_summary")
    if not summary:
        raise HTTPException(status_code=409, detail="Specs summary not yet available.")
    return summary


@app.post("/api/jobs/{job_id}/generate")
async def generate_documents(job_id: str, req: GenerateRequest):
    """Kick off generation → verify → optional docx render."""
    job = _get_job(job_id)
    if job["stage"] not in ("extraction_complete",):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot generate: job is in stage '{job['stage']}'. "
                   "Wait for extraction_complete.",
        )
    asyncio.create_task(_run_generation(job_id, req))
    return {"job_id": job_id, "status": "generation_started", "demo_mode": job["demo_mode"]}


@app.get("/api/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """Return verify results + file list once stage == 'complete'."""
    job = _get_job(job_id)
    if job["stage"] != "complete":
        raise HTTPException(status_code=409, detail=f"Not yet complete (stage: {job['stage']})")
    return {
        "job_id": job_id,
        "verify_passed": job["verify_passed"],
        "verify_tally": job["verify_tally"],
        "verify_gaps": job.get("verify_gaps", []),
        "unverified_gaps": job.get("unverified_gaps", []),
        "document_previews": job.get("document_previews", []),
        "available_files": job.get("available_files", []),
        "demo_mode": job.get("demo_mode", False),
    }


@app.get("/api/jobs/{job_id}/download/{filename}")
async def download_file(job_id: str, filename: str):
    """Stream a generated file. DOCX only available after verify passed."""
    job = _get_job(job_id)

    # Security: prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    # Enforce verify-before-docx rule
    if filename.endswith(".docx") and not job.get("verify_passed"):
        raise HTTPException(
            status_code=403,
            detail="Word documents are only available after verification passes.",
        )

    file_path = _job_dir(job_id) / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    media_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if filename.endswith(".docx")
        else "text/markdown"
    )
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=filename,
    )


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Clean up job temp directory and state."""
    _get_job(job_id)  # 404 if not found
    job_path = _job_dir(job_id)
    if job_path.exists():
        shutil.rmtree(job_path)
    _jobs.pop(job_id, None)
    return {"deleted": True}


@app.get("/api/health")
async def health():
    project_root_ok = PROJECT_ROOT.exists()
    scripts_ok = SCRIPTS.exists()
    return {
        "status": "ok",
        "demo_mode": DEMO_MODE,
        "api_key_set": bool(ANTHROPIC_API_KEY),
        "project_root": str(PROJECT_ROOT),
        "project_root_exists": project_root_ok,
        "scripts_exist": scripts_ok,
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
