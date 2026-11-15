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
