# game-scene kit — 게임 화면 재현 (show it in the game)

A three.js kit for pages that show a phenomenon **as a player sees it in a game**, then rewind and replay the same moment
with a debug overlay (predicted vs. server position, input seq, rewound hitboxes, correction vectors). It holds materials and
machinery only. The arena, the characters' look, the HUD layout, the colours, the camera and every word come from the topic.

- `game-scene.js`: the kit (ES module; imports `three` and `three/addons/` through the page's importmap).
- `template/index.html`: a minimal page using it (34.5 s, 1920×1080): hit registration / lag compensation in a night container
  yard plus a grey server test map. It shows the knobs being turned. Read it, but don't start a topic by copying its look.

## What it is for, and not for
**For:** netcode and game-feel topics that show up on a player's screen: rubber-banding, hit registration, lag compensation,
desync, interest management (who you can see), interpolation and extrapolation, server tick vs. frame. For other subjects, read it by
principle (STYLES.md): show where users meet the problem, then replay that moment with a debug overlay.

**Not for:** topics with nothing to see in a game (bandwidth bills, build pipelines, protocol byte layouts). Use the 2D explainer
or another approach. Don't put a game arena behind an unrelated topic.

## Setup
```bash
cp <skill>/kits/game-scene/game-scene.js <project>/assets/kits/game-scene.js
```
```html
<script type="importmap">{"imports": {"three": "../assets/vendor/three/build/three.module.min.js",
  "three/addons/": "../assets/vendor/three/examples/jsm/"}}</script>
<script type="module">
import * as GS from '../assets/kits/game-scene.js';
const { THREE, clamp, lerp, p, eo, eio, win, ramp, rng } = GS;   // THREE is re-exported (same module instance)
```
The page contract is unchanged: `window.renderAt(t)`, `window.DURATION`, `window.ready`, the template player, hidden notes.

## API
Every export has a comment in the file with its arguments and units (metres, seconds, radians, px).

| group | exports |
|---|---|
| math | `clamp lerp p eo eio eback win ramp rng V avgS mixCam` (same shapes as template.html) |
| stage | `createStage(o)` → `{ gl, scene, camera, composer, bloom, hemi, sun, sky, beginFrame(), render(ctx), dim(k), grade(g), transient(obj), onReset(fn) }` · `mixGrade(a, b, k)` |
| textures | `canvasTex` · `tileTexture` (paving / slabs) · `laneTexture` (measured strip with ticks + labels) · `gridTexture` (engine world grid) · `ribTexture` (containers, shutters) · `chevronTexture` |
| world | `groundPlane` · `instanced(stage, geo, mat, list, { colors, parent })` · `PROP` + `addProp(stage, kind, list, mats, { colors, parent })` with kinds `tree pillar rock tuft bollard box crate barrel barrier lamp` · `lightPool` · `buildPortcullis` (gate + ghost twin) · `buildRobed` (robed NPC) · `flatMat` · `glowMat` |
| characters | `buildChar(stage, { mats, proportions, head, collar, backpack, ring })` · `pose(c, { x, z, yaw, d, t, k, stun, aim, hit, crouch, y })` · `buildGhost` / `ghostMats` / `setGhost` / `setRing` |
| test map | `mannequinGeometry` · `buildMannequin(stage, { mat \| ghost })` · `poseMannequin` · `buildTestMap(stage, { at, size, boxes, grid, openFloor })` |
| FX | `makeStars`/`setStars` · `makeAura`/`setAura` · `footPool` · `pulsePool` · `groundArrow` · `tracer` |
| camera | `camSet(stage, pose, { shake, tt })` · `camFrom(eye, target, extra)` · `camPath(keys, t)` · `proj(stage, x, y, z)` |
| time | `timeRemap(segments)` → `s(u)`, `.label(u)`, `.mode(u)`: live → rewind → replay → slow → freeze |
| 2D | `painter(ctx, { sans, mono, theme })` → `txt tw panel chip dot check cross line burst scrims freezeFX rewindFX rgba rr` · `labels(stage, P)` → `tag wchip hchip drawTags drawHChips` |
| HUD | `gameHUD(P)` → `minimap ping unitFrame skillBar crosshair hitMarker ammo healthBar killFeed scoreBar netPanel badge` |

### Usage sketch
```js
const stage = GS.createStage({ W: 1920, H: 1080, tone: 'aces', fov: 40, sun: { offset: [-9, 24, 10] },
  fog: GRADE.fog, sky: GRADE.sky, hemi: GRADE.hemi, bloom: GRADE.bloom, dim: { hemi: .25, sun: .5, sky: .6 } });
const P = GS.painter(ctx, { sans: SANS, mono: MONO, theme: { text: C.text, dim: C.dim, panel: C.panel, line: C.line, scrim: '3,6,12' } });
const HUD = GS.gameHUD(P), LB = GS.labels(stage, P);
const map = new THREE.Group(); stage.scene.add(map);
GS.addProp(stage, 'barrier', [[11, 0, 7.1], [8, 0, -5.6, 1, Math.PI / 2]], { barrier: GS.flatMat('#8d9298') }, { parent: map });
const hero = GS.buildChar(stage, { mats: HERO_MATS, head: 'helmet', backpack: true, proportions: { bulk: 1.2, leg: .95 }, ring: C.me });
const twin = GS.buildGhost(stage, C.server, { head: 'helmet', backpack: true, proportions: { bulk: 1.2, leg: .95 } });
const tm = GS.timeRemap([{ until: 3 }, { until: 3.6, rewindTo: .9, label: '◀◀' }, { until: 5, rate: .3, label: 'SLOW' }, { freeze: true }]);

function renderAt(t) {
  stage.beginFrame();                       // hides every character, pool, FX and transient; clears labels
  const s = tm(t - CH_START);
  stage.grade(GRADE);                       // grade in every frame if you grade at all
  GS.pose(hero, { x: 0, z: zAt(s), yaw: -Math.PI / 2, d: zAt(s), k: 1, t: s });
  GS.setGhost(twin, { x: 0, z: zServer(s), yaw: -Math.PI / 2, k: 1, t: s }, debugK, Math.abs(zAt(s) - zServer(s)));
  GS.camSet(stage, GS.camPath(KEYS, t));
  stage.dim(debugK); stage.render(ctx);     // 3D → #c
  LB.hchip(...GS.proj(stage, 0, 2.4, zAt(s)), '클라 화면', C.me); LB.drawHChips();
  HUD.crosshair({ x: 960, y: 540, col: '#fff' }); HUD.netPanel(debugK, { title: 'NET', rows: [['RTT', '80 ms']] });
}
```

## 새 주제마다 직접 설계할 것 / What every topic must design itself
The kit has no default scene and its default colours are neutral greys. If a still from a new page could be mistaken for the
rubber-banding page (sandy tiled arena with a measured running track, stone pillars and pines, a blue-tunic runner, an amber
wireframe ghost, a round minimap top right, a unit frame and six-slot skill bar, NET DEBUG top right, a side-on camera along the
track), redo the look. Decide these per topic, from that topic's own world:

| knob | what to decide | kit levers |
|---|---|---|
| **Arena** | where the phenomenon happens in a real game of that genre: a shooter yard, an MMO field, a racing track, a lobby, or a grey engine test map when the point is "what the server sees" | floor painter params (`tileTexture`, `gridTexture`, `laneTexture`), which `PROP` kinds, their colours (`colors` per instance) and placement, `parent` groups to swap maps, `buildTestMap`, `lightPool` |
| **Characters** | body type and gear for that genre and each role; how many; what they do | `proportions` (height, leg, arm, torso, head, width, bulk, limb), `head` 'hair' / 'helmet' / 'bald', `collar`, `backpack`, every material, attachments on `c.chest` / `c.head` (weapons, hats), poses `k` run / `aim` / `crouch` / `hit` / `stun`, capsule mannequins for hitboxes |
| **Roles and palette** | one colour per role (client, server, seen, rewound, packet…); red only for failure | ghost colours, ring colours, tracer / arrow / pulse colours, painter `theme` |
| **HUD** | the HUD that genre really has (shooter: crosshair, ammo, feed; MMO: unit frame, skills, minimap; racer: speed, lap) and where it sits | pick widgets from `gameHUD`, their positions, colours, corner radius; `minimap.content` draws the map |
| **Debug overlay** | what the engineer looks at; where the panel sits so it doesn't cover the action | `netPanel` title, side, rows, a big key number (≥ 90 px), labels / chips / floor tags |
| **Colour grade** | time of day and mood for the game view; a separate grade for debug or server views | `createStage` tone / exposure / fog / hemi / sun (colour, intensity, direction via `sun.offset`) / sky / bloom; `stage.grade()` + `mixGrade()` per frame; `dim()` amounts |
| **Camera** | the genre's camera for the live view (over-the-shoulder, top-down MOBA, side-on, first person) and a different angle for the debug view | `camFrom(eye, target)`, `camPath` keys, `fov`, `sx/sy` framing, `shake` |
| **Time beats** | which moments to show live, rewind, slow down or freeze | `timeRemap` segments and labels, `rewindFX`, `freezeFX` |
| **Copy** | chapter titles, captions, chip texts, numbers (labelled `예시` when invented) | the page only; the kit has no strings except a default `netPanel` title of 'DEBUG' |

The template turns these: a night yard (ACES, cool moonlight, sodium lamps) instead of a sunny arena; helmeted, stocky vs. lean
characters with a rifle and `aim` pose instead of a running hero; a shooter HUD (crosshair, hit marker, score bar, kill feed,
segmented HP, ammo) instead of an MMO HUD; an over-the-shoulder live camera; a grey test map with capsule hitboxes for the
server view; a LAG COMP panel on the left.

## Performance (software WebGL in the container; a GPU is far faster)
- The source page re-pointed at the kit renders in the same time as the original (0.7–1.6 s per still under shared load;
  the kit adds no per-frame work). The template measured ≈ 1.4 s per still under the same load.
- Repeated props go through `instanced` / `addProp` (one draw call per part). Characters are ~20 meshes each; a ghost doubles
  that with edge lines. Six characters + one gate + one NPC is fine.
- One shadow-casting sun; its shadow box (`shadows.extent`, default 20 m) follows the camera target. Wide shots lose distant
  shadows; raise `extent` only as needed (it costs shadow resolution).
- `stage.grade()` sets uniforms and colours only; tone mapping is fixed per page (changing it recompiles shaders).
- Pools are fixed size (`footPool` 64, `pulsePool` 3 by default); extra `put`s are dropped silently.

## Pitfalls
From the source pages:
- **Determinism.** Everything you show must be set again in every frame after `beginFrame()`. Sims are functions of sim time
  `s`; the camera that follows a sim uses `avgS` (a short average over past samples), not a velocity carried between frames.
- **Ghost over solid.** A ghost on top of its solid twin washes it out; pass the distance as `near` to `setGhost` so the fill fades.
- **`camSet` legacy form.** `yaw` and `h` are vector components (camera along `(yaw, h, 1)` on the +z side), not angles. New
  pages should use `camFrom` (az/el). `camPath` interpolates `az` numerically: keep keys on one side of ±π.
- **Labels after the camera.** `proj` uses the current camera, so draw labels in the overlay pass after `camSet`. `hchip`s
  stack upward; when two chips mark points less than a chip apart, use a floor `tag` for one of them.
- **Fonts in textures.** `laneTexture` labels need the web font: call `tex.redraw()` inside `window.ready` after fonts load.
- **Honesty.** A drawn game scene is not a capture: label example numbers `* 수치는 예시` and say "단순화한 그림" where the
  mechanism is one typical implementation (see LESSONS.md).

From this refactor and the template:
- **Debug cameras must look across the gap they explain.** The first template stills put the camera along the strafe direction,
  and the seen/now figures and hitboxes stacked on top of each other. Aim the debug camera perpendicular to the separation
  (and to the ray when there is one).
- **Night grades crush.** Raise exposure and hemi before adding lights, and light the subject from behind the camera
  (`sun.offset`), or the over-the-shoulder character turns into a black block.
- **Over-the-shoulder framing.** Wide fov (≈ 44°) and a camera ~2.3 m behind keep the shooter in frame. Then bring the target
  closer (≈ 12 m) than feels natural, so it stays readable at 1080p.
- **Hitbox capsules.** The mannequin default (radius .34) is a body, not a hitbox; use `mannequinGeometry({ radius: .26 })`
  or thinner so positions 0.2–0.3 m apart still read.
- **Proportions.** Hip height scales with `leg`; extreme values (leg < .8 or > 1.25) float or sink the feet a little. Check a still.
- **`aim` is approximate.** Arms come up and forward. Attach weapons to `c.chest` yourself and check the hands in a still.
- **Part offsets turn with yaw** in `addProp` (lamp arms, tree tops); part heights scale with the entry's scale except
  pillars and bollards.

## Where it came from
Worked example repo github.com/jungrok5/mmo-server-explained:
- `rubber-banding-ingame-wide/index.html`: stage 224–253; textures 255–295; arena props 297–332; character rig + ghost
  334–400; stars / aura 402–425; portcullis + caster 427–459; footprints / arrow / pulses 460–493; `camSet` / `proj`
  495–510; per-frame reset / labels 512–527; time remap `s1` / `rate1` 542–551 and `s3` 579; 2D helpers 788–842;
  `scrims` 843–848; tags / stacked chips 849–868; `netPanel`, `gameHUD`, `freezeFX` 907–970; rewind effect 1040–1047.
- `ue-client-threads-inside-wide/index.html`: grey world grid, capsule mannequin, test-map slab and box props 393–443.

**Equivalence check:** a copy of `rubber-banding-ingame-wide` with its engine code deleted and calls to this kit instead
(1462 → 983 lines; scenes, sims, copy unchanged) renders pixel-identical stills: max channel diff 0 at 11 times covering every
chapter (2.5–64 s), also when rendered in reverse order. Frame times were within run-to-run noise.
