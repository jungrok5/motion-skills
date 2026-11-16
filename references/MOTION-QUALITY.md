# Motion quality — taking the "AI slop" look out

A shared note for every skill in this repo that moves a body: people, animals, creatures, mascots, cloth-rigged
characters, even a prop that is meant to feel alive. Read it when you **add a skill** (its Rules, check script and
cast sheet must carry what is below) and when you **design a new piece** with a skill that has characters.

Source: OhChadol's series on making an award-winning game almost entirely with AI, part 1 "AI slop 게임의 특징 및
해결법" — https://x.com/OhChadol/status/2121831462974685633?a=654j0Ob9NancSh4DsKw&s=19 (read 2026-11-16).
The methods below are that post's, restated for motion graphics; the rules about tools, permission and code-only
skills are this repo's.

## What reads as slop

A piece looks "made carelessly by AI" less because of one big error than because small wrongnesses repeat in every
shot. The usual ones:

- **Floating bodies** — characters that drift, bob without weight, or whose feet do not meet the ground.
- **Feet that slide** — a creature turns on the spot while its paws stay still and skate round.
- **Flat feedback** — a hit, a press, a landing that has no squash, no shake, no follow-through.
- **Limbs moving separately** — arms and legs animated as independent tweens, so no movement gathers force.
- **Dead idles** — a character standing still is a still picture.
- **Over-kind UI / captions** — explaining what the motion should already show.

Assets, motion and visual feedback are the three places it shows; this note is about **motion**, the one code-drawn
skills most often get wrong.

## What to put in instead

1. **Weight.** Big things accelerate slowly and stop late; small things are quick. Pick a mass per character in the
   brief and let it set timing (a tiger 3–4× a person's size takes longer to turn, lands harder, shakes the frame).
2. **Inertia.** Motion carries past its target and settles back (overshoot, follow-through on tails, ears, hair, cloth,
   held objects). Parts lag the root they hang from.
3. **Anticipation and recovery.** Before a big action the body gathers (crouch, wind-up, breath in) and after it the
   body fights its own momentum (brace, plant, regain balance). Both scale with what is swung: a heavy weapon or
   load means a longer charge and a longer recovery than a light one.
4. **Believable behaviour.** The pose says the intent. Same model, different read: a tiger standing loose looks like a
   big dog; the same tiger low, shoulders up, eyes locked on the target reads as a boss. Design the stance and gaze
   per beat in the brief, not just the action.
5. **Alive at rest.** Every idle breathes: rib cage rise and fall, a nostril puff, a tail flick, a weight shift, a blink
   on an irregular beat. Loop it on a period that does not line up with the cut.
6. **Feet that step.** A turn is made of steps — the planted foot stays locked to the ground until it lifts; the body
   rotates over planted feet. No skating, no hovering, no sinking (this is the joint rules in
   `CONTRIBUTING.md` "몸이 물리적으로 가능한지", applied over time).
7. **The whole body together.** Force travels: feet → hips → chest → shoulder → hand. Offset the parts a few frames so
   the chain reads, instead of moving every limb on the same curve.

## Where the motion comes from

The post tried six ways of getting motion; which worked:

| # | Method | Verdict | Why |
|---|---|---|---|
| 1 | Ask the AI to write the motion in code from scratch | **dropped** (as the only source) | limbs move independently; no gathering of force, stiff |
| 2 | Public motion libraries (Mixamo-style clips) | **partly** | quality varies; good clips often do not fit the piece |
| 3 | Generate a video with a video model → extract a skeleton → retarget to your rig | **kept** | good for people after several takes; animals often fail (an animal mocap tool such as MocapAnything helps) |
| 4 | Fit the rig to the video's silhouette frame by frame | **dropped** | costly, hard to match shape per frame |
| 5 | Generate a video → AnyMove (motion pulled from a video model) | **kept** | decent quality |
| 6 | Generate a video → pick key poses → set rig/weights → interpolate between keys | **kept** | most control; the default here |

The working loop: capture the character (a still of your own rig or drawing) → have a video model animate *that*
image doing the beat → remove the background so the motion is easy to read → take the key poses (or the extracted
skeleton) onto your rig → interpolate / retarget → render stills and a clip → compare with the reference → repeat until
it holds up. It is slow on purpose; each pass is judged, not accepted.

For this repo, method 6 is the default because the result stays **code**: key poses become numbers in the rig
(angles, positions, timings) and the skill's own easing does the in-betweens. The generated video is a **reference**,
not an asset.

## Rules for this repo

- **Video / image / voice generation is a reference tool, not a deliverable.** Generated clips live outside the repo
  (the project's scratch folder or a git-ignored `ref/`). Never commit generated MP4s or large media, and never put
  them in `docs/`. What is committed is the result in the skill's own form: key-pose tables, rig numbers, timings,
  and a line in the brief naming the reference (model, prompt, which take).
- **ElevenLabs needs the owner's permission every time.** ElevenLabs (voices, sound, music, image or video
  generation, voice design, agents) spends the owner's credits. Before *any* ElevenLabs call, ask and wait for a yes,
  saying what you will generate, with which model, how many takes and roughly what it costs. One yes covers that
  request only, not the next piece. No answer = no call; carry on with the skill's code path (synthesised score,
  hand-keyed motion). Other paid generators follow the same rule.
- **Code-only skills stay code-only.** `machine-sim`, `swarm-world`, `aesthetics-film`, `photoreal-film`,
  `ink-word-world`, `dragon-realm` (and any skill whose `SKILL.md` says code-only) take no generated or downloaded
  motion data. They still apply every principle above, hand-keyed in code.
- **Licences.** Public motion clips and models follow their own licence (see `references/3D-MODELS.md` for Polyfork);
  check before committing anything derived from them, and credit it.

## What a skill with moving bodies ships

When you add a skill, these go in alongside the body checks in `CONTRIBUTING.md`:

1. **Brief fields** (`references/BRIEF.md`): per character a mass / scale, an idle (what breathes, what flicks), and
   per beat the stance and gaze, the anticipation, the action, the recovery.
2. **Rules** in `SKILL.md`: weight sets timing; every idle breathes; anticipation before and recovery after big
   actions; planted feet do not slide; parts follow through.
3. **Motion section in the cast sheet**: idle loop, a turn on the spot (feet stepping), one big action with its
   wind-up and recovery — rendered both ways (left / right).
4. **Check script**: fails on a planted foot that drifts more than a pixel or two while planted, on a character whose
   idle is frozen (no part moves over its idle loop), and on a big action with no anticipation frames. Report
   numbers, not just pass/fail.
5. **Stills review line**: "Does anything float, skate, or stand dead still? Does the big move gather and land?"
   A yes on the first or a no on the second fails the still.
6. **`references/LESSONS.md`**: what looked like slop, why, and what fixed it — one or two lines each.
