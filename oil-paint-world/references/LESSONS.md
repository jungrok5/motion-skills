# LESSONS — what went wrong, why, and the fix

**Rendering**
- A frame took 10 s on the CPU and halving the resolution did not help → it was not pixels at first but the vertex
  shader: every dab ran `makeDab` four times with ~11 texture looks → height and normal baked into one map, noise without
  mipmaps, one noise look reused, `unseen()` first. Then it *was* pixels: five looks at an anisotropic brush sheet and
  five at the wanderer's shadow per fragment → relief from `dFdx` / `dFdy` of one look, one shadow look on the CPU,
  plain filtering there. 10 s → 4.5 s. Measure with `?off=ground`, `?off=trees` … before guessing.
- Drawing the card as one triangle (three vertex runs instead of four) was slower once pixels were the cost → quads by
  default; `?card=tri` stays for machines where it wins.
- The ground's rings go all the way round the eye; three quarters of them are behind it → each level is 64 tiles and
  `follow()` switches off the ones outside the frustum. Still dabs are binned into 20 m chunks for the same reason.
- An early `return` in `makeDab` is nearly free on the CPU renderer → cull and density tests go before any lookup.
- A patch script that fails halfway writes nothing: after an edit that "changed nothing", check the file, not the timing.

**The look**
- Colours came out washed: palettes written as hex were converted to linear by `THREE.Color` → colours are paint; they
  are parsed as the numbers they hold (`rgb()` in world.js), and the renderer's output is linear-sRGB (no conversion).
- An open scene facing the sun went white → sun-in-the-mist adds wherever air is lit; with nothing standing in the light
  it is a veil. `shafts` 0.2–0.35 for open land, 0.8–1 for a wood.
- Sky and far hills had bright stroke edges like cut paper → relief is per thing (`relief: 0.5` for sky, 0.45 for ranges).
- Sky strokes showed in rows near the zenith → the even spiral of directions is nudged at random; cloud strokes are not shrunk.
- Clouds only appeared overhead → the cloud field was projected so that it stretched to nothing at the horizon; the
  projection is gentler now (`dir.xz / (dir.y + 0.45)`).
- Blossom crowns looked like a few big petals → near leaves hit the most-size-on-canvas clamp; more, smaller dabs
  (`dense` 100+, `leaf` 0.2) and a larger clamp. Their inside darks were near black → `crown.dark` is a colour of the tree.
- One ground cover swallowed the land (a mask threshold set too low) → look at the contact sheet before any still: a
  mask is right when its cover is a drift, not a floor.
- Boulders read as black lumps against a low sun → their shade mix was too dark and they were too big; shades stay
  colours (a slate violet), sizes stay under the wanderer's knee unless they are the subject.

- The MP4 of the 20 s example was 71 MB → broken colour, relief and weave are detail in every pixel, which x264 cannot
  throw away: 28 Mb/s at CRF 18, 13 Mb/s at CRF 23. The default is CRF 20; use `--crf 24` or higher for the web, and
  never commit an MP4.
- A shot looking up at a blossom crown cut the walker off at the knees and nothing complained → the check now warns
  when head or feet leave the frame; a shot that is about something else says so (`figure: 'off-screen'`).

**The wanderer**
- The face was hidden from the front: the hair cap came down over it → the cap is tilted back; hats are larger than hair.
- A pale shirt between an open coat read as a long white beard → a longer neck, a narrower collar, and a top that is
  not the lightest thing on the figure.
- The check failed a running pose with the hip 43° behind (limit 40°) → the stance of a run was too long; `duty` 0.3
  and an earlier heel lift. The limit was right; the rig was wrong.
- The check then said a foot was 10 cm above the ground "while standing" → it was the heel coming up before toe-off;
  the audit now only holds a foot to the ground while it is flat.
