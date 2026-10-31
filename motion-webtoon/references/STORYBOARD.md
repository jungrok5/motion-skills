# Storyboard, strip and comedy timing

A motion webtoon scene is **one tall strip** that a camera scrolls down, as a reader's thumb would. Nothing cuts: gutters (the
gaps between panels) are time, panels are moments, and the camera's stops and glides are the edit. Numbers marked *(ours)* are
our calibration from the donut film and the survey (`RESEARCH.md` §A, §4) — check them on a phone.

## 1. Board it as a table first
Before code, write one row per panel and get it approved:

| # | panel (size, border) | gutter before | what moves | words (who) | SFX / effect | beat (s) |
|---|---|---|---|---|---|---|
| 1 | meet · 1110 tall · ink border | — | his fist goes up, her hand goes up | 「발표 끝났다!」 (준호) · 「하이파이브!」 (민지, shout) | pop, pop | 0.35, 1.75 |
| 2 | epic · 880 · bleed, black, slanted | action | two arms in from the bottom corners, slow | ✱ 「완벽한 타이밍.」 | impact, slow whoosh, focus wedges, punch zoom | 3.45 |
| 3 | miss · 1000 · ink border | action | SD pair swish past each other, freeze, sweat | 「……」 · ✱ 「빗나갔다.」 | 휙 + speed lines, record scratch | 5.9, 7.0 |

That is the starter (`examples/starter/scenes/script-highfive.js`). The donut film's three boards are in
`examples/donut/BRIEF.md`; its beats and camera stops in `scenes/script-*.js`.

Then answer: what is the ONE accent object? Where does the register switch (normal → fake-epic → SD)? Which panel is the silent
beat? What is the last image?

## 2. Strip, gutters, camera
- **Panels** are ≤ ~1200 px tall at 1080 wide; one moment per screen; 1–2 panels visible at a stop. Panel options (`Webtoon.strip`):
  `border` ink / thin / none / fade / bleed / rough, `cut` (slanted corners), `bg`, `draw` (clipped), `over` (unclipped: panel
  breaks, balloons that cross the border), `cam` (an in-panel Ken Burns or punch).
- **Gutters** (`Webtoon.GAP`): tight 24 · seq 56 · action 160 · beat 320 · scene 640 · cliff 900 px. A gutter can change colour
  (paper → black) to carry a mood: set `STRIP.bg` stops at panel ends (the donut film goes black before the donut appears).
- **Camera**: one stop per panel, `{ panel, hold, glide, align, drift, ease }`. Write the stops in the script as
  `[panel, arrive, leave]` and convert (the starter does it in two lines) so timing lives with the words. The glide is the
  gutter's time: 0.3–0.7 s between panels, ≤ 0.15 s for a snap (`ease: 'out'`), a longer pause in a black gutter for a silent beat.
- **Safe zones**: nothing important in the top 140 px or bottom 300 px when the camera stops (phone UI). A panel can pass through
  them while gliding.

## 3. Words
- Reading time `Webtoon.readTime(s)` = **1.2 s + 0.07 s per character**; a balloon stays at least that long (the kit warns in
  the console when one does not — `debug.mjs` prints it). ≤ 2 balloons in the reading zone, ≤ 2 lines each, breaks at 어절 spaces.
- Balloon kinds: talk (Jua), shout (spiky, Black Han Sans), think (cloud, Nanum Pen Script), whisper (dashed), narr (square box),
  mono (inner voice, no outline), wobble. Place the balloon **above** the speaker with the tail to `G.mouth` — never over a face;
  check every stop's still.
- In the mono finish, narration goes in ✱ caption tags (`Manga.tag`) and the narrator says the same line (SOUND.md).
- Dialogue before the speaker in reading order; the punchline line ≤ 8–10 syllables — often an SFX and a face say it better.

## 4. Comedy timing (개그 연출)
1. **Setup → beat → punchline → aftermath** (4-koma logic on a scroll). Setup calm and detailed; the beat a **silent panel**
   (same framing, only a blink or a sweat drop moves, maybe 「……」) held **0.8–1.4 s** after an emotional-beat gutter;
   the punchline a hard cut (glide ≤ 0.12 s) to a full-width panel — SD switch, focus lines or a flash, SFX pop, zoom punch —
   held **1.5–2 s**; a quick small-gap aftermath.
2. **Contrast sells it**: detailed setup → flat SD punchline; quiet → loud; tiny stakes → epic staging. The donut film's whole
   engine is a trivial office standoff staged as a shōnen battle and narrated like a nature documentary.
3. **The pause before the punch is the timing.** Lengthen the gutter or hold before it; never put a long gap after it.
4. **Escalate in threes** (three offers, three auras, three thought clouds, 가위/바위/보, 하나/둘/셋), then break the pattern.
5. **Register switches are hard cuts** (no morphing): normal ↔ fake-epic (black panels, speed/focus wedges, heavy SFX) ↔ SD
   (1:1.5, mittens, dot eyes). Mark each switch with a sound hit and, in the music, a cue change.
6. **One gag per scene, 20–30 s.** The donut film: discovery (24 s) → standoff (26 s) → twist (24 s), each ending on a hook into
   the next; the last panel shows the aftermath and an end card with a "next episode" line.

## 5. Checklist per scene before the body check
- Stills at every camera stop (`render.mjs v --stills <arrive+0.3 for each stop>`): faces clear of balloons, text in the safe
  zone, the accent visible where the story needs it, values readable in mono (two people distinct).
- `debug.mjs`: no page errors, no reading-time warnings, draw time per frame.
- The board's beats match `SCRIPT.beat` and the sound spec's cue times.
