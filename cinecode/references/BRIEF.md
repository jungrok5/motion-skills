# Topic → brief → card, and the stills rubric

cinecode never re-renders an example. A topic (an idea, a product, a song, a place) becomes a new film through the kit's
own steps; this page is the short map of that path for motion-skills, with the rubric the stills are scored against. The
method itself lives in `quick-mode.md` §1–2 (Quick) and `film-mode.md` (Film); open those for the details.

## 1. What a topic must settle

Write these in the film's `STATE.md` (Quick) or `ROADMAP.md` (Film) before any picture code. A line the user's message
already answers is copied as given and marked `(user)`; the rest are asked (one round) or chosen on the ★ with a reason.

| Line | Asks | Example (`examples/first-sprout/`) |
|---|---|---|
| Idea | the topic in the user's words, then 2–3 interpretations that are not the first film anyone would make (`writing.md` §1, `deal.py deal spark`) | "a seed sprouting" → *one mung bean, one drop of water, one night, told in cut paper* |
| Mode · purpose | Quick or Film (by size, `SKILL.md` First questions) · cinematic or ad | Quick · cinematic |
| Medium · look | what the film is made of, then a direction picked by eye (`looks.md`, `styles/`, `styles.py suggest`) | 2D cut paper (`papercut-collage` family), own palette |
| Format | length, aspect, fps, where it goes | 12 s · 9:16 · 24 fps · Reels / Shorts |
| Curiosity | the question held from the first 2 s, where it turns, when it is paid (`writing.md` §13) | *where does the drop go?* · held under the soil · paid when two leaves open in the light |
| Beats | second by second, one action each, every beat changes something (`craft.md` §0, §3) | 0 drop lands · 3 bean splits, root dives · 6 hook breaks the crust · 9 leaves open |
| Director card | code fit, structure, look, palette with roles, atmosphere per place, light arc, camera deck (`moves.py deal`), motion per kind, tempo and BPM, transitions, music, sound, ending, signature, checks (`quick-mode.md` §2) | see `examples/first-sprout/STATE.md` |
| Music | always the user's choice: a recording picked by ear, their track, code, or none | written in code: D major pentatonic, 80 BPM |
| Words | narration, cards or none; word budget; no dashes, no generated-sounding lines (`writing.md` §6) | none: a wordless film |

## 2. What is designed new for every topic

Subject and its construction (parts, materials, how light falls on it) · places, one atmosphere line each · the look and
palette · the camera deck and the signature move · cues on the music grid · the score or the recording · the sound of each
contact · the ending image. The template's example scenes (`fieldGathers`, `ringSnaps`, `titleHolds`), the starter's test
scene and the presets are scaffolding: deleted before the first stills.

## 3. Stills rubric (score every still before a draft renders)

A still fails on any **no**; fix the scene, render the still again, then move on.

1. **Could it belong to another film?** It shows this story's subject, place and action, never a stand-in shape.
2. **The subject reads at phone size** in 9:16 (or the film's aspect) at first glance.
3. **One lead per moment:** the eye knows where to go; nothing competes with the action of the beat.
4. **The look holds:** the same medium marks every surface (the same paper, line, grain, light logic) in every scene.
5. **Nothing reads as something else:** a crack is not a mouth, a shadow is not a hole, a stain is not an object.
6. **Planes line up:** things that touch (a surface and what lies on it) are drawn in the same depth plane.
7. **Variety by the tempo:** adjacent stills differ in move, size or light; the signature returns, changed.
8. **Bodies (when there are characters):** head, chest, pelvis and feet face one way, joints bend the way they can, both
   directions drawn (`characters.md`, the model sheet `film.html?modelsheet=<name>`). "Did the neck turn or the body?" = fail.
9. **Hook:** frame 0 already moves and leads with the action; no still title, no fade from black.
10. **Words (when there are any):** fit the safe area, read at phone size, keep their diacritics, no dashes.

## 4. Automatic checks

`python3 tools/make.py stills | draft | final` runs them (`qc.py`, `scene_check.py`, `words_check.py`): the hook moves,
each scene's action changes the picture, the arrangement tiles the film, no dash in the words, loudness per scene, the
master at −14 LUFS, the type loads with its glyphs. `film.html` also throws on a broken `ARRANGEMENT` before any render.
