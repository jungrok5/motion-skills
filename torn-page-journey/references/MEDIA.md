# MEDIA — the media, the feelings they carry, and how to add one

Every medium is an object with the same members (lib/media.js), so the kit and the rider are written once:

| member | what it does |
|---|---|
| `page(ctx, w, h, seed)` | the bare surface: folded paper, a spiral sketchbook, grey charcoal paper, a dark board, woven canvas |
| `col(c, role)` | nominal colour → this medium's colour. `role: 'hero'` keeps more of the traveller's own colour; `'ink'` is the outline |
| `shape(ctx, pts, o)` | a closed area. `o = { fill, line (true/colour/false), lw, smooth, seed, dir, role, a }` |
| `line(ctx, pts, o)` | a stroke. `o = { col, w, seed, role, closed, smooth, a }` |
| `wash(ctx, x, y, w, h, top, bottom, o)` | a large field — what this medium does with a sky |
| `post(ctx, W, H, seed)` | over the whole chapter frame: wax tooth, chalk grain, canvas weave |
| `paper`, `ink`, `light`, `boil` | page colour, outline colour, light direction (world space), how often the rider's marks re-draw |

Shading is in **world space** (light from the upper left), so a rider facing left is still lit from the same side.
Seeds: plates pass a stable seed per shape (the scenery does not crawl); the rider passes part-seed + boil frame, so its
marks re-draw a few times a second (alive, like a hand-drawn film) — `boil` in the medium sets how often.

## The eight media and the feelings they suit

| medium | marks | feelings it carries well | page |
|---|---|---|---|
| `crayon` | waxy broken strokes at a child's slant, outlines in dark brown crayon, a scribbled sky band | joy, play, home, innocence | folded white paper |
| `pencil` | graphite outlines drawn twice, light hatching, shading only on the shadow side; the hero keeps soft colour pencil | curiosity, quiet, a walk, memory | spiral sketchbook |
| `gouache` | flat opaque colour, dry-brush streaks, no hard outlines | bustle, belonging, everyday life, a town | warm paper |
| `woodcut` | colours snapped to 3–5 inks, chiselled black outlines, paper-coloured gouges on the lit side | triumph, resolve, effort, a legend | ochre paper |
| `charcoal` | greys only (the hero keeps a trace of colour), smudge halos, rough strokes, eraser lights | sorrow, struggle, fear, loss | grey paper |
| `watercolour` | three transparent layers, dark wet edges, granulation, blooms in the sky, a broken pen line | relief, hope, gentleness, after rain | white cold-press |
| `oil` | impasto dabs of broken colour following the form | awe, nostalgia, grandeur, sunset | canvas weave |
| `chalk` | broken pastel chalk lines and hatching, dust halos, darks are the board | wonder, dreams, night, the stars | dark board |

A good order moves the eye as well as the heart: put a dark page (charcoal, chalk) between light ones, a flat page
(gouache, crayon) next to a textured one (oil, woodcut). `check.mjs` fails neighbouring chapters that share a medium or
look alike (colour distance < 18).

## Adding a medium for a topic

A topic may want a medium the library lacks (a risograph flyer, embroidery on linen, a stained-glass window, a blueprint,
a folk pattern of its own culture). Write it in the project, not in the skill's lib:

```js
import { MEDIA } from 'tpj/media.js';
import { rng, trace, shade } from 'tpj/core.js';
MEDIA.cyanotype = {
  name: 'cyanotype', paper: '#1f4f8a', ink: '#e8f0f6', light: -2.3, boil: 4,
  page(ctx, w, h) { ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h); },
  col(c, role) { return role === 'ink' ? this.ink : '#cfe0ee'; },
  shape(ctx, pts, o = {}) { /* fill + texture + outline, using o.seed for every random choice */ },
  line(ctx, pts, o = {}) { /* … */ },
  wash(ctx, x, y, w, h, top, bottom, o) { /* the sky */ },
  post(ctx, W, H, seed) { /* texture over the frame */ },
};
J.chapter({ medium: 'cyanotype', … });
```

Rules for a new medium: deterministic (every random choice from `rng(o.seed)`); the hero stays recognisable (`role:
'hero'`); outlines exist where the medium has them; it reads as ONE medium on every shape (the kit's trees, houses and
the rider all come out in it); look at it on the cast sheet (`castSheet(SPEC, { media: ['cyanotype'] })`) facing both ways.
