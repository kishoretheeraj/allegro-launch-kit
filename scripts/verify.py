#!/usr/bin/env python3
"""
verify.py — Allegro Launch Kit

The credibility gate. Re-reads generated collateral and checks that every
spec-like claim (a number + unit) traces back to an entry in specs.json.

Why this exists: generation is easy and confident. This script is the part
that makes the skill safe to put in front of an engineer — it catches a
hallucinated or drifted spec BEFORE a human sees the draft. Demoing this
catching a planted error is more convincing than any polished output.

Logic:
  - Parse specs.json into a set of allowed (value, unit) facts.
  - Scan each output .md for number+unit tokens.
  - Any number+unit in the output that is NOT in the allowed set, and is NOT
    inside an [UNVERIFIED ...] marker, is a FAILURE (untraceable claim).
  - Reports pass/fail and lists every offending line.

Usage:
    python verify.py specs.json out_faq.md out_fae_checklist.md
    python verify.py specs.json out_faq.md --html
    python verify.py specs.json out_faq.md --no-color
    # exit code 0 = clean, 1 = untraceable claims found
"""

import argparse
import html as _html
import json
import re
import sys
from pathlib import Path

# Same family of units the extractor recognizes.
# ORDER MATTERS: longer alternatives before shorter ones (mV/A before mV, °C/W before °C).
# Must stay in sync with UNIT_PATTERN in extract_specs.py.
NUM_UNIT = re.compile(
    r"""(?P<value>[-+]?\d+(?:\.\d+)?)\s*
        (?P<unit>%FS|%|mV/A|mVRMS|mV|µV|uV|kVRMS|kVrms|kV|V/µs|V|
                 mArms|mARMS|mA|µA|uA|A|kHz|MHz|Hz|
                 ns|µs|us|ms|
                 ppm/°C|°C/W|°C|ppm|
                 mm|µΩ|uΩ|mΩ|Ω|ohm|
                 G/A|Gauss|
                 W|mW|pF|nF|µF|uF|dB)
    """,
    re.VERBOSE | re.IGNORECASE,
)
# Note: bare '%' is intentionally absent from extract_specs.py's UNIT_PATTERN (text-scan
# fallback) because percent specs arrive via table column extraction, not text-scan.
# It IS included here so verify catches percent claims in generated output.

# Match [UNVERIFIED...] blocks including multi-line ones (re.DOTALL).
UNVERIFIED = re.compile(r"\[UNVERIFIED.*?\]", re.IGNORECASE | re.DOTALL)


# ─── Verification logic (unchanged from original) ────────────────────────────

def norm(value, unit):
    u = unit.lower()
    # Collapse Unicode variants: µ (U+00B5 micro sign) and μ (U+03BC Greek mu) are
    # visually identical but different code points — normalize to µ (U+00B5).
    u = u.replace("μ", "µ")
    u = u.replace("uω", "µω").replace("us", "µs")
    return (value.lstrip("+").lstrip("±"), u)


def allowed_facts(specs_json_path):
    data = json.loads(Path(specs_json_path).read_text())
    specs = data.get("specs", [])
    facts = set()
    for s in specs:
        if s.get("value") and s.get("unit"):
            facts.add(norm(s["value"], s["unit"]))
    return facts, data, specs


# ─── Suggestion engine ───────────────────────────────────────────────────────

def find_suggestion(value, unit, all_specs):
    """Find the closest matching spec in specs.json for a failed claim.

    Matches by normalized unit first, then picks the numerically closest
    high-confidence spec. Falls back to any confidence if no high-conf match.
    Returns a spec dict or None.
    """
    _, target_unit = norm(value, unit)

    def unit_matches(s):
        u = s.get("unit", "")
        return u and norm("0", u)[1] == target_unit

    high_same_unit = [s for s in all_specs if unit_matches(s) and s.get("value")
                      and s.get("confidence") == "high"]
    candidates = high_same_unit or [s for s in all_specs if unit_matches(s) and s.get("value")]

    if not candidates:
        return None

    try:
        claimed = float(value)
    except ValueError:
        return candidates[0]

    def dist(s):
        try:
            return abs(float(s["value"]) - claimed)
        except ValueError:
            return float("inf")

    return min(candidates, key=dist)


def check_file(md_path, facts, all_specs):
    """Scan an .md file for spec claims and verify each against specs.json.

    Returns:
        problems   — list of (ln_no, line, token_str, value, unit, suggestion|None)
        total      — count of all NUM_UNIT tokens checked (excluding UNVERIFIED blocks)
    """
    problems = []
    total = 0
    for ln_no, line in enumerate(Path(md_path).read_text().split("\n"), start=1):
        scrubbed = UNVERIFIED.sub("", line)
        for m in NUM_UNIT.finditer(scrubbed):
            total += 1
            fact = norm(m.group("value"), m.group("unit"))
            if fact not in facts:
                token = f"{m.group('value')}{m.group('unit')}"
                suggestion = find_suggestion(m.group("value"), m.group("unit"), all_specs)
                problems.append((ln_no, line.strip(), token,
                                 m.group("value"), m.group("unit"), suggestion))
    return problems, total


# ─── Terminal color helpers ───────────────────────────────────────────────────

class C:
    GREEN  = "\033[32m"
    RED    = "\033[31m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    CYAN   = "\033[36m"
    RESET  = "\033[0m"


def _c(text, *codes, use_color=True):
    if not use_color or not codes:
        return text
    return "".join(codes) + text + C.RESET


# ─── Terminal renderer ────────────────────────────────────────────────────────

def render_terminal(results, source_label, use_color):
    """Print a designed terminal report. Returns True if any file failed."""
    W = 68
    print()
    print("═" * W)
    print(_c("  Allegro Launch Kit — Verification Report", C.BOLD, use_color=use_color))
    print(f"  Source: {source_label}")
    print("═" * W)

    grand_total = grand_fail = 0
    any_fail = False

    for md_path, problems, total, skipped in results:
        grand_total += total
        grand_fail += len(problems)

        if skipped:
            print(f"\n  {_c('–', use_color=use_color)} {md_path}  "
                  f"{_c('(not found, skipped)', C.DIM, use_color=use_color)}")
            continue

        passed = total - len(problems)
        tally = f"{passed}/{total} claims traced"

        if not problems:
            print(f"\n  {_c('PASS', C.GREEN, C.BOLD, use_color=use_color)}  {md_path}")
            print(f"        {_c(tally, C.DIM, use_color=use_color)}")
        else:
            any_fail = True
            detail = tally + f"  ({len(problems)} untraceable)"
            print(f"\n  {_c('FAIL', C.RED, C.BOLD, use_color=use_color)}  {md_path}")
            print(f"        {_c(detail, C.DIM, use_color=use_color)}")
            for ln_no, line, token, value, unit, suggestion in problems:
                ctx = line if len(line) <= 80 else line[:77] + "…"
                print()
                print(f"        {_c('line ' + str(ln_no), C.DIM, use_color=use_color)}  "
                      f"claims {_c(token, C.RED, C.BOLD, use_color=use_color)}")
                if suggestion:
                    sv, su = suggestion["value"], suggestion["unit"]
                    sl = suggestion.get("source_location", "?")
                    sp = suggestion.get("parameter", "")
                    print(f"        {_c('↳ datasheet says', C.CYAN, use_color=use_color)} "
                          f"{_c(sv + ' ' + su, C.GREEN, C.BOLD, use_color=use_color)}"
                          f"  [{sl}]")
                    if sp:
                        print(f"          {_c('(' + sp + ')', C.DIM, use_color=use_color)}")
                else:
                    print(f"        {_c('↳ no match in specs.json for unit: ' + unit, C.DIM, use_color=use_color)}")
                print(f"          {_c(ctx, C.DIM, use_color=use_color)}")

    print()
    print("═" * W)
    grand_tally = (f"{grand_total - grand_fail}/{grand_total} "
                   f"total claims traced across all files")
    if any_fail:
        print(_c("RESULT: FAIL", C.RED, C.BOLD, use_color=use_color)
              + f"  — {grand_fail} untraceable claim(s) must be corrected "
                f"or marked [UNVERIFIED].")
        print(_c(f"        {grand_tally}", C.DIM, use_color=use_color))
    else:
        print(_c("RESULT: PASS", C.GREEN, C.BOLD, use_color=use_color)
              + "  — Safe to hand to a human reviewer.")
        print(_c(f"        {grand_tally}", C.DIM, use_color=use_color))
    print("═" * W)
    print()
    return any_fail


# ─── HTML renderer ────────────────────────────────────────────────────────────

_CSS = """
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,monospace;
     max-width:900px;margin:2rem auto;padding:0 1.5rem;color:#1a1a1a;background:#fafafa}
h1{font-size:1.3rem;font-weight:700;margin-bottom:.25rem}
.sub{color:#666;font-size:.9rem;margin-bottom:2rem}
.block{background:#fff;border:1px solid #e0e0e0;border-radius:6px;
       margin-bottom:1.5rem;overflow:hidden}
.hdr{display:flex;align-items:center;gap:1rem;padding:.75rem 1rem;
     border-bottom:1px solid #e0e0e0;font-size:.95rem;font-weight:600}
.hdr.pass{background:#f0faf4;border-left:4px solid #22c55e}
.hdr.fail{background:#fff5f5;border-left:4px solid #ef4444}
.hdr.skip{background:#fffbeb;border-left:4px solid #f59e0b}
.badge{font-size:.8rem;font-weight:700;padding:2px 8px;border-radius:3px;color:#fff}
.badge.pass{background:#22c55e}.badge.fail{background:#ef4444}.badge.skip{background:#f59e0b}
.tally{font-size:.8rem;color:#666;font-weight:normal;margin-left:auto}
.probs{padding:.75rem 1rem}
.prob{background:#fff5f5;border:1px solid #fecaca;border-radius:4px;
      margin-bottom:.75rem;padding:.6rem .8rem;font-size:.875rem}
.lno{color:#888;font-size:.75rem;margin-bottom:.2rem}
.claim{color:#ef4444;font-weight:600;font-family:monospace}
.arr{color:#6b7280;margin:.2rem 0}
.sug{color:#16a34a;font-weight:600;font-family:monospace}
.loc{color:#6b7280;font-size:.8rem}
.pname{color:#6b7280;font-size:.78rem;font-style:italic}
.ctx{color:#374151;font-size:.78rem;margin-top:.35rem;font-family:monospace;
     background:#f9f9f9;padding:3px 6px;border-radius:3px;
     white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.result{padding:1rem 1.5rem;border-radius:6px;margin-top:2rem;
        font-weight:700;font-size:1rem}
.result.pass{background:#f0faf4;border:2px solid #22c55e;color:#15803d}
.result.fail{background:#fff5f5;border:2px solid #ef4444;color:#dc2626}
.result .rsub{font-weight:normal;font-size:.85rem;color:#555;margin-top:.2rem}
"""


def render_html(results, source_label, output_path):
    e = _html.escape

    parts = []
    grand_total = grand_fail = 0
    overall_pass = True

    for md_path, problems, total, skipped in results:
        grand_total += total
        grand_fail += len(problems)

        if skipped:
            parts.append(
                f'<div class="block"><div class="hdr skip">'
                f'<span class="badge skip">SKIP</span>'
                f'<span>{e(md_path)}</span>'
                f'<span class="tally">not found</span></div></div>'
            )
            continue

        cls = "fail" if problems else "pass"
        if problems:
            overall_pass = False
        passed = total - len(problems)

        block = (
            f'<div class="block"><div class="hdr {cls}">'
            f'<span class="badge {cls}">{cls.upper()}</span>'
            f'<span>{e(md_path)}</span>'
            f'<span class="tally">{passed}/{total} claims traced</span>'
            f'</div>'
        )

        if problems:
            block += '<div class="probs">'
            for ln_no, line, token, value, unit, suggestion in problems:
                ctx = line[:120] + ("…" if len(line) > 120 else "")
                if suggestion:
                    sv, su = suggestion["value"], suggestion["unit"]
                    sl = suggestion.get("source_location", "?")
                    sp = suggestion.get("parameter", "")
                    sugg = (
                        f'<div class="arr">↳ datasheet says '
                        f'<span class="sug">{e(sv)} {e(su)}</span> '
                        f'<span class="loc">[{e(sl)}]</span></div>'
                        + (f'<div class="pname">{e(sp)}</div>' if sp else "")
                    )
                else:
                    sugg = (f'<div class="arr">↳ no match in specs.json '
                            f'for unit <code>{e(unit)}</code></div>')

                block += (
                    f'<div class="prob">'
                    f'<div class="lno">line {ln_no}</div>'
                    f'<div>claims <span class="claim">{e(token)}</span></div>'
                    f'{sugg}'
                    f'<div class="ctx">{e(ctx)}</div>'
                    f'</div>'
                )
            block += '</div>'

        block += '</div>'
        parts.append(block)

    result_cls = "pass" if overall_pass else "fail"
    result_txt = ("RESULT: PASS — Safe to hand to a human reviewer." if overall_pass
                  else f"RESULT: FAIL — {grand_fail} untraceable claim(s) must be "
                       f"corrected or marked [UNVERIFIED].")
    grand_tally = (f"{grand_total - grand_fail}/{grand_total} "
                   f"total claims traced across all files")

    result_bar = (
        f'<div class="result {result_cls}">{e(result_txt)}'
        f'<div class="rsub">{e(grand_tally)}</div></div>'
    )

    html_doc = (
        f'<!DOCTYPE html>\n<html lang="en">\n<head>\n'
        f'<meta charset="utf-8">\n'
        f'<title>Allegro Launch Kit — Verify Report</title>\n'
        f'<style>{_CSS}</style>\n</head>\n<body>\n'
        f'<h1>Allegro Launch Kit — Verification Report</h1>\n'
        f'<div class="sub">Source of truth: {e(source_label)}</div>\n'
        + "\n".join(parts)
        + f'\n{result_bar}\n</body>\n</html>\n'
    )
    Path(output_path).write_text(html_doc, encoding="utf-8")


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description="Verify that every spec claim in generated collateral "
                    "traces to specs.json."
    )
    ap.add_argument("specs_json", help="Path to specs.json")
    ap.add_argument("outputs", nargs="+", help="Generated .md files to check")
    ap.add_argument("--html", action="store_true",
                    help="Write a self-contained HTML report")
    ap.add_argument("--html-out", default="verify_report.html", metavar="FILE",
                    help="HTML report output path (default: verify_report.html)")
    ap.add_argument("--no-color", action="store_true",
                    help="Disable ANSI color output")
    args = ap.parse_args()

    use_color = not args.no_color and sys.stdout.isatty()

    facts, data, all_specs = allowed_facts(args.specs_json)
    source_label = (f"{data.get('source_pdf', args.specs_json)} "
                    f"({len(facts)} allowed numeric facts)")

    results = []
    for md in args.outputs:
        if not Path(md).exists():
            results.append((md, [], 0, True))
            continue
        problems, total = check_file(md, facts, all_specs)
        results.append((md, problems, total, False))

    any_fail = render_terminal(results, source_label, use_color)

    if args.html:
        render_html(results, source_label, args.html_out)
        print(f"  HTML report written → {args.html_out}\n")

    sys.exit(1 if any_fail else 0)


if __name__ == "__main__":
    main()
