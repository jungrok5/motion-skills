# Topic → cast → shots

## Casting from a topic

| topic flavour | summoner | ground beast (charges) | sky beast (coils) | small flock / extra |
|---|---|---|---|---|
| power, war, the classic | `oni` mask | `PRESET.tiger` | `PRESET.dragon` ×2 | — |
| night, loyalty, winter | `fox` mask | `PRESET.wolf` (howls) | `PRESET.crane` ×3 | — |
| water, fortune, rivers | `noh` mask | — | `PRESET.koi` → `PRESET.dragon` | koi ×3 |
| fire, rebirth | `crow` mask | `PRESET.tiger` with `stripes: 0`, `tailW: .12` (a panther) | `PRESET.phoenix` | — |

New animals are presets with new numbers first (`{ ...PRESET.wolf, snout: 1.6, ears: 'point', tail: 1.1 }` is a fox).
Keep the count small: two creature kinds, at most five bodies on screen.

## The grammar (each beat is one shot; durations are a guide)

| # | beat | dur | camera | summoner | ink / beast | sound |
|---|---|---|---|---|---|---|
| 1 | first stroke | 2–2.4 | frontal wide, slow push | coil → sweepR diagonal slash | `trace` reach .5–1.2, drops + splats, a cloud blooms where it lands | brush, boom + splash, rumble |
| 2 | the beast bursts out | 1.4–1.8 | 3/4 low, rushing in, `mb` 1, shake on the roar | — | `form` .3 → 1 in .4 s, gallop at the lens, `roar` | taiko starts, roar |
| 3 | floor sweep | 1.6–2 | low, dutch roll, orbit | coil → lowSweep (floor: .04) | ink on the floor + spray | brush, splash |
| 4 | rings | 1.8–2.2 | high (pitch .5–.65), orbiting | two spins: spinHigh, spinLow (yaw += 2π each) | two traces with `reach` .45–.7 | brush ×2 |
| 5 | the circle | 1.6–2 | frontal symmetric, eye level | sweepL → overhead → sweepR | two big vertical `arc`s behind him + a floor ring | brush ×2, ka |
| 6 | the beast prowls | 1.8–2.2 | 3/4, slow push | — | forms from a floor ring + smoke, walks, roars at the end | growl → roar |
| 7 | close + whip | 1–1.4 | close on the mask, `mb` 1.4, `dof` | coil → sweepR past the lens | one fast trace | brush whip, a last taiko; drums cut |
| 8 | the rising stroke becomes the sky beast | 2–2.4 | side-on wide, craning up | lowSweep → overhead | a `path` stroke laid then faded; a serpent on the same path, `form` rising | flute, dragon roar |
| 9 | it coils | 1.8–2.2 | wide, looking up, orbit | overhead hold | two serpents on rings above him | whoosh, riser |
| 10 | tableau | 3–4 | frontal symmetric wide, slow push | `plant` | ground beast in profile roaring, sky beasts circling, a floor ring | boom + gong, final roar |

Rhythm: cut every 1.5–2.5 s on the ~0.9 s beat; only the tableau holds. Alternate wide ↔ close and calm ↔ violent.
Every shot is its own little world: if a stroke must persist across a cut, add it again (completed) in the next shot.
