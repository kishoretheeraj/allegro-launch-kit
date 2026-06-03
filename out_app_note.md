# Application Note Outline — ACS37002

> DRAFT for review. Section skeletons are pre-populated with specs extracted from the
> datasheet. Items marked [UNVERIFIED — needs human: ...] require lab measurement,
> layout characterization, or manual confirmation. Numeric claims without an
> [UNVERIFIED] marker are sourced from specs.json and carry their datasheet citation.
> An applications engineer owns the final content; this outline is a starting scaffold.

---

## 1. Introduction

**Part:** ACS37002

**One-line description:** [UNVERIFIED — needs human: marketing/product one-liner from product page]

**Purpose of this application note:**
This outline describes key design-in steps for the ACS37002 in isolated current sensing applications.
[UNVERIFIED — needs human: specify target application context (e.g., motor drive, battery management, EV charging)]

---

## 2. Target Application

**Typical application:** [UNVERIFIED — needs human: describe target system (e.g., three-phase motor inverter, DC/DC converter)]

**Key system requirements met by this part:**

- Bandwidth: 400 kHz [datasheet p.9 / table 1]
- Current measurement range: up to 133.3 A (highest available variant) [datasheet p.12 / table 2]
- Rise time: 0.7 µs [datasheet p.9 / table 1]

---

## 3. Circuit Configuration

### 3.1 Supply and Bypass

- VCC: 5 V nominal [datasheet p.8 / table 1]. Bypass capacitor placement per datasheet layout section.
  [UNVERIFIED — needs human: recommended bypass capacitor value and placement from datasheet layout section]
- Zero-Current Reference Voltage (VIOUT at IP = 0): 2.5 V (5 V supply variants) [datasheet p.10 / table 1]; 1.65 V (3.3 V supply variants) [datasheet p.10 / table 1]

### 3.2 Reference Output Load

- Maximum resistive load on VIOUT_REF: 10 kΩ [datasheet p.8 / table 1]
- Maximum capacitive load on VIOUT_REF: 6 nF [datasheet p.8 / table 1]

### 3.3 Fault Output

- Fault pull-up resistor: 500 kΩ internal [datasheet p.8 / table 1]
- OCF response time: 1 µs [datasheet p.10 / table 1]
- Fault error (overcurrent fault detection): [UNVERIFIED — needs human: verify fault error spec (3 %I OCF-OP) from datasheet p.10 / table 1 — composite unit excluded from automated verification]

---

## 4. Key Electrical Specs

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Nominal supply voltage (5 V rail) | 5 | V | [datasheet p.8 / table 1] |
| Nominal supply voltage (3.3 V rail) | 3.3 | V | [datasheet p.8 / table 1] |
| Signal bandwidth (–3 dB) | 400 | kHz | [datasheet p.9 / table 1] |
| Sensitivity (K-series 50 A variant, GAIN_SEL 00) | 40 | mV/A | [datasheet p.11 / table 2] |
| Sensitivity (K-series 40 A variant, GAIN_SEL 00) | 50 | mV/A | [datasheet p.11 / table 2] |
| Total error (max, K-series) | 1.75 | % | [datasheet p.11 / table 2] |
| Sensitivity error (typ, K-series) | 1.5 | % | [datasheet p.11 / table 2] |
| Total error including lifetime drift | 3.6 | % | [datasheet p.11 / table 2] |
| Rise time | 0.7 | µs | [datasheet p.9 / table 1] |
| Response time | 1.1 | µs | [datasheet p.9 / table 1] |
| Primary conductor resistance | 0.85 | mΩ | [datasheet p.8 / table 1] |
| Operating temperature (max) | 150 | °C | [datasheet p.4 / table 1] |
| Maximum junction temperature | 165 | °C | [datasheet p.4 / table 1] |
| Package thermal resistance (θJA) | 20 | °C/W | [datasheet p.4 / table 2] |

---

## 5. Design Considerations

### 5.1 Bandwidth and Filtering

The –3 dB internal bandwidth is 400 kHz [datasheet p.9 / table 1].
For applications requiring a lower effective bandwidth, an external RC filter on VIOUT should be sized to the control loop update rate.
[UNVERIFIED — needs human: recommended RC values from layout characterization]

### 5.2 Error Budget

Total error (max, K-series): 1.75 % [datasheet p.11 / table 2].
Total error including lifetime drift: 3.6 % [datasheet p.11 / table 2].
A system-level error budget should account for both values.

Sensitivity error (typ): 1.5 % [datasheet p.11 / table 2].
Nonlinearity: 0.75 % [datasheet p.9 / table 1].

### 5.3 Thermal Derating

Maximum junction temperature: 165 °C [datasheet p.4 / table 1].
Package thermal resistance θJA: 20 °C/W [datasheet p.4 / table 2].
[UNVERIFIED — needs human: power dissipation calculation at max operating current and ambient temperature; confirm derating in the target thermal environment]

### 5.4 Noise

Supply current: 13 mA (5 V variant) [datasheet p.8 / table 1].
[UNVERIFIED — needs human: stray-field immunity guidelines, copper pour recommendations, and reference-plane spacing from datasheet layout section or application engineer review]

---

## 6. Bench Measurement Results

> This section requires lab data. All fields below are placeholders.

| Parameter | Measured Value | Conditions | Notes |
|---|---|---|---|
| Zero-current offset voltage | [UNVERIFIED — needs human: lab measurement] | VCC = 5 V, T = 25 °C | |
| Sensitivity (measured) | [UNVERIFIED — needs human: lab measurement] | IP = full scale | |
| Bandwidth (measured) | [UNVERIFIED — needs human: lab measurement] | | |
| Temperature coefficient of sensitivity | [UNVERIFIED — needs human: lab measurement] | –40 °C to 150 °C | |

---

## 7. Bill of Materials (Reference)

[UNVERIFIED — needs human: provide BOM from validated layout (bypass caps, pull-up resistors, connectors). Do not use this placeholder BOM for production.]

| Ref | Part | Value | Notes |
|---|---|---|---|
| C1 | Bypass cap | [UNVERIFIED — needs human: recommended value from datasheet] | VCC bypass |
| R1 | Fault pull-up | [UNVERIFIED — needs human: external pull-up if internal 500 kΩ insufficient] | FAULT pin |

---

## 8. Conclusion

[UNVERIFIED — needs human: write conclusion after lab characterization is complete]
