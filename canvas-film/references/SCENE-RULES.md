# Scene rules (the brief every scene author gets)

1. **Quotes are verbatim.** Scripture / literature / speeches are quoted exactly from their official text — fetched by a
   tool, never typed from memory. A contiguous fragment is fine (`…` for a gap inside one verse/sentence), always with a
   source line under it (`Book ch:v (Version)`). The fragment must make sense on its own (include the subject).
   Paraphrase belongs to your own narration lines, which come from the source material you are adapting.
2. **Everything is drawn in code** (Canvas 2D; WebGL if you must). No external images, no AI images/video. No network at
   render time: fonts are installed locally; the scene's Google-Fonts `<link>` is only for live viewing and is swapped by
   `publish.py` for local subsets.
3. **Deterministic.** The scene is a pure function of time: `draw(ctx, t)`. Seeded randomness only (`Pilot.rng`,
   `Pilot.noise/fbm`). Anything that accumulates over frames must be rebuildable for any seek order (seek backwards,
   jump around). Build heavy textures once in `init`.
4. **Both orientations, composed on purpose.** `Pilot.ori` `'h'` 1920×1080 or `'v'` 1080×1920 (`?o=v`); use
   `Pilot.W/H`. Portrait: subject in the centre band, words in the upper or lower third, type ~1.0–1.1× landscape,
   nothing important within 120 px of the top/bottom (phone UI). `Pilot.reframe` can re-render a landscape world 1.78×
   larger and crop a 1080 window — fine for pilots, but a real portrait composition is better.
5. **Pacing.** 20–60 s per scene. A text line stays ≥ 3.5 s (≥ 4.5 s for two lines); ≤ 2 lines on screen at a time.
   Silence and stillness are tools.
6. **Furniture.** A small chapter label top-left `NN · Title` for the first ~5 s; quotes in a serif 600 with a soft shadow;
   source lines in a sans ~22–24 px; fade in from black and out to black (~1–1.5 s) so scenes cut together.
7. **Use the harness.** `<script src="lib.js">` then `Pilot.run({W,H,dur,audio,fonts,init,draw})`. Put helpers in your own
   file; don't fork the harness per scene.
8. **Every on-screen string goes through `Pilot.text` or `Pilot.tr`** (translate the whole string first, then slice /
   typewrite the result with `Pilot.chars`). Counters: `Pilot.trn('{n} years', n)`. Never hard-code per-character
   positions that only fit the source language. This is what makes the scene translatable later at no cost.
9. **Check your work**: `render.mjs h --scene <id> --stills 2,8,15,…` and the same with `v`, then **look at the PNGs**.
   Typical misses: figures that read as blobs, heads detached from bodies, strings/lines that stop halfway, text over the
   subject, flat textures, portrait crops cutting the subject, unreadable small type, hard straight edges where a soft
   gradient was meant, an "effect" that renders as a hatched rectangle. Don't render full videos while iterating.
10. **Sound spec** next to the scene: `<id>.sound.json` (see SOUND.md). Music ≤ 3 cues (a cue that must hit a visual beat
    starts on that beat), SFX ≤ 8, only sounds that carry the story; `ducks` for silence before a beat.

**Cached layer (optional, for one very expensive language-independent layer).** If a scene draws something that costs
most of its frame time and is the same in every language (a WebGL cosmos, a fluid simulation), expose
`window.__glFrame = () => thatLayerCanvas.toDataURL('image/png')` (plus a `key` getter naming what the layer depends on —
shader source, resolution, the timeline code — so unrelated edits keep the cache) and `window.__prepare = async t => {…}`
that, when `?glcache=<url>` is set, loads `<url><frame, 5 digits>.png` for `Math.round(t*30)` (XHR + createImageBitmap,
reading 2–3 frames ahead so disk latency hides), draws it into a 2D canvas of the layer's size, and makes `draw()` blit
that canvas with the exact same drawImage call (smoothing, size). Drawing the decoded image straight to the frame
resamples differently (±35); through a canvas it matches the live blit to a handful of pixels of ±1. render.mjs builds
the cache once per orientation (lossless PNGs) and passes `glcache` to every later render; the live page never uses it.
Verify once with stills (`--glcache off` vs on). Worked example: one-scroll-bible `motion/pilot/creation.html`.
- **Bodies are physically possible.** Limbs keep their bone lengths (solve arms/legs with 2-bone IK from the shoulder
  to the grip point, never by placing both ends freely); elbows and knees bend one way only; wrists turn ≤ ~80°; a hand
  that holds something is drawn AT the grip and the object moves with it; near limbs in front, far limbs behind. Check
  with `scripts/body-check.py` and `references/BODY-CHECK.md` before handing in.
