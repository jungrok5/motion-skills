# The reference prompt, how it was made, and the brief template

## Source
Chetaslua (@chetaslua) on X, 2 Nov 2026 — https://x.com/chetaslua/status/2117169796290916732. The first post holds the
80 s video; the second post of the thread holds the prompt and the code
(https://github.com/ChetasLua/moss-keeper, live: https://chetaslua.github.io/moss-keeper/, "The Moss Keeper").

## How the reference was actually produced (read this before promising anything)
The repo's `index.html` is 48 MB: **a finished MP4 embedded as base64**, decoded into a Blob and played by a small custom
player, with film grain drawn live on a canvas. The model's own answer (screenshots in the thread): "My own Python and C++
code painted the backgrounds, inked and coloured the robot, and synthesised the score here in the workspace. The result
was then encoded to video … each robot drawing took about 5–15 seconds to render." The generator code is not published.

So the method is: **paint every frame offline with code, synthesise the score with code, encode to video.** This skill
does the same thing with a deterministic Canvas engine — every frame is `seek(t)`, rendered headless to the MP4 — and it
can also hand over the honest version of "a single self-contained HTML file": `scripts/bundle.mjs` inlines the engine
and the film into one ~120 KB page that paints and plays live (no video inside). Say which one you deliver.

## The original prompt (verbatim)
> Create a 2D anime scene for the web. It must look completely like real Japanese anime, as if it were taken directly
> from a finished theatrical anime film. This is traditional-looking, hand-drawn 2D anime, not a 3D animation, a moving
> illustration, or a stylized web graphic.
>
> Deliver the final result as a single, self-contained HTML file. Use any tools, libraries, references, guides, literally
> anything etc.
>
> Use Studio Ghibli films as the art style reference for the design, line work, painted backgrounds, color, and
> atmosphere. Create an original giant robot as the main character. No people appear in the scene. Use any tools or
> techniques you want, including 3D, as long as the final result looks 100% like hand-drawn 2D anime.
>
> SCENE
> At sunrise, mist hangs over an abandoned forest. A giant robot has knelt here for so long that moss, wildflowers, and
> old trees have grown over its body. A small bird lands on its shoulder as the first ray of sunlight reaches its
> weathered face. Deep inside its chest, a faint light flickers on. The ground trembles and birds burst from the
> treetops. With a deep, creaking groan, the robot slowly rises as soil, vines, and leaves pour from its armor. It lifts
> its head toward a gap in the canopy. The engines ignite, sending a great ring of wind across the forest. The robot
> tears into the golden sky, leaving a curving trail of light and mist as leaves spiral down through the sunbeams.
>
> ANIME QUALITY STANDARD
> Every frame must look as if it was drawn by professional anime animators and painted by master background artists for
> a finished theatrical film.
>
> Robot: A hand-drawn anime mecha that feels heavy, ancient, and full of personality, with cel-colored forms, chipped
> paint, rust, moss, and believable weathering. Keep it on-model from every angle, and let its posture and glowing eyes
> express emotion.
> Line art: Confident, delicate, hand-inked anime line work with subtle variation in thickness and pressure.
> Coloring: Traditional anime cel coloring with clean color areas, simple hard-edged shadows, and a soft, natural palette.
> Backgrounds: Richly detailed, hand-painted anime backgrounds in a gouache style, with visible brushwork, natural color
> variation, layered foliage, and real depth.
> Lighting: Golden sunrise light, colorful shadows, glowing mist, and soft atmosphere that unite the robot and background.
> Animation: Authentic hand-drawn anime timing with real weight, strong key poses, natural holds, and overlapping
> movement in vines, grass, leaves, birds, and falling debris. The robot should rise slowly and feel massive, then launch
> with explosive power.
> Direction: Cinematic anime shots, beautiful composition, thoughtful staging, and pacing that starts quietly, builds
> tension, and ends in a soaring climax.
> IT MUST NOT LOOK LIKE
> - 3D: No plastic materials, CGI shading, visible polygons, game-engine lighting, or computer-perfect perspective.
> - SVG or vector art: No simple geometric shapes, perfect curves, uniform outlines, flat corporate illustration, or basic
>   gradients.
> - Web animation: No sliding layers, constant bobbing, floating parts, smooth software easing, or puppet-like joint
>   rotation.
>
> You are free to change any part of the prompt, if it would result, in better results.
> - AI art: No warped shapes, melted details, flickering, or changing robot designs.
> - Non-anime art: No Western cartoon designs, realistic rendering, soft painterly shading on the robot, or generic
>   digital illustration.
> - Amateur work: No stiff poses, empty backgrounds, repeated trees, muddy colors, clip art, placeholders, or unfinished
>   details.
>
> The result should feel awe-inspiring, nostalgic, and full of wonder, like the moment an old forgotten dream comes back
> to life. Before finishing, inspect random frames as still images. If any frame does not look completely like real 2D
> anime, keep improving it. Do not stop until every frame could pass as a still from a theatrical anime film.

## The brief template (fill it from the user's topic, then build from it)
Keep the prompt's structure — SCENE, QUALITY STANDARD, MUST NOT LOOK LIKE, the self-review loop — and change only the
scene. Write the filled brief into the project as `BRIEF.md` before any code; the shot table (STORY.md) is derived from
its SCENE paragraph, and the review step checks frames against its two lists.

```
TOPIC: <what the user gave>
STYLE: hand-painted Japanese theatrical anime — gouache backgrounds, cel-coloured hand-inked characters, golden light.
       (A studio may be named as a general style reference; never reproduce its characters, designs or scenes.)
HERO: <an original thing that has slept long enough to be overgrown: what it is, its silhouette, 2–3 base colours,
       what grows on it, what lights up when it wakes>
WITNESS: <one small living creature>          NO PEOPLE unless the user asks.

SCENE (one paragraph, present tense, 6–9 beats):
At <time of day>, <atmosphere> over <place>. <Hero> has <slept / stood / knelt> here so long that <growth>. <Witness>
<arrives / lands> as <the first light> reaches <its face / lamp / window>. <Inside it, a light flickers on.> <The ground
trembles; birds burst from the trees.> <It slowly rises / opens / turns> as <soil, vines, leaves> pour from it. <It looks
toward a gap in the canopy / the horizon.> <Its power ignites, a ring of wind across the place.> <It leaves into the sky,
a trail of light and mist; leaves spiral down through the sunbeams.> <The place is quiet; the witness remains.>

QUALITY STANDARD and MUST NOT LOOK LIKE: as in the original prompt (hero → the user's hero instead of "robot").
LENGTH: 40–80 s, 16:9, 1920×1080, 30 fps, with a score (pads, music box, strings, birdsong, groans, wind).
DELIVER: out/<name>.mp4 (with sound) + the live page + (if asked for one file) out/<name>.single.html.
REVIEW: before finishing, render 12 random frames as stills; any frame that fails a line of the standard or hits a line
of the must-not list gets fixed and re-checked.
```

## The review rubric (step 9 of the workflow — score every random still)
| from the prompt | what to look at in a still | usual fix |
|---|---|---|
| backgrounds: gouache, visible brushwork, layered foliage, real depth | crowns made of leaf flecks, not blobs; 3+ depths each with its own haze | `clump`/`canopy` sizes, `P.layer` haze per depth |
| coloring: clean cel areas, hard-edged shadows | the hero's shadow is one flat darker shape, not a gradient | `weather({ shadowPath })`, drop soft fills on the hero |
| line art: delicate, varied pressure | ink 2–3 px with the offset second pass, never uniform black | `P.ink` width by part, ink colour `#33303a` |
| lighting: golden light, colourful shadows, glowing mist | rays from one side, violet/teal shadows, bloom on the sky | `rays`, `glow`, grade split, shadows not grey |
| hero on-model from every angle | the same seed and painter at every scale; close-ups painted, not zoomed | paint a plate per scale; a face-on painter |
| no floating parts | contact shadow + grass over feet/wheels; the witness on a surface | `P.shadow`, a grass plate after the hero, `F.check` |
| no constant bobbing, no smooth software easing | characters on twos (`g.twos()`), holds before the turn, no sine bob on the hero | `onTwos`, key poses + holds, drift instead of bob |
| no empty backgrounds, no repeated trees | every frame has framing, middle and far detail; trunks vary in width/lean | more depths, different seeds per plate |
| no muddy colours | foreground darkest and most saturated, highlights cream | palettes in LOOK.md |
