# Look: what makes it read as the reference

These are measured numbers, not adjectives. They come from mromidev/claude-animated-shorts (`references/STYLE_BIBLE.md`
and seven measurement reports — motion, depth, textures, characters, lighting, outlines, grade — made frame by frame on
20 reference shorts, then four verifier rounds on the bridge short). The engine's defaults (`lib/look.js`, `lib/post.js`,
`lib/toon.js`, `lib/film.js`) already hold the final values; this page says what they are for, so a change is deliberate.

## The picture in one paragraph
Flat 2D cartoon characters (simple faces, plum outline, flat colours with one soft painted crescent) standing in a
**3D toon world** with hand-painted textures, **black ink lines on the 3D geometry** (silhouettes, depth jumps, creases),
saturated colour, a warm key light with blue/violet shadows, soft depth of field on backgrounds in close shots, and
characters that are *lit by the scene* (tinted, shadowed, with contact shadows), never pasted on.

## Format
- 1080×1920, 30 fps, 31–78 s (median ~60 s). Voice from frame 1–4; no intro, logo, outro, CTA.
- Loudness −14 LUFS integrated, LRA ~2.4 LU (heavily compressed). Music + SFX bed ~8–10 dB under the voice.
- Captions in the reference: one word at a time, white bold sans, thin black outline, lower-middle (~66 % height).
  Off by default here (`?captions=1`).

## Colour (lighting.md, grade.md)
| | day | golden |
|---|---|---|
| median luma | ~.57 | ~.52 |
| non-ink p5 | ~.23 (no crushed blacks) | |
| lit chroma C* p90 | ~55 (saturated) | |
| sky | top ~#5e93d9, horizon 1.28× brighter (#b8d0ec) | peach horizon #ffd08a → rose → muted mauve top |
| shadows | cool tint ONLY in shade (lift [.05,.06,.11]) | violet-blue, never brown (facade ≈ #444380) |
| sun | az 75 / el 48, camera-relative, frozen per shot | az 6 / el 7: backlit, sun disc + bloom, real card shadows |
| fog | = horizon colour, 25 → 300 m, ~15 % blue haze past 60 m | peach, only past 50 m |
Albedos: muted brick / cream / ochre / terracotta houses (saturation −35 % from "storybook"), warm grey stone, ochre
wood with near-black seams, dark desaturated iron. **Never lemon, never lavender lit faces.**
Night (this skill's own): moonlit violet-blue key from behind the camera, indigo shade, warm emissive windows/lamps that
bloom, a moon disc. Interior: warm side key through the window, lavender shade, room walls cast no shadow.

## Ink (outlines.md)
- World lines ~3 px at 1080 wide in the reference, near-black #0b0a0c, nearly constant with distance; the final bridge
  values are 5.1 px near (6 m) → 3.3 px far (90 m), #030303, creases × 0.8 from 35°, depth jumps from 1 %, fog tint .3 far.
- Silhouettes, depth jumps and normal creases only — no line on wall/floor joins or the horizon.
- Characters are never outlined by the world ink (layer NOINK); their own ink is plum #201628–#2f1d28, thicker on the
  bottom / shadow side (`inkRing`, thick angle from the light).

## Depth (depth.md)
- Lens blur on about 1/3 of the screen time (close-ups, medium shots, inserts), cInf 10–16 px at 1080, focus on the eyes
  of the front row. Establishing and wide shots stay sharp. Ladder in `look.js` `DOF`: wide 0, MS 11, MCU 12, CU 13,
  insert 14, ECU 15.5.
- Fog = horizon colour. Bloom only on HDR emissives (threshold 1.0).

## Camera (motion.md)
- Hard cuts on big jumps; everything else a symmetric smootherstep glide of 18–40 frames, peak ≤ 25 px/frame at 720p.
- Camera "holds" ~80 % of frames — but every hold pushes in 0.15–0.35 %/frame, 0.6 %/frame on punch words.
  (A truly static span ≥ 12 frames reads as a freeze in QA.)
- Rolls of 4–5°; no hand-held float; impact shakes flip sign every frame and decay over 7 frames.
- Transitions in the reference are continuous moves (follow an object, whip pans, fly-throughs) or a 6–8-frame dissolve
  when the place changes; a 4-frame white flash after the hook.
- Low camera heights, frequent dutch tilts for drama and falls.

## Characters (characters.md)
- ~3.5 head-heights tall, legs 1.4 HH; stick limbs ~0.055 of head width; ink-dot hands.
- Bean head: h/w ~.94, narrower chin, slightly pointed crown, a seeded bulge toward the facing side.
- No blush, no eye highlights; faces at brightness ~.93; deadpan lidded eyes by default.
- Walk bob 3–7 %, lean 1–7°, planted feet (the stance foot slides back at exactly walking speed).
- Blinks every 0.5–2.3 s, 4 frames (half / shut / shut / half).
- Tight contact shadow under the feet (+ a sun-direction tail by day in the original); golden rim light on the INNER edge
  only (an offset outer copy turns every hat into a picture frame).

## Effects
Muzzle fire / impact bursts, glow, sparkles, splash crowns, speed lines, dust puffs, music notes, stars, light shafts —
flat 2D cartoon sprites composited into the 3D scene (`toon.FX`), always on NOINK, popping 0–3 frames before the word.

## Scores the bridge reached (Opus verifier, out of 10)
colour day 7, golden 5–6, lighting 5–6, ink 6, textures 5–6, characters 7, depth 6–7, composition 6–7 — from
5/3/4/5/4/7/4/6 at the start. The biggest wins were, in order: lit cards instead of emissive ones, two-tone world shading
with a camera-relative sun, real ink on creases, lens blur ladder, the push-in on every hold.
