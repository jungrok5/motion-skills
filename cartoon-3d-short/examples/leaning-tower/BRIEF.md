# BRIEF — the Leaning Tower of Pisa

**Topic (as given):** "why the Leaning Tower of Pisa is still standing"
**Title:** The Tower That a War Saved

Worked example of cartoon-3d-short: why the Leaning Tower of Pisa is still standing. 61.9 s, 211 words, 19 shots.

## Facts (each with a source link)
- Construction of the bell tower of Pisa Cathedral began in **1173**; the tower began to sink after construction reached
  the **second floor** (1178), because of a **foundation only ~3 m deep** set in **weak, unstable subsoil** (soft clay
  and sand). — [Wikipedia, "Leaning Tower of Pisa" § Construction](https://en.wikipedia.org/wiki/Leaning_Tower_of_Pisa#Construction)
- Construction then stopped for **almost a century**, because the Republic of Pisa was almost continually at **war with
  Genoa, Lucca and Florence**. This allowed time for the underlying soil to settle; **otherwise the tower would almost
  certainly have toppled.** — [Wikipedia § Construction](https://en.wikipedia.org/wiki/Leaning_Tower_of_Pisa#Construction)
- When work resumed (1272), the engineers built the upper floors **with one side taller than the other** to compensate for
  the tilt, so the tower is actually **curved** ("banana"). — [Wikipedia § Construction](https://en.wikipedia.org/wiki/Leaning_Tower_of_Pisa#Construction)
- The mechanism: soft saturated clay **consolidates** under a slowly applied load — water is squeezed out of the pores
  and the clay gains strength; a quick load fails it. — [Burland, Jamiolkowski & Viggiani, "The Stabilisation of the
  Leaning Tower of Pisa", Soils and Foundations 43(5), 2003](https://doi.org/10.3208/sandf.43.5_63)
- The tower was **closed to the public in January 1990**; from 1993 to 2001 it was stabilised, the final step being
  **soil extraction from under the raised (north) side**; the tilt was reduced by **45 cm**, back to its 1838 position,
  and it was deliberately not straightened. — [Wikipedia § History following construction](https://en.wikipedia.org/wiki/Leaning_Tower_of_Pisa#History_following_construction); [Burland et al. 2003](https://doi.org/10.3208/sandf.43.5_63)
- Steel cables to the third storey and lead counterweights on the north side were used during the works. — [Burland et al. 2003](https://doi.org/10.3208/sandf.43.5_63)

## Analogy
A wet sponge: squeeze fast and it squishes; squeeze slowly and the water seeps out and it firms up.

## Script (as recorded)
A war is the only reason the Leaning Tower of Pisa is still standing. It's 1173, and Pisa starts building a grand marble
bell tower next to its cathedral. By the second floor, the builders notice something. The whole thing is tipping over.
The foundation is only three meters deep, sitting on soft, wet clay. Then Pisa goes to war with Genoa, Lucca and Florence,
and everybody drops their tools. For almost a hundred years, the half-built tower just stands there, leaning. The neighbors
think it's hilarious. When the builders finally come back, they try to cheat: they make every new floor taller on the
short side. So now the tower doesn't just lean. It bends, like a banana. But wait, why didn't it fall over? You see, wet
clay is like a sponge full of water. Squeeze it fast, and it squishes. Squeeze it slowly, and the water seeps out, and the
clay gets firm. The war made everyone wait, so the ground had time to harden. If they'd kept building, the tower would have
toppled. In 1990, engineers closed it and pulled soil out from under the high side. It straightened by forty-five
centimeters, and then they stopped on purpose. Because a straight tower in Pisa is just a tower.

(Comic colour, not a claim: the neighbours laughing, the "cheat", the banana.)

## Voice
ElevenLabs `eleven_v4`, voice "Leo – The Engaging Narrator & Storyteller", take 1 of 2 (79.5 s) → silences > 0.14 s cut
to 0.09 s, `atempo` 1.14 → `voice/voice.mp3` 61.8 s (3.4 words/s) → Scribe word times → `voice/words.json`.

## Designed for this topic
- **Cast**: master builder (stout, beret, beard, wine coat), two masons (cap / hood, earth colours), Pisan soldiers
  (red coats, helmets, spears drawn as held props), neighbours (four townsfolk), a kid (orange, hair — the everyman of the
  explanation), 1990 engineers (hi-vis orange, hard hats, glasses), today's tourists (bright modern colours, a camera prop).
- **Props that carry the jokes**: the tower as eight chained storeys (a lean on the base, a counter-tilt on storeys 4+
  = the banana, storeys that rise and scale in), a scaffold, the striped cathedral and baptistery, mud around the base,
  spears and hammers, a banana and a sponge (held-prop draw functions), steel cables, lead weights, a drill rig, a soil pile.
- **Sets**: `piazza` (lawn, cathedral, town wall, streets, hills, mountains; the tower at the origin leaning toward +x so
  the lean reads left → right from the usual cameras at +z) and `kitchen` (a room, a table, a bowl) for the analogy.
- **Light per beat**: day for the story; golden for the hundred years and the payoff; night for "the ground had time to
  harden"; interior for the sponge.
- **Effect cards**: `exclaim` on "something", `creak` + `puff` on the tipping, `splash` on "clay", `puff` on the dropped
  tools, `zzz` on the sleeping guard, `arrow` on "short side", `question` on "why", `splash` / `sparkle` for the sponge,
  `bang` + `puff` for the what-if fall.
- **Sound**: bouncy → tense (tipping) → march (war) → wonder (a century) → bouncy → sneaky ("But wait") → explain →
  tense (what-if, dead air on the crash) → march (1990) → payoff with a button.

## Shot plan
| # | first word | set · light | framing · camera | who / what | sound |
|---|---|---|---|---|---|
| 1 | (0) A war | piazza · day | low wide, the leaning tower today, zoom push | tourists, one points, one takes a photo | bouncy |
| 2 | It's | piazza · day | flash → high establishing, glide down | 1173: cathedral, first storey + scaffold, masons | whoosh |
| 3 | By | piazza · day | MS at the base, push, punch on "something" | master + mason, "!" | gasp sting |
| 4 | The whole | piazza · day | low dutch angle, kick on "over" | three storeys tilt 0 → 4°, shocked masons, creak, dust | tense, creak, thud |
| 5 | The foundation | piazza · day | low close, DOF | the master pokes the mud, sweat, splash | splash |
| 6 | Then | piazza · day | wide → glide in + roll | soldiers with spears march off, masons drop tools | march, footsteps, clack |
| 7 | For | piazza · golden | slow glide | the half-built tower alone, a guard asleep, zzz | wonder, bell |
| 8 | The neighbors | piazza · day | MS, DOF | three neighbours laughing and pointing | laugh |
| 9 | When | piazza · day | MS → wide | storeys rise, counter-tilted; arrow on "short side" | bouncy, pops |
| 10 | So | piazza · day | low, kid in front, punch on "banana" | the whole bent tower; kid holds up a banana | boing |
| 11 | But | piazza · day | CU, roll | the kid wonders, "?" | sneaky, squeak |
| 12 | You | kitchen · interior | MCU | the kid with a wet sponge over a bowl | explain |
| 13 | Squeeze | kitchen · interior | CU, kick on "squishes" | fast squeeze, splash | splash, squeak |
| 14 | Squeeze (2) | kitchen · interior | CU | slow squeeze, drips, sparkle on "firm" | glint |
| 15 | The war | piazza · night | low glide | the waiting tower under the moon, guard asleep | |
| 16 | If | piazza · day | wide, kick | what-if: two more storeys, the tower topples, bang + dust | tense, stop, crash, rumble |
| 17 | In | piazza · day | wide → low on the drill | 1990: hard hats, cables, lead weights, drill, soil pile | march, zip |
| 18 | It (7) | piazza · day | the tower straightens 5.5 → 4°, then a glide to the engineers | cheering, then "stop" | creak, ding |
| 19 | because | piazza · golden | low, push, end on the last word | tourists "holding up" the tower, one photographs | payoff, cheer |
