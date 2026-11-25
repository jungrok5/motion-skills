# Lessons

Problem -> cause -> fix, from the sources and from building the example.

## From the sources (blueprint, Nyxera0x's article; @hx831126's post)

- **An AI render is a picture of a house that does not exist; ask for one wall to move and you get another house.**
  -> Build the house as code, part by part, so a change is a change.
- **The sketch was not square** (14 m drawn 745 px wide, 670 px tall). -> Trust the dimension labels, build the true
  size, map the sheet by the labels.
- **Automatic door detection put doors across rooms.** -> Read openings by hand on a metre grid.
- **AgX turned a sunset beige.** -> Khronos PBR Neutral keeps the orange.
- **Three posts stood in the middle of the view from the tatami room.** -> Take them out; one beam spans.
- **Tie beams poked 5 cm through the roof and showed as dots from above; cliff rocks showed through a pool floor.**
  -> Look for things poking through on every still; lower or cut them.
- **Blue hour read gloomy.** -> A `--look` switch; render both from the same camera; pick the light last.
- **The first cut walked into a room facing the back wall: half a second of plaster.** -> Turn round in the opening
  and back into the room.
- **Out of GPU memory with motion blur**: 30 of 32 million polygons were 9 scanned conifers; bevel modifiers made every
  flying part a deforming mesh. -> Decimate heavy scans for the film; bake bevels (here: cut into the mesh, no
  modifiers).
- **The music's swell came at 14.0 s, the wave at 13.4 s.** -> Find the swell and offset the track (start it 0.65 s
  in), or compose to the film's clock.
- **(post)** Measure the track's tempo and land the parts on its downbeats; place every landing sound on its frame;
  lock the mix at -14 LUFS; check adjacent-frame differences for stutter.

## From the Jeju stone house

- **Stones read as round pebbles.** Subdivision-2 icospheres with light noise are balls. -> Subdivision 1, stronger
  noise, flat wall faces (`rock(..., face=0.36)`), height x1.2 so courses overlap.
- **Orange stripes between the stone courses.** The face cut plus the flat-bottom cut shortened each stone, and the
  lit room showed through the joints. -> No flat-bottom cut on faced stones; a mud core in every wall (a part, like
  the real thing).
- **Board grain showed big rings.** -> Straight bands along the member's long axis (`wood(axis=…)`).
- **Rafters stuck out of the rounded thatch at the hip ends.** -> Place a rafter only where the thatch covers it by
  0.3 m, and stop it where the cover drops under 0.22 m.
- **The opening frame showed half the sheet.** The fit height was halved twice. -> `H0 = width / 36 mm x lens`.
- **The check found 126 parts landing before what held them up**: post stones before their plinth, wall boards
  before their lintels and sills, cups before the table, field-wall stones course 3 before course 1 (stages ordered
  by angle), the outer house's plinth after its first wall stones (overlapping stage windows), thresholds filed under
  floors while the walls stood on them. -> Bottom-up order by default (2 cm height buckets, then a sweep), thresholds
  in the frame, a stage that rests on another starts after it. Down to 0.
- **The dive clipped the outer house's roof end; the way in ran 0.4 m beside the post between two bays.** -> Clearance
  rays every other frame after the wave; in over the gate along the path, through the middle of a bay.
- **Mid-turn the camera faced a plain partition.** -> Turn through the most furnished direction (the chest, the
  table), not the nearest wall.
- **A row of columnar cedars stood in the camera's path; the windbreaks curtained the hero view.** -> Site trees well
  clear of the route and behind the subject's silhouette, not over it.
- **True peak -0.42 dBTP after normalising to -14 LUFS.** Normalising after the limiter pushed inter-sample peaks
  back over. -> Lower the limiter's ceiling until both hold (-14.00 LUFS, -1.05 dBTP).
