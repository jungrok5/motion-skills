# BRIEF — from a topic to a wet-ink page

Write the brief before any code, as `BRIEF.md` in the project (`templates/BRIEF.md` is the blank). A topic is anything a
single printed sheet can carry: a poem, a gallery opening, a menu, a manifesto, a programme, a wedding card, a product
spec, a protest poster, a lab notice. The page is *real*: whatever it says, it must still work while it swims.

## 1 · The page (real HTML, one window)
- **Headline**: the biggest mass of print, mirrored from a text field (the field is where the user types while it moves).
  Choose what typing it means for the topic: today's special, a title, the guest's name, a slogan.
- **Body**: the topic's own content — the poem, the menu rows, the programme, the five demands. Keep it short enough to
  fit one window at 1280×800 AND 390×844 (the page never scrolls; it is drawn as one texture).
- **Masses of colour**: 2–3 large solid shapes (discs, bars, a big initial, a bowl, a stamp). Solid print makes the best
  marbling: it drags into tongues and crescents; small text only streaks. Use `mix-blend-mode: multiply` for overprints.
- **Controls with a job**: the pigment chips (radio inputs), a viscosity gauge named for the topic (thin/thick, light/strong
  steep, wet/tacky), Settle, Sound, and one control the topic needs (Pour, RSVP, Sign, Vote) marked `data-hic-click`.

## 2 · Palette and paper
| field | how to choose |
|---|---|
| paper | the topic's material (celadon cup, newsprint, kraft, ivory card). Print must be darker than the paper |
| press ink | the text colour: dark, slightly tinted toward the palette |
| pigments | 3–6, NAMED for the topic (teas, river mud, gallery wall colours, party colours). Distinct in hue and value; one dark |
| opaque pigment | optional: a white / milk / chalk lighter than the print, with `data-cover=".96"` |

## 3 · Material (INK config, references/ENGINE.md)
| field | ranges | reads as |
|---|---|---|
| `viscosity.damp` | thin .3–.6 · thick 3–5 per s | how long a stroke coasts |
| `viscosity.radius` | .03–.1 h | how wide a hand drags the bath |
| `comb.teeth`, `spacing` | 1 (stylus) · 3–4 (comb) · 5–7 (whisk, rake) | marbling patterns: nonpareil, get-gel, whisked tea |
| `comb.ribbon`, `threads` | .006–.03 h · 0–1 | fine lines or fat ribbons; combed tone lines |
| `drop.radius`, `rings`, `spread` | .03–.1 h · 0–4 · 0–1 | a dot, a stone, a bullseye; pushes print aside |
| `look.sheen`, `rim`, `vein` | 0–.6 | glossy wet, pooled edges, hairline rifts |

## 4 · The idle demo
4–7 steps that show off THIS layout, starting within 0.5 s: a stroke through the headline or the biggest shape, a drop on
a shape, a word typed into the field (topic-appropriate), a colour picked, a second stroke through the body, then settle.
Paths: `WetInk.path.line / wave / spiral / loop / zigzag`. Keep it under ~13 s.

## 5 · Acts for stills
2–3 named scripted states (`INK.acts`) that make strong stills for the samples: a marbled headline, a bullseye, a combed
body. They run synchronously, so stills are deterministic.

## Still review (each still must pass)
- **At rest** (`--at 1`): does it read as a well-set printed sheet for THIS topic? Headline the strongest mass, nothing
  overlapping, nothing cut, body text readable at 390 px too.
- **Stirred** (`--at <mid-demo>`, acts): does it look like wet ink — tongues and crescents from the solid shapes, streaks
  from the text, crisp ribbons with threads, pale halos — and not like a blurred image or a ripple filter?
- Are the controls still visible somewhere (they may drift, never vanish entirely in a demo state)?
- Do the pigments read as their names on this paper (the milk as milk, the matcha as matcha)?
- No moiré, stair-steps or noise blocks in stretched areas; no black or white flashes at the edges.
- Phone: one column, the pigments in a row, the headline ≤ 2–3 lines, no horizontal scroll.
