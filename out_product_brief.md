# Product Brief — ACS37002

> DRAFT for review. Every spec is filled from specs.json only and carries its
> datasheet source. Items marked [UNVERIFIED — needs human: ...] were not found in
> the extracted data. A product manager or marketing lead must review this before
> any external distribution. Do not remove citations until a human has verified the draft.

## At a Glance

The ACS37002 is a fully integrated, galvanically isolated Hall-effect current sensor IC
with pin-selectable gain and an integrated fast overcurrent fault output.

[UNVERIFIED — needs human: confirm one-line description accuracy against the datasheet
abstract; package designations "MA" and "LA" referenced from descriptive text, not a
formal parameter table — verify from the ordering information on p.2.]

**Part family:** Allegro Hall-effect current sensor IC  
**Package options:** [UNVERIFIED — needs human: confirm SOICW-16 package variants (MA, LA) from the datasheet ordering table on p.2 before publishing.]  
**Supply voltage options:** 5 V [datasheet p.8 / table 1] and 3.3 V [datasheet p.8 / table 1]  
**Operating temperature (max):** 150 °C [datasheet p.4 / table 1]

## Key Specifications

| Parameter | Value | Source |
|---|---|---|
| Bandwidth (–3 dB) | 400 kHz | datasheet p.9 / table 1 |
| Rise time | 0.7 µs | datasheet p.9 / table 1 |
| Response time | 1.1 µs | datasheet p.9 / table 1 |
| Total accuracy error (abs. max) | 1.75 % | datasheet p.11 / table 2 |
| Sensitivity (GAIN_SEL 00, typ) | 40 mV/A | datasheet p.11 / table 1 |
| Supply voltage (5 V device) | 5 V | datasheet p.8 / table 1 |
| Conductor resistance (MA package) | 0.85 mΩ | datasheet p.8 / table 1 |

(Sensitivity is pin-selectable at run time — additional gain/range combinations in the datasheet selection guide.)

## Target Applications

[UNVERIFIED — needs human: confirm target application list from the datasheet abstract
and features section before publishing. Do not state application suitability without
verifying the datasheet's own claims.]

## Key Differentiators

- Pin-selectable gain at run time — no need to order different sensitivity variants
- Integrated fast overcurrent fault output with configurable response time
- Single-IC isolation: replaces shunt-plus-isolator combinations
- Both 5 V and 3.3 V supply families available

## Ordering Information

[UNVERIFIED — needs human: confirm orderable part suffixes, pricing, lead time, MOQ,
and distributor availability from the official product page. Do not publish part
suffixes or pricing without verification against the current ordering guide.]

## Where to Learn More

Direct customers and distributors to the official Allegro MicroSystems product page
for the full datasheet, samples, evaluation hardware, and application notes.
Do not fabricate URLs, part suffixes, or availability data.
