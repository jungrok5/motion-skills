// mods/ship.js — 「Low Tide」's body: a 110 m feeder container ship that walks.
// Walker-local frame: origin = keel bottom midships, +X = bow, +Y up, hull 0..HULL_D, main deck at HULL_D.
// Built with engine/kit.js batches (a handful of merged meshes) + instanced containers. Loose parts (anchor chain,
// mooring ropes, kelp, laundry, flag) hang on pivots that swing with engine/kit.js lagSwing(): they lag the body's
// roll and overshoot it (follow-through), computed in closed form from the gait — no state between frames.
import * as THREE from 'three';
import { Kit, windowColour, lagSwing } from '../engine/kit.js';

export async function create(ctx) {
  const { walker, CFG, gait, Mats } = ctx;
  const T0 = performance.now();
  const K = new Kit(ctx, 0x5a11);
  const { rnd, chance } = { rnd: (a, b) => K.rnd(a, b), chance: (p) => K.chance(p) };
  const SS = THREE.MathUtils.smoothstep;
  const lin = (h, k = 1) => K.lin(h, k);
  const root = new THREE.Group(); root.name = 'ship'; walker.add(root);
  const D = CFG.HULL_D, B2 = CFG.BODY_DEPTH / 2, XS = -57, XB = 55;   // stern overhang to bow stem

  // ------------------------------------------------------------------ hull form
  const fxOf = (x) => x / 55;
  const bottomY = (x) => 4.2 * SS(x, -48, -55.5) + 1.2 * SS(x, 47, 55);          // stern overhang + forefoot rise
  const deckY = (x) => D + 2.3 * SS(x, 40, 55) + 0.5 * SS(-x, 50, 57);            // sheer at the bow (forecastle), a little aft
  function halfW(x, y) {
    const fx = fxOf(x), yk = Math.min(1.3, Math.max(0, y / D));
    const bowK = SS(fx, 0.42, 1.0);
    let w = B2 * Math.pow(Math.max(0, 1 - bowK), 0.62 + 0.6 * (1 - Math.min(1, yk)));   // fine entry low, a little flare high
    w *= 1 - 0.22 * SS(-x, 44, 57) * (1 - 0.6 * yk);                               // the run aft
    return Math.max(0.12, w);
  }
  const R_BILGE = 2.0;
  function section(x) {   // starboard deck edge -> keel centre -> port deck edge, as [y, z]
    const top = deckY(x), bot = bottomY(x), pts = [];
    const ns = 10;
    for (let k = 0; k <= ns; k++) { const y = top + (bot + R_BILGE - top) * k / ns; pts.push([y, halfW(x, y)]); }
    const wb = halfW(x, bot + R_BILGE), rb = Math.min(R_BILGE, wb * 0.9);
    for (let k = 1; k <= 6; k++) { const a = k / 6 * Math.PI / 2; pts.push([bot + R_BILGE - rb * Math.sin(a), wb - rb + rb * Math.cos(a)]); }
    for (let k = 1; k <= 3; k++) pts.push([bot, (wb - rb) * (1 - k / 3)]);
    const port = pts.slice(0, -1).reverse().map(([y, z]) => [y, -z]);
    return pts.concat(port);
  }
  // hull colours: red oxide below the old waterline, fouled boot-top band, rust-streaked black topsides; plates vary
  const RED = lin(0x6a2618), BOOT = lin(0x1d2416), TOP = lin(0x23272b), hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  function hullCol(x, y) {
    const plate = 0.88 + 0.24 * hash(Math.floor(x / 6.2), Math.floor(y / 2.4));
    let c = y < 6.1 ? RED : y < 7.0 ? BOOT : TOP;
    if (y >= 6.1 && y < 7.6) c = K.mix(BOOT, y < 7.0 ? BOOT : TOP, SS(y, 6.9, 7.6));
    if (y < 6.1) c = K.mix(c, BOOT, SS(y, 5.2, 6.1) * 0.7);      // weed creeping down from the band
    return K.mul(c, plate);
  }
  const hull = K.batch(), steel = K.batch(), paint = K.batch(), emis = K.batch(), rust = K.batch(), dark = K.batch();
  {
    const P = [], C = [];
    for (let i = 0; i <= 112; i++) {
      const x = XS + (XB - XS) * i / 112, sec = section(x);
      P.push(sec.map(([y, z]) => [x, y, z])); C.push(sec.map(([y]) => hullCol(x, y)));
    }
    hull.grid(P, C);
    // transom (stern) and deck plating
    const st = section(XS);
    for (let j = 0; j + 1 < st.length; j++) {
      const a = st[j], b = st[j + 1], cy = (deckY(XS) + bottomY(XS)) / 2;
      hull.quad([XS, a[0], a[1]], [XS, b[0], b[1]], [XS, cy, 0], [XS, cy, 0], [-1, 0, 0], hullCol(XS, a[0]));
    }
    const DP = [], DC = [];
    for (let i = 0; i <= 112; i++) {
      const x = XS + (XB - XS) * i / 112, y = deckY(x), w = halfW(x, y) - 0.05, row = [], cr = [];
      for (let j = 0; j <= 8; j++) { const z = -w + 2 * w * j / 8; row.push([x, y, z]); cr.push(K.mul(lin(0x4a3a2c), 0.75 + 0.4 * hash(i, j))); }
      DP.push(row); DC.push(cr);
    }
    steel.grid(DP, DC, { flip: true });
    // bulwark cap rail + draft marks + weld seams (frames every 2.75 m) on both sides
    for (let x = XS + 1; x < XB - 2; x += 2.75) for (const s of [1, -1]) {
      const y0 = Math.max(bottomY(x) + 2.2, 1.0), y1 = deckY(x) - 0.3, z = s * (halfW(x, (y0 + y1) / 2) + 0.012);
      if (chance(0.55)) rust.box(x - 0.04, x + 0.04, y0 + rnd(0, 4), y1, z - 0.02 * s, z + 0.02 * s, K.mul(lin(0x3b2416), rnd(0.6, 1.1)));
    }
    for (const xm of [51, -52.5]) for (const s of [1, -1]) for (let y = 1; y <= 7; y++) {
      const z = s * (halfW(xm, y) + 0.03);
      paint.box(xm - 0.05, xm + 0.55, y - 0.05, y + 0.05, z - 0.02, z + 0.02, lin(0xb8b2a4, 0.9));
    }
    for (let x = XS; x < XB - 1; x += 1.5) for (const s of [1, -1]) {     // railing posts along the deck edge
      const y = deckY(x), z = s * (halfW(x, y) - 0.15);
      steel.cyl(x, y, z, x, y + 1.05, z, 0.025, 4, lin(0x5c5f5e));
    }
    for (const s of [1, -1]) for (const h of [0.55, 1.05]) {
      let prev = null;
      for (let x = XS; x < XB - 1; x += 1.5) { const y = deckY(x) + h, p = [x, y, s * (halfW(x, deckY(x)) - 0.15)]; if (prev) steel.cyl(...prev, ...p, 0.02, 4, lin(0x5c5f5e)); prev = p; }
    }
  }

  // ------------------------------------------------------------------ the girder belt that carries the hips (welded on later)
  {
    const hips = CFG.LEG_X, yB = CFG.HIP_Y;
    const nearHip = (x, pad) => hips.some((h) => Math.abs(x - h) < pad);
    for (const s of [1, -1]) {
      const z0 = s * B2, zo = s * (B2 + 0.75);
      // flanges + web, broken around each hip
      for (let x = -52; x < 52; x += 0.5) {
        if (nearHip(x + 0.25, 3.7)) continue;
        for (const y of [yB + 2.8, yB - 2.6]) rust.box(x, x + 0.52, y - 0.22, y + 0.22, Math.min(z0, zo), Math.max(z0, zo), K.mul(lin(0x55402e), 0.9 + 0.2 * hash(x, y)));
      }
      for (let x = -51; x < 51; x += 2.75) {
        if (nearHip(x, 3.9)) continue;
        rust.box(x - 0.12, x + 0.12, yB - 2.4, yB + 2.6, Math.min(z0, zo), Math.max(z0, zo), lin(0x4a3726));
      }
      for (const hx of hips) {
        // doubler plate behind the hip base, gussets above and below, diagonal braces up to the deck
        rust.box(hx - 3.6, hx + 3.6, yB - 3.3, yB + 3.5, s > 0 ? B2 - 0.05 : -B2 - 0.25, s > 0 ? B2 + 0.25 : -B2 + 0.05, lin(0x5b4130));
        for (const dx of [-3.2, 3.2]) {
          steel.cyl(hx + dx, yB + 3.0, zo, hx + dx * 1.6, deckY(hx) - 0.6, s * (B2 + 0.2), 0.22, 8, lin(0x3d3a36));
          steel.cyl(hx + dx, yB - 3.0, zo, hx + dx * 1.4, bottomY(hx) + 0.6, s * (B2 - 0.6), 0.18, 8, lin(0x3d3a36));
        }
        for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; dark.cyl(hx + Math.cos(a) * 3.3, yB + Math.sin(a) * 3.2, s * (B2 + 0.25), hx + Math.cos(a) * 3.3, yB + Math.sin(a) * 3.2, s * (B2 + 0.4), 0.09, 6, lin(0x2b2b2a), true); }
      }
    }
  }

  // ------------------------------------------------------------------ containers (instanced, corrugated)
  let nBox = 0;
  {
    const cb = K.batch();
    const L = 12.19, Wd = 2.44, H = 2.59, white = [1, 1, 1];
    cb.box(-L / 2, L / 2, 0, H, -Wd / 2 + 0.05, Wd / 2 - 0.05, white, K.mul(white, 0.7));
    for (let k = 0; k < 34; k++) { const x = -L / 2 + 0.3 + k * (L - 0.6) / 33; for (const s of [1, -1]) cb.box(x - 0.07, x + 0.07, 0.15, H - 0.12, s * (Wd / 2 - 0.05), s * (Wd / 2 - 0.01), K.mul(white, 0.95), K.mul(white, 0.7)); }
    for (const s of [1, -1]) {   // doors / end wall: lock rods, corner castings
      const x = s * (L / 2 + 0.01);
      for (const z of [-0.85, -0.3, 0.3, 0.85]) cb.cyl(x, 0.1, z, x, H - 0.1, z, 0.025, 4, K.mul(white, 0.8));
      for (const y of [0.08, H - 0.08]) for (const z of [-1.1, 1.1]) cb.box(x - 0.1 * s, x + 0.06 * s, y - 0.08, y + 0.08, z - 0.12, z + 0.12, K.mul(white, 0.45));
    }
    const geo = cb.geometry();
    const PAL = [0x7a2a1c, 0x24425e, 0x2c4a33, 0x6b6b66, 0xb3ada0, 0x5a3a24, 0x9a7a2a, 0x2a5652, 0x8a3a2a, 0x3a3f4a].map((h) => lin(h));
    const mats = [];
    const deckL = 12.6, bays = [];
    for (let x = -34.5; x + deckL < 47; x += deckL + 0.4) bays.push(x + deckL / 2);
    const place = [];
    for (const [bi, bx] of bays.entries()) {
      const w = Math.min(halfW(bx - 6, deckY(bx)), halfW(bx + 6, deckY(bx))) - 0.6;
      const rows = Math.max(2, Math.floor((2 * w) / (Wd + 0.08)));
      const y0 = deckY(bx) + 1.2;
      // bay outline: higher in the middle, broken and uneven, a few stacks missing
      for (let r = 0; r < rows; r++) {
        const z = (r - (rows - 1) / 2) * (Wd + 0.08);
        let tiers = Math.round(2 + 2.6 * (1 - Math.abs(z) / (w + 1)) + rnd(-1.2, 1.4) - (bi === bays.length - 1 ? 1.5 : 0));
        if (chance(0.08)) tiers = 0;
        for (let tt = 0; tt < Math.min(5, tiers); tt++) place.push([bx + rnd(-0.06, 0.06), y0 + tt * (H + 0.02), z, chance(0.07) ? rnd(-0.03, 0.03) : 0]);
      }
      // hatch cover under the bay + lashing bridge between bays
      steel.box(bx - 6.3, bx + 6.3, deckY(bx), y0, -w - 0.3, w + 0.3, lin(0x403c35), lin(0x2a2723));
      if (bi > 0) {
        const lx = bx - deckL / 2 - 0.2;
        for (const s of [1, -1]) steel.box(lx - 0.15, lx + 0.15, y0, y0 + 2 * H, s * w, s * (w + 0.25), lin(0x5a5d5a));
        steel.box(lx - 0.35, lx + 0.35, y0 + 2 * H - 0.08, y0 + 2 * H + 0.08, -w - 0.25, w + 0.25, lin(0x5a5d5a));
        for (let z = -w; z <= w; z += Wd + 0.08) for (const s of [1, -1]) steel.cyl(lx, y0 + 0.1, z, lx + s * 0.9, y0 + H * 1.6, z + 0.6, 0.02, 3, lin(0x7a7c78));
      }
    }
    const im = new THREE.InstancedMesh(geo, (() => { const m = Mats.paintedMetal({ color: 0xffffff, w: { chip: 0.35, rust: 0.5, streak: 0.85, dirt: 0.75, moss: 0.04, wet: 0.5 } }); m.vertexColors = true; m.metalness = 0.25; m.roughness = 0.6; return m; })(), place.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    place.forEach(([x, y, z, tilt], i) => {
      e.set(tilt, 0, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4);
      const c = K.pick(PAL), f = rnd(0.7, 1.1); col.setRGB(c[0] * f, c[1] * f, c[2] * f); im.setColorAt(i, col);
    });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.name = 'ship:containers';
    root.add(im); nBox = place.length; K.tris += geo.index.count / 3 * place.length;
  }

  // ------------------------------------------------------------------ accommodation block, bridge, funnel, mast, lifeboat
  const ACC = { x0: -50, x1: -37, z: 8.4, decks: 5, dh: 2.8 };
  {
    const y0 = deckY(-44), WH = lin(0xc8c2b4), WH2 = lin(0x9d988c);
    for (let d = 0; d < ACC.decks; d++) {
      const ya = y0 + d * ACC.dh, yb = ya + ACC.dh, inset = d === ACC.decks - 1 ? 0 : 0.25 * (d % 2);
      const zw = d === ACC.decks - 1 ? ACC.z : ACC.z - inset;
      paint.box(ACC.x0, ACC.x1 - inset, ya, yb - 0.25, -zw, zw, K.mul(WH, rnd(0.9, 1.05)), K.mul(WH2, 0.8));
      paint.box(ACC.x0 - 0.3, ACC.x1 + 0.3 - inset, yb - 0.25, yb, -zw - 0.3, zw + 0.3, WH2);   // deck edge
      // windows on all four faces (lit cabins, dark ones, curtains = dimmer)
      const R = K.R;
      const win = (cx, cy, cz, nx, nz, w, h) => {
        const c = windowColour(R, d === ACC.decks - 1 ? 0.85 : 0.55);
        const o = 0.03, px = cx + nx * o, pz = cz + nz * o;
        if (nx) emis.quad([px, cy - h / 2, pz - w / 2 * nx], [px, cy - h / 2, pz + w / 2 * nx], [px, cy + h / 2, pz + w / 2 * nx], [px, cy + h / 2, pz - w / 2 * nx], [nx, 0, 0], c);
        else emis.quad([px + w / 2 * nz, cy - h / 2, pz], [px - w / 2 * nz, cy - h / 2, pz], [px - w / 2 * nz, cy + h / 2, pz], [px + w / 2 * nz, cy + h / 2, pz], [0, 0, nz], c);
        // frame
        if (nx) steel.box(px - 0.04, px + 0.04, cy - h / 2 - 0.06, cy - h / 2, pz - w / 2 - 0.06, pz + w / 2 + 0.06, lin(0x6a6862));
        else steel.box(px - w / 2 - 0.06, px + w / 2 + 0.06, cy - h / 2 - 0.06, cy - h / 2, pz - 0.04, pz + 0.04, lin(0x6a6862));
      };
      const bridge = d === ACC.decks - 1;
      const wy = ya + ACC.dh * 0.52, ww = bridge ? 1.5 : 0.9, wh = bridge ? 1.2 : 0.85;
      for (let x = ACC.x0 + 1.2; x < ACC.x1 - inset - 0.8; x += bridge ? 1.75 : 1.6) for (const s of [1, -1]) win(x, wy, s * zw, 0, s, ww, wh);
      for (let z = -zw + 1.2; z < zw - 0.8; z += bridge ? 1.75 : 1.8) { win(ACC.x1 - inset, wy, z, 1, 0, ww, wh); if (d > 0) win(ACC.x0, wy, z, -1, 0, 0.8, 0.8); }
      // outside stairs between decks, aft
      if (d < ACC.decks - 1) for (const s of [1, -1]) for (let k = 0; k < 8; k++) steel.box(ACC.x0 - 1.2, ACC.x0 - 0.2, ya + k * 0.35, ya + k * 0.35 + 0.05, s * (zw - 1.5 - k * 0.3), s * (zw - 1.2 - k * 0.3), lin(0x4b4d4b));
    }
    // bridge wings out to the full beam and beyond, with railings
    const yw = y0 + (ACC.decks - 1) * ACC.dh;
    for (const s of [1, -1]) {
      paint.box(ACC.x1 - 3.2, ACC.x1, yw - 0.3, yw, s * ACC.z, s * (B2 + 1.6), WH2);
      for (let z = ACC.z; z <= B2 + 1.6; z += 0.8) steel.cyl(ACC.x1 - 3.1, yw, s * z, ACC.x1 - 3.1, yw + 1.1, s * z, 0.03, 4, lin(0x6a6a66));
      steel.box(ACC.x1 - 3.2, ACC.x1, yw + 1.05, yw + 1.12, s * (B2 + 1.55), s * (B2 + 1.62), lin(0x6a6a66));
    }
    const yr = y0 + ACC.decks * ACC.dh;
    paint.box(ACC.x0 - 0.2, ACC.x1 + 0.2, yr, yr + 0.35, -ACC.z - 0.2, ACC.z + 0.2, WH2);
    // radar mast (lattice) + horn + lights
    const mx = -45, my = yr + 0.35;
    for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) steel.cyl(mx + a, my, b, mx + a * 0.3, my + 7, b * 0.3, 0.07, 5, lin(0x8a8a84));
    for (let y = my + 1; y < my + 7; y += 1.4) steel.box(mx - 0.75, mx + 0.75, y - 0.04, y + 0.04, -0.75, 0.75, lin(0x8a8a84));
    steel.box(mx - 0.8, mx + 0.8, my + 7, my + 7.2, -0.8, 0.8, lin(0x6e6e68));
    emis.boxC(mx, my + 8.6, 0, 0.25, 0.25, 0.25, [2.6, 1.3, 0.4]);
    steel.cyl(mx, my + 7.2, 0, mx, my + 8.5, 0, 0.05, 5, lin(0x6e6e68));
    for (const s of [1, -1]) emis.boxC(ACC.x1 - 1.5, yw + 1.4, s * (B2 + 1.5), 0.2, 0.2, 0.2, s > 0 ? [0.25, 1.6, 0.5] : [2.2, 0.35, 0.15]);   // sidelights
    // funnel on its casing
    const fx = -53, fy0 = deckY(fx);
    paint.box(-56.3, -50.2, fy0, fy0 + 11.5, -5.2, 5.2, K.mul(WH, 0.85), K.mul(WH2, 0.7));
    const fun = K.batch(), FR = 2.9, FZ = 2.3;
    for (let y = fy0 + 11.5; y < fy0 + 21.5; y += 0.5) {
      const band = y > fy0 + 16.5 && y < fy0 + 18.3, top = y > fy0 + 20.2;
      const c = top ? lin(0x151515) : band ? lin(0xb9a77a, 0.8) : lin(0x5a2418, 0.9);
      const P = [];
      for (let j = 0; j <= 24; j++) { const a = j / 24 * Math.PI * 2; P.push([fx + Math.cos(a) * FR, y, Math.sin(a) * FZ]); }
      const Q = P.map((p) => [p[0], p[1] + 0.5, p[2]]);
      fun.grid([P, Q], c);
    }
    fun.box(fx - 2.6, fx + 2.6, fy0 + 21.45, fy0 + 21.55, -2.0, 2.0, lin(0x0a0a0a));
    for (const dz of [-0.8, 0.8]) fun.cyl(fx + 0.6, fy0 + 21.5, dz, fx + 0.6, fy0 + 22.6, dz, 0.42, 10, lin(0x202020));
    K.mesh(fun, K.mat('paint', { w: { rust: 0.5, streak: 1.0, chip: 0.3 } }), { parent: root, name: 'ship:funnel' });
    // lifeboat on davits, starboard, two decks up
    const lb = K.batch(), ly = y0 + 1.5 * ACC.dh, lz = ACC.z + 1.6, lx0 = -48, lx1 = -40.6;
    const OR = lin(0xa04a18, 0.8);
    const P = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, x = lx0 + (lx1 - lx0) * u, r = 0.06 + 1.2 * Math.pow(Math.sin(Math.PI * u), 0.45), row = [];
      for (let j = 0; j <= 14; j++) { const a = j / 14 * Math.PI * 2; row.push([x, ly + Math.sin(a) * r * 0.85, lz + Math.cos(a) * r]); }
      P.push(row);
    }
    lb.grid(P, OR, { closeJ: true });
    K.mesh(lb, K.mat('paint', { w: { rust: 0.2, streak: 0.8, chip: 0.4, dirt: 0.8 } }), { parent: root, name: 'ship:lifeboat' });
    for (const x of [lx0 + 1.2, lx1 - 1.2]) { steel.cyl(x, ly + 3.6, ACC.z, x, ly + 3.6, lz, 0.12, 6, lin(0x4a4a46)); steel.cyl(x, ly + 3.6, ACC.z, x, y0 + ACC.dh, ACC.z, 0.14, 6, lin(0x4a4a46)); steel.cyl(x, ly + 3.6, lz, x, ly + 1.1, lz, 0.02, 3, lin(0x222222)); }
  }

  // ------------------------------------------------------------------ forecastle: windlass, bitts, foremast; hawse pipes
  {
    const yf = deckY(50);
    for (const s of [1, -1]) {
      steel.cyl(47, yf + 0.8, s * 1.6, 47, yf + 0.8, s * 3.4, 0.75, 14, lin(0x3e4a3e), true);
      steel.cyl(47, yf + 0.8, s * 1.0, 47, yf + 0.8, s * 1.6, 1.0, 14, lin(0x343a34), true);
      for (const x of [43, 52]) steel.cyl(x, yf, s * 3.6, x, yf + 0.7, s * 3.6, 0.28, 8, lin(0x2e2e2c), true);
    }
    steel.box(46, 48, yf, yf + 0.6, -1.2, 1.2, lin(0x3e4a3e));
    steel.cyl(51.5, yf, 0, 51.5, yf + 9, 0, 0.3, 8, lin(0x9a9488));
    emis.boxC(51.5, yf + 9.3, 0, 0.3, 0.3, 0.3, [2.4, 1.15, 0.33]);
    for (const s of [1, -1]) {
      const hx = 48.5, hy = 9.3, hz = s * (halfW(hx, hy) + 0.05);
      dark.cyl(hx, hy, hz, hx + 0.6, hy - 0.4, hz + s * 0.3, 0.55, 12, lin(0x161616), true);
      // stowed anchor on the port side only (the starboard one is down, its chain hanging)
      if (s < 0) { rust.box(hx - 0.3, hx + 0.3, hy - 3.8, hy - 0.4, hz - 0.35, hz + 0.05, lin(0x2a2420)); rust.box(hx - 1.3, hx + 1.3, hy - 4.3, hy - 3.7, hz - 0.5, hz + 0.1, lin(0x2a2420)); }
    }
  }

  // ------------------------------------------------------------------ underside: propeller, rudder, bilge keels, sea chests, work lamps
  const prop = new THREE.Group(); prop.position.set(-54.0, 1.95, 0); root.add(prop);
  {
    const pb = K.batch(), BR = lin(0x7a5a2c, 0.85);
    pb.cyl(-0.6, 0, 0, 0.6, 0, 0, 0.5, 14, BR, true);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2;
      K.push(new THREE.Matrix4().makeRotationX(a));
      const P = [];
      for (let i = 0; i <= 6; i++) { const r = 0.45 + 1.45 * i / 6, w = 0.55 * Math.sin(Math.PI * Math.min(1, 0.15 + i / 7)), tw = 0.6 - 0.35 * i / 6; P.push([[-w * Math.cos(tw), r, -w * Math.sin(tw)], [w * Math.cos(tw), r, w * Math.sin(tw)]]); }
      pb.grid(P, BR);
      K.pop();
    }
    K.mesh(pb, K.mat('steel', { w: { rust: 0.3, moss: 0.5, mossColor: 0x223018 } }), { parent: prop, name: 'ship:propeller' });
    steel.cyl(-52.5, 1.95, 0, -50.0, bottomY(-50) + 0.4, 0, 0.35, 10, lin(0x5a4a34));
    hull.box(-57.0, -56.2, 0.4, bottomY(-56.6) + 0.1, -0.25, 0.25, RED, K.mul(RED, 0.6));      // rudder
    hull.box(-57.2, -55.9, 0.3, 0.6, -0.3, 0.3, K.mul(RED, 0.7));
    for (const s of [1, -1]) for (let x = -26; x < 26; x += 2) {   // bilge keels
      const y = 0.9, z = s * (halfW(x, y) - 0.35);
      hull.box(x, x + 2.02, y - 0.05, y + 0.05, Math.min(z, z + s * 0.55), Math.max(z, z + s * 0.55), K.mul(RED, 0.8));
    }
    for (const [x, z] of [[-20, 4], [-8, -4.5], [14, 3.8], [30, -3.5]]) dark.box(x - 1.4, x + 1.4, -0.02, 0.01, z - 1, z + 1, lin(0x101010));
    for (const [x, , z] of ctx.anchors.lamps) {
      steel.box(x - 0.35, x + 0.35, -0.25, 0.0, z - 0.25, z + 0.25, lin(0x3a3a38));
      emis.box(x - 0.25, x + 0.25, -0.33, -0.25, z - 0.18, z + 0.18, [2.4, 1.1, 0.32]);
    }
  }

  // ------------------------------------------------------------------ loose things on pivots (follow-through)
  const swingers = [];
  const pivot = (x, y, z, T, gain, axis = 'z') => { const g = new THREE.Group(); g.position.set(x, y, z); root.add(g); swingers.push({ g, T, gain, axis, ph: rnd(0, 6.28) }); return g; };
  const loose = K.batch(), cloth = K.batch(), weed = K.batch();
  // anchor chain out of the starboard hawse pipe (links), anchor at the bottom
  const chainP = pivot(49.0, 8.9, halfW(48.5, 9.3) + 0.45, 3.4, 1.0);
  {
    K.push(new THREE.Matrix4().makeTranslation(chainP.position.x, chainP.position.y, chainP.position.z).invert());
    K.pop();
    const cb = K.batch(), C = lin(0x2a2520);
    for (let k = 0; k < 26; k++) { const y = -k * 0.32; if (k % 2) cb.box(-0.05, 0.05, y - 0.22, y + 0.02, -0.17, 0.17, C); else cb.box(-0.17, 0.17, y - 0.22, y + 0.02, -0.05, 0.05, C); }
    cb.box(-0.3, 0.3, -11.5, -8.2, -0.25, 0.25, C); cb.box(-1.3, 1.3, -12.1, -11.4, -0.4, 0.4, C);
    K.mesh(cb, K.mat('rust', {}), { parent: chainP, name: 'ship:chain' });
  }
  // mooring ropes trailing from the fairleads, in loops
  const ropes = [];
  for (const [x, s] of [[-38, 1], [-30, -1], [40, 1], [44, -1]]) {
    const y = deckY(x) - 0.2, p = pivot(x, y, s * (halfW(x, y) + 0.1), 2.6 + rnd(0, 0.6), 1.2);
    const rb = K.batch(); rb.catenary([0, 0, 0], [rnd(1.5, 3), -0.3, s * 0.4], rnd(4.5, 7.5), 0.09, lin(0x2a241c), 12, 5);
    K.mesh(rb, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), { parent: p, name: 'ship:rope' }); ropes.push(p);
  }
  // kelp and weed strands from the bottom and the old waterline
  for (let i = 0; i < 46; i++) {
    const x = rnd(-46, 46), side = chance(0.5) ? 1 : -1, low = chance(0.45);
    const y = low ? 0.02 : rnd(5.4, 6.6), z = low ? rnd(-B2 + 2, B2 - 2) : side * (halfW(x, y) + 0.02);
    const p = pivot(x, y, z, 1.6 + rnd(0, 1.2), 1.6);
    const wb = K.batch(), len = rnd(0.8, low ? 2.6 : 1.6), C = K.mul(lin(0x26301a), rnd(0.6, 1.2));
    const P = []; for (let k = 0; k <= 6; k++) { const u = k / 6, w = 0.12 * (1 - 0.6 * u); P.push([[-w, -u * len, 0.02 * Math.sin(u * 9)], [w, -u * len, 0.02 * Math.sin(u * 9 + 1)]]); }
    wb.grid(P, C);
    const m = K.mesh(wb, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, side: THREE.DoubleSide }), { parent: p, shadow: false, name: 'ship:kelp' });
    if (m) m.rotation.y = rnd(0, 6.28);
  }
  // laundry on the starboard bridge wing
  {
    const yw = deckY(-44) + (ACC.decks - 1) * ACC.dh + 1.0;
    const line = [ACC.x1 - 3.0, yw, ACC.z + 0.4], end = [ACC.x1 - 3.0, yw, B2 + 1.5];
    loose.catenary(line, end, 0.15, 0.012, lin(0x777777), 6, 3);
    for (let i = 0; i < 5; i++) {
      const z = ACC.z + 0.8 + i * 0.75, p = pivot(line[0], yw - 0.04, z, 1.1, 2.4, 'x');
      const cb = K.batch(), c = K.pick([lin(0x8a8e94), lin(0x6a2a2a), lin(0x2c3a52), lin(0xa49a84), lin(0x4a5a3a)]);
      const w = rnd(0.4, 0.62), h = rnd(0.5, 0.9);
      cb.quad([0, 0, -w / 2], [0, 0, w / 2], [0, -h, w / 2], [0, -h, -w / 2], [1, 0, 0], c);
      K.mesh(cb, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), { parent: p, shadow: false, name: 'ship:laundry' });
    }
  }
  // stern flag (waves in the vertex shader; the staff swings with the hull)
  const uTime = { value: 0 };
  {
    const fy = deckY(-56.5) + 0.2;
    steel.cyl(-56.5, fy, 0, -57.6, fy + 4.2, 0, 0.05, 5, lin(0x8a8a84));
    const fg = new THREE.PlaneGeometry(1.8, 1.1, 12, 6); fg.translate(-0.9, 0, 0);
    const fm = new THREE.MeshStandardMaterial({ color: 0x5a2a2a, roughness: 0.85, side: THREE.DoubleSide });
    fm.onBeforeCompile = (sh) => { sh.uniforms.uTime = uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat fk = -position.x / 1.8; transformed.z += sin(position.x * 3.2 + uTime * 6.5) * 0.18 * fk + sin(position.x * 7.0 - position.y * 3.0 + uTime * 9.0) * 0.04 * fk;'); };
    const flag = new THREE.Mesh(fg, fm); flag.position.set(-57.55, fy + 3.6, 0); flag.name = 'ship:flag'; root.add(flag);
  }

  // ------------------------------------------------------------------ materials + meshes
  K.mesh(hull, K.mat('paintedMetal', { w: { rust: 0.3, chip: 0.12, streak: 1.0, dirt: 0.8, moss: 0.3, mossColor: 0x1c2414, wet: 0.65 } }), { parent: root, name: 'ship:hull' });
  K.mesh(steel, K.mat('steel', { w: { rust: 0.55, streak: 0.8 } }), { parent: root, name: 'ship:steel' });
  K.mesh(paint, K.mat('paint', { w: { rust: 0.14, streak: 0.9, chip: 0.08, dirt: 0.7 } }), { parent: root, name: 'ship:paint' });
  K.mesh(rust, K.mat('rust', {}), { parent: root, name: 'ship:rust' });
  K.mesh(dark, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 }), { parent: root, name: 'ship:dark' });
  K.mesh(loose, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), { parent: root, shadow: false, name: 'ship:lines' });
  K.mesh(emis, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }), { parent: root, shadow: false, name: 'ship:lights' });

  // work lights under the hull (the engine allows up to 6 warm PointLights on the body)
  for (const [x, y, z] of ctx.anchors.lamps) { const L = new THREE.PointLight(new THREE.Color(1.0, 0.55, 0.22), 60, 22, 2); L.position.set(x, y - 0.6, z); L.castShadow = false; root.add(L); }

  console.info(`[ship] ${K.meshes.length + 1} meshes, ${Math.round(K.tris)} tris, ${nBox} containers, ${swingers.length} swinging parts, build ${Math.round(performance.now() - T0)} ms`);

  // ------------------------------------------------------------------ update: a pure function of t
  const pose = {};
  return {
    update(t) {
      uTime.value = t;
      prop.rotation.x = t * 0.55;                         // turning slowly, out of habit
      gait.bodyPose(t, pose);
      for (const s of swingers) {
        const a = lagSwing(gait, t, { T: s.T, zeta: 0.16, gain: s.gain, axis: s.axis });
        if (s.axis === 'z') s.g.rotation.x = -pose.roll + a + 0.02 * Math.sin(t * 2 * Math.PI / s.T + s.ph);   // plumb + follow-through + a little air
        else s.g.rotation.z = -pose.pitch + a * 0.6 + 0.12 * Math.sin(t * 2.7 + s.ph) + 0.05 * Math.sin(t * 6.1 + s.ph * 2);   // laundry: wind flutter
      }
    },
  };
}
