# FAE Design-In Checklist — ACS37002

> DRAFT for review. This checklist helps a field applications engineer confirm the
> part fits a customer's design. Every spec carries its datasheet source. Gaps are
> marked [UNVERIFIED — needs human: ...]. A human FAE owns the final judgment;
> this is a starting scaffold, not a substitute for engineering review.

---

## 1. Electrical fit

- [ ] **Supply voltage** — nominal VCC: **5 V** or **3.3 V** [datasheet p.8 / table 1].
  Absolute maximum forward supply voltage: **6.5 V** [datasheet p.4 / table 1].
  [UNVERIFIED — needs human: confirm Min/Max operating supply range from p.8 table
  before quoting a tolerance to a customer — not extracted as standalone specs.]

- [ ] **Accuracy budget** — worst-case total error over temperature: **±1.75%**
  [datasheet p.11 / table 2]. Including lifetime drift: **±3.6%** [datasheet
  p.11 / table 2]. Sensitivity error alone: **±1.5%** [datasheet p.11 / table 2].
  Confirm the application's end-of-life accuracy budget accommodates lifetime drift.

- [ ] **Offset over temperature** — offset error (absolute max): **±8 mV**
  [datasheet p.11 / table 2]; QVO error (absolute max): **±10 mV** [datasheet
  p.11 / table 2]. Verify the customer's ADC input range and zero-current operating
  point can absorb this offset.

- [ ] **Bandwidth** — signal bandwidth (–3 dB, C_L = 6 nF): **400 kHz** [datasheet
  p.9 / table 1]. Confirm this covers the highest harmonic the customer's control loop
  needs to track. Bandwidth is set by C_L; increasing C_L reduces bandwidth.

- [ ] **Response time / overcurrent protection** — output rise time: **0.7 µs** typical
  [datasheet p.9 / table 1]; OCF fault response: **1 µs** [datasheet p.10 / table 1].
  Confirm these meet the customer's fault-detection and protection timing budget.

---

## 2. Current range and sensing

- [ ] **Current range** — confirm the target peak current fits within the selected
  GAIN_SEL range:

  | GAIN_SEL | Sensitivity | Max ±IP |
  |---|---|---|
  | 00 | 40 mV/A [p.11 / table 1] | ±50 A [p.11 / table 2] |
  | 01 | 50 mV/A [p.11 / table 1] | ±40 A [p.11 / table 2] |
  | 10 | 60 mV/A [p.11 / table 1] | ±33.3 A [p.11 / table 2] |
  | 11 | 30 mV/A [p.11 / table 1] | ±66.7 A [p.11 / table 2] |

  Additional combinations (100 A, 133.3 A ranges etc.) exist for other device variants;
  see datasheet selection guide (pages 12 through 24).

- [ ] **Conductor resistance / insertion loss** — primary conductor resistance:
  **0.85 mΩ** (MA package) / **1 mΩ** (LA package) [datasheet p.8 / table 1].
  At high currents, I²R loss in the conductor is non-trivial — compute using the
  resistance above and the customer's peak current. Confirm thermal budget and PCB
  copper can handle the dissipation; see thermal data on p.4.

- [ ] **Overcurrent fault threshold** — factory-default OCF threshold: **100 %FS**
  [datasheet p.11 / table 2]. Threshold is pin-programmable via VOC. Confirm the
  customer's fault trip point matches the default or document the VOC setting required.

---

## 3. Isolation and safety

- [ ] **Isolation voltage** — [UNVERIFIED — needs human: 4242 VRMS referenced in
  datasheet description text but not extracted from a formal parameter table. Verify
  the isolation rating from the datasheet and confirm it meets the customer's
  working voltage and safety standard (IEC 62368-1, UL, etc.).]

- [ ] **Creepage / clearance** — [UNVERIFIED — needs human: confirm creepage distance
  for the MA/LA package from the package outline drawing (datasheet p.39) meets the
  customer's pollution degree and voltage class requirements.]

---

## 4. Thermal and environment

- [ ] **Operating temperature** — maximum operating ambient temperature (absolute
  maximum rating): **150 °C** [datasheet p.4 / table 1]. Maximum junction temperature:
  **165 °C** [datasheet p.4 / table 1].
  [UNVERIFIED — needs human: minimum operating temperature (–40 °C expected; verify
  p.4 raw range "–40 to 150 °C" against formal parameter table).]

- [ ] **Package power derating** — package thermal resistance (MA, junction to ambient):
  **20 °C/W** [datasheet p.4 / table 2]; (LA): **16 °C/W** [datasheet p.4 / table 2].
  Compute T_junction = T_ambient + (P_total × R_θJA) using the customer's actual
  supply current and conductor current, and confirm headroom below **165 °C**
  [datasheet p.4 / table 1].

- [ ] **Moisture sensitivity** — MSL rating: **MSL 3** [datasheet p.5 / table 1].
  Confirm customer's SMT process handles MSL 3 (bake before use if floor life exceeded).

---

## 5. Layout and placement cautions

- [ ] **Stray-field / common-mode field immunity** — [UNVERIFIED — needs human: link
  the relevant Allegro application note for stray-field layout guidance. Do not invent
  placement rules; direct the customer to the published application note.]

- [ ] **Reference and decoupling** — recommended capacitive load on VREF: **≤ 6 nF**
  [datasheet p.8 / table 1]. Recommended VCC bypass capacitor: verify from datasheet
  p.8 raw_context (bypass cap value not extracted as a standalone spec —
  [UNVERIFIED — needs human: confirm recommended bypass capacitor value from p.8]).
  Place decoupling close to VCC pin.

- [ ] **GAIN_SEL pin** — pins must be driven to a valid logic level before VCC ramps;
  [UNVERIFIED — needs human: confirm power-on sequencing requirement from datasheet
  description or application note before committing to a board design.]

---

## 6. Sourcing

- [ ] **Correct orderable part suffix** — do NOT guess the full part number from memory.
  The ordering suffix encodes current range, package, temperature grade, and packing.
  [UNVERIFIED — needs human: confirm the specific orderable part number against the
  datasheet ordering information table before placing any purchase order or quoting
  lead time to a customer.]
