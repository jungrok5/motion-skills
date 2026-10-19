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
