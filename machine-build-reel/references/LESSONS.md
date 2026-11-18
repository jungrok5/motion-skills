# LESSONS — problem → cause → fix

What went wrong while building this skill and its two machines, so the next machine does not repeat it.

## Getting the source
- **X does not serve the post to a plain fetch** → the public API `api.fxtwitter.com/<user>/status/<id>` returned the
  text, the linked repository and the MP4; 1-fps contact sheets with timestamps (`ffmpeg -vf fps=1,drawtext=…,tile`)
  were enough to read the reel's sections. The clip stays in scratch.

## Posing and rendering
- **Every render showed the same pose** → the armature still had an action assigned and Blender re-evaluated it on
  render → the renderer detaches the action before posing by hand (`render.Ctx`).
- **"Couldn't create directory" on save** → a relative output path inside bpy → every render path is made absolute.
- **Freestyle crashed (`linestyle` None) and the drawings were speckled** → a new line set has no line style; a
  white diffuse override is noisy at 4 samples → create the line style; the paper is an emission shader (flat, noiseless).
  Freestyle also needs an OpenGL context: Mesa EGL on a GPU-less machine.
- **A 960×540 frame took ~10 s** (4 cores) → drafts at 640×360 / 8–14 samples, `--step 24` stills first; resumable.

## The feet
- **Swinging toes went 16 cm into the floor** → the foot tipped toe-down and the toes drooped the moment it lifted →
  pitch and droop scale with height above the ground over the toe length (`clear`).
- **Tarsus hit the heel toe and the hub when it leaned back in swing** → the socket cup sat low and wide; toe pins
  were not where the hub was → the cup is higher and narrower, each toe's pin sits between a pair of hub cheeks.

## Hydraulics
- **Barrels through the ceramic covers / into the belly frame** → actuators in the leg plane, all on the same side →
  they sit beside the beam along the pin axis, sides alternating (hip outboard, knee inboard …), further out on a
  ceramic limb (`act_lat`).
- **At full retraction the barrel hit the rod's lug** → the barrel was as long as the shortest pin-to-pin length →
  barrel = shortest length − eyes − 1.4 barrel radii (lug clearance) − 3 %.
- **Two-segment insect legs: knee rods through the cable trays** → side offsets were only applied to 3-segment legs →
  every limb gets them; trays and hoses stop short of the joints.

## Body and moves
- **Thigh covers hit the keel in the deep "probe" crouch** → the hips were bolted level with the keel bottom → the
  hips hang under the keel on girders.
- **A taller carapace hit the first neck plate** (caught by `clash` on the very next run) → it ends before the neck.
- **Whiskers folded into the head on fast moves** → the lag drift was unbounded → a soft limit (tanh to `max_deg`).
- **The anticipation check judged a look-around instead of the kneel** → it picked the largest channel by a rough
  scale → a move names its `main` channel.
- **The hauler's kneel folded the knees to 144°** → trays met at the fold → a shallower kneel (−1.75 m).

## Looks
- **Pins with big hex nuts read as toy-sized** → pins end flush with the cheeks under the flange caps.
- **Covers read as pills** → full-length sleeves between the joints, open down the back for the tendons.

## Sizes
- **The .glb was 4.1 MB** (bevels applied, every frame keyed) → the web copy has no bevels and every 2nd frame
  (1.7 MB); the full one stays in `out/`.

## Arms (supported, not in either example)
- **A test WADER with two arms hung them inside the front legs** → `clash` reported 90 new intersections through the
  walk, `reach` a 2.2 m overreach in a careless key pose → arms need their own space: shoulders outboard of the hips
  or well ahead of the front feet's swing, elbows bulging away from the legs (`knee` sign), `hand.<limb>` offsets
  inside the arm's reach. Run `check` after placing them, before any parts.
