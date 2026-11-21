# Source — what this skill was made from

X post by 醉清风 (@Xin78787), 20 Nov 2026:
https://x.com/Xin78787/status/2123707571890536673?a=HJt-M-U2a85DG5TpgNk&s=19
— "数学老师说考美术只画一条线，看来是真的。" ("The maths teacher said the art exam is just drawing one line — looks like
it's true."), a 62 s vertical video (720×1172 shown, 2160×3518 source, 50 fps, with music). The post was read through
the public `api.fxtwitter.com` thread API (X refuses a plain fetch); frames were pulled with
`ffmpeg -vf fps=1/2,scale=240:-1,tile=6x2`.

## The video, beat by beat

| time | what happens |
|---|---|
| 0–2 s | A tablet on a desk shows a misty, desaturated photo: a road in fog, telegraph poles on the left, a man in a hat carrying a double bass walking away, his reflection on the wet road. A hand holds a white stylus at the top left. |
| 2–10 s | The camera rides close behind the nib (about 2–3× the page). One black line draws the poles: a top rule with **right-angle steps ending in small loops** (the wires), drops for each pole, cross arms, more steps. It never lifts. |
| 10–16 s | Down the left: the road edge as **wide zigzags**, then the man's reflection as a **tall, narrow zigzag column** whose width follows the reflected body. |
| 16–30 s | Up into the figure: the double bass is outlined with **loops at every corner**, the body and the hat; the line doubles back over itself to get from part to part. |
| 30–40 s | Down the figure's legs into the reflection again, then across the road with long zigzags; the camera sweeps right. |
| 40–50 s | The far shore: a fence as a ruled line with posts, a treeline as **rows of cursive loops**, a church steeple traced up and back down, buildings as stepped outlines. |
| 50–56 s | Top right: another stepped rule, drops with hooks, the frame closing round the picture. |
| 56–60 s | The camera pulls back to the whole tablet; the photo is gone, the drawing sits on white. |
| 60–62 s | A clean scan of the line art on white with wide margins; a small looped signature at the bottom right. |

## What this skill takes — the format

- **One unbroken line** for the whole picture: every subject, every travel between them, the frame — no lifts.
- **The vocabulary of that line**: contours with a small loop at sharp corners; right-angle steps and hooks (wires,
  ledges, rules); wide zigzags for ground and water; tall zigzag columns for reflections; rows of cursive loops for
  foliage and smoke; doubling back over a stretch instead of lifting; long ruled travels that become the frame,
  the horizon or a kerb.
- **The setting of the making**: a faded grey photo on a tablet under the line; a white stylus; the camera close behind
  the nib, leading it slightly, pulling back now and then; a pull back at the end, the photo fading out, a clean page
  with the drawing and a looped signature, a hold.
- **The pace of a hand**: fast down long lines, slow into loops and detail, a pause now and then.

## What it does not take

- The photograph, the man with the double bass, the road, poles, steeple or any of that picture: every piece designs
  its own scene and its own route. The starter is an angler on a jetty, the worked example a noodle stall in rain.
- The artist's hand (only the stylus is drawn) and their signature (the loops are generic; text is the user's own).
- Photographic sources: the grey "photo" is painted in code from the scene's own shapes. A user may bring their own
  photo (`photo:` option) — never a downloaded or generated one committed to the repo.
- The music: the sound is synthesised from the pen (hiss, taps, a few soft piano notes).
