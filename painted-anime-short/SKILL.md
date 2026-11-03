---
name: painted-anime-short
description: Make a short animated film (30–90 s) in the look of a hand-painted anime feature — gouache-like painted backgrounds (dawn skies with pink-lavender cloud bands, misty forests built from leaf flecks, mossy trunks and hanging vines), an overgrown, weathered hero with cel shading and ink lines, a little bluebird, light shafts, falling leaves, a multiplane camera, a warm faded film grade with grain — drawn entirely in code on an HTML Canvas, with a synthesised score (pads, music box, strings, wind, chirps, rumbles). Outputs a live page and a 1920×1080 MP4. Give it a topic and it writes the shots. Use when asked for a "Ghibli-like" / painterly / hand-painted anime short, "make a video like this but about X", a one-shot code-only animated film, a cinematic nature short, an overgrown machine / ruin waking up, or to remake a painterly reference video on a new subject ("지브리풍 영상", "손그림 애니메이션 풍", "수채화 같은 애니메이션", "코드로 만든 애니메이션 단편", "이 영상처럼 주제만 바꿔서", "숲 속 이끼 낀 기계가 깨어나는 영상", "painted anime short", "anime background style film", "hand-painted animation in code").
---

# painted-anime-short

A short film that looks hand-painted — the dawn-sky, misty-forest, moss-and-rust world of classic hand-drawn anime
features — made entirely of code: every background is painted stroke by stroke on a Canvas at build time from seeded
brushes, every shot is a multiplane camera moving over those painted plates, and the film carries its own synthesised
score. Give it a topic ("an old lighthouse", "a sleeping stone whale", "the last tram") and it writes a 6–9 shot story
in the genre's grammar and paints it. Every frame is `seek(t)`, so the same page plays live (with sound) and renders to MP4.

Built in this repo on the worked example `examples/last-tram` 「The Last Tram」 (48 s, 8 shots), after a one-shot
code-only film posted by Chetaslua on X (https://x.com/chetaslua/status/2117169796290916732, Nov 2026: "THIS IS PURE CODE …
one shotted this video"; 80 s, an overgrown machine wakes in a forest at dawn and flies off over the clouds). Only the look
and the techniques are borrowed — layered painted plates, leaf-fleck foliage, weathered cel hero, haze by depth, the shot
grammar, the grade; the code, the tram, its story and the score are this repo's own. Never recreate a specific film's
character or design (no named robots, spirits or studios' creatures) — design an original hero for each topic.

## What's in this folder
| path | what |
|---|---|
| `lib/paint.js` | brushes (`dab`, `streak`, `scrub`, `flecks`, `spray`, `ribbon`, `flower`, `sparkle`, `ink`) and painters (`sky`, `cloud`, `cumulus`, `cloudBank`, `clump`, `canopy`, `conifer(s)`, `trunk`, `grass`, `fern`, `mist`, `haze`, `layer`, `shadow`, `weather`), moving things (`leaves`, `flock`, `motes`, `rays`, `glow`), seeded `rng`/`hash`/`noise2`, `keys` (monotone cubic), `ease`, colour `mix`/`vary`/`shade`/`rgba` |
| `lib/kit.js` | `bird` (a bluebird: perched, hopping, looking, flying), `puff` (dust), `sapling`, `mossCap` (moss, tufts, flowers along an edge), `rock` |
| `lib/film.js` | `Film`: `plate()` (painted once, optional depth-of-field blur), `shot(dur, draw, {cam, shake, tr})`, multiplane `g.put(plate, x, y, z)` / `g.at(z, fn)`, transitions (dissolve, white, black, fades), the grade (bloom, split tone, lifted blacks, vignette, grain), live player with sound, `check()`, the contract |
| `lib/score.js` | `renderScore(spec, sr, dur)`: pads, strings, bass, music-box bell, wind, sfx (`chirp`, `flutter`, `whoosh`, `rumble`, `flicker`, `chime`, `thump`, `rustle`), reverb — plain JS, same output in the browser and in Node |
| `templates/film.html` + `score.js` | a commented 12 s, 3-shot starting film (dawn → a mossy stone lantern in a clearing → a bird lands, the lantern lights) |
| `scripts/new-film.mjs` | start a project: `lib/` + `film.html` + `score.js` (template or `--from last-tram`) + `out/` |
| `scripts/render.mjs` | stills (`--stills 3,8`), a contact sheet (`--sheet 16`), or the MP4 (workers × ffmpeg chunks; `--audio out/x.wav`) |
| `scripts/score.mjs` | the score → WAV (`score.js --dur 48 --out out/film.wav`) |
| `scripts/check.mjs` | proves the page: loads clean, every shot draws, no blank frames, deterministic, rules, score renders |
| `references/` | **LOOK** (palette, layer stack, brushes, hero, grade — what makes it read as painted) · **STORY** (topic → shots: the grammar, timing, a shot table) · **KIT** (API) · **LESSONS** (what broke and the fix) |
| `examples/last-tram/` | the worked example: `index.html` (8 shots), `tram.js` (the hero in side view and a front close-up), `score.js` |

## Project layout (what you create)
```
my-film/
  film.html    palettes → plates (F.plate) → hero painter → shots (F.shot) → checks (F.check) → F.start()
  hero.js      (optional) the hero painter in local units, painted again at each scale it is seen at
  score.js     export const SCORE = { pad, strings, bass, bell, air, sfx, reverb }
  lib/         copy of the skill's lib/ (new-film.mjs); the page imports it through an import map ("pas/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet 16 --scale .5`. The page is an
ES module: view it through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (Canvas 2D: ~0.2 s a 1080p frame on
a CPU; a 48 s film renders in ~7 min with 4 workers).

## Workflow
1. **Topic → story → shot table** (references/STORY.md). Pick an original hero that can be *overgrown and asleep* and
   can *wake and leave* (a tram, a lighthouse, a stone whale, a windmill, a diving bell, a bus-stop shrine …), a place
   (forest, coast, terraced hills, a flooded town), a time of day (dawn is the default; dusk and after-rain also work),
   one small living witness (the bluebird, a cat, a fox) and one moment of magic (a lamp wakes, a door opens, a bell
   rings). Write 6–9 shots in the grammar *establish → approach → detail → the witness → the turn → the lift → the big
   sky → the quiet return*, 3–8 s each, 40–80 s total, as a table: time, framing, camera, what moves, transition, sound.
   With a reference video, extract stills (`ffmpeg -i ref.mp4 -vf fps=1/2,tile=4x3 sheet.jpg`), list its palette, layers,
   shot sizes and transitions — then design your own hero and story; never copy a frame or a character.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from last-tram` to start from the 8-shot film).
3. **Palettes** first (references/LOOK.md): a sky gradient, a cloud palette, 3–4 foliage palettes from far (pale, warm,
   low contrast) to near (deep teal-green), a bark set, the hero's two or three base colours + rust/patina, and the air
   colour distance fades to.
4. **Plates, back to front, one shot at a time**: sky → far → mist → middle → hero → foreground framing. Paint each depth
   on its own plate (or `P.layer` with its own haze), blur the ones out of focus (`{ blur }`), make plates wider/taller
   than the frame by the camera's travel × depth. A still after each shot: `render.mjs film.html --stills 9 --scale .5`.
5. **The hero** as a painter in local units (origin at its foot) — cel base colours via `P.weather` (shadow shape,
   rust/patina blotches, drips), `P.ink` outlines, moss (`K.mossCap`, clumps), a sapling, vines. Paint it into a plate
   *at each scale it is seen at* (wide, medium, close-up) with the same seed so it matches across cuts; a face-on
   close-up is its own painter (like `tramFront`).
6. **Motion** in the shot's `draw(g, lt)`: camera keys (always drifting — push in, truck, tilt), the hero's moves from
   pure functions of `lt` (wobble, lift, bank), the witness (`K.bird` with a path function), leaves, motes, flocks, rays,
   glows, puffs, a shake at the turn, a white flash into the lift.
7. **Sheet**: `render.mjs film.html --sheet 24 --scale .5` — every shot reads at a glance, nothing floats (contact
   shadows, grass over feet/wheels), no plate edge shows when the camera moves, the witness stands *on* things, the light
   comes from one side in every shot.
8. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok`. Add `F.check(...)` for anything that must
   hold (the bird is on the roof after landing, the hero is in frame).
9. **Score**: write `score.js` against the shot starts (check.mjs prints them): a chord per 2.5–3.5 s, a music-box
   motif while the witness is on screen, strings from the turn through the big sky, sfx on the beats (chirp, flutter on
   take-off, flicker + chime when the light wakes, thump + rumble + rustle at the shudder, whoosh on the lift). Listen on
   the live page (♪ button), then `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
10. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`. Look at stills from the MP4
    (`ffmpeg -ss 20 -i out/film.mp4 -frames:v 1 x.png`) before handing it over.

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames: `P.rng(seed)` inside plate painters, `hash`,
  `noise2`, `keys`, `ease` in shots. `check.mjs` proves it.
- **Paint once, move many.** All brushwork goes into plates at build time; per frame only plates are placed and light
  things are drawn (birds, leaves, motes, rays, glows, puffs). A frame with thousands of fresh dabs is slow and flickers.
- **Everything is brushwork.** Foliage is leaf flecks (`clump`, `canopy`), never flat circles; clouds are cumulus with
  dragged undersides; trunks have bark strokes and a lit rim; grass is blades. Only the hero gets flat cel colour — and
  even it is weathered (`weather`), outlined in ink and overgrown.
- **Air between depths.** Every depth layer is hazed toward the air colour in proportion to its distance (far ~.5,
  middle ~.3, near ~.1) and close-up backgrounds are blurred (8–14 px). Foreground framing (dark trunks, a leaf ceiling,
  grass) is the darkest, most saturated thing in the frame.
- **One light.** The sun sits low behind the scene (warm glow, rays from one side); lit edges of clumps, trunks and the
  hero face it. Never light from below except a lamp.
- **Nothing floats.** Contact shadows (`P.shadow`) and a strip of grass in front of anything standing on the ground; the
  witness's feet are on a surface (write a check).
- **The camera always moves** a little (1–8 % zoom or 40–150 px truck per shot), shots are 3–8 s, cuts are hard except
  into/out of the big moments (dissolve 1–1.4 s; white flash .8 s into the lift; fade in/out at the ends).
- **The grade is always on** (bloom, cool-top/warm-bottom split, lifted blacks, cream multiply, vignette, grain). Turn
  parts off only to debug (`?off=grain,bloom,grade,vignette,dof`).
- **Original designs only.** The hero, the creatures and the story are yours. No text on screen except a sign or a
  number painted on the hero.

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}` (1920×1080 stage units),
`window.runChecks(t)` (names of broken rules), `window.shotAt(t)` (`{i, name, lt}`), `window.film`, `window.__ready = true`
— all set by `F.start()`. `?render=1` = fixed canvas, no live loop; `?t=20` = one frozen frame; `?scale=.5` = preview
size (plates are painted at that size); `?off=grain,bloom,grade,vignette,dof`. The live page fits the window and loops;
click or space pauses, ← → jump a second, the bar scrubs, ♪ plays the score in sync.
