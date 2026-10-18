# Lessons (things that went wrong, and the fix)

**Making scenes**
- Agents draw figures badly unless told to check: heads floating above bodies (add a neck, anchor the head to the
  shoulders), instrument strings that stop halfway (draw every string full-span), figures as blobs. Look at stills.
- Unintended hard edges: a gradient that ends in a ruler-straight line, an "effect" box with visible edges. Feather masks.
- Layout collisions only show in one orientation — always check h AND v.
- A citation was missing on one quote — verify every quote has its source line.
- Reviewers flagged their own stale stills as bugs: always re-render stills after a change before judging.

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
