---
name: allegro-launch-kit
description: "Generate first-draft launch collateral for an Allegro current-sensor product from its datasheet PDF. Produces five document types: customer FAQ, FAE design-in checklist, distributor product brief, application note outline, and internal launch brief. Every factual claim is grounded in and cited to the source datasheet; any value not found in the source is emitted as a visible [UNVERIFIED — needs human] placeholder and never invented. Use when a new or existing Allegro part needs the repetitive downstream collateral that applications engineering, FAE, product marketing, and cross-functional teams hand-build for each release."
---

# Allegro Launch Kit

## What this skill does

Turns one Allegro datasheet PDF into five cited, review-ready collateral drafts:

1. **Customer FAQ** — recurring questions a customer or distributor asks (key specs, qualifications, package, what problem it solves), each answer carrying the datasheet citation.
2. **FAE Design-In Checklist** — things a field applications engineer should confirm when helping a customer design the part in (supply range, accuracy budget, bandwidth, isolation, layout cautions), each item cited.
3. **Distributor Product Brief** — one-page spec summary with key specs table, target applications, and ordering info (all specs cited; ordering details [UNVERIFIED] until confirmed).
4. **Application Note Outline** — section skeleton for applications engineering: circuit configuration, key electrical specs table, design considerations (bandwidth, error budget, thermal), lab measurement placeholders ([UNVERIFIED]), and BOM placeholder.
5. **Internal Launch Brief** — cross-functional "who to call, what shipped" doc: part overview, key specs table, what shipped (status/date as [UNVERIFIED]), target applications, cross-team contacts ([UNVERIFIED]), milestones ([UNVERIFIED]), open questions.

It is a **drafting accelerator for review**, not a publisher. The output is designed to be *faster to verify than to rewrite*.

**Competitive comparison is deliberately out of scope.** It requires competitor datasheets and doubles the error surface. Do not generate competitor specs.

## The non-negotiable rules (this is the whole point)

These rules exist because the audience is engineers and customers who make design decisions on these numbers. A confident wrong spec is worse than a blank.

1. **Source-of-truth is the datasheet only.** Every numeric spec, qualification, package detail, or capability claim MUST come from the extracted datasheet data produced by `scripts/extract_specs.py`. Nothing is filled in from prior knowledge, part name, or training data.
2. **Cite every claim.** Each spec renders with its source location: `Sensitivity error: 1.5% [datasheet p.11 / table 2]`. No citation → the claim does not appear.
3. **Refuse rather than guess.** If a field is not in the extracted data, emit `[UNVERIFIED — needs human: <what's missing>]`. Never substitute a plausible value. Never round, infer, or "remember" a spec.
4. **Marketing/positioning language is clearly separated from specs.** Persuasive phrasing allowed only in clearly-labeled positioning sections — never attached to a number unless that exact claim is in the datasheet.
5. **verify.py is the credibility gate.** A clean PASS is required before any collateral is shown to a human. Never modify verify.py to make a failing output pass — fix the output.

## How to run it

```
1. Extract specs from the datasheet PDF:
   python3 scripts/extract_specs.py datasheets/<PART>-datasheet.pdf -o specs.json
   Output: specs.json — list of {parameter, value, unit, source_location, raw_context, confidence}.
   Anything ambiguous is flagged confidence:"low" rather than dropped silently.

2. Review specs.json briefly. (Human-in-the-loop checkpoint — ~10 min.)
   Low-confidence entries are flagged; confirm or remove before generating collateral.

3. Generate collateral by filling templates/ ONLY from specs.json fields.
   Available templates: faq.md, fae_checklist.md, product_brief.md, app_note.md, launch_brief.md
   Each filled value carries its source_location.
   Missing fields become [UNVERIFIED — needs human: <what>] markers — never a guessed value.

4. Run verify.py on the generated files:
   python3 scripts/verify.py specs.json out_faq.md [other .md files...]
   It fails loudly on any spec-like claim that does not trace to a specs.json entry.
   A clean PASS is the credibility gate before anything is shown to a human.

5. (Optional) Render to Word:
   python3 scripts/render_docx.py out_faq.md out_faq.docx --verified
   ORDERING RULE: verify on the .md first (step 4), then render. Never the reverse.
   The --verified flag is the pipeline's assertion that verify.py exited 0.
   Citations and [UNVERIFIED] markers are preserved in the Word output.

6. (Optional) Run the regression suite to confirm extractor health across datasheets:
   python3 scripts/regression_test.py   # 25/25 checks, 5 datasheets
```

## Web UI

**Live: https://allegro-launch-kit-ui.vercel.app**

The UI wraps the full pipeline:
- Upload any Allegro current-sensor datasheet PDF
- Team-based document picker maps team → document set automatically:
  - Marketing → FAQ
  - FAE → Checklist
  - Sales → Product Brief
  - Applications Engineering → Application Note Outline
  - Cross-Functional → Launch Brief
  - Full Launch → FAQ + Checklist + Product Brief
- Inline document viewer with [UNVERIFIED] highlighted amber, citations in grey italic
- Download Markdown or Word — Word gated behind verify PASS
- Competitive comparison note in picker: not generated by design

**Demo mode (Vercel):** The public deployment uses pre-built ACS37002 outputs because pdfplumber times out in serverless. A persistent amber banner makes this explicit on every screen. Verification still runs for real. Run `DEMO_MODE=false` locally for live extraction.

## Inputs

- A single Allegro datasheet PDF (published, with formal parameter tables).
  For a new part with no public datasheet: use the published datasheet of the closest
  released family member as the extraction source; frame the new part in the collateral narrative.

## Outputs

- `specs.json` — sourced spec table (foundation; reusable by downstream skills)
- `out_faq.md`, `out_fae_checklist.md`, `out_product_brief.md`, `out_app_note.md`, `out_launch_brief.md` — cited collateral drafts, verify-gated
- `.docx` files — Word versions (optional, post-verify only)
- Verifier report (PASS/FAIL + list of every untraceable claim)

## Tested datasheets (regression suite — 25/25 L1/L2/L3 passing)

- ACS37002 — primary development target (400 kHz, pin-selectable gain, 9-column performance table)
- ACS712 — older 5/20/30 A family (simpler tables, ±1.5% total output error)
- ACS722 — 3.3 V, pin-selectable bandwidth (80 kHz / 20 kHz)
- ACS730 — 1 MHz bandwidth (full pipeline run: FAQ + checklist, 71/71 claims verified)
- ACS758 — through-hole, 50–200 A range

## Guided flow (conversational walkthrough)

When a user provides a datasheet and wants to be walked through the full pipeline:

```
STEP 1 — Extract
  Run: python3 scripts/extract_specs.py <PDF_PATH> -o specs.json
  Show: total specs, high-conf count, low-conf warnings. Do NOT dump raw JSON.

STEP 2 — Ask Q1: Team / Collateral
  Ask: "Which team or document do you need?"
  Options: Marketing (FAQ) / FAE (Checklist) / Sales (Product Brief) /
           Apps Engineering (App Note) / Cross-Functional (Launch Brief) /
           Full Launch (FAQ + Checklist + Product Brief) / Custom
  Wait for answer before proceeding.

STEP 3 — Ask Q2: Format
  Ask: "Output format — Cited Markdown, Word .docx, or both?"
  Wait for answer.

STEP 4 — Ask Q3: Audience note (optional)
  Ask: "Anything to emphasize? (Press Enter to skip.)"
  IMPORTANT: affects prose framing only — never specs. Any spec the user
  mentions must still come from specs.json or be [UNVERIFIED].

STEP 5 — Generate
  Fill selected templates from specs.json ONLY.
  Every number gets a citation. Missing → [UNVERIFIED — needs human: ...].

STEP 6 — Verify
  Run: python3 scripts/verify.py specs.json <generated files>
  If FAIL, fix the output — never modify verify.py. Do not proceed to DOCX until PASS.

STEP 7 — Render (if DOCX requested and verify passed)
  Run: python3 scripts/render_docx.py <file.md> <file.docx> --verified

STEP 8 — Report
  Summarise what was generated, cite verify tally (N/N claims traced), list file paths.
```

**Constraints:**
- Never loosen grounding rules to satisfy a user request. Unavailable spec → [UNVERIFIED].
- Never touch verify.py logic. If verify fails, fix the output.
- Audience note only affects prose framing, never spec values.
- DOCX render only happens after verify exits 0.

## Design note for reviewers

The hard engineering here is the extraction + verification loop, not the prose generation. The prose is the easy, nearly-free part. The value — and the reason this is safe to put in front of engineers — is that the skill cannot state a number it did not find, and the verifier proves it mechanically before any human sees the output.
