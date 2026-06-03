# Allegro Launch Kit — UI

A polished front-end for the Allegro Launch Kit pipeline. Non-technical users (product marketing, FAEs) can upload a datasheet PDF and receive cited, verified launch collateral — no terminal required.

## Architecture

```
ui/
  backend/    FastAPI server — wraps the existing Python scripts
  frontend/   Next.js 16 + Tailwind + shadcn/ui
```

The Python engine (extract_specs.py, verify.py, render_docx.py) is never modified. The backend calls them as subprocesses.

## Quick start

### 1. Backend

```bash
cd ui/backend
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY if you have one, or leave DEMO_MODE=true

pip3 install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

The backend runs at `http://localhost:8000`. Check `GET /api/health` to verify it found the project root.

### 2. Frontend

```bash
cd ui/frontend
npm install
cp .env.local.example .env.local   # or just use the included .env.local
npm run dev
```

Open `http://localhost:3000`.

## Demo mode vs real generation

| `DEMO_MODE` | Generation | Everything else |
|-------------|-----------|----------------|
| `true` (default) | Uses pre-built `out_faq.md` / `out_fae_checklist.md` from project root | Real (extraction, verify, docx render) |
| `false` | Calls Claude API (`ANTHROPIC_API_KEY` required) | Real |

In demo mode, the document text is pre-generated. The extraction, verification, and Word rendering steps still run for real on every demo. This is disclosed in the UI footer and on the results screen.

## Grounding rules

The UI enforces the same grounding rules as the CLI:
- Word (.docx) download buttons are disabled until `verify.py` exits 0.
- The audience note field cannot inject specs — it only affects prose framing.
- `[UNVERIFIED — needs human: …]` markers are preserved exactly in all downloaded files.

## Verification plan

1. `GET /api/health` — confirm `project_root_exists: true` and `scripts_exist: true`.
2. Upload `datasheets/ACS37002-datasheet.pdf` — extraction should return 208 specs.
3. In demo mode: generation → verify PASS (41/41, 35/35) → Word downloads available.
4. Open a downloaded .docx — confirm DRAFT banner, inline citations, yellow-highlighted UNVERIFIED markers.
5. Keyboard-only: tab through all screens from upload to download without a mouse.
6. Axe / Lighthouse accessibility audit — confirm no contrast failures.
