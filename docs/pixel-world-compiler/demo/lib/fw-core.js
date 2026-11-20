/* pixel-world-compiler · fw-core.js
   The authorities every other file reads: seeded randomness, the scale axiom, one sun per world,
   ramps derived from reflectance under that sun, the locked palette, and the channel sprite.

   Method and several formulas follow Frostwind (github.com/trinity-works/frostwind, MIT, (c) 2026
   Trinity Labs Pte. Ltd.): "nothing is drawn that can be derived; nothing is chosen that can be
   measured; nothing is claimed that cannot be checked." The code here is a smaller rewrite for
   Canvas 2D, not a copy of its engine.

   A sprite stores material, normal, occlusion and height, never a colour. Colour is resolved once,
   against the world's locked palette, so every pixel the page draws is an entry that palette declared. */
(function () {
  'use strict';
  const FW = (window.FW = window.FW || {});

  /* ---------------- randomness: seeded, never Math.random ---------------- */
  FW.rng = (seed) => {
    let a = (seed >>> 0) || 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  /* integer lattice hash in [0,1) */
  FW.hash = (x, y, s = 0) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const fade = (t) => t * t * (3 - 2 * t);
  FW.noise = (x, y, s = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = FW.hash(xi, yi, s), b = FW.hash(xi + 1, yi, s), c = FW.hash(xi, yi + 1, s), d = FW.hash(xi + 1, yi + 1, s);
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  /* fractal noise in [0,1); x,y in metres, `scale` = metres per base cell */
  FW.fbm = (x, y, scale, oct = 4, s = 0) => {
    let f = 1 / scale, amp = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += amp * FW.noise(x * f, y * f, s + i * 31); norm += amp; amp *= 0.5; f *= 2.03; }
    return sum / norm;
  };
  FW.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  FW.lerp = (a, b, t) => a + (b - a) * t;
  FW.smooth = (a, b, v) => { const t = FW.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------------- scale: the one size axiom ----------------
     A standing adult is 26 px and 1.70 m. Every dimension in a world table is metres and becomes pixels
     here, so a deer, a door and a tree agree with each other by division, not by eye. */
  const PLAYER_H = 26, HUMAN_M = 1.70, PX_PER_M = PLAYER_H / HUMAN_M;
  FW.SCALE = Object.freeze({ PLAYER_H, HUMAN_M, PX_PER_M, M_PER_PX: 1 / PX_PER_M });
  FW.px = (m) => Math.round(m * PX_PER_M);
  /* depths that the cabinet projection halves must be even, or an edge lands on half a row */
  FW.pxEven = (m) => 2 * Math.round((m * PX_PER_M) / 2);
  /* legibility floor (law of the medium): returns the larger of the derived and the floor, and records
     which canon chose the number so check.mjs can report it */
  FW.floors = [];
  FW.floor = (what, derivedPx, floorPx) => {
    if (derivedPx < floorPx) FW.floors.push({ what, derived: +derivedPx.toFixed(2), used: floorPx });
    return Math.max(derivedPx, floorPx);
  };

  /* ---------------- colour science ---------------- */
  const s2l = (u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
  const l2s = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);
  /* SOURCE: Ottosson (2020), Oklab */
  function linToOklab(r, g, b) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function oklabToLin(L, A, B) {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  /* out of gamut: reduce chroma, keep L, so the ladder's even L spacing survives */
  function oklabToBytes(L, A, B) {
    let k = 1;
    for (let i = 0; i < 24; i++) {
      const [r, g, b] = oklabToLin(L, A * k, B * k);
      if (r >= -5e-4 && g >= -5e-4 && b >= -5e-4 && r <= 1.0005 && g <= 1.0005 && b <= 1.0005) break;
      k *= 0.94;
    }
    const c = oklabToLin(L, A * k, B * k);
    return c.map((v) => Math.round(FW.clamp(l2s(FW.clamp(v, 0, 1)), 0, 1) * 255));
  }
  const bytesToOklab = (c) => linToOklab(s2l(c[0] / 255), s2l(c[1] / 255), s2l(c[2] / 255));
  const lum = (v) => 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  FW.colour = { linToOklab, oklabToLin, oklabToBytes, bytesToOklab, lum,
    dE: (p, q) => { const a = bytesToOklab(p), b = bytesToOklab(q); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); },
    hex: (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('') };

  /* ---------------- the sun ----------------
     SOURCE: Rayleigh optical depth at sea level per channel; Duffie & Beckman solar geometry; Kasten & Young
     (1989) air mass. The beam is what the atmosphere transmits and the sky is the scattered complement, so a
     low winter sun gives a warm beam and blue shadows from the same two numbers. */
  const TAU = [0.06, 0.098, 0.22];
  const norm3 = (v) => { const m = (v[0] + v[1] + v[2]) / 3; return v.map((x) => x / m); };
  FW.sun = function ({ lat, decl = 0, hour = 0 }) {
    const r = Math.PI / 180, la = lat * r, de = decl * r, h = hour * 15 * r; // hour: hours from solar noon
    const sinAlt = FW.clamp(Math.sin(la) * Math.sin(de) + Math.cos(la) * Math.cos(de) * Math.cos(h), -1, 1);
    const alt = Math.asin(sinAlt), altDeg = alt / r;
    if (altDeg < 3) throw new Error(`sun altitude ${altDeg.toFixed(1)}° — below 3° the world has no day light; move lat/decl/hour`);
    const ca = Math.cos(alt) * Math.cos(la);
    let az = Math.acos(FW.clamp(Math.abs(ca) < 1e-9 ? 1 : (Math.sin(de) - sinAlt * Math.sin(la)) / ca, -1, 1)) / r;
    if (Math.sin(h) > 0) az = 360 - az; // afternoon: west of north
    const airmass = 1 / (sinAlt + 0.50572 * Math.pow(altDeg + 6.07995, -1.6364));
    const T = TAU.map((t) => Math.exp(-t * airmass));
    const beam = norm3(T), sky = norm3(T.map((t) => 1 - t));
    const diffuse = (T.reduce((s, t) => s + (1 - t), 0)) / 3;
    const eSun = beam.map((v) => v * (1 - diffuse)), eSky = sky.map((v) => v * diffuse);
    const eFull = eSun.map((v, i) => v + eSky[i]);
    const azr = az * r;
    /* world axes: X east (screen right), Y north (away from the camera), Z up */
    const L = [Math.sin(azr) * Math.cos(alt), Math.cos(azr) * Math.cos(alt), sinAlt];
    const cot = Math.cos(alt) / sinAlt;
    /* a point z px above the ground throws its shadow this far, in screen px (ground depth halves) */
    const shadow = { dx: -Math.sin(azr) * cot, dy: Math.cos(azr) * cot / 2 };
    return { lat, decl, hour, alt, altDeg, az, airmass, diffuse, beam, sky, eSun, eSky, eFull, L, shadow, ground: sinAlt };
  };

  /* SOURCE: Naka & Rushton (1966), response applied once, to luminance */
  const NR_N = 0.85;
  const nakaRushton = (I, sigma) => { const a = Math.pow(Math.max(0, I), NR_N); return a / (a + Math.pow(sigma, NR_N)); };
  const WHITE_ALBEDO = 0.9, WHITE_L = 0.95, BOUNCE_VF = 0.5;

  /* SOURCE: Wyman, Sloan & Shirley (2013) analytic CIE 1931 colour matching functions; Planck's law.
     Emission colour of a flame or a lamp is a temperature, not a hex. */
  const g = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
  const cmf = (l) => [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8)];
  function blackbody(K) {
    let X = 0, Y = 0, Z = 0;
    for (let l = 380; l <= 780; l += 5) {
      const lm = l * 1e-9, B = 1 / (Math.pow(lm, 5) * (Math.exp(1.4388e-2 / (lm * K)) - 1)), c = cmf(l);
      X += B * c[0]; Y += B * c[1]; Z += B * c[2];
    }
    const lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
    const m = Math.max(...lin); return lin.map((v) => Math.max(0, v / m));
  }
  FW.blackbody = blackbody;

  /* ---------------- ramps ----------------
     Physics picks the two radiance ends of a material; the ladder spaces rungs evenly in Oklab L between
     them, with the hue path running from the cool sky-lit end to the warm beam-lit end. */
  function ladder(R0, R1, n, exposure, sigma) {
    const L0 = FW.clamp(nakaRushton(lum(R0), sigma) * exposure, 0, 1), L1 = FW.clamp(nakaRushton(lum(R1), sigma) * exposure, 0, 1);
    const O0 = linToOklab(...R0), O1 = linToOklab(...R1);
    const k0 = O0[0] > 1e-6 ? L0 / O0[0] : 0, k1 = O1[0] > 1e-6 ? L1 / O1[0] : 0;
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 1;
      out.push(oklabToBytes(FW.lerp(L0, L1, u), FW.lerp(O0[1] * k0, O1[1] * k1, u), FW.lerp(O0[2] * k0, O1[2] * k1, u)));
    }
    return { rungs: out, L0, L1 };
  }

  /* SOURCE: Pope & Fry (1997) pure water absorption (m^-1, R G B bands); Fresnel at the view angle the
     cabinet projection implies (k = 1/2 → 30° elevation). */
  const A_WATER = [0.35, 0.06, 0.015], N_WATER = 1.333;
  const TH_I = Math.PI / 2 - Math.asin(0.5), TH_T = Math.asin(Math.sin(TH_I) / N_WATER);
  const WATER_PATH = 2 / Math.cos(TH_T);
  const FRESNEL = (() => { const ci = Math.cos(TH_I), ct = Math.cos(TH_T);
    const rs = (ci - N_WATER * ct) / (ci + N_WATER * ct), rp = (N_WATER * ci - ct) / (N_WATER * ci + ct); return (rs * rs + rp * rp) / 2; })();
  FW.WATER = { A_WATER, FRESNEL, WATER_PATH };

  /* ---------------- the palette ----------------
     world.materials: { id: { albedo:[r,g,b], rungs, kind:'surface'|'leaf'|'water'|'emit', ... , src } }
     kind 'surface' / 'leaf': lit by the sun; 'water': rungs across depth; 'emit': rungs across intensity
     of a blackbody at `kelvin` (fires, lamps). Returns the locked palette. */
  FW.buildPalette = function (world, sun) {
    const mats = world.materials, names = Object.keys(mats);
    const cover = world.cover || {};
    let sum = 0, w = 0;
    for (const k in cover) { const a = mats[k].albedo, f = cover[k]; for (let i = 0; i < 3; i++) { sum += f * a[i] * sun.eFull[i]; w += f; } }
    const sigma = w ? sum / w : 0.05;
    const exposure = WHITE_L / nakaRushton((WHITE_ALBEDO * (sun.eFull[0] + sun.eFull[1] + sun.eFull[2])) / 3, sigma);
    const envName = world.env || Object.keys(cover).sort((a, b) => cover[b] - cover[a])[0];
    const env = envName ? mats[envName].albedo : [0.2, 0.2, 0.2];
    const bounce = sun.eFull.map((e, i) => env[i] * e * BOUNCE_VF);
    const ramps = {}, info = [];
    names.forEach((name, idx) => {
      const m = mats[name], n = m.rungs || 4;
      let R0, R1, coef = null;
      if (m.kind === 'emit') {
        const c = blackbody(m.kelvin || 1800), peak = m.peak || 1.6, lo = m.low || 0.25;
        R0 = c.map((v) => v * lo * peak); R1 = c.map((v) => v * peak);
      } else if (m.kind === 'water') {
        const bed = m.albedo, dmax = m.depth || 2;
        const rad = (d) => bed.map((a, i) => (1 - FRESNEL) * sun.eFull[i] * a * Math.exp(-(A_WATER[i] + (m.cdom || [0, 0, 0])[i]) * WATER_PATH * d) + FRESNEL * sun.eSky[i] * (m.skyGain || 1));
        R0 = rad(dmax); R1 = rad(0);
      } else {
        const a = m.albedo, shade = m.shade ?? 0.55, lift = m.lift ?? 0;
        R0 = a.map((v, i) => v * (sun.eSky[i] * shade + bounce[i] * 0.6 + sun.eSun[i] * lift));
        R1 = a.map((v, i) => v * (sun.eFull[i] * (m.tilt ?? 1) + bounce[i] * 0.25) + sun.eSun[i] * (m.sheen || 0));
        /* per-pixel resolve: the luminance terms of sky, beam and bounce for this albedo */
        coef = { sky: lum(a.map((v, i) => v * sun.eSky[i])), sun: lum(a.map((v, i) => v * sun.eSun[i])),
          bounce: lum(a.map((v, i) => v * bounce[i])) };
      }
      const lad = ladder(R0, R1, n, exposure, sigma);
      ramps[name] = { id: idx + 1, name, kind: m.kind || 'surface', rungs: lad.rungs, L0: lad.L0, L1: lad.L1, coef, n };
      info.push({ name, kind: m.kind || 'surface', rungs: lad.rungs.map(FW.colour.hex), src: m.src || '' });
    });
    /* the lock */
    const seen = new Map();
    for (const r of Object.values(ramps)) for (const c of r.rungs) { const key = (c[0] << 16) | (c[1] << 8) | c[2]; if (!seen.has(key)) seen.set(key, c); }
    const list = [...seen.values()];
    if (list.length > 64) throw new Error(`palette holds ${list.length} colours; the lock is 64. Drop rungs or merge materials.`);
    const byId = [null];
    for (const r of Object.values(ramps)) byId[r.id] = r;
    /* 32-bit pixel (ABGR, little-endian ImageData) for each (material, rung) */
    const lut = byId.map((r) => (r ? r.rungs.map((c) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) : null));
    return { ramps, byId, lut, list, info, sigma, exposure, nakaRushton };
  };

  /* resolve one pixel to a rung index. ao in [0,1]; ndl = max(0, N·L); unsh = 1 lit, 0 in shadow.
     Two-level posterise with a checker band between rungs: solid, 50% checker, solid. The checker is
     anchored to the coordinates passed (world for ground, sprite-local for bodies) so it never crawls. */
  FW.makeResolver = function (pal) {
    return function (mat, ao, ndl, unsh, bx, by) {
      const r = pal.byId[mat]; if (!r) return 0;
      let u;
      if (r.coef) {
        const c = r.coef, Y = (c.sky * ao + c.bounce * ao) + c.sun * ndl * unsh;
        const L = FW.clamp(pal.nakaRushton(Y, pal.sigma) * pal.exposure, 0, 1);
        u = (L - r.L0) / (r.L1 - r.L0 || 1);
      } else u = ao; // water: 1 - depth/dmax ; emit: intensity
      const p = FW.clamp(u, 0, 1) * (r.n - 1), i = Math.floor(p), f = p - i;
      const band = f < 0.36 ? 0 : f > 0.64 ? 1 : ((bx + by) & 1);
      return Math.min(r.n - 1, i + band);
    };
  };

  /* ---------------- the channel sprite ----------------
     mat (0 = empty), normal in world axes, ao, z = px above the sprite's ground (for shadows and
     reflections), d = depth for self-occlusion while drawing (bigger = nearer the camera). */
  class Spr {
    constructor(w, h, ax, ay) {
      this.w = w; this.h = h; this.ax = ax; this.ay = ay;
      const n = w * h;
      this.mat = new Uint8Array(n); this.nx = new Float32Array(n); this.ny = new Float32Array(n); this.nz = new Float32Array(n);
      this.ao = new Float32Array(n); this.z = new Float32Array(n); this.d = new Float32Array(n).fill(-1e9);
    }
    /* write if nearer than what is there; (x, y) sprite coordinates */
    put(x, y, mat, n, ao, z, d = 0) {
      x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x; if (d < this.d[i]) return;
      this.d[i] = d; this.mat[i] = mat; this.nx[i] = n[0]; this.ny[i] = n[1]; this.nz[i] = n[2];
      this.ao[i] = ao; this.z[i] = z == null ? this.ay - y : z;
    }
    /* resolve against the locked palette (the sun is fixed per world, so static sprites resolve once) */
    resolve(res, L) {
      const n = this.w * this.h, rung = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        if (!this.mat[i]) continue;
        const ndl = Math.max(0, this.nx[i] * L[0] + this.ny[i] * L[1] + this.nz[i] * L[2]);
        rung[i] = res(this.mat[i], this.ao[i], ndl, 1, i % this.w, (i / this.w) | 0);
      }
      return { w: this.w, h: this.h, ax: this.ax, ay: this.ay, mat: this.mat, rung, z: this.z };
    }
  }
  FW.Spr = Spr;
  FW.N = Object.freeze({ FRONT: [0, -1, 0], TOP: [0, 0, 1], SIDE: [1, 0, 0], BACK: [0, 1, 0], WEST: [-1, 0, 0] });
  FW.normalize = (v) => { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };
  /* normal of a sphere seen from the camera at (dx, dy) inside radius r; the camera looks north and
     down 30°, so screen-up mixes world up and world north */
  const VIEW_EL = Math.asin(0.5);
  FW.sphereN = (dx, dy, r) => {
    const sx = dx / r, sy = dy / r, sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
    /* screen basis in world: right=(1,0,0); up=(0, sin el, cos el); toward camera=(0,-cos el, sin el) */
    const se = Math.sin(VIEW_EL), ce = Math.cos(VIEW_EL);
    return [sx, -sy * se - sz * ce, -sy * ce + sz * se];
  };
  /* normal of a vertical cylinder (trunk, post, limb) at across-width position s in [-1,1] */
  FW.cylN = (s) => [s, -Math.sqrt(Math.max(0, 1 - s * s)), 0];
})();
