// cheongryong · 20_flora — the plants of a Korean mountain valley in late October, built with DR.flora (lib/40_flora.js).
//   Flora.pine       소나무 · Korean red pine: S-curved leaning trunk, plated bark turning orange-red aloft, a few long
//                    zig-zag limbs carrying flat-topped pads of needle tufts.  4 variants: umbrella, windswept, young, old giant.
//   Flora.cliffPine  the same tree growing OUT of a rock face and turning up (sites need n = the wall's normal).
//   Flora.maple      단풍나무 · forked grey stems, level tiers of small palmate leaves; site.tint 0..1 picks crimson → gold → green.
//   Flora.oak        신갈나무 · rounder russet / ochre crown to mix into the slopes.
//   Flora.grass      억새 · silver plume grass clumps;  Flora.turf short grass;  Flora.fern;  Flora.shrub;  Flora.reed (shore).
// Every entry is a DR.flora species:  Flora.x.plant(scene, sites, { near })  and  Flora.x.stats.
// Nothing is built until a species is first planted (or Flora.x.init() is called).
const Flora = {};
{
  const F = DR.flora, P = F.paint, V = DR.vec, { lerp, sat, TAU } = DR;
  const once = (fn) => { let v; return () => v || (v = fn()); };
  const near = (pts, x, y, d) => pts.every((q) => Math.hypot(q[0] - x, q[1] - y) > d);
  // join points into a twig tree: each goes to its nearest neighbour that is closer to the foot
  const twigs = (ctx, pts, foot, w, ink) => { const s = pts.map((p) => [p[0], p[1], Math.hypot(p[0] - foot[0], p[1] - foot[1])]).sort((a, b) => a[2] - b[2]);
    s.forEach((p, i) => { let q = foot, bd = p[2] * 0.9; for (let j = 0; j < i; j++) { const d = Math.hypot(s[j][0] - p[0], s[j][1] - p[1]); if (d < bd) { bd = d; q = s[j]; } }
      P.twig(ctx, [[q[0], q[1]], [(q[0] + p[0]) / 2 + (p[1] - q[1]) * 0.08, (q[1] + p[1]) / 2], [p[0], p[1]]], w * (1.6 - i / s.length), w * 0.7, ink); }); };

  // ════ pine ════
  // atlas: cells 0, 1 = a pad seen from above (tufts as stars on a forking twig) · 2, 3 = a row of upright tufts on a flat base
  const pineAtlas = once(() => F.atlas({ size: 2048, cells: [2, 2], seed: 11, draw: (ctx, i, rng, S) => {
    const lw = S / 1024, pts = [], wood = P.ink(0.6, 0.9, 1), ph = rng() * 9, tuft = { shade: [0.2, 1], w: 1.45 * lw, core: 0.5, len0: 0.55 };
    if (i < 2) {
      for (let t = 0; t < 12000 && pts.length < 230; t++) { const a = rng() * TAU, lim = S * (0.5 * (0.84 + 0.16 * DR.noise1(a * 1.4 + ph, 4)) - 0.055), rr = Math.sqrt(rng()) * lim, x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr; if (near(pts, x, y, S * 0.042)) pts.push([x, y]); }
      twigs(ctx, pts, [S / 2, S * 0.985], 4.5 * lw, wood);
      for (const p of pts) P.needles(ctx, p[0], p[1], S * rng.range(0.046, 0.06), rng() * TAU, TAU, 84, rng, { ...tuft, hue: 0.5 + rng.gauss() * 0.13 });
    } else {
      for (let t = 0; t < 12000 && pts.length < 150; t++) { const x = rng.range(0.07, 0.93), top = 0.13 + 0.3 * Math.pow(Math.abs(x - 0.5) * 2, 2.6) + 0.07 * DR.noise1(x * 5 + ph, 2), y = rng.range(top, 0.9); if (near(pts, x * S, y * S, S * 0.05)) pts.push([x * S, y * S]); }
      twigs(ctx, pts, [S / 2, S * 0.99], 4.5 * lw, wood);
      pts.sort((a, b) => a[1] - b[1]);
      for (const p of pts) P.needles(ctx, p[0], p[1] + S * 0.02, S * rng.range(0.058, 0.074), (p[0] / S - 0.5) * 1.0 + rng.gauss() * 0.25, 3.3, 76, rng, { ...tuft, hue: 0.5 + rng.gauss() * 0.13 });
    }
  } }));
  const pineBark = once(() => F.bark({ kind: 'plates', size: 512, seed: 4, cols: 4, rows: 4, layers: 5 }));
  const pineRamp = once(() => F.ramp([[0, '#132a22'], [0.3, '#20412d'], [0.55, '#355c30'], [0.8, '#5f7a38'], [1, '#806a3c']]));
  const pineLeaf = () => ({ ramp: pineRamp(), wood: '#4a2c1c', wood2: '#8a4424', hueSpread: 0.7, sprayHue: 0.14, shade: [0.42, 1.12], through: [0.6, 1.3], scatter: 0.2, cardMix: 0.22, hueMottle: 0.2, wind: { flex: 0.32, bough: 0.34, bob: 0.05, flutter: 0.008 } });
  const pineBarkM = () => ({ tex: pineBark(), low: ['#231915', '#8a766a'], high: ['#6b2c16', '#d07a45'], grade: [0.3, 0.62], bump: 0.9, moss: ['#6d7350', 0.5], wind: { flex: 0.32, bough: 0.34, bob: 0.05 } });
  // the pads: on every anchor a level "plate" of tufts and upright rows standing on it → flat base, bumpy top
  const pinePads = (anchors, rng, k = 1) => F.foliage(anchors, { clumpDrop: 0.9, centerY: 0.2, normal: { card: 0.18, clump: 0.85, crown: 0.12, up: 0.5 }, ao: { k: 0.55, min: 0.34, inner: 0.1 },
    layers: [
      { n: 1.0 * k, size: [1.55, 2.15], orient: 'flat', tilt: 0.26, yaw: 0.9, lift: [0.15, 0.35], spread: [0.35, 0.08], cells: [0, 1], loose: 0.12 },
      { n: 1.6 * k, size: [1.3, 1.8], aspect: [0.52, 0.68], orient: 'up', tilt: 0.42, sink: 0.14, spread: [0.5, 0.08], lift: -0.05, cells: [2, 3], loose: 0.15 },
      { n: 0.3 * k, size: [1.1, 1.5], orient: 'flat', tilt: 0.7, lift: [0.0, 0.25], spread: [0.5, 0.1], cells: [0, 1], loose: 0.12 },
    ] }, rng);
  // variant → numbers.  lean (rad), H (m), limbs from (share of the trunk), limb length (m, low → high on the trunk)
  const PINES = [
    { H: [12, 13.5], r: 0.33, lean: [0.06, 0.14], wander: 0.2, sway: [0.55, 1.15], limbs: [8, 9], from: 0.6, len: [6.2, 3.0], lee: 0 },      // old umbrella
    { H: [10.5, 12], r: 0.3, lean: [0.34, 0.46], wander: 0.24, sway: [0.5, 1.0], limbs: [7, 8], from: 0.56, len: [5.8, 2.6], lee: 1 },      // leaning, windswept
    { H: [8.5, 10], r: 0.21, lean: [0.05, 0.14], wander: 0.2, sway: [0.3, 1.4], limbs: [8, 9], from: 0.46, len: [3.6, 1.7], lee: 0 },       // young, slender
    { H: [14, 15.5], r: 0.4, lean: [0.12, 0.22], wander: 0.26, sway: [0.9, 1.3], limbs: [8, 9], from: 0.62, len: [6.8, 3.2], lee: 0.4 },    // old giant with a double bend
  ];
  const pineSkel = (rng, q, o = {}) => { const lean = rng.range(q.lean[0], q.lean[1]);
    return F.skeleton({ group: 1, base: o.base, dir: o.dir || [0, Math.cos(lean), Math.sin(lean)], levels: [
      { len: q.H, r: q.r * 1.1, end: 0.36, taper: 0.9, flare: 0.55, seg: o.seg || 16, wander: q.wander, wanderFreq: 2.3, sway: q.sway, up: o.up ?? 0.05, leaf: { from: 0.95, step: 0.7 } },
      { n: q.limbs, from: q.from, to: 0.985, jit: 0.7, len: (c, r) => lerp(q.len[0], q.len[1], Math.pow(sat((c.u - q.from) / (1 - q.from)), 0.8)) * r.range(0.6, 1.2), angle: (c, r) => lerp(1.32, 0.62, Math.pow(sat((c.u - q.from) / (1 - q.from)), 1.3)) + r.gauss() * 0.12,
        azi: q.lee ? (c, r) => (r() < 0.25 + 0.75 * (1 - q.lee) ? r() * TAU : r.gauss() * 0.9) : undefined, aziJit: 1.1,
        r: [0.36, 0.48], end: 0.22, seg: 8, wander: 0.2, kink: { every: 2, angle: [0.3, 0.62], flip: 0.75, lift: [-0.02, 0.07] }, up: (s) => -0.02 + 0.08 * s * s, flat: (s) => 0.1 + 0.6 * s, loose: 0.55, leaf: { from: 0.42, step: 1.05 } },
      { n: [4, 5], from: 0.25, to: 0.95, azi: 'alt', roll: 0.28, angle: [0.65, 1.1], len: [1.1, 2.2], lenBy: (u) => 1.15 - 0.55 * u, r: 0.55, end: 0.3, seg: 3, wander: 0.3, up: 0.05, loose: 0.3, leaf: { from: 0.45, step: 0.95 } },
    ] }, rng); };
  // a few dead stubs on the bare lower trunk
  const stubs = (sk, rng, n) => { const t = sk.branches[0]; for (let i = 0; i < n; i++) { const a = sk.sample(t, rng.range(0.22, 0.5)), ang = rng() * TAU, d = V.norm([Math.cos(ang), rng.range(-0.1, 0.35), Math.sin(ang)]), L = rng.range(0.35, 0.9), r = a.r * rng.range(0.16, 0.26);
    sk.branches.push({ id: sk.branches.length, lv: 2, pts: [a.p, V.mad(a.p, d, L * 0.5), V.mad(V.mad(a.p, d, L), [0, 1, 0], -0.06)], rad: [r, r * 0.8, r * 0.5], loose: [0, 0, 0], dirs: [d, d, d], len: L }); } };
  const pineWood = { full: { sides: [10, 6, 4], tile: [0.62, 1.9], twist: 0.1 }, mid: { maxLevel: 1, sides: [6, 4], skip: 2, tile: [0.62, 1.9] } };
  Flora.pine = F.species({ name: 'pine', variants: 4, seed: 21, atlas: pineAtlas, leaf: pineLeaf, bark: pineBarkM, wood: pineWood,
    lod: { mid: 55, far: 150, keep: 0.36, grow: 1.32, px: 256, gain: 1.7 }, hue: (r) => r.range(0.34, 0.52), bright: [0.85, 1.1], slope: 0.1,
    build: (rng, v) => { const sk = pineSkel(rng, PINES[v]); stubs(sk, rng, v === 2 ? 2 : 4); return { wood: sk, foliage: pinePads(sk.anchors, rng) }; } });
  // out of the wall (+z = the wall's normal), then up: a short trunk with a strong pull to the light
  Flora.cliffPine = F.species({ name: 'cliffPine', variants: 3, seed: 33, atlas: pineAtlas, leaf: pineLeaf, bark: () => ({ ...pineBarkM(), grade: [0.05, 0.5] }), wood: pineWood, orient: 'wall',
    lod: { mid: 60, far: 160, keep: 0.4, grow: 1.32, px: 256, gain: 1.7 }, hue: (r) => r.range(0.34, 0.52),
    build: (rng, v) => { const q = { H: [[5.5, 6.5], [4.2, 5], [6.5, 7.5]][v], r: [0.2, 0.16, 0.23][v], lean: [0, 0], wander: 0.34, limbs: [[5, 6], [4, 5], [6, 7]][v], from: 0.42, len: [[3.2, 1.7], [2.6, 1.4], [3.6, 1.8]][v], lee: 0.55 };
      const sk = pineSkel(rng, q, { base: [0, 0, -0.5], dir: [rng.range(-0.3, 0.3), rng.range(-0.15, 0.2), 1], up: (s) => 0.12 + 0.75 * s * (1 - 0.45 * s), seg: 12 });
      return { wood: sk, foliage: pinePads(sk.anchors, rng, 1.1) }; } });

  // ════ maple ════
  const palm = [P.shapes.palmate(7, 0.6, 0.2), P.shapes.palmate(7, 0.66, 0.17), P.shapes.palmate(5, 0.55, 0.22, 1.75)];
  const mapleAtlas = once(() => F.atlas({ size: 2048, cells: [2, 2], seed: 41, draw: (ctx, i, rng, S) => {
    // a ragged round spray: leaf clusters on a forking twig, every cluster fanning away from the stem foot
    const lw = S / 1024, leaves = [], pts = [], ph = rng() * 9, foot = [S / 2, S * 0.985], dens = i === 3 ? 0.064 : 0.056;
    for (let t = 0; t < 16000 && pts.length < 250; t++) { const a = rng() * TAU, lim = S * (0.5 * (0.8 + 0.2 * DR.noise1(a * 1.9 + ph, 4) + 0.07 * DR.noise1(a * 6 + ph, 8)) - 0.045), rr = Math.sqrt(rng()) * lim, x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr; if (near(pts, x, y, S * dens * (0.8 + 0.5 * rng()))) pts.push([x, y]); }
    twigs(ctx, pts, foot, 3.4 * lw, P.ink(0.5, 0.2, 1));
    for (const p of pts) { const ang = Math.atan2(p[0] - foot[0], foot[1] - p[1]), n = 2 + Math.floor(rng() * 2); for (let k = 0; k < n; k++) leaves.push([p[0], p[1], ang + (k - (n - 1) / 2) * 1.5 + rng.gauss() * 0.5]); }
    for (let k = leaves.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)), t = leaves[k]; leaves[k] = leaves[j]; leaves[j] = t; }
    leaves.forEach((l, k) => { const f = k / leaves.length, odd = rng(); P.leaf(ctx, l[0], l[1], S * rng.range(0.035, 0.05), l[2], palm[Math.floor(rng() * 3)],
      { shade: 0.3 + 0.52 * f + 0.18 * rng(), hue: sat(0.5 + rng.gauss() * 0.17 + (odd < 0.06 ? 0.4 : odd > 0.95 ? -0.35 : 0)), veins: 7, veinW: 1.0 * lw }); });
  } }));
  const mapleRamp = once(() => F.ramp([[0, '#3d080d'], [0.16, '#74101a'], [0.34, '#a81f18'], [0.5, '#c4481a'], [0.64, '#cf7a1e'], [0.78, '#cfa42e'], [0.9, '#93993a'], [1, '#4f7a2e']]));
  const mapleBark = once(() => F.bark({ kind: 'smooth', size: 256, seed: 9 }));
  const MAPLES = [{ stems: [3, 4], trunk: [1.0, 1.5], len: [3.3, 4.3], ang: [0.4, 0.75] }, { stems: [2, 3], trunk: [1.5, 2.2], len: [3.6, 4.6], ang: [0.3, 0.6] }, { stems: [4, 5], trunk: [0.5, 0.9], len: [3.0, 3.8], ang: [0.5, 0.9] }];
  Flora.maple = F.species({ name: 'maple', variants: 3, seed: 51, atlas: mapleAtlas, wood: { full: { sides: [8, 6, 4, 3], tile: [0.5, 1.0] }, mid: { maxLevel: 2, minRad: 0.02, sides: [5, 4, 3], skip: 2, tile: [0.5, 1.0] } },
    leaf: () => ({ ramp: mapleRamp(), wood: '#3a332c', hueSpread: 0.34, sprayHue: 0.16, shade: [0.5, 1.1], through: [1.05, 1.7], scatter: 0.34, cardMix: 0.32, far: [0.3, 40, 240], wind: { flex: 0.5, bough: 0.6, bob: 0.07, flutter: 0.016 } }),
    bark: () => ({ tex: mapleBark(), low: ['#26221f', '#7b746b'], high: ['#2a2420', '#6f655a'], bump: 0.6, moss: ['#66704a', 0.35], wind: { flex: 0.5, bough: 0.6, bob: 0.07 } }),
    lod: { mid: 50, far: 130, keep: 0.36, grow: 1.35, px: 256, gain: 1.5 }, bright: [0.88, 1.12],
    hue: (r) => { const q = r(); return q < 0.6 ? r.range(0.14, 0.42) : q < 0.86 ? r.range(0.45, 0.7) : r.range(0.74, 0.95); },
    build: (rng, v) => { const q = MAPLES[v];
      const sk = F.skeleton({ group: 2, levels: [
        { len: q.trunk, r: [0.12, 0.16], end: 0.8, flare: 0.35, seg: 4, wander: 0.2 },
        { n: q.stems, from: 0.75, to: 1, angle: q.ang, len: q.len, r: 0.72, end: 0.22, seg: 7, wander: 0.3, up: 0.1, loose: 0.3 },
        { n: [5, 7], from: 0.28, to: 1, angle: [0.95, 1.4], aziJit: 1.2, len: [1.4, 2.5], lenBy: (u) => 1.2 - 0.5 * u, r: 0.5, end: 0.25, seg: 4, wander: 0.35, flat: 0.9, up: 0.03, kink: { every: 2, angle: [0.15, 0.4] }, loose: 0.4, leaf: { from: 0.4, step: 0.62 } },
        { n: [2, 3], from: 0.3, to: 0.9, azi: 'alt', roll: 0.35, angle: [0.7, 1.1], len: [0.6, 1.2], r: 0.55, seg: 2, wander: 0.3, flat: 0.6, loose: 0.3, leaf: { from: 0.55, step: 0.6 } },
      ] }, rng);
      return { wood: sk, foliage: F.foliage(sk.anchors, { clumpDrop: 0.5, centerY: 0.3, normal: { card: 0.3, clump: 0.45, crown: 0.5, up: 0.35 }, ao: { k: 0.5, min: 0.28, inner: 0.4 },
        layers: [ { n: 1.7, size: [1.0, 1.45], orient: 'flat', tilt: 0.55, yaw: 0.8, droop: [0.1, 0.7], spread: [0.4, 0.2], lift: 0.05, cells: [0, 1, 2, 3], loose: 0.2 },
                  { n: 0.5, size: [0.8, 1.15], orient: 'flat', tilt: 1.0, droop: [0.3, 1.0], spread: [0.35, 0.2], lift: -0.12, cells: [0, 1, 2, 3], loose: 0.25 } ] }, rng) }; } });

  // ════ oak ════
  const oakShape = [P.shapes.lobed(0.3, 4, 0.26), P.shapes.lobed(0.26, 5, 0.3)];
  const oakAtlas = once(() => F.atlas({ size: 1024, cells: [2, 2], seed: 61, draw: (ctx, i, rng, S) => {
    const lw = S / 512, pts = [], leaves = [];
    for (let t = 0; t < 1500 && pts.length < 30; t++) { const a = rng() * TAU, rr = Math.sqrt(rng()) * S * 0.39, x = S / 2 + Math.cos(a) * rr, y = S * 0.48 + Math.sin(a) * rr; if (near(pts, x, y, S * 0.105)) pts.push([x, y]); }
    twigs(ctx, pts, [S / 2, S * 0.985], 3.6 * lw, P.ink(0.5, 0.3, 1));
    for (const p of pts) { const n = 6 + Math.floor(rng() * 3), a0 = rng() * TAU; for (let k = 0; k < n; k++) leaves.push([p[0], p[1], a0 + (k / n) * TAU + rng.gauss() * 0.25, rng.range(0.095, 0.125)]); }
    for (let k = leaves.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)), t = leaves[k]; leaves[k] = leaves[j]; leaves[j] = t; }
    leaves.forEach((l, k) => P.leaf(ctx, l[0], l[1], S * l[3], l[2], oakShape[k % 2], { shade: 0.36 + 0.5 * k / leaves.length + 0.14 * rng(), hue: sat(0.5 + rng.gauss() * 0.18), veins: 1, veinW: 1.4 * lw }));
  } }));
  Flora.oak = F.species({ name: 'oak', variants: 2, seed: 71, atlas: oakAtlas, wood: { full: { sides: [9, 6, 4], tile: [0.7, 1.4] }, mid: { maxLevel: 1, sides: [6, 4], skip: 2, tile: [0.7, 1.4] } },
    leaf: () => ({ ramp: F.ramp([[0, '#3f2613'], [0.25, '#6e3a16'], [0.5, '#a8621e'], [0.7, '#c28f2c'], [0.86, '#c7ad3c'], [1, '#6f7f30']]), wood: '#33291f', hueSpread: 0.4, sprayHue: 0.18, shade: [0.5, 1.1], through: [0.8, 1.3], scatter: 0.26, cardMix: 0.3, wind: { flex: 0.4, bough: 0.5, bob: 0.06, flutter: 0.014 } }),
    bark: () => ({ tex: F.bark({ kind: 'furrows', size: 256, seed: 6, cols: 5 }), low: ['#14110e', '#5e554b'], high: ['#191512', '#62584c'], bump: 1.6, moss: ['#5f6a42', 0.4], wind: { flex: 0.4, bough: 0.5, bob: 0.06 } }),
    lod: { mid: 50, far: 130, keep: 0.36, grow: 1.35, px: 256 }, hue: (r) => r.range(0.25, 0.75),
    build: (rng) => { const sk = F.skeleton({ group: 1, levels: [
        { len: [9, 11], r: [0.24, 0.3], end: 0.25, flare: 0.5, seg: 10, wander: 0.12, up: 0.04, leaf: { from: 0.9, step: 0.8 } },
        { n: [7, 9], from: 0.32, to: 0.97, angle: (c, r) => lerp(1.35, 0.6, c.u) + r.gauss() * 0.15, len: [2.8, 4.6], lenBy: (u) => 1.25 - 0.7 * Math.abs(u - 0.5) * 2 * 0.6, r: 0.45, end: 0.2, seg: 6, wander: 0.3, up: 0.07, kink: { every: 2, angle: [0.2, 0.45] }, loose: 0.4, leaf: { from: 0.4, step: 0.85 } },
        { n: [3, 4], from: 0.35, to: 0.95, angle: [0.6, 1.1], len: [1.0, 1.9], r: 0.5, seg: 2, wander: 0.3, up: 0.1, loose: 0.3, leaf: { from: 0.5, step: 0.75 } } ] }, rng);
      return { wood: sk, foliage: F.foliage(sk.anchors, { clumpDrop: 0.7, normal: { card: 0.3, clump: 0.5, crown: 0.6, up: 0.3 }, ao: { k: 0.4, min: 0.38, inner: 0.3 },
        layers: [ { n: 1.2, size: [1.5, 2.1], orient: 'out', tilt: 0.55, spread: [0.45, 0.3], cells: [0, 1, 2, 3], loose: 0.2 }, { n: 0.9, size: [1.4, 1.9], orient: 'flat', tilt: 0.6, droop: [0, 0.4], spread: [0.4, 0.25], cells: [0, 1, 2, 3], loose: 0.2 } ] }, rng) }; } });

  // ════ ground cover ════  one atlas of tall cells (256 × 512): 0,1 plume-grass blades · 2,3 plumes on stalks · 4 short grass · 5 fern frond · 6 shrub spray · 7 reed
  // hue on the ramp: 0 deep green … 0.55 olive straw … 0.75 straw … 1 silver
  const fan = (ctx, rng, w, h, n, hue, spread, hmin = 0.5) => { for (let k = 0; k < n; k++) { const t = (k / (n - 1)) * 2 - 1 + (rng() - 0.5) * 0.2, hh = h * (hmin + (0.97 - hmin) * rng()) * (1 - 0.38 * t * t), x0 = w / 2 + t * w * 0.07;
    P.blade(ctx, x0, h * 0.995, w / 2 + t * w * spread * (0.55 + 0.45 * rng()), h * 0.995 - hh, t * w * 0.16 * rng(), w * rng.range(0.03, 0.055), P.ink(0.4 + 0.6 * rng() * (0.5 + 0.5 * k % 2), lerp(hue[0], hue[1], rng()))); } };
  const groundAtlas = once(() => F.atlas({ size: 1024, cells: [4, 2], seed: 81, draw: (ctx, i, rng, w, h) => {
    const lw = w / 256;
    if (i < 2) fan(ctx, rng, w, h, 90, [0.25, 0.7], 0.47);
    else if (i < 4) { fan(ctx, rng, w, h, 50, [0.3, 0.7], 0.45, 0.3);
      for (let k = 0; k < 4; k++) { const x1 = w * rng.range(0.2, 0.8), y1 = h * rng.range(0.17, 0.36), lean = (x1 / w - 0.5) * 1.2 + rng.gauss() * 0.15;
        P.twig(ctx, [[w / 2 + (x1 - w / 2) * 0.15, h * 0.99], [(w / 2 + x1) / 2, h * 0.65], [x1, y1]], 3 * lw, 2 * lw, P.ink(0.8, 0.72, 0.25));
        
        P.needles(ctx, x1, y1, h * rng.range(0.12, 0.16), lean + 0.35, 0.6, 26, rng, { shade: [0.5, 0.92], hue: 0.9, hueVar: 0.07, w: 1.5 * lw, core: 0, len0: 0.45, curve: 0.7 }); } }
    else if (i === 4) fan(ctx, rng, w, h, 100, [0.2, 0.62], 0.48, 0.45);
    else if (i === 5) { const sh = P.shapes.lance(0.085); let x = w / 2, a = 0; const st = []; for (let k = 0; k <= 44; k++) { st.push([x, h * (0.99 - 0.94 * k / 44)]); a += 0.004; x += a * h * 0.018; }
      st.forEach((p, k) => { if (k < 4) return; const f = k / 44, L = w * 0.47 * Math.pow(Math.sin(Math.PI * Math.pow(f, 0.75)), 0.8) + 3; for (const sd of [-1, 1]) P.leaf(ctx, p[0], p[1], L, sd * (1.25 - 0.35 * f), sh, { shade: 0.5 + 0.5 * rng(), hue: 0.4 + rng.gauss() * 0.12, veins: 1, veinW: lw }); });
      P.twig(ctx, st, 3 * lw, 1.2 * lw, P.ink(0.5, 0.6, 0.5)); }
    else if (i === 6) { const sh = P.shapes.ovate(0.3), pts = []; for (let t = 0; t < 500 && pts.length < 34; t++) { const x = rng.range(0.1, 0.9) * w, y = rng.range(0.08, 0.9) * h; if (near(pts, x, y, w * 0.13)) pts.push([x, y]); }
      twigs(ctx, pts, [w / 2, h * 0.99], 2.4 * lw, P.ink(0.45, 0.3, 1));
      for (const p of pts) for (let k = 0; k < 4; k++) P.leaf(ctx, p[0], p[1], w * rng.range(0.14, 0.2), rng() * TAU, sh, { shade: 0.45 + 0.55 * rng(), hue: sat(0.45 + rng.gauss() * 0.2), veins: 1, veinW: lw }); }
    else { const sh = P.shapes.lance(0.07); for (let k = 0; k < 6; k++) { const x0 = w * (0.2 + 0.6 * (k + rng()) / 6), x1 = x0 + rng.gauss() * w * 0.08, y1 = h * rng.range(0.14, 0.34), ink = P.ink(0.7 + 0.3 * rng(), 0.68 + rng() * 0.1, 0.2);
        for (let q = 2; q < 7; q++) { const f = q / 8; P.leaf(ctx, lerp(x0, x1, f), lerp(h * 0.99, y1, f), h * rng.range(0.2, 0.3), (q % 2 ? 1 : -1) * rng.range(0.25, 0.6), sh, { shade: 0.5 + 0.5 * rng(), hue: 0.5 + rng.gauss() * 0.12 }); }
        P.twig(ctx, [[x0, h * 0.99], [x1, y1]], 3.4 * lw, 2.2 * lw, ink);
        if (k % 3 !== 2) { P.needles(ctx, x1, y1 + h * 0.01, h * 0.11, rng.gauss() * 0.3 + 0.4, 1.3, 22, rng, { shade: [0.5, 0.85], hue: 0.9, w: 5 * lw, core: 0.35, alpha: 0.8, curve: 0.6 }); } } }
  } }));
  const groundRamp = once(() => F.ramp([[0, '#27441f'], [0.3, '#56732f'], [0.55, '#99924c'], [0.75, '#c8b47a'], [1, '#e2dac6']]));
  const tuft = (name, o) => F.tufts({ name, atlas: groundAtlas, seed: 90 + name.length, ...o, leaf: { ramp: groundRamp(), wood: '#6b5a44', wood2: '#8a7654', hueSpread: 1, sprayHue: 0.1, shade: [0.5, 1.1], far: [0.3, 20, 120], ...o.leaf } });
  Flora.grass = tuft('grass', { n: [6, 8], w: [1.0, 1.4], h: [1.5, 2.0], cells: [0, 2, 3, 1, 2, 3], radius: 0.22, lean: [0.08, 0.38], hue: (r) => r.range(0.46, 0.56),
    leaf: { through: [1.2, 2.2], scatter: 0.45, wind: { flex: 1.3, bough: 0.1, bob: 0.02, flutter: 0.02 } }, lod: { mid: 35, far: 90, cull: 260, keep: 0.6 } });
  Flora.turf = tuft('turf', { n: [4, 5], w: [0.6, 0.9], h: [0.3, 0.5], cells: [4], radius: 0.25, lean: [0.1, 0.5], hue: (r) => r.range(0.3, 0.55),
    leaf: { through: [0.8, 1.2], scatter: 0.3, wind: { flex: 1.6, bough: 0.02, bob: 0.01, flutter: 0.01 } }, lod: { mid: 18, far: 40, cull: 90, keep: 0.6, farShadow: false } });
  Flora.fern = tuft('fern', { n: [6, 8], w: [0.4, 0.55], h: [0.8, 1.1], cells: [5], radius: 0.04, lean: [0.1, 0.25], flat: [0.75, 1.15], normalUp: 0.7, hue: (r) => r.range(0.3, 0.6),
    leaf: { through: [0.9, 1.2], scatter: 0.3, wind: { flex: 0.8, bough: 0.05, bob: 0.03, flutter: 0.012 } }, lod: { mid: 20, far: 45, cull: 110 } });
  Flora.shrub = tuft('shrub', { n: [5, 7], w: [0.8, 1.2], h: [0.7, 1.1], cells: [6], radius: 0.2, lean: [0.2, 0.7], normalUp: 0.7, hue: (r) => r.range(0.28, 0.7),
    leaf: { through: [0.9, 1.3], scatter: 0.3, wind: { flex: 0.6, bough: 0.1, bob: 0.03, flutter: 0.012 } }, lod: { mid: 30, far: 70, cull: 200 } });
  Flora.reed = tuft('reed', { n: [4, 6], w: [0.9, 1.2], h: [2.0, 2.6], cells: [7], radius: 0.3, lean: [0.0, 0.14], hue: (r) => r.range(0.44, 0.56),
    leaf: { through: [1.0, 1.6], scatter: 0.4, wind: { flex: 0.9, bough: 0.05, bob: 0.02, flutter: 0.012 } }, lod: { mid: 35, far: 90, cull: 240 } });
  Flora.all = ['pine', 'cliffPine', 'maple', 'oak', 'grass', 'turf', 'fern', 'shrub', 'reed'];
  Flora.report = () => Flora.all.map((k) => Flora[k].stats).filter((s) => s.variants.length);
}
