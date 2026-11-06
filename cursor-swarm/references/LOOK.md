# LOOK — what makes it read as "a swarm of cursors building a website (or a deck, a book …)"

From the reference (SOURCE.md) and from making the bakery. Keep these; they are the style.

## The editor (the stage)
- **Dark, quiet, technical.** Near-black `#0b0b11` with a faint dot grid that scrolls with the page, a thin ruler on the top
  and the left with page coordinates, a small tool rail on the right whose icon lights up for what is being done (box,
  text, image, line, grid). None of it competes with the page.
- **The artboards are visible before anything exists.** Dashed outlines with grey labels (`▢ index.html   860 × 406`,
  `▢ 03 · 제안   1280 × 720`, `p. 2–3`). A web page's background is revealed downward as sections are built; a slide or a
  page is dragged out like a frame (selection + size tag) just before its first op. Book spreads get a spine shade.
- **The HUD pill is the narrator.** It starts as a prompt box (the request typed with a caret, then `generating…`), the
  agents burst out of it, it counts `28 agents · 41/58 layers` with a progress bar and a blue `building` chip, then
  `publishing` (amber) and `● live` (green) with the URL. It is where the swarm returns at the end.

## The cursors (the cast)
- **Many, coloured, always moving.** 16–36 classic arrow pointers in 16 bright colours, each with a white outline and a
  soft shadow, so they read on dark and light pages. Idle agents drift a little and ride along when the camera scrolls;
  they never freeze and never pile up at one point.
- **Each does one thing at a time, visibly.** Moving = arrow; typing = I-beam in the agent's colour with a matching caret
  and a name tag (`yeast`, `crust`); carrying a file = the arrow holding a blue file card with a thumbnail and the file
  name. The work goes to the *nearest free* agent, so cursors fan out over the page instead of queueing.
- **Clicks leave marks.** A small `+` and a ring in the agent's colour where it clicked (box corners, text start, chip,
  drop), fading over 1.5 s — the "+" crosses scattered over the reference frames.

## The ops (how things appear)
- **Boxes are dragged, not faded.** Corner click → the selection grows with white handles and a blue tag counting
  `767 × 178` → red guides flash across the whole screen at the snap → the fill fades in → the selection lets go.
- **Text is typed.** Character by character at a rate set by size (headings slower), a thin blue frame around the text
  box while typing. Korean is typed syllable by syllable.
- **Pictures are fetched.** A file card flies in from the screen edge on an arc, drops into a blue placeholder (a flash),
  and the picture resolves from big blocks to sharp (mosaic), or scans down (`scan`).
- **Swarm moments are the set pieces.** `paint`: a picture is cut into tiles, one agent per tile, each hopping cell to
  cell; cells pop in the agent's colour and settle to the picture's colour — the pixel banner of the reference. `cells`:
  the same on a grid of rounded cells with empty slots — the contribution / heat grid. Give each film one or two.
- **Chips pop** one by one with a little overshoot.

## The camera
- **Frames the board being built.** A slide or a spread is shown whole (fit), centred; the camera pans to the next one only
  after the last op on this one ends, so every board is seen finished. Idle cursors ride along as a loose crowd.
- **On a long web page it follows the newest work, only downward**, with a soft lag (two-stage smoothing), looking ahead 0.75 s so the camera is
  there when an agent arrives. A section's work starts after `sync()`, so each section has its own "arrival".
- **The finale zooms out** to everything — the whole page, the grid of slides, the row of spreads — with a drop shadow on the artboard, editor overlays gone, the HUD green.
  Hold it long enough to read the site's shape (2.4 s default).

## Avoid
- A slow one-cursor-at-a-time build (the swarm is the point); long stretches where only one cursor works.
- A light editor (the page should be the brightest thing), or a page as dark as the editor without the artboard shadow.
- Text the camera cannot see while it is typed, cursors pinned to the view edge, pictures that pop without a drop.
- Pixel-perfect copies of the reference site (portfolio, its banner, its sections) — design for the topic.
