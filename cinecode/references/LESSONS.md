# Lessons

Problem → cause → fix, one or two lines each. The upstream kit encodes most of its lessons as rules and as checks in its
tools (the guard, `make.py`, `qc.py`); the ones that cost time are collected here so the next film does not repeat them.

## From the kit (upstream)

- **A draft that looked like every other generated film** → template scenes, the family's untouched palette and habit
  images (lanterns, neon, floating balloons) slipped in → example scenes are deleted before the first stills, the palette
  needs a reason on the card, habit images need a `Habit image:` line (the guard holds a plan that brings one in silently).
- **The same idea twice** → the agent's first interpretation is everyone's first → the prediction test and the overlap check
  (`brief.py predict`, `brief.py overlap`) and three sparks seeded from real things (`deal.py deal spark`).
- **A page that would not load at all** → JavaScript refuses `-x ** 2` → write `-(x ** 2)` or `x * x` (`templates/quick/HELPERS.md`).
- **A black object in a shader** → `pow(x, y)` with a negative `x` is NaN → `pow(max(x, 0.0), y)`.
- **Logs unreadable on Windows** → PowerShell 5.1 writes UTF-16 with `>` → `2>&1 | Out-File -Encoding utf8 logs/x.log`.
- **The hook failed on Windows** → the Microsoft Store's `python.exe` stub answers with exit 9009 → `hook.cjs` probes and caches
  a real Python and stays out of the way when there is none.
- **Chats that grew until every step was slow** → each step re-reads the whole chat → one call per render step, logs to files,
  small images, a new chat offered after a delivered draft (`SKILL.md` Small context).
- **A narrator nobody chose** → a voice picked by an agent → the user picks every voice and every recording by ear.

## From absorbing it here, and from `examples/first-sprout`

- **The kit's README is Turkish, this collection's are English** → upstream `README.md` kept as `README.tr.md` (and its
  test now reads that name); `README.md` is the short English entry. The 13 MB reel and stills stay upstream; the
  READMEs point their images at `raw.githubusercontent.com/sarpstar/cinecode`.
- **"update cinecode" pulls the folder it sits in** → `git -C KIT pull` updates a motion-skills clone when the skill was
  copied from here → update by copying this folder again, or install upstream directly for the kit's own updates.
- **The coat's crack read as a mouth** → a zigzag seam on a round green shape is a face → a smooth pale split along the belly.
- **The crust floated above the soil** → the soil was drawn in a far plane (z 0.35) and the crust in the subject plane, so
  their surfaces met at different heights → things that touch share one plane.
- **The wet soil read as a bucket** → a deep blot with straight sides → wider than deep, rounded, a soft lower edge, 60 % alpha.
- **The drop was lost at 9:16** → a 3 % drop on a phone screen → the hook's subject drawn at about 8 % of the width.
- **The root broke away from the bean** → the wander noise was not zero at the root's base → subtract its value at the start.
- **Falling coat halves read as new leaves** → the same green as the seed leaves → a darker olive with its own highlight.
- **The kit's Python tools would not run in a restricted sandbox** → the example's stills were rendered with Playwright
  against `film.html`'s contract (`READY`, `captureFrame`, `renderAudio`) instead of `make.py` → in a normal install use
  `python3 tools/make.py stills | draft | final`, which adds the kit's checks.
