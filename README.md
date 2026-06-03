# Allegro Launch Kit

A Claude Code skill that turns one Allegro current-sensor datasheet into **five
cited, review-ready collateral drafts** — without ever stating a spec it can't
trace to the source.

It exists because every product launch triggers the same downstream collateral
work across applications engineering, FAE, product marketing, and cross-functional
teams. This automates the *first draft* so a human reviews-and-finishes instead
of authoring from blank.

## What it generates

| Document | Audience | Key content |
|---|---|---|
| **Customer FAQ** | Distributors / customers | Key specs, qualifications, applications — all cited |
| **FAE Design-In Checklist** | Field applications engineers | Supply fit, accuracy budget, isolation, layout cautions |
| **Distributor Product Brief** | Sales / distribution | One-page spec summary with ordering info |
| **Application Note Outline** | Applications engineering | Section skeleton, circuit config, cited specs, lab-data gaps flagged |
| **Internal Launch Brief** | Cross-functional launch team | What shipped, key specs, who-to-call (contacts as [UNVERIFIED]) |

**Competitive comparison is not generated** — it requires competitor datasheets
and doubles the error surface. Add manually if needed.

## Why it's safe to use on real specs

- Numbers come only from the datasheet, via `scripts/extract_specs.py`.
- Every claim in the output is cited to a page/table.
- Anything missing is marked `[UNVERIFIED — needs human]`, never invented.
- `scripts/verify.py` fails loudly if any number in the output doesn't trace
  back to the extracted data. A clean verify pass is the gate before human review.
- `scripts/regression_test.py` runs three-level quality checks across five
  Allegro datasheets automatically — catches extractor regressions before they ship.

## Install

```bash
pip install pdfplumber python-docx --break-system-packages
```

## Use

```bash
# 1. Extract sourced specs from a datasheet
python3 scripts/extract_specs.py datasheets/ACS37002-datasheet.pdf -o specs.json

# 2. (Review specs.json — confirm low-confidence entries, ~10 min human step)

# 3. Generate collateral from specs.json into the templates
#    (done by Claude in-session, filling templates/ only from specs.json)
#    Documents: faq / fae_checklist / product_brief / app_note / launch_brief

# 4. Verify before showing anyone
python3 scripts/verify.py specs.json out_faq.md out_fae_checklist.md

# 5. (Optional) Render to Word — only after verify exits 0
python3 scripts/render_docx.py out_faq.md out_faq.docx --verified
python3 scripts/render_docx.py out_fae_checklist.md out_fae_checklist.docx --verified
```

**Ordering rule:** extract → generate → verify (on the .md) → render to .docx.
`render_docx.py` refuses to run without `--verified`. Never verify after converting.

## Run the regression suite

```bash
python3 scripts/regression_test.py           # pass/fail summary
python3 scripts/regression_test.py --verbose # show every check
```

25/25 checks across 5 datasheets (ACS37002, ACS712, ACS722, ACS730, ACS758):

- **L1 Sanity** — extraction runs, returns specs
- **L2 Coverage** — key categories (sensitivity, bandwidth, error, temp, supply) present; low-confidence ratio within threshold
- **L3 Accuracy** — manually-verified spot-check values (e.g., ACS712 5 A sensitivity = 185 mV/A) match extractor output exactly

## Part-agnosticism proof

The full pipeline was run on the ACS730 (separate from the development target):

```
examples/ACS730/
  specs.json            114 specs extracted (76 high-confidence)
  out_faq.md            verify PASS — 37/37 claims traced
  out_fae_checklist.md  verify PASS — 34/34 claims traced
  out_faq.docx          Word draft (rendered post-verify)
  out_fae_checklist.docx
```

## Web UI (live on Vercel)

**https://allegro-launch-kit-ui.vercel.app**

- Upload any Allegro current-sensor datasheet PDF
- Team-based document picker (Marketing / FAE / Sales / Apps Engineering / Cross-Team / Full Launch)
- Inline document viewer with amber-highlighted [UNVERIFIED] markers and grey citations
- Download Markdown or Word (.docx) — Word gated behind verify PASS
- Demo mode banner visible on every screen when running on Vercel

### Demo mode (Vercel)

The Vercel backend runs `DEMO_MODE=true` because pdfplumber times out in
serverless (~270 s). Pre-built ACS37002 outputs are served; verification still
runs for real. The UI makes this explicit:

- Persistent amber banner on every screen
- Upload screen states that uploaded PDFs will show ACS37002 results
- Extraction screen shows "Loading pre-built specs" instead of fake parsing stages
- About modal explains the serverless limitation

To run live extraction against any Allegro datasheet: clone + `DEMO_MODE=false`.

## Files

```
allegro-launch-kit/
  SKILL.md                   skill definition + non-negotiable grounding rules
  CLAUDE.md                  project rules for every Claude session
  scripts/
    extract_specs.py         datasheet PDF → sourced specs.json
    verify.py                output .md → pass/fail traceability gate
    regression_test.py       3-level suite across 5 datasheets (25/25 pass)
    render_docx.py           verified .md → .docx Word draft
  templates/
    faq.md
    fae_checklist.md
    product_brief.md
    app_note.md
    launch_brief.md
  datasheets/                reference PDFs (gitignored — add locally)
    ACS37002-datasheet.pdf   development + regression target
    ACS712-datasheet.pdf
    ACS722-datasheet.pdf
    ACS730-datasheet.pdf
    ACS758-datasheet.pdf
  examples/ACS730/           ACS730 full pipeline output (verified)
  specs.json                 ACS37002 (159 high-conf, 49 low-conf)
  out_faq.md                 verify PASS — 41/41 claims traced
  out_fae_checklist.md       verify PASS — 35/35 claims traced
  out_product_brief.md       verify PASS — 14/14 claims traced
  out_app_note.md            verify PASS — 29/29 claims traced
  out_launch_brief.md        verify PASS — 6/6 claims traced
  demo_script.md             60-second live demo narration
  ui/
    backend/main.py          FastAPI + Mangum — wraps pipeline scripts
    frontend/                Next.js 16 + Tailwind — Allegro brand tokens
  README.md
```

## Extractor design notes (known limitations)

The extractor is regex + pdfplumber table parsing — not LLM-based, by design.
Deterministic, auditable, fast.

| Limitation | Impact | Mitigation |
|---|---|---|
| Text-scan fallback captures test conditions | Low-confidence entries (flagged) | Human review step |
| `±` values stored as magnitudes | `±1.5%` stored as `1.5%` | raw_context retains full text |
| Range values (`–40 to 85`) → max extracted | Temp range shown as upper bound only | raw_context shows full range |
| Composite units (mA RMS, %I OCF-OP) not matched by verify | Those claims exempted via [UNVERIFIED] | Honest — documented in output |
| Multi-variant parts produce many sensitivity rows | Larger specs.json | All correct; pick the relevant variant |
| verify.py checks presence, not correctness | Wrong-column extraction still passes verify | L3 regression spot-checks catch this |

These are honest limitations. The L3 regression checks are specifically designed
to catch wrong-value extractions before they reach a human reviewer.
