# Body check — joints, hands, held things

Figures drawn in code break in ways a viewer feels at once even when they can't name it: an elbow bending backwards, a
forearm that stretches between frames, a hand hovering beside the handle it "holds", a wrist turned 180°, an arm growing
out of the neck. Owners notice this first ("팔이나 손 꺾이는 게 물리적으로 불가능한 게 많다"). So every film with
acting figures gets a **body check before anyone is shown it**, separate from the story/viewer review — a fresh agent
that knows nothing of the story and looks only at bodies.

## 1. Pack
```
python3 <skill>/scripts/body-check.py <film-dir> --scene <id> --around <action times> --dur <DUR>
```
Action times = every beat where a figure does something with its hands or weight (lift, carry, cut, lay down, pull,
turn, fall, catch). The pack has full-size stills every 0.2 s around them plus one per second, and index sheets.

## 2. Checklist (every figure, every still in the pack)
1. **Chain intact** — shoulder → elbow → wrist → hand (hip → knee → ankle → foot) are connected; no gaps, no limb
   starting from the neck, chest centre or head. Upper arm and forearm keep their length (±10 %) from frame to frame.
2. **Bend direction** — elbows bend forward/inward only (never hyperextended past straight, never backwards);
   knees bend forward; a straight limb is straight, not kinked.
3. **Range** — shoulder can't swing an arm through the torso; wrist turns ≤ ~80° from the forearm line; neck turn/tilt
   plausible; nothing rotates 180° to make a pose "work".
4. **Contact** — a hand that holds something touches it at the grip point and moves with it (no hovering, no object
   floating in front of/behind the hand, no hand passing through it). Two-handed grips: both hands on the object, at a
   reachable distance apart. Feet on the ground carry the weight: no sliding while planted, no floating.
5. **Layering** — near arm in front of the body, far arm behind; a carried load sits on/behind the shoulder it rests
   on, not pasted over the face; nothing that should be occluded shows through.
6. **Weight** — lifting/carrying bends the body under the load; the centre of mass stays over the feet when standing;
   pushing/pulling leans into it.
7. **Continuity** — between consecutive stills nothing teleports (a hand jumping to the other side, an object switching
   hands, a limb flipping sides) unless the action shows it.
8. **Style exceptions** are fine when the style really does it (rubber-hose arms, a four-legged animal using its mouth),
   but they must be consistent and read as intended — say so explicitly.

## 3. Reviewer prompt (fresh agent, report only)
> You are a character animator / rigger reviewing a film's bodies only (not the story, not the style). Read
> `<skill>/references/BODY-CHECK.md`. Pack: `<pack dir>` — open the sheets to find suspect moments, then open the
> full-size `f-<t>.jpg` and crop/zoom on hands, elbows, shoulders, knees and held objects (PIL) — don't judge from the
> small sheets. For every problem: `[HIGH/MED/LOW] t=<s> <figure> — <what is wrong> → <the fix in drawing terms>`
> (HIGH = physically impossible or reads as broken on a phone; MED = noticeable on a second look; LOW = nitpick).
> Group repeats ("every saw stroke 3.2–3.6: …"). Finish with a verdict: "bodies OK" or "fix before showing" + the HIGHs.
> Under ~80 lines. Don't edit files.

## 4. Fix and re-check
Fix every HIGH and repeated MED in the scene code (usually: an IK solve with fixed bone lengths and a bend-sign per
limb instead of hand-placed endpoints; draw the hand AT the grip point and derive the arm from it; layer near/far arms
explicitly). Re-run the pack on the same times and confirm.
