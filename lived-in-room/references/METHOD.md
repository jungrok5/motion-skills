# METHOD — how the room is built so that it reads as a real one

Five parts, in the order the work goes: the skeleton first (§1), nothing guessed (§2), how each thing is made (§3),
how each thing is held (§4), and what makes it lived-in (§5). The source is the article summarised in `SOURCE.md`;
the numbers in the examples below are from the worked example.

## 1. Skeleton first

Work from the large to the small, the way a building is designed:

    setting (which building, who lives in it)
      → the building's spec (wall, window, door, ceiling, finishes, services)
        → furniture → what stands on the furniture → what hangs on the walls → cables

`skeleton.py` runs before `layout.py`, and it contains only the building: `r.shell()`, `r.window()`, `r.door()`,
`r.walls()`, `r.skirting()`, `r.cornice()` where the building type has one, and the services fixed to the building
(switches, sockets, the ceiling light, heating and cooling with their pipes). The building type decides all of it:

| the setting says | so the skeleton has |
|---|---|
| the structure (concrete frame, block, timber) | the wall thickness → how deep the window sits, how wide its reveal is |
| the decade and the grade | the window type and its frame depth; a cornice or none; skirting size; the door |
| the storey and what is outside | a guard rail or none; what the window shows; whether far lights are in view |
| the country | switch and socket heights, plate shapes, the ceiling light, how cooling and heating enter the room |
| the rules for that building | a sprinkler, a vent, a detector, a rail — or their absence, on purpose |

A thing that the building type does not have is left out on purpose and the brief says so (the example has no
sprinkler and no rail, and says why).

## 2. Nothing guessed

A capable model still knows almost nothing specific about how things are made and fitted. Left alone it builds
what looks plausible: a round vent where the real one is square, a mask hung the wrong way up. The rule:

> **Every number in the skeleton, and every number of a thing the camera gets close to, comes from somewhere —
> and `RESEARCH.md` says where.**

**Before modelling a thing, ask: whose trade is this, and how would they do it?** A window is a fitter's; a book
spine a typesetter's; a beacon an aviation authority's; a hung mask a museum's. Then look in the place that trade
writes things down:

| what | where to look |
|---|---|
| windows, doors, fittings, lamps, appliances | the maker's catalogue or spec page: outside sizes, frame depths, clearances, hole diameters |
| what a building of this type must have | the text of the rule (housing standards, building code): heights, rails, vents, sprinklers |
| lights on tall structures, signs | the aviation / signage notice: which are steady, which flash, how often |
| how a kind of object is displayed or stored | the practice of the people who keep them (a collector, a museum, a shop) |
| type on spines, labels, signs | the typesetting convention of that language |
| a specific object the person owns | its real dimensions (maker's page), or the user's photograph, or `source: owner` |
| how a hand-held camera moves | gait studies (step rate and length), tremor frequency, the panning rule for the frame rate |

**Say where to look.** "Research the window" gets a guess with a citation; "open a PVC window maker's catalogue and
bring back the frame depths" gets the table.

**Record what was opened, not what is remembered.** `RESEARCH.md` has one section per id with the numbers, how they
were used here, whose way of doing it this is, and a source line. Three honest grades: a page that was opened; a
number seen only in a search result (written as an estimate); nothing found (`source: estimate`). `check.py` lists
the estimates rather than hiding them, and fails when the inventory names a source that is not there.

**Researching first is faster.** In the source, the window surround that was researched first was right the first
time; the lock and the vent that were guessed were each built twice.

**When stuck, stop and research again.** If the same fix has failed twice, stop rendering. Changing a setting and
re-rendering looks like progress and is not. Take one step whose only job is to find the cause: turn suspects off one
at a time, read what others report for the same symptom, measure. Only then touch the scene.

## 3. How each thing is made

Each kind in `inventory.py` has a `method`:

| method | when | notes |
|---|---|---|
| `model` | the default. Anything geometric, anything whose size must be exact, anything with a logo or a famous design (modelled as a shape, without its name) | `lr.geo.Part` from numbers; `lr.kit` for the common things |
| `image` | a thing that is a picture on a sheet: a poster, a page, a label, a screen, a note | drawn with `lr.draw`; type follows the convention of its language |
| `split` | a thing with a clear or thin part and an organic part | model the glass / clear plastic / thin shell; bring in the rest |
| `generate` | an organic shape the camera gets close to and code would make badly (a figurine, a plant with character) | an outside mesh generator — the user's own account and decision; make one source picture per thing and check it for faults before generating |
| `scan` | a real object or surface from a licensed scan | check the licence; credit where it requires |

Rules that go with the table:
- **Decide per thing, by how it is used in the picture**: how large it gets on screen (`sheet.py --screen`), how
  exact its size must be, whether its shape is geometric.
- **Logos and trade marks are never generated and never drawn.** Famous furniture and lamps are remodelled as shapes
  from the seller's dimensions, unnamed.
- **A mesh you did not build must be closed before it is used.** In the source, 40 of 42 generated meshes were open,
  and an open mesh has no inside — the intersection check cannot work on it. `geo.import_glb()` brings one in as a
  single object; `geo.close_mesh()` welds, fills and reports what is still open; the audit fails an open mesh.
- **For a thing you know well, write down what makes it itself before modelling** (BRIEF §3): the graduations on a
  ruler, the wear on a handle. Model those and little else.
- **Finish by screen time.** Letter the spines the camera reads; leave the rest plain (`kit.book(title=None)`).

In this repository generated media is reference only and is not committed: the bundled examples are `model` and
`image` throughout.

## 4. How each thing is held

The more things a room has, the more of them end up in places no thing can be. In a dark frame a pile of books
floating 18 cm above the stool under it is invisible to the eye and obvious to a ruler. So:

**Every thing declares how it is held, and enters the room only through the call for that support.**

| support | call | the thing is authored | the audit requires |
|---|---|---|---|
| **place** | `r.put(ob, on, at= / rel=)`, `r.stack()`, `r.against()` | origin under its footprint | its underside within 1.5 mm of a surface that reaches below it; its weight over what holds it |
| **hang** | `r.hang(ob, wall, u, z, hook=…)` or `frm=thing, at=point` | back on y = 0, hanging point at the origin | within 3 mm of its nail / hook / peg; within 35 mm of the wall |
| **stick** | `r.stick(ob, wall, u, z)` or `on=thing, point, normal` | back on y = 0, origin at the glued area | its back within 1.5 mm of the face |
| **suspend** | `r.suspend(ob, x, y, drop)` | origin at its top centre | within 3 mm of its cord, the cord on the ceiling |
| **lean** | `r.lean(ob, wall, u, foot)` | upright, back toward +Y | foot on the floor, top within 3 mm of the wall |
| **fix** | `r.fix(ob, to, …)` | as it is mounted | within 2 mm of what it is fixed to (or let into it: `embed=True`) |

`r.put()` lowers a thing straight down until it rests: it does not take a height. That is the rule for repairs as
well — **a sunk thing is re-seated on its support, never pushed up until it clears.**

`audit.py` then measures the whole room, independently of how things were placed:

- **floating / sunk** — the gap under every placed and leaning thing, in millimetres;
- **tipping** — whether a placed thing's weight is over what holds it (`ob['lr_com']` says where the weight is when
  it is not the middle: a lamp's base, a plant's pot);
- **held by nothing** — a hung, stuck, suspended or fixed thing that does not touch its holder;
- **intersecting** — every pair of things that overlap by more than 2 mm, with the depth; pairs that are meant to
  pass through each other are declared (`r.allow(a, b)`, or `embed=True`) and everything else is a fault;
- **open meshes** — which cannot be measured at all.

`audit.py --break` lifts one thing 180 mm and sinks another 10 mm and expects both to be reported: the proof that
the audit can see. `render.py --view plan --supports` paints every thing by its support type — the quickest way to
see a thing that claims the wrong one.

Soft things: cloth hangs under its own weight (`Part.drape`), a cushion sags (`Part.slab`), and a soft thing may sink
into what it lies on by its `soft=` allowance. There is no rigid-body or cloth simulation in the skill; a pile is
`r.stack()` and the audit confirms it.

What the audit cannot tell you is whether a person would put the thing there. That is §5 and the review.

## 5. Lived-in

A room that is physically correct and perfectly tidy still reads as rendered, because nobody lives like that.

**Place by use.** For every thing: *when is it used, and for what?* The answer is its place, and it goes on the
call as `why=` — `check.py` fails a thing without one. The microphone stands in front of the mouth of whoever sits
there; the cup is where the right hand finds it; the heater points at the seat and away from what heat would spoil.
The room's own rule (BRIEF §1) settles the rest.

**Leave three kinds of trace.**

| trace | how | example |
|---|---|---|
| **off square** | `askew=` (a seeded few degrees), `rz=` | a keyboard 4.5° to the desk edge; a stool pushed back and turned; posters hung by eye |
| **ajar** | `kit.drawers(ajar=(0, 0.03, 0))`, `r.window(slide=…)`, `r.door(open_deg=…)` | a drawer 3 cm open; a book face down |
| **half-used** | `fill=` on cups and bottles; a slipped pile; a row still filling | a third of cold tea; tonight's three tapes; gaps in the rack |

`check.py` fails a room in which fewer than a quarter of the kinds of placed things have a member off square.

**Not too much.** Each trace is one a person leaves in the course of using the room. Past that it is a mess, which
is a different room; decide how far in the brief.

**One dirt.** Every material recipe in `lr.mat` takes a `dirt=` amount and draws it from the same node group
(`lr_dirt`): the whole room is grimy in the same way, and one change to the group changes every thing.

**Movement belongs here too** — a second hand, a screen, cloth in moving air — and is in `FILM.md`.
