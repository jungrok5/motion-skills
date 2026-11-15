# Topic → brief

Write `BRIEF.md` (copy `templates/BRIEF.md`) before any code. The brief turns a topic into forms the cloud can become and
an order that tells the topic. Spend the effort here: a good order of forms is the whole film.

## 1. The story in one line
Write the chain: *form A* → *form B* → … → *the name*. Each arrow should mean something ("the ship's sonar view becomes
the whole trench", "the violin's spruce becomes the tree it came from"). A random parade of shapes is not a story.
3–6 forms; 15–35 s; the first scans in, the last is usually a wordmark or a closing form that holds.

## 2. Choosing forms that read as points
- **Silhouette first.** A point cloud has no shading: a form must be recognisable from its outline and its structure lines.
  Good: buildings, bridges, machines, vehicles, instruments, skeletons, terrain, globes, plants with clear branches,
  animals with a distinctive outline (a whale's flukes, a heron's neck), a wordmark. Weak: faces, food, fabric, anything
  defined by colour or texture.
- **Give it structure lines.** Floors, frames, ribs, grooves, rows, rings, spars — lines take most of the points and make
  the form legible. A smooth blob with no lines reads as a cloud.
- **Literal when you can.** Scanned things (buildings, hulls, terrain, rooms, sites) are what LiDAR and sonar really
  produce: the look is true there. For things that are not scanned, say why the points are honest (heard, measured,
  simulated, archived) and pick the transition to match.
- **One hot spot per form** (`blob` with `tint: 1`): the thing the copy or callout is about. Not decoration.
- **Scale differences are fine** (a 14 m whale after a 170 m trench): the camera re-frames during the morph.

## 3. How each arrives
| style | reads as | use for |
|---|---|---|
| `scan` | a sweep plane builds the form with a flash | the first form; a "captured" moment |
| `nebula` | the form dissolves into a turbulent cloud and condenses into the next | the default between unrelated forms |
| `flow` | points stream directly, little turbulence | related forms (one building to another, an object to its part) |
| `burst` | an outward explosion that falls into place | a scale jump outward (a thing → the network / the planet) |
| `fold` | an implosion to the centre, then out | the close (→ wordmark), a scale jump inward |
| `cut` | instant | only with a reason in the brief |

Sweep: `up` (builds from the ground), `down`, `left` / `right`, `front` / `back`, `radial` (centre out), `in` (outside in),
`random`, or a vector. Match it to the subject (a tower builds up, a ship scans along its length, a globe bursts radially).

## 4. Camera per form
Yaw / pitch / distance / target; `frame` 0.15–0.22 to push the form right when copy is on the left; `drift` 1–3°/s; an
optional `to` for a slow push or rise across the hold. Pick the angle that shows the silhouette (3/4 for buildings and
vehicles, side for animals, high 3/4 for terrain, near-front for text).

## 5. Site or immersive
For each shot: chrome on (top bar, copy, stats, tabs) or immersive (label, readout and hint only). Alternate: copy shots
explain, immersive shots let the form breathe. Write the copy: kicker `(0n) A / B / C`, a two-line headline (≤ 26
characters a line, the second grey), body ≤ 2 sentences, button + link, 2–3 stats with units, one callout per form (ID ·
quantity · unit).

## 6. Palette and sound
Ink: a warm white (`#ebe9e3`-ish). One accent fitting the topic (sonar aqua, thermal blue, leaf green, signal amber) —
used only on hot spots, signals and data. Score root note: lower = deeper / heavier topics.

## 7. Film rules
List 1–3 rules the film must keep (a part points the right way, a motion stays inside a range) and write them as
`F.check(...)`.

---

## Form review (render.mjs --forms)
Score each form alone from front, right, back, left. A form fails if:
- it is not recognisable from the angle its shot uses (cover the label: what is it?);
- it collapses into a stick or a blob from an angle the camera will orbit past (a wordmark is only for near-front shots);
- faces are as bright as edges (lower face density / `w`) or edges are lost in fuzz (lower `jitter`);
- the hot spot is missing or sits somewhere meaningless;
- a moving part (tag + motion) detaches or tears at its pivot at the extremes of its swing.

## Still review (render.mjs --sheet, then --stills full size)
- **Settled** frame: the form reads within a second; it is inside the frame and not under the copy; the brightest thing
  is the form, not the HUD.
- **Mid-morph** frame: a cloud with direction and a glowing core — not a flat grey fog, not a white blowout.
- The HUD: labels typed in, readout ticking, callout leader points at the right part, tag text specific, no overlaps.
- The copy is short, two-tone, aligned to the ruler; stats have units; the active tab matches the form.
- The close holds long enough to read the name.
A frame that makes you ask "what is that?" when it has settled fails: fix the form or the angle.
