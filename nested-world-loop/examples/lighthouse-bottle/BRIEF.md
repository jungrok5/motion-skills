# 병 속의 등대 · The Lighthouse in the Bottle — brief

## The ring
`cabin (cm) —bottle, 1 m = 0.25 cm→ sea in the bottle (m) —lantern door, 1:1 (cm→m), turned −36.9°→ lantern room (cm) —floor hatch, 1:1→ cabin`

| world | units | what it is | its light (key / practicals / fill) | what moves (whole cycles per loop) | portal → next (type, scale, where) |
|---|---|---|---|---|---|
| cabin | cm | a lighthouse keeper's quarters at night: desk under the window, an uncorked bottle on a cradle | oil lamp on the desk (key, shadows) / light falling through the ceiling hatch from the lantern, a sconce by the shelf, moonlight through the window / warm bounce, low hemisphere | flame flicker (17, 29, 47 Hz-cycles), compass needle, dust in the lamp light | containment: the sea in the bottle, 1 m = 0.25 cm, axis on the bottle's axis |
| bottle | m | the sea sealed in the bottle: resin waves, an islet, the banded lighthouse, a keeper's cottage, a boat going round | the cabin's oil lamp beyond the glass (warm directional from −x, shadows) / the lantern's glow, the turning beam and its sweep, the boat's mast light, the tower windows / cool hemisphere | waves (5 travelling sines), the boat (1 lap), the beam (2 turns) | aperture: the lantern's open door (0.72 × 1.9 m) → the lantern room at real size, turned so its door faces the approach |
| lantern | cm | the lantern room: a Fresnel lens turning on its pedestal, misted panes, gallery, an open floor hatch | the lamp inside the lens (key, shadows) / low hemisphere | the lens (2 turns — the same angle as the beam in the bottle) | aperture: the floor hatch (r 42) → the cabin below, its ceiling hatch under ours |

Loop zoom: 0.25 cm/m × (1/100 m/cm) × 1 = **1/400** per loop.
Duration: **24 s** — three worlds at about 8 s each; long enough to read each world, short enough to loop on a post.

## Worlds
- **Cabin** — warm wood room. Hero: the bottle on its cradle. Supporting: the oil lamp (brass foot, glass font with oil,
  chimney, flame with a blue core), an open logbook with written lines, pen, brass telescope, compass, mug, a chair, a
  rug, a shelf of books, a barometer, the ladder to the hatch, the window with a moonlit sea outside. Materials: pine
  planks (lighter walls, darker desk), brass, glass, ceramic, leather, paper. The detail to look for: the cork lying
  beside the bottle — someone has opened it.
- **Bottle** — the sea is resin-dark green, its body and waves shaped by the bottle's own inside (narrowing into the
  shoulder). Beyond the glass the cabin looms: its wall, its shelf, its lamp as a bokeh sun. Hero: the lighthouse with
  red bands and a green dome, misted lantern panes, open door. The detail: the boat's mast light circling.
- **Lantern** — iron and brass round a glass lens. Through the panes: the bottle's sea, and beyond the bottle the giant
  cabin wall, warm. The detail: the hatch lid standing open, the stool, the oil can.

## Seams
- **cabin → bottle**: the camera comes down to the desk past the lamp, lines up on the bottle's axis outside the lip and
  enters the neck; on both sides of the hand-off the frame shows the lighthouse framed by the neck and shoulder glass.
  The sea's light is keyed from the lamp's side in the lamp's colour, so nothing jumps. Bounds: the box inscribed in the
  body's hollow (`[-52, -6.5, -12.9, 52, 19.3, 12.9]` m), never touching the glass.
- **bottle → lantern**: up the tower to the gallery, aimed at the open door; the hand-off happens on the threshold (the
  door frame and the lens in both). Bounds: the lantern and its gallery (`±270 cm`, `-20 … 420 cm`), so the bottle
  world's own lantern is cut away once inside.
- **lantern → cabin**: round the lens, then down to the hatch, looking through it at the cabin floor, the rug, the
  ladder; through the shaft into the cabin's ceiling; the first frame of the loop. Bounds: the cabin room.

## Camera
Cabin: from under the hatch, high over the desk (rug, chair, lamp) → down past the lamp (flame close, bokeh) → low
across the logbook → side of the bottle → on axis at the lip (`pace` .75–.9 as it gets close). Bottle: out of the neck
low over the waves → to the islet → up the tower → to the door (`pace` .85). Lantern: in through the door → the lens
fills the frame → round it (`pace` .8) → to the hatch, looking down (`up: [0, 0, -1]`).

## What would make it look like a tech demo
- **A dark, empty room** around the desk → bounce light, a sconce, light down the hatch; a rug, a shelf, a ladder.
- **A bottle that is just a cylinder with a flat sea** → a lathe bottle with shoulder and lip, resin built from its
  profile, waves that move.
- **The lantern as a wire cage** → prism rings thick and glassy, bull's-eye panels, the lamp inside.

## Stills review
From `render.mjs examples/lighthouse-bottle --sheet 12 --scale .5` and `--seams`, after the fixes listed in
references/LESSONS.md (rounds: first sheet too dark and the lantern panes missing → light and the two-sweep fix; the sea
ended in a slab → profile sea; the hatch descent showed a grid → hatch hole fixed).

| still | reads at a glance | light (key, falloff, no flat fill) | materials told apart | depth (dof, haze, layers) | alive (something moves) |
|---|---|---|---|---|---|
| 0 s | ✓ a desk under a window, from the ceiling hatch | ✓ lamp pool, hatch light on the rug, window cool | ✓ wood, brass, paper, rug | ✓ desk / rug / floor | ✓ flame |
| 2 s | ✓ the lamp and logbook | ✓ flame key, falloff to the wall | ✓ brass foot, glass chimney, ceramic mug, paper | ✓ lamp sharp, wall soft | ✓ flame, motes |
| 4 s | ✓ the bottle on the desk | ✓ lamp from the left | ✓ glass, leather, paper | ✓ logbook blurred in front | ✓ flame |
| 6 s | ✓ looking into the bottle at the lighthouse | ✓ warm side light inside | ✓ glass lip and shoulder, resin | ✓ neck in front, cabin behind | ✓ waves, beam |
| 8 s | ✓ a lighthouse on a dark sea | ✓ lamp reflections on the waves | ✓ water, rock, plaster | ✓ cabin shelf beyond the glass | ✓ waves, boat |
| 10 s | ✓ the tower | ✓ banded tower lit from the side | ✓ paint, iron, copper | ✓ cabin wall beyond | ✓ beam, boat light |
| 12 s | ✓ the lantern and gallery | ✓ lantern glow on the gallery | ✓ misted glass, iron rail, copper dome | ✓ cabin beyond | ✓ lens through the door |
| 14 s | ✓ the open lantern door | ✓ lens lamp | ✓ glass, iron, misted panes | ✓ door in front, lens behind | ✓ lens |
| 16 s | ✓ the Fresnel lens | ✓ lamp inside the glass | ✓ prism glass, brass | ✓ rings near/far | ✓ lens turning |
| 18 s | ✓ round the lens | ✓ | ✓ | ✓ | ✓ |
| 20 s | ✓ toward the hatch | ✓ lamp on the floor and lens base | ✓ iron floor, glass | ✓ lens in front | ✓ lens |
| 22 s | ✓ looking down the hatch into the cabin | ✓ hatch rim lit, rug in the light from above | ✓ brass rim, rug, wood | ✓ shaft / room | ✓ flame below |

Seams (from `--seams`): loop wrap ✓ · cabin → bottle ✓ · bottle → lantern ✓ (the panes behind the lens show the giant
cabin wall through the bottle glass — bright and warm; it reads as haze, accepted).
