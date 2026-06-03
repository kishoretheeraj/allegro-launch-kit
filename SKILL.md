---
name: allegro-launch-kit
description: "Generate first-draft launch collateral (customer FAQ and FAE design-in checklist) for an Allegro current-sensor product from its datasheet PDF. Every factual claim is grounded in and cited to the source datasheet; any value not found in the source is emitted as a visible [UNVERIFIED — needs human] placeholder and never invented. Use when a new or existing Allegro part needs the repetitive downstream collateral that applications engineering, FAE, and product marketing hand-build for each release."
---

# Allegro Launch Kit

## What this skill does

Turns one Allegro datasheet PDF into two cited, review-ready collateral drafts:
1. **Customer FAQ** — the recurring questions a customer or distributor asks about a part (key specs, qualifications, package, what problem it solves), each answer carrying the datasheet location it came from.
2. **FAE design-in checklist** — the things a field applications engineer should confirm when helping a customer design the part in (supply range, accuracy budget, bandwidth, isolation, layout/placement cautions), each item cited.

It is a **drafting accelerator for review**, not a publisher. The output is designed to be *faster to verify than to rewrite*: a human checks the citations and finishes the voice, rather than authoring from scratch.

## The non-negotiable rules (this is the whole point)

These rules exist because the audience is engineers and customers who make design decisions on these numbers. A confident wrong spec is worse than a blank.

1. **Source-of-truth is the datasheet only.** Every numeric spec, qualification, package detail, or capability claim in any output MUST come from the extracted datasheet data produced by `scripts/extract_specs.py`. Nothing is filled in from prior knowledge, from the part name, or from marketing memory.
2. **Cite every claim.** Each spec in an output renders with its source location, e.g. `Sensitivity error: 0.55% [datasheet p.4, Electrical Characteristics]`. No citation → the claim does not appear.
3. **Refuse rather than guess.** If a field the template asks for is not present in the extracted data, emit `[UNVERIFIED — needs human: <what's missing>]`. Never substitute a plausible value. Never round, infer, or "remember" a spec.
4. **Marketing/positioning language is clearly separated from specs.** Any persuasive phrasing (e.g. "industry-leading") is allowed only in clearly-labeled positioning sections and must not be attached to a number unless that exact claim is in the datasheet.
5. **Competitive comparison is out of scope for v1.** It requires competitor datasheets and doubles the error surface. Do not generate competitor specs.

## How to run it

```
1. Extract specs from the datasheet PDF:
   python3 scripts/extract_specs.py datasheets/<PART>-datasheet.pdf -o specs.json
   Output: specs.json — list of {parameter, value, unit, source_location, raw_context, confidence}.
   Anything ambiguous is flagged confidence:"low" rather than dropped silently.

2. Review specs.json briefly. (Human-in-the-loop checkpoint — ~10 min.)
   Low-confidence entries are flagged; confirm or remove before generating collateral.

3. Generate collateral by filling templates/faq.md and templates/fae_checklist.md
   ONLY from specs.json fields. Each filled value carries its source_location.
   Missing fields become [UNVERIFIED — needs human: <what>] markers — never a guessed value.

4. Run verify.py on the generated files:
   python3 scripts/verify.py specs.json out_faq.md out_fae_checklist.md
   It fails loudly on any spec-like claim that does not trace to a specs.json entry.
   A clean PASS is the credibility gate before anything is shown to a human.

5. (Optional) Render to Word for stakeholders who live in Word, not Markdown:
   python3 scripts/render_docx.py out_faq.md out_faq.docx --verified
   python3 scripts/render_docx.py out_fae_checklist.md out_fae_checklist.docx --verified
   ORDERING RULE: verify on the .md first (step 4), then render. Never the reverse.
   The --verified flag is the pipeline's assertion that verify.py exited 0. The script
   refuses to render without it. Citations and [UNVERIFIED] markers are preserved in the
   Word output — the .docx is still a DRAFT FOR REVIEW, not a finished publication.

6. (Optional) Run the regression suite to confirm extractor health across datasheets:
   python3 scripts/regression_test.py
```

## Inputs
- A single Allegro datasheet PDF (a fully published one with parameter tables).
  A press-release-only part like a brand-new launch has no parameter table to extract;
  use the published datasheet of the closest released family member as the engine and
  treat the new part as the collateral target in the narrative.

## Outputs
- `specs.json` — the sourced spec table (foundation asset; reusable by downstream skills)
- `out_faq.md`, `out_fae_checklist.md` — cited collateral drafts, verify-gated
- `out_faq.docx`, `out_fae_checklist.docx` — Word versions (optional, post-verify only)
- Verifier report (PASS/FAIL + list of every untraceable claim)

## Tested datasheets (regression suite — all L1/L2/L3 passing)
- ACS37002 — primary development target (400 kHz, pin-selectable gain, 9-column performance table)
- ACS712 — older 5/20/30 A family (simpler tables, ±1.5% total output error)
- ACS722 — 3.3 V, pin-selectable bandwidth (80 kHz / 20 kHz)
- ACS730 — 1 MHz bandwidth, AEC-Q100 automotive
- ACS758 — through-hole, 50–200 A range

## Scope discipline
One part, two output types, grounding + verification wired in. Do not expand to six product families or competitive tables in v1. A narrow tool that is correct and cited is the deliverable; a broad one that bluffs is a liability.

## Guided flow (conversational walkthrough)

When a user provides a datasheet and wants to be walked through the full pipeline, Claude is the actor. Run each step below in order. One question at a time — never present all three at once.

```
STEP 1 — Extract
  Run: python3 scripts/extract_specs.py <PDF_PATH> -o specs.json
  Then: python3 scripts/summarize_specs.py specs.json
  Show the summary to the user (source, totals, category spotlights, low-conf warnings).
  Do NOT dump raw JSON into the conversation.

STEP 2 — Ask Q1: Collateral
  Ask: "Which collateral do you want?"
  Options: FAQ only / FAE checklist only / Both
  Wait for answer before proceeding.

STEP 3 — Ask Q2: Format
  Ask: "Output format?"
  Options: Cited Markdown / Word .docx draft / Both
  Wait for answer before proceeding.

STEP 4 — Ask Q3: Audience note (optional)
  Ask: "Anything to emphasize or any audience note? (Press Enter to skip.)"
  IMPORTANT: This answer may only affect framing/positioning prose — never specs.
  Any spec the user mentions here must still come from specs.json or be [UNVERIFIED].
  Wait for answer before proceeding.

STEP 5 — Generate
  Fill templates/faq.md and/or templates/fae_checklist.md from specs.json ONLY.
  Every number gets a citation. Missing values → [UNVERIFIED — needs human: ...].
  Apply any audience framing from Q3 to prose only, never to numbers.
  Write output to out_faq.md and/or out_fae_checklist.md.

STEP 6 — Verify
  Run: python3 scripts/verify.py specs.json <generated files>
  Show the verification report. If FAIL, fix the output — never modify verify.py.
  Do NOT proceed to DOCX until verify exits 0.

STEP 7 — Render (only if user requested DOCX and verify passed)
  Run: python3 scripts/render_docx.py out_faq.md out_faq.docx --verified
  Run: python3 scripts/render_docx.py out_fae_checklist.md out_fae_checklist.docx --verified
  Show the output file paths.

STEP 8 — Report
  Summarise what was generated, cite the verify tally (N/N claims traced), list file paths.
```

**Constraints:**
- Never loosen grounding rules to satisfy a user request. Unavailable spec → [UNVERIFIED].
- Never touch verify.py logic. If verify fails, fix the output.
- Audience note (Q3) only affects prose framing, never spec values.
- DOCX render only happens after a clean verify exit 0.

## Design note for reviewers
The hard engineering here is the extraction + verification loop, not the prose generation. The prose is the easy, nearly-free part. The value — and the reason this is safe to put in front of engineers — is that the skill cannot state a number it did not find, and the verifier proves it.
