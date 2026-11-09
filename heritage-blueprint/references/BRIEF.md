# Topic → brief

Every model starts here. The user gives a topic (an object: "경주 첨성대", "Hwaseong's
Paldalmun", "a Joseon roof bracket set", "Hangzhou's Six Harmonies Pagoda"); you write `BRIEF.md`
in the work folder **before any geometry**. `scripts/new-scene.py` creates it from this outline.

The style is fixed (blueprint paper, orthographic exploded view, callouts, ledger). Everything
in this brief is designed fresh for the object; nothing is copied from the example.

## Outline

```markdown
# <local title> / <ENGLISH TITLE>

## 1. Object and scope
- Exact object, place, period shown (present state? a dated former state?)
- Single structure or part of a group; what is left out (site, landscaping, hidden foundations)
- Language pack: ko | zh   ·   units: metres

## 2. Sources found (ids match evidence.json)
- primary records / survey drawings / repair reports
- photos: which directions you have (N, S, E, W, top, close-ups)
- conflicts already seen (e.g. three different heights) and how you will label them

## 3. Form table (what the photos and drawings show)
| feature | what is seen | source | status |
| overall outline | … | … | photo-estimate |
| tiers / storeys / courses | … | … | reported |
| openings (through / blind) | … | … | … |
| top | … | … | … |
| base | … | … | … |
| joints / how parts stack | … | … | … |
| not visible / unknown | … | — | unknown |

## 4. Parts and the separation story
- Groups that separate, in order (top first, or what explains this structure best), why each is
  a group (a real joint, a construction stage, an inside you want to show)
- What the separated state should teach in one sentence
- Callouts: 4–7, each anchored on a visible face of its part, local label + English

## 5. Shared parameters (@params block)
- every number the model and the corner diagram both use, each traceable to a claim

## 6. Corner diagram (optional)
- what relation it shows (elevation proportions, site spacing, plan rotation) — or "none"

## 7. Acceptance
- photo-match angles for check.mjs --angles (name:yaw:pitch), from the photos you have
- object-specific checks (a hole that must be see-through, a beam that must reach the wall …)
```

## Still review (score each 0–2 before delivery; any 0 is a fix)

| # | question |
|---|---|
| 1 | From the photo's direction, do outline and negative space match (top shape, width relation, tier count, openings)? |
| 2 | Is every visible number on the page labelled with its status (measured / reported / estimated) and free of invented precision? |
| 3 | Does the separated state explain something real (a joint, an inside, a sequence) rather than just spreading parts? |
| 4 | Does every callout dot sit on a visible face of its own part, in both states and after orbiting? |
| 5 | Do callouts avoid the model, each other, the controls and the screen edge at 1920×1080, 390×844 and 320×740? |
| 6 | Are openings real (see-through where the object is see-through, with wall thickness)? |
| 7 | Is it the same style as every other model of this skill (paper, line weights, palette, type sizes, no shadows)? |
| 8 | Are unknowns left unknown or visibly simplified, and listed in the delivery note? |
