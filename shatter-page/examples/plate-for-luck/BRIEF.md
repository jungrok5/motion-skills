# BRIEF — "A plate for luck" (shatter-page worked example)

**Topic (as given):** a save-the-date for a Greek wedding that the guest gets to smash, like the plates at the party.

## The page (what is printed, what works)
- Reader: a wedding guest on a phone or laptop, a few days after the invitation arrived.
- Printed on the plate: "Save the date", the couple's names (editable headline: guests rewrite it as a joke, the fun of
  the source's "retype it as it falls"), the date and town, three RSVP ticks, a name field, the time tape, a count of the
  pieces read as luck ("23 pieces of luck"), and a Mend button worded for the topic ("Glue it in gold").
- Readouts the engine fills: state, clock, count. Wording in the couple's warm, slightly teasing voice.

## Material — porcelain (base `porcelain`)
- Opaque, 7 mm, warm white glaze `#f6f2e8`, unglazed biscuit edge `#e6dccb`, plain back `#eee8db`.
- Crack: few large pieces with a small crushed zone where it lands — rays 5, rings 2, cleave .12, crumble .3.
- Physics: density 2400, bounce .28, friction .5; **breakSpeed 3.0 m/s** so a big piece that lands hard breaks again.
- Sound: pitch .62 (a lower, shorter ring than glass), ring .5, crunch .8, body .6 (the knock of a thick plate on tile).

## Shape and size
- Disc, 30 cm across (a dinner plate), hanging at 1.05 m in front of a whitewashed wall. The page is 680 × 680 CSS px,
  round, with a cobalt dashed rim band drawn in CSS (no images).

## Impact — `drop`
- A click does not throw anything: the plate slips off its place, tips backwards (tip -1.1 rad/s, so it lands face up and the pieces show the print) and falls ~0.9 m; it breaks
  where it hits the floor tiles (about 4 m/s), pieces spray low and outward and the slow motion starts on the landing.
- Later clicks on a resting piece tap it and break it further (smaller pieces, no projectile).

## Room
- Whitewashed plaster `#efe8dc`, terracotta floor tiles `#b8664c` in 30 cm squares with pale grout, skirting `#e7dfcf`.
- Low warm afternoon sun `#ffe2b4` through a two-by-three window; ambient `#cfc4b8`; floor gloss .12 (waxed tiles).

## Mend
- Kintsugi: gold seams `#b8862a` with a light bead `#f6d98a`, pools at the joints. Every mend adds a layer; older ones fade.

## Still review (scored)
- idle: names readable at 1280 and at phone width; the rim band reads as a plate; light falls across the wall. ✔
- fall (landing): the plate meets the tiles, pieces spray low; nothing floats; shadows anchor the pieces. ✔
- rest: a few big pieces and crumbs on the tiles, some showing print, the biscuit edges visible. ✔
- mended: gold seams run where the plate broke; the text stays readable through them. ✔
