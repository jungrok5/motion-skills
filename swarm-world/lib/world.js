// swarm-world · world.js — a low-poly 3D world built live by a crew of agent cursors, just ahead of a traveller.
//
// You describe the world in world.html: a line (the route), the land, what stands where (items of kinds), the jobs that
// build them (raise · hop · lay · sweep), the fronts that run ahead (track, terrain, sea), the traveller, the crew, the
// camera and the light. start() schedules every job to a crew member, works out when each thing is built (when its cursor
// gets there), and from then on every frame is a pure function of t: seek(t) poses the camera, the light, the build front,
// the traveller, every cursor and tag, the construction marks, the session HUD and the log. The same page plays live and
// renders to MP4 (scripts/render.mjs), and scripts/check.mjs proves it first.
//
// Timeline: [0, intro) the crew flies in and gathers · [intro, intro + build) the build, progress p 0 → 1 ·
//           [intro + build, DURATION] the crew clocks off and the camera rises over the finished world.
// Contract (set by start()): window.seek(t), DURATION, FPS, SIZE, runChecks(t), FILM, __ready.
// Query: ?render=1 (no live loop) · ?loop=1 (play again 3 s after the end) · ?t=12 (one frozen frame) · ?scale=.5 · ?size=1080x1920 · ?q=low (lighter shadows).
//
// The build shader, the land / track / scheduler / overlay logic and the cursor glyphs are adapted from swarm-build's
// examples/3d.html and assets/swarm-build.js (MIT © Harnoor Singh, see LICENSE-swarm-build). This file re-implements them
// as a seekable function of time.
import * as THREE from './three.module.min.js';
import { cl, sm, lerp, lerp3, rng, h2, noise, fbm, countTo, chunk, fmt, clock } from './math.js';
import * as kit from './kit.js';
export { THREE, kit };
export * from './math.js';

const FONT_DIR = new URL('./fonts/', import.meta.url).href;
const MONO = '"SW Mono", "SW KR", ui-monospace, monospace';
// cursor glyphs (swarm-build): the arrow travels, the crosshair raises, the pen draws, sweeps and lays
const GLYPH = {
  arrow: { d: 'M2 1.5v16.1l4.3-4 2.9 6.6 2.8-1.2-2.8-6.5H15z', fill: true, at: [2, 1.5] },
  cross: { d: 'M11 1.5v7M11 13.5v7M1.5 11h7M13.5 11h7', fill: false, at: [11, 11] },
  pen: { d: 'M2 20l1.7-5.7L14.6 3.4a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L7.7 18.3z', fill: true, nib: 'M2 20l1.7-5.7 4 4z', at: [2, 20] },
  ibeam: { d: 'M2.5 2.5h7M6 2.5v19M2.5 21.5h7', fill: false, at: [6, 12] },
};
const fill = (tpl, v) => (typeof tpl === 'function' ? tpl(v) : String(tpl ?? '').replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ''))).replace(/\s+/g, ' ').trim();

export class World {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.o = o;
    this.render = q.has('render');
    this.low = q.get('q') === 'low';
    const sz = (q.get('size') || '').match(/^(\d+)x(\d+)$/);
    this.SIZE = sz ? { W: +sz[1], H: +sz[2] } : { W: (o.size || [1920, 1080])[0], H: (o.size || [1920, 1080])[1] };
    this.scale = +(q.get('scale') || 1);
    this.BUILD = o.build ?? 20; this.INTRO = o.intro ?? 1.2; this.OUTRO = o.outro ?? 7;
    this.DURATION = +(this.INTRO + this.BUILD + this.OUTRO).toFixed(3);
    this.FPS = o.fps ?? 30;
    this.title = o.title ?? 'world';
    this.crew = o.crew || { renderer: '#b49bff' };
    this.names = Object.keys(this.crew);
    this.accent = o.accent ?? '#ff5b3a';
    this.ui = { theme: 'light', objects: 'objects', agents: 'agents', builtIn: 'built in', ...(o.ui || {}) };
    const R = rng(o.seed ?? 20261106);
    this.rnd = R.rnd; this.rr = R.rr; this.pick = R.pick;
    // the pace of the work, in seconds, as build progress
    const P = (s) => s / this.BUILD;
    this.WIN = P(0.8);    // one thing: coral wireframe rising, then solid
    this.HOP = P(0.19);   // from one thing to the next in a hop job
    this.LANE = P(0.22);  // one row of a sweep
    this.GAP = P(0.38);   // a cursor's break between jobs
    this.P = P;
    this.kinds = {}; this.items = {}; this.jobs = []; this.fronts = []; this.marksL = []; this.placesFn = null;
    this.anims = {}; this.glowCfg = null; this.hooks = []; this.rules = []; this.extraText = [];
    this.claims = [];
    this.scene = new THREE.Scene();
    this.U = { uP: { value: 0 }, uW: { value: this.WIN }, uT: { value: 0 }, uAcc: { value: new THREE.Color(this.accent) } };
    this.mat = this.#materials();
    this.cam = { zones: [[0, { h: 6.2, back: 13, side: -1.6, look: 0.4 }]], fov: [50, 44], tallFov: [64, 60], fog: [[70, 360], [160, 760]], shadow: [46, 190] };
    this.skyCfg = {
      zen: ['#2c7fdc', '#5f7fc6'], hzn: ['#c8e5f6', '#f7d6b4'], sun: ['#fff1d8', '#ffb36a'], glow: [0.35, 1.0],
      light: ['#fff3df', '#ffbd7a'], lightI: [2.6, 3.0], hemi: ['#cfe9ff', '#ffe0c4'], ground: ['#7a9a5a', '#7d6a52'], hemiI: [1.15, 1.3],
      elev: [0.9, 0.22], az: [-0.75, -1.42], golden: [0.66, 1.0], exposure: 1.1, stars: 0,
    };
  }

  // ── the route ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // a Catmull-Rom line through control points [x, y, z]; everything is placed and timed by its distance s along it
  line(CP, samples = 60) {
    const PS = [];
    for (let i = 0; i < CP.length - 1; i++) {
      const p0 = CP[Math.max(0, i - 1)], p1 = CP[i], p2 = CP[i + 1], p3 = CP[Math.min(CP.length - 1, i + 2)];
      for (let k = 0; k < samples; k++) {
        const t = k / samples, t2 = t * t, t3 = t2 * t;
        PS.push(p1.map((_, j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    PS.push(CP[CP.length - 1]);
    const SL = [0];
    for (let i = 1; i < PS.length; i++) SL.push(SL[i - 1] + Math.hypot(PS[i][0] - PS[i - 1][0], PS[i][1] - PS[i - 1][1], PS[i][2] - PS[i - 1][2]));
    this.PS = PS; this.SL = SL; this.LEN = SL[SL.length - 1];
    this.timetable();
    return this;
  }
  // the point at path length s: p (position), t (tangent, flat), r (right, flat)
  at(s) {
    const { PS, SL } = this;
    s = cl(s, 0, this.LEN);
    let lo = 0, hi = SL.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (SL[m] <= s) lo = m; else hi = m; }
    const t = (s - SL[lo]) / (SL[hi] - SL[lo] || 1), a = PS[lo], b = PS[hi];
    const i0 = Math.max(0, lo - 2), i1 = Math.min(PS.length - 1, hi + 2);
    const tx = PS[i1][0] - PS[i0][0], tz = PS[i1][2] - PS[i0][2], tl = Math.hypot(tx, tz) || 1;
    return { p: [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], t: [tx / tl, 0, tz / tl], r: [-tz / tl, 0, tx / tl] };
  }
  // a point beside the line: side −1 left / +1 right of the direction of travel, off metres out → [x, z]
  beside(s, side, off) { const a = this.at(s); return [a.p[0] + a.r[0] * side * off, a.p[2] + a.r[2] * side * off]; }
  heading(s) { const a = this.at(s); return Math.atan2(a.t[0], a.t[2]); }
  // the closest point on the line: distance d, path length s, height y, plus the line's height blended over nearby stretches
  // (yn narrowly, for the bed; yb broadly, for a valley floor that follows a climbing line)
  nearest(x, z) {
    const PS = this.PS;
    let bd = 1e9, bi = 0, wn = 0, yn = 0, wb = 0, yb = 0;
    for (let i = 0; i < PS.length; i += 2) {
      const dx = x - PS[i][0], dz = z - PS[i][2], d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; bi = i; }
      if (d2 < 3600) { const k = (1 - d2 / 3600) ** 2; wb += k; yb += k * PS[i][1]; if (d2 < 196) { const q2 = (1 - d2 / 196) ** 3; wn += q2; yn += q2 * PS[i][1]; } }
    }
    const y = PS[bi][1];
    return { d: Math.sqrt(bd), s: this.SL[bi], y, yn: wn ? yn / wn : y, yb: wb ? yb / wb : y };
  }

  // ── the traveller's timetable: eases out of the start, stops at `to` as the build ends ────────────────────────────────
  timetable({ from = Math.min(34, this.LEN * 0.12), to = this.LEN - 6, start = 0.1, stop = 0.84, crawl = 0.03 } = {}) {
    const SCH = new Float64Array(1001);
    for (let i = 1; i <= 1000; i++) { const p = (i - 0.5) / 1000; SCH[i] = SCH[i - 1] + (crawl + (1 - crawl) * sm(0, start, p)) * (1 - sm(stop, 1.0, p)); }
    this.S0 = from; this.S1 = to; this.SCH = SCH;
    return this;
  }
  travS(p) { return this.S0 + (this.S1 - this.S0) * (this.SCH[Math.round(cl(p) * 1000)] / this.SCH[1000]); }
  pOfS(s) {
    const SCH = this.SCH, f = cl((s - this.S0) / (this.S1 - this.S0)) * SCH[1000];
    let lo = 0, hi = 1000;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (SCH[m] <= f) lo = m; else hi = m; }
    return lo / 1000;
  }
  // when something at path length s is built: a burst around the start, then a front running `lead` metres ahead
  buildAt(s, lead = 36) { return Math.min(0.955, Math.max(0.006 + 0.06 * cl(s / (this.S0 + lead + 10)), this.pOfS(s - lead))); }
  frontS(p, lead) { return Math.max(0, Math.min(((p - 0.006) / 0.06) * (this.S0 + lead + 10), this.travS(p) + lead)); }

  // ── the land ──────────────────────────────────────────────────────────────────────────────────────────────────────
  // height(x, z, nr) → metres; color(x, y, z, ny, nr, out) → out (a THREE.Color). The line cuts a bed through it.
  land({ height, color, bounds = [-160, 175, -260, 225], res = [134, 194], lead = 84, spread = 0.32, bed = true, cast = true }) {
    this.landCfg = { height, color, bounds, res, lead, spread, bed, cast };
    return this;
  }
  // the ground under (x, z), with the bed for the line
  ground(x, z, nr = this.nearest(x, z)) {
    const L = this.landCfg;
    let h = L ? L.height(x, z, nr) : 0;
    if (!L || !L.bed) return h;
    h = lerp(h, nr.yn - 0.24, sm(13, 3.2, nr.d));
    return nr.d < 2.4 ? lerp(nr.yn, nr.y, sm(2.4, 0, nr.d)) - 0.2 : h;
  }
  // low-poly water at `level`, appearing as the front reaches it
  sea({ level = 0, bounds = [8, 260, -260, 225], res = [56, 100], color = '#2cb6c0', opacity = 0.8, lead = 84, spread = 0.3, waves = true, shininess = 70 } = {}) {
    this.seaCfg = { level, bounds, res, color, opacity, lead, spread, waves, shininess };
    return this;
  }

  // ── what gets built ───────────────────────────────────────────────────────────────────────────────────────────────
  // kind(name, { geo, label, size: [half width, height, half depth] (in instance units), words: [doing, done, plural],
  //   say: { doing, did } templates, lead, shadow, quiet })
  kind(name, o) {
    this.kinds[name] = { label: name, size: [1, 1, 1], shadow: true, ...o, name };
    this.items[name] = this.items[name] || [];
    return this;
  }
  // add an item: { x, y, z, ry, sx, sy, sz, color } (+ s, lead or b to time it yourself). y defaults to the ground.
  add(kind, it) {
    if (!this.kinds[kind]) throw new Error(`add('${kind}'): no such kind — call kind('${kind}', …) first`);
    if (it.y == null) it.y = this.ground(it.x, it.z);
    const nr = this.nearest(it.x, it.z);
    it.kind = kind; it.d = nr.d;
    if (it.s == null) it.s = nr.s;
    if (it.b == null) it.b = this.buildAt(it.s + Math.max(0, nr.d - 10) * 0.3, it.lead ?? this.kinds[kind].lead ?? 36);
    this.items[kind].push(it);
    return it;
  }
  list(kind) { return this.items[kind] || []; }
  // footprints that keep things apart
  free(x, z, r) { return this.claims.every(([a, b, c]) => (x - a) ** 2 + (z - b) ** 2 > (r + c) ** 2); }
  claim(x, z, r) { this.claims.push([x, z, r]); return this; }
  side(it) { const a = this.at(it.s); return (it.x - a.p[0]) * a.r[0] + (it.z - a.p[2]) * a.r[2] > 0 ? 1 : -1; }
  // the order a cursor walks a group in: one side of the line, then along it
  lined(list) { return list.slice().sort((a, b) => this.side(a) - this.side(b) || a.s - b.s); }
  chunk(list, n) { return chunk(list, n); }
  // move every instance per frame (blades turn, boats bob, clouds drift): fn(it, i, t, p) → overrides of x … sz
  animate(kind, fn) { this.anims[kind] = fn; return this; }

  // ── the crew's jobs ───────────────────────────────────────────────────────────────────────────────────────────────
  // raise: one big thing pulled up out of the ground (crosshair) · hop: a cursor hops from one thing to the next, each
  // built as it lands · lay: a run built along a stroke (fence, pipe, cable) · sweep: a field filled row by row.
  // roles: who may do it (the first who can start soonest and still beat the traveller there gets it).
  // o: { doing, did, glyph, label, then: { n, label, doing }, quiet, lanes, field }
  raise(it, roles, o = {}) { return this.#job('raise', roles, [it], o); }
  hop(items, roles, o = {}) { return items.length ? this.#job('hop', roles, items, o) : null; }
  lay(items, roles, o = {}) { return items.length ? this.#job('lay', roles, items, o) : null; }
  // field: { c: [x, z], u: [ux, uz] (unit, along its length), len, wid }; each item gets u, v in it
  sweep(items, roles, o = {}) {
    if (!items.length) return null;
    const f = o.field;
    for (const it of items) { const dx = it.x - f.c[0], dz = it.z - f.c[1]; it.u = dx * f.u[0] + dz * f.u[1]; it.v = -dx * f.u[1] + dz * f.u[0]; }
    f.y = f.y ?? items.reduce((a, it) => a + it.y, 0) / items.length;
    const lanes = o.lanes ?? 4;
    const u0 = o.u0 ?? Math.min(...items.map((it) => it.u)) - 0.4, u1 = o.u1 ?? Math.max(...items.map((it) => it.u)) + 0.4;
    return this.#job('sweep', roles, items, { lanes, u0, u1, dur: lanes * this.LANE + this.WIN * 0.45, ...o, f });
  }
  #job(type, roles, items, extra) {
    roles = [].concat(roles);
    for (const r of roles) if (!this.crew[r]) throw new Error(`job role '${r}' is not in the crew`);
    const n = items.length, k0 = this.kinds[items[0].kind];
    const dur = extra.dur ?? (type === 'raise' ? this.WIN : type === 'hop' ? n * this.HOP + this.WIN * 0.45 : Math.max(this.P(0.44), n * this.P(0.068)));
    const j = {
      type, roles, items, n, dur, want: Math.min(...items.map((it) => it.b)),
      deadline: Math.max(0.012, this.pOfS(Math.min(...items.map((it) => it.s)) - 1)),
      label: k0.label, glyph: type === 'raise' ? 'cross' : 'pen', ...extra,
    };
    this.jobs.push(j);
    return j;
  }

  // ── fronts: work that runs ahead of the traveller the whole way (laying track, shaping terrain, painting the sea) ─────
  // { by, label, p0, p1, at: (p) → [x, y, z] (where the cursor is), box: (p) → points to frame (or a half size), count:
  //   'terrain' | 'sea' | kind name | sorted array of build times, doing, did }
  front(f) { this.fronts.push({ p0: 0.006, p1: 0.94, box: 8, glyph: 'pen', ...f }); return this; }
  // a ground point beside the line at path length s, L metres to the side, a little above the surface
  groundAt(s, L, lift = 0.3) { const a = this.at(s), x = a.p[0] + a.r[0] * L, z = a.p[2] + a.r[2] * L; return [x, Math.max(this.seaCfg ? this.seaCfg.level : -1e9, this.ground(x, z)) + lift, z]; }
  // the usual terrain front: a cursor sweeping side to side far ahead of the traveller
  terrainFront({ by, phase = 0, amp = 24, freq = 7, lead = 84, doing = 'shaping the land', did = 'finished the terrain', label = 'Terrain' }) {
    return this.front({ by, label, count: 'terrain', p0: 0.006, p1: 0.94, doing, did,
      at: (p) => { const L = amp * Math.sin(Math.PI * 2 * (p * freq + phase)); return this.groundAt(this.frontS(p, lead) - Math.max(0, Math.abs(L) - amp * 0.66) * 0.32, L); } });
  }
  // the track (or road markers, or buoys): sleepers and rails laid just ahead of the traveller, with its front
  track({ by, lead = 24, spacing = 0.9, gauge = 0.62, sleeper = kit.merge([kit.part(kit.Box(2.1, 0.16, 0.42), '#7b5a3e')]), rail = kit.merge([kit.part(kit.Box(0.13, 0.13, 1), '#aab1ba', { z: -0.5 }), kit.part(kit.Box(0.22, 0.04, 1), '#7d838c', { z: -0.5 })]),
    label = 'Track', doing = 'laying track', did = 'laid {n} sleepers', bed = 2.6, drop = 0.16 } = {}) {
    this.kind('sleeper', { geo: sleeper, label, size: [1, 0.3, 0.5], quiet: true });
    if (rail) this.kind('rail', { geo: rail, label, size: [0.2, 0.2, 0.5], quiet: true });
    for (let s = 0.4; s < this.LEN - 0.3; s += spacing) {
      const a = this.at(s), b = this.buildAt(s, lead), ry = Math.atan2(a.t[0], a.t[2]);
      this.add('sleeper', { x: a.p[0], y: a.p[1] - drop, z: a.p[2], ry, s, b });
      if (rail) for (const side of [-gauge, gauge]) this.add('rail', { x: a.p[0] + a.r[0] * side, y: a.p[1], z: a.p[2] + a.r[2] * side, ry, sz: spacing + 0.05, s, b: b + 0.004 });
    }
    for (let s = 0; s < this.LEN; s += 3) { const a = this.at(s); this.claim(a.p[0], a.p[2], bed); }
    if (by) this.front({ by, label, count: 'sleeper', p0: 0.006, p1: 0.955, doing, did,
      at: (p) => { const a = this.at(this.frontS(p, lead)); return [a.p[0], a.p[1] + 0.3, a.p[2]]; },
      box: (p) => { const s1 = this.frontS(p, lead), pts = []; for (const s0 of [s1 - 10, s1]) { const a = this.at(s0); for (const k of [-1.3, 1.3]) pts.push([a.p[0] + a.r[0] * k, a.p[1] - 0.2, a.p[2] + a.r[2] * k], [a.p[0] + a.r[0] * k, a.p[1] + 0.5, a.p[2] + a.r[2] * k]); } return pts; } });
    return this;
  }

  // ── the traveller: cars of parts [geo, color, opts], following the line, assembled first by its driver ──────────────
  // { by, offsets, lift, smoke: { color, y, fwd } | false, say: { place, drive, arrive, arrived } }
  vehicle(cars, o = {}) {
    this.veh = { cars, offsets: o.offsets || cars.map((_, i) => -i * 5.5), lift: o.lift ?? 0.13, by: o.by, smoke: o.smoke === false ? null : { color: '#fbf8f2', y: 3.1, fwd: 2.25, ...(o.smoke || {}) },
      sound: o.sound ?? (o.smoke === false ? 'hum' : 'chuff'), say: { place: 'placing the train', drive: 'driving the train', arrive: 'pulling into the station', arrived: 'pulled into the station', ...(o.say || {}) }, top: o.top ?? 3.4 };
    if (o.by && !this.crew[o.by]) throw new Error(`vehicle driver '${o.by}' is not in the crew`);
    return this;
  }

  // ── camera, sky, glows, landmarks, hooks, checks ──────────────────────────────────────────────────────────────────
  // zones: [[s, { h, back, side, look }], …] blended along the line · reveal: { pos, tgt, turn: +1 | −1 } · fov, tallFov, fog
  camera(o) { Object.assign(this.cam, o); return this; }
  sky(o) { Object.assign(this.skyCfg, o); return this; }
  glow(points, o = {}) { this.glowCfg = { points, from: 0.86, color: '#ffc77a', size: [2.4, 6], ...o }; return this; }
  // a landmark gives the log its place words ("by the windmill"); places(fn(x, y, z) → words[]) is the fallback
  landmark(x, z, words, r = 42) { this.marksL.push({ x, z, words: [].concat(words), r }); return this; }
  places(fn) { this.placesFn = fn; return this; }
  onFrame(fn) { this.hooks.push(fn); return this; }
  check(name, fn) { this.rules.push([name, fn]); return this; }
  text(...s) { this.extraText.push(...s); return this; }

  // ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  #materials() {
    const U = this.U;
    function buildable(mat, mode, { wire = false, depth = false, waves = false } = {}) {
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        let body = 'vK = clamp((uP - aBuild) / uW, 0.0, 1.0);\n';
        if (mode === 'grow') body += 'float gk = smoothstep(0.0, 0.55, vK);\ntransformed.y *= gk;\ntransformed.xz *= mix(0.5, 1.0, gk);\n';
        if (waves) body += 'transformed.y += sin(transformed.x * 0.33 + uT * 1.5) * 0.12 + cos(transformed.z * 0.27 + uT * 1.15) * 0.1;\n';
        body += 'if (vK <= 0.0) transformed = vec3(0.0);\n';
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aBuild;\nuniform float uP;\nuniform float uW;\nuniform float uT;\nvarying float vK;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + body);
        let f = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vK;\nuniform vec3 uAcc;');
        if (wire) f = f.replace('void main() {', 'void main() {\n float wa = vK > 0.0 ? 1.0 - smoothstep(0.45, 1.0, vK) : 0.0;\n if (wa < 0.01) discard;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.a *= wa;');
        else if (depth) f = f.replace('void main() {', 'void main() {\n if (vK < 0.62) discard;');
        else f = f.replace('void main() {', 'void main() {\n float dk = smoothstep(0.4, 1.0, vK);\n if (dk < 0.001) discard;\n if (dk < 0.999 && fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) > dk) discard;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(uAcc, diffuseColor.rgb, smoothstep(0.5, 1.0, vK));');
        sh.fragmentShader = f;
      };
      mat.customProgramCacheKey = () => ['build', mode, wire, depth, waves].join('-');
      return mat;
    }
    const acc = this.accent;
    const lam = () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const wir = (op) => new THREE.MeshBasicMaterial({ color: acc, wireframe: true, transparent: true, depthWrite: false, opacity: op, toneMapped: false, fog: false });
    const dep = () => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    return {
      buildable,
      solid: buildable(lam(), 'grow'), wire: buildable(wir(0.9), 'grow', { wire: true }), depth: buildable(dep(), 'grow', { depth: true }),
      ground: buildable(lam(), 'appear'), groundWire: buildable(wir(0.55), 'appear', { wire: true }), groundDepth: buildable(dep(), 'appear', { depth: true }),
    };
  }

  // hand the jobs out, in the order they are wanted, to whoever can start soonest and still beat the traveller there
  #schedule() {
    const freeAt = {}, blocked = {}, { GAP, HOP, WIN, LANE } = this;
    for (const f of this.fronts) (blocked[f.by] = blocked[f.by] || []).push([f.p0, f.p1]);
    if (this.veh?.by) (blocked[this.veh.by] = blocked[this.veh.by] || []).push([0, 1.01]);
    const startFor = (by, want, dur) => {
      let s = Math.max(want, (freeAt[by] ?? 0.004) + GAP);
      for (const [a, b] of (blocked[by] || []).slice().sort((x, y) => x[0] - y[0])) if (s < b + GAP && s + dur > a - GAP) s = b + GAP;
      return s;
    };
    this.jobs.sort((a, b) => a.want - b.want);
    for (const j of this.jobs) {
      let best = null;
      for (const by of j.roles) { const s = startFor(by, j.want, j.dur); if (!best || s < best.s - 1e-9) best = { by, s }; }
      if (best.s + j.dur * 0.4 > j.deadline) { j.skip = true; continue; }   // nobody can make it in time: it builds itself
      j.p0 = best.s; j.by = best.by; freeAt[j.by] = j.p0 + j.dur;
      const { items } = j;   // each thing is built when its cursor gets there
      if (j.type === 'raise') items[0].b = j.p0;
      else if (j.type === 'hop') items.forEach((it, k) => { it.b = j.p0 + k * HOP; });
      else if (j.type === 'lay') items.forEach((it, k) => { it.b = j.p0 + (j.dur - WIN * 0.3) * (k / Math.max(1, items.length - 1)); });
      else {
        const w = j.f.wid / j.lanes;
        for (const it of items) {
          const lane = Math.min(j.lanes - 1, Math.max(0, Math.floor((it.v + j.f.wid / 2) / w)));
          const f = cl((it.u - j.u0) / (j.u1 - j.u0));
          it.b = j.p0 + (lane + (lane % 2 ? 1 - f : f)) * LANE;
        }
      }
      j.bs = items.map((it) => it.b).sort((a, b) => a - b);
    }
    this.live = this.jobs.filter((j) => !j.skip).sort((a, b) => a.p0 - b.p0);
    this.skipped = this.jobs.filter((j) => j.skip);
  }

  // where a job's cursor is working at progress p, in the world
  tallOf(it) { return this.kinds[it.kind].size[1] * (it.sy || it.sx || 1); }
  grown(it, p) { return sm(0, 0.55, (p - it.b) / this.WIN); }
  topNow(it, p) { return [it.x, it.y + this.tallOf(it) * Math.max(0.06, this.grown(it, p)), it.z]; }
  workPoint(j, p) {
    const its = j.items, { HOP } = this;
    if (j.type === 'raise') {
      const it = its[0];
      if (j.across) { const w = this.kinds[it.kind].size[0] * (it.sx || 1); return [it.x - w + 2 * w * this.grown(it, p), it.y + this.tallOf(it) * 0.6, it.z]; }
      return this.topNow(it, p);
    }
    if (j.type === 'hop') {
      const tau = Math.max(0, p - j.p0), k = Math.min(its.length - 1, Math.floor(tau / HOP)), f = cl((tau - k * HOP) / HOP), here = this.topNow(its[k], p);
      if (k === its.length - 1 || f < 0.55) return here;
      const nx = its[k + 1];
      return lerp3(here, [nx.x, nx.y + 0.3, nx.z], sm(0.55, 1, f));
    }
    if (j.type === 'lay') {
      const n = its.length;
      if (n === 1) return [its[0].x, its[0].y + 1, its[0].z];
      const x = cl((p - j.p0) / Math.max(1e-6, j.dur - this.WIN * 0.3)) * (n - 1), k = Math.min(n - 2, Math.floor(x)), a = its[k], b = its[k + 1], f = x - k;
      return [lerp(a.x, b.x, f), lerp(a.y, b.y, f) + 1.0, lerp(a.z, b.z, f)];
    }
    const f0 = j.f, tau = cl((p - j.p0) / (j.lanes * this.LANE)) * j.lanes, lane = Math.min(j.lanes - 1, Math.floor(tau)), fr = Math.min(1, tau - lane);
    const u = lerp(j.u0, j.u1, lane % 2 ? 1 - fr : fr), v = -f0.wid / 2 + (lane + 0.5) * (f0.wid / j.lanes);
    return [f0.c[0] + f0.u[0] * u - f0.u[1] * v, f0.y + 1.1, f0.c[1] + f0.u[1] * u + f0.u[0] * v];
  }

  // ── words: what each cursor says it is doing, and the log line when it is done ───────────────────────────────────────
  #words(kind) {
    const k = this.kinds[kind], lab = k.label.toLowerCase();
    const [ing, ed, plural] = k.words || ['placing', 'placed', lab + 's'];
    return { ing, ed, plural, one: k.one || plural.replace(/s$/, ''), lab };
  }
  where(items) {
    const x = items.reduce((a, it) => a + it.x, 0) / items.length, z = items.reduce((a, it) => a + it.z, 0) / items.length, y = items.reduce((a, it) => a + it.y, 0) / items.length;
    let best = null, bd = 1e9;
    for (const m of this.marksL) { const d = Math.hypot(m.x - x, m.z - z); if (d < m.r && d < bd) { bd = d; best = m.words; } }
    const words = best || (this.placesFn ? this.placesFn(x, y, z) : null);
    return words && words.length ? words[Math.abs(Math.round(x * 3 + z * 7)) % words.length] : '';   // the same place always gets the same words
  }
  #doing(j, p) {
    const w = this.#words(j.items[0].kind), sayK = this.kinds[j.items[0].kind].say || {};
    const k = Math.max(1, countTo(j.bs, p)), v = { ...w, n: j.n, k: Math.min(k, j.n), label: j.label };
    if (j.type === 'raise') return fill(j.doing ?? sayK.doing ?? `${w.ing} the ${w.lab}`, v);
    if (j.type === 'sweep') { v.row = Math.min(j.lanes, 1 + Math.floor(Math.max(0, p - j.p0) / this.LANE)); v.rows = j.lanes; return fill(j.doing ?? sayK.sweep ?? `${w.ing} ${w.plural}, row {row}/{rows}`, v); }
    if (j.then) { const n1 = j.then.n; if (k > n1) return fill(j.then.doing, { ...v, k: k - n1, n: j.n - n1 }); v.n = n1; v.k = Math.min(k, n1); }
    return fill(j.doing ?? sayK.doing ?? `${w.ing} {plural} {k}/{n}`, v);
  }
  #did(j) {
    const w = this.#words(j.items[0].kind), sayK = this.kinds[j.items[0].kind].say || {};
    const n = j.then ? j.then.n : j.n, v = { ...w, n: fmt(n), where: j.type === 'sweep' ? '' : this.where(j.items), label: j.label, plural: n === 1 ? w.one : w.plural };
    if (j.type === 'raise') return fill(j.did ?? sayK.did ?? `${w.ed} the ${w.lab}`, v);
    return fill(j.did ?? sayK.did ?? `${w.ed} {n} {plural} {where}`, v);
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  async start() {
    if (!this.PS) throw new Error('call line([...]) before start()');
    this.#schedule();
    this.#scene3d();
    this.#crewSegments();
    this.#story();
    await this.#fonts();
    this.#canvas();
    window.FILM = this;
    Object.assign(window, { seek: (t) => this.seek(t), DURATION: this.DURATION, FPS: this.FPS, SIZE: this.SIZE, runChecks: (t) => this.runChecks(t) });
    const ft = this.q.get('t');
    if (this.render) { this.#size(Math.round(this.SIZE.W * this.scale), Math.round(this.SIZE.H * this.scale)); this.seek(+(ft || 0)); window.__ready = true; return this; }
    this.#live(ft != null ? +ft : null);
    window.__ready = true;
    return this;
  }

  // ── the 3D scene ──────────────────────────────────────────────────────────────────────────────────────────────────
  #scene3d() {
    const { scene, mat } = this;
    const canvas = document.createElement('canvas');
    let gl = null;
    try { gl = new THREE.WebGLRenderer({ canvas, antialias: !this.low, powerPreference: 'high-performance', preserveDrawingBuffer: false }); } catch (e) { console.error('[swarm-world] WebGL is not available', e); }
    this.gl = gl;
    if (gl) {
      gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap;
      gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = this.skyCfg.exposure;
    }
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.3, 1200);

    // instances, one InstancedMesh pair (solid + coral wireframe) per kind
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), col = new THREE.Color();
    this.compose = (it) => M.compose(V.set(it.x, it.y, it.z), Q.setFromEuler(E.set(it.rx || 0, it.ry || 0, it.rz || 0)), S.set(it.sx || 1, it.sy || it.sx || 1, it.sz || it.sx || 1));
    this.meshes = {};
    for (const [name, k] of Object.entries(this.kinds)) {
      const list = this.items[name];
      if (!list.length) continue;
      const g = k.geo.clone();
      g.setAttribute('aBuild', new THREE.InstancedBufferAttribute(new Float32Array(list.map((it) => it.b)), 1));
      const a = new THREE.InstancedMesh(g, k.material ? mat.buildable(k.material, 'grow') : mat.solid, list.length), w = new THREE.InstancedMesh(g, mat.wire, list.length);
      list.forEach((it, i) => { this.compose(it); a.setMatrixAt(i, M); w.setMatrixAt(i, M); if (it.color) a.setColorAt(i, col.set(it.color)); });
      a.castShadow = k.shadow; a.receiveShadow = true; a.customDepthMaterial = mat.depth;
      a.frustumCulled = w.frustumCulled = false; w.renderOrder = 2;
      const b0 = Math.min(...list.map((it) => it.b)), b1 = Math.max(...list.map((it) => it.b)) + this.WIN;
      scene.add(a, w);
      this.meshes[name] = { a, w, list, b0, b1 };
    }
    this.M = M;

    // the land: a low-poly heightfield, coloured by what it is, appearing just ahead of the build front
    this.terrainB = []; this.seaB = [];
    const L = this.landCfg;
    if (L) {
      const [X0, X1, Z0, Z1] = L.bounds, [NX, NZ] = L.res;
      const gx = (i) => X0 + (X1 - X0) * i / NX, gz = (j) => Z0 + (Z1 - Z0) * j / NZ;
      const GP = [];
      for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
        const edge = i === 0 || j === 0 || i === NX || j === NZ, cw = (X1 - X0) / NX;
        const x = gx(i) + (edge ? 0 : (h2(i, j) - 0.5) * cw * 0.5), z = gz(j) + (edge ? 0 : (h2(j + 9, i) - 0.5) * cw * 0.5), nr = this.nearest(x, z);
        GP.push([x, this.ground(x, z, nr), z, nr]);
      }
      const tris = NX * NZ * 2, pos = new Float32Array(tris * 9), cols = new Float32Array(tris * 9), ab = new Float32Array(tris * 3);
      const c = new THREE.Color(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nm = new THREE.Vector3();
      let t = 0;
      const id = (i, j) => j * (NX + 1) + i;
      const face = (A, B, Cc) => {
        const cx = (A[0] + B[0] + Cc[0]) / 3, cy = (A[1] + B[1] + Cc[1]) / 3, cz = (A[2] + B[2] + Cc[2]) / 3;
        e1.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); e2.set(Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]); nm.crossVectors(e1, e2).normalize();
        const nr = A[3].d < B[3].d ? (A[3].d < Cc[3].d ? A[3] : Cc[3]) : (B[3].d < Cc[3].d ? B[3] : Cc[3]);
        L.color(cx, cy, cz, Math.abs(nm.y), nr, c);
        const b = this.buildAt(nr.s + Math.max(0, nr.d - 16) * L.spread, L.lead);
        [A, B, Cc].forEach((P, k) => { pos.set([P[0], P[1], P[2]], t * 9 + k * 3); c.toArray(cols, t * 9 + k * 3); ab[t * 3 + k] = b; });
        t++;
      };
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const a = GP[id(i, j)], b = GP[id(i + 1, j)], cc = GP[id(i, j + 1)], d = GP[id(i + 1, j + 1)];
        if ((i + j) % 2) { face(a, cc, b); face(b, cc, d); } else { face(a, cc, d); face(a, d, b); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      g.setAttribute('aBuild', new THREE.BufferAttribute(ab, 1));
      g.computeVertexNormals();
      const land = new THREE.Mesh(g, mat.ground), landWire = new THREE.Mesh(g, mat.groundWire);
      land.receiveShadow = true; land.castShadow = L.cast; land.customDepthMaterial = mat.groundDepth;
      land.frustumCulled = landWire.frustumCulled = false; landWire.renderOrder = 2;
      scene.add(land, landWire);
      this.terrainB = Float32Array.from({ length: t }, (_, k) => ab[k * 3]).sort();
    }
    // the sea, with low-poly waves
    const SC = this.seaCfg;
    if (SC) {
      const [sx0, sx1, sz0, sz1] = SC.bounds, [nx, nz] = SC.res, tris = nx * nz * 2;
      const pos = new Float32Array(tris * 9), ab = new Float32Array(tris * 3);
      let t = 0;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x0 = sx0 + (sx1 - sx0) * i / nx, x1 = sx0 + (sx1 - sx0) * (i + 1) / nx, z0 = sz0 + (sz1 - sz0) * j / nz, z1 = sz0 + (sz1 - sz0) * (j + 1) / nz;
        for (const tri of [[[x0, z0], [x0, z1], [x1, z1]], [[x0, z0], [x1, z1], [x1, z0]]]) {
          const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cz = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, nr = this.nearest(cx, cz);
          const b = this.buildAt(nr.s + Math.max(0, nr.d - 20) * SC.spread, SC.lead);
          tri.forEach(([x, z], k) => { pos.set([x, SC.level, z], t * 9 + k * 3); ab[t * 3 + k] = b; });
          t++;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aBuild', new THREE.BufferAttribute(ab, 1));
      g.computeVertexNormals();
      this.seaB = Float32Array.from({ length: t }, (_, k) => ab[k * 3]).sort();
      const sea = mat.buildable(new THREE.MeshPhongMaterial({ color: SC.color, specular: '#ffffff', shininess: SC.shininess, flatShading: true, transparent: SC.opacity < 1, opacity: SC.opacity }), 'appear', { waves: SC.waves });
      const seaWire = mat.buildable(new THREE.MeshBasicMaterial({ color: this.accent, wireframe: true, transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false, fog: false }), 'appear', { wire: true, waves: SC.waves });
      const water = new THREE.Mesh(g, sea), waterWire = new THREE.Mesh(g, seaWire);
      water.receiveShadow = true; water.frustumCulled = waterWire.frustumCulled = false; water.renderOrder = 1; waterWire.renderOrder = 2;
      scene.add(water, waterWire);
    }

    // the traveller: cars assembled first, part by part
    this.cars = [];
    if (this.veh) {
      this.veh.cars.forEach((parts, ci) => {
        const b0 = 0.004 + ci * 0.01;
        const pieces = parts.map(([geo, color, o]) => kit.part(geo, color, o));
        const g = kit.merge(pieces), n = g.attributes.position.count, ab = new Float32Array(n);
        let o = 0;
        pieces.forEach((pc, k) => { const c = pc.attributes.position.count; ab.fill(b0 + k * 0.0012, o, o + c); o += c; });
        g.setAttribute('aBuild', new THREE.BufferAttribute(ab, 1));
        const a = new THREE.Mesh(g, mat.solid), w = new THREE.Mesh(g, mat.wire);
        a.castShadow = a.receiveShadow = true; a.customDepthMaterial = mat.depth; w.renderOrder = 2;
        const grp = new THREE.Group(); grp.add(a, w); scene.add(grp);
        this.cars.push(grp);
      });
      if (this.veh.smoke) {
        this.PUFFS = 40;
        this.puffs = new THREE.InstancedMesh(kit.jitter(kit.Ico(0.5, 1), 0.25, 3), new THREE.MeshLambertMaterial({ color: this.veh.smoke.color, emissive: this.veh.smoke.emissive || '#3a3a40', flatShading: true, transparent: (this.veh.smoke.opacity ?? 1) < 1, opacity: this.veh.smoke.opacity ?? 1 }), this.PUFFS);
        this.puffs.frustumCulled = false; this.puffs.castShadow = false; scene.add(this.puffs);
      }
    }

    // sky, sun, light
    const K = this.skyCfg, C = kit.C;
    this.skyU = { uZen: { value: C(K.zen[0]) }, uHzn: { value: C(K.hzn[0]) }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: C(K.sun[0]) }, uGlow: { value: K.glow[0] }, uStars: { value: K.stars } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; }',
      fragmentShader: `uniform vec3 uZen, uHzn, uSun, uSunCol; uniform float uGlow, uStars; varying vec3 vD;
        float hs(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vD); float h = max(d.y, 0.0), s = max(dot(d, normalize(uSun)), 0.0);
          vec3 c = mix(uHzn, uZen, pow(h, 0.42));
          c += uSunCol * (pow(s, 8.0) * 0.35 + pow(s, 64.0) * 0.6) * uGlow + uSunCol * smoothstep(0.9993, 0.9997, s) * 1.5;
          if (uStars > 0.0) { vec3 g = floor(d * 260.0); float r = hs(g); float st = step(0.9965, r) * smoothstep(0.02, 0.2, d.y);
            vec3 f = fract(d * 260.0) - 0.5; c += vec3(st * uStars * (0.5 + 0.5 * hs(g + 3.1)) * smoothstep(0.5, 0.15, length(f))); }
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky); this.skyMesh = sky;
    scene.fog = new THREE.Fog(K.hzn[0], 70, 360);
    this.hemi = new THREE.HemisphereLight(K.hemi[0], K.ground[0], K.hemiI[0]);
    this.sun = new THREE.DirectionalLight(K.light[0], K.lightI[0]);
    this.sun.castShadow = true;
    const ms = this.low ? 1024 : 2048;
    this.sun.shadow.mapSize.set(ms, ms); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.35;
    scene.add(this.hemi, this.sun, this.sun.target);
    // warm glows for lamps and windows at golden hour
    const G = this.glowCfg;
    if (G && G.points.length) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,220,150,.75)'); gr.addColorStop(1, 'rgba(255,180,90,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(G.points.flat(), 3));
      this.glowMat = new THREE.PointsMaterial({ size: G.size[0], map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: G.color, opacity: 0 });
      const pts = new THREE.Points(geo, this.glowMat); pts.frustumCulled = false; scene.add(pts);
    }
    // the reveal: by default the camera rises behind the last stop and looks back over the line
    const end = this.at(this.S1);
    const mid = this.at(this.LEN * 0.55).p;
    this.cam.reveal = { pos: [end.p[0] - end.t[0] * 44, end.p[1] + 36, end.p[2] - end.t[2] * 44], tgt: [mid[0], mid[1], mid[2]], turn: 0, ...(this.cam.reveal || {}) };
    this.allB = Object.values(this.items).flat().map((it) => it.b).sort((a, b) => a - b);
  }

  // ── the crew: each agent's list of sites over the build ───────────────────────────────────────────────────────────
  #crewSegments() {
    const segs = Object.fromEntries(this.names.map((n) => [n, []]));
    for (const j of this.live) segs[j.by].push({ p0: j.p0, p1: j.p0 + j.dur, pt: (p) => this.workPoint(j, p), glyph: j.glyph, doing: (p) => this.#doing(j, p), job: j });
    for (const f of this.fronts) segs[f.by].push({ p0: f.p0, p1: f.p1, pt: f.at, glyph: f.glyph, doing: (p) => fill(f.doing, { p }), front: f });
    if (this.veh?.by) {
      const V = this.veh;
      segs[V.by].push({ p0: 0.004, p1: 0.04, pt: (p) => this.#carTop(0, 1 + 2 * sm(0.004, 0.036, p)), glyph: 'cross', doing: () => V.say.place, ride: true });
      segs[V.by].push({ p0: 0.06, p1: 1, pt: () => this.#carTop(0, V.top), glyph: 'arrow', doing: (p) => (p < 0.9 ? V.say.drive : V.say.arrive), ride: true, last: true });
    }
    for (const n of this.names) segs[n].sort((a, b) => a.p0 - b.p0);
    this.segs = segs;
  }
  #carTop(ci, up) {   // above a car of the traveller, at the current progress
    const s = this.travS(this.p ?? 0) + (this.veh.offsets[ci] || 0), a = this.at(s);
    return [a.p[0], a.p[1] + this.veh.lift + up, a.p[2]];
  }

  // ── the story: the log, the sound events, the text ────────────────────────────────────────────────────────────────
  #story() {
    const B = this.BUILD, events = [];
    for (const j of this.live) if (!j.quiet && !this.kinds[j.items[0].kind].quiet) events.push({ p: j.p0 + j.dur, by: j.by, text: this.#did(j), big: j.type === 'raise' || j.type === 'sweep' });
    for (const f of this.fronts) if (f.did) events.push({ p: f.p1, by: f.by, text: fill(f.did, { n: fmt(this.#frontCount(f).length) }), big: true });
    if (this.veh?.by) events.push({ p: 1, by: this.veh.by, text: this.veh.say.arrived, big: true });
    events.sort((a, b) => a.p - b.p);
    const shown = [];
    for (const e of events) {
      const prev = shown[shown.length - 1];
      if (prev && e.p - prev.p < 0.3 / B) { if (e.big && !prev.big) shown[shown.length - 1] = e; continue; }
      if (!e.big && shown.slice(-2).some((q2) => q2.text === e.text)) continue;   // a log that says something new
      shown.push(e);
    }
    this.log = shown;
    // sound: a pop as each thing lands, a thud for a raise, a tick per log line, the traveller's chuff, the arrival
    const T = (p) => this.INTRO + p * B, ev = [];
    this.names.forEach((n, i) => ev.push({ t: 0.05 + i * 0.03, k: 'spawn', a: i }));
    for (const j of this.live) {
      const a = this.names.indexOf(j.by);
      if (j.type === 'raise') ev.push({ t: T(j.p0 + this.WIN * 0.55), k: 'raise', a });
      else if (j.type === 'sweep') for (let r = 0; r < j.lanes; r++) ev.push({ t: T(j.p0 + r * this.LANE), k: 'row', a });
      else for (const it of j.items) ev.push({ t: T(it.b + this.WIN * 0.55), k: 'place', a });
    }
    for (const e of shown) ev.push({ t: T(e.p), k: 'log', a: this.names.indexOf(e.by) });
    if (this.veh) { if (this.veh.sound) for (let t = T(0.03); t < T(0.995); t += this.veh.sound === 'hum' ? 0.5 : 0.42) ev.push({ t: +t.toFixed(3), k: this.veh.sound, a: 0 }); ev.push({ t: T(1), k: 'arrive', a: 0 }); }
    this.events = ev.sort((a, b) => a.t - b.t);
  }
  #frontCount(f) {
    if (Array.isArray(f.count)) return f.count;
    if (f.count === 'terrain') return this.terrainB;
    if (f.count === 'sea') return this.seaB;
    if (f.count && this.items[f.count]) return (f._c ||= this.items[f.count].map((it) => it.b).sort((a, b) => a - b));
    return [];
  }
  // every string the film can draw (check.mjs checks the fonts hold them)
  allText() {
    const s = [this.title, this.ui.objects, this.ui.agents, this.ui.builtIn, ...this.names, ...this.log.map((e) => e.text), ...this.extraText];
    for (const j of this.live) { s.push(j.label); if (j.then) s.push(j.then.label); for (const p of [j.p0, j.p0 + j.dur * 0.5, j.p0 + j.dur]) s.push(this.#doing(j, p)); }
    for (const f of this.fronts) { s.push(f.label); for (let p = f.p0; p <= f.p1; p += 0.05) s.push(fill(f.doing, { p })); }
    if (this.veh) s.push(...Object.values(this.veh.say));
    return s.join('\n');
  }

  async #fonts() {
    try {
      const faces = [new FontFace('SW Mono', `url(${FONT_DIR}JetBrainsMono.woff2)`, { weight: '100 800' }), new FontFace('SW KR', `url(${FONT_DIR}NotoSansKR-500.woff2)`, { weight: '100 900' })];
      for (const f of faces) document.fonts.add(f);
      await Promise.all(faces.map((f) => f.load()));
    } catch (e) { console.warn('[swarm-world] fonts did not load', e); }
  }
  #canvas() {
    const cv = document.createElement('canvas');
    cv.id = 'view'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', this.o.alt || this.title);
    document.body.prepend(cv);
    this.cv = cv; this.ctx = cv.getContext('2d');
    if (!document.getElementById('sw-style')) {
      const st = document.createElement('style'); st.id = 'sw-style';
      st.textContent = 'html,body{margin:0;height:100%;overflow:hidden;background:#111}#view{display:block;width:100%;height:100%}';
      document.head.append(st);
    }
  }
  #size(w, h) {
    if (this.cv.width === w && this.cv.height === h) return;
    this.cv.width = w; this.cv.height = h;
    if (this.gl) { this.gl.setPixelRatio(1); this.gl.setSize(w, h, false); }
    this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix();
  }

  // ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // seek(t): everything on screen at time t
  seek(t) {
    t = cl(t, 0, this.DURATION);
    this.#frame(t);
  }
  progress(t) { return cl((t - this.INTRO) / this.BUILD); }
  revealAt(t) { const e = this.INTRO + this.BUILD; return sm(e + 0.3, e + Math.max(1.2, this.OUTRO - 0.4), t); }
  #frame(t) {
    const p = this.progress(t), rv = this.revealAt(t), K = this.skyCfg, C = kit.C, cam = this.camera;
    this.t = t; this.p = p; this.rv = rv;
    const W = this.cv.width, H = this.cv.height;
    // camera: rides behind the traveller, then arcs up and looks back over the world
    const sT = this.travS(p), ch = this.#chase(sT), R = this.cam.reveal;
    const arc = Math.sin(Math.PI * rv) * 16, eg = sm(0.0, 0.6, rv), drift = Math.sin(Math.max(0, t - this.INTRO - this.BUILD) * 0.05) * 6 * rv;
    cam.position.set(lerp(ch.pos[0], R.pos[0] + drift, rv), lerp(ch.pos[1], R.pos[1], rv) + arc, lerp(ch.pos[2], R.pos[2], rv));
    const aim = (from, to) => { const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], l = Math.hypot(dx, dy, dz) || 1; return [Math.atan2(dx, dz), Math.asin(dy / l)]; };
    const [yc, p0] = aim(ch.pos, ch.tgt), [y1, p1] = aim(R.pos, R.tgt);
    let dy = y1 - yc; dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (R.turn > 0 && dy < 0) dy += Math.PI * 2; if (R.turn < 0 && dy > 0) dy -= Math.PI * 2;
    const yaw = yc + dy * eg, pitch = lerp(p0, p1, eg) - Math.sin(Math.PI * eg) * 0.1;
    cam.lookAt(cam.position.x + Math.sin(yaw) * Math.cos(pitch), cam.position.y + Math.sin(pitch), cam.position.z + Math.cos(yaw) * Math.cos(pitch));
    const tall = cam.aspect < 0.9, fv = tall ? this.cam.tallFov : this.cam.fov;
    cam.fov = lerp(fv[0], fv[1], rv); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    // time of day: from the start light to the end light (golden hour by default)
    const golden = sm(K.golden[0], K.golden[1], p) * 0.88 + 0.12 * rv;
    const sunEl = lerp(K.elev[0], K.elev[1], golden), sunAz = lerp(K.az[0], K.az[1], golden);
    const sd = new THREE.Vector3(Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), Math.cos(sunAz) * Math.cos(sunEl));
    const U = this.skyU;
    U.uSun.value.copy(sd);
    U.uZen.value.set(K.zen[0]).lerp(C(K.zen[1]), golden); U.uHzn.value.set(K.hzn[0]).lerp(C(K.hzn[1]), golden);
    U.uSunCol.value.set(K.sun[0]).lerp(C(K.sun[1]), golden); U.uGlow.value = lerp(K.glow[0], K.glow[1], golden);
    this.scene.fog.color.copy(U.uHzn.value);
    const fg = this.cam.fog; this.scene.fog.near = lerp(fg[0][0], fg[1][0], rv); this.scene.fog.far = lerp(fg[0][1], fg[1][1], rv);
    this.sun.color.set(K.light[0]).lerp(C(K.light[1]), golden); this.sun.intensity = lerp(K.lightI[0], K.lightI[1], golden);
    this.hemi.color.set(K.hemi[0]).lerp(C(K.hemi[1]), golden); this.hemi.groundColor.set(K.ground[0]).lerp(C(K.ground[1]), golden); this.hemi.intensity = lerp(K.hemiI[0], K.hemiI[1], golden);
    const focus = new THREE.Vector3(lerp(ch.tgt[0], R.tgt[0], rv), lerp(ch.tgt[1], R.tgt[1], rv), lerp(ch.tgt[2], R.tgt[2], rv)), ext = lerp(this.cam.shadow[0], this.cam.shadow[1], rv);
    this.sun.position.copy(focus).addScaledVector(sd, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 10; sc.far = 700; sc.updateProjectionMatrix();
    this.skyMesh.position.copy(cam.position);
    // the build front and things that move
    this.U.uP.value = p; this.U.uT.value = t;
    for (const m of Object.values(this.meshes)) m.w.visible = p > m.b0 - 0.001 && p < m.b1 + 0.001;
    for (const [kind, fn] of Object.entries(this.anims)) {
      const m = this.meshes[kind]; if (!m) continue;
      m.list.forEach((it, i) => { this.compose({ ...it, ...fn(it, i, t, p) }); m.a.setMatrixAt(i, this.M); m.w.setMatrixAt(i, this.M); });
      m.a.instanceMatrix.needsUpdate = m.w.instanceMatrix.needsUpdate = true;
    }
    if (this.veh) this.#traveller(sT, p, t);
    if (this.glowMat) { const G = this.glowCfg; this.glowMat.opacity = sm(G.from, 1.0, p) * 0.9 + 0.1 * rv; this.glowMat.size = lerp(G.size[0], G.size[1], rv); }
    for (const fn of this.hooks) fn(t, p, rv, this);
    // draw: the world, then the marks, the crew and the HUD on top
    const x = this.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (this.gl) { this.gl.render(this.scene, cam); x.drawImage(this.gl.domElement, 0, 0, W, H); }
    else { x.fillStyle = '#9fd0f2'; x.fillRect(0, 0, W, H); }
    this.u = Math.min(W, H) / 720 * (tall ? 1.15 : 1);
    this.#marks(p);
    this.#crew(t, p);
    this.#hud(t, p);
  }
  #chase(sT) {
    const pos = [0, 0, 0], tgt = [0, 0, 0], tall = this.camera.aspect < 0.9, Z = this.cam.zones;
    const zone = (s) => {
      if (Z.length === 1 || s <= Z[0][0]) return Z[0][1];
      for (let i = 0; i < Z.length - 1; i++) if (s < Z[i + 1][0]) { const [s0, a] = Z[i], [s1, b] = Z[i + 1], k = sm(s0, s1, s), o = {}; for (const key in a) o[key] = lerp(a[key], b[key] ?? a[key], k); return o; }
      return Z[Z.length - 1][1];
    };
    for (let k = -4; k <= 4; k++) {
      const s = sT + k * 1.4, z = zone(s), back = z.back + 10.6 + (tall ? 6 : 0), a = this.at(s - back), f = this.at(s + 16);
      const side = z.side * (tall ? 0.15 : 1), look = z.look * (tall ? 0.25 : 1), h = z.h + (tall ? 3 : 0);
      for (let i = 0; i < 3; i++) { pos[i] += (a.p[i] + a.r[i] * side + (i === 1 ? h : 0)) / 9; tgt[i] += (f.p[i] + f.r[i] * look + (i === 1 ? 1.1 : 0)) / 9; }
    }
    return { pos, tgt };
  }
  #traveller(sT, p, t) {
    const V = this.veh;
    this.cars.forEach((obj, i) => {
      const s = sT + V.offsets[i], a = this.at(s), b = this.at(s + 0.8);
      obj.position.set(a.p[0], a.p[1] + V.lift, a.p[2]); obj.lookAt(b.p[0], b.p[1] + V.lift, b.p[2]);
    });
    if (!this.puffs) return;
    const M = this.M, moving = p > 0.03 && p < 0.995, S = V.smoke, tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
    for (let i = 0; i < this.PUFFS; i++) {
      const born = Math.floor(t / 0.11) * 0.11 - i * 0.11, age = t - born;
      if (!moving || age > 1.9 || born < 0) { M.makeScale(0, 0, 0); this.puffs.setMatrixAt(i, M); continue; }
      const a = this.at(sT + S.fwd - age * 3.4), k = age / 1.9, size = (0.4 + age * 0.62) * (1 - sm(0.6, 1, k)) * (S.size ?? 1);
      M.compose(tmpV.set(a.p[0] + Math.sin(born * 7) * 0.35 * age, a.p[1] + S.y + age * (S.rise ?? 1.9), a.p[2] + Math.cos(born * 5) * 0.35 * age), tmpQ.identity(), tmpS.set(size, size * 0.85, size));
      this.puffs.setMatrixAt(i, M);
    }
    this.puffs.instanceMatrix.needsUpdate = true;
  }

  // world → canvas pixels. { x, y, a } with a = 1 on screen, fading to 0 just outside; null behind the camera
  project(q) {
    const v = this._pv || (this._pv = new THREE.Vector3());
    v.set(q[0], q[1], q[2]).applyMatrix4(this.camera.matrixWorldInverse);
    if (v.z > -this.camera.near) return null;
    v.set(q[0], q[1], q[2]).project(this.camera);
    const W = this.cv.width, H = this.cv.height, x = (v.x * 0.5 + 0.5) * W, y = (0.5 - v.y * 0.5) * H, m = 60 * this.u;
    const out = Math.max(0, -x, x - W, -y, y - H);
    return { x, y, a: 1 - sm(0, m, out) };
  }

  // ── the construction overlay: boxes with handles and counts, a click ring as each thing is set in place ─────────────
  #marks(p) {
    if (p <= 0.002 || p >= 1) return;
    const x = this.ctx, W = this.cv.width, H = this.cv.height, u = this.u, ACC = this.accent;
    x.font = `600 ${10 * u}px ${MONO}`; x.textBaseline = 'middle';
    const taken = [], labels = [];
    const box8 = (cx, cz, rx, rz, y0, y1) => [[cx - rx, y0, cz - rz], [cx + rx, y0, cz - rz], [cx - rx, y0, cz + rz], [cx + rx, y0, cz + rz], [cx - rx, y1, cz - rz], [cx + rx, y1, cz - rz], [cx - rx, y1, cz + rz], [cx + rx, y1, cz + rz]];
    const mark = (pts, text, a) => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = 0;
      for (const q2 of pts) { const s2 = this.project(q2); if (!s2) continue; ok++; x0 = Math.min(x0, s2.x); y0 = Math.min(y0, s2.y); x1 = Math.max(x1, s2.x); y1 = Math.max(y1, s2.y); }
      if (ok < 2 || x1 < 0 || y1 < 0 || x0 > W || y0 > H) return;
      x0 -= 3 * u; y0 -= 3 * u; x1 += 3 * u; y1 += 3 * u;
      if (x1 - x0 > W * 0.7 || y1 - y0 > H * 0.7) return;
      x.globalAlpha = a; x.strokeStyle = ACC; x.lineWidth = Math.max(1, u);
      x.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(x1 - x0), Math.round(y1 - y0));
      x.fillStyle = '#fff';
      const hs = 4 * u;
      for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { x.fillRect(Math.round(hx - hs / 2), Math.round(hy - hs / 2), hs, hs); x.strokeRect(Math.round(hx - hs / 2) + 0.5, Math.round(hy - hs / 2) + 0.5, hs - 1, hs - 1); }
      labels.push([x0, y0, text, a]);
    };
    for (const f of this.fronts) {
      const a = Math.min(sm(f.p0, f.p0 + 0.01, p), 1 - sm(f.p1, f.p1 + 0.015, p));
      if (a <= 0.01) continue;
      const pts = typeof f.box === 'function' ? f.box(p) : (() => { const q2 = f.at(p); return box8(q2[0], q2[2], f.box, f.box, q2[1] - 0.5, q2[1] + 0.5); })();
      mark(pts, f.label + ' ×' + fmt(countTo(this.#frontCount(f), p)), a * 0.9);
    }
    for (const j of this.live) {
      if (j.p0 > p + 0.003) break;
      const end = j.p0 + j.dur;
      if (p > end + 0.03) continue;
      const a = Math.min(sm(j.p0 - 0.003, j.p0 + 0.003, p), 1 - sm(end + 0.01, end + 0.03, p));
      if (a <= 0.01) continue;
      const n = countTo(j.bs, p), pts = [this.workPoint(j, p)];
      if (j.type === 'sweep') {
        const f = j.f, w = f.wid / j.lanes, tau = cl((p - j.p0) / (j.lanes * this.LANE)) * j.lanes, lane = Math.min(j.lanes - 1, Math.floor(tau));
        const uA = j.u0, uB = lane === 0 ? lerp(j.u0, j.u1, Math.min(1, tau)) : j.u1, vB = -f.wid / 2 + (lane + 1) * w;
        for (const [uu, vv] of [[uA, -f.wid / 2], [uB, -f.wid / 2], [uA, vB], [uB, vB]]) for (const yy of [f.y, f.y + 1.3]) pts.push([f.c[0] + f.u[0] * uu - f.u[1] * vv, yy, f.c[1] + f.u[1] * uu + f.u[0] * vv]);
      } else for (const it of j.items) {
        if (it.b > p) continue;
        const bd = this.kinds[it.kind].size, sx = it.sx || 1, r = Math.max(bd[0] * sx, bd[2] * (it.sz || sx));
        pts.push(...box8(it.x, it.z, r, r, it.y, it.y + this.tallOf(it) * Math.max(0.06, this.grown(it, p))));
      }
      const t1 = j.then;
      mark(pts, t1 && n > t1.n ? t1.label + ' ×' + fmt(n - t1.n) : j.n > 1 ? j.label + ' ×' + fmt(t1 ? Math.min(n, t1.n) : n) : j.label, a);
      if (j.type === 'hop' || j.type === 'raise') for (const it of j.items) {
        const k = (p - it.b - this.WIN * 0.55) / 0.012;
        if (k < 0 || k > 1) continue;
        const s2 = this.project(this.topNow(it, p));
        if (!s2) continue;
        x.globalAlpha = (1 - k) * a * s2.a; x.strokeStyle = ACC; x.lineWidth = 1.5 * u;
        x.beginPath(); x.arc(s2.x, s2.y, (3 + 15 * k) * u, 0, Math.PI * 2); x.stroke();
      }
    }
    for (const [x0, y0, text, a] of labels) {
      const tw = x.measureText(text).width + 12 * u, lx = Math.round(Math.min(Math.max(x0, 4 * u), W - tw - 4 * u)), ly = Math.round(y0 - 19 * u);
      if (ly < 2 || taken.some((q2) => lx < q2[0] + q2[2] + 4 * u && lx + tw + 4 * u > q2[0] && ly < q2[1] + 18 * u && ly + 18 * u > q2[1])) continue;
      taken.push([lx, ly, tw]);
      x.globalAlpha = a; x.fillStyle = ACC;
      x.beginPath(); x.roundRect(lx, ly, tw, 16 * u, 4 * u); x.fill();
      x.fillStyle = '#fff'; x.fillText(text, lx + 6 * u, ly + 8.5 * u);
    }
    x.globalAlpha = 1;
  }

  // ── the crew: where each cursor is at time t, its glyph, its tag ──────────────────────────────────────────────────
  agentAt(i, t, p) {
    const name = this.names[i], segs = this.segs[name], u = this.u, W = this.cv.width, H = this.cv.height, B = this.BUILD;
    const N = this.names.length, T = (pp) => this.INTRO + pp * B;
    // the gathering: fly in from the edge to a ring round the traveller's start, circle it
    const c0 = this.veh ? this.project(this.#carTop(0, 2)) : null, cx = c0 ? c0.x : W / 2, cy = c0 ? c0.y : H * 0.55;
    const ang = (i / N) * Math.PI * 2 + t * 0.7, ring = { x: cx + Math.cos(ang) * 120 * u, y: cy + Math.sin(ang) * 70 * u - 20 * u, a: 1 };
    const edge = { x: cx + Math.cos(ang) * W * 0.75, y: cy + Math.sin(ang) * H * 0.75, a: 1 };
    const hud = { x: 40 * u, y: 26 * u, a: 1 };
    const screenLerp = (a, b, k) => (a && b ? { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), a: lerp(a.a, b.a, k) } : (k < 0.5 ? a : b));
    const lift = (q2, k, dist) => [q2[0], q2[1] + Math.sin(Math.PI * k) * Math.min(6, dist * 0.15), q2[2]];
    const travel = (A, Bq) => cl(0.45 + Math.hypot(A[0] - Bq[0], A[1] - Bq[1], A[2] - Bq[2]) * 0.004, 0.45, 1.0) / B;
    const LINGER = 0.25 / B;
    const s0 = segs[0];
    if (!s0) return null;
    const enter = sm(0.02 * i, 0.55 + 0.02 * i, t);
    // before the first site: ring, then off to the first site (in screen space) and wait there
    if (p < s0.p0 || t < this.INTRO) {
      const depart = Math.max(0, Math.min(s0.p0 - travel(s0.pt(s0.p0), s0.pt(s0.p0)) * 1.4, 0.004 + i * 0.006)), arrive = Math.min(s0.p0, depart + 0.9 / B);
      const k = t < this.INTRO ? 0 : sm(depart, arrive, p);
      const pos = k <= 0 ? screenLerp(edge, ring, enter) : screenLerp(ring, this.project(s0.pt(s0.p0)), k);
      return pos && { ...pos, glyph: 'arrow', doing: '', seg: null };
    }
    let si = 0; while (si + 1 < segs.length && segs[si + 1].p0 <= p) si++;
    const s = segs[si], next = segs[si + 1];
    if (p <= s.p1 && !(s.last && t > T(1) + 0.6)) { const pos = this.project(s.pt(p)); return pos && { ...pos, glyph: s.glyph, doing: s.doing(p), seg: s }; }
    if (!next) {   // done: stay a beat, then clock off at the session pill
      const tEnd = s.last ? T(1) + 0.6 + i * 0.05 : T(s.p1) + 0.3, k = sm(tEnd, tEnd + 0.9, t);
      if (k >= 1) return null;
      const A = this.project(s.pt(Math.min(p, s.p1)));
      const pos = screenLerp(A, hud, sm(0, 1, k));
      return pos && { ...pos, a: pos.a * (1 - sm(0.6, 1, k)), glyph: 'arrow', doing: '', seg: null };
    }
    const A = s.pt(s.p1), Bq = next.pt(next.p0), tr = travel(A, Bq), gap = next.p0 - s.p1;
    const depart = s.p1 + Math.min(LINGER, Math.max(0, gap - tr)), arrive = Math.min(next.p0, depart + tr);
    if (p < depart) { const pos = this.project(s.pt(p)); return pos && { ...pos, glyph: 'arrow', doing: '', seg: null }; }
    const k = sm(depart, arrive, p), dist = Math.hypot(A[0] - Bq[0], A[1] - Bq[1], A[2] - Bq[2]);
    const pos = this.project(lift(lerp3(A, Bq, k), k, dist));
    return pos && { ...pos, glyph: 'arrow', doing: '', seg: null };
  }
  #crew(t, p) {
    const x = this.ctx, u = this.u, W = this.cv.width, H = this.cv.height;
    const ags = [];
    this.names.forEach((n, i) => { const a = this.agentAt(i, t, p); if (a && a.a > 0.02) ags.push({ ...a, i, name: n, color: this.crew[n] }); });
    this.agentsNow = ags;
    // tags: working agents first; each tries the sides of its cursor until it is clear of the others and the HUD
    const placed = [...this.#hudRects()], rects = [];
    const order = ags.slice().sort((a, b) => (b.doing ? 1 : 0) - (a.doing ? 1 : 0) || a.i - b.i);
    const fN = `600 ${10.5 * u}px ${MONO}`, fD = `500 ${9.5 * u}px ${MONO}`;
    for (const a of order) {
      x.font = fN; const wN = x.measureText(a.name).width;
      x.font = fD; const wD = a.doing ? x.measureText(a.doing).width : 0;
      const w = Math.max(wN, wD) + 12 * u, h = (a.doing ? 30 : 17) * u;
      const cand = [[12 * u, 16 * u], [-w - 6 * u, 16 * u], [12 * u, -h - 8 * u], [-w - 6 * u, -h - 8 * u]];
      let pick = null;
      for (const [dx, dy] of cand) {
        const r = [cl(a.x + dx, 2, W - w - 2), cl(a.y + dy, 2, H - h - 2), w, h];
        if (!placed.some((q2) => r[0] < q2[0] + q2[2] && r[0] + r[2] > q2[0] && r[1] < q2[1] + q2[3] && r[1] + r[3] > q2[1])) { pick = r; break; }
      }
      a.dim = !pick;
      a.tag = pick || [cl(a.x + cand[0][0], 2, W - w - 2), cl(a.y + cand[0][1], 2, H - h - 2), w, h];
      if (pick) placed.push(pick);
      rects.push(a);
    }
    for (const a of ags) {   // cursor glyph
      const g = GLYPH[a.glyph] || GLYPH.arrow, sc = 0.95 * u, bob = Math.sin(t * 2.4 + a.i * 1.7) * 1.2 * u;
      x.save(); x.globalAlpha = a.a; x.translate(a.x, a.y + bob); x.scale(sc, sc); x.translate(-g.at[0], -g.at[1]);
      const path = g._p || (g._p = new Path2D(g.d));
      x.lineJoin = 'round'; x.lineCap = 'round';
      if (g.fill) { x.fillStyle = a.color; x.fill(path); x.strokeStyle = '#0b0b0a'; x.lineWidth = 1.3; x.stroke(path); if (g.nib) { x.fillStyle = '#0b0b0a'; x.fill(g._n || (g._n = new Path2D(g.nib))); } }
      else { x.strokeStyle = '#0b0b0a'; x.lineWidth = 3.6; x.stroke(path); x.strokeStyle = a.color; x.lineWidth = 1.6; x.stroke(path); }
      x.restore();
    }
    for (const a of rects) {   // name tag + what it is doing
      const [tx, ty, tw, th] = a.tag, al = a.a * (a.dim ? 0.35 : 1);
      x.globalAlpha = al;
      x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 8 * u; x.shadowOffsetY = 2 * u;
      x.fillStyle = a.color; x.beginPath(); x.roundRect(tx, ty, tw, a.dim ? 17 * u : th, 4 * u); x.fill();
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
      const ink = this.#ink(a.color);
      x.fillStyle = ink; x.textBaseline = 'middle';
      x.font = fN; x.fillText(a.name, tx + 6 * u, ty + 8.8 * u);
      if (a.doing && !a.dim) { x.globalAlpha = al * 0.82; x.font = fD; x.fillText(a.doing, tx + 6 * u, ty + 22 * u); }
    }
    x.globalAlpha = 1;
  }
  #ink(hex) { const c = kit.C(hex); return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) > 0.22 ? '#0b0b0a' : '#ffffff'; }
  #hudRects() {
    const u = this.u, W = this.cv.width, H = this.cv.height;
    return [[0, 0, 330 * u, 44 * u], [0, H - (this.log.length ? 110 : 0) * u, Math.min(430 * u, W - 80 * u), 110 * u]];
  }

  // ── the session HUD (what is being built, how much, by how many, how long) and the build log ───────────────────────
  #hud(t, p) {
    const x = this.ctx, u = this.u, W = this.cv.width, H = this.cv.height, dark = this.ui.theme === 'dark';
    const glass = dark ? 'rgba(18,20,26,.66)' : 'rgba(255,255,255,.66)', ink = dark ? '#f2f3f5' : '#16181d', mute = dark ? '#a6abb8' : '#4b5160', faint = dark ? '#7d8394' : '#6b7180';
    const pad = 14 * u, f5 = `500 ${11 * u}px ${MONO}`, f6 = `600 ${11 * u}px ${MONO}`;
    const done = p >= 1;
    const n = countTo(this.allB, p), clk = done ? (this.ui.builtIn.includes('{') ? fill(this.ui.builtIn, { t: clock(this.BUILD) }) : this.ui.builtIn + ' ' + clock(this.BUILD)) : clock(p * this.BUILD);
    const word = (w, v) => (String(w).includes('{') ? fill(w, v) : (v.n ?? '') + ' ' + w);
    const parts = [[this.title, f6, ink], [word(this.ui.objects, { n: fmt(n) }), f5, mute], [word(this.ui.agents, { n: this.names.length }), f5, mute], [clk, f5, mute]];
    if (W < 900 * u * 0.9) parts.splice(2, 1);
    let w = 11 * u + 14 * u;
    for (const [s, f] of parts) { x.font = f; w += x.measureText(s).width + 14 * u; }
    const hh = 26 * u;
    x.save(); x.shadowColor = 'rgba(20,30,50,.35)'; x.shadowBlur = 18 * u; x.shadowOffsetY = 6 * u;
    x.fillStyle = glass; x.beginPath(); x.roundRect(pad, pad, w - 3 * u, hh, 8 * u); x.fill(); x.restore();
    const blink = done ? 1 : 0.25 + 0.75 * (0.5 + 0.5 * Math.cos(t * Math.PI / 1.1));
    x.globalAlpha = blink; x.fillStyle = done ? '#3c9a5f' : this.accent; x.beginPath(); x.arc(pad + 14 * u, pad + hh / 2, 3.5 * u, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
    let cx = pad + 24 * u; x.textBaseline = 'middle';
    for (const [s, f, c] of parts) { x.font = f; x.fillStyle = c; x.fillText(s, cx, pad + hh / 2 + 0.5 * u); cx += x.measureText(s).width + 14 * u; }
    // the log: a line for finished work, the last five, older ones faded
    const lines = this.log.filter((e) => e.p <= p);
    if (!lines.length) return;
    const tail = lines.slice(-5), lh = 16.5 * u, lw = Math.min(400 * u, W - 92 * u), lh0 = tail.length * lh + 14 * u;
    const ly = H - pad - lh0;
    x.save(); x.shadowColor = 'rgba(20,30,50,.35)'; x.shadowBlur = 18 * u; x.shadowOffsetY = 6 * u;
    x.fillStyle = glass; x.beginPath(); x.roundRect(pad, ly, lw, lh0, 8 * u); x.fill(); x.restore();
    x.save(); x.beginPath(); x.rect(pad, ly, lw - 8 * u, lh0); x.clip();
    tail.forEach((e, k) => {
      const age = t - (this.INTRO + e.p * this.BUILD), slide = 1 - sm(0, 0.3, age);
      const yy = ly + 7 * u + lh * (k + 0.5) + slide * 6 * u;
      x.globalAlpha = (k < tail.length - 3 ? 0.45 : 1) * (1 - slide);
      x.font = f5; x.fillStyle = faint; let lx = pad + 11 * u;
      x.fillText(clock(Math.min(this.BUILD, e.p * this.BUILD)), lx, yy); lx += x.measureText('0:00.0').width + 10 * u;
      x.fillStyle = this.crew[e.by]; x.fillRect(lx, yy - 4 * u, 8 * u, 8 * u); x.strokeStyle = 'rgba(22,24,29,.35)'; x.lineWidth = u; x.strokeRect(lx + 0.5, yy - 4 * u + 0.5, 8 * u - 1, 8 * u - 1);
      lx += 14 * u; x.font = f6; x.fillStyle = ink; x.fillText(e.by, lx, yy);
      lx += Math.max(...this.log.map((q2) => x.measureText(q2.by).width)) + 10 * u;
      x.font = f5; x.fillStyle = ink;
      const room = pad + lw - 12 * u - lx;
      let s = e.text; if (x.measureText(s).width > room) { while (s.length > 1 && x.measureText(s + '…').width > room) s = s.slice(0, -1); s += '…'; }
      x.fillText(s, lx, yy);
    });
    x.restore(); x.globalAlpha = 1;
  }

  // ── checks ────────────────────────────────────────────────────────────────────────────────────────────────────────
  // rules broken at time t (check.mjs samples them); audit() is the once-over of the whole schedule
  runChecks(t) {
    this.seek(t);
    const bad = [], p = this.p, cam = this.camera.position;
    if (this.landCfg && cam.y < this.ground(cam.x, cam.z) + 0.8) bad.push('camera above the ground');
    if (p > 0.05 && p < 0.95) {
      const working = this.names.map((n, i) => this.agentAt(i, t, p)).filter((a) => a && a.seg && a.seg.job);
      const all = this.names.filter((n) => { const s = this.segs[n].find((q2) => q2.job && q2.p0 <= p && p <= q2.p1); return s; }).length;
      if (all >= 2 && working.filter((a) => a.a > 0.5).length < all * 0.4) bad.push('~most of the crew at work is on screen');
    }
    for (const [name, fn] of this.rules) { try { if (!fn(t, p, this)) bad.push(name); } catch (e) { bad.push(name + ' (threw: ' + e.message + ')'); } }
    return bad;
  }
  // [{ level: 'fail' | 'warn', msg }]
  audit() {
    const out = [], near = [], all = [];
    const add = (level, msg) => out.push({ level, msg });
    const sk = this.skipped.length / Math.max(1, this.jobs.length);
    if (this.skipped.length) add(sk > 0.3 ? 'fail' : 'warn', `${this.skipped.length} of ${this.jobs.length} jobs had nobody free in time and build themselves (${[...new Set(this.skipped.map((j) => j.label))].join(', ')})${sk > 0.3 ? ' — add roles or crew, or start them earlier' : ''}`);
    const idle = this.names.filter((n) => !this.segs[n].length);
    if (idle.length) add('fail', `crew with no work: ${idle.join(', ')}`);
    for (const list of Object.values(this.items)) for (const it of list) if (it.d < 5 && it.kind !== 'sleeper' && it.kind !== 'rail' && it.s > this.S0 + 2) { all.push(it); if (it.b + this.WIN * 0.6 > this.pOfS(it.s - 3)) near.push(it); }
    if (near.length) add(near.length > Math.max(3, all.length * 0.05) ? 'fail' : 'warn', `${near.length} of ${all.length} thing(s) beside the line are still going up as the traveller passes (${[...new Set(near.map((it) => it.kind))].join(', ')}) — more lead, or fewer per job`);
    const last = Math.max(...this.allB) + this.WIN;
    if (last > 1.0001) add('fail', `the world is not finished when the build ends (last thing done at p=${last.toFixed(3)})`);
    return out;
  }

  // ── the live page: plays once, holds the finished world drifting, ↻ builds it again ────────────────────────────────
  #live(frozen) {
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), cw = innerWidth, ch = innerHeight, k = Math.min(dpr, Math.sqrt(2.4e6 / (cw * ch)));
      this.#size(Math.round(cw * k), Math.round(ch * k));
    };
    fit(); addEventListener('resize', fit);
    if (frozen != null) { const draw = () => this.seek(frozen); draw(); addEventListener('resize', draw); return; }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'sw-again'; btn.setAttribute('aria-label', this.o.againLabel || 'Build it again');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4.5h-4.5"/></svg>';
    const st = document.createElement('style');
    st.textContent = '.sw-again{position:fixed;right:calc(18px + env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom));width:46px;height:46px;display:grid;place-items:center;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.6);color:#16181d;cursor:pointer;box-shadow:0 6px 20px -8px rgba(20,30,50,.45);backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .6s}.sw-again.on{opacity:1;pointer-events:auto}.sw-again svg{width:20px;height:20px}.sw-again:focus-visible{outline:2px solid ' + this.accent + ';outline-offset:3px}';
    document.head.append(st); document.body.append(btn);
    let t = reduce ? this.DURATION : 0, last = performance.now(), paused = false;
    const loop = this.q.has('loop') && !reduce;
    btn.addEventListener('click', (e) => { e.stopPropagation(); t = 0; btn.classList.remove('on'); });
    addEventListener('keydown', (e) => { if (e.key === ' ') { paused = !paused; e.preventDefault(); } if (e.key === 'ArrowRight') t = Math.min(this.DURATION, t + 1); if (e.key === 'ArrowLeft') t = Math.max(0, t - 1); });
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!paused && !document.hidden) t += dt;
      if (t >= this.DURATION - 1.5) btn.classList.add('on');
      if (loop && t > this.DURATION + 3) { t = 0; btn.classList.remove('on'); }
      this.#frame(Math.min(t, this.DURATION + 600));   // past the end the camera keeps drifting over the finished world
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
