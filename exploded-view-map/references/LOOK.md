# LOOK — the form, observed from the source demo

Source: the "Exploded View" demo https://claude.ai/artifact/CBxLSFEFnojedyQW5L458v on Felix Rieseberg's HTML-in-Canvas demo
page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk (shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19).
Observed in headless Chromium with the feature flag and read as reference only. No code, text, data or art was copied.

## What it is
- An ordinary planner page: a square topographic map on the left (pale contour bands every 100 m, a red route with a
  white casing, flag-style waypoint labels with an italic name and a small mono number), and on the right a column of white
  cards: an editable italic title, three big readouts with an elevation profile, a sun slider with a clock and a two-way
  season toggle, and a list of waypoints. A cream sheet with rounded corners on a light grey desk.
- A dark pill button under it ("take it apart"), a line of hint text, nothing else on screen.

## How it behaves
- On load the page lies flat for a moment, then comes apart by itself, slowly enough to watch. First the map's contour
  bands gain thickness and stack into a solid terraced mountain, then gaps open between them from the top down. The camera
  tilts from straight above to a three-quarter view and pulls back to keep everything in the window.
- The cards lift off the sheet, lean back like lecterns with their lower edge as the hinge, seated one above the other so
  none hides another, and turn toward the camera as it orbits.
- The waypoint labels stand up as little flags on stems above the band they belong to. The route becomes one continuous
  ribbon that climbs the steps between bands.
- Drag turns the model, scroll pulls the layers further apart or together, ctrl-scroll zooms, a click on a band lifts it
  and everything above it, Escape or the button puts it back flat with a soft landing.
- Everything stays a working page while apart: the title takes typing, the slider drags, the toggle switches, waypoints
  respond to hover (map flag and list row light up together) and click (the clock winds to when the party gets there,
  and a marker walks the route).
- Hovering names the DOM element under the pointer in a small mono tag (`<path> 2 300 m and up`, `<input type="range">`).
- Light: once apart the desk turns slate blue and the paper is lit by a sun from the slider: low amber sun at the ends of
  the day, high white sun at noon, a moonlit night with warm lamps at the waypoints and a glowing route.
- Sound (synthesised): paper riffle while moving, a soft landing thud, little flicks when the flags pop up, slider ticks.

## Technique (re-derived, see ENGINE.md for this skill's own version)
- Every drawable piece is its own DOM element with its own texture: the sheet, each band (an SVG of its contour fill),
  each card, each pin. Each is drawn as a textured quad in WebGL2, and placed for hit testing with the same camera matrix.
- The bands are cut from one height function with marching squares. A band's side walls are its own alpha-cut texture
  drawn again at small z steps down its thickness, so any outline gets walls without building a mesh.
- A height grid texture says which band covers each point. Shadows march the sun ray up through the band heights above a
  point; ambient occlusion comes from the distance to the next band's edge and the gap above it.
