# Customer FAQ — ACS37002

> DRAFT for review. Every spec below is filled only from specs.json and carries its
> datasheet source. Items shown as [UNVERIFIED — needs human: ...] were not found in
> the extracted data and must be supplied or confirmed by a person before publication.
> Do not remove citations until a human has verified the draft.

---

**What is the ACS37002?**

The ACS37002 is a fully integrated Hall-effect current sensor IC in a 16-pin SOICW
package (MA and LA variants). It measures AC or DC current galvanically isolated from
the measurement circuit and outputs a proportional analog voltage. Gain is
pin-selectable at run time, and a fast overcurrent fault output is included.

[UNVERIFIED — needs human: confirm one-line description accuracy against datasheet
abstract; package type "SOICW-16 / MA / LA" not extracted from a formal parameter
table — verify from p.2 ordering information.]

---

**What problem does it solve?**

[Positioning — not a measured claim.] High-speed motor control and power conversion
designs need current feedback that is both isolated and fast enough to close a tight
control loop. The ACS37002 replaces a shunt-plus-isolator combination with a single IC,
removing the isolation boundary design work and reducing BOM.

---

**Key specifications**

*Supply*
- Supply voltage (nominal, 5 V device): **5 V** [datasheet p.8 / table 1]
- Supply voltage (nominal, 3.3 V device): **3.3 V** [datasheet p.8 / table 1]
- Supply current (5 V device, typical): **13 mA** [datasheet p.8 / table 1]
- Supply current (3.3 V device, typical): **12 mA** [datasheet p.8 / table 1]
- Forward supply voltage (absolute maximum): **6.5 V** [datasheet p.4 / table 1]

*Sensitivity — pin-selectable via GAIN_SEL_1 / GAIN_SEL_0*
| GAIN_SEL | Sensitivity (Typ) | Max Current Range |
|---|---|---|
| 00 | **40 mV/A** [p.11 / table 1] | ±50 A [p.11 / table 2] |
| 01 | **50 mV/A** [p.11 / table 1] | ±40 A [p.11 / table 2] |
| 10 | **60 mV/A** [p.11 / table 1] | ±33.3 A [p.11 / table 2] |
| 11 | **30 mV/A** [p.11 / table 1] | ±66.7 A [p.11 / table 2] |

Additional gain+range combinations exist for 3.3 V devices; see datasheet
pp.12–24 for the full selection guide.

*Accuracy (K-series, GAIN_SEL 00, worst-case over temperature)*
- Total error (absolute max): **±1.75%** [datasheet p.11 / table 2]
- Sensitivity error (absolute max): **±1.5%** [datasheet p.11 / table 2]
- Offset error (absolute max): **±8 mV** [datasheet p.11 / table 2]
- Nonlinearity (typical): **0.75%** [datasheet p.9 / table 1]
- Total error including lifetime drift (absolute max): **±3.6%** [datasheet p.11 / table 2]

*Speed*
- Bandwidth (–3 dB, C_L = 6 nF): **400 kHz** [datasheet p.9 / table 1]
- Rise time (typical): **0.7 µs** [datasheet p.9 / table 1]
- Response time (typical): **1.1 µs** [datasheet p.9 / table 1]
- OCF response time (t_OCF-MASK = 0 µs): **1 µs** [datasheet p.10 / table 1]

*Primary conductor*
- Conductor resistance (MA package): **0.85 mΩ** [datasheet p.8 / table 1]
- Conductor resistance (LA package): **1 mΩ** [datasheet p.8 / table 1]

*Reference output*
- Zero-current reference voltage (bidirectional, 5 V device, typical): **2.5 V** [datasheet p.10 / table 1]
- Zero-current reference voltage (bidirectional, 3.3 V device, typical): **1.65 V** [datasheet p.10 / table 1]
- Reference slew rate (C_VREF = 0 nF): **0.8 V/µs** [datasheet p.10 / table 1]

*Operating temperature*
- Maximum operating ambient temperature (absolute maximum): **150 °C** [datasheet p.4 / table 1]
- [UNVERIFIED — needs human: minimum operating temperature (–40 °C expected from
  datasheet text but not extracted from a formal parameter table row; verify p.4)]

*Isolation*
- [UNVERIFIED — needs human: isolation voltage (4242 VRMS referenced in datasheet
  description text but not extracted from a formal Electrical Characteristics table row;
  verify against the package isolation specification on the datasheet)]

---

**Is it qualified for automotive / industrial use?**

[UNVERIFIED — needs human: AEC-Q100 qualification status referenced in features
section but not extracted from a formal qualification table. Confirm grade and test
conditions from datasheet p.2 or the product page before stating this to a customer.]

---

**What applications is it intended for?**

[UNVERIFIED — needs human: confirm target applications from datasheet abstract before
stating. Do not invent application claims.]

---

**Where do I get samples / the full datasheet?**

Direct the customer to the official Allegro MicroSystems product page for the ACS37002.
Do not fabricate links, part-number suffixes, or distributor names.
