# Application Note Outline — {{PART_NUMBER}}

> DRAFT for review. Section skeletons are pre-populated with specs extracted from the
> datasheet. Items marked [UNVERIFIED — needs human: ...] require lab measurement,
> layout characterization, or manual confirmation. Numeric claims without an
> [UNVERIFIED] marker are sourced from specs.json and carry their datasheet citation.
> An applications engineer owns the final content; this outline is a starting scaffold.

---

## 1. Introduction

**Part:** {{PART_NUMBER}}

**One-line description:** [UNVERIFIED — needs human: marketing/product one-liner from product page]

**Purpose of this application note:**
This outline describes key design-in steps for the {{PART_NUMBER}} in {{APPLICATION_CONTEXT_UNVERIFIED}} applications.
[UNVERIFIED — needs human: specify target application context (e.g., motor drive, battery management, EV charging)]

---

## 2. Target Application

**Typical application:** [UNVERIFIED — needs human: describe target system (e.g., three-phase motor inverter, DC/DC converter)]

**Key system requirements met by this part:**
- Galvanic isolation: {{ISOLATION_VALUE_FROM_SPECS}}
- Current measurement range: {{SENSING_RANGE_FROM_SPECS}}
- Bandwidth: {{BANDWIDTH_FROM_SPECS}}

(Fill values from specs.json using the format: value + unit + [datasheet p.X / table Y].)

---

## 3. Circuit Configuration

### 3.1 Supply and Bypass

- VCC: {{VCC_VALUE_FROM_SPECS}}. Bypass with {{BYPASS_CAP_VALUE}} placed close to the VCC pin.
  [UNVERIFIED — needs human: recommended bypass capacitor value and placement from datasheet layout section]
- VIOUT reference: {{VIOUT_REFERENCE_FROM_SPECS}}

### 3.2 Reference Output Load

- Maximum resistive load on VIOUT_REF: {{REFERENCE_RESISTIVE_LOAD_FROM_SPECS}}
- Maximum capacitive load on VIOUT_REF: {{REFERENCE_CAPACITIVE_LOAD_FROM_SPECS}}

(Fill values from specs.json.)

### 3.3 Fault Output (if applicable)

- Fault pull-up resistor: {{FAULT_PULLUP_FROM_SPECS}}
- OCF response time: {{OCF_RESPONSE_TIME_FROM_SPECS}}

(Fill values from specs.json. Mark absent specs [UNVERIFIED].)

---

## 4. Key Electrical Specs

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Nominal supply voltage | {{VCC}} | V | [datasheet p.X / table Y] |
| Signal bandwidth (–3 dB) | {{BANDWIDTH}} | kHz | [datasheet p.X / table Y] |
| Sensitivity (selected variant) | {{SENSITIVITY}} | mV/A | [datasheet p.X / table Y] |
| Total error (typ) | {{TOTAL_ERROR}} | % | [datasheet p.X / table Y] |
| Sensitivity error (typ) | {{SENSITIVITY_ERROR}} | % | [datasheet p.X / table Y] |
| Rise time | {{RISE_TIME}} | µs | [datasheet p.X / table Y] |
| Response time | {{RESPONSE_TIME}} | µs | [datasheet p.X / table Y] |
| Primary conductor resistance | {{CONDUCTOR_R}} | mΩ | [datasheet p.X / table Y] |
| Operating temperature (max) | {{TEMP_MAX}} | °C | [datasheet p.X / table Y] |

(Fill all rows from specs.json only. Leave empty rows as [UNVERIFIED — needs human: <field>].)

---

## 5. Design Considerations

### 5.1 Bandwidth and Filtering

The –3 dB internal bandwidth is {{BANDWIDTH_FROM_SPECS}} [datasheet p.X / table Y].
For applications requiring a lower effective bandwidth, an external RC filter on VIOUT should be sized to the control loop update rate.
[UNVERIFIED — needs human: recommended RC values from layout characterization]

### 5.2 Error Budget

Total output error (typical): {{TOTAL_ERROR_FROM_SPECS}} [datasheet p.X / table Y].
Total output error including lifetime drift: {{TOTAL_ERROR_DRIFT_FROM_SPECS}} [datasheet p.X / table Y].
A system-level error budget should account for both values.

### 5.3 Thermal Derating

Maximum junction temperature: {{TJMAX_FROM_SPECS}} [datasheet p.X / table Y].
Package thermal resistance θJA: {{THETA_JA_FROM_SPECS}} [datasheet p.X / table Y].
[UNVERIFIED — needs human: power dissipation calculation at max operating current and ambient temperature; confirm derating in the target thermal environment]

### 5.4 Layout Guidance

[UNVERIFIED — needs human: stray-field immunity guidelines, copper pour recommendations, and reference-plane spacing from datasheet layout section or application engineer review]

---

## 6. Bench Measurement Results

> This section requires lab data. All fields below are placeholders.

| Parameter | Measured Value | Conditions | Notes |
|---|---|---|---|
| Zero-current offset voltage | [UNVERIFIED — needs human: lab measurement] | VCC = {{VCC_FROM_SPECS}}, T = 25 °C | |
| Sensitivity (measured) | [UNVERIFIED — needs human: lab measurement] | IP = full scale | |
| Bandwidth (measured) | [UNVERIFIED — needs human: lab measurement] | | |
| Temperature coefficient of sensitivity | [UNVERIFIED — needs human: lab measurement] | –40 °C to 125 °C | |

---

## 7. Bill of Materials (Reference)

[UNVERIFIED — needs human: provide BOM from validated layout (bypass caps, pull-up resistors, connectors). Do not use this placeholder BOM for production.]

| Ref | Part | Value | Notes |
|---|---|---|---|
| C1 | Bypass cap | [UNVERIFIED] | VCC bypass |
| R1 | Fault pull-up | [UNVERIFIED] | If FAULT pin used |

---

## 8. Conclusion

[UNVERIFIED — needs human: write conclusion after lab characterization is complete]
