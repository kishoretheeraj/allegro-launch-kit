# Allegro Launch Kit

A Claude Code skill that turns one Allegro current-sensor datasheet into two
cited, review-ready collateral drafts — a **customer FAQ** and an **FAE
design-in checklist** — without ever stating a spec it can't trace to the source.

It exists because every product launch triggers the same downstream collateral
work across applications engineering, FAE, and product marketing. This automates
the *first draft* so a human reviews-and-finishes instead of authoring from blank.

## Why it's safe to use on real specs
- Numbers come only from the datasheet, via `scripts/extract_specs.py`.
- Every claim in the output is cited to a page/section.
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
python scripts/extract_specs.py datasheets/ACS37002-datasheet.pdf -o specs.json

# 2. (Review specs.json — confirm low-confidence entries, ~10-15 min human step)

# 3. Generate collateral from specs.json into the templates
#    (done by Claude in-session, filling templates/ only from specs.json)

# 4. Verify before showing anyone
python scripts/verify.py specs.json out_faq.md out_fae_checklist.md

# 5. (Optional) Render to Word — only after verify exits 0
#    The --verified flag is your assertion that step 4 passed.
python scripts/render_docx.py out_faq.md out_faq.docx --verified
python scripts/render_docx.py out_fae_checklist.md out_fae_checklist.docx --verified
```

**Ordering rule:** extract → generate → verify (on the .md) → render to .docx.
`render_docx.py` refuses to run without `--verified`. Never verify after converting —
the DOCX is the final human-editable artifact, not the grounding source.

## Run the regression suite
```bash
python scripts/regression_test.py           # pass/fail summary
python scripts/regression_test.py --verbose # show every check
```

The suite runs three levels against five datasheets:
- **L1 Sanity** — extraction runs without error, returns specs
- **L2 Coverage** — expected parameter categories (sensitivity, bandwidth, error, etc.) appear in high-confidence specs; low-confidence ratio stays below threshold
- **L3 Accuracy** — manually-verified spot-check values (e.g., ACS712 5 A sensitivity = 185 mV/A) match the extractor output exactly

## Scope (v1)
One part, two outputs, grounding + verification. No competitive tables, no
multi-family batch. Narrow and correct beats broad and bluffing.

## Roadmap (how it scales to "hundreds of employees")
- Phase 2: FAE design-in copilot (fuse specs.json + application notes + calculators)
- Phase 3: datasheet self-consistency checker (flag table-vs-body mismatches)
The `specs.json` foundation is reused by each — author the grounded layer once,
many teams plug in.

## Files
```
allegro-launch-kit/
  SKILL.md                  # skill definition + the non-negotiable grounding rules
  scripts/
    extract_specs.py        # datasheet PDF -> sourced specs.json
    verify.py               # output .md -> pass/fail traceability gate
    regression_test.py      # three-level suite across multiple datasheets
  templates/
    faq.md
    fae_checklist.md
  datasheets/               # reference PDFs (not committed to git)
    ACS37002-datasheet.pdf  # development + regression target
    ACS712-datasheet.pdf
    ACS722-datasheet.pdf
    ACS730-datasheet.pdf
    ACS758-datasheet.pdf
  examples/                 # a worked example output
  specs.json                # generated for ACS37002 (run extract_specs.py to refresh)
  out_faq.md                # generated + verified (41/41 claims traced)
  out_faq.docx              # Word version (rendered post-verify)
  out_fae_checklist.md      # generated + verified (35/35 claims traced)
  out_fae_checklist.docx    # Word version (rendered post-verify)
  demo_script.md            # 60-second live demo narration
  README.md
```

## Extractor design notes (known limitations)
The extractor is regex + pdfplumber table parsing — not LLM-based, by design.
This makes it deterministic, auditable, and fast. Known gaps:

| Limitation | Impact | Mitigation |
|---|---|---|
| Text-scan fallback captures test conditions | Low-confidence entries (flagged) | Human review step |
| `±` values stored as magnitudes | `±1.5%` stored as `1.5%` | raw_context retains full text |
| Range values (`–40 to 85`) → max extracted | Temp range shown as upper bound only | raw_context shows full range |
| Multi-variant parts produce many sensitivity rows | Larger specs.json | All are correct; LLM picks relevant one |
| verify.py checks presence, not correctness | Wrong-column extraction still passes verify | L3 regression checks catch this |

These are honest limitations, not hidden ones. The regression suite L3 checks are
specifically designed to catch wrong-value extractions before they reach a human reviewer.
