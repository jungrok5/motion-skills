# BRIEF — from a topic to a realm

A realm is a place somebody could walk into: a village, a harbour, a mountain shrine, a caravan camp, a ruined abbey, a
fishing pier at the end of a road. The brief turns the user's topic into decisions before any code is written. Write it
into the project as `BRIEF.md` (the template is at the end of this file; `new-realm.mjs` copies it).

## How to think about it

1. **Whose place, where, when.** One sentence a stranger could picture: "a fording village under wooded hills, late
   medieval Central Europe as an MMORPG would draw it, a summer afternoon". Research what you do not know — what the
   roofs of that region are made of, how the houses meet the street, which trees grow there, what the lanterns look
   like. This is where "a harbour" becomes a Hanseatic quay or a Jeju fishing cove; they share no building.
2. **A plan with a reason.** Places grow round something: a ford, a well, a crossroads, a gate. Put that in the middle,
   then 5–9 landmarks a walker can name and see from each other (a tower, a mill, a big tree, a bridge), ways between
   them, water, and edges that keep the walker in without a wall of nothing (woods too thick, a palisade, a cliff, the
   sea). Give every landmark coordinates in metres: +x east, +z south, the middle at the origin, 100–150 m to the edge.
3. **What each state is for.** The page shows the same place by day, at dusk, at night, in rain and in winter; decide
   what each one reveals here: which windows and lamps carry the night, where puddles gather, what freezes, what the
   snow lies on, where the sun comes through at dawn.
4. **What must be made new.** List the buildings, materials, plants and props this topic needs that the kit does not
   have as stock (`references/KIT.md`), and how each will be made from the kit's parts (`LR.mat.define`, `LR.Geo`,
   `LR.arch.wall / gableRoof / window`, `LR.flora.species`). A Korean mountain village needs a tiled hip-and-gable
   roof, a paper-and-lattice door, a stone wall with a tiled coping, red pine; none of that is the village example.
5. **What it is made of — the scans.** From the building tradition, name the surfaces (paving, wall stone, plaster,
   roof, timber, boards, the earth of the paths, the floor of the woods, rock, bark) and find a photographed one for
   each (`references/ASSETS.md`); name the few objects that will be scans (barrels, rocks, a stump — with their
   triangle counts) and what stays generated. A Hanseatic quay and a Jeju cove share no scan either: this list is
   designed per topic like the plan is.
6. **The walk.** Where the walker starts and what they see first; the tour as a list of way-points, each with what that
   stretch looks at; 8–12 named views for stills.

## Review — score the sheet (`render.mjs --sheet`) before calling it done

Score each 0–2; anything at 0 is fixed before the realm ships, and the sum should reach 16 of 20.

| | 0 | 2 |
|---|---|---|
| **A place** | scattered objects | landmarks read from each other; ways lead somewhere; a skyline |
| **Its own** | the example's houses moved about | buildings, plants and materials of this topic, researched |
| **Lived in** | clean boxes on a lawn | wear, moss, clutter at doors, things leaning; nothing floats or intersects |
| **Ground** | tiling shows; paths are stripes | paving breaks into dirt into grass; grass thins at the edges of ways |
| **Light** | flat, or everything one colour | the sun's side and the shade's colour differ; near, middle and far are separated by air |
| **Night** | black, or day with a blue filter | readable sky, lit windows and lamps doing the work, moon shadows |
| **Rain** | grey day | dark wet stone, puddles in the low places with rings, mist closing the distance |
| **Winter** | white paint | snow on what faces up and is open to the sky, dry under eaves, ice on still water, bare crowns |
| **Scans** | a photograph pasted on a box: the wrong thing for the wall, its tiling counted across the square, brighter than everything generated beside it, a rock standing on the grass | each surface reads as what it is from five metres and sits in one tone with its neighbours; objects are seated in the ground; `check.mjs` reports every scan arrived |
| **Walk** | the tour clips a wall or wades a pond; a fence or a house stands across a way | `check.mjs` passes; on the walk map (`--walk`) every way is open; every view frames something |

Then walk it yourself in the still renderer: stand at the spawn point and turn right round (four stills, 90° apart).
If any of the four shows the edge of the world, bare land, or a building's blank back, fix the plan.

<!-- template -->
# Brief — <name of the place>

**One line.** <whose place, where, when>

## Setting
- Region and period (and how literal): 
- Walls / roofs / openings / ornament: 
- Ground and ways: 
- Trees and ground cover: 
- Water: 
- Light (latitude, the hour the page opens on): 
- Sounds worth placing: 

## Plan (metres; +x east, +z south; the middle is 0, 0)
- The middle and why the place is here: 
- Landmarks (5–9): name · what · x, z · seen from: 
- Ways: 
- Water: 
- Edges (what keeps the walker in): 
- Far country: 

## States
- Day: 
- Dusk: 
- Night (what is lit): 
- Rain (where water gathers): 
- Winter (what the snow lies on, what freezes): 

## The scans (→ `assets.json`; `references/ASSETS.md`)
| what the place is made of | scan id | tried on the sheet? tone, direction, repetition |
|---|---|---|
| paving |  |  |
| wall stone |  |  |
| roof |  |  |
| timber · boards |  |  |
| paths · the floor of the woods |  |  |

Objects (id · triangles · where): 
What stays generated, and why: 

## To make new (not in the kit as stock)
| thing | made from |
|---|---|
|  |  |

## The walk
- Spawn (x, z, facing) and the first thing seen: 
- Tour way-points and what each stretch looks at: 
- Views for stills (8–12): 

## Words
- Language, place names, the title card: 
