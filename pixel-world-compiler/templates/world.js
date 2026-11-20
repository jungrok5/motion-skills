/* world.js — a world is tables. Replace every row with your topic's, each with its authority:
   SOURCE (measured; mark informal ranges), DERIVED (say from what), or TASTE (a choice, named once).
   The compiler derives every pixel from these rows; nothing here is a colour or a pixel count.
   Reference: <skill>/references/API.md. Laws: <skill>/references/LAWS.md. */
FW.world({
  name: 'New world',
  seed: 1,
  size: [80, 80],                       // metres east × north (the near edge is Y = 0)
  sun: { lat: 45, decl: 10, hour: -2 }, // SOURCE: latitude; declination of the season; hours from solar noon
  wind: { toward: 90, speed: 3 },       // compass degrees the wind blows toward, m/s — one axis drives sway, smoke, drift

  /* spectral reflectance per R G B band (not display colours) and how many rungs each surface may take */
  materials: {
    grass:  { albedo: [0.08, 0.19, 0.06], rungs: 3, src: 'mesic grass (informal)' },
    soil:   { albedo: [0.32, 0.25, 0.17], rungs: 3, src: 'dry loam path (informal)' },
    pond:   { kind: 'water', albedo: [0.25, 0.28, 0.2], depth: 1.5, rungs: 3, src: 'clear pond over silt; Pope & Fry absorption' },
    leaf:   { albedo: [0.05, 0.14, 0.04], rungs: 3, src: 'broadleaf canopy (informal)' },
    bark:   { albedo: [0.2, 0.16, 0.12], rungs: 2, src: 'bark (informal)' },
    wall:   { albedo: [0.55, 0.5, 0.42], rungs: 3, src: 'limewash over stone' },
    roof:   { albedo: [0.4, 0.17, 0.1], rungs: 3, src: 'fired clay tile' },
    cloth:  { albedo: [0.4, 0.1, 0.08], rungs: 3, src: 'madder-dyed wool' },
    skin:   { albedo: [0.38, 0.245, 0.19], rungs: 2, src: 'Anderson & Parrish 1981' },
    hair:   { albedo: [0.115, 0.075, 0.05], rungs: 2, src: 'brown keratin' },
    hide:   { albedo: [0.3, 0.2, 0.12], rungs: 3, src: 'animal coat (informal)' },
    smoke:  { albedo: [0.52, 0.52, 0.54], rungs: 3, shade: 0.8, src: 'wood smoke, near-neutral' },
  },
  cover: { grass: 0.7, leaf: 0.2, soil: 0.1 }, // DERIVED: exposure adapts to what the eye sees most

  terrain: { relief: 1.5, scale: 30, lakes: { level: 0.28, scale: 26, depth: 1.5 } },
  ground: [ // first match wins; f = { elev, depth, kind, shore, moist, trail, n, … }
    ['pond', (f) => f.depth > 0],
    ['soil', (f) => f.trail < 0, { grain: 0.15 }],
    ['grass', () => true, { grain: 0.15, tuft: { mat: 'leaf', h: 0.12, cell: 0.6, density: 0.3 } }],
  ],
  places: [{
    id: 'home', clear: 7, flat: 0.8,
    site: (f) => (f.shore > 5 && f.shore < 20 ? -Math.abs(f.shore - 10) : null), // TASTE: near water, not in it
    props: [{ form: 'house', spec: { w: 6, d: 4, h: 2.6, pitch: 35, wall: 'wall', roof: 'roof', trim: 'bark', windows: 1 }, at: [0, 0], tag: 'house' }],
  }],
  trails: [{ pts: [['home', 0, -3], ['home', 4, -20]], width: 1 }],
  flora: [{ id: 'oak', form: 'tree', cell: 10, variants: 3, spec: { form: 'broadleaf', height: 9, crown: 7, trunk: 0.5, clear: 2.5, bark: 'bark', leaf: 'leaf' },
    where: (f) => f.depth === 0 && f.shore > 2, density: 0.5 }],
  cast: [
    { id: 'walker', kind: 'human', at: ['home', 1, -4], face: 270, mass: 65, fr: 0.18, skin: 'skin', hair: 'hair', coat: 'cloth', legs: 'hide', boots: 'hair', carry: 'soil',
      plan: [['idle', 3], ['walk', [['home', 3, -12]]], ['big', 'lift'], ['walk', [['home', 1, -4]]], ['idle', 2]] },
    { id: 'goat', kind: 'quad', at: ['home', 6, -8], face: 180, shoulderH: 0.7, length: 0.7, chest: 0.36, neck: 0.3, head: 0.24, tail: 0.1, mass: 50, fr: 0.15,
      coat: 'hide', legs: 'hide', hoof: 'hair', plan: [['idle', 5], ['walk', [['home', 9, -8]]], ['big', 'toss'], ['walk', [['home', 6, -8]]], ['idle', 3]] },
  ],
  life: { smoke: [{ on: 'house', top: true }] },
  player: 'walker',
  tour: { duration: 16, follow: 'walker' },
});
