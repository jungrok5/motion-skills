# The mascot

The film has one recurring figure: an **object from the topic's world with a dot-matrix screen for a face**. The screen
is how it talks — its name at the start, what it is doing in the middle, "done" at the end — and the same object, small,
is the agent's chat avatar. The source used a racing helmet with an LED visor; never reuse a helmet or that look.

## Choosing the object
- It belongs to the topic and could plausibly have a little screen: a rice cooker (meals), a calculator (bookkeeping),
  a luggage tag or a suitcase (travel), a parking meter (city), a thermostat (home), a label printer (shop), a
  metronome (music), a seed tray with a sensor (garden), a tape measure (DIY).
- Not a person, animal or creature: no limbs, no walk. It bobs, tilts, nods and breathes (sparks, steam, dust, bubbles).
  Because it has no body, there are no joints to bend wrong; it never turns more than ~25° (it is a flat drawing).
- Readable at 68 px (the avatar): a clear silhouette and the screen big enough to show 2–4 characters.

## Drawing it (`mascot.js`)
```js
export const MASCOT = {
  name: 'TALLY',                 // the first thing the screen says
  avatarSay: 'T',                // the still screen on the chat avatar
  led: '#7CF2C8',                // dot colour (one)
  viewBox: [400, 440],
  screen: { x, y, w, h, r, cols, rows },   // the screen rectangle in viewBox units; dots = cols × rows
  avatarBox: [x, y, w, h],       // the part of the drawing the avatar shows (crop to the face)
  sparks: { x, y, rise, spread, color, size: [a, b], n, soft, grow, alpha },   // optional: steam, sparks, dust…
  condense: 0.82,                // LED letters are squeezed to fit before they scroll (down to 0.62)
  svg: (id) => `<svg viewBox="0 0 400 440">…</svg>`,   // prefix every gradient id with id
};
```
- Draw it in SVG with `K.svg.plastic(id, colour)`, `K.svg.metal(id)`, `K.svg.glass(id)` (the screen bezel), `K.svg.shade(id)`
  (a light-top / dark-bottom overlay) and one gloss stroke. A soft contact shadow ellipse under it. Front view, a slight
  top light, rounded forms; no outlines.
- The screen rectangle sits inside a dark glass bezel. Rows 9–12 (Hangul needs ≥ 11), cols ≈ rows × w / h.
- Screen words: ≤ 6 Latin characters or 2–3 Hangul syllables fit without scrolling; longer ones scroll (avoid).
  `say: [[t, 'TEXT', { blink, speed }]]` switches with a column wipe and a blip.

## Checking it
`render.mjs film.html --mascot` draws every screen the film uses, big, turned 24° left and right, and the avatar.
Score: is every screen word legible? Does the avatar read as the same object? Does the turned view stay believable
(no part that should hide showing)? Does it look like it belongs to the topic and not to the source's helmet?
