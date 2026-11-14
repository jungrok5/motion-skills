# SOURCE — what this skill was made from

**The post:** Kevin Ngo (@kevin_t_ngo) on X, 2026-11-13 —
https://x.com/kevin_t_ngo/status/2121303379196662115?a=kjK3494e60EqYhancfQ&s=19 — "Here's my prompt for this drawing",
quoting his earlier post "JavaScript drawing by Claude" (https://x.com/kevin_t_ngo/status/2120722200001122321), which shows
the result in three tall crops.

## The prompt, beat by beat (paraphrased; the post has the full text)

1. Look at a folder of the author's own art "for hands and self-portraits" (mark-making to learn from).
2. "Choose up to 3 to 5 dry art tools (the best combination), or make up your own tools and colors."
3. "It must feel very HUMAN-DRAWN, not digital at all. Not like an SVG."
4. Avoid a headless browser (memory on a laptop); subagents allowed.
5. "One masterpiece artwork, drawn with Javascript only. 16:9. Very detailed."
6. Evoke the emotions of a long personal story (a pitch with no deck, a silent investor writing a check, karaoke, a gold
   room, posting the picture, a famous retweet, a quiet burger on the way home) — "but DO NOT actually have anything
   from this. dont draw ppl".
7. "Use every pixel of the canvas." Aim for a 90s anime (OAV) look and colours, "but not really 90s anime, like something
   original".
8. A second story to add (a childhood birthday, a new game console, hours of play, pizza with a drawing on the lid,
   greasy hands back on the controller): capture the nostalgia, again without any of it in the picture.

## The result (what the crops show)

A sunset sky over a sea town: towering cumulus in cream and peach with blue-violet shadow sides, a sky of salmon, cyan
and cobalt laid in diagonal oil-pastel hatching; hundreds of kites; a dense town of blue roofs with lit yellow windows,
a viaduct, utility poles and wires, a hillside of houses and steps. Every area is hatched; the paper's grain speckles
through the lights; strokes are short, directional, broken colour.

## What this skill takes

- the **method**: feelings in, nothing literal out; one picture that carries them through weather, light and place;
- the **constraint set**: 3–5 dry tools (or invented ones), human-drawn not vector, 16:9, very detailed, every pixel worked;
- the **colour direction**: cel-era anime background colour (saturated mid-tones, coloured shadows, warm light), as a
  default the brief can change;
- the **no-browser rendering**: everything renders in plain Node;
- learning from a folder of references: colour (`scripts/palette.mjs`) and mark-making, never subjects.

## What it does not take

- the picture: the sea town, the kites, the cumulus composition, the viaduct — none of these are in the starter or the
  example, and a brief should not arrive at them unless its own story leads there;
- the author's stories (or any names in them);
- any 90s anime title, character, or frame — "the look and feel", never a copy.
