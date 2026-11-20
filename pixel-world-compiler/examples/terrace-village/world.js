/* terrace-village — flooded rice terraces under a hill hamlet, 25° N, mid-June, mid-morning.
   The same compiler as tundra-camp with a different sun and different tables: the palette, the shadow
   length and the water all move because the latitude and the materials moved. See BRIEF.md. */
FW.world({
  name: 'Terrace village',
  seed: 25,
  size: [92, 100],
  /* SOURCE: 25° N (subtropical hill country). June solstice declination +23.4°. 09:30 solar (hour −2.5).
     DERIVED: the sun stands ~56° high in the east-north-east, so shadows are short and fall west. */
  sun: { lat: 25, decl: 23.4, hour: -2.5 },
  /* TASTE: a light breeze, 2 m/s — enough to break reflections and stir glints, not to bend the rice */
  wind: { toward: 300, speed: 2 },

  materials: {
    /* SOURCE: paddy water is shallow and turbid — Pope & Fry pure-water absorption plus suspended silt and
       dissolved organics (cdom, per band, informal). The bed is wet puddled clay. */
    paddy:  { kind: 'water', albedo: [0.13, 0.12, 0.08], depth: 0.35, cdom: [0.4, 0.9, 2.2], skyGain: 2.0, rungs: 4, src: 'turbid paddy over wet puddled clay; skyGain 2 = the horizon sky it mirrors is ~2× the mean (informal)' },
    rice:   { albedo: [0.10, 0.30, 0.06], rungs: 3, tilt: 0.9, src: 'transplanted rice seedlings, young leaf (informal)' },
    grass:  { albedo: [0.09, 0.20, 0.06], rungs: 3, src: 'bund and hillside grass, mesic (informal)' },
    mud:    { albedo: [0.36, 0.26, 0.17], rungs: 3, src: 'cut terrace riser and packed path, red-brown laterite clay' },
    leaf:   { albedo: [0.05, 0.15, 0.04], rungs: 3, src: 'broadleaf and bamboo canopy, humid (informal)' },
    culm:   { albedo: [0.32, 0.40, 0.14], rungs: 2, src: 'green bamboo culm' },
    thatch: { albedo: [0.46, 0.38, 0.22], rungs: 3, src: 'dry rice-straw thatch; also hats and baskets' },
    plank:  { albedo: [0.24, 0.17, 0.11], rungs: 3, src: 'weathered hardwood planks and posts' },
    slate:  { albedo: [0.09, 0.09, 0.10], rungs: 3, src: 'water buffalo hide, wet slate grey (informal)' },
    horn:   { albedo: [0.32, 0.29, 0.24], rungs: 2, src: 'buffalo horn keratin' },
    indigo: { albedo: [0.06, 0.08, 0.22], rungs: 3, src: 'indigo-dyed cotton' },
    skin:   { albedo: [0.38, 0.245, 0.19], rungs: 2, src: 'Anderson & Parrish 1981, mid complexion' },
    hair:   { albedo: [0.06, 0.05, 0.045], rungs: 2, src: 'black keratin' },
    smoke:  { albedo: [0.52, 0.52, 0.54], rungs: 3, shade: 0.8, src: 'cooking smoke' },
  },
  cover: { paddy: 0.45, grass: 0.3, leaf: 0.15, rice: 0.1 },
  env: 'grass',

  terrain: {
    relief: 1.0, scale: 30, rise: 9,
    /* SOURCE: hill terraces step 0.4–1.0 m; bunds 0.2–0.3 m high, ~0.3–0.5 m wide; 5–10 cm of standing water */
    terraces: { step: 0.7, bund: 0.09, bundH: 0.22, depth: 0.08, warp: 22, from: 8, to: 75 },
  },
  ground: [
    ['paddy', (f) => f.kind === 'paddy', /* SOURCE: hills 0.20–0.25 m apart; MEDIUM: 0.30 m cells, jittered — a true grid aliases into stripes */ { riser: 'grass', tuft: { mat: 'rice', h: 0.2, cell: 0.3, density: 0.85 } }],
    ['mud',   (f) => f.trail < 0, { grain: 0.15, grainScale: 2 }],
    ['grass', (f) => f.bund, { grain: 0.1, riser: 'grass', riserAo: 1 }],
    ['grass', () => true, { grain: 0.4, grainScale: 0.7, riser: 'mud', tuft: { mat: 'leaf', h: 0.15, cell: 0.5, density: 0.35 } }],
  ],

  places: [
    {
      id: 'hamlet', clear: 10, flat: 1.6,
      /* siting: above the highest paddy, the higher the better (out of the wet, a view of the fields) */
      site: (f) => (f.Y > 78 && f.Y < 88 ? f.elev - Math.abs(f.X - 46) * 0.05 : null),
      props: [
        /* SOURCE: a stilted house — floor raised ~1.5 m on posts, steep thatch (40–45°) to shed monsoon rain */
        { form: 'house', spec: { w: 6.0, d: 4.4, h: 2.2, pitch: 42, overhang: 0.6, stilts: 1.4, deck: true, wall: 'plank', roof: 'thatch', trim: 'plank', windows: 1, course: 0.3, roofMarks: true, roofCourse: 0.35, door: { w: 0.9, h: 1.8, at: 0.3 } }, at: [-3, 0], tag: 'house' },
        { form: 'house', spec: { w: 4.0, d: 3.6, h: 1.9, pitch: 42, overhang: 0.5, stilts: 1.2, wall: 'plank', roof: 'thatch', trim: 'plank', windows: 0, course: 0.3, roofMarks: true, roofCourse: 0.35, door: { w: 0.8, h: 1.6, at: 0.5 } }, at: [7, 4], tag: 'granary' },
        { form: 'rack', spec: { w: 2.4, h: 1.6, wood: 'plank', hang: 'thatch', n: 5, len: 0.9 }, at: [4, -4] },
        { form: 'dome', spec: { r: 0.9, h: 1.2, mat: 'thatch' }, at: [-9, -3] },
      ],
    },
  ],
  trails: [{ pts: [['hamlet', 0, -6], ['hamlet', -4, -26], ['hamlet', 6, -56], ['hamlet', 2, -84]], width: 0.8 }],
  flora: [
    /* SOURCE: clumping bamboo (Bambusa) 8–12 m round the hamlet and on the steep ground */
    { id: 'bamboo', form: 'tree', cell: 9, jitter: 0.8, variants: 4,
      spec: { form: 'bamboo', height: 8, crown: 3.4, bark: 'culm', leaf: 'leaf', culms: 8 },
      where: (f) => f.depth === 0 && !f.bund && (f.Y > 74 || f.Y < 8), density: 0.75, sway: 1.2 },
    /* SOURCE: a few broadleaf shade trees left on terrace corners, 6–9 m */
    { id: 'tree', form: 'tree', cell: 17, jitter: 0.9, variants: 3,
      spec: { form: 'broadleaf', height: 7, crown: 5.5, trunk: 0.35, clear: 2.2, bark: 'plank', leaf: 'leaf', clusters: 26 },
      where: (f) => f.depth === 0 && f.Y > 10, density: 0.6, sway: 0.6 },
  ],

  cast: [
    /* the farmer: conical straw hat, indigo shirt and trousers rolled to the knee, barefoot in the water */
    /* her walk stays on one terrace (level 7, Y 56–61; she walks at Y 58–59): a 0.7 m riser is a climb, not a stride (check: reach) */
    { id: 'farmer', kind: 'human', at: ['hamlet', 1, -27], face: 180, mass: 58, fr: 0.16,
      skin: 'skin', hair: 'hair', coat: 'indigo', legs: 'skin', boots: 'skin', sleeve: 'indigo', coatLen: 'hip', hat: { kind: 'cone', mat: 'thatch' }, carry: 'rice',
      plan: [['idle', 2.5], ['walk', [['hamlet', -6, -27.5], ['hamlet', -12, -28]]], ['big', 'lift'], ['idle', 2],
        ['walk', [['hamlet', -6, -27.5], ['hamlet', 1, -27]]], ['idle', 2]] },
    { id: 'elder', kind: 'human', at: ['hamlet', 3, -5], face: 270, mass: 54, fr: 0.1,
      skin: 'skin', hair: 'hair', coat: 'indigo', legs: 'indigo', boots: 'hair', coatLen: 'knee', hat: { kind: 'band', mat: 'indigo' },
      plan: [['idle', 6], ['walk', [['hamlet', 8, -7]]], ['idle', 5], ['walk', [['hamlet', 3, -5]]], ['idle', 3]] },
    /* SOURCE: swamp-type water buffalo (Bubalus bubalis) — shoulder 1.3–1.5 m, 400–600 kg, horns sweep back.
       DERIVED: heavy and slow — Fr 0.07, duty 0.75; weight lengthens its starts, stops and turns */
    { id: 'buffalo', kind: 'quad', at: ['hamlet', 16, -32], face: 180, seed: 11,
      shoulderH: 1.35, length: 1.25, chest: 0.82, width: 0.6, neck: 0.38, neckUp: 12, head: 0.5, tail: 0.5, ears: 0.15,
      mass: 500, fr: 0.07, duty: 0.75, lag: 0.25, legW: 3,
      coat: 'slate', belly: 'slate', legs: 'slate', hoof: 'hair', muzzle: 'slate', antlers: { kind: 'crescent', span: 0.7, mat: 'horn' },
      plan: [['idle', 4], ['walk', [['hamlet', 9, -32]]], ['idle', 5], ['big', 'toss'], ['idle', 3], ['walk', [['hamlet', 16, -32]]], ['idle', 2]] },
  ],
  life: {
    smoke: [{ on: 'house', top: true, every: 1.0, life: 8, rise: 0.4, spread: 4 }],
    /* TASTE: thin monsoon cumulus, half the beam through (transmit 0.5 → a dithered shadow) */
    clouds: { cover: 0.3, scale: 34, speed: 0.6, transmit: 0.5 },
  },
  player: 'farmer',
  /* the camera comes down from the hamlet to the farmer at the paddy */
  tour: { duration: 24, keys: [[0, ['hamlet', 0, -3]], [5, ['hamlet', 0, -9]], [11, ['hamlet', -4, -23]], [24, ['hamlet', -7, -29]]] },
});
