# 60-Second Demo — Allegro Launch Kit

**Audience:** Jamie Haas, Allegro CTO  
**Setting:** Terminal. Screen-sharing. Real ACS37002 data already extracted.  
**Goal:** Show the planted-error catch. Make the verifier's moment land.

---

## Beat 1 — 0–8 s

**You say:**  
> "The pipeline runs three steps: extract specs from the PDF, fill the FAQ and checklist
> templates strictly from those specs, then verify every number traces back. Let me show
> you step three."

**You type:**
```
python3 scripts/verify.py specs.json out_faq.md out_fae_checklist.md
```

**Screen shows:**
```
════════════════════════════════════════════════════════════════════
  Allegro Launch Kit — Verification Report
  Source: datasheets/ACS37002-datasheet.pdf (127 allowed numeric facts)
════════════════════════════════════════════════════════════════════

  PASS  out_faq.md
        41/41 claims traced

  PASS  out_fae_checklist.md
        35/35 claims traced

════════════════════════════════════════════════════════════════════
RESULT: PASS  — Safe to hand to a human reviewer.
        76/76 total claims traced across all files
════════════════════════════════════════════════════════════════════
```

---

## Beat 2 — 8–18 s

**You say:**  
> "76 numeric claims, every one traced to the datasheet. Now watch what happens if a
> number drifts."

**You type:**
```
cp out_faq.md /tmp/demo_faq.md
```
*(Then open `/tmp/demo_faq.md` in your editor and change line 56:)*

**Before:**
```
- Nonlinearity (typical): **0.75%** [datasheet p.9 / table 1]
```

**After:**
```
- Nonlinearity (typical): **0.5%** [datasheet p.9 / table 1]
```

*(Save. One keystroke change — this is the planted error.)*

---

## Beat 3 — 18–35 s  ← the moment

**You say:**  
> "Re-run on the modified copy."

**You type:**
```
python3 scripts/verify.py specs.json /tmp/demo_faq.md
```

**Screen shows:**
```
════════════════════════════════════════════════════════════════════
  Allegro Launch Kit — Verification Report
  Source: datasheets/ACS37002-datasheet.pdf (127 allowed numeric facts)
════════════════════════════════════════════════════════════════════

  FAIL  /tmp/demo_faq.md
        40/41 claims traced  (1 untraceable)

        line 56  claims 0.5%
        ↳ datasheet says 0.75 %  [p.9 / table 1]
          (Nonlinearity)
          - Nonlinearity (typical): **0.5%** [datasheet p.9 / table 1]

════════════════════════════════════════════════════════════════════
RESULT: FAIL  — 1 untraceable claim(s) must be corrected or marked [UNVERIFIED].
        40/41 total claims traced across all files
════════════════════════════════════════════════════════════════════
```

**You say:**  
> "It caught it. And it doesn't just say fail — it tells you what the datasheet actually
> says and exactly where."

*(Let the diff sit on screen for a moment. Don't rush.)*

---

## Beat 4 — 35–48 s

**You say:**  
> "Fix it."

**You type:** *(in the editor, revert `0.5%` back to `0.75%`, save)*

```
python3 scripts/verify.py specs.json /tmp/demo_faq.md
```

**Screen shows:**
```
  PASS  /tmp/demo_faq.md
        41/41 claims traced

RESULT: PASS  — Safe to hand to a human reviewer.
        41/41 total claims traced across all files
```

**You say:**  
> "Green again."

---

## Beat 5 — 48–60 s  ← the engineering line

**You say:**  
> "The point isn't catching typos — it's that without this gate, every number in the
> output could have come from memory, from the part number, from training data. Engineers
> make design decisions on these specs. A confident wrong number is worse than a blank."

---

## Appendix: HTML report (if screen-sharing to a remote viewer)

```
python3 scripts/verify.py specs.json /tmp/demo_faq.md --html
open verify_report.html
```

Same FAIL + diff, rendered in a browser. Self-contained file, no external assets —
attach it to an email or share the file directly.

---

## Setup checklist (before the call)

- [ ] Terminal font large enough to read at 80% zoom (≥14pt)
- [ ] `specs.json` already extracted (208 specs from ACS37002)
- [ ] `out_faq.md` and `out_fae_checklist.md` present and verify-passing
- [ ] Editor open to `/tmp/demo_faq.md` ready to edit line 56
- [ ] Color output confirmed working in your terminal (run verify once before the call)
- [ ] If screen-sharing: close email/Slack notifications

---

## If asked: "what stops the tool from bluffing in the generation step?"

> "Same constraint as the verifier — generation only reads from specs.json. It can't
> reach past that file. If a value isn't extracted, the output says [UNVERIFIED — needs
> human] instead of guessing. The FAQ and checklist you saw have six of those markers.
> That's not a failure — that's the correct honest output."
