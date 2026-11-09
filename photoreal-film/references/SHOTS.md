# SHOTS — the grammar: scales, shot types, cuts, light recipes

A film in this style is a **chain of worlds at different scales**. Each shot does one thing with one camera move, and
each cut is motivated. Design the chain first (BRIEF.md), then build shots.

## The chain
Pick 5-10 links from this ladder for the topic; go up it, then come back down to where you started:

| scale | typical shot | lens / f-stop | camera distance |
|---|---|---|---|
| **mechanism** (1-5 cm) | macro of the smallest working part: teeth, blades, a nib, a valve, a stitch | 90-120 mm, f/8-f/16 | 8-20 cm |
| **parts** (10-40 cm) | the object exploded along an axis, sliding together | 65-85 mm, f/4-f/5.6 | 0.5-1 m |
| **object** (0.2-5 m) | the hero three-quarter in a dark studio; detail cuts (logo, light, wheel) | 50-90 mm, f/2.8-f/5.6 | 0.4-8 m |
| **use** (10 m-10 km) | the object in the world it was made for, or the world it looks at | 24-40 mm, f/5.6-f/11 | — |
| **picture** (0.3-1 m) | that world as a print / postcard / screen / drawing on the maker's desk | 35-50 mm, f/2.8-f/4 | 0.2-0.5 m |
| **return** | from the desk back into the mechanism | 28→20 mm, f/2.8 | rush |
| **title** | the word in front of the mechanism, out of focus | 100 mm, f/2.8-f/4 | 0.2 m |

Real scale matters: build in metres at true size. A macro of a 3 cm part with the camera 15 cm away has the depth of
field of a real macro only if the part is 3 cm.

## Shot types and their numbers
**Macro of a mechanism.** Camera off the part's axis by 25-40°, pushing in 10-20 % over the shot. One cool raking
strip (long and thin, grazing the surface), one warm kick opposite, something hot *behind* the part seen through a gap.
3-7 small emissive spheres 0.2-0.6 m behind become separate bokeh discs. `geo.scatter` dust near the focus plane.
Aperture: `focal / N` must stay under about a tenth of the focus distance or nothing is sharp (`check.py` warns).

**Exploded view.** Lay parts along the axis in order with equal gaps (compute the offsets from each part's length, as
`examples/aperture/props.py` `lens()` does). Animate each part home with `ease_in_out` over ~1 s, staggered from the
middle outward or back to front; threaded parts turn as they slide. Camera arcs 25°→50° off square and closes in so the
assembled object ends at 60 % of frame height. Focus travels from the nearest part to the assembled object.

**Hero in the studio.** Black near-mirror floor (`mat.floor`), 3-4 warm strip panels behind at different depths and
heights (they must show in the floor and in the object), a cool soft top light with `spread` so it does not light the
haze, two long boxes in front for the highlight lines that draw the form, haze 0.01-0.02. Low camera (object's
mid-height or below), slow push, 1-2° of roll.

**Detail cuts.** 0.7-1.2 s each, locked or barely drifting, on a logo, a lamp, a wheel; cut on a movement
(a click, a light coming on).

**The world.** `light.sky` with the sun 2-10° up for golden hour (strength 0.06-0.12, not 1: the physical sky is
thousands of times brighter than a studio), `light.haze` 0.0005-0.002 per metre over hundreds of metres, an OCEAN
modifier or a `geo.grid` terrain, silhouettes on the horizon for depth. Keep the horizon off-centre and the camera low.

**The world as a picture.** List the source frame in `film.py` (`plates=[('s06_coast', 57)]`), get it with
`s.plate(...)`, put it on a plane with `mat.picture`. Start the camera square on at the height where the picture
exactly fills the frame (`h = picture_width * lens / sensor`), pass `up=(0, 1, 0)`, then lift and turn. Hide the
change of grade with a 3-5 frame white flash on the cut (the shutter).

**The dive.** `ease_in` with a high power (2.5-3) so it starts slow and rushes; lens widens as it goes; roll 20-30°;
end inside darkness and dip to black.

**Title.** `geo.text` at the focus plane, wide tracking (1.6-1.8), brushed gold metal lit by one warm soft key from
above. Behind it: something from the film, far enough to be shapes only, and darker/cooler than the letters.
Bokeh practicals go to the sides of the word, not behind it.

## Cuts
| cut | when | how |
|---|---|---|
| hard cut on movement | default | end the shot on a click, a seat, a lock; the next starts already moving |
| match cut on shape | two things share a silhouette (gear/wheel, iris/sun, disc/planet) | same screen position and size on both sides |
| whip | between two shots at the same scale | last 4-6 frames: camera sweeps > 1 frame-width per frame; motion blur does the rest |
| dip to white | exposure, dust, cloud, snow, a flare | `fade_out=('white', 6)` + `fade_in=('white', 8-10)` |
| dip to black | entering or leaving an interior, the end | `fade_out=('black', 5)`, `fade_in=('black', 6-8)` |
| the set is the transition | studio → world | animate the set's walls away; needs both sets in one shot (in the reference; not built in the bundled example) |

## Light recipes (watts are for the stated set size; they scale with distance²)
| set | lights |
|---|---|
| macro, 5 cm | strip 0.012×0.2 m at 0.14 m, 0.1-0.25 W, 6500-8000 K; kick 0.035 m, 0.03-0.05 W, 3000 K; emissive sphere r 9 mm strength 20-30 behind |
| tabletop, 0.3 m | panels 0.035×0.5 m strength 10-22 at 2700 K; top 0.9×0.25 m 4-5 W 9000 K spread 110°; boxes 0.06×0.7 m 3-5 W |
| room / car, 5 m | multiply tabletop watts by (5/0.3)² ≈ 280: panels strength the same (they are emitters), areas 1-1.5 kW |
| desk | spot 40-50 W 2850 K at 0.7 m, angle 60°, blend 0.6; window area 0.8×0.5 m 8-10 W 9500 K |
| exterior | `light.sky(elev=3-8, strength=0.06-0.12, dust=2-3)`; no other light |

## Time
24 fps. Budget 0.8-3 s per shot and write the frame counts in `film.py` first; the score is cut to them.
Fast sections (a drive, an assembly montage) cut every 17-24 frames; contemplative ones hold 54-72.
