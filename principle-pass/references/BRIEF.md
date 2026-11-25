# BRIEF — the template and the rubric

Write `BRIEF.md` in the project before any code. `check.mjs` looks for the headings **Topic**, **Creature**, **Beats**,
**Pass** and **Review**. Copy the block below, fill every line, keep it short.

```markdown
# <Title> — principle pass

## Topic
- The creature and the action, one line: "a grey cat spots a leaf, wiggles and pounces on it".
- Why this action teaches: which principles it shows off (a leap = anticipation, arcs, squash; a stop = follow-through).
- Length: ~4–8 s of action + 1 s rest + ~3 s study.

## Creature
- Body plan: quad | biped; size and mass (sets timing — bigger is slower: `timeFor(s, size)`).
- Proportions (body len / girth, neck, head, tail, limb lengths) and palette (coat, shade, light, belly, dark, tip, eye, nose / beak, feet).
- What follows through: tail (f, z), ears (f, z), flippers / head (f, z).
- Idle: what breathes (period), blink rate, flicks (which part, when).

## Beats (story keys)
What a first pass would key — the poses that tell the story. Both panels play these.
| beat | t0–t1 | story keys (t: pose) | label (≤ 28 chars) | tags (≤ 4, earned) |
|---|---|---|---|---|

## Pass
Per beat, the principles added on top — every one is a key, a spring or a number:
| beat | timing / spacing | anticipation | arcs | follow-through / overlap | squash & stretch | secondary | exaggeration |
|---|---|---|---|---|---|---|---|
- Staging: side view, the action reads in silhouette at every story key; the creature never leaves the panel.
- Feet: the plants table (limb, t0–t1, x) — steps, push-off, landing order, release.
- Study: which points (nose, hips, tail tip, a foot), from when.

## Review
Round log: what the contact sheet / meter said, what was changed.
```

## Rubric — score every round on the contact sheet, the cast sheet and the meter

| # | question | fail when |
|---|---|---|
| 1 | Is the before an honest first pass? | it is a strawman: different story poses, wrong timing, broken body. Same story keys, no pass — that's all |
| 2 | Does the big move gather and land? | no visible anticipation on the sheet; the landing has no squash, no settle |
| 3 | Does anything float, skate, or stand dead still (after)? | any yes |
| 4 | Do tail, ears, flippers lag and settle? | they move with the body as one piece, or wobble for ever |
| 5 | Is the body possible? | a knee, elbow or hock bends the wrong way; a leg stretches; a planted foot slips (cast sheet both ways) |
| 6 | Staging: does the action read in silhouette at each story key? | a pose is muddy (legs hidden behind the body, head inside the shoulder), or the creature crops out |
| 7 | Solid drawing: does it keep its volume? | squash shrinks it, stretch thins it to a stick, the head changes size |
| 8 | Appeal: is it the animal at thumbnail size? | it reads as "a dog-ish thing"; proportions or ears wrong |
| 9 | Exaggeration: is the after pose pushed past the story pose — and believable? | the after looks the same as the before at the keys, or breaks the body |
| 10 | Are labels short and tags earned? | a tag the meter doesn't back (`check.mjs` "tags are earned") |
| 11 | Does the study show the spacing? | dots evenly spaced in the after (no slow in / out); paths with corners |

Stills review line (from `references/MOTION-QUALITY.md`): **"Does anything float, skate, or stand dead still? Does the
big move gather and land?"** A yes on the first or a no on the second fails the still.
