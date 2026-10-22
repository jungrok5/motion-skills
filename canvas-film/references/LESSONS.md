# Lessons (things that went wrong, and the fix)

**Making scenes**
- Agents draw figures badly unless told to check: heads floating above bodies (add a neck, anchor the head to the
  shoulders), instrument strings that stop halfway (draw every string full-span), figures as blobs. Look at stills.
- Unintended hard edges: a gradient that ends in a ruler-straight line, an "effect" box with visible edges. Feather masks.
- Layout collisions only show in one orientation — always check h AND v.
- A citation was missing on one quote — verify every quote has its source line.
- Reviewers flagged their own stale stills as bugs: always re-render stills after a change before judging.
- iPhone Safari (iOS 17.4+) ignores `globalAlpha` for text drawn with a shadow: every faded-out line showed at once,
  piled on top of each other. Chromium and desktop WebKit look fine, so renders never show it. The harness now skips
  fully faded text and bakes partial alpha into the text colours — keep text going through `fillText` (it is patched).

- Per-frame noise/grain that changes every frame (a hand-drawn "boil", hatching re-randomised per frame) reads as a
  crawling shimmer on phones once the camera moves. Seed texture per object, not per frame, or move it with the camera.
- Colour reads differently than intended: a Big Bang drawn warm read as "red"/violent to viewers; a molten young Earth read
  as a second sun. Show the maintainer stills of the key moment and ask what people will think it is.
- Shadowed text was the costliest thing in a frame (CPU blur per glyph: 10–25 ms at 1080×1920, more than the drawing in
  a simple scene). The harness now draws a shadowed caption once into a cached bitmap and blits it with alpha (≈ 1 ms);
  a camera-scaled transform still draws live. Profile a scene by wrapping the kit's functions with timers before
  optimising anything else — the slow part is rarely where you guess.
- A paper/grain texture fixed to the screen under a moving camera (a push-in, a shake) slides over the picture and
  crawls on phones. Lock it to the camera (the charcoal kit's tooth now follows `C.cam`); soft layers that are blurred
  anyway (cast shadows, glows) can be painted at quarter resolution (`C.layer(…, { q: true })`).
- WebGL scenes render slowly where there is no GPU (software GL: minutes per scene-second); render them at reduced
  internal resolution with adaptive downscale and budget the time.

**Looking like a film, not a presentation** (feedback after release)
- Viewers notice when one scene drops out of the film's language: numbered items (01/07), grids, bar charts, map
  leader-line labels, hex-tile "game" islands and a marimba/kalimba bed all read as an explainer or a slide deck. Keep
  every scene in film language — light, depth, one continuous camera, captions like subtitles — and score it like a film.
- Cheap-looking effects: a flat full-screen white flash, and a "fireball" of overlapping additive sprites. Instead do what a
  lens does: an exposure bloom from the light's position with falloff, lens ghosts, an anamorphic streak (not reflected in
  water), a layered corona and slowly turning rays.
- Pace for reading, not for the beat grid: give each text beat ≥ 8 s when there is a verse to read plus a drawing to watch;
  when restyling a scene, re-time it — don't inherit a grid designed for a different style.
- When restyling, keep every on-screen source string (they are the translation keys): change the look and timing freely
  and every language keeps working.
- A restyle is not automatically better: after viewers compared, two of seven restyled scenes went back to the originals
  (a woodcut with buildings beat one with faces; a paper-cut lightbox beat a Hopper room). Keep the old scene file and its
  sound so a scene can be restored in minutes, and show the maintainer both before replacing a scene people liked.

**Pre-release review** (a full review found ~30 issues no single-scene check had caught)
- Before a release, render contact sheets of every scene × both orientations × three languages (the source, a long
  Latin one, and an RTL one) and have reviewers look at all of them, then render each suspect moment at full size.
- Recurring bugs it found: two lines cross-fading in the same spot (one fades in before the other is gone — offset the
  windows); a label still on screen while the camera zooms it off the frame (fade it first); a translation that wraps to
  two lines pushing into the window/banner/citation below (lay out from the translated line count, not the source's);
  subtitles over text in the picture (move them, or time them, onto calm ground); see-through figures (fill the
  silhouette opaque before textured washes); things cut by a mask meant for something else (a room drawn with the window
  cut out also hid the fire passing in front of it — draw foreground layers outside that clip).
- When a subtitle must dodge the picture, move it rather than cut its time: ≥ 4 s per line, or viewers miss it.

**Sound**
- ElevenLabs queue cap ≈ 64 concurrent generations; 429 → batch smaller. Never retry a generation call.

**Rendering & player**
- `file://` pages can't `fetch()` — load language files with XHR and launch Chromium with `--allow-file-access-from-files`.
- Live playback: audio is the master clock; seek the scene to `audio.currentTime` every animation frame; if a browser can't
  decode the audio, fall back to a free clock (headless Chromium has no AAC).
- Two iframes: show one, preload the next scene in the other; swap on `ended`.
- Pause sound when the page is hidden (`visibilitychange`, `pagehide`); follow external pauses (lock screen, headset) —
  otherwise the player restarts the audio and sound keeps playing after the browser is closed.
- Media requests must bypass a service worker (Range requests), and the CSP must allow same-origin frames/media/fonts.
- Share: `navigator.share` where available (phones AND desktop OS share sheets), fall back to copying the link with a
  toast; support `#scene` deep links.

- Uploading to YouTube: a 14-min film encoded H.265 with open GOPs and B-frames (x265 defaults) played fine as a file
  and in some renditions, but on other phones every scene start showed a frame from ~3 s later for a moment, then snapped
  back — first only in landscape, then in portrait for another viewer. YouTube re-encodes in chunks cut at keyframes
  (which x265 puts at scene cuts); open-GOP leading frames reference the previous chunk. Fix: upload a closed-GOP,
  fixed-2 s-keyframe, no-B-frame file (`assemble.py --upload`). Also: never mux re-joined scene pictures with the
  assembled film's sound — the assembled sound carries per-scene padding, so the picture drifts (0.2 s by the end).

**Social platforms** (Instagram/YouTube)
- Instagram does not recommend Reels longer than 3 min to non-followers. Cut the film into a series of parts under 3 min
  each (whole scenes, ~3 per part), add a small "title · k/N" badge for the first seconds and an end card naming the next
  part, plus a 60-s teaser (one beat-length clip per scene on one music track). End-card text: one scene name per line —
  "A · B · C" on one line ran off a 1080-px frame.
- Covers: three scenes cut into narrow vertical strips looked empty (a 1/3 crop of a dark scene is mostly sky). Show
  each scene whole as a small framed thumbnail, choose bright moments, and keep the title inside the centre 3:4
  (y 240–1680 of 1080×1920) that the profile grid shows.
- Instagram re-compresses hard: upload H.264 (High, 1080×1920, 30 fps, ~10–14 Mbps, AAC 48 kHz, faststart), and turn on
  "Upload at highest quality" in the app (Android defaults it off). Paper grain and fine texture suffer most.
- Sharing a reel through the app's share sheet sends the caption with the link; "Copy link" sends the link only.
  Instagram links show no preview card in most chat apps — share the site/YouTube link for a card.
- Portrait on YouTube: a 14-min vertical film is a poor fit; upload each scene as a Short instead (`assemble.py v
  --shorts`). This only works because no sound crosses a cut — keep every scene's sound self-contained.
- Thumbnail claims must be literally true ("21 scenes, a different style each" was false: 19 styles).
- YouTube Data API upload: an API project that has not passed Google's audit uploads every video as private and locked
  (the owner cannot make it public) — apply for the audit (same form raises the 10,000-unit daily quota; one upload costs
  ~1,600) or upload by hand meanwhile. OAuth consent in "Testing" expires refresh tokens after 7 days — publish it to
  production. A "TV and limited input" client lets a phone-only owner authorise with a code at google.com/device. Keep
  client id/secret/refresh token in environment variables, never in chat. With a Brand Account channel, pick the channel
  on the consent screen or the video lands on the personal channel.

- Iterating on a finished film: re-encoding the whole 14 min after every one-scene fix cost ~50 min each time (a full
  x264 master, then a full x265 upload copy). Join scene clips by stream copy and cache each scene's upload encode;
  only the changed scene is encoded again. Cut or pad each scene's sound to its picture's exact frame count before
  joining, so nothing drifts. Each language still has to be rendered in full (text is in almost every shot).
**Rendering speed** (a 14-min, 21-scene film; 4-core cloud CPU, no GPU; measured, not guessed)
- Find out where the minutes go first: per-scene wall time from the render log. Half of one orientation was two
  items — a WebGL scene run through SwiftShader (0.6 s a frame, 13 of 75 min) and a second full encode hidden after
  the last scene (the log made it look like that scene took 21 min). Everything else was 2–4 min a scene.
- In most scenes the page screenshot (~75–90 ms) cost more than drawing the frame (2–40 ms). Read the scene canvas in
  the same task as the draw instead (pixel-identical on 42 frames, WebGL included; ~3x cheaper), and encode straight to
  the upload format so no second encode follows.
- For light scenes the encoder is the floor (x265 fast ≈ 190 ms CPU a frame). x264 faster at CRF 18 ≤ 12 Mbps gives the
  same quality as x265 fast uncapped at half the CPU; a 3.6 Mbps HEVC cap chosen for a 400 MB transfer limit had cost
  the busiest scenes 6 dB. x265 veryfast −17 % CPU for −0.4 dB; superfast/ultrafast −1.8/−3 dB: not worth it.
- A language-independent expensive layer is rendered once per orientation and cached lossless (see SCENE-RULES):
  13 min → ~1.5 min per language for that scene (8x; what remains is PNG decode and the capture). Two traps on the
  way: the decoded <img> drawn straight to the frame resampled differently from the live canvas (±35; draw it into a
  2D canvas first → a few pixels of ±1), and keying the cache on the whole scene file threw the cache away on every
  unrelated edit (let the scene name its key).
- Measured and dropped: raw RGBA frames over HTTP (4x slower than JPEG — 8 MB a frame), JPEG over HTTP (same as the
  CDP path), 3/4/6 workers on 4 cores (same), single-threaded encoder instances (same CPU), Chromium raster flags
  (--disable-gpu, --disable-accelerated-2d-canvas: same speed, same pixels), cached caption bitmaps (text is not what
  these scenes spend time on; profile first). Per-frame cost did not grow over 300 sequential frames (no leak).
- Many languages: run them in parallel on GitHub-hosted runners (ci/render-film.yml) rather than serially on one box —
  wall-clock 11 languages ≈ 1 h instead of ~18 h; a GPU desktop would cut each language to ~10 min (shader ~60x, hardware
  encode 10–20x).
- Long renders in a cloud session: a detached process (`nohup … &`) died when the container restarted while the session
  was idle. Run them as tracked background tasks (one orientation per task, skip scenes already rendered) and resume.

**Rendering on GitHub Actions** (ci/render-film.yml)
- `workflow_dispatch` only works once the workflow file is on the default branch; a copy on a feature branch cannot be
  started from the API or the UI. A YAML flow mapping with `${{ … }}` inside (`with: { path: out/${{ matrix.x }} }`)
  fails to parse and the workflow silently shows "no workflow_dispatch trigger": write `with:` as block mappings.
- The runner checks out git only: the per-scene mixes (wav) are not there. assemble.py falls back to the published
  `site/s/<scene>.m4a`, so commit the published sound (or regenerate it in the job). A short run first (`scenes` input
  = two scenes, one language) finds these in 5 min instead of after an hour.
- Scene fonts: install the same Google Noto *variable* TTFs by name (`scripts/ci-setup.sh`); distro packages ship
  "Noto Sans CJK KR", not "Noto Sans KR", and the scenes' font names would silently fall back.
- A cloud box fills up: per-scene clips and finished films are rebuildable in seconds from `out/upcache/` — delete
  those first, keep upcache and the cached layers.

**Deploying**
- A host can report a deploy "successful" while the domain still serves an older build (e.g. the push only produced a
  preview). After every deploy, fetch a changed file from the live domain and check it.

**Typography & languages**
- A CJK font draws "…" as a centred "⋯" — Latin languages need a Latin face (Noto Serif/Sans), not the Korean one.
- Ship the webfonts each language names (subset to the glyphs used: ~30–350 KB per face), or viewers get their device's
  fallback and the film looks unlike your renders.
- Words with a misleading second meaning (Arabic "United Kingdom" = Britain; "recognition" = confession; Chinese 联合王国
  = UK; Japanese 来臨 = second coming) — native review catches these; fix the site's own translation too.
- Fragments must stand alone (Gen 3:15 "her offspring" needs "between your offspring and her offspring").
- Lines whose subject is God must name God in languages without honorific verbs.
- Verse numbering differs by edition (Micah 5:2 vs 5:1, Ps 137 vs 136, Isa 9:6 vs 9:5) — cite in that edition's numbering.
- Plurals: `Pilot.trn` with CLDR categories (`"{n} años#one": "{n} año"`, Arabic two/few…).
- Japanese kana / Arabic joined letters can't be an illuminated initial — skip the initial for those scripts.
- Lines without spaces (CJK) don't wrap on spaces — add explicit `\n` or wrap per character.

**Phones and previews** (word-log, 2026-10)
- A scene opened directly on a phone showed only a zoomed-in corner ("just black"): the 1080/1920-px canvas, positioned and
  scaled with a CSS transform, widened the layout viewport. The harness now sizes the canvas with CSS width/height.
- The first frame of a scene is black (fade-in): a live preview should open on a poster frame with a big play button.
- Send a live HTML preview first and encode MP4s only for the versions the person picks; drawing the scenes is what takes
  time (25–35 min per new look), encoding a 30-s short is 1–3 min.

**Kits** (word-log, 2026-10)
- Scenes mix style and story; packaging the style (kits/) is what makes the next film fast. Verify a refactor by diffing
  stills (or frame hashes) before/after rendered in the same seek order — ±1 can come from seek order alone.
- Several kits in one film: their templates use different beat names, so each starts with its own placeholder script.
