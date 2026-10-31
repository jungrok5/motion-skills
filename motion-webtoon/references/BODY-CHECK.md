# Body check — joints, hands, held things

Adapted from canvas-film `references/BODY-CHECK.md`, with the numeric check and the rules the donut film added.

Figures drawn in code break in ways a viewer feels at once even when they cannot name it: an elbow bending backwards, a
forearm that stretches between frames, a hand hovering beside the handle it "holds", a wrist turned 180°, an arm growing out of
the neck or starting in mid-panel. The owner of the donut film asked for it in so many words — joints must be physically
possible — so every scene with acting figures gets a **body check before anyone is shown it**, separate from the story review:
a numeric pass, then a visual pack reviewed by a fresh agent that knows nothing of the story.

## 1. Numeric: `bone-check.mjs`
```
node <skill>/scripts/bone-check.mjs --scene <id> [--fps 10]
```
Turns `Cast.debugBones` on and reads `Cast.boneLog` for every frame (normal, SD and close-up `reachArm` limbs):
- **bone lengths** per person and limb — one value each; a range means a limb is drawn outside the rig;
- **elbow jumps** — the elbow moving far more than the wrist between frames (the bend flipped sides: the pole changed);
- **wrists past 80°** off the forearm; **elbows inside the torso**;
- the grade's cost per frame.
It must end with "bones OK". It cannot see a hand that LOOKS wrong — that is the next step. `?bones=1` on any scene page draws
the same data over the frame (joints, lengths 3D | on screen, the elbow/knee pole; violations in red) — render a still with it
when a number points at a moment.

## 2. Visual pack: `body-check.py`
```
python3 <skill>/scripts/body-check.py . --scene <id> --around <action times> --dur <DUR> [--every 1]
```
Action times = every beat where a figure does something with its hands or weight (reach, grab, lift, point, wave, lunge, fall,
sit). The pack (`out/body/<id>/`) has full-size stills every 0.2 s around them plus one per second, and 3×2 index sheets.
(The vendored script renders into the pack's own scratch folder; the canvas-film original deleted the scene's `out/still-*`.)

## 3. Checklist (every figure, every still)
1. **Chain intact** — shoulder → elbow → wrist → hand (hip → knee → ankle → foot) connected; nothing starts from the neck,
   chest centre or head. An arm that **enters a panel** starts at the frame edge (shoulder off-panel), never in mid-panel.
2. **Bend direction** — elbows bend forward/inward only, knees forward; a straight limb is straight because the pose is, not
   because the target was out of reach (an unreachable target gives a stiff stick).
3. **Range** — the wrist turns ≤ ~80° from the forearm; nothing rotates 180° to make a pose work. A palm-to-camera hand reused
   for a grab from above reads as a 180° wrist: grabs from above show the back of the hand.
4. **Hands** — thumb on the right side (midline side for a palm facing the camera, outer side for the back of the hand; left
   hand = mirror of right); finger poses read as intended at phone size ('point' must not read as a rude finger).
5. **Contact** — a held thing touches the hand at the grip and moves with it, in the same hand from panel to panel (the donut
   film's mug); hands resting on a desk land on the desk plane; planted feet do not slide.
6. **Layering** — near arm in front of the body, far arm behind; a black sleeve on a black panel keeps a paper outline.
7. **Weight** — reaching or lunging leans the body; the centre of mass stays over the feet when standing.
8. **Continuity** — between consecutive stills nothing teleports (a hand jumping sides, an object switching hands).
9. **Style exceptions** (SD mittens, squash on a pop) are fine when consistent and read as intended — say so.

## 4. Reviewer prompt (fresh agent, report only)
> You are a character animator / rigger reviewing a motion webtoon's bodies only (not the story, not the style). Read
> `<skill>/references/BODY-CHECK.md`. Pack: `<pack dir>` — open the sheets to find suspect moments, then open the full-size
> `f-<t>.jpg` and crop/zoom (PIL) on hands, elbows, shoulders, knees and held objects — do not judge from the small sheets.
> Numeric report: `<bone-check output>`. For every problem: `[HIGH/MED/LOW] t=<s> <figure> — <what is wrong> → <the fix in
> drawing terms>` (HIGH = physically impossible or reads as broken on a phone; MED = noticeable on a second look; LOW =
> nitpick). Group repeats. Say for each whether it is cast-level (every scene would show it) or scene-level. Finish with
> "bodies OK" or "fix before showing" + the HIGHs. Under ~80 lines. Do not edit files.

## 5. Fix and re-check
Fix every HIGH and repeated MED: cast-level problems in the cast rig / cast file (then re-run `bone-check.mjs` on EVERY scene),
scene-level ones in the scene (a target moved inside reach, a hand pose or `flip` changed, a shoulder moved off-panel, a prop
handed to the right hand). Re-render the pack on the same times, compare, and re-review if anything HIGH was touched. The donut
film went through this once per scene (ep1: sleeping hand, desk arms, raised-arm root, flinch, walk legs; ep2: palm-down lunge
hand, frame-break arms, sleeve halo on black, mug continuity, counter legs).
