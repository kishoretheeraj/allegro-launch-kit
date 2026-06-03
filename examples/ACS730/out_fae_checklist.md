# FAE Design-In Checklist — ACS730

> DRAFT for review. This checklist helps a field applications engineer confirm the
> part fits a customer's design. Every spec carries its datasheet source. Gaps are
> marked [UNVERIFIED — needs human: ...]. A human FAE owns the final judgment;
> this is a starting scaffold, not a substitute for engineering review.

## 1. Electrical fit

- [ ] Supply voltage of customer rail within device range: 5 V nominal, 6 V maximum [datasheet p.6 / table 1, p.4 / table 1]
- [ ] Required accuracy budget vs. device sensitivity error: 1.5 % typ / 4 % max (20 A variant); see variant tables for other ranges [datasheet p.7 / table 1]
- [ ] Total output error budget acceptable: 3 % typ / 4 % max (20 A variant) [datasheet p.7 / table 1]
- [ ] Offset over temperature acceptable: 50 mV offset voltage (20 A variant) [datasheet p.7 / table 1]
- [ ] Bandwidth sufficient for the control loop / current waveform: 1 MHz internal bandwidth [datasheet p.6 / table 1]
- [ ] Response time meets protection/fault-detection needs: 0.7 µs response time, 0.6 µs rise time [datasheet p.6 / table 1]
- [ ] Output slew rate acceptable for downstream ADC: 2.67 V/µs [datasheet p.6 / table 1]

## 2. Current range & sensing

- [ ] Target current within sensing range: available variants cover 20 A, 30 A, 40 A, 50 A, 65 A, 80 A [datasheet p.7–p.14 / table 1 per variant]
- [ ] Correct sensitivity variant selected for signal chain full-scale: 100 / 66 / 50 / 40 / 30 mV/A [datasheet p.7–p.13 / table 1]
- [ ] Conductor resistance / insertion loss acceptable: 1.2 mΩ primary conductor resistance [datasheet p.6 / table 1]
- [ ] Zero-current reference voltage compatible with ADC input range: 2.5 V (20 A variant) [datasheet p.7 / table 1]; [UNVERIFIED — needs human: confirm VIOUT reference voltage for other variants]
- [ ] Reference load within spec: 1 nF capacitive, 10 kΩ resistive [datasheet p.6 / table 1]

## 3. Isolation & safety

- [ ] Isolation rating meets system safety requirement: 420 V or VDC PK working voltage (basic isolation) [datasheet p.4 / table 2]
- [ ] Working voltage (RMS) acceptable: [UNVERIFIED — needs human: verify 297 V RMS from datasheet p.4 / table 2 — composite unit excluded from automated verification]
- [ ] Creepage/clearance of package suits the voltage class: [UNVERIFIED — needs human: confirm creepage/clearance from package outline or safety section]
- [ ] Reverse supply voltage protection noted: –0.1 V reverse supply voltage limit [datasheet p.4 / table 1]

## 4. Thermal & environment

- [ ] Operating ambient temperature range covers the environment: maximum 125 °C [datasheet p.4 / table 1]; minimum [UNVERIFIED — needs human: confirm minimum ambient temperature from datasheet]
- [ ] Junction temperature does not exceed limit under load: 165 °C maximum junction temperature [datasheet p.4 / table 1]
- [ ] Package power derating considered: [UNVERIFIED — needs human: confirm thermal resistance θJA and power derating curve from datasheet]

## 5. Layout / placement cautions

- [ ] Common-mode field / stray-field placement guidance reviewed: [UNVERIFIED — needs human: link to app note or datasheet layout section]
- [ ] Noise budget acceptable: [UNVERIFIED — needs human: verify noise density and RMS noise from datasheet p.6 / table 1 — composite units µA/√Hz and mA RMS excluded from automated verification]
- [ ] Sensitivity PSRR and Offset PSRR reviewed: 15 dB sensitivity PSRR, 30 dB offset PSRR [datasheet p.6 / table 1]
- [ ] Reference decoupling per datasheet recommendation: [UNVERIFIED — needs human: confirm recommended bypass capacitor value from datasheet layout section]

## 6. Sourcing

- [ ] Correct orderable part suffix selected (range, package, temp grade): [UNVERIFIED — needs human: confirm against datasheet ordering table; do not use part suffix from this draft without verification]
- [ ] Lifetime drift budget acceptable: 6.7 % total output error including lifetime drift, 3.8 % sensitivity error including lifetime drift (20 A variant) [datasheet p.7 / table 1]
