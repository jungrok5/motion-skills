---
name: principle-pass
description: Make a before / after animation-principles clip — one creature doing one short action twice at once, stacked: on top the honest first pass (the same story keys, linear in-betweens, feet sliding, tail rigid, no squash, a dead idle), below the same keys after a Disney-principles pass (slow in / slow out, anticipation, arcs, follow-through and overlap on springs, squash & stretch that keeps volume, planted feet, breath and blinks), each beat labelled with the principles it shows, ending on a study that draws the paths and spacing dots of both. Everything is code — a side-view creature rig painted in gouache daubs on Canvas 2D — and every principle is measured by a meter (lib/principles.js + scripts/audit.mjs) that any other skill can copy to check its own motion. Give it a topic (a creature and an action) and it writes a brief, designs the creature, keys the story, adds the pass, checks it and outputs a 1080×1350 MP4, a live page, stills, a cast sheet and the audit table. Use for "before and after animation", "apply the 12 principles", "Disney animation principles", "make this motion less stiff", "animation principles demo", "principles pass", "애니메이션 원칙", "디즈니 12원칙", "전후 비교 애니메이션", "움직임 자연스럽게", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서". Other skills: read references/ANIMATION-PRINCIPLES.md at the repo root before keying any motion. Source — made from https://x.com/endel/status/2125224240488354066?a=X8s7fGWOhQz93WbUoz8&s=19
---

# principle-pass

A 9–12 s vertical clip: two panels of the same locked side view, **before** over **after**. A creature does one short
action — a pounce, a belly flop, a stretch and shake — once as a first pass would key it and once after the twelve
principles are applied on top, with the beat's name and the principles it shows as labels. Then both panels hold and
draw the paths of the nose, hips and tail with a dot every 1/12 s: even dots on straight lines above, bunched dots on
curves below. The input is a topic (a creature and an action). The output is a 1080×1350 MP4 at 30 fps, a live page,
stills, a contact sheet, a cast sheet turned both ways and the meter's table (`out/<name>-audit.json`).

It is also the repo's **motion reference**: `lib/principles.js` is the principles as code (easing, keys, Hermite
arcs, second-order springs for follow-through, area-kept squash, breath / blinks / flicks) plus a meter that measures
them from any motion track, and `scripts/audit.mjs` runs that meter on any skill's page. The shared notes are
[`references/ANIMATION-PRINCIPLES.md`](../references/ANIMATION-PRINCIPLES.md) at the repo root — every skill that moves
something reads it with `references/MOTION-QUALITY.md`.

Made in this repo after an X post by Endel (@endel) —
https://x.com/endel/status/2125224240488354066?a=X8s7fGWOhQz93WbUoz8&s=19 — "when you ask AI to follow Disney's
animation principles": a 2.8 s split clip of a brush-stroke fox pulling out of the snow and shaking off, `before` on top,
`after` below, the beat's name in a pill. This skill takes the form (the same beat twice, stacked, labelled) and the idea
(the principles are a pass over unchanged story poses) and makes the pass explicit and measurable in code. It does not
take the fox, the snow, the dive or the clip's frames (references/SOURCE.md). Starter: `templates/` "Pounce" (a grey cat,
9 s). Worked example: `examples/penguin-slide` "Belly slide" (a penguin, 10.4 s).
Live: https://jungrok5.github.io/motion-skills/principle-pass/

**Fixed by the style** (every piece):
- the form: two identical locked side-view panels, before over after (or side by side), `before` / `after` pills, the
  beat label in the after panel, the beat's principle tags; then a study (ghosts, paths, a dot every 1/12 s);
- the before is the honest first pass of the same story keys — never a strawman: same poses, same times, nothing else;
- the after adds only the pass: eases, pass keys (anticipation, overshoot, settle), the Hermite root path, planted
  feet with swing arcs, springs on tail / ears / squash, breath, blinks, flicks;
- the look: a creature of thick gouache daubs (no outlines), a paper wall and a painted floor, soft contact shadows,
  Inter labels; silent, 30 fps, 4:5.

**Designed per topic** (never reused): the creature (body plan, proportions, palette, what follows through, its
idle), the action and its beats, the story keys, the pass (which principles each beat leans on and how far), the
feet, the ground and props, the labels, the study points.

## What's in this folder
| path | what |
|---|---|
| `lib/principles.js` | **the shared toolkit**: `E` easings, `keys`, `timeFor`, `anticipate` / `overshoot` / `exaggerate`, `dynamics` (springs), `lag`, `chain`, `squash`, `stretchFromVelocity`, `arc`, `catmull`, `swing`, `breath`, `noise`, `blinks`, `flick`; the meter `audit` / `compare` / `table` / `PRINCIPLES` |
| `lib/rig.js` | `Critter`: side-view skeleton (spine curve, neck, head, jaw, ears, tail chain, 3-segment limbs with IK to planted feet), `hipHeight`, `footHome`, `calibrate`, `joints` |
| `lib/paint.js` | the look: seeded daubs riding parts, belly band, ground, contact shadow, props, label pills |
| `lib/film.js` | `Motion` (before / after from the same keys), `Film` (panels, labels, study, `track`, `audit`, `rigReport`, `castSheet`), `turnMotion`, `mount` |
| `lib/fonts/` | Inter 600 (OFL) |
| `templates/` | the starter "Pounce": `BRIEF.md`, `piece.js`, `index.html` |
| `examples/penguin-slide/` | the worked example "Belly slide": a biped, a waddle, a flop, a slide |
| `scripts/new-piece.mjs` | start a project (starter or `--from penguin-slide`) with its own `lib/` |
| `scripts/render.mjs` | MP4 (`--scale .5` preview), `--still t,t`, `--sheet 12`, `--cast`, `--gif`; writes `out/<name>-audit.json` |
| `scripts/check.mjs` | brief · loads · draws · deterministic · principles (after passes all, before fails ≥ 4, tags earned) · body · form |
| `scripts/audit.mjs` | the meter for **any** page or track: `--page index.html`, `track.json`, `before.json after.json`, `--strict` |
| `references/` | **BRIEF** (template + rubric) · **RIG** (spec, channels, keys, plants, springs, contract) · **LOOK** · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-piece/
  BRIEF.md     topic → creature → beats (story keys) → the pass → review log
  piece.js     export piece = { critter, keys, plants, follow, life, beats, rest, study, cam, look, props }
  index.html   the page (import map "pp/" → ./lib/)
  lib/         copy of the skill's lib/
  out/         MP4, stills, sheets, audit (not committed)
```
Requirements: Node 18+ and Playwright's Chromium; ffmpeg. No network, no npm install. A 10 s piece renders in about a
minute with 3 workers.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` (references/BRIEF.md): the creature and the action, why it teaches, the creature
   sheet (mass, proportions, palette, what follows through, idle), the beats with their story keys, the pass table,
   the feet, the study.
2. **Start the project.** `node <skill>/scripts/new-piece.mjs my-piece` (or `--from penguin-slide`). The starter is one
   example of the style: replace the creature, keys, feet and labels with what the brief designs.
3. **Design the creature** (references/RIG.md). Render the cast sheet (`render.mjs index.html --cast`) and score it
   before keying: the story keys both ways, the idle, a stepped turn. Read the joint marks (✗).
4. **Key the story** — only the poses that tell it (pose to pose), at their times, `stop` / `impact` where it rests or
   hits. Play the page: the before panel is now exactly this.
5. **Add the pass**, in this order (references/ANIMATION-PRINCIPLES.md): timing and eases → anticipation keys → the
   arc of the root (let speed carry through apexes) → plants and swings → springs (`follow`) → squash keys → `life` →
   exaggeration (push the pass keys past the story poses). Every addition is a `pass: true` key, a plant or a spring.
6. **Measure.** `node <skill>/scripts/check.mjs index.html` — it prints both panels' numbers. Fix what the after fails
   at the frame it names (a foot leaving at full speed, a kink at a key, a frozen rest).
7. **Look.** `render.mjs index.html --sheet 12 --scale .5`, stills at the big beat; score with the rubric; log the round
   in the brief.
8. **Deliver.** `render.mjs index.html` → `out/<name>.mp4` (1080×1350) and `out/<name>-audit.json`; the live page.

## Rules
- **Design each piece from its topic.** A new creature, action, beats and pass every time; the starter and the example
  are examples, not menus. Never re-skin the cat or the penguin for another topic.
- **Never recreate the source** — no fox, no snowfield, no dive into snow, none of its frames. Take the form and the idea.
- **One style.** Gouache daubs from `paint.js`, two identical panels, pills in Inter; no image files, no libraries.
- **The before is honest.** Same story keys at the same times, linear, nothing added and nothing broken on purpose.
  If the before looks fine, the story keys are doing the pass's work — move that work into pass keys.
- **The after earns its tags.** Every tag on a beat is a principle the meter passes (or a judged one: staging, appeal,
  solid drawing, exaggeration). `check.mjs` must pass: the after passes every measured principle, the before fails ≥ 4.
- **Weight sets timing** (`timeFor`), **every idle breathes** (`life`), **anticipation before and recovery after** the
  big move, **planted feet never slide** (plants; turns are stepped), **parts follow through** (springs on tail, ears,
  squash). (`references/MOTION-QUALITY.md`.)
- **Bodies are possible.** Knees and hocks bend their own way, legs reach their feet; check the cast sheet both ways.
- **Staging.** Side view, the action reads in silhouette at every story key, the creature stays in frame, a prop the
  action is about is visible from the first frame.
- **Deterministic**: seeds only; `seek(t)` keeps no state (springs are precomputed); never `Math.random`.
- **Code-only**: no generated or downloaded motion. Story keys are set by hand from the brief.

## Contract
- `piece.js` exports `piece`; `index.html` calls `mount(piece)`.
- `window.__ready`, `window.DURATION`, `window.FPS`, `window.seek(t)`,
  `window.__film = { film, def, track(side), audit(), rig(), cast }`,
  `window.__principles = { fps: 60, sides: ['before', 'after'], track(side) }` (the shared meter contract).
- 1080×1350 virtual px (`layout: 'side'` → 1920×1080); `?scale` multiplies the output; `?cast` shows the cast sheet;
  `?render=1` for rendering; `?t=` starts at a time.
