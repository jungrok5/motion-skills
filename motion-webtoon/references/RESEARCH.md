# Webtoon / manhwa / manga craft: survey of GitHub sources and a technique playbook

Written for the planned code-drawn **webtoon kit**: HTML Canvas 2D, portrait 1080×1920, every frame a pure function of `t`, no image assets, Korean text.
Survey date: 2026-10-31. Star counts are as seen on GitHub pages that day.

**How this was gathered.** GitHub repository search was not available in this session (the API returned 502 and 403). Repos were found with web search. Their source was then read from `raw.githubusercontent.com`, and their pages through WebFetch. Every number below marked *(src)* was read in the repo's code, README or a document the repo links to. Numbers marked *(ours)* are proposals for our kit and have no source behind them.

**Honest gap.** Repos for webtoon *craft* are scarce. No real "awesome-webtoon" list exists beyond one small, archived list. No open-source *motion-toon / 무빙툰 / 효과툰* engine turned up. No GitHub generator for *manpu* (emotion symbols) turned up. No Korean SFX dataset turned up. The strongest code sources are generic: balloons (comical-js), focus lines (speedline), tones (MangaScreen, MangaShader), layout (comfyui_panels), hand-drawn lines (rough.js), toon shading (MToon spec) and idle motion (Live2D). Webtoon-specific conventions come mostly from the guides these repos link to, chiefly Clip Studio's KR/EN webtoon articles.

---

## 1. Sources

| # | Repo (URL) | ★ | Licence | Size / state | What it teaches (specifics) |
|---|---|---|---|---|---|
| 1 | **BloomBooks/comical-js**: https://github.com/BloomBooks/comical-js | 31 | MIT | Small, active-ish (Bloom project), uses paper.js | Comic balloons on canvas/SVG. **Arc tail:** root = bubble centre; base = 20 px measured *along the outline* where the root→tip Bézier crosses it; two quadratic Béziers base→mid±w→tip; the tip is "squared off" by 1/1000 of the mid offset to stop Chrome stroke spikes; a "pucker" handle (rotated 70°, length 0.8·base·min(1.8·\|sin Δ\|,1)) rounds the corner where the tail leaves the bubble. **Default mid-point:** midpoint of the two border points + a perpendicular of 20 % of the distance, scaled by dy/dx so the tail straightens near horizontal/vertical. **Thought bubble:** outline points every ~30 px (`round(2(w+h)/30)`, min 5) with seeded jitter ≤ ½ spacing, joined by outward arcs of depth 9 − jitter(≤4.5). **Thought tail:** ellipses (rx = r+5, ry = r) along an arc, r growing 7→20 px from tip to root, gap starting at 3 and growing by +2 each. **Shout ("pointedArcs"):** same points but *inward* arcs of depth 7. **Families:** overlapping bubbles at the same level merge outlines; others get constant-width "joiner" tails. Strokes are drawn at 2× width under the fill, so overlaps merge cleanly. **Seeded LCG:** `seed = (seed*9301+49297)%233280`, seeded with w+h, so a shape is stable across renders. |
| 2 | **drnachio/postext** (wiki "Configuration-Comics"): https://github.com/drnachio/postext/wiki/Configuration-Comics | 11 | MIT | Small, new | Lettering and balloon defaults: font 7.5 pt (comics 7–9 pt in print); line-height 1.15 (1.5 vertical CJK); balloon `shape: oval`, `roundness 2.2` (2 = ellipse, i.e. a superellipse), `aspect 1.6`, `padding 0.55em`, `strokeWidth 0.6pt`, `tail: curved`, `tailWidth 0.9em`, `tailReach 0.55`, `target: mouth` (thought → `head`), whisper = `dash: true`, burst = 14 spikes, depth 0.22, caption can `butt` against the panel border, `inset 1.5mm` balloon↔border; SFX break after 5 chars; panel border 1 pt, radius 0, styles `solid/rough/none`; gutters 4 mm between tiers, 2 mm side by side. |
| 3 | **hitode909/speedline** (集中線GIFメーカー): https://github.com/hitode909/speedline | 18 | MIT | Tiny, old (Ruby/RMagick) | **Focus-line algorithm** (`lib/speedline.rb`): θ from 0 to 2π, `θ += 0.02·(rand+0.5)`; each line is a filled **triangle**: apex at the inner ellipse `r = 0.75·(1+0.3·rand)·(W/2,H/2)`, base on the outer ellipse at 2·(W/2,H/2) spanning angle `0.02·bold·(0.3+0.7·rand)`. About 314 wedges; the inner ellipse follows the image aspect. Animated GIF = 3 frames, each re-randomised ("boil"). |
| 4 | **sugyan/speedline.js**: https://github.com/sugyan/speedline.js | 2 | MIT | Tiny | JS/canvas port of #3 (`crx/js/lib/speedline.js`): same constants (`radius_center 0.75, step 0.02, bold 1.1`), redrawn every **100 ms** (10 fps boil). |
| 5 | **MirzaBeig/Anime-Speed-Lines**: https://github.com/MirzaBeig/Anime-Speed-Lines | 316 | Unlicense | Unity URP post-effect | Procedural anime speed-line *vignette* for "speed or surprise"; opacity via colour alpha. Concept reference: radial lines masked out of a central ellipse, animated over time. |
| 6 | **Joy-less/MangaShader** (+ Exuin's CC0 "screentone black spaced pixels" shader on godotshaders.com): https://github.com/Joy-less/MangaShader | 1 | MIT | Tiny | Screentone by **ordered dither**: luminance → `max_i = int(avg·dot_spread)` (dot_spread 17); 16 positions in a 4×4 cell switched on in a fixed order (a Bayer-like ladder); `dot_size` scales the cell; `light`/`dark` colours, `strength 0.5` mix. |
| 7 | **ashukae/ComfyUI-MangaScreen**: https://github.com/ashukae/ComfyUI-MangaScreen | 165 | MIT | Active (2026) | Real manga tone logic: **4 flat levels**: paper white, light tone (**18 %** dot coverage), dark tone (**42 %**), solid black; `white_point 0.80`, `black_point 0.30`; levels `black 0.20 / white 0.70 / gamma 1.3`; **one page-aligned 45° dot screen**, binary B/W; `screen_lines` = dots across width: 120 coarse / **200 normal** / 300 fine at ~2 MP, keep **≥ 5 px per dot**; optional gradation tone for smooth shadows; ink lines separated by shape ("long and thin = line"), white lines cut inside solid black (0.4). |
| 8 | **bmad4ever/comfyui_panels**: https://github.com/bmad4ever/comfyui_panels | 47 | MIT | Small, active | Manga page layout as a **cut tree** (`CutNode.py`): each node = horizontal/vertical cut, an integer **slant angle** (random −15…+15°), split ratio presets `{1/2, 1/3, 2/3, 1−1/φ, 1/φ}` or n equal cuts; **gutter decays by φ per depth** (`margin/φ^depth`), so first cuts give wider gutters and imply reading direction; gutters are carved as square-capped buffers of the seam lines; panel edges drawn solid/dashed/dotted; RTL option. |
| 9 | **rough-stuff/rough** (Rough.js): https://github.com/rough-stuff/rough | 21.3k | MIT | Mature | Hand-drawn line (`renderer.ts _line`): one cubic Bézier per line with control points at `divergePoint = 0.2+0.2·rand` and 2× that; bowing offset `bowing·maxOffset·(perp)/200`; random offsets `±roughness·gain·offset`, where `gain = 1` for len < 200 px, `0.4` for > 500 px, linear between (`−0.0016668·len+1.233334`); `maxRandomnessOffset 2`, `roughness 1`, `bowing 1`; offset is capped at len/10 for short lines; drawn twice (double stroke) for an inked look; hachure fill angle −41°. Core algorithm adapted from the Processing lib *Handy*. |
| 10 | **vrm-c/vrm-specification** (MToon 1.0 + SpringBone 1.0): https://github.com/vrm-c/vrm-specification | 345 | not shown on page / raw LICENSE 404 → treat as "credit, ideas only" | Mature spec | **Toon band:** `shade = linearstep(−1+toony, 1−toony, N·L + shadingShift)`, `toony` default **0.9** (hard band), `color = lerp(shadeColor, baseColor, shade)`. **Rim:** `pow(sat(1 − N·V + lift), fresnelPower)`, power default **5**, lift 0, added on top, `rimLightingMixFactor 1`. **Outline:** width factor + colour (default black). **Spring bone (hair sway):** verlet `next = cur + (cur−prev)·(1−drag) + dt·restDir·stiffness + dt·gravityDir·gravityPower`, then re-normalised to bone length; examples `stiffness 0.5, drag 0.5, gravity 1.0`. |
| 11 | **Live2D/CubismWebFramework** + **CubismWebSamples**: https://github.com/Live2D/CubismWebFramework | — | Live2D Open Software Licence / proprietary SDK release licence | Mature | **Eye blink** (`cubismeyeblink.ts`): interval **4.0 s**, closing **0.10 s**, closed **0.05 s**, opening **0.15 s**; next blink = `now + rand·(2·interval − 1)`. **Breath/idle** (`cubismbreath.ts`): `offset + peak·sin(2π t / cycle)`; sample uses AngleX peak 15 / cycle **6.5345 s**, AngleY 8 / **3.5345**, AngleZ 10 / **5.5345**, BodyAngleX 4 / **15.5345**, Breath 0.5±0.5 / **3.2345**. The odd periods never line up, so idle motion never visibly loops. |
| 12 | **EXPWorlds/Godot-Cel-Shader**: https://github.com/EXPWorlds/Godot-Cel-Shader | 247 | MIT | Small, stable | Cel-shading parameter model: shade *threshold* + *softness* (smoothstep width), specular glossiness/threshold 0.5/softness, rim *threshold/spread/softness*, shadow threshold, outline via **inverted hull** in a second pass. Credits Motomura's GDC 2015 talk (Guilty Gear Xrd). |
| 13 | **gramener/comicgen**: https://github.com/gramener/comicgen | 617 | MIT (code); art CC0 / CC-BY per set | Mature | Composes characters from aligned SVG layers (face/body, or hair/eyes/mouth/legs at identical canvas positions). Emotion vocabulary (afraid, angry, annoyed, blush, confused, cry, cryingloudly, facepalm, hearteyes, shocked, shout, starstruck, tired, worried, wink …) and poses (handsonhip, pointing*, shrug, facepalm, scratchinghead …). A good checklist of expression states for our rig. |
| 14 | **mihonapp/mihon** (Tachiyomi successor), webtoon viewer: https://github.com/mihonapp/mihon | large (not checked) | Apache-2.0 | Mature | Long-strip reader conventions: **side padding as % of screen width** (`sidePaddingPercent`); one "scroll step" = **¾ of screen height** (`heightPixels * 3 / 4`), smooth-scrolled. Reader projects (Mango, Kotatsu, HaruNeko issues) argue over gaps between images: webtoons are meant to be continuous, so the reader adds **0 gap** and the artist owns all spacing. |
| 15 | **SamDreamsMaker/webtoon-creation-guide**: https://github.com/SamDreamsMaker/webtoon-creation-guide | 0 | MIT | 1 commit; partly promotional (TaleForge) | Rules of thumb: "one moment per screen"; **gutter 30–50 px is standard (800 px canvas)**; big gaps = slow/dramatic, small/overlapping = fast/action; full-width panel = key moment/scene change; narrow panel = quick reaction; empty space = silence/tension; 40–80 panels per episode; width 800 (720), strips 10–20k px, sliced at ~1280 px; **dialogue font ≥ 24 px on 800 px**; warm = happy, cool = tension/sad; limited palette per scene. |
| 16 | **ricafolio/awesome-webtoon-guidelines**: https://github.com/ricafolio/awesome-webtoon-guidelines | 5 | CC0 | Archived 2023-03 | The only "awesome" webtoon list. Link hub: Clip Studio "Tips for Creating Vertical Scrolling Webtoons", Blambot "Comic Book Lettering Grammar & Tradition", Tapas slicing guides, SFX tips; free comic fonts (CC Wild Words, Anime Ace; SFX: Umberto, Trashhand, CC Splashdown). |
| 17 | **google/fonts** (`ofl/*`): https://github.com/google/fonts | — | SIL OFL 1.1 | Mature | Korean display faces we can load by name (as canvas-film already does with Noto): **Black Han Sans** (Zess Type), **Jua**, **Do Hyeon** (Woowahan Brothers), **Gaegu** (JIKJI SOFT), **Nanum Pen Script** (Sandoll), **East Sea Dokdo**, **Gamja Flower** (YoonDesign), **Bagel Fat One** (Kyungwon Kim, JAMO), **Dongle** (Yanghee Ryu). |
| 18 | **k-omiq/Pear**: https://github.com/k-omiq/Pear | 16 | MIT | Small, 2026 | Scanlation typesetter for manga/webtoon: a checklist of lettering effects: **stacked multi-strokes and shadows**, solid/pattern/gradient fills, perspective **warp**, balloon-aware auto-fit ("flaky"). |
| 19 | **njean42/kumiko**: https://github.com/njean42/kumiko | 205 | **AGPL-3.0** | Mature-ish | Panel detection by OpenCV contours, LTR/RTL ordering; no unframed panels. Useful only as a reminder that panels must be *readable* as boxes; do not copy code. |
| 20 | **zyddnys/manga-image-translator** (rendering): https://github.com/zyddnys/manga-image-translator | large | **GPL-3.0** | Mature | Heuristic minimum font size `round((imgW+imgH)/200)`. For 1080×1920 that gives **15 px**, a floor far below what we want; it shows how small auto-typesetters go. Ideas only. |
| 21 | **eskutcheon/ManhwaFormatter**: https://github.com/eskutcheon/ManhwaFormatter | 4 | MIT | Tiny | Re-slices vertical strips at **low-variance blank rows** (gutters) so balloons/panels are never cut; normalises gutter colour; `--min_height 1600`. |

**Linked / secondary documents** (not GitHub, but linked from the repos above or found alongside them):
- Clip Studio, "Tips for Creating Vertical Scrolling Webtoons" (EN, linked from #16): https://www.clipstudio.net/how-to-draw/archives/157055. The Korean version is https://www.clipstudio.net/drawing/archives/157017. Gap size signals scene change or psychology ("여백의 크기가 장면 전환이나 심리 묘사 효과를 냅니다"). Place dialogue in the scroll space *before* the character, so the character seems lost in thought. The background outside panels can be white, black or a theme colour. Flashbacks can use a **sepia gradient map** instead of black frames. Canvas widths: Naver 690 px, Daum 760×7000, WEBTOON 800×1280 per slice.
- Comistitch, "Webtoon Paneling Guide" (commercial blog): https://comistitch.com/blog/webtoon-vertical-scroll-paneling-guide/. Gutters on an 800 px canvas: **fast action 100–150, emotional beat 200–300, scene transition 400–600, cliffhanger 600–800 px**. Panels < 1200 px tall. Readers see 1–2 panels per screen; preview scroll speed ~**800 px/s**; chapters of 6–12k px take 5–10 min. (It contradicts #15's 30–50 px. #15's figure is the *minimum* between panels in a sequence; Comistitch's figures are *beat* gaps.)
- Uhiyama Lab, "Manga Effect Line Maker" (closed source): https://uhiyama-lab.com/en/tools/effect-line-maker/. Line types Focus / Speed / Flash. Defaults: count 100, thickness 16, variation 50, centre blank 30 %, blank aspect 100 %.
- Observable "halftone-map" and the veltman/nbremer gists (rotated-grid halftone). Dot radius uses a **sqrt scale** `[0,1] → [0, spacing/2]`, so dot *area* ∝ tone. The rotated grid is built on a square the size of the diagonal so it covers the frame. Classic screen angles: C 15°, M 75°, Y 0° (K 45°).
- Kouno Fumiyo, *Giga Town* (manpu dictionary), and IPSJ 2017 (a symbol's meaning depends on where it sits relative to the character). Background for emotion symbols; no code exists.

---

## 2. Technique playbook

Units are px on our **1080-wide** frame. Scale factors from source canvases: 800 → 1080 = **×1.35**, 690 → 1080 = **×1.565**.
Every random choice comes from a **seeded PRNG** keyed on (element id, optional boil index); never call `Math.random()`. Comical-js uses the same idea for stable bubbles. A "boil" (re-randomise) is `seed = hash(id, floor(t·fps))`, with fps 8–12. That keeps every frame a pure function of `t`.

### A. Reading, pacing and panels

**1. Tall strip + virtual scroll camera (세로 스크롤)**
- (a) The episode is one tall strip, 1080 wide by N px tall. The video camera is a 1080×1920 window whose `y(t)` moves down the strip.
- (b) This is the base of every webtoon beat: readers see 1–2 panels per screen (Comistitch); "one moment per screen" (#15).
- (c) Author a list of **rest stops** (camera y where a panel sits framed) and a hold time for each. Between stops, glide with easeInOutCubic. Make `y(t)` piecewise and analytic. For a reader-like feel, scale Comistitch's ~800 px/s to ~1080 px/s and cap glide time with `dur = clamp(0.35 + gap/1400, 0.4, 1.6) s` *(ours)*. Mihon's "one swipe" = ¾ screen height = **1440 px**, a natural maximum single move.
- (d) #15, Comistitch, #14.

**2. Gutter-as-time (칸 사이 여백 = 시간)**
- (a) Empty space between panels *is* duration and silence.
- (b) Small gaps for rapid action; big gaps for emotional weight, scene change or cliffhanger (Clip Studio KR; #15).
- (c) Gap presets at 1080 *(src ×1.35)*:

  | Beat | Gap | Extra hold *(ours)* |
  |---|---|---|
  | Sequence minimum | 40–70 | — |
  | Action | 135–200 | — |
  | Emotional beat | 270–400 | +0.3–0.6 s, camera paused mid-gap |
  | Scene change | 540–810 | +0.6–1.0 s |
  | Cliffhanger | 810–1080 | +1.0–1.5 s |

  Gap colour can change mid-strip (white → black) to carry mood.
- (d) #15, Clip Studio KR/EN, Comistitch.

**3. Panel shapes and borders**
- (a) Rect panels with a plain border, rounded panels, slanted panels and borderless panels.
- (b) Plain rects for normal scenes. Borderless or fade-edged panels for memory, dreams and calm. Full-width bleed for key moments. A narrow inset panel for a quick reaction.
- (c) Use `ctx.save(); clipPath(panel); drawScene(); ctx.restore(); strokePath(panel)`. Border 4–6 px black (postext 1 pt ≈ 1/7.5 of the 7.5 pt text, so ~0.13 × the dialogue size), radius 0. A borderless panel uses a gradient alpha mask on the edges (`destination-in` with a linear gradient, 60–120 px). An optional rough border uses Rough.js-style `_line` with roughness 0.5 *(ours)*.
- (d) postext, #15.

**4. Slanted / tiered layout (컷 분할)**
- (a) Recursive cuts with a slight slant.
- (b) Action sequences, and a "page-like" cluster inside the scroll.
- (c) Use a cut tree. Each cut is horizontal or vertical, angle in −15…+15°, ratio from {½, ⅓, ⅔, 1−1/φ, 1/φ}. Gutter at depth d = `g0/φ^d`, so top-level cuts are wider and nested panels read as a group. Implement with polygon clipping against a line: a rect minus a slanted band = 2 convex quads, so no library is needed.
- (d) comfyui_panels.

**5. Panel break (칸 밖으로 튀어나오기)**
- (a) A character, fist or SFX crosses the panel border.
- (b) Climax, impact, a character "addressing" the reader, a gag over-reaction.
- (c) Draw the background layer clipped to the panel, stroke the border, then draw the breaking layer *unclipped* on top. Optionally draw a 6–10 px white "gap" stroke around the breaking shape where it crosses the border, so it reads as being in front. To animate, the subject's transform eases past the border at the beat with a 1.08 overshoot. The border itself can crack: split the stroke path and shift the pieces 3–6 px.
- (d) Clip Studio (colour beyond frames); craft convention.

**6. Camera inside a panel**
- (a) Ken Burns pan/zoom inside a fixed frame.
- (b) Gives life to holds on establishing shots and emotional close-ups.
- (c) Scene transform `s(t) = 1 + 0.06·ease(u)`, `pan = focal·(s−1)`, with u over the panel's hold. Never exceed 1.12 on a hold *(ours)*. Keep the panel frame static and move only the content.
- (d) Derived (motion-comic practice); no repo.

**7. Zoom punch / reaction shot**
- (a) Snap to a tight close-up with an impact.
- (b) Shock, realisation, the punchline face.
- (c) Hard cut (no glide) or a 0.12 s glide.
  - Content scale 1.25 → 1.0 with `easeOutBack` over 0.18 s.
  - Shake `A·e^(−τ/0.12)·sin(2π·28τ)`, A = 14 px.
  - Optional 1-frame white flash: fill white at α = 1 → 0 over 0.06 s.
  - Add focus lines (#18) on the same beat *(ours)*.
- (d) Combines #3/#4 with craft practice.

**8. Outside-panel background colour (바깥 배경)**
- (a) Gutter/background colour as atmosphere.
- (b) Black for night/horror/tension; a theme colour for chapter identity; white for daily life.
- (c) Draw the strip background as a vertical gradient between keyed colours along strip y. A mood transition happens *in the gutter*, never across a panel.
- (d) Clip Studio KR ("검은색이나 작품의 테마 컬러").

**9. Flashback tint (회상)**
- (a) Sepia/desaturated panels, a soft or no border, sometimes a rounded or cloud frame.
- (b) Memory, backstory, "that day…" (그날…) captions.
- (c) Render the panel scene, then `ctx.globalCompositeOperation='color'` with a sepia fill `#a07850` at 0.85 (or `ctx.filter='grayscale(1) sepia(.7)'` in Chromium). Then a radial vignette (`multiply`, edge #3a2a1a at 0.5) and a light grain. The border is dashed or absent. Enter/exit through a 0.4 s cross-fade to white *(ours)*.
- (d) Clip Studio KR/EN ("색조를 세피아로").

### B. Balloons (말풍선)

**10. Speech balloon body (round)**
- (a) An oval or superellipse balloon around the text.
- (b) Normal dialogue.
- (c) Measure the text block (w, h). Pad by 0.55 em. Use a superellipse `|x/a|^n+|y/b|^n=1` with **n = 2.2**, aspect ≈ 1.6. The inscribed text box of a superellipse has half-extent `a·2^(−1/n)`, so `a = (w/2 + pad)/2^(−1/n)`, and likewise b. Trace 64 points. Fill white, stroke black 3–4 px (postext 0.6 pt relative to 7.5 pt text ≈ 0.08 em).
- (d) postext, comical-js.

**11. Balloon tail (꼬리)**
- (a) A curved, tapering tail to the speaker's mouth.
- (b) Every attributed line; no tail for off-screen narration.
- (c) Comical-js recipe:
  - root = balloon centre, tip = mouth (head for thought).
  - mid = midpoint of the two border points + a perpendicular of 0.2·dist, multiplied by `dy/dx` (or `dx/dy`) so the tail straightens near the axes.
  - Base = 2 points ±10 px *along* the outline from where root→tip crosses it (scale ×1.35 → ±14 px).
  - Path: `begin → quad(mid + n·w·k) → tip ± ε → quad(mid − n·w·k) → end`, with w = 0.3·base and k = (length of 2nd half)/(total).
  - Add the "pucker" handle (rotate 70°, length 0.8·base·min(1.8·|sinΔ|, 1)) so the tail leaves the balloon with a rounded shoulder.
  - **Merge** the tail with the body: fill body+tail, then stroke the union. Simplest Canvas way: draw both outlines at 2× stroke width, then fill both in white on top (the inner half of the stroke is covered).
  - Tail reach ≈ 0.55 of the balloon→speaker distance (postext `tailReach`); the tail does not have to touch the mouth.
- (d) comical-js (arcTail.ts, bubble.ts), postext.

**12. Shout balloon (spiky / 외침)**
- (a) A jagged burst outline.
- (b) Yelling, surprise, panic.
- (c) Either (i) comical "pointedArcs": the same jittered outline points (~30 px apart) joined by *inward* arcs of depth 7 px (×1.35 → 9 px). Or (ii) a burst star: 14 spikes (postext), radius alternating `r·(1 ± 0.22)` with seeded ±25 % jitter on the angle and depth. Use a straight wedge tail. Text: bold display face (Black Han Sans), +20 % size. Entry: scale 0.6 → 1.12 → 1.0 over 0.16 s, plus a 3 px shake for 0.3 s *(ours)*.
- (d) comical-js, postext.

**13. Thought balloon (생각)**
- (a) Cloud outline plus a chain of shrinking bubbles.
- (b) Inner monologue.
- (c) Outline points every ~30 px with jitter ≤ ½ spacing; outward arcs of depth 9 − rand·4.5 (×1.35). Tail: ellipses along the arc tip→root, radius `7 + (20−7)·s/len` (×1.35), rx = r+5, ry = r, gap 3, +2 per bubble; stop when the next bubble's midpoint enters the main balloon. Target = head. Entry: tail bubbles appear in sequence 60 ms apart, then the cloud *(ours)*.
- (d) comical-js thoughtBubble/thoughtTail.

**14. Whisper balloon (속삭임)**
- (a) Dashed outline, smaller and lighter text.
- (b) Whispers, asides, embarrassed mumbling.
- (c) `setLineDash([14, 10])` (1080 scale), stroke 2.5 px; text at 0.85× size, colour #555; often no tail, or a dashed tail.
- (d) postext (`dash: true`).

**15. Narration / caption box (내레이션)**
- (a) A rectangle, often butted to a panel edge or floating in the gutter.
- (b) Time and place ("3년 후"), inner voice, the narrator.
- (c) Rect with radius 0–12, fill #fff (or theme colour), stroke 3 px, padding 0.5 em, left-aligned or centred; butted = flush with the panel border and ignoring the 1.5 mm (≈ 12 px) inset. In webtoons, captions often sit *in the gutter between panels*, placed ahead of the image to set up time (Clip Studio).
- (d) postext, Clip Studio.

**16. Balloon families and joiners**
- (a) Several balloons for one speaker, linked.
- (b) A long speech split into beats; an interruption.
- (c) If they overlap, take the union outline (stroke-then-fill trick from #11). If they don't overlap, use a constant-width connector (comical "joiner": no taper, width = mid width). Reveal them in sequence 0.35–0.6 s apart, timed to reading *(ours)*.
- (d) comical-js.

**17. Special balloons**
- (a) Electronic/phone (zig-zag outline or a lightning tail), icy (drip edges), wobbly (scared voice).
- (b) Phone or TV voices; a trembling voice.
- (c) Zig-zag: polyline around the superellipse with a radial offset of ±6 px alternating every 18 px. Wobbly: radius `r·(1 + 0.03·sin(kθ + 6t))` with k = 7. The 6t term gives a slow animated tremble.
- (d) postext lists `radio`, `inner`, `note` and `wobble`; the shapes are *ours*.

### C. Lettering (식자) and SFX (효과음)

**18. Korean dialogue lettering**
- (a) Size, line breaks and fonts for Korean text in balloons.
- (b) All dialogue.
- (c)
  - **Size:** ≥ 24 px on 800 → **≥ 32 px floor; use 42–48 px** for phone-viewed 1080×1920 video *(src floor ×1.35, working size ours)*.
  - **Lines:** ≤ 2, max 3 per balloon (Korean webtoon author's feedback, brunch.co.kr).
  - **Line height** 1.2–1.3 (postext 1.15 is a Latin default; Hangul wants slightly more, *ours*).
  - **Breaks:** only at spaces between 어절 (the `keep-all` rule). Choose the break that minimises the longest line (balanced, roughly diamond-shaped text for ovals). Centre-align.
  - Often drop the final period ("." → none, keep "!", "?", "…"). postext drops 。 for CJK; this is common Korean webtoon practice *(convention)*.
  - Emphasis: bold or a colour on a key word.
  - **Fonts** (OFL, load by name): dialogue Jua or Do Hyeon (or Noto Sans KR 700); handwriting/thought Gaegu or Nanum Pen Script; shout Black Han Sans.
  - Text appears all at once, not typewritten.
- (d) #15, postext, google/fonts, brunch.co.kr post.

**19. SFX lettering with motion (효과음 타이포)**
- (a) Large, angled, outlined onomatopoeia drawn into the art.
- (b) Impacts (쾅, 퍽, 쿵), motion (휙, 스윽), heartbeat (두근두근), gag (꽈당, 털썩), shock (헉, 움찔), tremble (부들부들).
- (c)
  - Lay out per **syllable**: each glyph gets its own rotate (−20…+20°), scale (growing 1.0 → 1.4 along the word for impact), baseline offset and skewX (−0.2).
  - Break after ≤ 5 characters (postext).
  - Paint order: stroke 18 px **white or colour halo** → stroke 8 px black → fill (yellow/red/white). Use `lineJoin='round'`, `miterLimit 2`. Optionally a drop shadow offset 6 px. These are Pear's "stacked strokes and shadows".
  - Faces: Black Han Sans, Bagel Fat One, East Sea Dokdo (brush).
  - Motion: pop 0 → 1.25 → 1.0 per syllable with a 40 ms stagger; shake ±4 px for 0.25 s; heartbeat = scale `1 + 0.08·max(0, sin)²` at 1.2 Hz; echo copies at α 0.5 / 0.25, offset along motion; fade out by α or by sliding out of frame *(ours)*.
  - SFX may break the panel (#5).
- (d) postext, Pear, google/fonts, #16 (SFX tips links).

### D. Effect lines, tones and backgrounds

**20. Focus / concentration lines (집중선)**
- (a) Radial black wedges that converge on a subject, with an empty centre.
- (b) Surprise, realisation, emphasis on a face or object, comedic shock.
- (c) The hitode909 algorithm, per panel of size (W, H) with centre c:
  - Start at θ = 0 and repeat while θ < 2π: `θ += 0.02·(0.5 + rnd)`.
  - inner = `c + (sinθ·W/2, cosθ·H/2)·0.75·(1 + 0.3·rnd)`.
  - p1 = `c + (sinθ, cosθ)·(W, H)` (2× the half-size).
  - p2 = the same at `θ + 0.02·bold·(0.3 + 0.7·rnd)`, bold ≈ 1.0–1.1.
  - Fill triangle (inner, p1, p2) in black.
  - Clip to the panel. Raise the inner factor (0.75 → 0.9) for a bigger blank (cf. Uhiyama's blank 30 %, count 100, thickness 16, variation 50).
  - **Boil** at 10 fps (speedline.js redraws every 100 ms): seed = floor(t·10).
  - Entry: the inner radius shrinks from 1.2 → 0.75 over 0.15 s ("lines rush in").
- (d) hitode909/speedline, sugyan/speedline.js, Uhiyama.

**21. Speed lines (속도선 / 流線)**
- (a) Parallel streaks along the motion direction.
- (b) Running, dashing, a fast pan, a "zoom past".
- (c) Rotate the context to the motion angle. For N = 60–120 lines: y = seeded uniform across the panel; length 200–900; thickness 2–10, tapered (draw as a thin triangle or quad, thick end at the leading edge); x offset = `(seedX + v·t) mod (W + len)`. Leave a blank band (feather 40 px) around the subject. An alternative style is white lines on a dark tone.
- (d) Anime-Speed-Lines (concept), Uhiyama "Speed".

**22. Flash / burst background (번쩍 / ウニフラ)**
- (a) Spiky radial burst; white-on-black or black-on-white.
- (b) Reveal, epiphany, a dramatic or comedic "!!".
- (c) Fill black. Draw focus-line triangles in white with a large blank, or an "urchin" ring: 120 spikes whose inner end alternates r0·(1 ± 0.15) and outer end goes past the frame. Pulse the blank radius ±4 % at 3 Hz.
- (d) Uhiyama "Flash"; craft convention.

**23. Screentone / halftone dots (스크린톤)**
- (a) A rotated dot screen standing for grey values.
- (b) Monochrome manga feel, shadows, nostalgic or "printed" look, gag backgrounds.
- (c)
  - **AM screen at 45°.** Cell pitch p = 1080 / lines, with lines = 60 coarse / 90 normal / 130 fine for video. MangaScreen's 200 lines at ~1600 px wide give ≈ 8 px per dot; keep ≥ 5 px, and ≥ 8 px for video compression *(ours)*.
  - Dot radius `r = (p/2)·√coverage·1.13`. The ×1.13 lets dots merge near 80 %. With a plain `p/2·√c` dots never touch; the merge point is our tweak.
  - **Quantise to 4 levels** (white, 18 %, 42 %, black) with the white point at 0.80 and the black point at 0.30.
  - Implement as a cached `createPattern` tile per level: an offscreen canvas of p×p with one dot. Rotate with `pattern.setTransform(new DOMMatrix().rotate(45))`, then fill the region.
  - Alternative "digital" look: 4×4 ordered-dither ladder (MangaShader). Pixel-level, so it suits only low-res stylisation.
- (d) ComfyUI-MangaScreen, MangaShader/Exuin, Observable halftone-map.

**24. Gradient tone (그라데이션 톤) mood backgrounds**
- (a) A halftone whose coverage changes across the panel.
- (b) Dread from above, a soft romantic glow, a fade into memory.
- (c) Loop over the rotated grid cells (frame 1080×1920 at p = 14 → ~10k dots, fine per frame). `cov = smoothstep(y0, y1, y)·cmax`, `r = p/2·√cov`. For colour webtoons, use the same with a colour fill at α 0.25, or a plain linear gradient plus faint dots. Animate y0/y1 slowly (the "dread rising" effect).
- (d) Observable halftone (sqrt rule), MangaScreen (gradation option).

**25. Mood pattern backgrounds**
- (a) Symbolic backgrounds that replace the setting.
- (b)
  - **Sparkle/flower (반짝이)**: romance, a "pretty boy" entrance.
  - **Gloom vertical lines (세로줄, tate-sen)**: depression, cringe.
  - **Swirl**: confusion.
  - **Flat colour + speed lines**: gag.
  - **Black + white outline figure**: shock (the "white-out" silhouette).
- (c)
  - Gloom: 20–40 vertical lines from the panel top, length 30–70 % of panel height, lineWidth 3–6, alpha fading at the bottom (gradient stroke). Slight 0.5 Hz sway on the bottom ends.
  - Sparkle: see #31.
  - Shock silhouette: draw the character outline in white over flat black or dark blue, with no interior detail.
- (d) Manpu convention (Kouno); no repo.

**26. Colour script per mood (컬러 스크립트)**
- (a) A per-scene limited palette and an ambient multiplier.
- (b) Every scene; changes happen in gutters.
- (c) Mood presets as {bg, gutter, skin-shade multiplier, accent, line colour}:
  - Daily: warm pastel, cream gutter.
  - Romance: peach/pink with a soft glow.
  - Tension: desaturated teal, black gutter, hard shadows.
  - Horror: near-black, red accent, high contrast.
  - Gag: saturated flats, yellow bursts.
  - Sad: blue-grey, low contrast, rain lines.
  - Flashback: sepia (#9).

  Apply as a final `multiply` (shade) and `screen` (light) pass over the panel *(ours)*. Limited palette per scene; warm = happy, cool = tension/sad (#15).
- (d) #15, Clip Studio (theme colours).

### E. Characters

**27. Cel shading in 2D (셀 셰이딩)**
- (a) Flat base colour plus one hard-edged shade band (sometimes two).
- (b) The default rendering for colour webtoons.
- (c) MToon `linearstep(−1+toony, 1−toony, N·L + shift)` with toony 0.9 gives a nearly binary band. 2D version:
  - Fill the shape with the **shade colour**.
  - Clip to the shape and fill the *same shape translated toward the light* by d = 6–18 px in the **base colour**. A crescent of shade remains on the far side.
  - For softness ("shade softness"), blur only that crescent with `ctx.filter='blur(1.5px)'` while clipped.
  - Shade colour = base × (0.78, 0.74, 0.86), i.e. a slightly cool/purple multiply; the mood's ambient replaces this *(ours)*.
- (d) MToon spec, Godot-Cel-Shader.

**28. Rim light (림 라이트)**
- (a) A thin bright sliver on the edge facing a back light.
- (b) Drama, night scenes, the "cool entrance" shot, separating a character from a dark bg.
- (c) MToon rim `pow(sat(1−N·V+lift), 5)` gives a thin edge. 2D version: clip to the shape, fill rim colour, then fill the shape translated *away* from the rim light by w = 4–8 px in base/shade colour. Composite with `lighter` at 0.6–0.9. Animate w ±1 px for flicker under neon.
- (d) MToon spec, Godot-Cel-Shader.

**29. Ink line style**
- (a) Outer contour thicker than inner lines, slightly hand-drawn.
- (b) Always; heavier for SD gags, lighter for romance.
- (c) Outer 6–8 px, inner 3–4 px, `lineCap/lineJoin='round'`. Optional Rough.js line: roughness 0.4–0.8, bowing 1, maxOffset 2, gain 1 for < 200 px and 0.4 for > 500 px; double stroke for an inked look. Seed per stroke and keep it stable; **boil only in gag beats** at 8–12 fps. Inverted-hull outline idea: stroke the shape at 2× width in line colour *before* the fill (as in comical's stroke trick).
- (d) Rough.js, Godot-Cel-Shader (outline), comical-js.

**30. Emotion symbols (만화 기호 / manpu)**
- (a) Iconic marks attached to the head.
- (b) Placement carries meaning (IPSJ 2017). Each symbol, with its 2D build:
  - **Sweat drop** (awkward): a teardrop, i.e. a circle r = 18–28 whose top is pulled to a point with two Béziers. Fill pale blue, stroke 3 px, white highlight. Place at the temple. Slides down 30 px over 0.6 s and stretches 1.0 → 1.15 in y.
  - **Anger vein** (annoyed): four short concave arcs arranged as a ✚ with a gap in the centre, red #e33, lineWidth 6. Pulse scale `1 + 0.12·|sin(2π·3.5t)|`. Place at the forehead corner.
  - **Blush** (embarrassed/love): 3–5 parallel diagonal hatch strokes per cheek (length 24, 8 px apart, lineWidth 4, pink), or a radial-gradient pink ellipse at α 0.5. Animate the hatch count 0 → 5 over 0.3 s.
  - **Sparkle** (pretty/excited): a 4-point star made of two "pinched diamonds" (Bézier towards the centre, waist 0.2·r). Twinkle `scale = max(0, sin(2πft + φ))`, rotate 15°.
  - **Shock lines** (surprise): 3 short radial strokes above the head that pop out over 0.1 s.
  - **Gloom lines** (#25) and a dark blue face tint on the upper half (gradient multiply).
  - **Swirl** (dizzy): an Archimedean spiral r = a + bθ, 2.5 turns, rotating at 1 rev/s.
  - **Steam puff** (huffy): 2–3 small clouds from the ears/nose, scale up and fade over 0.5 s.
  - **Question/exclamation marks** above the head, popping with overshoot.
  - **Heart eyes** and floating hearts for love.
- (c) Draw all of the above as vector paths parented to the head transform, so they follow head sway.
- (d) comicgen (emotion vocabulary), Kouno/IPSJ (meaning); geometry *ours*.

**31. SD / chibi gag switch (데포르메)**
- (a) A character suddenly drawn super-deformed.
- (b) Gag reactions, punchlines, embarrassment, "tsukkomi".
- (c) A second rig with head : body ≈ 1 : 1.5 (normal ~1 : 6–7). Eyes become dots, lines ("> <") or huge circles; hands become mittens; thicker lines; flat colours; no shading; bg replaced by flat colour, speed lines or a focus burst. **Switch on the beat with a hard cut** (no morph), optionally with a "poof" (5 puff circles scaling out, 0.2 s). Return with a hard cut too. Panel border optional; SD figures often break the border (#5). The proportions are general craft knowledge, not from a repo.
- (d) Craft convention (no repo); comicgen layered-rig idea.

**32. Motion-toon micro-animation: blink (깜빡임)**
- (a) Periodic eye closes.
- (b) Any hold longer than ~2 s, so characters feel alive.
- (c) Live2D timings: closing 0.10 s, closed 0.05 s, opening 0.15 s; next blink at `last + r·(2·4.0 − 1)` s, i.e. 0–7 s. **Make it pure:** precompute the blink schedule per character from a seeded PRNG at load, then evaluate `eyeOpen(t)` by finding the current interval. Eyelid = scaleY of the eye white/iris clip: 1 → 0.05 (closing, ease-in), hold, then → 1 (ease-out). Occasionally add a double blink (15 % chance, 0.25 s apart) *(ours)*.
- (d) Live2D CubismWebFramework.

**33. Motion-toon micro-animation: breathing and idle sway**
- (a) Constant low-amplitude motion.
- (b) Holds and dialogue panels in motion-toons (무빙툰/모션툰).
- (c) Live2D `offset + peak·sin(2πt/cycle)` with **incommensurate cycles** 3.2345 / 3.5345 / 5.5345 / 6.5345 / 15.5345 s, so it never visibly loops. In 2D, scale peaks down:
  - head rotate ±1.2°, period 6.5345 s;
  - head tilt (y offset) ±3 px, period 3.5345 s;
  - body rotate ±0.4°, period 15.5345 s;
  - chest scaleY 1 ± 0.008, period 3.2345 s (breath).

  Apply about pivots (neck, hips).
- (d) Live2D CubismWebSamples.

**34. Hair, cloth and accessory sway (secondary motion)**
- (a) A lagging, damped follow-through.
- (b) After a head turn, in wind, on a dramatic entrance.
- (c) VRM SpringBone is verlet: inertia `(1 − drag)`, stiffness pull, gravity. For pure-function evaluation use a closed-form equivalent: per strand segment i, `θ_i(t) = Σ_k A_k·sin(2πt/T_k − i·0.35) + Σ_events A_e·e^(−(t−t_e)/τ)·sin(ω(t−t_e) − i·0.5)·H(t−t_e)`, with τ ≈ 0.35 s, ω ≈ 2π·1.8, and a smaller A for stiffer strands. Draw hair as a chain of 4–6 Bézier segments whose control points rotate by the accumulated θ. Wind: T_k = 1.7 and 2.9 s, A = 2–5°.
- (d) VRM springBone spec (verlet model; our closed form replaces simulation).

**35. Parallax inside a panel**
- (a) Background, mid and foreground layers moving at different rates.
- (b) Establishing shots, scroll-through moments, motion-toon depth.
- (c) Layer offset = `cameraDelta·k`, with k = 0.2 (sky), 0.5 (buildings), 1.0 (character), 1.3 (foreground leaves/particles). The cameraDelta comes from #1's scroll position relative to the panel centre, so the panel parallaxes as it scrolls through the screen. Loop ambient particles (dust, rain, petals) analytically: `y = (y0 + v·t) mod H`.
- (d) Scroll-driven parallax demos (GSAP/CSS `view()` repos found in search); general practice.

**36. Silent beat panel (침묵 컷)**
- (a) A panel with no dialogue: a stare, "……" in a small balloon, or an empty background.
- (b) The pause before a punchline, awkwardness, emotional weight.
- (c) The same framing as the previous panel (or a tighter crop) with only a blink or a sweat drop moving. An optional "……" balloon with a whisper-weight stroke. Hold 0.8–1.4 s; preceded by an emotional-beat gutter (#2).
- (d) #15 ("empty space = silence"), Clip Studio; timing *ours*.

**37. Dialogue-before-character staging (대사 선행 배치)**
- (a) Balloons appear in the gutter before the speaker scrolls into view.
- (b) Introspection, an off-screen voice, a reveal of who spoke.
- (c) Place a caption or balloon at strip y above the panel. The camera holds on it (with reading time) before gliding to the face. The tail points down toward the not-yet-visible speaker, or has no tail.
- (d) Clip Studio KR/EN.

**38. Hand-drawn panel boil and "rough" mode (optional)**
- (a) Lines re-jittered a few times per second.
- (b) Gag sequences, chaotic energy; never on calm scenes.
- (c) Rough.js `_line` with a seed of `hash(id, floor(t·8))`; roughness 1.0 for gags, 0 elsewhere.
- (d) Rough.js, speedline.js (boil cadence).

---

## 3. Korean webtoon conventions (from the sources)

- **Format.** One long vertical strip read by scrolling; no page turns (Clip Studio KR: "페이지를 넘기지 않습니다"). Colour is the default because people read on phones.
  - Widths: Naver 690 px, Daum 760, WEBTOON 800, Lezhin 720.
  - Uploads are sliced at about 1280 px tall; slicers cut at blank gutter rows and avoid balloons and faces (#15, ManhwaFormatter).
  - An episode runs about 40–80 panels, 6–12k px, 5–10 minutes of reading.
- **Gutter = time and psychology.** "여백의 크기가 장면 전환이나 심리 묘사 효과를 냅니다." Big gaps slow the read; small or overlapping gaps speed it up (#15, Comistitch numbers in the playbook, item 2).
- **One moment per screen.** A panel should fit within one screen (Comistitch: under 1200 px on an 800 canvas, which is about one phone screen). Readers see 1–2 panels at once. For our 1080×1920 frame: one hero panel up to ~1500 px tall, or two short panels.
- **Mix panel widths.** Full-width (bleed) panels for key moments, establishing shots and scene changes. Narrow or inset panels for quick reactions. Repeating one size is the classic beginner mistake (#15).
- **Dialogue lives in the scroll space.** Balloons are not packed inside page frames as in print. They often sit between or ahead of images. Dialogue placed before the character shows introspection (Clip Studio).
- **Outside the panels.** White, black or the theme colour; colour can run past borders (Clip Studio).
- **Flashbacks** use a sepia or colour-tone shift rather than only black frames (Clip Studio).
- **Overlapping or complex grids** read badly on phones and force zooming (Clip Studio). Keep page-style clusters rare and simple: 2–3 slanted panels at most (comfyui_panels logic).
- **Readers add no gaps.** Webtoon-mode readers (Mihon and others) treat the strip as continuous, so all spacing is the author's.
- **Lettering.** Large text: at least 24 px on an 800 canvas, which is ≥ 32 px for us. 2 lines per balloon, never more than 3. Break only at word spaces (어절). Display fonts for SFX. SFX are drawn into the art and may break panels.
- **Motion-toon / 무빙툰 / 효과툰.** No open-source engine was found. In practice it means looping micro-motion inside otherwise static panels (blink, breath, hair, particles, flicker), plus scroll-triggered entrances (balloon pops, SFX pops, zoom punches). The Live2D-style parameters above (items 32–34) are the closest sourced numbers.

## 4. Comedy pacing (개그 연출)

No GitHub repo encodes comedy timing. This section turns the conventions above into rules for our kit; the timings are *ours*.

1. **Setup → beat → punchline → (aftermath).** This is the 4-koma kishōtenketsu logic adapted to scroll.
   - **Setup:** 1–3 normal panels, normal gutters (40–70 px), dialogue holds of `0.6 s + 0.09 s × Hangul syllables`.
   - **Beat:** a **silent beat panel** (item 36): the same framing, no text or just "……", only a blink or a sweat drop moving. Hold **0.8–1.2 s**, preceded by an *emotional-beat gutter* (270–400 px).
   - **Punchline:** a **hard cut** (no glide, or a ≤ 0.12 s glide) to a full-width panel with an SD switch (item 31), focus lines or flash (items 20/22), SFX pop (item 19) and a zoom punch (item 7). Hold 1.5–2.0 s; boil lines at 8–12 fps.
   - **Aftermath:** a small panel, often a deadpan reaction from another character (sweat drop, "……", gloom lines). 1.0 s.
2. **Contrast sells the gag.** Calm, detailed, cel-shaded setup → flat, saturated SD punchline. Turn shading off and lines up (thicker) in the gag panel.
3. **The gap before the punch is the timing.** A longer gutter or hold before the punchline is the "pause"; never put a big gap *after* the punchline. Cut away quickly with a small gap to the aftermath.
4. **One gag symbol per face.** Manpu meaning depends on placement (IPSJ). Do not stack a sweat drop, anger vein and blush at once unless the over-reaction is the joke itself.
5. **Text economy.** A punchline line is ≤ 8–10 syllables, shout balloon, larger font. The best punchline is often SFX plus a face, with no dialogue.
6. **Running-gag repetition.** Reuse an exact framing three times: the third time either breaks the pattern or escalates it (bigger, with a panel break).

## 5. Licences and credits

**Principle:** we write our own renderer and borrow *ideas, parameters and formulas*. Algorithms and numeric defaults are not copyrightable expression, but we credit them anyway. We copy **no code verbatim** from copyleft or proprietary sources.

| Source | Licence | Constraint for us | Credit line (suggested) |
|---|---|---|---|
| comical-js | MIT | Ideas free; if any code is ported, keep the MIT notice | "Balloon tail and thought/shout outline method after BloomBooks/comical-js (MIT)" |
| postext | MIT | Free | "Lettering/balloon defaults informed by drnachio/postext (MIT)" |
| hitode909/speedline, sugyan/speedline.js | MIT | Free | "Focus-line algorithm after hitode909/speedline & sugyan/speedline.js (MIT)" |
| Anime-Speed-Lines | Unlicense | Public domain | Courtesy credit to MirzaBeig |
| MangaShader / Exuin screentone | MIT / CC0 | Free | "Ordered-dither screentone after Joy-less/MangaShader (MIT), Exuin (CC0)" |
| ComfyUI-MangaScreen | MIT | Free | "Tone levels and 45° screen after ashukae/ComfyUI-MangaScreen (MIT)" |
| comfyui_panels | MIT | Free | "Cut-tree panel layout after bmad4ever/comfyui_panels (MIT)" |
| Rough.js | MIT | Free; keep the notice if any code is ported | "Hand-drawn line method after Rough.js (MIT, Preet Shihn)" |
| VRM spec (MToon, SpringBone) | Licence not shown on GitHub page; raw LICENSE 404 | Use formulas only (spec-level facts); do not copy reference code | "Toon/rim/spring formulas from the VRM Consortium's VRM specification" |
| Live2D Cubism Framework / Samples | Live2D Open Software Licence + SDK Release Licence (businesses > ¥10M revenue) | **Do not copy or port code.** Use only the timing numbers (facts) and the sine-sum idea, reimplemented independently | "Blink/breath timings referenced from Live2D Cubism SDK samples" |
| Godot-Cel-Shader | MIT | Free | "Cel-shading parameter model after EXPWorlds/Godot-Cel-Shader (MIT)" |
| comicgen | MIT code; art CC0/CC-BY | We use only the vocabulary; no art | "Expression vocabulary inspired by gramener/comicgen" |
| Mihon | Apache-2.0 | Free; NOTICE only if code is copied | "Webtoon reader conventions from mihonapp/mihon" |
| webtoon-creation-guide | MIT | Free | Credit SamDreamsMaker |
| awesome-webtoon-guidelines | CC0 | Free | Courtesy credit ricafolio |
| Google Fonts Korean faces | SIL OFL 1.1 | Fonts may be loaded or bundled with the OFL notice; they must not be sold alone; Reserved Font Names apply to modified versions. Loading by name (as canvas-film does) keeps us "asset-free" in our own repo | List each family and designer in the kit's credits |
| Kumiko | **AGPL-3.0** | Ideas only; never copy code (a network-use copyleft) | Optional mention |
| manga-image-translator | **GPL-3.0** | Ideas only | Optional mention |
| Clip Studio articles, Comistitch, Uhiyama, brunch post | All rights reserved (web articles) | Paraphrase and cite; do not reproduce text or images | Cite URLs in `references/LESSONS.md` / SKILL provenance |

**Provenance note for CONTRIBUTING.md:** list the sources in the kit's `SKILL.md` and `docs/skills.json` provenance. Flag that comedy timings, scaled gutter values and all *(ours)* numbers are our own calibration and must be checked against real renders on a phone.
