---
name: ultimate-move-short
description: Make a 15–45 s anime battle "ultimate move" showcase (技能纯享 / 필살기 연출) in black, white and one accent colour — one fighter (a rigged cel-shaded swordsman, spear-bearer or twin-blade fighter with trailing coat, hair and sash) in an empty white world; wet sumi ink dragged behind every move (墨影), slashes with fine red hairlines, impact frames (invert · black · white · red burst) and hit-stop; a sudden stillness; a domain of a thousand watchers (eyes, moons, mirrors, seals or a new motif) opening across the sky, turning to look, tied by red threads, cracking like glass and pouring into the weapon; a black void with a white-outlined figure; one stroke that cuts the world along a red line and slides it apart; white silence. Drawn entirely in code (Canvas 2D with its own 3D projection, no AI video model), with a synthesised 170–180 BPM percussion score; outputs a live page and a 1920×1080 MP4. Give it a topic and it designs the fighter, the three powers, the domain motif and the shots. Use for "anime ultimate move", "battle anime skill showcase", "sakuga fight short", "ink anime fight", "domain expansion style", "a thousand eyes / moons in the sky", remaking a Seedance/Kling/Sora battle-anime clip on a new subject, or "이 영상처럼 주제만 바꿔서" ("애니 필살기 영상", "전투 애니 스킬 연출", "수묵 애니 전투", "먹물 잔상 액션", "천 개의 눈이 뜨는 영역 전개", "이 스타일로 ○○ 필살기 만들어줘", "영상을 스킬로 만들어줘", "动漫技能纯享", "必杀技演出"). Source — made from https://x.com/lansenai/status/2119397520833126441?a=IR20TU3t9a9k-Ql4AIg&s=19.
---

# ultimate-move-short

An anime "ultimate move" short, the kind made to show one fighter's power at full stretch: already moving on the
first frame, wet ink tearing off every dash, three hits with impact frames, a first omen, a burst — then everything
stops. The fighter stands, red runs up the blade, the eyes wake; a watcher opens in the sky, then three, then a
thousand, all turned toward the fighter; they crack, hang, pour into the weapon; the world goes black around a white
outline; one stroke, and the world is cut along a red hairline and slides apart. Then white silence. Everything is
code: a small 3D projection on Canvas 2D (cameras orbit, push, dive), a rigged fighter drawn as flat cel shapes with a
rim light, cloth and hair that trail by sampling the pose a moment earlier, dry-brush ink, impact frames, a world
shear, motion blur, a grade and a synthesised score. Every frame is `seek(t)`, so the same page plays live with sound
and renders to MP4.

Made in this repo after the post by 澜森 (@lansenai) on X — https://x.com/lansenai/status/2119397520833126441?a=IR20TU3t9a9k-Ql4AIg&s=19:
a 30 s AI clip 「千瞳觉醒，万象崩塌」 (a black-clad swordsman, a thousand eyes, a world cut in two) and its prompt
(verbatim in references/BRIEF.md). That clip is an AI video; this skill rebuilds its *grammar* — the colour discipline,
the ink, the impact frames, the rhythm of attack → stillness → domain → cut → silence — as a deterministic engine, so a
new topic gives a new film. The worked example `examples/thousand-moons` 「月蝕 · Thousand-Moon Eclipse」 (30 s,
16 shots: a spear-bearer with a ponytail whose domain is a thousand moons that wax, eclipse to blood red and shatter)
was designed from a brief; the template (`templates/film.html`, a cropped-hair swordsman and a hall of mirrors) shows
the same grammar in 11.9 s. Never recreate the reference's swordsman, his eyes or his shots.

**Fixed (the style)** — black, white, greys and ONE accent (blood red `#e0142d` by default) that appears only as eyes,
hairlines in the ink, the blade edge, threads, the cut and the one burst frame; a pale empty world (sky, paper ground,
far shapes in haze); one fighter, one weapon, a black silhouette with one or two white shapes and a grey rim light,
cel close-ups; ink as wet brushwork (streaks along the motion, torn blots, flecks) that every move, strike and landing
makes; impact frames + hit-stop + shake from hits; the order attack → stillness → domain → collapse → cut → silence; a
domain of one motif in every depth; the final stroke cuts the whole frame along one line; cameras with a reason
(tracking, orbit, top shot, over the shoulder, pull back until tiny); 1920×1080, 30 fps; a percussion score that
stops for the stillness and goes silent before the cut.

**Designed per topic** — the fighter (build, face, hair, coat, white shapes, weapon), the three powers and their
names, what the ink shadow looks like, the first omen, the domain motif (pick from `MOTIFS` or draw a new one), the
world's far shapes, every shot's choreography and camera, the length (15–45 s), the accent hue if the topic demands it,
the score's events.

## What's in this folder
| path | what |
|---|---|
| `lib/core.js` | seeded `rng`/`hash`/`noise2`/`fbm`, `keys` (monotone cubic), `ease`, colour `mix`/`rgba`, `v3`, `dir`, two-bone `ik` |
| `lib/cam.js` | `view(cam, W, H)` — orbit or placed camera → `p()`, `k()`, `poly()`/`seg()` near clipping, `horizon()`; `hull`, smooth paths |
| `lib/fighter.js` | `fighter(design, keys)`: 3D skeleton with IK legs/arms (fixed bone lengths and bend directions), `POSES`, `run()`, trailing coat panels / sash / scarf / ponytail, hair locks, a sphere head with cel features, katana · odachi · spear · twin; `H.limits(t)` against `LIM`; `drawFighter` |
| `lib/ink.js` | `brush` (dense curve, body, tapered dry-brush slivers, red hairlines), `brush3`, `blot`, `splash`, `fleckList`/`flecks`, `inkShadow` (墨影) |
| `lib/fx.js` | `slash`, `smear`, `focusLines`, `motionLines`, `shardList`/`shards` (freeze, swirl, pull), `spaceCrack`, `cutLine`, `burst`, `vortex` |
| `lib/world.js` | `env` (sky, paper ground, far shapes in haze, ground marks), `groundCrack`/`drawCrack`, `groundRing` |
| `lib/domain.js` | `domain({ motif })` + `.giant` `.wall` `.swarm`, `drawDomain` (open · look · threads · crack · gone · eclipse), `MOTIFS` eye · moon · mirror · seal |
| `lib/film.js` | `Film`: shots, cameras, hits, hit-stop, depth-sorted world, wet ink layer, outlined fighter, impact frames, shear, motion blur, grade, live player, contract, body check hook |
| `lib/score.js` | `renderScore(spec)`: kit patterns, bass, drone, pad, slash/shing/dash/land/impact/ultimate/glass/crack/heart/ring …, gain keys, reverb |
| `templates/film.html` + `score.js` + `BRIEF.md` | the starting film (11.9 s, 8 shots), commented |
| `examples/thousand-moons/` | the worked example: `BRIEF.md`, `index.html` (16 shots), `score.js` |
| `examples/cast/` | the cast sheet: each fighter at 8 angles × 3 poses, every motif opening and cracking |
| `scripts/new-film.mjs` | start a project (template or `--from thousand-moons`) |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/check.mjs` | loads clean, every shot draws, no blank frames, **body limits**, rules, deterministic, score renders |
| `scripts/score.mjs` · `scripts/bundle.mjs` | score → WAV · one self-contained HTML file |
| `references/` | **BRIEF** (the reference prompt verbatim, the brief template, the review rubric) · **LOOK** · **STORY** (topic → powers → the grammar, shot table, motifs) · **KIT** (API) · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md     the topic written into the brief (references/BRIEF.md) — written first
  film.html    design → domain → shots (fighter keys, ink, slashes, impacts, cameras) → F.start()
  score.js     export const SCORE = { drums, bass, drone, pad, sfx, gain, reverb }
  lib/         copy of the skill's lib/ (new-film.mjs); imported through an import map ("um/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/render.mjs film.html --sheet 32 --scale .5 --q mb=1`.
The page is an ES module: view it through a local server (`python3 -m http.server`).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. 30 s at 1080p with motion blur
renders in ~4.5 min on 4 workers (0.25–0.3 s a frame); previews with `--q mb=1 --scale .5` are ~10× faster.

## Workflow
1. **Topic → brief.** Fill the template in references/BRIEF.md from the user's topic and save it as `BRIEF.md`: the
   fighter (silhouette, white shapes, weapon, face), three named powers (movement · strike · ultimate), the domain
   motif, the world, the beat table, the sound, QUALITY STANDARD and MUST NOT LOOK LIKE. If the user gives a reference
   clip, pull stills first (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=3x2 s%02d.jpg`) and note its beats.
2. **Shot table** (references/STORY.md): the grammar's 12–16 shots with times, framing, camera, keys, ink, impact
   frames, sounds. Keep the stillness long; shrink the action to shorten.
3. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from thousand-moons`).
4. **Design the fighter and the motif.** Write `DESIGN` overrides and (for a spear or a new weapon) a pose table on top
   of `POSES`; pick or write the motif (`MOTIFS.name = (ctx, s) => …`). Render the cast sheet for your fighter
   (copy `examples/cast`, put your design in `CAST`) — eight angles, both sides — and score it with the body list in
   references/BRIEF.md before writing shots.
5. **Choreograph each shot**: fighter keys from poses + overrides (`e: 'whip'` into strikes, `'snap'` for blinks);
   `w.ink` for the trail, `w.smear`/`slash` for strikes, `splash` + `groundRing` + cracks (with `until`) for landings,
   `shardList`/`fleckList` for debris; `F.impact` for every hit; `holds` for hit-stop; `hits` for shake.
6. **Cameras**: a reason for each (see LOOK.md); keep `mb` low on fast camera moves (a function of t if needed).
7. **Sheet and review**: `render.mjs film.html --sheet 32 --scale .5 --q mb=1`, then ~10 full stills at random moments,
   scored against the rubric in references/BRIEF.md (colour, ink, body, grammar, frame). Fix and repeat; look at the
   reference stills next to yours.
8. **Check**: `node <skill>/scripts/check.mjs film.html --step .1` prints only `ok` — including `body`. It lists the
   shot starts for the score.
9. **Score** (`score.js`): the kit under the attack, a sound on every move's frame, the kit stops at the stillness
   (heartbeat, drone), glass and resonance for the domain, cracks + riser for the collapse, `gain` to near-silence for
   0.2–0.3 s, the `ultimate` hit on the cut's frame, a ring at the end. `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
10. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`; look at stills from the MP4
    itself (`ffmpeg -ss 12 -i out/film.mp4 -frames:v 1 x.png`). One HTML file: `bundle.mjs film.html`.

## Rules
- **Design per topic.** A new fighter, new powers, a motif that belongs to the topic, new shots. The template and the
  example are examples of the style, not menus; never re-render them with a new title, never recreate the reference.
- **Keep one style.** The fixed list above holds for anything you add: a new motif is drawn in ink with the accent as a
  hairline; a new weapon gets a pale edge line and an accent `edge`; a new effect has a cause.
- **One accent.** Never a second colour, never accent fills (the single `burst` frame excepted), no glows bigger than a
  few times the line.
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; seeds everywhere. check.mjs proves it.
- **Bodies are possible.** check.mjs `body` must pass (knees, hips, neck, waist, reach, feet on the ground, moves along
  the facing); the cast sheet must read from both sides (CONTRIBUTING.md). Fix the pose or the transition, not the
  limit.
- **Ink has a cause and stays ink.** Trails come from the body's own past path, slashes from the blade's path or where
  it went; never flat vector shapes; cracks have `until`.
- **Fast and still alternate.** Dense action, then a real stillness, then growth, compression, the single biggest
  moment, white silence. Sound follows the same curve.
- **Original casts.** No named characters, no existing anime's eye designs or techniques; names and designs come from
  the topic.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)`, `window.bodyAt(t)`,
`window.shotAt(t)`, `window.film`, `window.__ready = true` — all set by `F.start()`. `?render=1` = fixed canvas, motion
blur on (5 sub-frames); `?t=9` = one frozen frame; `?scale=.5`; `?mb=1` = blur off; `?off=mb,grade,grain,vignette,
paper,shear,inkblur`. The live page fits the window and loops; click/space pauses, ← → jump, the bar scrubs, ♪ plays
the score in sync.
