# BRIEF — 「Low Tide」

> A rusting container ship that the sea left behind gets up on ten hydraulic legs and walks out across the
> mudflats at first light, looking for the water.

Topic given: *"a ship that walks"* — not in the source film (a Soviet apartment block in a field at dusk). Everything
below is designed for this topic; the fixed style (procedural three.js, photoreal grit, the post chain, the
stateless gait, the shot grammar) comes from the skill.

## 1. The colossus

| | |
|---|---|
| What | a 110 m feeder container ship, rust-streaked black topsides over red-oxide bottom, a weed-and-barnacle band where the waterline used to be |
| Why it walks | stranded at low tide; it walks seaward along the flats (+X) toward the fog where the water is |
| Box (`CFG`) | hull 110 m long × 20 m beam × 12 m keel-to-deck; containers stacked to +11 m above deck; accommodation block aft to +16 m above deck → `BODY_LEN 110, BODY_DEPTH 20, BODY_H 26` |
| Origin | keel bottom, midships. Hull is `y 0..12`, deck at 12 |
| Ride height | keel 15.5 m above the mud (`RIDE_H 15.5`) |
| What it carries | ~150 boxes in faded liner colours (stacks broken and uneven), lashing bars, the white accommodation block with 5 decks of cabins, bridge wings, a funnel with a faded band, a radar mast, a lifeboat on davits, the forecastle with windlass and two anchors |
| Its belly | flat red-oxide bottom with bilge keels, the propeller (turning slowly, out of habit) and rudder, sea-chest grilles, kelp and rope hanging from it, a welded girder belt along both sides that carries the hips |
| Life on it | lit cabin windows and bridge, laundry on the bridge wing, a flag at the stern, the anchor chain hanging out of the hawse pipe, mooring ropes trailing, water still running off the hull |

## 2. Mass → motion

| | value | why |
|---|---|---|
| Legs | 5 a side (10), hips at x = −44, −22, 0, 22, 44; `HIP_Y 3.2`, `HIP_Z 10.8`; feet at `FOOT_Z 22` | a long narrow hull needs more supports than the block; spacing 22 m keeps the claws clear |
| Leg size | `LEG_SCALE 0.92` (thigh 11.5 m, shin 16.6 m) | the hull is lower and longer than the block |
| Leg paint | grimy grey-green armour, salt-white crust low down, mud to the knee | it has walked out of the sea before |
| Cycle | `T 7.6 s`, duty 0.72, stride 12 m → **2.19 m/s** | heavier and longer than the block (6.4 s, 2.9 m/s): it starts late and stops late |
| Body | bob 0.42 m, shudder 0.09 m, sway 0.34 m, **roll 0.022 rad** | a ship rolls; the roll is its idle breath — it never stops moving |
| Follow-through | anchor chain, mooring ropes, kelp strands, laundry, the stern flag all swing on `lagSwing()` from the body's sway — they lag the roll and overshoot it | |
| Anticipation | each foot peels out of the mud slowly (check: lift-off ≤ 35 % of mid-swing speed) | |
| Recovery | the hull sinks into every group touchdown and shudders (damped 0.09 m) | |
| Planted feet | analytic: a planted foot does not move a millimetre (check) | |

## 3. Place, hour, weather

| | |
|---|---|
| Ground | tidal mudflat: almost all bare mud (`mud 0.95`), sheets of standing water everywhere (`puddle p 0.72, cell 17`), no ruts; sparse salt-marsh tufts, reeds only at the water's edge, shells and stones |
| Dressing | rows of old oyster stakes leaning out of the mud, a small fishing boat lying on its side, a mooring buoy, tyres |
| Hour | overcast dawn: grey-rose sky, brighter low in the east (ahead of the ship), pale grey-pink fog, low warm-grey key light from ahead |
| Colour targets | mud ≈ 70,64,58 sRGB; water mirrors the sky; hull black-brown with red below; container colours faded (never saturated); windows amber 242,193,130 like every colossus |

## 4. The film (9 beats, 40 s)

| # | shot | t | what it shows |
|---|---|---|---|
| 1 | `f_open` | 0–5 | lens at mud level on a water sheet among oyster stakes; the ship's horn; rack focus from a stake to the hull in the fog |
| 2 | `f_side` | 5–10 | long lens, the whole ship side-on, legs working under it |
| 3 | `f_hero` | 10–15 | low 3/4 from ahead of the bow: it walks toward and past us |
| 4 | `f_foot` | 15–19 | worm's-eye by a foot that plants into a water sheet: splash, claws, the girder belt |
| 5 | `f_belly` | 19–24 | under the hull: propeller turning, kelp and chain hanging, water dripping |
| 6 | `f_life` | 24–29 | drifting up the accommodation block: lit cabins, laundry on the bridge wing, lifeboat |
| 7 | `f_knee` | 29–33 | a leg's knee and pistons lifting out of the mud and slamming back |
| 8 | `f_puddle` | 33–37 | low over a water sheet: the ship reflected, a foot plants behind it |
| 9 | `f_away` | 37–40 | crane up behind the stern (flag) as it walks into the fog toward the sea |

## 5. Sound

Steps land in water and mud (`ground: 'water'`), a lot of steel (`metal 0.8`), hull groans (`groan 0.9`); the ship's
horn at the start, gulls over the flats, the ship's bell during the life shot; wind, no rain. Music: a low pad in C
minor that swells for the hero and the away shot and ducks under every footfall near the lens.

## 6. Stills review (filled after rendering — `references/BRIEF.md` rubric, 1–5)

| shot | reads as one huge thing | weight / grounding | detail holds at framing | light & colour | composition | notes |
|---|---|---|---|---|---|---|
| (filled in after the storyboard) | | | | | | |
