# The look — what makes it read as hand-painted

The reference look is a painted anime background: gouache-like flat paint laid in layers, soft at a distance and
textured up close, with a cel-coloured, ink-lined hero sitting *in* it, and a faded, warm film print over everything.
It reads as painted when four things are right at once: **texture** (leaf flecks, dry-brush streaks, bark strokes —
never a flat vector fill), **air** (each depth hazed toward one air colour), **light** (one low sun, lit edges facing it),
and **the print** (bloom, split tone, lifted blacks, grain). Lose one and it looks like clip art or a 3D render.

## Palette (sampled from the reference, then tuned)
| role | colours |
|---|---|
| dawn sky, top → horizon | `#8db3bd` `#d9cdb8` `#f8d9a2` `#fbca8a` `#f6c58f` |
| cloud bands (`P.CLOUD`) | shadow `#c9a2b2` · body `#f1d3c4` · light `#fff0dc` · warm rim `#f6bfa4` |
| far canopy (hazy, warm) | `#86a07e` `#a9bb88` `#cdd496` `#e2e4ae` |
| middle foliage | `#3d6146` `#5f8a52` `#9ab865` `#d6dc8c` |
| deep foreground foliage | `#1b3a31` `#2c5442` `#4d7650` `#7f9e64` |
| moss on the hero (`K.MOSS`) | `#5b7a3a` `#8fae4a` `#c4d46a` `#e7eaa0` + flowers `#f6f3ea` / `#b9a7e0`, eye `#e9c44f` |
| bark: far / mid / near / framing | `#8f927f` · `#6f7564` · `#545a4c` · `#2f342c` (dark `#1a1e1b`, moss `#3e6a3a`) |
| air (what distance fades to) | `#e9e3c8` in the forest, `#f6e6c6` over the canopy, `#f2d9c8` over clouds |
| hero, painted metal | teal `#5f8d86` / shadow `#41676a`, cream `#e7d6ac` / `#c2ab86`, red stripe `#b5523b`, roof grey-violet `#8e8a95` |
| weathering | rust/tan `#9a7d58` `#b08a5c` `#866246`, patina `#7b8c86`, faded `#a39a86` |
| ink | `#33303a` (never black) |
| the bird (`K.BIRD`) | back `#3d66a8`, body `#5f97d6`, belly `#f2efe4`, cheek `#e58a4a` |

Rules of thumb: saturation rises toward the viewer; the darkest values are in the foreground framing, not the subject;
highlights are cream, never white; shadows are violet/teal, never grey.

## Layer stack of a forest shot (back → front, with depth z)
1. **sky / backlight** z .1–.3: gradient + glow where the sun is (`P.sky`, `P.glow`).
2. **far trees** z .3: thin pale trunks + crowns, hazed .5 (`P.layer(…, { haze: [AIR, .5] })`).
3. **middle trees** z .3: thicker greener trunks, undergrowth clumps, hazed .3.
4. **near trees** z .3: dark trunks, hazed .1–.15; a mist band at their feet (blurred 16 px).
5. **god rays** z .5 (`P.rays`, screen blend, 0.15–0.25).
6. **the ground** z .85: lit grass, flowers, rails/path.
7. **the hero** z .85–1 with a contact shadow and a strip of grass over its feet.
8. **mist strip** in front of the hero's feet, alpha .5–.7.
9. **motes / leaves / the witness** z 1 (per frame).
10. **framing** z 1.25: two big dark trunks at the edges, a leaf ceiling with hanging vines (plate 300 taller than the frame).
11. **foreground grass and ferns** z 1.4, blurred 3 px.

Close-ups: the same backdrop painted again with `blur: 9–14`, the hero painted again at 2.5–3×, a blurred leafy edge at
z 1.5 in a corner.

## Brushes and their scale (1080p stage units)
- **Leaf flecks**: size ≈ 9 % of the clump radius (min 1.8 px); a far crown r 40–55 → 4–5 px flecks; a close-up crown r
  150 → 14 px. Three passes (mid, light, highlight), each pushed further toward the light and fewer.
- **Clouds**: bands 400–800 long, 40–70 high for skies; cumulus masses 1.8–4.4× as wide as high for a cloud sea. The
  underside is flat and dragged; the tops get curved light strokes and a warm rim.
- **Trunks**: 14–40 px wide in backdrops, 60–220 px as framing; bark strokes vertical, a lit rim on the sun side, moss
  creeping up the lit side, vines from the top.
- **Grass**: blades 3 px wide at the root, 30–110 px tall, 5 tones; ferns in the foreground.
- **The hero**: flat base colours, a cel shadow shape (one darker flat, not a gradient), weathering blotches 16–26 local px
  at amount .2–.35 (more looks like camouflage), drips under edges, ink 2–3 px, moss caps on every top edge, a sapling.

## The print (`Film.post`)
| step | default | what it does |
|---|---|---|
| bloom | .28, radius 18 | bright sky and lamps bleed softly |
| split | .2, top `#7fa6b4`, bottom `#f3c58c` | soft-light: cool above, warm below |
| warm | .1 × cream `#fff0d8` | multiply toward cream |
| lift | `#1d2a29` | lighten: blacks never below a dark teal (faded print) |
| vignette | .42 | multiply toward `#1c161a` at the corners |
| grain | .065 | 4 fixed noise tiles, offset per frame by hash |

## Light and time of day
Dawn (the default): sun low behind the forest, warm horizon, cool zenith, mist on the ground. Dusk: push the sky to
`#6f8fb0 → #e9a2a0 → #f5b27a`, haze toward `#e8c6b0`, more rim light. After rain: cooler air `#dfe6dc`, wet dark trunks,
sparkles on leaves. Night is out of genre for this kit (no moonlight painters).
