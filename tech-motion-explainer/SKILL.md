---
name: tech-motion-explainer
description: Turn a technical process (architecture, pipeline, dev workflow, protocol, infra flow) into a 60–110s code-driven motion-graphic explainer — a set of three pages per topic (video player · written explanation · topic glossary), plus an MP4. Use when the user gives technical content and asks for a 모션그래픽 / 설명 영상 / 기술 설명 영상 / explainer video / animated walkthrough / motion graphic of how something works. Also covers a 9:16 vertical cut (세로 영상 / 모바일), 3D ways to explain a topic (분해해 들어가기, 흐름과 관계를 빛으로, 실물을 공간에 늘어놓기, …), and pieces scroll-scrubbed inside another page (scroll-embed, e.g. a résumé or landing page).
---

# Tech Motion Explainer

Builds a single-file canvas animation where every frame is a pure function of time (`renderAt(t)`),
wrapped in a player (play/pause, scrubber, chapter chips, speed 1× / 0.75× / 0.5×). Each topic is a set of three pages:
`index.html` (영상), `article.html` (설명, chapter by chapter) and `terms.html` (용어집, this topic's terms only). The same page is baked to MP4 by
`<skill>/scripts/render.mjs`. Reference implementation: `<skill>/starter/proto-bot-pipeline/index.html` (64s, 5 chapters).

`<skill>` below means this folder (e.g. `.claude/skills/tech-motion-explainer`). All scripts run from the **project root**.

**Worked example repo:** github.com/jungrok5/mmo-server-explained (live: jungrok5.github.io/mmo-server-explained) — 12 topics on MMO
server and network behaviour, their vertical cuts and 3D approach pages, built with this skill. Pages cited below by folder name
(`boss-lag-shorts/`, `ue-client-threads/`, `slow-client/`, `one-byte/`, `*-wide/` …) live there. The repo may be renamed; GitHub redirects the github.com URL.

## What's in this folder
| path | what |
|---|---|
| `template.html` | engine + player + 4 example scenes (intro, code panel, node flow, outro). Copy it to start a topic. |
| `scripts/render.mjs` | stills (`--stills 3,20`) or a full MP4; `--from/--to` segments, `--query`, `--size` |
| `scripts/render-chunked.sh` | MP4 in parallel, resumable segments, joined; re-encodes if over ~95 MB (GitHub's 100 MB limit) |
| `scripts/check-player.mjs` | headless check: page errors, play, chapter jump, speed button, notes, phone-width overflow |
| `scripts/build-articles.mjs` | builds `<slug>/article.html` (설명) and `<slug>/terms.html` (용어집) from the notes in every video page |
| `starter/` | a runnable mini project: `assets/` (fonts, three.js), `proto-bot-pipeline/` (the 2D reference, with its generated reading pages), `server-tick-inside-wide/` (the 3D "open it up" reference), `index.html` (gallery with `VIDEOS`) |
| `kits/` | **reusable engines** for five looks — `whiteboard`, `zoom-levels`, `profiler-lanes`, `artifacts-desk`, `game-scene` (kits/README.md): machinery only, every topic still designs its own composition, palette and camera |
| `references/` | STYLES (the 7 ways to explain in 3D, choosing, cuts, engine) · STYLE-ZOOM / STYLE-GLOW / STYLE-GLASS (craft notes) · EXPERT-REVIEW (review prompt) · EMBED (scroll-scrubbed pieces inside another page) · LESSONS (what went wrong and the fixes) |

## Project layout (what you create)
```
my-explainers/
  assets/                  ← copy of <skill>/starter/assets/ (fonts/, vendor/three/, README.md with licenses)
  index.html               gallery; holds  const VIDEOS = [ … ];  which build-articles.mjs reads (start from <skill>/starter/index.html)
  <slug>/index.html        one topic: the video page (engine + player + hidden notes)
  <slug>/article.html      generated 설명 page   (never edit by hand)
  <slug>/terms.html        generated 용어집 page (never edit by hand)
  <slug>-shorts/index.html optional 9:16 vertical cut
  <slug>-<approach>-wide/, <slug>-<approach>/   optional 3D approach pages (references/STYLES.md)
  out/<slug>.mp4           baked videos
```
Pages load fonts and three.js from `../assets/`, so every topic folder sits directly under the project root.

`VIDEOS` entries (one per 2D topic and per vertical cut; copy the shape from `starter/index.html`):
```js
const VIDEOS = [
    { path: 'proto-bot-pipeline/', mp4: 'out/proto-bot-pipeline.mp4', title: '패킷 정의 하나로, 개발부터 라이브까지', length: '1:04',
      desc: 'one or two sentences: what the video covers.', tags: ['protobuf', 'codegen', 'bot client', 'load test'] },
    { path: 'proto-bot-pipeline-shorts/', vertical: true, full: 'proto-bot-pipeline/', mp4: 'out/proto-bot-pipeline-shorts.mp4',
      title: '세로 · …', length: '0:57', desc: '모바일용 세로 영상. …', tags: ['mobile', '9:16', …] },
  ];
```
`path` = folder with the index.html · `title`, `desc`, `length` (m:ss) and `tags` appear on the reading pages · `mp4` = baked file ·
`vertical: true` + `full` = a vertical cut and the topic it belongs to (build-articles skips it; it shares the full topic's reading pages).
build-articles finds the list as text: from the first `const VIDEOS = [` to the next line that is exactly `  ];` (two spaces). Keep that
closing line and do not write the opening marker in a comment. 3D approach pages go in a separate list (the worked example calls it `LAB`).

**Requirements:** Node 18+ and Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`; the scripts find a global
install too). If browsers live elsewhere set `PLAYWRIGHT_BROWSERS_PATH`, or pass `executablePath` to `chromium.launch()` in the scripts. ffmpeg
for MP4s. WebGL pages render with software GL in headless Chromium (slow but correct). Renders never touch the network.

## Workflow

### 0. Set up (once per project)
```bash
cp -r <skill>/starter/assets assets
cp <skill>/starter/index.html index.html          # then empty VIDEOS / LAB and retitle
```
Run everything on the bundled reference first if this is your first time: `cd <skill>/starter && node ../scripts/render.mjs proto-bot-pipeline/index.html /tmp/stills --stills 5,30`.

### 1. Extract the story (before any code)
From the user's content, write down:
- **Actors / artifacts** (e.g. `.proto`, client, server, bot, publisher). Each gets one role color, used consistently.
- **The flow**, in order. Each step becomes a chapter.
- **The audience** — default: engineers outside the subject's specialty (e.g. backend, infra, QA for a game-server topic). Write for what they actually ask
  (what happens on the wire and on the server, which number or metric to look at), not only for specialists.
- **The punchline** — why this matters (e.g. "packets never go stale", "test before the client exists"). It becomes the title and the outro tagline.
  State it as a fact. Do not stage a question and answer it ("답: 조건부로 맞다"); if a claim has conditions, show the conditions as content.
- **Concrete details only this subject has**: real file names, message names, field names, commands, metrics.
  These are what make it read as technical rather than generic. Invented numbers must be labeled `* 수치는 예시`.

### 2. Storyboard table
Show the user nothing yet; write the table into your plan:

| time | chapter | visual device | key on-screen text |
Budget: intro 5s · 4–8 chapters of 10–15s · outro 5.5s → 60–110s total.
Each chapter = one idea and one visual device. Pick from the device catalog below.

### 3. Build
1. `mkdir <slug>` and copy `<skill>/template.html` → `<slug>/index.html`. Replace `__TITLE__` (2–4 word name).
2. Set `DURATION`, `HEAD` (chapter rows: start, end, number, title, subtitle), `TITLE` (intro only), `OUTRO`.
   The player reads `DURATION` for the time label and slider range; nothing else to update.
   Length guide: chapter title ≤ 14 chars, subtitle ≤ 40 chars, a centered canvas line ≤ ~1600px at its size
   (check with `tw(text, size, weight)` when unsure).
3. Delete the example scenes, write one `sXxx(t)` per chapter, and list them in `renderAt`.
4. Helpers in the template: `panel`, `chip`, `dot`, `txt`, `tw`, `code`, `words`, `bezPt`, `rng`, easing (`eo`, `eio`, `eback`, `win`, `p`).
   Devices beyond that (cards, lanes, tanks, bars, hatching) live in the reference videos in the catalog below; copy the function you need.
5. Scene skeleton:
   ```js
   function sThing(t) {
     const [S, E] = HEAD[i]; const a = win(t, S, E, .5); if (a <= 0) return;
     const u = t - S;                       // local time
     ctx.save(); ctx.globalAlpha = a;
     const k = eo(p(u, .2, .7));             // element enters at u=.2 over .7s
     panel(x, y + (1 - k) * 40, w, h, { alpha: k, stroke: C.proto });
     ...
     ctx.restore();
   }
   ```
   A chapter can have sub-phases: two `win()` windows overlapping by ~0.3s (see `sServerFirst`, `sPublisher` in the 2D reference).
   Or one window whose layout persists while state changes (see `sCodegen` → sync, which spans two headers).

6. Write the source text for the 설명 and 용어집 pages into the `<!-- NOTES -->` slot (inside the hidden `<section class="notes">`), for the same audience:
   ```html
   <p class="lede">2–3 sentences: what the video explains and the main takeaway.</p>
   <article data-ch="01"><p>…</p></article>      <!-- one per chapter number in HEAD; no heading -->
   <h2>용어 정리</h2>
   <dl class="terms"><dt>틱</dt><dd>…</dd> …</dl>  <!-- 8–15 terms used in the video -->
   ```
   Chapter titles and subtitles come from `HEAD` when the pages are built, so chapter renames need no notes edit.
   Each chapter: 2–4 short paragraphs (or a `<ul>`) that say what is on screen and why. Numbers must match the canvas exactly.
7. Add the `VIDEOS` entry (see Project layout), then generate the reading pages from those notes:
   `node <skill>/scripts/build-articles.mjs [--site https://you.github.io/repo/]` → `<slug>/article.html` (설명: lede, table of contents,
   chapters with "▶ 이 장면 보기" links to `index.html#chNN`) and `<slug>/terms.html` (용어집: this topic's terms, searchable). All three pages
   share tabs 영상 · 설명 · 용어집. `--site` (or env `SITE`) is the published gallery URL for the "전체 영상 목록" footer link; without it the
   link is `../index.html`. Never edit the generated files by hand; edit the notes in `<slug>/index.html` and rerun.

### 4. Verify (mandatory, before showing the user)
```bash
node <skill>/scripts/render.mjs <slug>/index.html <scratch>/<slug>-stills --stills <times>
node <skill>/scripts/check-player.mjs <slug>/index.html --shots <scratch>/<slug>-stills
```
- Use a fresh stills folder per video. Files are named `t003.6.png`, `t011.0.png` so they sort by time.
- Pick times: the end of each chapter (everything revealed), plus the moments where something moves through
  or lands near text (packets crossing labels, counters growing, chips appearing). Overlaps hide in those in-between frames.
- The two `404` lines in the render log are expected: fonts are tried at `assets/fonts/` then `../assets/fonts/`.
- check-player expects the template's player (`#big`, `#time`, chapter buttons, `#rate`, `nav.set`); an embed-only piece has none, so check it with stills only.
- Open `article.html` and `terms.html` too (or screenshot them) at desktop and phone width.
- The poster frame (`POSTER`, before play) shows the intro; the big play button sits under the title, so keep the intro's
  story strip above y ≈ 900.
Read every still. Fix overlapping text, clipped boxes, truncated typed lines, empty areas. Re-render only the stills you changed.
Then re-read every on-screen claim and the notes as a skeptical reviewer: is it true as stated, is it compared like-for-like,
is any number or effect exaggerated, is an example number labeled `예시`? Fix before delivering.

### 5. Expert review (mandatory, separate agent)
After the verify step, spawn a separate agent as a senior expert in the topic, using the prompt in
`<skill>/references/EXPERT-REVIEW.md`. It reads the page and returns findings in three classes:
**틀림** (false; always fix), **오해 소지** (misleading; fix when a word or clause does it), **단순화 (OK)** (leave as is).

- This is explanatory material: simplification, rounded or labeled example numbers, idealized timelines and analogies
  are allowed as long as nothing is false. Do not tighten the copy beyond what a 틀림 / 오해 소지 finding needs.
- Apply fixes to the canvas text and the notes together, re-render only the stills you changed, rerun
  `node <skill>/scripts/build-articles.mjs`, and tell the user in one or two lines what the review changed.
- If a finding seems wrong to you, keep the text and say why in your summary instead of silently ignoring it.

### Mobile vertical version (9:16)
When the user asks for a vertical or mobile version (세로 영상 / 모바일 / 쇼츠 / 릴스), make a separate 40–60s cut of an existing topic, not a full conversion.
Pick 3–4 ideas that carry the topic's main message and redraw them for a phone screen.

- Base: copy `boss-lag-shorts/index.html` from the worked example repo (1080×1920 engine, vertical `headers()` / `progress()` / `caption()`,
  player sized 9:16). Name it `<slug>-shorts/`. Keep the numbers and claims identical to the reviewed full video.
- Fill the frame: background and pictures run edge to edge. Only text keeps a light margin from the shorts app's own UI
  (top ~110px, bottom ~280px; avoid the lower-right corner where the like/comment buttons sit). Side margins 60, centered on 540.
  Header y 100–340, picture y 370–1470, two-line caption y 1500–1640.
- Type: title 80, caption 54 / 44, picture labels ≥ 34, key numbers 90+. Give labels that sit over dots a dark backing. One idea per screen; the caption states it in one line.
- End card: the takeaway in two short lines and the full video's link (its URL on your published site, e.g. `<site>/<slug>/`).
- The player nav links to the full video's 영상 · 설명 · 용어집; vertical versions have no notes of their own.
- Verify the same way (stills, `check-player`), then bake the MP4 to upload: `node <skill>/scripts/render.mjs <slug>-shorts/index.html out/<slug>-shorts.mp4`.
- Gallery entry: `{ path: '<slug>-shorts/', vertical: true, mp4: 'out/<slug>-shorts.mp4', full: '<slug>/', … }`;
  add a `모바일 세로 영상` link to the full video's player nav. In user-facing copy call it 세로 영상 or 모바일 세로 영상, not 쇼츠; title prefix `세로 · `, desc starts `모바일용 세로 영상.`, tags start `'mobile', '9:16'`.

### Other ways to explain (3D, WebGL)
When the user asks for a different style, look or a 3D version, read `<skill>/references/STYLES.md` first. A style is an approach
(분해해 들어가기 / 흐름과 관계를 빛으로 / 실물을 공간에 늘어놓기 / …), chosen only if it fits the topic; the look comes from the topic,
never copied from a reference. Wide = the full explainer, vertical = a ~20 s cut; no MP4 unless asked.
Bundled reference: `<skill>/starter/server-tick-inside-wide/index.html` (분해해 들어가기, three.js, 81.5 s). Its nav links to sibling pages that
are not bundled (`../server-tick/` …); they exist in the worked example repo.

### Pieces inside another page (scroll-scrubbed)
When the piece is shown inside another page (a résumé, a landing page, a long article) and driven by scroll rather than played,
read `<skill>/references/EMBED.md`: `?embed` / `?layout=tall` / `?q=` modes, the scroll → t driver, timing rules for scrubbing, posters, MP4 bake.

### 6. Deliver
- Publish the topic so others can open it. As a Claude Artifact, use `files` so the fonts and the reading pages ship with it:
  `{"article.html": "<slug>/article.html", "terms.html": "<slug>/terms.html", "assets/fonts/Pretendard-Variable.woff2": "assets/fonts/Pretendard-Variable.woff2", "assets/fonts/JetBrainsMono.woff2": "assets/fonts/JetBrainsMono.woff2"}`
  (the page tries `assets/fonts/` first, then `../assets/fonts/`). Or deploy the project root to any static host (GitHub Pages works as is).
- Add the entry to `VIDEOS` in the root `index.html`, and a row to the project README's topic table if it has one (title · length · one-line summary · 영상 / 설명 / 용어집 links).
  Run `node <skill>/scripts/build-articles.mjs` again if anything changed. The generated pages are committed with the rest.
- Bake the MP4 too: `node <skill>/scripts/render.mjs <slug>/index.html out/<slug>.mp4` (~3.5 min per minute of video), or for long or
  WebGL pages `<skill>/scripts/render-chunked.sh <slug>/index.html out/<slug>.mp4` (parallel, resumable; re-run after an interruption).
  The gallery entry carries `mp4: 'out/<slug>.mp4'`.

## Rules
- **Determinism**: no `Math.random()`, `Date`, or `performance.now()` inside scenes. Use `rng(seed)`, and derive everything from `t`.
- **Canvas 1920×1080.** Side margins 120. Header zone y < 190 (owned by `headers()`). Progress bar at y 1040. Content lives in y 200–1010.
- **Type sizes**: chapter title 50, scene headline 34–36, body 22–27, code 19–24 mono, smallest labels 15–16. Never below 15.
- **Color = role.** The palette is `C.proto / client / server / bot / pub / red`; rename the roles in a comment if the subject differs, but keep one meaning per color. Red only for failure/threshold.
- **Motion vocabulary**: things enter with `eo` + 30–60px slide; emphasis uses `eback` pop or glow pulse; packets are `dot()`s on `bezPt` paths. Nothing moves without meaning.
- **Text reveals**: give viewers ~1s of read time per 10 Korean characters before the next element replaces it.
- **Contrast beats**: at most one red dashed card + ✗ per video, for the main wrong approach, near the chapter that proves the point.
  Other bad states (waiting, overflow, threshold crossed) use red fills or red hatching without the ✗ card.
- **Korean copy**: short declarative lines. Code, identifiers and metrics stay in English/mono. (For another language, keep the same rules: short declarative lines, identifiers untranslated.)
<!-- style-ignore-start -->
- **No AI-sounding copy** (titles, subtitles, canvas text, notes). Avoid:
  - metaphor nouns for a process: "받는 길", "~의 여정", "편도 여행", "전체 지도" → say what it is: "패킷을 받을 때", "전체 구간";
  - "~하는 곳", "핵심은 ~다", "단순히 ~가 아니라 ~다", "~라는 점이다", 살펴보자 / 알아보자, rhetorical questions;
  - aphorism taglines built on contrast or metaphor ("바이트는 작지만, 곱하기는 크다", "예측이 판정에 진 순간").
    The tagline states the takeaway plainly: "1바이트도 곱하면 월 6.5TB.";
  - more than one em dash (—) per line of copy; prefer a comma or a new line.
<!-- style-ignore-end -->
- **Honesty**: compare like with like (tuned vs tuned, not tuned vs default). Effects that depend on a bottleneck say which one
  ("대역폭이 병목일 때"). Small effects are shown as small. Illustrative numbers, layouts and sample logs are labelled `예시` / `개념도`;
  never present research or a plan as shipped, or a drawing as a real capture ("재현").
- **Progress bar labels** shorten themselves to fit between ticks (`progress()`); keep chapter titles short anyway (≤ 14 chars reads best).

## Device catalog (where to copy from)
In the 2D reference, `<skill>/starter/proto-bot-pipeline/index.html`:
| device | when | reference |
|---|---|---|
| Typed code panel + 3 explanation cards | defining a schema/config/API | `sProto` |
| Hub-and-spoke codegen (source → tool → N outputs) | one source fans out | `sCodegen` |
| In-place diff (`insert` in `code()`) + version chips flip + ✓ badges | change propagates / stays in sync | `sCodegen` (u ≥ 10) |
| Stale/bad alternative card (dashed red, shake, ✗) | contrast | `sCodegen` ghost card |
| Gantt timeline with playhead + hatched gap | schedule / who waits on whom | `sServerFirst` part A |
| Sequence diagram (lifelines, arrows, burst) | request/response protocol, call order | `sServerFirst` part B |
| Hand-off arc between two team cards | deliverable passes between teams | `sPublisher` part A |
| Load dashboard (dot grid, server gauges, line chart with threshold, stat chips) | scale / capacity / metrics | `sPublisher` part B |
| Result cards row | conclusions of a chapter | `sPublisher` RES |
| Node strip + tagline | outro summary | `sOutro` |

More devices in the worked example repo (copy the function and its helpers):
| device | when | reference |
|---|---|---|
| Thread / time lanes with blocks and hatched waits (`laneLabel`, `blk`) | threads, frames, who waits on whom over time | `ue-client-threads` `sThreads`, `sBossFrame`, `sHitch` |
| Stacked latency bar per scenario | where the milliseconds go | `ue-client-threads` `sLatency` |
| Line chart with shaded gap and live counter | rate in vs rate out, backlog growing | `slow-client` `sSqueeze` |
| Tanks (buffers filling, cap line) and flow arrows (`tank`, `flowArrow`) | queues, buffers, backpressure | `slow-client` `sBackpressure`, `sCap` |
| 2×2 cards with a small animation each (`cardFrame`) | four causes / four costs | `slow-client` `sCosts` |
| Byte cells per field, bit layout | packet formats, sizes | `one-byte` `sSizes` (`protoRow`, `bitRow`) |
| Bars with values + savings panel | totals, cost, capacity comparisons | `one-byte` `sTotals`, `sCapacity` |
| Terminal output + judgement list | which metric to read and what it means | `slow-client` `sDetect` |
| Two-column fix list (`noteRow`) | client side vs server side remedies | `slow-client` `sFixes` |

For a protocol timing diagram with time running down the page, use the lane devices rotated: one vertical lifeline per side,
y = time in ms (label the axis), arrows between lifelines at their send/receive times, red hatching for waits.

## Contract every page fulfils
`window.renderAt(t)` draws frame t on canvas `#c`; `window.DURATION`; `window.ready` (Promise, fonts loaded). `?render` = no player UI
(used by the scripts); `#poster` = canvas only, looping (gallery thumbnails); `#chNN` = open paused at chapter NN. Embedded pieces add
`?embed`, `?layout=tall`, `?q=` (references/EMBED.md). That contract is what lets the same file be played, scrubbed, recorded and embedded.
