# CLAUDE.md — Allegro Launch Kit

This file is read by Claude Code at the start of every session. It contains the
project rules, current state, and things that must never be violated.

---

## What this project is

A Claude Code skill for Allegro MicroSystems that automates the first-draft
collateral every product launch creates: a customer FAQ and an FAE design-in
checklist. Built as an interview prototype for the Allegro CTO (Jamie Haas).

**Interview narrative:** the ACS37017 is the new part being launched (no public
datasheet yet). The ACS37002 is the fully published part used as the development
and regression target — same sensor family, same pipeline.

---

## The one rule that cannot be bent

**Every numeric spec, qualification, package detail, or capability claim in any
output MUST come only from `specs.json`, which was itself extracted only from the
source datasheet PDF by `scripts/extract_specs.py`.**

- No filling in specs from memory, prior knowledge, or part-number conventions.
- No rounding, inferring, or "this is typically X for this family."
- If a value is not in `specs.json` high-confidence entries, emit
  `[UNVERIFIED — needs human: <what's missing>]` — never a plausible substitute.
- Cite every claim: `[datasheet p.X / table Y]`.

`scripts/verify.py` enforces this mechanically. A verify PASS is required before
any collateral is shown to a human. If verify FAILS, fix the output — don't touch
verify.py's logic to make it pass.

---

## Current pipeline state

```
datasheets/
  ACS37002-datasheet.pdf   ← primary dev target (208 specs extracted)
  ACS712-datasheet.pdf     ← regression
  ACS722-datasheet.pdf     ← regression
  ACS730-datasheet.pdf     ← regression
  ACS758-datasheet.pdf     ← regression

specs.json                 ← generated from ACS37002 (159 high-conf, 49 low-conf)

out_faq.md                 ← generated, verify PASS (41/41 claims traced, 6 UNVERIFIED)
out_fae_checklist.md       ← generated, verify PASS (35/35 claims traced, 9 UNVERIFIED)
out_faq.docx               ← rendered from out_faq.md (post-verify)
out_fae_checklist.docx     ← rendered from out_fae_checklist.md (post-verify)

demo_script.md             ← 60-second live demo narration (planted-error catch)
```

**To regenerate specs.json from scratch:**
```bash
python3 scripts/extract_specs.py datasheets/ACS37002-datasheet.pdf -o specs.json
```

**To run the full pipeline for a new datasheet:**
```bash
python3 scripts/extract_specs.py datasheets/<PART>-datasheet.pdf -o specs.json
# review specs.json — check low-confidence entries
# generate out_faq.md and out_fae_checklist.md using templates/ and specs.json only
python3 scripts/verify.py specs.json out_faq.md out_fae_checklist.md
# optional: render to Word (only after verify exits 0)
python3 scripts/render_docx.py out_faq.md out_faq.docx --verified
python3 scripts/render_docx.py out_fae_checklist.md out_fae_checklist.docx --verified
```

**To run regression tests (run this before committing any extractor changes):**
```bash
python3 scripts/regression_test.py           # summary
python3 scripts/regression_test.py --verbose # all checks
```
All 25 checks (5 datasheets × L1/L2/L3) should pass.

---

## What each script does

### `scripts/extract_specs.py`
PDF → `specs.json`. Uses pdfplumber table extraction with column-header-aware
parsing (detects Min/Typ/Max/AbsMax columns by header text). Falls back to
text-scan for lines that match `PARAM_KEYWORDS` when tables are absent or malformed.
Flags anything ambiguous as `confidence: "low"` — never silently drops it.

Key design decisions:
- **Typ-first value selection**: tries Typ column → AbsMax → Max → Min. Typ is
  empty ("–") for error specs so it naturally falls through to AbsMax (the headline
  limit). Nominal specs (sensitivity, VCC) have Typ populated so they return Typ.
- **`±` stripping**: `±1.5%` stored as `1.5 %`; raw_context preserves the `±`.
- **Range values**: `"–40 to 150"` → stores the max (`150`); raw_context shows full range.
- **Dedup key**: `(first-two-words-of-param, value, unit)` — prevents collapsing
  distinct parameters that share a value while still collapsing table-vs-text-scan
  duplicates of the same fact.

### `scripts/verify.py`
Scans every `value+unit` token in generated `.md` files and checks it exists in
`specs.json`. Any token inside an `[UNVERIFIED ...]` block is exempt. Exit code 0
= clean; 1 = untraceable claims found.

The unit regex ordering in `verify.py` must stay in sync with `UNIT_PATTERN` in
`extract_specs.py` (longer alternatives before shorter: `mV/A` before `mV`, `°C/W`
before `°C`). If you update one, update the other.

**Exception:** bare `%` is in verify.py's `NUM_UNIT` but NOT in extract_specs.py's
`UNIT_PATTERN`. This is intentional: percent specs arrive via table column extraction
(not text-scan), so UNIT_PATTERN doesn't need `%`. But verify must check `%` claims
in output, so NUM_UNIT includes it (after `%FS` to respect longer-first ordering).

Output rendering: verify.py now produces a designed report — color-coded PASS/FAIL,
`N/N claims traced` tally, and for each failure a diff showing `claims X ↳ datasheet
says Y [source]`. Use `--html` for a self-contained HTML report; `--no-color` to
suppress ANSI codes.

### `scripts/render_docx.py`
Converts a **verified** Markdown collateral file to a structured `.docx`. Requires
`--verified` flag — refuses to render without it.

**Ordering rule (enforced by --verified):** verify on the Markdown first, then render.
The DOCX step is always last. Never run verify on the DOCX; never skip verify before
rendering. The conversion preserves every number, citation, and `[UNVERIFIED]` marker
exactly as they appear in the Markdown.

What the output contains:
- DRAFT banner at the top with date and file name.
- Real Word headings (H1/H2/H3), bulleted lists, and a spec table (not flat text).
- Citations `[datasheet p.X / table Y]` rendered as grey 9pt italic inline.
- `[UNVERIFIED — needs human: ...]` markers rendered bold with yellow highlight —
  visually prominent so a reviewer cannot miss them.
- Checkbox list items (`- [ ]`) rendered with ☐ prefix in the Word bullet list.

The output is still a DRAFT FOR REVIEW — the annotations are intentionally preserved
so the human reviewer can see exactly which gaps remain. Do not strip them.

### `scripts/regression_test.py`
Three-level suite across all datasheets in `datasheets/`. See `README.md` for
level descriptions. The L3 spot-check values are manually verified from the PDFs —
they are ground truth, not computed.

---

## Extractor known limitations (honest, not hidden)

| Limitation | Effect | Where it shows |
|---|---|---|
| Text-scan captures test conditions | Low-conf noise (e.g., "T = 25°C") | flagged entries in specs.json |
| `±` stripped from stored value | Magnitude only; sign lost in value field | raw_context preserves it |
| Range values → max only | Min bound of temp range not a standalone spec | raw_context shows full range |
| verify.py checks presence not correctness | A wrong-column value that dedupes still passes | L3 regression catches this |
| Multi-variant parts → many sensitivity rows | Large specs.json, many mV/A values | all correct; pick the relevant one |

---

## What not to do in this project

- **Do not invent specs.** Not even plausible ones. Not even "typically X for this
  family." The entire value of this tool is that it cannot bluff.
- **Do not loosen the grounding rules** to get a cleaner-looking output. An
  [UNVERIFIED] marker is not a failure — it is the correct honest output.
- **Do not edit verify.py logic to make a failing output pass.** Fix the output.
- **Do not add numbers to collateral that came from your training data** about the
  ACS37002 or any Allegro part. specs.json is the only allowed source.
- **Do not commit datasheets to git** — PDFs are large binaries. The datasheets/
  folder is intentionally not tracked.
