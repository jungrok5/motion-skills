# LOOK — what makes these films read as photographs

The reference is a 36.5 s film titled ESCAPEMENT ("every frame is python, no 3D assets were used"):
<https://x.com/LexnLin/status/2119558994352304202?a=cxbG0xl325NxMxhz9eQ&s=19>. This file is the analysis of it and the
numbers the skill is built on. The film itself is not copied: its subject (a watch escapement, a car, a clock temple) belongs
to it. What the skill takes is the method below.

## The reference, shot by shot
| time | what is on screen | how the cut works |
|---|---|---|
| 0.0-1.5 | macro: gear teeth meshing, backlit amber, bokeh discs behind | fade up from black |
| 1.5-3.0 | macro: pallet fork with ruby jewels, a balance spring | hard cuts on movement |
| 3.0-6.0 | deeper in: wheels in the dark, then a whip through a whole clockwork hall | whip pan (motion blur hides the cut) |
| 6.0-7.0 | a gear wheel — which is now a car wheel | **match cut on shape** |
| 7.0-9.5 | dark studio: a car assembles itself from floating panels | parts fly home |
| 9.5-13.0 | the finished car: front, tail-light, three-quarter; warm strip lights, glossy floor | hard cuts |
| 13.0-14.0 | the studio breaks apart into a road | the set itself is the transition |
| 14.0-20.0 | desert canyon drive: chase, wheel close-up, mirror, top-down, tail | 0.7-1 s cuts, heavy motion blur |
| 20.0-22.5 | dust swallows the frame, the dust is cloud | **dip to white on a matching texture** |
| 22.5-25.0 | above the clouds: an island with a temple complex | push in |
| 25.0-28.0 | through the gate to a clock temple, reflected in a pool | fly through |
| 28.0-30.0 | the temple is a postcard on a desk | **the world is a picture**: pull back |
| 30.0-33.0 | skimming a blueprint to a pocket watch | low fly-over |
| 33.0-34.5 | into the watch: the first gears again | dive, the film closes its loop |
| 34.5-36.5 | title ESCAPEMENT, gold capitals over out-of-focus gears | fade |

Measured from the 1080p file (Pillow, luminance = Rec.709):

| | value |
|---|---|
| frame | 1920×1080, picture 1920×804 (2.39:1), black bars 138 px top and bottom |
| frame rate / length | 24 fps, 36.54 s, about 20 shots (mean 1.8 s; the drive cuts every 0.7-1 s) |
| median luminance | 13-37 of 255 in the studio and macro shots; the picture is *dark* |
| 95th percentile | 110-190 of 255; only practical lights and speculars reach the top |
| blacks | 5th percentile 2-6: lifted a hair, never crushed to 0 |
| colour | warm practicals (amber/pink-white) against teal-blue ambient; red only in tail-lights and jewels |
| grain | visible at 1:1 everywhere, strongest in mid-greys |
| sound | integrated −13.9 LUFS, true peak −1.4 dBTP; mechanical ticks, whooshes into cuts, a low bed |

## Why it reads as photographed, and where the skill does each thing
1. **Real light transport.** Soft shadows, inter-reflection, reflections of the whole set in the floor and in every part.
   → Cycles path tracing (`pf.scene`), no baked or screen-space tricks.
2. **A real lens.** Shallow depth of field with shaped bokeh, focus that is *pulled*, 180° shutter motion blur on
   everything that moves, including the camera. → `s.camera(lens, fstop, blades, squeeze)`, `focus=` per frame,
   `motion_blur_shutter = 0.5`.
3. **Light you can see.** Practical lights are in the picture (strip panels, lamps, the sun) and glow in the air.
   → `light.panel`, `light.haze`, bloom and halation in `pf.finish`.
4. **Edges that catch light.** Nothing has a razor edge; every part has a bevel where the highlight sits.
   → `geo.prism(bevel=)`, `geo.bevel`, `rrect_profile` in every lathe.
5. **Surfaces that vary.** Roughness wanders, metal is brushed in the direction it was machined, paint has orange peel.
   → the `wear`, `brushed`, `grain`, `scale` arguments of every `pf.mat` recipe.
6. **Small things in the air.** Dust motes and far practicals that turn into bokeh discs. → `geo.scatter`, small emissive
   spheres behind the subject.
7. **A dark, graded image.** Low median, warm/cool split, highlights that roll off instead of clipping, a black that is
   not zero, grain. → AgX tone map, split tone, `black`, `grain` in the look.
8. **Lens faults.** A little chromatic aberration and vignette, halation round the brightest points. → `ca`, `vignette`,
   `halation`.
9. **A camera with weight.** One move per shot, eased; a little hand-held noise; whip speed only into cuts.
   → `s.shoot(fn)` with `util.seg` easing, `s.shake`.
10. **A chain of scales.** Each cut changes scale (mechanism → machine → world → the world as a picture → back in) and
    is motivated by a shape, a light or a movement. → `references/SHOTS.md`.

## Numbers to hold yourself to
Check stills with `pf.finish.stats` (the contact sheet prints them):

| kind of shot | median (0-255) | p95 | notes |
|---|---|---|---|
| macro / studio (dark field) | 8-40 | 100-215 | the subject is drawn by highlights, not by fill |
| daylight exterior | 90-150 | 190-235 | sky must not clip to flat white; the sun may |
| desk / interior practical | 40-90 | 180-230 | one warm pool, cool fill two stops under |
| title | 5-30 | 120-220 | the word is the brightest sharp thing in frame |

- Picture 1920×804 inside 1920×1080; 24 fps; shots 0.8-3 s; a whole film 12-40 s.
- Grain 0.05-0.06, chromatic aberration 0.001-0.002, vignette 0.3-0.45, halation 0.2-0.45, bloom 0.1-0.2.
- Loudness −15 LUFS, true peak −1.5 dBTP (`encode.py` normalises).

## What the skill deliberately does not do
- No model files, HDRIs or texture downloads: geometry and images are generated (images drawn with Pillow are fine).
- No 2D overlays for titles or captions: type is an object in the scene.
- No fake depth of field or motion blur in post: both come from the renderer.
