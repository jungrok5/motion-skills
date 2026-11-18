# event-horizon-page

A live web page with a black hole, a pulsar or a wormhole floating over it. The page is real HTML (selectable text, a
retypeable headline, a field, buttons and checkboxes) drawn by WebGL2 through HTML-in-Canvas and bent by gravitational
lensing computed from Schwarzschild light paths. Drag and fling the object, feed it a word (the word tears off the page and
spirals in as glowing strands), let it eat the page with Hungry and give everything back with Restore; bent words stay
clickable. Give it a topic and it designs the page, the object and its light, what feeding means and the sound, and hands
back one self-contained folder.

```bash
node scripts/check.mjs templates/index.html                      # the template (lecture handout, black hole): all checks
node scripts/check.mjs examples/pulsar-tour/index.html           # the worked example (a band's tour page, pulsar)
node scripts/still.mjs examples/pulsar-tour/index.html --out out --at 1.3 --act "move:.6,.55"
node scripts/new-page.mjs ../my-event-horizon                    # start your own (or --from pulsar-tour)
node scripts/check.mjs ../my-event-horizon/index.html
```

Requirements: Node + Playwright Chromium (the scripts turn the feature on with `--enable-blink-features=CanvasDrawElement`).
No network, no npm install. View the pages in Chrome / Edge 157+ or the Claude desktop app; other browsers show the same HTML
as a plain page. `templates/index.html#kind=neutron` and `#kind=wormhole` preview the other objects.

Example: `examples/pulsar-tour/` — Halcyon Static's "Pulsar Season" tour page at night (a fictional band): a neutron star
with a violet accretion ring and two cyan beams sweeping over the dates; every song request spins it up, Hungry eats the
tour.

Source: made from Felix Rieseberg's "Event Horizon" demo https://claude.ai/artifact/YLk8PESrskZLHiAiyqUZHN on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is this repo's own.
Samples page: https://jungrok5.github.io/motion-skills/event-horizon-page/
