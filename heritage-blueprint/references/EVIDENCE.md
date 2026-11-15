# Evidence and form

Read before modelling any object. The model is only as honest as its ledger: every shape and
size has a source and a status, and the page never claims more precision than the sources give.

## Research order

1. **Pin the object and the period.** Place, object, era, present state or a former state, a
   single structure or a group. Some objects changed a lot (rebuilt pagodas, restored gates);
   do not assume old and new forms match. A name is not a shape: a bridge called "broken" is
   not drawn broken, a "nine-storey" tower is counted from photos.
2. **Prefer primary records.** Heritage agencies, local government, archives and museums,
   academic papers, official repair or survey reports. A journalist quoting a specialist is a
   *reported* value, never automatically a measured one. Note publisher, date, original URL.
3. **Look at real photographs.** Overall silhouette, several directions, key details. Open the
   full image; never infer from a thumbnail or caption. A user's own photo is good form
   evidence but not proof of date.
4. **Use old photos, drawings, gazetteers and repair records to judge change.** Separate
   original fabric, later repairs, rebuilds and modern landscaping. Tourist illustrations and
   renderings help locate parts; they never decide hidden structure.
5. **Keep it checkable.** Page / figure numbers, image source, access date, what you observed.
   Download only what the task needs, never hot-link it from the page, respect its licence.
   Do not commit third-party photos or drawings to the repo unless their licence allows it.

## Evidence ledger (`evidence.json`)

```json
{
  "scope": {"object": "the exact object", "era": "period shown", "representation": "3D structural study", "units": "metres"},
  "sources": [
    {"id": "photo-a", "title": "Photo title", "url": "original URL", "type": "official-photo", "date": "date or unknown", "use": "what you looked at"}
  ],
  "claims": [
    {"parameter": "roof profile", "status": "photo-estimate", "sources": ["photo-a"], "basis": "estimated from this photo; not measured"},
    {"parameter": "hidden joint", "status": "unknown", "sources": [], "basis": "no structural record; omitted"}
  ]
}
```

The example shows the fields only; it is not evidence. A source may use `file` for a drawing or
photo saved in the work folder. `build.py` checks that every claim's sources resolve; it cannot
check that they are true.

| status | meaning | how to use it |
|---|---|---|
| `documented` | a primary drawing, measurement or conservation record states it | record page, unit, datum, period; do not add precision the record lacks |
| `reported` | a news report or secondary text gives the value | name the publisher and who they quote; keep "about" |
| `photo-estimate` | read off a photo or a drawing's proportions | say which view, what reference length, how simplified; no millimetres |
| `unknown` | nothing supports it | leave it out or draw an explicitly labelled simplification; never pass it off as evidence |

When sources disagree (heights of 8.77, 9.17 and 9.4 m for the same tower is normal), check
period, repairs and how each was measured; keep all of them in the claim's `basis` and label
the page value with its status.

## Form table before code

For each object list: overall height / width / span, storeys or tiers, base, openings,
eaves or rails, top, how parts join, visible ornament, and what is not visible. Write what the
photos *show* for each key feature, not only numbers.

- **Bridges**: the real arch or beam type, number of spans, deck slope, rails and abutments. Not
  a squashed tower. No piles where the foundation is unknown.
- **Towers and pagodas**: plan shape (round, square, octagonal), storey count, the taper per
  storey, eave shape, door and window openings, finial. Never a generic stack of cylinders
  carrying a real name.
- **Stone objects and vessels**: continuous profile, real transitions (waists, steps, lips),
  openings, proportions, stacking. Smooth means geometrically continuous, not erasing a real
  waist or step.

## Dimension register

When the user asks for checked dimensions, make one row per measurement instead of scaling the
whole object from a total height: parameter, value or range, unit, start / end points and
datum, inner or outer part, period and repair state, source id with page or figure, status,
conflicts. Unreadable drawing values stay unknown; do not OCR-guess a blurred number.

| item | keep apart |
|---|---|
| storey heights | floor levels, eave levels and visible heights between eaves; outer eave tiers are not inner floors; never divide the total height evenly |
| taper | per storey for wall, column ring and eave edge; across-flats, across-corners and circumradius of a polygon are different numbers |
| eave projection | horizontal distance from wall or column axis to the eave edge; not the sloped roof length or pixels in a perspective photo |
| base | platform size, exposed height, ground and step levels; hillside or partial occlusion listed separately |
| finial | where it starts, whether a needle or lightning rod is included, the count and size of each segment |

Dimension lines in a diagram come from the same shared parameters as the model; keep "about",
"reported", "estimated" on the labels; unknowns get no number.

## Datums, proportions, visible extent

- Keep engineering datums, the visible ground and an illustration cut apart. A height relative
  to ±0.000 is not the exposed wall height all round.
- A partial figure (one elevation page, a detail) does not mean you have the full drawings,
  a point cloud or every measurement. Say exactly what you had.
- If terrain or water hides the lower part, you may show the evidenced upper part; record the
  cut in `scope` and the claim's `basis`.
- Normalise related proportions from one photo or drawing at one scale, then cross-check with
  other views. When a new photo overturns an old estimate, recompute; old code values are not
  evidence.
- Count repeated parts (rings, tiers, brackets) per view; never copy another object's count.

## Photo comparison

Turn the model to roughly the photo's direction (`check.mjs --angles`) and compare outline and
negative space first, ornament last. A photo is a perspective view and the model is orthographic:
match direction and a shared scale; do not expect a pixel overlay. Check at least: top shape,
the width relation top to bottom, tier / bay count, openings, base, joints. State conclusions per
feature. "The code passes" or "I searched" is not "it matches history".
