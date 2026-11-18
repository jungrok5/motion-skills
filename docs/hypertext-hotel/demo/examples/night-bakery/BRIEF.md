# Brief — The Night Loaf (a bakery at three in the morning)

**Topic** (as given): "a bakery that works through the night — make it a hypertext-hotel page."

**The question the page answers**: what goes on inside a bakery while the street sleeps? Each floor is one step of the
bread: the flour comes down from the loft, the dough proves, the oven bakes, the shop opens at dawn, and the baker sleeps
upstairs between shifts. Every object you can work is a real HTML control.

## Building
- Type: a narrow brick bakery with a pitched slate roof and a bread-oven chimney; a dumbwaiter (bread hoist) runs up the
  middle between the floors.
- Grid: columns `[4.3, 1.4, 4.3]` m, floors `[2.8, 2.6, 2.5]` m, depth 3.2 m. Rooms: shop (G, left), bakehouse (G, right),
  proving room (1, left), flour loft (1, right), the baker's flat (2, left), office (2, right), hoist shaft (all floors, middle).
- Facade: cut face painted flour-white `#efe7d6` with a copper inlay; wings in dark red brick `#5e2a22`, warm windows;
  base of sandstone with two steps up to the shop.
- Roof: gable, slate shingles `#3d3a44`, two chimneys (the oven flue on the right).
- Ground: cobbled street, two lamps, two trees each side.
- Sign: "The Night Loaf" in warm amber neon `#ffb347` above the ridge, contenteditable.
- Sky: deep blue night `#03050c` → `#162040`, moon upper left, a low skyline.

## Rooms, objects and controls
| room | props | control (HTML) → what it does |
|---|---|---|
| Shop | counter with loaves, bread shelves, door, shopkeeper doll in an apron | "Open" switch (checkbox) → the shop lamps; "Today's loaf" (select) → the price on a chalk card (`<output>`); a shop bell (button, `data-hic-click`) → rings, counts customers |
| Bakehouse | brick bread oven with fire, flour sacks, table, baker doll with a peel, ceiling fan | Oven (range 180–260 °C) → the fire's size, light and colour (orange → white-hot); Extractor (checkbox) → the fan spins up on a spring and down again |
| Proving room | two racks of trays with dough, warming lamp | Proof (range) → the dough on every tray rises on a slow spring; Warming lamp (checkbox) → a red heat lamp |
| Flour loft | sacks, sieve, crates, chalkboard | Order book (text field on the chalkboard, `data-hic-edit`); loft lamp (checkbox) |
| The baker's flat | bed with a quilt, armchair, wireless set, window | Lamp (checkbox); Wireless (range) → the dial glows brighter |
| Office | desk, ledger shelf, clock | Alarm (`<input type="time">` on an enamel clock plate); desk lamp (checkbox) |
| Hoist | dumbwaiter car with bread trays instead of a lift cage | Hoist lever (vertical range, 3 stops) → the car glides to Bakehouse / Proving / Flat; indicator `<output>` |

## Palette and material
Flour white, oven brick `#8a3e2a`, copper `#c07a42` instead of the template's brass for the hardware, enamel plates in cream
`#f3ecd8` with a navy rim `#1f2e5a` (the bakery's colour), chalk cards. Warm lamps `#ffd59a`, oven fire `#ff8a3a`, heat lamp `#ff5040`.

## Motion
- Weight: the dough rises slowly (spring 0.6 Hz, no overshoot); the fan has inertia (spins up over ~1 s, coasts down over ~2 s);
  the hoist is light (mass 0.7: quick, small bounce).
- Alive at rest: the oven fire flickers; the baker and the shopkeeper breathe and shift their weight; the wireless dial glows.

## Sound (synthesised)
Switch clicks, a wooden clunk for the select, a shop bell (the default bell voice), a low hum while the hoist moves, a two-note
chime when it arrives (G4 → C5, like a kitchen timer), and a soft roar (`whoosh`) when the oven goes above 240 °C.

## Still review notes
- Every room readable at the whole-building view; controls not hidden behind props.
- The oven at 260 °C must look hotter than at 180 °C; the dough at full proof visibly taller.
- No control overlaps another; the lens shows a twin readably.
