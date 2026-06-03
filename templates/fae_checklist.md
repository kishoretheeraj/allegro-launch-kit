# FAE Design-In Checklist — {{PART_NUMBER}}

> DRAFT for review. This checklist helps a field applications engineer confirm the
> part fits a customer's design. Every spec carries its datasheet source. Gaps are
> marked [UNVERIFIED — needs human: ...]. A human FAE owns the final judgment;
> this is a starting scaffold, not a substitute for engineering review.

## 1. Electrical fit
- [ ] Supply voltage of customer rail within device range: {{value+unit + [source]}}
- [ ] Required accuracy budget vs. device sensitivity error: {{value+unit + [source]}}
- [ ] Offset over temperature acceptable for the application: {{value+unit + [source]}}
- [ ] Bandwidth sufficient for the control loop / current waveform: {{value+unit + [source]}}
- [ ] Response time meets protection/fault-detection needs: {{value+unit + [source]}}

## 2. Current range & sensing
- [ ] Target current within sensing range: {{value+unit + [source] OR [UNVERIFIED]}}
- [ ] Conductor resistance / insertion loss acceptable: {{value+unit + [source] OR [UNVERIFIED]}}

## 3. Isolation & safety
- [ ] Isolation rating meets system safety requirement: {{value+unit + [source]}}
- [ ] Creepage/clearance of package suits the voltage class: {{from datasheet OR [UNVERIFIED]}}

## 4. Thermal & environment
- [ ] Operating temperature range covers the environment: {{value+unit + [source]}}
- [ ] Package power derating considered: {{from datasheet OR [UNVERIFIED]}}

## 5. Layout / placement cautions
- [ ] Common-mode field / stray-field placement guidance reviewed: {{from app note OR [UNVERIFIED — link app note]}}
- [ ] Reference/decoupling per datasheet recommendation: {{from datasheet OR [UNVERIFIED]}}

## 6. Sourcing
- [ ] Correct orderable part suffix selected (range, package, temp grade): {{do NOT guess — confirm against datasheet ordering table}}
