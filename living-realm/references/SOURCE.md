# SOURCE — what this was made from

The post: <https://x.com/RezAIT00/status/2120498246426706176?a=CUYTAAEWhBIL6PS4ZPk&s=19> — Rez (@RezAIT00), 11 Nov 2026:
"THIS IS NOT A VIDEO MODEL. This is fable 5.2 with blender and unreal. I told fable to create me some game assets but to
really focus on the environment. I went to sleep and woke up to this." A 48-second, 1080p clip of an Unreal Engine
scene built from assets generated through Blender: a forest with sun shafts through the canopy and fern fronds in the
foreground; a wind-combed meadow of fine grass with orange flowers, back-lit; bark in close-up; mossy boulders on a
needle-strewn slope; a gnarled old oak alone in a clearing with forest and blue hills behind. No code, no project
files and no assets were published with it.

The request that came with the link: the same look and quality, but an MMORPG village; day and night, rain and winter
changing; walk round it with the keyboard; fast — with Blender, Rust/WebAssembly or WebGPU, whatever gets there.

## What was taken — the look, read off the frames
- **Light you can see in the air.** Shafts between trunks, a bright haze toward the sun → fog marched through the
  shadow cascades (`lib/75_post.js`, the air pass).
- **Leaves that glow from behind.** → a translucency term for foliage in the lighting pass; leaf and blade cards write
  it into the G-buffer.
- **Density with order.** Fine grass with seed heads and drifts of one flower; ferns where the forest floor is; moss on
  the top of rocks and the north of trunks → cover maps painted per kind, a moss law in the surface shaders.
- **Depth.** Sharp near, soft blue far, a real sky → a computed atmosphere, aerial haze that takes the sky's colour.
- **Material honesty.** Bark that is ridged, stone that is pitted, nothing flat-coloured → every surface a baked
  height + colour + roughness material with normals and cavity occlusion.
- **An engine's frame.** Deferred shading, cascaded soft shadows, ambient occlusion, temporal anti-aliasing, bloom, a
  filmic curve — the things that make a frame read as "engine" rather than "WebGL demo".

## What was not taken
- No asset, texture, mesh or frame of the clip is used. The clip shows no buildings at all: the village, its
  construction, the weather and the walking are this skill's own.
- Unreal Engine and Blender are not used. The reference renders with an offline-grade engine on a desktop GPU; this is
  a browser page that must also run on a phone. It aims at the same *ingredients*, not at parity: see
  `references/LOOK.md` for where it falls short.

## A second reference — 「Larkhollow」
<https://claude.ai/artifact/D8t6NHbpDJXtCovZU6KADP> — by @lucian__03: a farm (a barn, a well, a field, a pond, an
orchard) generated from code in one page, on three.js. It came with the second request: "raise the quality a lot, it
is too flat — and look at this." It runs here too, so it was rendered at the same hours as the village and the two
were measured, not just looked at (192 × 108 pixels, luma and saturation):

| picture | mean luma | saturation | shade (5th percentile) |
|---|---|---|---|
| Larkhollow, 13:00 | 0.42 | 0.36 | 0.23 |
| Larkhollow, 18:24 | 0.41 | 0.46 | 0.14 |
| the village before, 16:00–17:00 | 0.55–0.59 | 0.21–0.26 | 0.20–0.26 |
| the village after, 13:00 | 0.43 | 0.26 | 0.19 |

What that showed: the flatness was tone, not triangles. The sky was brighter than the sunlit ground, so the shade was
filled and the sky pale; the air was thick at every hour, so distance went white; the exposure sat a third too high;
the grass was green to the root on green ground; the walls were clean.

**Taken** (as targets and ideas, written here from scratch): a lower key and more contrast and colour; a sky darker
than a sunlit grey card; clear air by day and thick mist only at dawn; a redder low sun; dark earth under standing
grass and dark roots; walls that have lost plaster; contact shadows; an AgX display transform in place of the ACES
fit (the constants are those of three.js, MIT, which is vendored here).

**Not taken:** its code, shaders, names, layout, farm, animals or game. It is a farm you work; this is a village you
walk through.

## A third reference and a picture of the target
<https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp> — 「Saltline」: a container port at dusk in the rain, generated
from code in one page (three.js); a game. Its title scene was rendered here: a low key, a brown grade, rain, ground
that shines. With it came a picture — the village's own four stills (lane, meadow, wood, night square) pushed to a
film-still finish — as the look wanted. Read as a list, the picture asked for: paving wet enough to mirror lamps and
windows, rays from the sun through crowns, moss and small flowers on the wood's floor, a night sky thick with stars,
more things at the foot of every wall. **Taken:** wet smooth surfaces mirror what stands over them (the reflected ray
through the depth buffer, last frame's picture), shafts toward the sun in the air pass, a denser Milky Way.
**Not reached, and said so:** that picture is not something a browser draws at sixty frames a second from generated
geometry — its foliage, its micro-detail and its light transport are an offline render's. **Not taken:** any code.

## Why not Blender, Rust/WebAssembly or WebGPU
- **Blender** would only run generator code and bake textures; the page does both itself when it loads (materials are
  baked on the GPU in well under a second on a real GPU), so there are no asset files to ship, fetch or keep in step.
- **Rust → WebAssembly** speeds up CPU work. The frame has almost none: culling a few thousand instances and a walker's
  collision are microseconds in JavaScript; everything that moves (wind, rain, snow, smoke, water) is computed in
  shaders. World generation at load is a second or two of typed-array code.
- **WebGPU** would cut draw-call overhead and allow compute shaders. The cost of this frame is filling pixels (foliage
  overdraw, shadows, post), not submitting draws (a few hundred), so it would change little here; WebGL 2 runs on
  every current browser and phone, and it is what could be tested where this was built (no GPU: a CPU rasteriser).
  The renderer is isolated in `lib/70_render.js` / `lib/75_post.js` if a WebGPU backend is wanted later.
