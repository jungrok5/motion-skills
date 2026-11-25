# Topic → brief

Write the project's `BRIEF.md` (from `templates/BRIEF.md`) before any code. A topic is a place and a trip through it: a
city ("부산 하루 여행"), a neighbourhood walk, a campus tour, a festival ground, a national park, a made-up town for a
story. If you were given only a place, choose the trip: 3–6 stops that a visitor would really string together in one
day, in an order that makes a readable line on the map.

## The form

1. **The trip in one line** — what the film says ("a day in Busan from the hillside village to the bridge at night").
2. **The map**
   - Sheet: `cols` × `panel` (default 4 × [.85, 2] → 3.4 × 4 units, portrait). A wider region may use 5 columns.
   - Projection: centre (lon, lat) and km per unit, so every stop sits ≥ 0.25 inside the sheet edge, the title has a
     quiet corner, and the legend / compass sit in empty space (sea, a plain, a park). Write the stops' map positions.
   - What is printed: coast (and islands), rivers, hills (peaks: position, height 0–1, radius), districts with their
     grid angle and spacing, 3–6 main roads, a railway if it matters, every name (local + romanised), the sea's name.
   - Title block: the place's name in large spaced capitals and a subtitle in the local language.
3. **The leaflet's back** — the cover (name, an emblem drawn from the place, "TRAVEL MAP", one line), the guide (the
   stops with numbers and notes), the reading key, plain panels.
4. **The stops** (in route order). For each:
   - name (local), latin (romanised or English), note (one line ≤ 22 characters in Korean / 40 in English — a fact, a
     year, a length, not an adjective pile);
   - where (lon, lat → map units), and its neighbours: nothing within ~0.45 of another stop;
   - **what the pop-up shows** — the real thing simplified: its silhouette, its two or three colours, the ground it
     stands on (rock, sand, water, a hill), its lights at night; layers if depth helps (skyline behind, beach in front);
   - width `w` (0.35–0.8) and `yaw` — the side it is seen from, which is also where its card faces. Pick it so the camera
     looks across open map (sea, plain) rather than across the desk, and so the next stop's yaw is not a half turn away;
   - label side (right by default; left when the sheet edge or another stop is on the right).
5. **Time** — duration (25–45 s), unfold start, `start` (first arrival, ≈ unfold end + 1.5 s), `hold` (2.2–2.8 s),
   `travel` (1.8–2.4 s), when golden hour, dusk and night arrive (night on the last one or two stops), the closing shot.
6. **Desk** — wood tone, 2–4 props (cup, pencil, glasses, coins) placed off the open sheet.
7. **Sound** — the score's key and tempo, or the music to use instead.

## Review criteria (score each still 1–5; anything under 4 gets fixed)

| # | criterion | look at |
|---|---|---|
| 1 | The leaflet reads as paper: cover legible, folds stack, the unfold never lifts off the desk or tears | the unfold sheet (1–7 s) |
| 2 | The open map reads as a printed travel map of *this* place: coast and hills where they are, names readable and not overlapping, title clear | `?off=pop` still from above |
| 3 | Each pop-up is recognisably its landmark at a glance, in the style (flat gouache, white cut, lit upper-left) | each stop's still |
| 4 | At each stop the pop-up and its label are both whole in frame, the label is readable, nothing important behind the label | stills at arrival + 1 s |
| 5 | The red line visibly leads from one stop to the next; the camera's moves between stops feel like following it | a sheet of one travel |
| 6 | Light: day, golden, night read as times of day; at night the lights are where lights would be and nothing blows out | stills of the last two stops and the closing |
| 7 | The closing shot shows the whole route on the map at night with every pop-up up and lit | the last second |
| 8 | Nothing from the template or the example that this place does not have | everything |

Write the scores and what you changed into the project's `BRIEF.md` ("Review" section).
