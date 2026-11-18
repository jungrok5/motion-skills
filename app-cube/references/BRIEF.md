# Topic → brief

Write the brief before any code, as `BRIEF.md` in the project (start from `templates/BRIEF.md`). The brief turns a topic
("a weekend in Lisbon", "our band's spring tour", "a sourdough day") into six apps, a look and a sound. Everything below is
designed for the topic; only the form (the cube, the studio, the gestures, the grid) is fixed.

## 1. The six apps

A topic is a little world of things people do. Pick six of them, each one small enough to fit on a 720 px face and to be
useful in a glance. Good faces do one job:

| kind | examples |
|---|---|
| **write** (one is required) | a plan, notes, a message, a journal line, a recipe step, lyrics — a `contenteditable` or `<textarea>` marked `data-hic-edit` |
| **choose / toggle** | pins on a drawn map, a packing grid, a setlist, ingredients to tick, seat picker |
| **count / convert** | a currency or unit converter, a tally, a budget split, a timer |
| **look up** | a phrasebook, a glossary, tour dates, opening hours, a chord chart |
| **make** | a colour mixer, a step pattern, a tiny drawing pad (`data-drag`), a name generator |
| **the cube's controls** (always) | Shuffle / Back / Solve, sound, mode, the status line — worded and styled for the topic |

Rules of thumb:
- **Six different verbs.** Two lists side by side read as one app split in two. Mix write, choose, count, look up and make.
- **Real behaviour.** Every control does something visible on its own face (a number changes, a card flips, a bar fills).
  No dead buttons, no fake data pretending to be live (label fixed numbers: "sample rates, not live").
- **No outside content.** No images, fonts or data from the network. Draw maps, icons and art in inline SVG or CSS
  gradients, from code, seeded with `HIC.rng` when scattered.
- **Which face.** The home view shows **front, right and top**. Put the write app on the front, the most playful app on the
  right, the controls on top. Back, left and bottom are found by orbiting or by scrambling.

## 2. The grid (lay out every face on it)

Each face is 720×720 px, cut into nine 240 px tiles that become separate pieces of the cube.
- A **control** (button, input, select, checkbox) sits inside **one tile**, at least 16 px from its edges (the check fails
  under 8 px). A good control is a tile-sized key (about 192×192 at 24 px in) or a card of 200×200 at 20 px in.
- A control that must span tiles (a long slider, a wide text input) is marked `data-span`; it still works when scattered.
- **Text may run across tiles**: big serif lines spanning the face are the style's charm ("This page is live" broken over
  three tiles). Keep lines large (≥ 26 px; titles 54–80 px) — a face is drawn at about a third of its size.
- Leave the 240/480 seams for gaps, rules or background: anything that straddles one is cut by a dark groove.

## 3. Words

Write every label for the topic. The control face needs: a title (a name from the topic: "Tram 28", "Encore", "Proof"), a one-line
hint ("drag a tile to take a turn"), the three keys (Shuffle / Back / Solve renamed to fit: "Shuffle · Back · Sort out"),
the three mode keys (both, use only, turn only) and the status (solved: "In order"; scrambled: "N turns · R′"). The HUD
outside the canvas has a title and three hints that tick off: use a face, turn a layer, use it again after the twist.

## 4. Look and sound (the CONFIG)

| field | choose from the topic |
|---|---|
| `body` | the material of the cubies: `color` (ivory enamel for travel, black lacquer for a band, flour-white for baking), `gloss` 0.6–1, `roughness` 0.08–0.2, `metal` 0–0.6, `groove` (how dark the gaps) |
| `tile` | `glass` (0.1–0.2 reflection on the screens), `emit` (0.8–0.9 brightness of the apps), `hot` (the hover rim colour, the topic's accent) |
| `studio.lights` | 3–6 softboxes: a warm or neutral key above-right, a cool strip on the left, a coloured kicker behind; colours from the topic (a warm dusk, a cold stage, a kitchen morning) |
| `backdrop` | the wall: a lighter `center`, a dark `edge`, two coloured glows (`glowA` left low, `glowB` right high) |
| `floor` | `tint`, `reflect` 0.3–0.45, `shadow` |
| `view` | the home `yaw`/`pitch` (keep front, right and top visible) |
| `sound` | `snap.freq` (110 deep plastic … 220 wooden tock), `tick`, `chime` (four MIDI notes in the topic's mood), plus each app's own tones (`cube.sound.tone`) |

Colour test: each face's background must differ from its neighbours at home and from the body colour, and every face's
text must read at a third of its size. Avoid three faces in one hue.

## 5. Still review (score every still; fix and repeat until all pass)

Render `still.mjs --act idle,twist,typed,back,under` (and `scramble+twist`). For each PNG:
1. **The form.** One 3×3 glossy cube on a reflective floor, three faces visible, standing on the floor (not cut by it, not
   floating far above it), the softbox highlights visible on the body edges and the tiles.
2. **Every face reads** at this size: titles legible, the write app's text clear, no face a blank colour field.
3. **Nothing cut at a seam** that should not be: no button half on two tiles, no number split by a groove.
4. **The control face** is legible and its status matches the state (solved / N moves).
5. **Scrambled is still beautiful**: the scattered tiles make a lively mosaic, colours do not clash into mud, text pieces read.
6. **Typed**: the caret's tile is on the front, upright, three-quarter view kept; the typed words are visible.
7. **The studio**: the backdrop glows frame the cube, the floor reflection fades with distance, the shadow sits under the cube.
8. **Phone (390×844)**: the cube fits, the HUD does not cover it.
Any "is that a bug?" moment (a black tile, a mirrored face, a face sideways at home, a gap of empty floor) is a failure.
