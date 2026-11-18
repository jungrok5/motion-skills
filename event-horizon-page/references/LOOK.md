# LOOK — the form, observed from the source demo

Source: Felix Rieseberg's "Event Horizon" demo, https://claude.ai/artifact/YLk8PESrskZLHiAiyqUZHN (one of the fifteen demos
on https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19). Read as reference only: opened in headless
Chromium with the feature flag, screenshotted idle, after a drag, after Hungry; the script read to understand the technique.
Nothing of its code, text, fonts or sound is used here.

## What it looks like
- **An ordinary page, deliberately plain.** A cool off-white paper, near-black ink, one warm accent. A small brand mark and
  one link in a top bar; a huge two-line grotesque headline (editable); a short paragraph (editable); a text field with a
  dark button to feed it a word; a list of five numbered things to try that tick themselves; a floating control dock at the
  bottom (Gravity switch, Mass slider, Hungry switch, Restore button, Sound switch). The black hole is the only ornament.
- **The hole.** A black shadow ringed by a thin bright photon ring, inside a tilted, thin accretion disk of orange fire:
  bright and streaky on one side (Doppler beaming), the far side of the disk lensed up over the top of the shadow as an
  arc, and a thin secondary arc tucked under it. Streaks of gas sheared along the orbit. A soft warm glow spreads onto the
  paper (bloom).
- **The lens.** Within about three Einstein radii the page is pulled round the hole: lines of text become arcs, words
  close to the hole are stretched along its circumference, a ring of blank paper opens (the Einstein ring), and inside it
  a small mirrored copy of the page around the hole (the secondary image). Outside that radius the page is untouched.
  Over the headline the hole made a single word ("real") tall and squeezed.
- **Rest.** At load the hole sits just right of the headline's first line, clear of the body text; a "Drag me" pill appears
  near it after a few seconds if nobody touched it.

## How it behaves
- **Opening.** The hole sweeps in from the right along a curve, takes one word out of the headline, and hands it back
  before settling at its rest place; any key or pointer stops the opening.
- **Drag.** Pointer over the hole shows a grab cursor; dragging moves it; letting go while moving flings it and it coasts
  to a stop. Everything bends live as it moves.
- **Feed.** Type a word, press Feed: the word appears under the field, then is torn off the page and falls in along a
  spiral, near side first, so the letters pull into strands that glow hot as they thin and vanish at the shadow.
- **Hungry.** Switched on, the hole eats every word and control it touches (the same torn-mesh fall), growing a little;
  Restore spirals all of it back out and the page is whole again. Gravity off fades the lens out and gives everything back.
- **Still a page.** Bent words can be selected, the headline retyped, the checkboxes clicked — on what is drawn, not on the
  layout place.

## Technique (re-derived, then written fresh here)
- Units G = c = M = 1; light orbits obey u'' = 3u² − u (u = 1/r). Tables integrated once on the CPU with RK4: total
  deflection α(b) for impact parameters above √27, and u(b, φ) for finding where a ray crosses the disk plane (three
  crossings: direct image, lensed far side, secondary arc). The page is a plane at distance D behind the hole: a ray seen
  at b reaches it at β = b / cos α − D tan α. The lens fades out between 1.5 and 3 Einstein radii.
- The disk: intensity from a radial profile × Doppler and gravitational shift × sheared gas noise, mapped through a fire
  ramp; the hole's emission drawn small into a buffer whose mip chain is sampled at several levels as bloom, tinting the
  paper and adding light.
- Swallowed words: their rectangle copied out of the page texture into a snapshot texture, covered by a fine mesh; each
  vertex has a start time (near side first, a little jitter by direction) and spirals from where it is *seen* (the outer
  lens image) down to the shadow; the fragment shader thins and heats the ink by how stretched the mesh is.
- Hit testing: on every pointer move the real page is moved so the page point whose light reaches the pointer sits under it
  (the inverse lens); the shader and the click use the same exact table reads, so they agree.
- Sound: Web Audio only — a drone bed, motion air, gulps on a pentatonic scale, a rising give-back.

## What this skill changes
- Three object kinds (black hole, pulsar with star surface and sweeping beams, wormhole showing the page's far side in the
  throat), a configurable five-colour light ramp, disk geometry, spin and beaming per topic.
- Hit testing with the lens's local affine (`S.placeLocal`: rotation, scale and the mirrored inner image), not a translation.
- A spring with mass when dragging (it trails and overshoots), fling with mass-dependent friction and soft walls.
- `feed.leave`: a fed word can stay listed while a copy falls in; `feed.onFeed` lets a topic change the object (a pulsar
  spins up with every song request).
- Frozen time (`#still`), simulated stepping (`run`) and draw-on-change with a GPU fence, for stills and checks.
