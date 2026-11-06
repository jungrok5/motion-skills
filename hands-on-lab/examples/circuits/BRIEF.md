# Circuits 101 — brief

The style reference: the look and the app shape studied from Dilum Sanjaya's Electronics 101 screen recording
(https://x.com/DilumSanjaya/status/2118386789169938562), rebuilt here with our own course, parts, wording and branding.

## Topic and learner
- Topic: what makes current flow, and what the basic components do to it.
- Learner: 11–15, no electronics yet; knows volts as "how strong the battery is".
- Title + tagline: **Circuits 101 · Build · Measure · Explain** (ko: 회로 101 · 만들고 · 재고 · 설명하기)
- Experiment tab: **Circuit** (ko: 회로) · Languages: en, ko
- Simplifications: a bulb is a constant 10 Ω; an LED conducts above a fixed forward voltage; ideal wires and meters.

## Units and lessons
1. **Open and closed** (Basics) — a loop must be complete. Battery (1.5/3/4.5 V choice), knife switch (toggle), bulb.
   I = V ÷ R. Bulb glow ∝ power. Schematic loop. Chart: current against battery voltage. Try: close, brighter, dimmer.
2. **Series and parallel** (Basics) — power on; series/parallel choice (rebuilds the wiring); unscrew bulb B (toggle).
   Branch currents and voltages. Chart: bulb A brightness against supply, series (dashed) and parallel lines.
3. **Voltage divider** (Components) — power; R1 choice, R2 slider; two meters. Builds: loose parts / on a breadboard.
   V2 = V × R2 ÷ (R1 + R2). Chart: middle voltage against R2.
4. **LEDs: one way only** (Components) — bench supply 0–6 V (slider), 220 Ω, LED colour (choice) and direction (toggle).
   I = (V − Vf) ÷ R above Vf, else 0. Chart: current against supply voltage (the knee).
5. **Charge it up** (Components) — selector A/off/B, R and C choices; state VC over time. τ = R × C.
   Chart: VC over the last 10 s.

## Parts kit (`parts.js`)
cell (green with orange band, printed voltage), block (wood with brass screws), bulb (lathe glass, filament, glow),
resistor (lathe body with colour bands from its value), meter (yellow case, LCD), knife switch, LED (dome + glow,
flips), capacitor (blue can), bench supply (screen + knob), selector, breadboard (canvas-textured holes, rails),
board resistor, jumper, power pack, cable (floor-routed tube with flow stripes).

## Tour (~64 s)
switch → brighter battery → turn the camera → series → parallel → unscrew B → maths → divider power, R1, R2 drag →
breadboard build → turn → diagram big → LED: power, sweep the supply, blue, sweep down, turn it round → charge,
discharge → Korean → overview.

## Still review — a still fails if…
a bulb glows at 0 A · stripes move on a wire with no current · a meter disagrees with the diagram · a wire ends in air ·
a label covers another · the breadboard parts float above the holes.
