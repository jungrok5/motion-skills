---
name: ink-summoning
description: Make a short cinematic "living ink" action film (10–25 s, 16:9) — a masked figure in black robes with long white hair swings a giant calligraphy brush in a minimalist white studio with a glossy floor; every swing lays a 3D ribbon of sumi-e ink in the air (dry-brush edges, splatter, ink smoke) that wraps around the figure, and the strokes come alive as ink creatures (tiger, wolf, dragon, koi, crane, phoenix) that charge the lens, coil overhead and hold a final tableau. Drawn entirely in code (Canvas 2D with its own 3D projection, no WebGL, no AI video model), with motion blur, a monochrome grade and a synthesised taiko score; outputs a live page and a 1920×1080 MP4. Give it a topic and it casts the summoner and the creatures and writes the shots. Use for "ink summoning / ink beasts / sumi-e action", "a warrior paints ink that turns into animals", remaking a Seedance/Kling/Sora-style ink-brush clip on a new subject, or "이 영상처럼 주제만 바꿔서" ("수묵 액션 영상", "먹으로 그린 호랑이가 튀어나오는 영상", "붓으로 휘두르면 먹이 용이 되는 영상", "수묵화 소환 영상", "가면 쓴 무사가 붓으로", "흰 스튜디오 먹 영상", "ink brush summoning video", "calligraphy brush creatures"). Source — made from https://x.com/AyeshaEvie/status/2117456171053596757.
---

# ink-summoning

A short action film in which ink comes alive: a masked summoner in a white studio swings a giant brush, every swing
leaves a ribbon of black sumi-e ink hanging in 3D space, and the ink turns into creatures — a tiger bursting from an ink
cloud at the lens, rings of ink wrapping the summoner, a rising stroke that peels away as a dragon, a final tableau.
Everything is code: a small 3D projection on Canvas 2D (camera, near-plane clipping, a mirrored pass for the glossy
floor), a rigged figure whose brush tip *is* the stroke, bristle-by-bristle ink rendering, creatures built on 3D
skeletons and painted with the same brush, sub-frame motion blur, a monochrome grade and a synthesised score. Every frame
is `seek(t)`, so the same page plays live (with sound) and renders to MP4.

Built in this repo on the worked example `examples/dragon-tiger` 「龍虎 · Dragon and Tiger」 (21 s, 10 shots), after the
16 s clip and prompt Ayesha posted on X, made with Seedance 2.5 (https://x.com/AyeshaEvie/status/2117456171053596757 —
prompt in the post, verbatim in references/BRIEF.md). That clip is an AI video; this skill rebuilds its *look and
grammar* (white studio, black ink, brush-to-beast, the cut rhythm, the tableau) as a deterministic engine of its own, so a
new topic gives a new film in the same style. The summoner, creatures, choreography and score here are this repo's own;
the dragon-and-tiger pairing is the classic East Asian ink-painting subject (龍虎圖), not a copy of the clip. The template
(`templates/film.html`, a fox-masked summoner, an ink wolf and three cranes) shows the topic swap.

## What's in this folder
| path | what |
|---|---|
| `lib/core.js` | seeded `rng`/`hash`/`noise2`/`fbm`, `keys` (monotone cubic keyframes), `ease`, colour `mix`/`rgba`, 3D `v3`, `dir`, two-bone `ik`, `spline` |
| `lib/space.js` | `view(cam, W, H)` — an orbit camera → `p()` projection, `poly()`/`seg()` near-plane clipping, `mirror()` for the floor reflection; `studio()` (panelled walls, light slots, ceiling light and beams, bright doorway), `floor()`, `fresnel()`, `ROOM` |
| `lib/ink.js` | `ribbon`/`rib` + `drawRibbon` (dense core, bristle hairs with dry gaps in arc length, inner streaks, wet sheen, splatter, evaporation), `arc`/`path` shapes, `smokeSprites`/`billow`/`drawPuffs` (ink clouds), `drops`/`drawDrops`/`drawSplats` (ballistic droplets and the splats they leave) |
| `lib/shape.js` | projected `tube`, `blob`, `soft3`, `poly3`, `line3`, `taper`, `facing` — bodies that read from any camera angle |
| `lib/summoner.js` | `summoner({ mask, keys })`, `POSES`, `moves()`, `rig(t)`, `trace(t0, t1, o)` (the ribbon the brush tip lays), `drawSummoner` — hakama, kimono, wide sleeves and white hair that lag the motion, masks `oni` · `fox` · `noh` · `crow` |
| `lib/beasts.js` | `quadruped(PRESET.tiger \| wolf, keys)`, `serpent(PRESET.dragon \| koi, path, keys)`, `bird(PRESET.crane \| phoenix, path, keys)`, `brush()` (paint along points with a camera-facing brush), formation from ink (`form`) |
| `lib/film.js` | `Film`: shots, orbit camera keys, the per-frame world (`w.summoner`, `w.trace`, `w.ink`, `w.beast`, `w.puffs`, `w.drops`, `w.floorInk`, `w.shadow`), reflection pass, depth slicing, motion blur, transitions, grade, live player, contract |
| `lib/score.js` | `renderScore(spec)`: taiko patterns, shime/ka, boom, gong, riser, brush, splash, roar, dragon, flute, pads, strings, bass, reverb |
| `templates/film.html` + `score.js` + `BRIEF.md` | an 11 s, 5-shot starting film (fox mask · wolf · cranes), commented |
| `examples/dragon-tiger/` | the worked example: `BRIEF.md`, `index.html` (10 shots), `score.js` |
| `examples/zoo/` | every creature preset, one shot each — look here after changing `beasts.js` |
| `scripts/new-film.mjs` | start a project (template or `--from dragon-tiger`) |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/check.mjs` | loads clean, every shot draws, no blank frames, deterministic, rules hold, score renders |
| `scripts/score.mjs` · `scripts/bundle.mjs` | score → WAV · one self-contained HTML file |
| `references/` | **BRIEF** (the reference prompt verbatim, the brief template, the review rubric) · **LOOK** (what makes it read as the reference) · **STORY** (topic → cast → shot grammar, timing, cameras) · **KIT** (API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  BRIEF.md     the topic written into the brief (references/BRIEF.md) — written first
  film.html    cast → shots (summoner keys, traces, beasts, smoke, camera) → checks → F.start()
  score.js     export const SCORE = { pad, strings, bass, flute, drums, sfx, air, reverb }
  lib/         copy of the skill's lib/ (new-film.mjs); imported through an import map ("ink/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/render.mjs film.html --sheet 20 --scale .5 --q mb=1`.
The page is an ES module: view it through a local server (`python3 -m http.server`).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. A 1080p frame with 7 motion-blur
sub-frames takes ~1.2 s per worker on a CPU; the 21 s example (633 frames) renders in ~3.5 min with 4 workers
(half size: ~1 min). Previews with `--q mb=1` (blur off) are ~6× faster.

## Workflow
1. **Topic → brief.** Fill references/BRIEF.md's template from the user's topic and save it as `BRIEF.md`: the summoner
   (mask, hair, robe — keep the black-robed, white-haired silhouette unless the topic asks otherwise), the tool (a giant
   brush by default), 1–3 creatures from the presets or a preset with new params (references/STORY.md has the casting
   table: a ground beast that charges, a sky beast that coils, an optional small flock), the beats, the final tableau. Keep
   its QUALITY STANDARD and MUST NOT LOOK LIKE lists. If the user gives a reference clip, pull stills first
   (`ffmpeg -i ref.mp4 -vf fps=2,scale=320:-1,tile=4x4 sheet.jpg`) and note its shot sizes, angles and cut rhythm.
2. **Shot table** (references/STORY.md): 8–11 shots of 1.2–2.5 s (the tableau 3–4 s), 15–25 s total, in the grammar
   *first stroke → the beast bursts out → floor sweep → rings → the circle → the beast prowls → close-up + whip → the
   rising stroke becomes the sky beast → it coils → tableau*. For each: framing, camera move, the summoner's moves, which
   strokes, which beast, smoke/drops, sound.
3. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from dragon-tiger`).
4. **Choreograph each shot**: summoner keys from `POSES` + overrides (yaw keeps counting through spins; `sY`/`sP` aim the
   brush), then `w.trace(S, t0, t1, { w, reach, dry, splat, seed })` for each swing — the stroke is the brush tip's own
   path, `reach` flings it wider than the brush. Free-standing ink (`I.arc`, `I.path` → `w.ink(rib, { head, fade })`) for
   shapes no swing makes (the big vertical circle, a floor ring). Beasts with keys (`form` 0 → 1 as they come out of the
   ink, `roar`, `gait`, `along` for path followers). Smoke at every birth (`I.billow`), drops at every landing (`I.drops`).
5. **Camera per shot**: an orbit `{ at, yaw, pitch, dist, fov, roll }` keyed over the shot — always moving (push in,
   orbit, crane); low angles for the beasts, a high angle for the rings, a frontal symmetric wide for the circle and the
   tableau, a dutch roll on the action. `mb` = shutter (0.4 calm … 1–1.4 whip), `shake` on impacts, `dof` on close-ups.
6. **Sheet and review**: `render.mjs film.html --sheet 20 --scale .5 --q mb=1`, then ~10 full stills at random moments
   (`--stills 3.1,7.6,…`), scored against the rubric in references/BRIEF.md: the ink is bristly (not vector), strokes face
   the camera (not edge-on lines), rings pass in front of and behind the figure, every beast reads in silhouette with white
   eyes and fangs, smoke billows (not a black ball), the floor reflects, nothing floats, the frame is high-key with deep
   blacks. Fix and repeat. Look at the reference stills next to yours.
7. **Check**: `node <skill>/scripts/check.mjs film.html` prints only `ok`; it lists the shot starts for the score.
8. **Score** (`score.js`): a drone from the first frame, `drums` (taiko pattern) under the action, a `brush` on every
   swing, `splash` + `boom` on every landing, `roar`/`dragon` on the beasts, the drums drop out for `flute` when the sky
   beast rises, then `riser` → `boom` + `gong` into the tableau. `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
9. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`; look at stills from the MP4 itself
   (`ffmpeg -ss 9 -i out/film.mp4 -frames:v 1 x.png`). One HTML file: `bundle.mjs film.html` (it paints live; say so).

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; seeds everywhere. `check.mjs` proves it.
- **The ink is the brush's path.** Strokes come from `w.trace` (or shapes placed where the brush just was); a stroke
  appearing away from the brush reads as fake. Swings are big — the brush is ~2.5 m and `reach` flings ink 0.5–1.2 m more.
- **Strokes face the camera.** A ring in a plane edge-on to the lens is a line; choose the camera (or the swing plane) so
  the big strokes are seen broad. Vertical rings: a frontal camera. Horizontal rings: a high camera.
- **Black and white only.** Ink `#0b0b0d`, a high-key studio (`ROOM`), white only for eyes, fangs, hair, mask, stripes
  and light. No colour, no text on screen.
- **Beasts are ink.** Dense black brushwork bodies with dry fur edges, white negative-space markings, white eyes and
  fangs; they form from ink (`form`) inside a smoke bloom and may dissolve back. Never a flat silhouette with clean edges.
- **Nothing floats.** Contact shadows (automatic for summoner and quadrupeds), reflections (automatic), splats where drops
  land, floor rings under the summoner in held shots.
- **Cut rhythm.** Shots 1.2–2.5 s cut on the beat (~0.9 s at 66 bpm); only the tableau holds. Motion blur on, a whip
  (`mb` 1–1.4) into or out of the close-up.
- **Original casts.** Masks, creatures and stories are designed per topic; no named characters or brands.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)`, `window.shotAt(t)`,
`window.film`, `window.__ready = true` — all set by `F.start()`. `?render=1` = fixed canvas, motion blur on (7 sub-frames),
no live loop; `?t=9` = one frozen frame; `?scale=.5` = preview size; `?mb=1` = blur off (fast previews);
`?off=reflect,mb,grade,bloom,grain,vignette,dof`. The live page fits the window and loops; click/space pauses, ← → jump,
the bar scrubs, ♪ plays the score in sync.
