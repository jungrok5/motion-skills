# The look — what makes it read as a paper cut-out film

Observed from the source clip (Lemomo, @lemomo_ai: https://x.com/lemomo_ai/status/2119327014041842157 — a 10.8 s, 1920×1080
clip, no sound, made with GPT image generation + cut-out animation): a hedgehog postman in a green cap and satchel rides a red
bicycle along a cobbled street of paper houses at dusk; a hand reaches out of a door to take a letter, a bear's paw out of the
next; the camera trucks right with him in one take; an origami bird settles on the moon; a paper label is pinned top-left at the
end: 「刺猬邮差」 · "PAPER POST · No.5 · 12 FPS". Never recreate that hero, those gags or that street — design new ones.

## The grammar (fixed)

| element | how it looks | in code |
|---|---|---|
| paper | flat matte colour, visible fibres, a thin **white fibrous rim** where a piece was torn, felt in places | `P.piece` (`edge: 'torn' / 'cut' / 'felt'`) |
| layering | every piece stands a few mm off the one behind it → a soft warm shadow down-right; details are pieces glued on pieces | `lift` on pieces, layers and puppets; `opts.light` |
| backdrop | one big dyed / watercolour-washed sheet, gradient top → horizon, creases | `K.backdrop` |
| sky props | the sun hangs on a **thread**, the moon is held up on a **wooden stick**, clouds and stars hang on threads | `K.string`, `K.stick` |
| set | side-on layers: far hills (torn top edge), houses with **scalloped tile roofs**, windows with cream frames, a cobbled road, foreground grass and flowers | `K.hills`, `K.house`, `K.cobbles`, `K.grass` |
| puppet | profile cut-out, big head, simple body block, short limbs pinned at joints, small dot eyes, blush | `Pup.biped` / `Pup.bipedParts` |
| motion | **12 drawings a second**, each held 2 frames; a hair of jitter between steps (hands re-placing the pieces) | `Stage({ step: 12 })`, `jitter` |
| camera | a slow truck along the set, layers moving by depth (multiplane parallax); cuts are rare | shot `cam` keys, layer `z` |
| focus | the foreground (grass, posts) soft; everything else sharp | `F.layer(…, { blur })` at z > 1 |
| light | warm practical light from the upper left, deep vignette, window and lamp glows | stage grade, `g.glow` |
| type | only on a paper label pinned on at the end: title + small spaced subtitle with "No. n · 12 fps" | `K.label` |
| palette | warm pastels (apricot, rose, sage, lilac, powder blue) against a dusk sky; one accent per hero | per topic |

## Designed per topic

The hero and anyone else (silhouette, papers, prop), the errand and its beats, the gag, the set (which place, which houses /
trees / sea / shops / interiors), what hangs on strings, the time of day and how the light changes, the camera path, the label
text, the tune and the effects.

## What breaks the look

- Smooth 24/60 fps motion, or motion with no jitter at all (reads as vector animation).
- Gradients or gloss on puppets; outlines drawn around pieces; pure black anywhere.
- Shadows that flip when a puppet turns (the light belongs to the stage — the rig keeps it).
- Text anywhere but the label; UI-like overlays.
- A set with no depth (everything on one layer) or layers with no shadow between them.
- A sky prop with no visible thread or stick.
