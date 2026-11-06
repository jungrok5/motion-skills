# BRIEF — from a topic (or a file) to a document the swarm can build

Write `BRIEF.md` in the project before any code. The brief designs **the document** — a website, a slide deck, a book,
a poster — as if it will be published, and then **the build** (what the swarm does, in which order). From a .pptx / .pdf,
import-doc.py pre-fills the document part (references/IMPORT.md); you design the build. `templates/BRIEF.md` is the empty form; `examples/bakery/BRIEF.md`
is a filled one.

## Fixed vs designed per topic
| fixed — the style (do not redesign) | designed for every topic |
|---|---|
| dark editor: rulers, dot grid, board labels `▢ index.html  860 × H`, right tool rail | the document kind (`web` / `slides` / `book` / `poster`), its boards and sizes, sections, blocks, layout |
| HUD pill: typed prompt → `N agents · d/T layers` + progress + `building` → `publishing` → `● live  url` | the prompt line, the URL, the HUD labels' language if you want (`labels:`) |
| cursors: coloured arrows with white outline, I-beam while typing, name tags while typing / dropping | how many agents (16–36) and their names (from the topic) |
| op grammar: drag-select + handles + size tag + red guides · typing with caret · file card → drop → mosaic · swarm paint / fill · chip pops · click marks | every word of copy and its language(s) |
| camera follows the work (scrolls a page, pans board to board; new boards are dragged out as frames), then the zoom-out | palette (5–8 colours), font roles (serif / sans / mono / hand / kr / pixel) |
| synthesised sound from the events | pictures: `defineArt` (≥ 1 drawn for the topic) and which built-ins |
| | the swarm moments: what gets painted (`paint`) or filled (`cells`) |
| | the build order and overlaps |

## The brief template
1. **Topic (as given)** — the user's words, unchanged.
2. **The document** — its kind and boards, who it is for (one line), voice, page colours and font roles, agents (count + names).
   A section table: `# | section | blocks (op) | swarm moment`. 4–8 sections. Every section gets a heading or a clear role.
3. **Pictures designed for this topic** — each `defineArt` with what it shows and where it goes.
4. **Timing** — total length (25–45 s works; the reference is 40 s) and seconds per section.
5. **Review** — the rubric below, scored on stills.

## Finding the document in a topic
First the kind: what the user asked for ("장표" → slides, "책 / 소책자 / 잡지" → book, "포스터 / 전단" → poster);
a topic alone → a website. Then its boards:
- A **deck** (16:9, 1280 × 720 boards, frame 1920 × 1080): cover · problem (big numbers in cards) · idea (bullets + a
  picture) · evidence (a chart → `cells`) · plan (a timeline: `line` + dots + columns) · ask / closing. 5–10 slides.
- A **book** (pages 520 × 720 in spreads, a cover alone): cover (a painted picture + title) · spreads pairing a full-bleed
  picture with a text page, or two text pages · page numbers outside · margins 44. 1 cover + 2–4 spreads.
- A **poster** (one board, e.g. 900 × 1200): one strong picture or pixel title, the facts in a block, a footer.
- A **website** (one tall board, 860 wide, frame 1080 × 1350):
  - a **business / place** (bakery, clinic, café): nav · hero picture · what we do · menu / services as cards · hours or
  schedule (a `cells` grid) · location (`map`) · footer.
  - a **person** (portfolio, artist): nav · banner · about · work as cards with screenshots (`site` art) · skills (chips) ·
  activity (`cells`, like a contribution grid) · contact.
  - an **event** (festival, conference, wedding): hero title in pixels (`paint` + `pixel-text`) · date / place · lineup or
  programme (chips, a timeline of lines + text) · tickets (button) · FAQ.
  - a **product / app**: hero with a device picture · three features (cards with icons drawn in `defineArt`) · a chart
  (`bars` or `cells`) · pricing (cards + buttons) · sign-up.
- Facts must be true; invented names, addresses and prices must be plainly fictional (no real brands or people).

## Review rubric (score full-size stills 1–5; ship at ≥ 4 on every line)
| check | 5 looks like |
|---|---|
| swarm reads | at every moment three or more cursors visibly *doing* something; the swarm moments fill the screen with cursors |
| build grammar | selection + handles + size tag while dragging, red guides at the snap, I-beam + caret + name tag while typing, a file card flying in and resolving |
| the result is good | the zoomed-out document is publishable: aligned columns, one spacing rhythm, a clear hierarchy, nothing overlapping — or, from a file, it matches the file |
| framing | every slide / spread is framed whole while it is built; a long page scrolls with the work |
| topic, not template | every block, word and picture is about this topic; no leftovers from the example or the template |
| legible | body text ≥ 14 px on the page and ≥ 12 px on screen; Korean in the bundled font; check.mjs prints only ok |
| the finale lands | the swarm returns to the pill, it turns green with the URL, the whole page is shown long enough to read its shape |
