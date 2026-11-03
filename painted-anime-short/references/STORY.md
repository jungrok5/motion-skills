# Topic → story → shots

The reference film and 「The Last Tram」 share one grammar: *something old and overgrown sleeps in a quiet world; a small
living thing visits; a light wakes; it shudders, rises and leaves for the sky; the world is quiet again, a little
changed.* Almost any topic fits it once you find the thing that can sleep and wake.

## 1. From a topic to the four nouns
| topic given | hero (sleeps, wakes, leaves) | place | witness | the magic |
|---|---|---|---|---|
| the last tram (example) | an overgrown tram on old rails | forest clearing at dawn | bluebird | the headlamp lights |
| a lighthouse | a lighthouse on a sea stack, grass on its gallery | cliffs over a misty sea | a gull chick | the lamp turns once more |
| a whale | a stone whale half sunk in a meadow, a tree on its back | hills with terraced fields | a fox | its eye opens; it swims into the clouds |
| a windmill | a windmill with ivy sails | a ridge above fog | a sparrow | the sails turn without wind |
| a postbox | a mossy red postbox at a bus stop | a country road in summer | a cat | a letter glows inside; it walks off |
| a diving bell | a brass diving bell on a beach | low tide at dawn | a crab | the porthole lights; it floats up |
| a robot (generic) | design your own: round, rusted, plant-covered, **not** any existing film's robot | ruins in a forest | a bird | its eyes light |

If the topic is an idea rather than an object ("spring", "memory", "my hometown"), pick an object that carries it
(a school bell, a bicycle, a station sign).

## 2. The grammar (8 beats; drop or merge to 6, add a second detail for 9)
| beat | shot size / camera | length | transition in | sound |
|---|---|---|---|---|
| 1 establish | extreme wide: sky ⅔, far canopy, near treeline; slow push in | 6–8 s | fade in | pad, a far chirp, music-box notes |
| 2 approach | wide multiplane: framing trunks, the hero small in light; truck sideways | 5–7 s | dissolve 1–1.2 s | pad change |
| 3 detail | close-up on the hero's top: moss, sapling, a machine part | 5–7 s | cut | music box motif |
| 4 witness | (same shot or next) the small creature arrives, lands, hops, looks | — | — | flutter, chirps |
| 5 the turn | extreme close-up of the eye / lamp / door: it flickers and wakes, a glint | 4–5 s | cut | flicker, chime, pad to sus4 |
| 6 the shudder | medium: shake, dust puffs, leaves fall, the witness flies, the hero rises | 5–6 s | cut | thump, rumble, rustle, strings in |
| 7 the lift | looking up through a ring of canopy at the light; the hero crosses it | 5–6 s | white flash .8 s | whoosh, strings swell |
| 8 big sky | over a cloud sea, the hero sails, light trails, leaves streaming | 6–7 s | dissolve 1 s | full chords, music box high |
| 9 return | the first place again, empty; the witness lands where the hero was; push in | 5–6 s | dissolve 1.4 s, fade out | motif once more, last chirp |

Total 40–80 s. Keep every shot 3–8 s; the eye needs ~3 s to read a painted plate.

## 3. Write the shot table before any code
```
#  t      shot      framing / camera                          moves                                 tr        sound
1  0–7    dawn      XW sky+canopy+treeline, push 1.00→1.08    flock crosses, mist drifts            fade in   pad D, bell
2  7–13   clearing  W trunks frame, tram small, truck −90→70   rays, motes                           dissolve  pad Bm
3  13–19.5 roof     CU roof moss + sapling, push 1→1.06       bird flies in 0–2.1 s, lands, hops    cut       flutter, chirps, bell motif
…
```
Then for each shot list its plates back to front with depths, and the per-frame things. That table becomes the shot
functions one to one and the score's event times.

## 4. Timing details that make it feel animated, not slid
- Things settle: landings ease out (`P.ease.out`), lifts ease in-out over 2–3 s, a crouch after landing for .3 s.
- Hold before the turn: 1–1.5 s of stillness on the lamp before it flickers.
- Flicker before full on: 2–4 on/off pulses over ~.8 s, then a smooth ramp, then the glint.
- Shake decays (`shake: lt => 5 * sin(π·k)` over 2–3 s) and stops before the lift.
- The witness leaves on the shudder and returns in the coda — it closes the story.
