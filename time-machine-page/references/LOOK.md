# The look — observed from the source demo

Source: Felix Rieseberg's "Time Machine" demo, https://claude.ai/artifact/VtYey85VQXYqqfURRYqpiq, one of fifteen on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. Observed in headless Chromium with the
feature flag (screenshots at 640×400, the eras stepped with the arrow keys) and by reading the page's markup and styles. Its
code, text, fonts and art are not used here; this skill re-derives the technique.

## Form
- **One document, one story, many years.** A newspaper called "The Ephemeris" follows one comet. The same live DOM
  (masthead, dateline, editable headline, a picture, body text, a facts table, an orbit diagram, an "observer's log" with a
  text field and a button) is shown as it would have been made in each year on the dial: a 1910 broadsheet, a 1948 newsreel
  title card, a 1982 green terminal, a 1986 videotape screen, a 1989 pocket LCD, a 2007 e-paper reader and a 2026 OLED
  page. The text changes with the year (each era tells the story with its own facts and voice); the log keeps what the
  reader typed and stamps each note with the year it was written in.
- **Each era sits in its own world.** Newsprint lies on a dark leather desk under a lamp; the newsreel is on a cinema screen
  with red curtains and rows of heads; the terminal is in a monitor; the videotape on a TV in a room; the LCD in a
  handheld. The page is never shown alone.
- **The dial.** A console along the bottom: a sound button, ‹ ›, a drum of years with the current one large and lit
  (amber numerals, the label under it), the neighbours small and dim, and an "X-ray" button that shows the plain page
  inside ("see the web page inside"). A pill at the top lists the gestures: turn the dial, click the page and type, scroll
  to magnify.

## Technique (as observed)
- The live page is laid out in a `<canvas>` and uploaded to a WebGL texture (both API generations probed). Each era is a
  stylesheet on the same elements (`data-era`) with its own fixed page size, and a fragment shader per era draws the
  texture: letterpress ink with ragged edges and an ink ring, a 45° halftone screen applied only to the picture (the
  picture is tinted so the shader can tell it from type), paper fibres and foxing that resolve as you zoom, a fold;
  film grain renewed at 24 fps, gate weave under a pixel, flicker, dust, hair and scratches, with the screen's light
  spilling into the room; CRT bulge (with a JS inverse so clicks land), phosphor, scanlines and glow.
- **The journey between eras** is a dive: the camera zooms into the page at a focus point until the material fills the
  view (halftone dots, grain, scanlines), crossfades there into the next era's material with a soft flash, hopping through
  any eras in between, then pulls back out into the new era. The dial's drum turns with weight and clicks.
- Scroll magnifies the page toward the pointer, up to deep zoom, and the page stays live.
- Sound is synthesised: dial detents, a grab and release, the dive, and a room tone per era.

## What this skill keeps and what it changes
Kept: one live DOM restyled per era; one shader per era from material treatments; a surround per era; the dive-and-rise
journey through the material; the dial with weight, sound and X-ray; magnify; notes that travel and carry their year.
Changed: everything is new code; the treatments are composable passes with parameters (so a topic designs its eras and
can add a medium); the eras, story, picture, wording, controls and sounds are designed per topic; system fonts only.
