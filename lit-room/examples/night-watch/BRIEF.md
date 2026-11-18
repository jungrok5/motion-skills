# BRIEF — Night Watch (a ship's cabin at the chart table)

## The room
- Place, hour, who sits here: the chart table of a small sailing ship ("Albatross"), 02:40, the navigator on the middle
  watch. The ship is quiet; the lantern is low; the sea is black through the porthole.
- Size: [3.4, 2.25, 3.2] m — a low cabin.
- Shell: horizontal planking (`boards`, #6d4a33) above a dark board wainscot (#4b2f1e, 0.95 m), dark planked floor
  (#4f3422), a painted deckhead (#d6cbb4) crossed by three beams.
- Holes and the outside: one porthole in the back wall, right of the table (0.44 m square hole under a brass ring); outside,
  a night sea with the moon low on the left, stars, power 0.06 (no glare).
- Palette: tarred wood browns, brass #c39448, chart cream #e7dcc3, navy for the page, red / green of the running lights.
- Props (new for this topic marked *):
  - chart table (desk, 1.25 × 0.62, thick top), the bridge display (monitor 0.52 m), a dark keyboard
  - *compass in a wooden box (brass bowl, a card painted with a compass rose)
  - *a rolled sea chart tied with a red string, a ruled log sheet
  - an enamel mug (navy), the table lantern (brass, flame), *a hanging lantern on a chain from the beam
  - porthole (brass ring with six bolts), a framed chart with soundings and a dashed rhumb line, painted in code
  - a bunk with a red blanket along the left wall, a crate with *a coil of rope on it, a wooden chair turned away
- Room lamps: table lantern (warm #ffae5c, 0.2, flicker) — switched from the page; deck lantern (0.22, flicker).

## The page on the screen
- What it is: the watch page of the ship, "Albatross · Night watch · 02:40".
- Tabs: Lights / Log / Sea; a "Lantern" switch in the header (data-hic-click).
- First screen: three running lights to drag — PORT (red), STARBOARD (green), MASTHEAD (white). Drag the red one left
  and the green one right, as on a ship, and the cabin turns red on the left, green on the right. The course is the
  editable line: "274° · steady". A readout line with position, wind and barometer in monospace.
- Log: a ruled textarea with three entries in the watchkeeper's voice.
- Sea presets: Calm night (navy: the cabin keeps its lantern warmth), Squall (green-grey: a cold cast),
  Dawn (rose and peach: the whole table blushes).
- Typography: Iowan / Palatino serif for the course and headings, monospace for numbers, system sans for controls.

## Light and view
- look: screenLight 25 (the page is mostly dark: the running lights must reach the table), exposure 1.05, bloom 0.4,
  vignette 0.7, grain 0.025.
- ambient: cool sky #2c3a58, warm ground #1d150f, 0.07.
- camera: home [0.26, 0.2, 2.1] (chart on the left, porthole on the right, table centre), close [0, 0.04, 0.72].

## Review notes
- First stills: the walls used the `wood` kind and showed huge wavy rings → added the `boards` material (rows with gaps).
- The lantern drowned the screen's colour and the chair filled the bottom right → lantern 0.42 → 0.2, chair moved back,
  camera re-framed; the running lights were made larger on the page and screenLight raised to 25.
- The porthole showed a bright blue "day" sky → the shell sky now takes `outside.power`; set to 0.06.
- With the lantern off and the lights apart, the table's left half reads red and the compass side green; Dawn turns the
  table and the wall rose.
