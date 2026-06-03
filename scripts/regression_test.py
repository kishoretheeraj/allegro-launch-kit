#!/usr/bin/env python3
"""
regression_test.py — Allegro Launch Kit

Three-level regression suite for extract_specs.py across multiple Allegro datasheets.

  Level 1 — Sanity: Did extraction run without error? Are any specs found?
  Level 2 — Coverage: Are the expected parameter categories present in
             high-confidence specs? Is the low-confidence ratio acceptable?
  Level 3 — Accuracy: Do manually-verified spot-check values match the output?
             These are values read directly from the datasheet and hard-coded here
             as ground truth. A failure at L3 means extract_specs.py is returning
             a WRONG number, not just missing one — the most dangerous failure mode.

Exit codes:
  0 — all checks pass
  1 — one or more checks fail

Usage:
    python scripts/regression_test.py
    python scripts/regression_test.py --verbose    # show passing details too
"""

import argparse
import json
import re
import sys
import traceback
from pathlib import Path

# Project root relative to this script.
ROOT = Path(__file__).parent.parent

# Add scripts/ to path so we can import extract_specs.
sys.path.insert(0, str(ROOT / "scripts"))
from extract_specs import extract


# ──────────────────────────────────────────────────────────────────────────────
# Ground-truth registry
# Each entry:
#   pdf           — relative path from project root
#   l2_categories — parameter keywords that MUST appear in high-confidence specs
#   l2_max_low_pct — max acceptable low-confidence percentage (%)
#   l3_checks     — list of (param_keyword, value, unit, description)
#                   A check passes if ANY high-confidence spec matching
#                   param_keyword has the given value+unit.
#                   Values were verified manually from the PDF pages cited.
# ──────────────────────────────────────────────────────────────────────────────
SUITE = {
    "ACS37002": {
        "pdf": "datasheets/ACS37002-datasheet.pdf",
        "l2_categories": [
            "sensitivity", "bandwidth", "supply voltage", "error", "temperature",
        ],
        "l2_max_low_pct": 35,
        "l3_checks": [
            # Values verified from ACS37002 datasheet (K-series, GAIN_SEL 00)
            # p.11 Electrical Characteristics table
            ("sensitivity",    "40",   "mV/A", "K-series GAIN_SEL 00 sensitivity"),
            ("total error",    "1.75", "%",    "K-series total error absolute max"),
            ("bandwidth",      "400",  "kHz",  "signal bandwidth (–3 dB)"),
            ("supply voltage", "5",    "V",    "nominal VCC (5 V device)"),
            ("rise time",      "0.7",  "µs",   "output rise time typical"),
        ],
    },
    "ACS712": {
        "pdf": "datasheets/ACS712-datasheet.pdf",
        "l2_categories": [
            "sensitivity", "bandwidth", "supply voltage", "error", "temperature",
        ],
        "l2_max_low_pct": 55,  # older part has more text-scan noise
        "l3_checks": [
            # Values verified from ACS712 datasheet p.6 Electrical Characteristics
            ("sensitivity",         "185", "mV/A", "5 A variant sensitivity"),
            ("total output error",  "1.5", "%",    "5 A total output error (±1.5%)"),
            ("frequency bandwidth", "80",  "kHz",  "signal bandwidth (–3 dB)"),
            ("supply voltage",      "5.0", "V",    "nominal VCC"),
        ],
    },
    "ACS722": {
        "pdf": "datasheets/ACS722-datasheet.pdf",
        "l2_categories": [
            "sensitivity", "bandwidth", "supply voltage", "error", "temperature",
        ],
        "l2_max_low_pct": 40,
        "l3_checks": [
            # Values verified from ACS722 datasheet p.7–8 Electrical Characteristics
            ("sensitivity",        "264", "mV/A", "5 A variant sensitivity at 3.3 V"),
            ("total output error", "2.5", "%",    "5 A total output error max"),
            ("internal bandwidth", "80",  "kHz",  "signal bandwidth high-BW mode"),
            ("supply voltage",     "3.3", "V",    "nominal VCC"),
        ],
    },
    "ACS730": {
        "pdf": "datasheets/ACS730-datasheet.pdf",
        "l2_categories": [
            "sensitivity", "bandwidth", "supply voltage", "error", "temperature",
        ],
        "l2_max_low_pct": 40,
        "l3_checks": [
            # Values verified from ACS730 datasheet p.6–7 Electrical Characteristics
            ("sensitivity",        "100", "mV/A", "20 A variant sensitivity"),
            ("total output error", "3",   "%",    "20 A total output error typ"),
            ("internal bandwidth", "1",   "MHz",  "signal bandwidth"),
            ("supply voltage",     "5",   "V",    "nominal VCC"),
        ],
    },
    "ACS758": {
        "pdf": "datasheets/ACS758-datasheet.pdf",
        "l2_categories": [
            "sensitivity", "bandwidth", "supply voltage", "error", "temperature",
        ],
        "l2_max_low_pct": 35,
        "l3_checks": [
            # Values verified from ACS758 datasheet p.7–8 Electrical Characteristics
            ("sensitivity",         "40",  "mV/A", "50 A variant sensitivity"),
            ("total output error",  "2",   "%",    "50 A total output error max"),
            ("internal bandwidth",  "120", "kHz",  "signal bandwidth"),
            ("supply voltage",      "5.0", "V",    "nominal VCC"),
        ],
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _norm_unit(u):
    return u.lower().strip().replace(" ", "")


def _spec_matches(spec, param_kw, value, unit):
    """Return True if spec is high-confidence and matches the criterion."""
    if spec["confidence"] != "high":
        return False
    if param_kw not in spec["parameter"].lower():
        return False
    # Value: allow small floating-point formatting differences.
    try:
        if abs(float(spec["value"]) - float(value)) > 0.001:
            return False
    except ValueError:
        if spec["value"].strip() != value.strip():
            return False
    if _norm_unit(spec["unit"]) != _norm_unit(unit):
        return False
    return True


# ──────────────────────────────────────────────────────────────────────────────
# Levels
# ──────────────────────────────────────────────────────────────────────────────

def level1_sanity(part, pdf_path, verbose):
    """L1: extraction runs and produces at least one spec."""
    results = []
    try:
        specs = extract(pdf_path)
    except Exception as e:
        results.append(("FAIL", f"Extraction crashed: {e}"))
        if verbose:
            traceback.print_exc()
        return False, results

    if not specs:
        results.append(("FAIL", "Extraction returned 0 specs"))
        return False, results

    high = sum(1 for s in specs if s["confidence"] == "high")
    results.append(("PASS", f"Extracted {len(specs)} specs ({high} high-confidence)"))
    return specs, results


def level2_coverage(part, specs, config, verbose):
    """L2: expected parameter categories and low-confidence ratio."""
    passed = True
    results = []

    high_params = [s["parameter"].lower() for s in specs if s["confidence"] == "high"]
    for kw in config["l2_categories"]:
        found = any(kw in p for p in high_params)
        if found:
            results.append(("PASS", f"Category '{kw}' found in high-confidence specs"))
        else:
            passed = False
            results.append(("FAIL", f"Category '{kw}' NOT found in high-confidence specs"))

    total = len(specs)
    low = sum(1 for s in specs if s["confidence"] == "low")
    low_pct = 100 * low // max(1, total)
    limit = config["l2_max_low_pct"]
    if low_pct <= limit:
        results.append(("PASS", f"Low-confidence ratio {low_pct}% ≤ {limit}% threshold"))
    else:
        passed = False
        results.append(("FAIL", f"Low-confidence ratio {low_pct}% > {limit}% threshold ({low}/{total} specs)"))

    return passed, results


def level3_accuracy(part, specs, config, verbose):
    """L3: manually verified spot checks against expected values."""
    passed = True
    results = []

    for param_kw, value, unit, desc in config["l3_checks"]:
        match = any(_spec_matches(s, param_kw, value, unit) for s in specs)
        if match:
            results.append(("PASS", f"{desc}: found {value} {unit}"))
        else:
            passed = False
            # Show what we DID find for this parameter to aid debugging.
            found = [
                f"{s['value']} {s['unit']} [{s['source_location']}]"
                for s in specs
                if param_kw in s["parameter"].lower() and s["confidence"] == "high"
            ]
            found_str = ", ".join(found[:3]) or "(none)"
            results.append(("FAIL",
                f"{desc}: expected {value} {unit} — high-conf matches: {found_str}"))

    return passed, results


# ──────────────────────────────────────────────────────────────────────────────
# Runner
# ──────────────────────────────────────────────────────────────────────────────

ICONS = {"PASS": "✓", "FAIL": "✗", "SKIP": "–"}
COLORS = {"PASS": "\033[32m", "FAIL": "\033[31m", "SKIP": "\033[33m", "RESET": "\033[0m"}


def _print(level, status, msg, use_color=True):
    icon = ICONS.get(status, "?")
    if use_color:
        color = COLORS.get(status, "")
        reset = COLORS["RESET"]
    else:
        color = reset = ""
    indent = "    " * level
    print(f"{indent}{color}{icon}{reset} {msg}")


def run_suite(verbose=False):
    use_color = sys.stdout.isatty()
    any_fail = False

    print("\n" + "═" * 68)
    print("  Allegro Launch Kit — Regression Test Suite")
    print("═" * 68)

    for part, config in SUITE.items():
        pdf_path = ROOT / config["pdf"]
        print(f"\n▶ {part}  ({config['pdf']})")

        if not pdf_path.exists():
            _print(1, "SKIP", f"PDF not found: {pdf_path}", use_color)
            continue

        # L1
        print("  L1 Sanity")
        specs_or_false, l1_results = level1_sanity(part, str(pdf_path), verbose)
        for status, msg in l1_results:
            _print(2, status, msg, use_color)
            if status == "FAIL":
                any_fail = True
        if specs_or_false is False:
            continue
        specs = specs_or_false

        # L2
        print("  L2 Coverage")
        l2_pass, l2_results = level2_coverage(part, specs, config, verbose)
        if not l2_pass:
            any_fail = True
        for status, msg in l2_results:
            if status == "PASS" and not verbose:
                continue
            _print(2, status, msg, use_color)
        if l2_pass and not verbose:
            print(f"      (all {len(config['l2_categories'])} categories found, "
                  f"low-conf ≤ {config['l2_max_low_pct']}%)")

        # L3
        print("  L3 Accuracy  [spot-checks vs. datasheet ground truth]")
        l3_pass, l3_results = level3_accuracy(part, specs, config, verbose)
        if not l3_pass:
            any_fail = True
        for status, msg in l3_results:
            if status == "PASS" and not verbose:
                continue
            _print(2, status, msg, use_color)
        if l3_pass and not verbose:
            print(f"      (all {len(config['l3_checks'])} spot-checks passed)")

    print("\n" + "═" * 68)
    if any_fail:
        result_str = "RESULT: FAIL — one or more checks did not pass."
        _print(0, "FAIL", result_str, use_color)
    else:
        result_str = "RESULT: PASS — all datasheets cleared L1 / L2 / L3."
        _print(0, "PASS", result_str, use_color)
    print("═" * 68 + "\n")

    return 1 if any_fail else 0


def main():
    ap = argparse.ArgumentParser(description="Run multi-datasheet regression tests.")
    ap.add_argument("--verbose", "-v", action="store_true",
                    help="Show passing checks too, not just failures")
    args = ap.parse_args()
    sys.exit(run_suite(verbose=args.verbose))


if __name__ == "__main__":
    main()
