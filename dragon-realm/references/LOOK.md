# LOOK — what makes this style, and where each part lives

Observed from the reference film (`SOURCE.md`) and from building the example. If a frame does not read as "a game-engine
cinematic of a real place", one of these is missing.

## The picture
1. **Scale is real.** Metres. A body 2–4 m thick and 70–170 m long; spires 60–300 m; a valley you could walk in ten
   minutes. Subjects sit 15–350 m from the lens; lenses are 24–55° tall. Epic comes from true size seen through air,
   not from wide lenses.
2. **Rock is modelled, not textured.** Joints and beds move the vertices (`DR.land.peak`): columns, ledges, buttresses.
   A cone with a rock texture is the first thing that looks wrong. A massif is a cluster: a main mass with lower spires round it.
3. **Air has depth.** Three things at once: thin blue air that takes distance, a mist that lies in the valley
   (`mist`, `mistH`), and wisps and clouds with shape (`haze`, `cloud`). Each row of things is a step paler than the one
   in front. Too much and the picture turns to one colour — the commonest failure; `check.mjs` warns when a shot is flat.
4. **One light, placed like a cinematographer would.** Low (9–33°), to the side or behind the subject; shade is filled
   by the sky's colour, never grey. Blue hour: the moon as key, warm windows as the only warm thing. Storm: almost no key,
   light from a tear in the clouds, lightning. Sunrise: warm key, cool shade, sun shafts.
5. **Water tells the weather.** Still and mirroring at dawn, pocked by rain, torn by the body. The mirror includes the
   clouds; glitter sits under the sun.
6. **Colour is chosen.** A warm/cool pair and one accent per look. In the example: blue-violet night with amber
   windows; slate storm with a white-gold pearl; peach sunrise with a cobalt dragon and crimson maples.
7. **The finish.** HDR all the way, bloom without a hard threshold, shafts from the sun's place, ACES, a grade per
   look (lift, gain, saturation, contrast), a little chromatic split at the edges, vignette, fine grain.

## The creature
8. **A long body is a line through the frame.** Compose with its curve: an S across the picture, a ring round a peak, a
   diagonal out of the water. The rail is drawn before the shot.
9. **It never stops moving, and nothing moves alone.** A swimming wave runs down it; hair and fins trail; whiskers
   lag; the jaw works on the beats; the world answers — rings, spray, leaves, chimes, a kick of the lens.
10. **Scales are geometry of light.** Overlapping, each a little different, a bright rim; they melt into a satin mean
    when they get smaller than a few pixels. The belly is plates. Eyes glow; the mouth is red; teeth are ivory.
11. **A change is an event of light.** The transformation is a bright front running head to tail with sparks, and it
    happens against dark.

## The film
12. **A tableau opens and closes it** — the whole world in one frame, near things framing far things — and the last
    one answers the first with the creature in it. The middle is close: an eye, an eave, a wall of scales.
13. **The weather is the plot.** Calm → omen → storm → opening sky. The look timeline is written with the beat sheet.
14. **Cuts fall on beats; hits get silence before them.** The two biggest moments are preceded by a breath with
    nothing in it (a gap in the score, a held frame).
15. **It loops.** The last seconds fade into the air of the first.
