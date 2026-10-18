# Lessons — what went wrong and the fixes

From building the worked example (github.com/jungrok5/mmo-server-explained: 12 topics, vertical cuts, 3D approach pages, MP4s) and the
scroll-embedded résumé pieces (github.com/jungrok5/resume → `public/motion/`).

## Look and approach
- **Copying a reference's look ("판박이").** The first 3D samples took a reference's palette, header wording, title type and end card and
  swapped our words in; they read as the same video. Fix: a reference teaches the *principle* and the craft level only. The look comes from
  the topic's own world (a profiler timeline, an editor and terminal, a game screen, a whiteboard). Look test: put a still next to the reference.
- **Forcing a topic into an approach.** An approach that does not fit reads as a template pasted on. Fix: write "the viewer understands it
  when they see ___" first; pick the approach from that sentence, or stay 2D (`STYLES.md`).
- **Wide versions as upscaled 20 s cuts.** The first wide (PC) 3D pages were the vertical cut stretched. Fix: wide = the full explainer —
  same chapters, timing, numbers, claims, footnotes and notes as the reviewed 2D video; vertical = the ~20 s cut.

## Rendering and publishing
- **The 2-hour background-job limit** killed long single-process MP4 renders (software WebGL is slow). Fix: `render.mjs --from/--to` segments
  and `render-chunked.sh` (parallel, finished segments kept, re-run to resume).
- **GitHub rejects files over 100 MB.** Fix: render-chunked re-encodes at CRF + 5 when the joined file is over ~95 MB.
- **check-player always passed for a while**: it compared the whole `#time` label ("0:00 / 1:21") with "0:00", which never matches, so
  "playback advanced" was always true. Fix: compare only the current position, and wait up to 8 s for it to move (software-WebGL pages draw slowly).
- **Agents hitting rate limits mid-run.** Fix: resume the same agent with its context instead of restarting from scratch; restarting
  throws away finished stills and review rounds.

## Embedded pieces
- **Embed CSS hid the picture**: `html.embed .player { display: none }` also hid the canvas, which sits inside `.player`. Fix: hide `.bar`,
  `.chapters`, `.set`, `.big`, `.notes` and make `.player` / `.stage` fill the frame (`EMBED.md`).
- **Long footnotes collided with captions in the tall (4:5) layout.** Fix: a shorter footnote for the tall layout; check both layouts' stills.
- **PNG posters were 1–3 MB each** (~20 MB for the page). Fix: JPEG posters, ~100–350 KB.

## Review findings that keep coming back
- Research or a prototype presented as shipped → say what it is (연구, 프로토타입, 검증 중).
- "재현" (reproduction) implying a real capture when the scene is drawn → label it `개념도` / `예시`, or say "그림으로 재구성".
- Example numbers without a label → `* 수치는 예시`, or take the number from the source.
- Mechanism details that are not in the source (a protocol step, a data structure, a timing) → remove them or mark them as one typical
  implementation. On a résumé, every number and claim must come from the résumé text.
