/* tundra-camp — a reindeer herders' camp on a frozen river, 69° N, mid-March, mid-morning.
   Every row names its authority: SOURCE (measured, informal ranges are marked), DERIVED, or TASTE.
   See BRIEF.md for the cause behind each choice. */
FW.world({
  name: 'Tundra camp',
  seed: 69,
  size: [100, 96],                     // metres east × north
  /* SOURCE: Kautokeino, 69.0° N. Mid-March declination ≈ −2°. 10:30 solar time (hour −1.5). */
  sun: { lat: 69.0, decl: -2, hour: -1.5 },
  /* TASTE: a light north-easterly toward the south-west, 5 m/s — enough to stream the smoke and the drift */
  wind: { toward: 235, speed: 5 },

  /* Reflectance per R G B band (spectral, not display colours). SOURCE: informal remote-sensing and
     field ranges unless named. rungs = how many values that surface may take. */
  materials: {
    snow:    { albedo: [0.86, 0.90, 0.94], rungs: 5, shade: 0.75, src: 'fresh snow, broadband 0.8–0.9 (Warren 1982, informal)' },
    ice:     { albedo: [0.34, 0.45, 0.54], rungs: 3, src: 'wind-scoured river ice, blue (informal)' },
    sedge:   { albedo: [0.30, 0.24, 0.14], rungs: 3, src: 'dead winter sedge straw (informal)' },
    bark:    { albedo: [0.62, 0.60, 0.55], rungs: 3, src: 'mountain birch bark (Betula pubescens), betulin-white' },
    twig:    { albedo: [0.13, 0.07, 0.05], rungs: 2, src: 'birch and willow twigs, red-brown' },
    canvas:  { albedo: [0.46, 0.41, 0.32], rungs: 4, src: 'weathered cotton canvas lavvu cover' },
    pole:    { albedo: [0.27, 0.21, 0.15], rungs: 3, src: 'weathered birch poles; also antler' },
    wood:    { albedo: [0.36, 0.26, 0.16], rungs: 2, src: 'split birch billets' },
    endgrain:{ albedo: [0.60, 0.46, 0.30], rungs: 2, src: 'fresh birch end grain' },
    coat:    { albedo: [0.30, 0.26, 0.22], rungs: 3, src: 'reindeer winter coat, grey-brown (informal)' },
    pale:    { albedo: [0.66, 0.62, 0.56], rungs: 2, src: 'reindeer neck mane and belly, pale' },
    leg:     { albedo: [0.12, 0.10, 0.08], rungs: 2, src: 'reindeer lower legs and muzzle, dark' },
    gakti:   { albedo: [0.05, 0.09, 0.34], rungs: 3, src: 'wool broadcloth, indigo blue (TASTE: one cultural colour)' },
    red:     { albedo: [0.46, 0.06, 0.05], rungs: 2, src: 'red wool trim' },
    leather: { albedo: [0.28, 0.20, 0.13], rungs: 3, src: 'reindeer-skin trousers and boots' },
    skin:    { albedo: [0.38, 0.245, 0.19], rungs: 2, src: 'Anderson & Parrish 1981, mid complexion' },
    hair:    { albedo: [0.115, 0.075, 0.05], rungs: 2, src: 'dark brown keratin' },
    smoke:   { albedo: [0.52, 0.52, 0.54], rungs: 3, shade: 0.8, src: 'birch wood smoke, near-neutral scatter' },
    flame:   { kind: 'emit', kelvin: 1500, rungs: 4, peak: 1.3, low: 0.35, src: 'wood flame ≈ 1400–1600 K (Planck)' },
  },
  /* DERIVED: the eye adapts to what it sees most — the exposure comes from this cover */
  cover: { snow: 0.85, ice: 0.08, sedge: 0.07 },

  terrain: {
    relief: 1.2, scale: 38,
    /* a meandering river crossing the map west to east, frozen, its banks a shallow valley */
    river: { y: 56, amp: 7, wave: 90, width: 13, depth: 1.4, frozen: true, bank: 0.5, valley: 10 },
  },
  /* first row that matches wins. f: elev, depth, kind, frozen, shore, moist, trail, n (fine noise) */
  ground: [
    ['ice',   (f) => f.depth > 0 && f.n > 0.42, { grain: 0.06 }],
    ['snow',  (f) => f.depth > 0, { grain: 0.05 }],
    ['snow',  (f) => f.trail < 0, { grain: 0.3, grainScale: 2.2, ao: () => 0.9 }],
    /* sedge tussocks show through where the wind scours the snow: high ground, low moisture */
    ['snow',  (f) => f.n > 0.62 && f.elev > 0.2, { grain: 0.2, grainScale: 0.8, tuft: { mat: 'sedge', h: 0.18, cell: 0.55, density: 0.55 } }],
    ['snow',  () => true, { grain: 0.1, grainScale: 0.6 }],
  ],

  places: [
    {
      id: 'camp', clear: 9, flat: 0.7,
      /* siting: dry, near the river for water and fishing, but above it; the score is closeness */
      site: (f) => (f.shore > 4 && f.shore < 14 && f.elev > -0.2 ? -Math.abs(f.shore - 8) - Math.abs(f.Y - 28) * 0.05 : null),
      props: [
        /* SOURCE: a lavvu is ~5–7 m across and ~4–5 m tall on 12–20 birch poles */
        { form: 'cone', spec: { r: 2.6, h: 4.2, poles: 0.8, cover: 'canvas', pole: 'pole', snow: 'snow', seams: true, door: 0.8 }, at: [0, 0], tag: 'lavvu' },
        { form: 'cone', spec: { r: 2.1, h: 3.5, poles: 0.7, cover: 'canvas', pole: 'pole', snow: 'snow', seams: true, door: 0.7 }, at: [-9, 3.5], tag: 'lavvu2' },
        { form: 'stack', spec: { w: 1.6, h: 0.9, d: 0.6, log: 0.16, mat: 'wood', end: 'endgrain' }, at: [4.6, -1.2] },
        { form: 'rack', spec: { w: 2.6, h: 1.7, wood: 'pole', hang: 'coat', n: 4, len: 0.8 }, at: [-4.5, -2.8] },
        { form: 'boulder', spec: { w: 0.5, h: 0.3, mat: 'pole', snow: 'snow' }, at: [2.8, -3.6], tag: 'hearth' },
      ],
    },
  ],
  trails: [
    { pts: [['camp', 0, -3], ['camp', 8, -14], ['camp', 26, -18]], width: 1.1 },
    { pts: [['camp', 0, -3], ['camp', -6, 6], ['camp', -12, 22]], width: 0.9 },
  ],
  flora: [
    /* SOURCE: mountain birch at the tree line, 3–6 m, multi-stemmed, bare in March */
    { id: 'birch', form: 'tree', cell: 8, jitter: 0.9, variants: 5,
      spec: { form: 'birch', height: 4.6, crown: 3.2, trunk: 0.18, clear: 1.2, bark: 'bark', leaf: null, snow: 'snow', snowCover: 0.5, marks: 0.25, limbs: 6 },
      where: (f) => f.depth === 0 && f.shore > 2, density: (f) => 0.3 + 0.6 * f.moist },
    /* SOURCE: willow scrub on river banks, 0.6–1.2 m */
    { id: 'willow', form: 'tree', cell: 3.2, jitter: 0.9, variants: 4,
      spec: { form: 'birch', height: 1.0, crown: 1.3, trunk: 0.05, clear: 0.05, bark: 'twig', leaf: null, snow: 'snow', snowCover: 0.4, limbs: 5 },
      where: (f) => f.depth === 0 && f.shore > 0 && f.shore < 7, density: 0.7, sway: 0.4 },
  ],

  cast: [
    /* the herder: SOURCE gákti (blue wool, red trim), reindeer-skin trousers, a four-winds cap */
    { id: 'herder', kind: 'human', at: ['camp', 3, -5], face: 0, mass: 68, fr: 0.18,
      skin: 'skin', hair: 'hair', coat: 'gakti', legs: 'leather', boots: 'leather', belt: 'red', accent: 'red', coatLen: 'knee', hem: true,
      hat: { kind: 'peak', mat: 'gakti' }, carry: 'canvas',
      plan: [['idle', 3], ['walk', [['camp', 9, -2], ['camp', 16, 6]]], ['idle', 2], ['big', 'lift'], ['idle', 1.5],
        ['walk', [['camp', 9, -2], ['camp', 3, -5]]], ['idle', 2]] },
    /* SOURCE: Rangifer tarandus — shoulder 0.94–1.1 m, body 1.6–1.9 m, 80–120 kg; both sexes carry antlers.
       DERIVED: walk at Fr 0.12 (a grazing plod); Hildebrand lateral-sequence walk, lag 0.25, duty 0.7 */
    ...[[21, 9, 0, 1], [27, 12, 180, 2], [31, 6, 0, 3], [24, 4, 180, 4], [35, 10, 180, 5]].map(([dx, dy, face, k]) => ({
      id: 'deer' + k, type: 'reindeer', kind: 'quad', at: ['camp', dx, dy], face, seed: k * 7,
      shoulderH: 1.0 + 0.06 * (k % 3), length: 1.0, chest: 0.5, width: 0.36, neck: 0.42, neckUp: 35, head: 0.36, tail: 0.14, ears: 0.12,
      mass: 95, fr: 0.12, duty: 0.7, lag: 0.25, legW: 2,
      coat: 'coat', belly: 'pale', legs: 'leg', hoof: 'leg', muzzle: 'leg', antlers: { kind: 'branch', span: 0.55 + 0.1 * (k % 2), mat: 'pole' },
      plan: k % 2 ? [['idle', 5 + k], ['walk', [['camp', dx + 5, dy - 1]]], ['idle', 4], ['big', 'toss'], ['walk', [['camp', dx, dy]]], ['idle', 3]]
        : [['idle', 7 + k], ['big', 'toss'], ['idle', 3], ['walk', [['camp', dx - 4, dy + 2]]], ['idle', 5], ['walk', [['camp', dx, dy]]]],
    })),
  ],
  life: {
    smoke: [{ on: 'hearth', every: 0.9, life: 4, rise: 0.7, spread: 2, dy: 0.3 }, { on: 'lavvu', top: true, every: 0.6, life: 7, rise: 0.6, spread: 4 }, { on: 'lavvu2', top: true, every: 0.9, life: 6, rise: 0.5 }],
    fires: [{ on: 'hearth', r: 0.35, dy: 0.1 }],
    drift: [{ mat: 'snow', count: 90, carry: 1.6, fall: 0, low: true, streak: true }],
  },
  player: 'herder',
  tour: { duration: 24, follow: 'herder' },
});
