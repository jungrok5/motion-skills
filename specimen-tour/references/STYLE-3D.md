# specimen-tour 3D — techniques, API, what each topic designs

## The look, and what makes it
| technique | kit call | what it gives |
|---|---|---|
| ACES tone mapping + bloom (UnrealBloom ~.6 / .55 / .78) on a dark fogged stage | `createStage` | the soft glowing "render" look; emissive bits (filaments, mRNA, membrane edge) bloom |
| soft studio reflections without an HDR file | `studioEnv(renderer)` → `scene.environment` | glossy, wet-looking bodies (clearcoat physical materials) |
| textures painted by the 2D kit | `paintTex(size, (g, s) => SZ.fieldBase/network/dots…)`, `canvasTex(SZ.fiberTex(seed, { size: 1024 }))` | fibrous walls, cytoplasm networks, granular stroma — the same painters as the 2D variant |
| bump from the same canvases | `bumpMap: canvasTex(c, { srgb: false })` | relief that catches the key light when the camera turns |
| cut-open bodies | `bowl(rx, ry, rz, outer, inner, { cut, thick, rimMat, floorMat, floor })` | an organelle sliced level, its inside visible from above; put internal parts on `userData.floorY` |
| organic blobs | `blobGeo(seed, amp)` | vacuoles, droplets, lobes |
| folded membranes, cisternae, cables | `tube(points, r, mat, { flat })` | ER, Golgi, cristae, filaments, mRNA |
| hundreds of small parts in one draw call | `beads([[x, y, z, r] or [x, y, z, sx, sy, sz, rx, ry, rz]], mat, geo?)` | ribosomes, pores (torus), grana discs (cylinder), pumps, vesicles, floating specks |
| a cell / room / box from a polygon | `walls(poly, h, t, mat)` + `plate(poly, y, d, mat)` | walls with rounded ridges, floors and lids; reflect the polygon (`reflectPoly`) for neighbours |
| a camera that orbits each target and flies between them | `tour(shots, { shot, transition, base })` + `aim(camera, c)` | per shot: target, distance, azimuth, elevation, orbit °/s, tilt °/s, push; transitions pull back toward `base.d` in log distance and push in |
| x-ray half | `xrayMaterial()` + `renderXray(stage, cutX, mat)` | the scene re-rendered right of a sweeping cut as fresnel teal on black |
| HUD over the picture | `film({ stage, tour, build, frame, hud })` + `SZ.ui(F)` | frosted panels blur the 3D frame under them (`F.scene` is the WebGL canvas) |

## Shot design
- `az` 0 = camera on +z looking toward −z, 90 = camera on +x. `el` = degrees above the target. `orbit` 7–16 °/s on close-ups,
  ~25 °/s on the opening turn; the turn is what tells the viewer "this is 3D".
- Distances: close-up 2–6 units for parts 1–3 units across; overview ≈ 2× the specimen's width.
- **Every camera must sit in open space.** Approach a part from the side with room (inside the cell looking out at a wall).
- Opening: the closed specimen alone (lid on, neighbours hidden), turning; lid lifts and fades and the neighbours fade in
  over ~0.5 s before the first transition. Closing: x-ray cut sweeps in from the right to the middle, then back out before the loop.

## 새 주제마다 직접 설계할 것 / What every topic must design itself
- The specimen's shape, its parts and where they sit; how each part is cut open; its neighbours or surroundings.
- One colour per part; materials (roughness, clearcoat, emissive) that fit the subject (wet biology vs. metal and plastic).
- The shot order and every camera; the HUD's panels, words and numbers (real figures, examples labelled).
- Opening and closing shots (lid + rotation and x-ray are the reference's; invent your own when they don't fit).

## Knobs
bloom strength / radius / threshold · exposure · fog density · env panel colours · key / rim light colours · orbit speeds ·
transition length · push per shot · bead counts · bump scales · texture sizes (512 soft at 4 units, 1024 for walls).

## Cost
Build ≈ 10–20 s headless (1024 fibre maps dominate). A full 1080×1920 frame with bloom ≈ 13 s on SwiftShader (4 cores); with
`?rs=0.67` (3D layer at 720×1280, HUD at full size) it is ~2.5× faster. On a phone GPU the page plays in real time at full size.
Bake with `RENDER_ARGS='--size 1080x1920 --query rs=0.67' scripts/render-chunked.sh … 7 4`.
