# Customer FAQ — ACS730

> DRAFT for review. Every spec below is filled only from specs.json and carries its
> datasheet source. Items shown as [UNVERIFIED — needs human: ...] were not found in
> the datasheet and must be supplied or confirmed by a person. Do not delete the
> citations until a human has verified the draft.

**What is the ACS730?**
[UNVERIFIED — needs human: one-line product description from marketing or product page]

**What problem does it solve?**
The ACS730 provides isolated current sensing across a family of current ranges (20 A through 80 A) using an integrated Hall-effect sensor, eliminating the need for external isolation components in designs that require galvanic separation between the current path and the signal chain. (Positioning statement — not a measured claim.)

**Key specifications**

Multi-variant part. The 20 A variant is used as the primary example below; other variants follow the same electrical interface with different sensitivity and sensing range values.

- Sensitivity error (20 A variant, typ): 1.5 % [datasheet p.7 / table 1]
- Sensitivity error (20 A variant, max): 4 % [datasheet p.7 / table 1]
- Total output error (20 A variant, typ): 3 % [datasheet p.7 / table 1]
- Total output error (20 A variant, max): 4 % [datasheet p.7 / table 1]
- Nonlinearity (20 A variant): 0.75 % [datasheet p.7 / table 1]
- Internal bandwidth (–3 dB): 1 MHz [datasheet p.6 / table 1]
- Rise time: 0.6 µs [datasheet p.6 / table 1]
- Response time: 0.7 µs [datasheet p.6 / table 1]
- Nominal supply voltage: 5 V [datasheet p.6 / table 1]
- Supply voltage maximum: 6 V [datasheet p.4 / table 1]
- Operating ambient temperature (maximum): 125 °C [datasheet p.4 / table 1]
- Operating ambient temperature (minimum): [UNVERIFIED — needs human: confirm minimum ambient temperature from datasheet]
- Working voltage for basic isolation (DC peak): 420 V or VDC PK [datasheet p.4 / table 2]; AC RMS working voltage: [UNVERIFIED — needs human: verify 297 V RMS from same table — composite unit excluded from automated verification]
- Primary conductor resistance: 1.2 mΩ [datasheet p.6 / table 1]
- Package: [UNVERIFIED — needs human: confirm package type from datasheet ordering table]

**Available current sensing ranges**

| Variant | Sensing Range | Sensitivity (typ) | Source |
|---------|--------------|-------------------|--------|
| LCZNH-020B | 20 A | 100 mV/A | [datasheet p.7 / table 1] |
| LCZNH-030B | 30 A | 66 mV/A | [datasheet p.8 / table 1] |
| [UNVERIFIED — needs human: 12 A variant part suffix] | [UNVERIFIED] | 120 mV/A | [datasheet p.9 / table 1] |
| LCZNH-040B | 40 A | 50 mV/A | [datasheet p.10 / table 1] |
| LCZNH-050B | 50 A | 40 mV/A | [datasheet p.12 / table 1] |
| LCZNH-065B | 65 A | 30 mV/A | [datasheet p.13 / table 1] |
| LCZNH-080B | 80 A | [UNVERIFIED — needs human: 80 A sensitivity not in high-confidence extraction] | [datasheet p.14 / table 1] |

(Part suffixes above are [UNVERIFIED — needs human: confirm all orderable part suffixes against the datasheet ordering table. Do not quote part suffixes from this draft without verification.])

**What is the zero-current reference voltage?**
- 20 A variant: 2.5 V [datasheet p.7 / table 1]
- [UNVERIFIED — needs human: confirm reference voltage for other variants from respective variant tables]

**What supply current does it draw?**
Supply current (typical): 17 mA [datasheet p.6 / table 1]

**Is it qualified for automotive / industrial use?**
[UNVERIFIED — needs human: confirm qualification level (e.g., AEC-Q100, grade, temp grade) from datasheet qualification section]

**What applications is it intended for?**
[UNVERIFIED — needs human: confirm target applications from datasheet overview or application section]

**Where do I get samples / the full datasheet?**
Direct the customer to the official Allegro product page at allegromicro.com. (Do not fabricate links or part suffixes.)
