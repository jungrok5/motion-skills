# LOOK — the form, observed from the source demo

Source: Felix Rieseberg's "Jelly" demo, https://claude.ai/artifact/HGJRkas2J1QTVjctgi5A7V, one of the fifteen demos on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. It was read as reference only. This
skill re-derives the technique and writes all of its own code, text, colours and sounds. Nothing of the demo's code,
shaders, wording, font or sound design is copied.

## What it looked like
- One full-window canvas. Inside it, a glossy slab of red jelly seen from above at roughly 45–50°, standing on a clear
  glass plate (rounded rectangle, thick green-tinted lip, a bright line where the rim catches the light) on a pale gingham
  tablecloth with soft folds and a pool of window light.
- The jelly is a rounded rectangle with a **fluted foot** (scallops all round) and a rounded shoulder up to a flat top.
  It is translucent: you see the cloth through it, darkened and coloured, slightly bent; walls facing away from the light
  glow with light that has crossed the jelly; the rim is brighter than the deep middle.
- The **page is inside the jelly**. One huge editable word, then a row of real controls: flavour dots (radios), a
  temperature range from a snowflake to a drop, and a pill button. Dark ink reads as cream candy letters hanging under the
  top surface, with visible thickness (side walls); coloured parts keep their colour.
- Round fruit pieces are set in the jelly around and under the letters, darker the deeper they lie.
- Reflections come from an imagined kitchen: a paned window, a ceiling light, a lamp. A tiny hot specular.
- Under and around the slab the light that came through it is coloured: a red shadow with a bright, focused fringe and a
  coloured spill on the plate.

## How it behaved
- On load the page lies flat (melted), then the temperature slides down and it sets into the slab with a plop.
- Press and drag on the jelly: a dent follows the pointer, the slab leans and stretches; release and it rings, the top
  wobbles in waves, settling over a couple of seconds. Moving the pointer quickly across it sets it trembling.
- Click the word and type: each keystroke makes a little jiggle where the letter is. Controls still work (with a gentle
  prod on press).
- Flavour: the jelly's colour, the fruit and the tablecloth all change together, easing over a fraction of a second.
- Temperature: colder is stiffer and faster; warmer is slower and looser; at the top it melts into a flat page seen from
  straight above.
- "Drop it": the slab lifts, falls, lands with a fat squash and a lurch, a little camera shake, then wobbles out.
- The view leans slightly toward the pointer, which shows that the letters are inside, not on, the jelly.
- Sound (off until asked): synthesised squelches, plops, a landing thud.

## Technique (re-derived here)
- A **height field** for the moulded shape (outline signed distance + flutes + shoulder profile) on the CPU, uploaded as a
  float texture with blurred mips (for soft shadows).
- A **displacement field** on a coarse grid, stepped on the CPU at a fixed rate: springs to rest, wave coupling between
  neighbours, a volume coupling, plus a few whole-body modes (sway, twist, squash, rock) that ring like damped springs.
  The foot is stuck: displacement grows with height.
- A **mesh** over the area, lifted to the mould height and displaced in the vertex shader; one fragment pass shades it:
  refraction (Snell), Beer–Lambert absorption for the colour, candy letters found by stepping down the refracted ray
  through the page layer, balls set inside (ray–sphere), room reflection with Fresnel, a wet line at the foot.
- A **full-screen pass** for the table: cloth, glass plate, and the key light marched through the blurred height field
  to colour the shadow.
- **Hit testing**: the pointer ray is marched against the same displaced surface on the CPU, refracted the same way and
  turned into a page pixel; the page element is placed with that warp's local affine under the pointer.
- The page is uploaded only when it paints.

## What this skill changes on purpose
- The page, the controls, the flavours, the mould (rect / oval, tiers, flutes), the cloth (gingham, stripes, dots, linen,
  wood), the plate (glass or china), the room, the bits (fruit, bubbles, sprinkles) and the sound voice are designed per
  topic.
- The ground is drawn once into a framebuffer and read back by the jelly, and nothing is drawn while nothing moves, so the
  page is cheap at rest and runs in software GL for checks.
- `#still=<s>&act=…` gives deterministic stills of any state (pull, release, drop, poke, melt, set, flavour).
