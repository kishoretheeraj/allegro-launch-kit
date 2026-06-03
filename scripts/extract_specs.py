#!/usr/bin/env python3
"""
extract_specs.py — Allegro Launch Kit

Parse an Allegro datasheet PDF into a structured, SOURCED spec table.

Design principle: this script never invents values. It extracts what is on the
page and records WHERE it came from (page + table/section context). Anything it
cannot confidently parse is kept with confidence:"low" and flagged, never dropped
silently and never "cleaned up" into a guess.

Output: specs.json — a list of records:
    {
      "parameter":   "Sensitivity Error",
      "value":       "0.55",
      "unit":        "%",
      "source_location": "p.4 / Electrical Characteristics",
      "raw_context": "<the raw row/line text it was pulled from>",
      "confidence":  "high" | "low"
    }

Usage:
    python extract_specs.py path/to/datasheet.pdf -o specs.json
    python extract_specs.py path/to/datasheet.pdf --preview   # print, don't write

Dependencies: pdfplumber  (pip install pdfplumber --break-system-packages)
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber not installed. Run: pip install pdfplumber --break-system-packages")


# Units we recognize in datasheet parameter tables.
# ORDER MATTERS: longer/more-specific alternatives must precede shorter ones so
# the alternation doesn't short-circuit (e.g. "mV/A" before "mV", "°C/W" before "°C").
UNIT_PATTERN = re.compile(
    r"""(?P<value>[-+]?\d+(?:\.\d+)?)\s*
        (?P<unit>%FS|mV/A|mVRMS|mV|µV|uV|kVRMS|kVrms|kV|V/µs|V|
                 mArms|mARMS|mA|µA|uA|A|kHz|MHz|Hz|
                 ns|µs|us|ms|
                 ppm/°C|°C/W|°C|ppm|
                 mm|µΩ|uΩ|mΩ|Ω|ohm|
                 G/A|Gauss|
                 W|mW|pF|nF|µF|uF|dB)
    """,
    re.VERBOSE | re.IGNORECASE,
)

# A standalone unit string (no leading number required) — used for column detection.
UNIT_ONLY = re.compile(
    r"""^(%FS|mV/A|mVRMS|mV|µV|uV|kVRMS|kVrms|kV|V/µs|V|
           mArms|mARMS|mA|µA|uA|A|kHz|MHz|Hz|
           ns|µs|us|ms|
           ppm/°C|°C/W|°C|ppm|
           mm|µΩ|uΩ|mΩ|Ω|ohm|
           G/A|Gauss|
           W|mW|pF|nF|µF|uF|dB)$""",
    re.VERBOSE | re.IGNORECASE,
)

# Placeholder values used in Min/Typ/Max tables meaning "not specified".
DASH = frozenset(("–", "-", "—", "N/A", "", "n/a"))

# Section headers that signal we're inside a real spec region.
SECTION_HINTS = [
    "electrical characteristics",
    "operating characteristics",
    "absolute maximum ratings",
    "thermal characteristics",
    "performance characteristics",
    "common operating characteristics",
    "selection guide",
    "features",
]

# Parameter-name keywords worth capturing even outside clean tables.
PARAM_KEYWORDS = [
    "sensitivity", "accuracy", "output error", "error", "offset",
    "bandwidth", "response time",
    "supply voltage", "supply current", "isolation",
    "operating temperature", "temperature", "ambient temperature",
    "noise", "linearity", "conductor resistance", "rise time", "quiescent",
    "reference", "package", "footprint", "current sensing", "overcurrent",
    "saturation", "fault", "slew rate",
]


def current_section(page_text_lines, line_idx):
    """Look upward from a line to find the nearest section header for sourcing."""
    for j in range(line_idx, -1, -1):
        low = page_text_lines[j].strip().lower()
        for hint in SECTION_HINTS:
            if hint in low:
                return page_text_lines[j].strip()
    return None


def _norm_dash(s):
    """Normalize Unicode minus/dash variants and strip ± prefix."""
    s = s.replace("–", "-").replace("−", "-").replace("−", "-")
    # Strip leading ± (U+00B1) — magnitude is stored, raw_context keeps context.
    return s.lstrip("±±")


# Matches "–40 to 85" or "0 to 150" style temperature/range specs.
_RANGE_PAT = re.compile(r'^-?\d+(?:\.\d+)?\s+to\s+(-?\d+(?:\.\d+)?)$')


def detect_header_columns(header_cells):
    """Map named column roles to their indices.

    Recognizes: value, rating, unit, typ, min, max, abs_min, abs_max,
    plus_3sigma, minus_3sigma.

    Returns an empty dict if no standard structure is found.
    """
    col_map = {}
    for i, cell in enumerate(header_cells):
        h = cell.lower().strip()
        if not h:
            continue
        if "unit" in h:
            col_map["unit"] = i
        elif "typ" in h:
            col_map["typ"] = i
        elif "absolute" in h and "max" in h:
            col_map["abs_max"] = i
        elif "absolute" in h and "min" in h:
            col_map["abs_min"] = i
        elif "+3" in h:
            col_map["plus_3sigma"] = i
        elif "-3" in h or "−3" in h or "−3" in h:
            col_map["minus_3sigma"] = i
        elif "max" in h:
            col_map["max"] = i
        elif "min" in h:
            col_map["min"] = i
        elif h in ("rating", "value"):
            col_map["value"] = i
    return col_map


def extract_value_from_row(cells, col_map):
    """Return (value_str, unit_str) from a structured table row.

    Value preference: typ → abs_max → max → min → abs_min → value/rating.

    Rationale: for nominal specs, Typ is populated; for error/tolerance specs,
    Typ is "–" and AbsMax carries the headline limit. Trying Typ first naturally
    picks the right column without knowing the spec type in advance.
    """
    unit = None
    if "unit" in col_map:
        idx = col_map["unit"]
        raw = cells[idx] if idx < len(cells) else ""
        # PDF table cells sometimes split "mA\nRMS" across lines — join without space.
        unit = raw.strip().replace("\n", "") or None

    # If no explicit unit column, try to find a unit in the last cell.
    if unit is None and cells:
        last = cells[-1].strip().replace("\n", "")
        if UNIT_ONLY.match(last):
            unit = last

    for col_key in ("value", "typ", "abs_max", "max", "min", "abs_min"):
        if col_key not in col_map:
            continue
        idx = col_map[col_key]
        if idx >= len(cells):
            continue
        val = _norm_dash(cells[idx].strip())
        if val in DASH:
            continue
        # Standard single number.
        if re.match(r'^[-+]?\d+(?:\.\d+)?$', val):
            return val, unit
        # Range value "–40 to 85" → extract the max (upper bound).
        rm = _RANGE_PAT.match(val)
        if rm:
            return rm.group(1), unit
    return None, None


def parse_tables(page, page_no, records):
    """Pull rows from detected tables using column-header-aware extraction."""
    try:
        tables = page.extract_tables()
    except Exception:
        tables = []
    for t_idx, table in enumerate(tables or []):
        if not table:
            continue

        # Find the first usable header row (>= 3 non-null cells, not all numeric).
        # Normalize cells the same way as data rows so multi-line header text works.
        header_row = None
        data_start = 0
        for r_idx, row in enumerate(table[:3]):
            normalized = [" ".join(str(c or "").split()) for c in row]
            non_null = [c for c in normalized if c]
            if len(non_null) >= 3 and not all(re.match(r'^[\d.]+$', c) for c in non_null):
                header_row = normalized
                data_start = r_idx + 1
                break

        if header_row is None:
            continue

        col_map = detect_header_columns(header_row)

        # Detect "Selection Guide"-style tables where column headers carry units
        # like "Sens (mV/A)" or "Max IP (A)".
        EMBEDDED = re.compile(r'^(.+?)\s*\(([^)]+)\)\s*$')
        sel_cols = {}  # col_idx -> (col_label, unit_str)
        for i, h in enumerate(header_row):
            em = EMBEDDED.match(h)
            if em:
                label, unit_str = em.group(1).strip(), em.group(2).strip()
                if UNIT_ONLY.match(unit_str) or unit_str in ("mV/A", "%FS"):
                    sel_cols[i] = (label, unit_str)

        last_param = None
        for row in table[data_start:]:
            # Normalize cell content: collapse intra-cell newlines to spaces.
            cells = [" ".join(str(c or "").split()) for c in row]
            if not any(cells):
                continue

            # Carry forward param name from the last non-null first cell.
            param = cells[0] if cells[0] else last_param
            if not param or len(param) < 2:
                continue
            if cells[0]:
                last_param = cells[0]

            # Skip section-header rows (param only, rest empty).
            if not any(c for c in cells[1:]):
                continue

            # --- Strategy 1: standard column-structure extraction ---
            if col_map and any(kw in param.lower() for kw in PARAM_KEYWORDS):
                value, unit = extract_value_from_row(cells, col_map)
                if value and unit:
                    records.append({
                        "parameter": param,
                        "value": value,
                        "unit": unit,
                        "source_location": f"p.{page_no} / table {t_idx + 1}",
                        "raw_context": " | ".join(cells),
                        "confidence": "high",
                    })
                    continue

            # --- Strategy 2: embedded-unit column extraction (Selection Guide) ---
            for col_idx, (col_label, unit_str) in sel_cols.items():
                # Columns 0 and 1 are always param name / symbol — never data.
                if col_idx < 2 or col_idx >= len(cells):
                    continue
                val = _norm_dash(cells[col_idx].strip())
                if val not in DASH and re.match(r'^[-+]?\d+(?:\.\d+)?$', val):
                    records.append({
                        "parameter": col_label,
                        "value": val,
                        "unit": unit_str,
                        "source_location": f"p.{page_no} / table {t_idx + 1}",
                        "raw_context": " | ".join(cells),
                        "confidence": "high",
                    })


def parse_text_lines(page, page_no, records):
    """Fallback: scan layout text lines for 'Parameter ... value unit' patterns."""
    text = page.extract_text() or ""
    lines = text.split("\n")

    # Skip table-of-contents pages: >15% of non-empty lines end with "....N".
    non_empty = [l for l in lines if l.strip()]
    toc_count = sum(1 for l in non_empty if re.search(r'\.{3,}\s*\d+\s*$', l))
    if non_empty and toc_count / len(non_empty) > 0.15:
        return

    for i, line in enumerate(lines):
        low = line.lower()
        if not any(k in low for k in PARAM_KEYWORDS):
            continue
        m = UNIT_PATTERN.search(line)
        if not m:
            continue

        # Parameter name = text before the first number.
        name = line[: m.start()].strip(" .:-\t□•[]()")
        # Strip leading non-alpha characters (bullets, checkboxes, footnote markers).
        name = re.sub(r'^[^A-Za-z]+', '', name).strip()
        # Must start with a letter and contain >= 3 alphabetic characters.
        if not name or not name[0].isalpha() or sum(c.isalpha() for c in name) < 3:
            continue
        # Skip TOC-style lines (lots of dots followed by a page number).
        if re.search(r'\.{3,}\s*\d+', line):
            continue

        sect = current_section(lines, i)
        loc = f"p.{page_no}"
        if sect:
            loc += f" / {sect}"
        records.append({
            "parameter": name,
            "value": m.group("value"),
            "unit": m.group("unit"),
            "source_location": loc,
            "raw_context": line.strip(),
            "confidence": "low",
        })


def dedupe(records):
    """Collapse duplicates keeping the most reliable, most complete record.

    Key: (parameter_stem, value, unit) — stems prevent collapsing distinct
    parameters that happen to share a value (e.g., two different 5 V specs).
    When stems collide, prefer high-confidence (table) over low-confidence
    (text scan), then shorter/cleaner parameter name.
    """
    def stem(param):
        # First two words, lowercase — enough to distinguish Sensitivity Error
        # from Sensitivity but collapse "Sensitivity\nError" vs "Sensitivity Error".
        words = re.findall(r'[A-Za-z]+', param.lower())
        return " ".join(words[:2])

    best = {}
    for r in records:
        key = (stem(r["parameter"]), r["value"], r["unit"].lower())
        cur = best.get(key)
        if cur is None:
            best[key] = r
            continue
        if cur["confidence"] == "low" and r["confidence"] == "high":
            best[key] = r
        elif cur["confidence"] == r["confidence"]:
            if len(r["parameter"]) < len(cur["parameter"]):
                best[key] = r
    return list(best.values())


def extract(pdf_path):
    records = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            parse_tables(page, page_no, records)
            parse_text_lines(page, page_no, records)
    return dedupe(records)


def main():
    ap = argparse.ArgumentParser(description="Extract sourced specs from an Allegro datasheet PDF.")
    ap.add_argument("pdf", help="Path to datasheet PDF")
    ap.add_argument("-o", "--out", default="specs.json", help="Output JSON path")
    ap.add_argument("--preview", action="store_true", help="Print to stdout, don't write file")
    args = ap.parse_args()

    if not Path(args.pdf).exists():
        sys.exit(f"File not found: {args.pdf}")

    specs = extract(args.pdf)

    high = sum(1 for s in specs if s["confidence"] == "high")
    low = len(specs) - high
    summary = {
        "source_pdf": str(args.pdf),
        "spec_count": len(specs),
        "high_confidence": high,
        "low_confidence_flagged": low,
        "specs": specs,
    }

    if args.preview:
        print(json.dumps(summary, indent=2, ensure_ascii=False))
    else:
        Path(args.out).write_text(json.dumps(summary, indent=2, ensure_ascii=False))
        print(f"Wrote {len(specs)} specs to {args.out} "
              f"({high} high-confidence, {low} flagged low-confidence for human review).")
        if low:
            print("Review the low-confidence entries before generating collateral.")


if __name__ == "__main__":
    main()
