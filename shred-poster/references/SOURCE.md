# SOURCE — what was learned from Shred kit, and what is not taken

**Source:** <https://github.com/amirmushichge/shred-kit> — *Shred* by Amir Mušić, shared at
<https://x.com/AmirMushich/status/2121339167800213934?a=knMN6C_A1VHmWGGzS4c&s=19> ("Claude can now act as a motion
designer … a vertical reel with Fable 5.2 and Blender … a free template"). A Blender 5 / Cycles kit: `poster.py` draws
the poster with PIL, `shred.py` builds and renders four shots, `edit.py` cuts and grades them with OpenCV, `sound.py`
designs the sound on public-domain paper recordings; an `AGENTS.md` playbook briefs the user one question at a time.

**Licence:** GPL-3.0 (code), public-domain recordings. This skill contains **none of its code, recordings, pictures or
text**: the engine is new JavaScript on three.js, the sound is synthesised, the posters are new.

## Learned (methods, numbers, judgement)
- The four-shot grammar and its frame counts at 60 fps (hook 30, cascade 112, shredder 123, rebuild 216) and the idea
  that the last frame of the rebuild is the first frame of the hook, with a slow push that never parks.
- Strips: unequal bands (±20 %), crease folds as sums of |d| ridges with the tilt removed, a slow bow, lifted edges,
  the top strips crumpled more; the hook's rip (offset ∝ u^2.2, staggered 10 ms per strip from the top).
- The rebuild plan: neighbours start on opposite sides 80 % of the time; an exponential coast from before the shot;
  landing times bunching up (1 − (1 − x)^1.6); a 3 % overshoot and a damped spring; neighbours shiver; three lifts;
  the key drifting up the poster; a glint after the last click.
- Ribbons: arches |sin|^3 that sag as they settle, meander, limited twist, crimp from the rollers; landing at terminal
  speed with an air cushion and a contact that rolls along the strip; the height-map pile with draped lifts.
- The hero ribbon cut lengthwise from the hero rows; the plain poster on the other ribbons so the accent stays on it.
- The shredder: shafts either side of the paper plane, discs in alternate lanes, the scissor point at √(R² − D²),
  rim speed = paper speed, the feed curve (slide in at 0.42, snatch, 0.75 under load), alternate lanes pushed back and
  forward, the cockle sampled in paper coordinates so it travels with the print; the camera keys of the single move.
- The edit: whips around cuts, the punch tables, the inset (844 × 1500 on white) growing in over 8 frames, the grade
  (black point, S, cool/warm split), glow, vignette, grain off the border; −14 LUFS delivery.
- Paper material settings (rough 0.6, ink 0.44, translucency 0.24, back print 0.16).

## Changed or added here
- **A poster designed per topic** (a layout kit and `draw(P)`) instead of one fixed layout with seven text slots; the
  hero rows, the accent band and the marks are the poster's own.
- three.js in a browser instead of Blender: one HTML page that loops live and renders frame-exact; sub-frame
  accumulation with jitter for blur and antialiasing; a depth-of-field gather; all in one post pass.
- Landing order (`top` / `bottom` / `middle`), floor tint, machine colours, inset ground, grade warmth and sound
  character as per-topic choices.
- Synthesised sound (no recordings), BS.1770 loudness in the page, a cue list from the picture's timings.
- `check.mjs` (poster issues, determinism, seam, landing, loudness) and Korean support (unicode-range font chunks,
  character-level column breaks).
