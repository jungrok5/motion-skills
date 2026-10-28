# 모션그래픽 · 「word-log 교실」 (박자마다 세계가 바뀐다)

One character stays in the middle of the frame and keeps moving, while **the whole world swaps on bar lines**: background,
medium and graphics change every 1–2 bars (a grid of app windows → a red stage → a blue drafting sheet → a 3-D keyboard →
pink bubbles → manga panels → a kaleidoscope of all of them). Chunky 3-D Korean type pops on beats, keys light under her feet
and their jamo jump up and snap into a word. Bright, fast, made for Shorts: the channel intro's language.

Worked example: [`sermons/2026-10-24-intro/film/scenes/intro-class.html`](../../sermons/2026-10-24-intro/film/scenes/intro-class.html)
(word-log 교실 · 채널 소개, 7 worlds in 30 s, 128 BPM). Preview: https://jungrok5.github.io/word-log/previews/2026-10-24-intro/

## What it carries — and what it doesn't
- **Well:** announcements and channel/series intros, "one idea in many places" (the same truth seen through several lenses —
  each world restates it), lists and steps (a beat per item), joy, energy, invitation, a Korean word being *built*
  (jamo → syllable: 말씀, 싹, 사랑), playful teaching for young viewers, recaps.
- **Badly:** grief, repentance, silence, awe, anything that needs one held image to sink in — the style never stops moving
  and every world is bright. Not for a single dramatic scene (use charcoal/hopper/puppet); one sermon point in mograph
  works only if the point *is* the repetition or the building-up. Keep it to a minority of films (it reads as a brand device).

## Look
| | |
|---|---|
| accent (the one "hit" colour) | `#ff2f9e` magenta — key glow, neon, flying caps, sparks (`Mograph.MAG`, `MAG2 #ff8fd0`) |
| type ink | `#26182c` (chunky letter extrusion/outline, title-block ink) |
| ① window grid | desk `#120e0b`, windows `#221c18`, hero window cream `#f6edd8` + gold frame `#f0b84a`, page `#fbf3df→#eedfbd` |
| ② stage | red radial `#f2492f→#8e1216`, disc `#ff6a3d`, floor `#d8382a`, words white→`#ffe0d2`, pop yellow `#fff36b→#ffc21a` |
| ③ drafting | paper `#f3ecdc`, ink `#2350c8` (40/200 px grid) |
| ④ keyboard | yellow `#f9d257→#e3a91c` with halftone dots, keys `#28282e`…`#383840` |
| ⑤ bubbles | `#ffb3d9 → #e7a5f0 → #b28af0`, neon `#ff3fb4`, pill text `#8a3f8f` |
| ⑥ manga | paper `#fbfaf6`, ink `#111`, 45° screentone |
| ⑦ kaleido | `#1b1430`, star `#ffd84a` |
| fonts | **Do Hyeon** (all display type, chunky letters, neon, legends) + **Noto Sans KR** 500/700 (window titles, pills, end card) |
| captions | `Mograph.captions`: chunky 3-D words centred at **y 300** (top band, never the bottom 380 px or the right 140 px), pop in with an elastic squash, fade out in .3 s; a scripture source goes in a small ink pill under them |
| end card | `Mograph.endCard`: the screen dims, a gold hero window springs in (box 90,560 900×720) and `Story.endCard` sets the card in ink on its cream page — all in within ~.5 s, held ~4 s |

## The character (actor)
Every module draws an **actor**, never a raw image. Two kinds, same API:
- **`Mograph.codeActor({ pose, dur, fps: 12 })` — the default.** A code figure in the intro dancer's design (brown bob +
  star clip, cream hoodie with blue cords/cuffs, light-blue wide jeans, white sneakers), flat cel colours with a 5 px dark
  outline (so the line-art and manga filters read it like the sprite). It is a real rig: `pose(t)` returns
  `{ walk, walkAmt, armSwing, march, marchAmt, kneel, lean, bounce, look, reach:[x,y], reachAmt, reachFar, reachFarAmt,
  cheer, face, blink, mouth }` (local px: x forward from the hip's ground point, y up). Legs and arms are 2-bone IK with
  fixed bone lengths (`Mograph.ik2`), knees bend forward, elbows back/down; **hands land exactly on the grip point** (the
  hand circle is drawn at it); far arm/leg are drawn behind the torso in darker colours; walking plants the stance foot
  (move the actor by `walk · place().s` and the foot does not slide); kneeling and rising *step* each foot (lifted arc, no
  slide); `face` between +1 and −1 squashes through a turn. Frames are drawn on demand at `fps` (12 = anime "on twos") and
  cached, so the code filters work on it unchanged; its footfalls (`contacts`) come from its own feet.
- **`await Mograph.loadSprite(window.DANCE, 'art/dance', { dur })` — video-model frames, only when the owner asks** (see
  below). `meta.js` from `tools/prep_dance.py`.

## Kit API (`kit-mograph.js`, global `Mograph`)
- setup: `init({ bpm, accent })` (tempo + paper, keyboard backdrop, keycap, offscreen) · `FONTS` for `Pilot.run`
- beat grid: `tempo(bpm)` → `BEAT`, `BAR` · `beatPulse(t)` · `bar(n)`, `beat(n)`, `snapBar(t)` · `sceneTable(scenes, dur)`,
  `sceneOf(SC, t)` · `flash(ctx, a)` + `pulse(t, at, len)` for the bar-line cut
- easing: `backOut`, `elastic`, `popScale(u, d)`
- type & hits: `chunky(str, size, o)` + `glyph(ctx, g, x, y, sx, sy, rot, a)` · `pop(ctx, t, at, str, x, y, size, o)` (one-call
  onomatopoeia with burst) · `sparkBurst` (the "hit") · `star4`, `sparkleTrail` · `pill`
- actors: `codeActor`, `spriteActor`, `loadSprite`, `rig`, `ik2`, `drawFigure`, `detectContacts`, `FIG` (colours), `BODY`
  (lengths) — actor: `fidx, frame, feet, hands, place, draw(…, { mode: 'line'|'manga'|'white' }), shadow, lineArt, manga,
  white, highHand, contacts, tOfFrame`
- ① `WIN`, `kfull(win)`, `windowGrid(ctx, t, u, inner, { side, hero, win })`, `winFrame`, `sidePage`, `heroPage`,
  `gridView(ctx, k)` (k 1 → kfull: dive in) · `SIDE` (default side-window titles)
- ② `stageBack(ctx, t, u)` → floor point · `orbit(ctx, words, u, { scatter })` → `{ back(), front() }`
- ③ `paperSheet()`, `compass(ctx, cc, R, u)`, `guides(ctx, vp, pts, a)`, `dimension(ctx, x, y0, y1, label, a)`,
  `titleBlock(ctx, a, title, left, right, leader, box)`, `drawIn(ctx, t, actor, x, y, h, lv, cv)` (line wipe ↓, colour ↑)
- ④ `KB` (anchor, figu), `keyCam(D, sway, yaw)` (`P`, `un`, `ppu`), `KEYS`, `keyAt`, `keyTop`, `keyboardBG()`,
  `drawKeyboard(ctx, cam, st)`, `drawKey`, `wireKeyboard`, `footHits(actor, { t0, t1, need, before, camAt })`,
  `keyState(t, hits, fly, legends)`, `hitSparks`, `flyCaps(hits, spec)`, `flyingCaps`, `capSprite`,
  `jamoOf(ch)`, `jamoLayout(word, { y, size, cx })`, `jamoLayer(ctx, t, hits, layout, at, bang)`
- ⑤ `bubbleSky(ctx, u)`, `lightCross`, `bubblesBack`, `bubblesFront`, `bubble`, `statusPill(ctx, label, u, x, y)`,
  `neonType(ctx, t, u, chars, times, x, y, size)`
- ⑥ `mangaPaper`, `panel(ctx, x, y, w, h, u, from, draw)`, `focusLines`, `inkBurst`, `MANGA_WORD`, `MANGA_WORD_NEG`
- ⑦ `snap(drawFn)`, `kaleido(ctx, snaps, u)`, `bigStar(ctx, u, x, y)`
- transitions: `wipeUp`, `bubblePop`, `inkWipe`, `pullBack(ctx, t, v, drawLast, inner, gridOpts)` (the loop seam back into ①)
- words: `captions(ctx, t, lines)`, `endCard(ctx, t, card, at)`

```js
const S = SCRIPT, MG = Mograph; MG.tempo(S.BPM); const SC = MG.sceneTable(S.scenes, S.DUR);
let D; const pose = t => ({ walk: 0, kneel: Pilot.ss(4.6, 5.3, t), look: -.2 });           // what she does
function stage(ctx, t, u) { MG.stageBack(ctx, t, u); const o = MG.orbit(ctx, ['씨앗', '말씀'], u);
  o.back(); D.shadow(ctx, t, 540, 1488, 900); D.draw(ctx, t, 540, 1488, 900); o.front();
  MG.pop(ctx, t, 6, '쑥!', 540, 600, 170, { burst: [24, 360, 21] }); }
function draw(ctx, t) { const sc = MG.sceneOf(SC, t); ({ stage })[sc.id](ctx, t, t - sc.at);
  MG.flash(ctx, .85 * MG.pulse(t, sc.at, .2)); MG.captions(ctx, t, S.lines); MG.endCard(ctx, t, S.endCard, S.beat.end); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: MG.FONTS, draw,
  init: async () => { MG.init({ bpm: S.BPM }); D = MG.codeActor({ pose, dur: S.DUR }); } });
```

## Motion grammar (what worked)
- **Pick a BPM first and cut on bar lines** (`SCRIPT.BPM`; 120 → 2-s bars, 128 → 1.875-s). Storyboard times snap to bars;
  words pop on beats; the hero window glows and the stage disc breathes on `beatPulse`. The sound must be cut to the same BPM.
- **The character never leaves the centre**; the world changes around her. Continuity lives in her (and in one subject, e.g.
  the seed/sprout, which appears in every world in that world's medium: colour, blue line, ink).
- Each world restates the idea in its own medium — not decoration: the drafting sheet *plans* (콘티), the keyboard *types*
  (말씀), the bubbles *wait/meditate* (묵상 중…), manga *feels* (두근!), the kaleidoscope *sums up*.
- Cuts: a hard cut + white flash (.6–.9, .2 s) is the default; special joins: dive into the gold window (①), yellow floods up
  (③→④), a bubble grows from her chest (④→⑤), ink burst swallows the frame (⑥→⑦), and the **pull-back into ①'s gold window**
  so the last frame is frame 0 (loop seam).
- Native moves: `popScale` elastic squash on every word; spark burst on every hit; footfall → key dip + glow + jamo jump
  (from the sole, squash, park, bob, then snap into the syllable with a burst); a flying keycap; neon typed on beats with a
  flicker and a caret blinking on the beat; compass drawing a circle; line wipe ↓ then colour ↑ with a hatch edge;
  manga panels sliding in with an overshoot; a white-silhouette flash as she lands in a new world.

## The video-model step (owner's request only)
House rule (CLAUDE.md): **no video models by default — everything moves in code.** The intro's dancer was an owner-requested
one-off test. Use it again only when the owner asks; otherwise use `codeActor` (the template does).
When asked:
1. A start frame of the character on **flat #00FF00** (image model; key a still with `tools/key.py` to check it), full body,
   feet and hands inside the frame with margin, 9:16.
2. **Kling 3 Pro**, 15-s clips (24 fps), **start frame = end frame** (the same image as both) so clips
   join A→B→(loop)→A without a jump. Cost ≈ **680 credits per second** (a 15-s clip ≈ 10 200 credits) — ask before each one.
   Keep the prompt about motion only (e.g. dancing in place, stepping on the beat, staying centred, full body in frame, plain green background).
3. `python3 -I tools/prep_dance.py scenes/art/dance A.mp4 B.mp4 --height 820 --step 2` (12 fps, ~15 MB for 2 × 15 s),
   then `python3 -I tools/contacts.py scenes/art/dance` for the footfalls. Render stills at the contact times and check them.
4. In the scene: `<script src="art/dance/meta.js">` + `D = await Mograph.loadSprite(window.DANCE, 'art/dance', { dur })`.
   Film time maps to clip A then clip B (each once, then wrap), so plan the beats on the clips' real footfalls (the intro
   lengthened ④ by a bar so all six jamo came from real steps; `footHits` fills missing ones with beats under the lower foot).

### Keying pitfalls (from the intro)
- **The green drifts.** Kling turned #00FF00 into a muted green for most of clip B: a fixed threshold left halos or ate the
  hoodie. `prep_dance.py` keys against a smooth per-frame *plate* estimated from the clearly-green cells. Don't go back to
  fixed thresholds.
- Green spill in hair/skin edges → despill (G ≤ max(R,B)+6) after un-mixing edge pixels from the plate; choke the alpha 1 px.
- Light-blue jeans and a cream hoodie are safe on green; **avoid green/teal clothes and props**.
- One crop box for all frames (union) — per-frame boxes make her jump. The script prints whether a limb **touches the frame
  edge** (a hand that leaves the shot is cut off in every world): reshoot or plan around it.
- Contacts: never count a landing across a clip join; the alpha-profile detector (`contacts.py`) is more reliable than the
  feet-band guess; video models slide feet a little — the contact shadow (`actor.shadow`) hides most of it.
- Keep the sprite folder ≲ 20 MB (webp q80, 12 fps). It is committed with the preview; MP4s are not.

## Performance (seek time per frame, Chromium, 1080×1920, warm caches)
- intro (sprite): **107.6 ms/frame** after the refactor vs **109.5 ms** before (−2 %); stills pixel-identical (max diff 0).
  Heaviest: ④ keyboard ~165 ms (case + 68 keys + glow), ② stage ~150 ms (radial gradients + big glyphs), ⑦ kaleido ~110 ms.
- template (code actor): **84 ms/frame**. Code figure frame ≈ 2.5 ms (drawn once per 1/12 s, cached 48); filters per frame:
  line art 11–22 ms, manga 13–15 ms, white 2 ms (cached 90 frames each, LRU). The first pass through a world pays these.
- `chunky()` sprites are cached by string+size+colours: animate with `glyph(… sx, sy)`, never by changing the font size
  (each size is a new canvas). `paperSheet`, `keyboardBG`, `capSprite` are built once in `init`.

## Pitfalls (lessons from the intro and this refactor)
- **Fonts:** render.mjs blocks Google Fonts, so **Do Hyeon must be installed locally** (it is here:
  `~/.local/share/fonts/DoHyeon-Regular.ttf`; on a new machine every chunky word would fall back to a system face).
  `new-film.py` lists only Noto Serif/Sans in `film.json` → add `"Do Hyeon": "DoHyeon-Regular.ttf"` to `fonts.local`.
- A sprite actor's frames live in `scenes/art/<name>/`; `preview.py` copies `art/` with the scene.
- Portrait only: the kit's coordinates are 1080×1920 constants (the intro hard-codes them too).
- Words collide with her: the keyboard figure is ~1000 px tall (head at y ≈ 490); park the jamo at y ≤ 330 with size ≤ 300.
  Captions at y 300 share the band with `한 장면!`/title pops — don't schedule both at once.
- The jamo jump from the sole up to their slot and briefly cross her body — keep them short (.55 s) or start them beside her.
- A profile code figure cannot raise both arms overhead without covering its face; `cheer` throws them forward-up instead.
- `jamoLayout` handles CV and CVC blocks with simple vowels; compound vowels (ㅘ ㅢ …) are parked as vertical — check stills.
- `footHits` needs `camAt(t)` to be the same camera the keyboard is drawn with at that time (keys are found under the sole
  in screen space and un-projected onto the key plane).
- The bubble-pop and pull-back transitions draw the next world into the shared offscreen canvas (`Mograph.off()`); don't
  use it yourself during those 0.3 s.
- `drawIn` hatch edge can float above a short figure (it spans the actor's frame, not the figure); finish the colour fill
  before a caption-free hold if it bothers.
- The loop seam: either end in ⑦ with `pullBack` into the gold window (intro: the last frame is frame 0), or rely on
  `SCRIPT.loop` (0.6 s cross-fade, template) — frame 0 must already show the grid, never black.

## What a scene author still draws
The story: which worlds, in what order, on which bars; her **pose over time** (`pose(t)`); the **one subject** in each
world's medium (the template's seed → mound → sprout in colour / blue line / ink is the example); the words (captions,
onomatopoeia, neon, the Korean word on the keyboard, window titles); per-world placement (x, ground y, figure height);
the sound (BPM-locked music + hits on the jamo/flash/pop beats — canvas-film `references/SOUND.md`).

## Files
- `kit.js` → copy as `scenes/kit-mograph.js` (new-film.py does this)
- `template.html` + `script.example.js` — the house template story (seed) in this style, no video model
- `tools/prep_dance.py` (green-screen plate keyer → sprite sequence + meta.js), `tools/contacts.py` (footfalls from alpha),
  `tools/key.py` (key one still)
