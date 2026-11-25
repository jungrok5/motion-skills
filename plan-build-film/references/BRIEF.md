# The brief, and how stills are judged

Write `BRIEF.md` in the project before any geometry (`scripts/new-project.py` puts the outline there). A topic is
not a brief: "a Jeju stone house" leaves every decision open. The brief closes them, and the build answers to it.

## Outline

1. **The building in one paragraph.** What it is, where, for whom, in which season and hour. What a viewer should
   feel when the camera stands inside at the end.
2. **The input.** A sheet drawn in code from `plan.json` (`draw-sheet.py`), or the person's own sketch / plan /
   photo (`calibrate.py`). Its scale and the two points it was calibrated on. What did not add up when it was read
   (`references/READING.md`), and which way you decided.
3. **The numbers.** Lot, footprint, wall thickness, plinth, wall top, eave, ridge, overhang, bays, rooms, every
   opening (wall, position, width, height, sill), furniture positions. All in metres, all in `plan.json`.
4. **The look (3-4 references).** One high view, one room, one detail - each with the materials named (not "wood":
   "weathered cedar posts, oiled-paper floor, hanji in the lattice"). Image-model prompts for them if the person has
   none; the generated references stay out of the repo (`ref/`, git-ignored). They decide every material, the light
   and the furniture.
5. **The build, as a carpenter would.** The stages in order, and for each: its parts, how many, what holds each one
   up (a stone on the course below, a rafter on the ridge and the plate, a rope on the thatch). The stage list is the
   counter's rows and the film's flash colours.
6. **The film.** Tempo (BPM) and why it suits the building; the length (not round: 16-26 s); the beat each stage
   starts and ends on; the wave's origin (the focal point: a tree, a pool, a hearth) and its beat (a bar's downbeat);
   the lights' beat; the camera's route (descent, orbit, the hero view at the wave, the dive, the way in through a
   real opening, the turn, the last frame) and the title.
7. **The sound.** Each stage's material voice (`stone_heavy`, `stone`, `stone_light`, `wood`, `wood_light`,
   `paper`, `straw`, `metal`, `glass`, `soft`), the composed score (key, chords) or the person's own track, the
   ambience once the land is alive.
8. **What is fixed by the style** (below) - no need to repeat it, only to note where this building pushes on it.

## The still review (score every still and every contact sheet 0-2; fix anything under 2)

| | 2 = right | ask |
|---|---|---|
| Numbers | every size matches `plan.json`; the house on the sheet sits on its own drawing | does a wall stand on the drawn wall line? |
| References | materials, light and furniture match the reference beside the render | what differs? list it, fix it, render again |
| Carpentry | every visible part is a real member with a reason to be there; nothing floats, nothing pokes through | is anything poking through a roof or a floor? |
| Material read | stone reads as that stone (porous basalt is not a pebble), timber has straight grain along the member | would a builder name the material? |
| Light | the look (golden / day / dusk) reads at a glance; interiors are lit by their own lamps after the wave | is it gloomy, or flat? |
| Build | each stage lands bottom-up, in its colour, on the beat; the counter matches what is on screen | does anything land on air? |
| Wave | paper -> land and clay -> material spread from the focal point; nothing real shows before it | is the origin the thing we care about? |
| Camera | never a blank wall up close; the way in is through a real opening; the last frame is the brief's view | where is the eye at every second? |
| Title | readable, inside the frame, over a calm part of the image | does it cover the view? |

## Fixed by the style (every film)

The input is the first frame, seen straight down through a 200 mm lens and filling the frame; the camera spirals
down while the lens shortens; every part is its own object and lands in white clay flashing its stage's colour, on the
beat grid, bottom-up; a counter card counts them by stage; one wave from the focal point turns paper into land and
clay into the real materials, the studio into sky, the lights on; a slow hold; a dive and a way in through a real
opening; a turn to the view; the title. Khronos PBR Neutral. Procedural or CC0 materials only. Sound on every
landing slot in its material, the music's swell on the wave, -14 LUFS, -1 dBTP.

## Designed per topic (never copied from the example)

The building, its numbers and its stages; every part's geometry; the materials and the look; the sheet's drawings
and labels; the site that appears with the wave (land, trees, water, neighbours); the focal point; the tempo, the
stage beats, the camera route and the last frame; the stage colours and labels; the sounds per stage; the title.
