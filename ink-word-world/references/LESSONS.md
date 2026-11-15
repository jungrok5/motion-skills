# Lessons

Problem → cause → fix. All from building the engine, `starter` and `examples/tide`.

**Ink and paper**
- The paper looked cracked wherever ink lay on it → fibres were drawn dark and the shader multiplies ink by the paper
  texture → the tooth is fine noise; fibres are only lighter than the sheet (`brush.paperTile`).
- After six words the sheet was grey fog → every glyph added 1.5 of ink, swirls flung it a third of the sheet wide and
  stains never left → glyph ink 0.7, swirl 1.35, pushes 110, stain `fade` 0.07 /s; `check` fails when mean ink > 1.1.
- A two-second brush stroke at night was a glaring cyan lake → brush ink 0.34 per step and night kept the full hue →
  brush 0.22; night keeps 62% of the hue.
- A sun 56 units across was a decagon and a whale's head was cut flat → `dot` had 10 vertices at any size and the
  stroke started at 56% width → vertices scale with radius; width profiles start small and rise fast (`pow(u, .45)`).

**Things and bodies**
- One frame threw `createRadialGradient: non-finite` and the page stopped → a fish was "scared" without a point to flee
  from, its position became NaN → `Flock` sets the point with the scare; `check` fails on any non-finite position.
- The whale "left its element" for 50 steps → it has to touch the surface to breathe but its zone forbade it → the zone
  follows the behaviour (`mode === 'rise'` allows the surface); zones are part of the design, not a fence added later.
- The school "left the water" for seconds at a time → fleeing the whale pressed it against the surface, and the
  check used the comfortable band (24 units under the waterline) as the element → `zone` is where it likes to be,
  `element` is where it can be at all (the waterline), and the surface is a wall (`a.y = max(a.y, sea + 7)`).
- After lightning the whale swam off the sheet → its dive goal was "360 units ahead of wherever it faces" → clamp every
  goal to the sheet; edge steering alone is too weak for a 300-unit body.
- Koi were unreadable crescents → 90 units long at a 1778-unit sheet is 65 px → hero bodies 250–350 units, flock members
  25–40; look at a 1280 px still before tuning anything else.
- Five jellyfish became one hairball under the moon → all sought the same point → every member gets its own offset.
- The cast sheet caught what scenes hid: the gull's wing was a black bar hanging from its back, and the boat's pennant
  streamed against the wind that filled its sail. Render the cast sheet before the performance, every time.
- A side-view body that turns past vertical flipped its fins in one frame → `Chain.roll` eases from 1 to −1 (it rolls
  over) and fins scale with `|roll|`; single small agents may flip (`life.side`), spines may not.

**Clock and checks**
- Verse lines were missing from stills → CSS animations ran on wall time while the headless sheet ran 2.5× slower →
  chrome is driven by `w.t`; `?drive` turns transitions off.
- Checks took four minutes for a six-word world → software WebGL is ~40 ms per step at full quality → word and rule
  checks run `?q=low` at 960 × 540; only the performance and the determinism pair run at full quality.
- 해 could never be written once 해파리 existed → the matcher fired only on exact, unambiguous keys → a key that is also
  the start of a longer one waits 0.7 s (or for space / Enter); a mistyped prefix falls off the front of the buffer.
- Typing was verified with synthetic key input (Playwright) and the performance; composition events from a real
  Korean / Chinese input method take the same path (`input` → buffer → match, composition reset on fire) but have not
  been exercised on a physical IME here — test on a device when the lexicon is not Latin-typable. Every word also has a
  romanised key and a chip.
