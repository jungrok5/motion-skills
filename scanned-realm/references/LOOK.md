# LOOK — what makes the picture, and where it stops

## The ingredients (keep all of them; a realm that drops one stops looking like this)
1. **A computed sky.** Sun and moon positions from the hour, the season and a latitude; Rayleigh + Mie + ozone single
   scattering into a sky-view table; clouds as a lit noise shell that throws the same shadow on the land that you see
   overhead; stars that turn. Never a gradient, never a painted dome.
2. **One light, honestly shadowed.** The sun (or the moon) with cascaded shadows that **harden where a thing meets
   the ground and soften with distance** — the foot of a post is crisp, a crown's shade twelve metres below it is a
   dapple of soft discs (the disc is 1.4° wide, `?pcss=`; a real sun is 0.5°, and reads too hard on a screen). Its colour is what the
   atmosphere lets through at that elevation. Shade is lit by the sky's colour and by what the land throws back, through
   ambient occlusion — so shade is blue by day, deep, and never black. Small things are tied to the ground by contact
   shadows marched through the depth buffer.
3. **Air.** Height fog marched through the shadow cascades: shafts between trunks and roofs, rays toward the sun
   where crowns and roofs cut its light (a walk across the screen to the sun through the depth buffer), a glow toward it,
   distance that fades into the colour of the sky behind it. Thick mist at dawn that burns off by nine, clear air by day, a little gold in the evening, thick air in rain and snow.
   Woods hold damp air of their own and see less sky (a map of crown cover), so a wood is dim, hazy and shot with light.
4. **Materials with relief — photographed where it matters.** The surfaces the place is made of (its paving, wall
   stone, plaster, roof, timber, boards, the earth of its paths, the floor of its woods, rock, bark) are scans at their
   real size — colour, normal, roughness, occlusion, height — re-baked into the same layers the generated ones use, so
   they take the same rain, moss, snow and relief. What a scan does worse stays a baked function (hay, cloth, glass,
   iron, snow). Tints change the colour of a wall, never its nature. The things left about — barrels, crates, tables,
   baskets, pots, tools, the fruit and bread on a stall, stumps, boulders, a tor of bedrock — are scanned objects with
   levels of detail; big ones wear one of the engine's tiling surfaces near the eye, so they keep their grain at arm's
   length (`references/ASSETS.md`).
4b. **Photographed leaves.** The trees are grown from numbers, but what is on their cards is photographs: scanned
   leaves laid along painted twigs (each shading the ones beneath), whole scanned sprays for conifers, scanned fronds
   and docks in the ground cover, scanned bark on the trunks — and scanned ferns, nettles, docks, dandelions and
   flowers standing within a few metres of the eye. Crowns are dark inside and under, lit at the rim; far foliage is
   cut out by a hash, so a crown thins into a lace of leaves instead of closing into blobs.
5. **Wear.** Nothing is one clean colour: paint flakes to bare wood, plaster drops off its brick, dressed stone has
   lost its corners, iron rusts, joints are dark and tight. Moss where it is damp (north faces, tops, creases, the foot of walls), darker at the ground, nothing
   exactly straight (ridge sag, leaning posts, shutters a little askew).
6. **Depth at the openings.** Windows and doors are real recesses with frames; eaves have rafters and a shaded soffit;
   upper floors jetty out on joist ends. Flat fronts are what make a town look like a model.
7. **Ground that breaks up.** Paving → dirt → turf by height-blended masks; grass blades over it in the same colour
   law; flowers in drifts; nothing tiled to the horizon.
8. **Weather as a state of surfaces.** Rain darkens porous things and makes hard things shine, fills the low places
   of paved and earth ground with ringed puddles — but only where the sky is open above (a top-down map of roofs).
   Snow lies on what faces up and is open; walls under eaves stay bare. Trees turn, drop their leaves, keep twigs.
9. **A filmic frame.** Temporal anti-aliasing, bloom from real brightness, an eye that adapts, an AgX display curve with a look (contrast, colour), a
   grade that follows the hour (warm at dusk, blue at night, quieter in rain), cool shade against warm light.
10. **Life.** Things against every wall (a climber, pots by the door, a planter, a barrel), strings of bulbs, smoke, flags, a turning mill, lit windows that differ from each other, fireflies, birds, falling leaves.

## What makes a built place read as natural (from how game towns are made)
Collected from environment artists' write-ups on game villages and towns (links at the end), as a checklist:
1. **Outlines with character.** Buildings are known by silhouette first: varied heights and roof shapes, sagging
   ridges, leaning walls, chimneys, dormers, tile edges that are not ruled. (`gableRoof` ragged edges, `house` lean.)
2. **Traces of use.** Ruts and worn earth where people walk and turn, paving relaid in stretches, things left where
   they were last needed. (`roughen`, worn gaps, `A.dress`.)
3. **Grounding.** Nothing sits on the land like a model on a table: earth climbs the wall foot, weeds and climbers
   grow against it, the ground swells. (aprons, borders, climbers, sky share.)
4. **Repetition broken at every scale.** Colour drifts across a wall and a street; a pattern never runs unbroken for
   long; no two neighbours are the same size or stand at the same angle.
5. **Clusters and rests.** Small things in groups that tell what the place is for, with plain ground between them —
   detail everywhere reads as noise.
6. **Plants that are messy.** Uneven height, clumps, gaps, something different at the edges of ways.
7. **A reason for the view.** Roof lines and trees enclose it; a landmark closes it.
Sources: [The strings of environment design](https://80.lv/articles/the-strings-of-environment-design/) ·
[Medieval village production guide](https://80.lv/articles/medieval-village-production-guide/) ·
[Building a game-ready Nordic village scene](https://80.lv/articles/building-a-game-ready-nordic-village-scene-with-day-night-lighting-setups) ·
[Artcraft: exterior level design (World of Warcraft)](https://www.engadget.com/2014-10-27-latest-artcraft-covers-exterior-level-design.html) ·
[Environmental art style and asset pipelines](https://app.studyraid.com/en/read/100521/4502598/environmental-art-style-and-asset-pipelines).
No game's footage could be watched from here; these are what their makers wrote.

## The numbers that keep it from going flat (measure a still, do not trust the eye)
Reduce a still to 192 × 108 and take its luma and saturation. A clear day in this style reads:
- **mean luma 0.40–0.46**, 5th percentile ≤ 0.22 (there is real shade), 95th ≤ 0.8 (nothing is chalk);
- **the zenith darker than sunlit paving** — if the sky is brighter than the ground it lights, the shade fills and
  the sky goes pale (`LR.sky.skyGain`, `LR.wx.fill`);
- **distance keeps its darks** on a clear day: trees at 100 m are still green, not white — thick air is for dawn,
  rain and snow;
- **grass with dark roots on dark earth**, walls with lost plaster and stains, stone with tight dark joints: wide pale
  joints and even colour are what make a surface look drawn.
A realm that drifts above 0.5 mean luma or below 0.2 saturation has lost the look; `LR.wx.key`, `punch`, `colour`
and `fill` bring it back (`references/KIT.md`).

## The views that show it best
Into the light: a meadow toward a low sun, a wood with the sun behind the trunks, a lane with long shadows across it.
Front-lit noon is the flattest hour of any engine; open the page late in the afternoon.

## Where it stops (say so when showing it)
- Developing without a GPU does not lower the picture (stills are the same shaders on a CPU rasteriser); it slows the
  work and leaves frame rate unmeasured. A GPU machine does not raise it to a film still either: the method sets the ceiling.
- Surfaces, objects, ground plants and the leaves are scans; **the buildings, the land, the trees' wood and the grass
  blades are still generated geometry**. Up close a wall is a photographed surface on a flat plane whose relief is
  parallax (stones stand out of their joints, but the wall's outline stays a straight line). A tree is photographed
  leaves on cards on a generated skeleton: convincing from three metres out, cards at arm's length.
- **No scanned trees and no scanned buildings**: a tree model is one to three million triangles, a building is not in
  the library. No glass or blended materials on scanned objects (a lantern's panes are skipped).
- **Megascans cannot be used here** — free on Fab since late 2026, but its licence forbids serving the raw files from
  a public page and fetching them by script (`references/ASSETS.md`). The scans are Poly Haven's (CC0).
- Not Nanite: levels of detail are three or four simplified copies of a model chosen per copy, not clusters chosen
  per pixel; a thing changes level at a distance where its triangles are about two pixels wide. Not Lumen either
  (below). Not virtual textures: a scanned object's maps are 1k.
- A scan repeats: a 1.5 m patch of paving is laid twenty times across a square. Stains, damp and relaid patches break
  it; a scan with one loud stone still shows.
- Indirect light is the sky, one bounce colour from the land, screen-space occlusion and — on `high` and above —
  one bounce off what is on screen (it cannot see behind the camera or behind things, and outdoors under an open sky
  it is subtle; it tells in lanes, under eaves and by lamplight), and less sky where buildings stand close (read off
  a top-down height map). There is no Lumen-like multi-bounce and no Nanite-like geometry: three.js has neither.
- The page is no longer one file: 41–126 MB of scans arrive while you walk, from `assets/` or from Poly Haven's
  server — the first seconds are the generated place, and things appear in it. Offline, or with `?scan=0`, it stays
  generated: a different, flatter picture.
- Wet paving, puddles and ice mirror what stands over them the same way on `high` and above (lamps and lit windows
  in a square after rain); below that they mirror the sky.
- Water mirrors what is on the screen above it (a ray marched through the depth buffer: trees on the far bank, a
  bridge, a pier) and the sky elsewhere; what is off-screen or hidden behind something is not mirrored, and puddles
  on the ground mirror the sky and the lamps' highlights only.
- Lamps do not cast shadows; interiors do not exist (windows are lit glass).
- No characters. A walker's body, villagers or animals would need a rig, clips and the body checks in CONTRIBUTING.md.
