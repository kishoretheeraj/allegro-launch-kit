#!/usr/bin/env python3
"""summarize_specs.py — Print a human-readable summary of specs.json.

Used by the guided flow so Claude can report what was extracted without
dumping raw JSON into the conversation context.

Usage:
    python3 scripts/summarize_specs.py specs.json
"""

import json
import sys
from pathlib import Path


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'specs.json'
    data = json.loads(Path(path).read_text())
    specs = data.get('specs', [])
    high = [s for s in specs if s.get('confidence') == 'high']
    low  = [s for s in specs if s.get('confidence') != 'high']

    print(f"Source:  {data.get('source_pdf', path)}")
    print(f"Totals:  {len(specs)} specs extracted — "
          f"{len(high)} high-confidence, {len(low)} low-confidence")
    print()

    # Category spotlights
    categories = [
        ("Sensitivity / gain",   ['sensitivity'],                    'mV/A'),
        ("Accuracy",             ['total error', 'nonlinearity'],    '%'),
        ("Bandwidth",            ['bandwidth', 'signal bandwidth'],  None),
        ("Supply",               ['supply voltage', 'vcc'],          'V'),
        ("Temperature",          ['junction temperature',
                                  'operating temperature'],          '°C'),
        ("Timing",               ['rise time', 'response time',
                                  'ocf'],                            None),
        ("Conductor",            ['conductor', 'insertion'],         'mΩ'),
    ]

    seen = set()
    any_printed = False
    for cat, keywords, unit in categories:
        matches = []
        for s in high:
            if id(s) in seen:
                continue
            param = s.get('parameter', '').lower()
            if not any(kw in param for kw in keywords):
                continue
            if unit and s.get('unit', '').lower().replace('μ', 'µ') != unit.lower().replace('μ', 'µ'):
                continue
            matches.append(s)
        if not matches:
            continue
        print(f"  {cat}:")
        for s in matches[:2]:
            seen.add(id(s))
            src = s.get('source_location', '?')
            print(f"    {s.get('parameter', '?')!r:50s}  "
                  f"{s.get('value', '?'):>10} {s.get('unit', ''):6s}  [{src}]")
        any_printed = True

    if not any_printed:
        print("  (no categorised spotlights — review specs.json directly)")

    if low:
        print()
        print(f"  {len(low)} low-confidence entries — review before generating collateral:")
        for s in low[:4]:
            print(f"    {s.get('parameter', '?')!r}  =  "
                  f"{s.get('value', '?')} {s.get('unit', '')}  [low-conf]")
        if len(low) > 4:
            print(f"    … and {len(low) - 4} more (see specs.json)")


if __name__ == '__main__':
    main()
