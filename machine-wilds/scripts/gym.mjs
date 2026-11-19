// machine-wilds · gym.mjs — the machines of a realm walked across its land in Node, without a browser: the footfalls are
// planned on the real height function, every unit is sampled over a whole lap, and the numbers a body must keep are printed
// (and fail the run).  Seconds, not minutes — run it after every change to a machine, a way or the land under one.
//   node <skill>/scripts/gym.mjs <realm-dir>                    numbers for every unit; exit 1 if a rule is broken
//   node <skill>/scripts/gym.mjs <realm-dir> --sheet            + out/gym.png: each unit from the side along its way (the
//                                                                 land's real profile under its feet), stills at 8 moments
//   node <skill>/scripts/gym.mjs <realm-dir> --course           the test course instead of the realm's land: a ramp, a step,
//                                                                 a side slope, a ditch and a mound, each kind walked over them
//   node <skill>/scripts/gym.mjs <realm-dir> --json             the numbers as JSON (check.mjs reads this)
// The realm's sources are loaded with the engine's numbers-only parts (00_core, 35_terrain, 48_mech*); a realm sets
// LR.gym = () => { …build the land, define the machines, the ways and the units… } (see references/MACHINES.md).
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
const args = process.argv.slice(2), has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');

// the limits a machine must keep (references/MACHINES.md says why each number is what it is)
export const LIMITS = { clamp: 0.002, slip: 0.004, gap: 0.03, sole: 0.5, tiltOver: 4, bendFlip: 0, foldMax: 165, bodyAcc: 1.6, bodyAccLight: 2.8, kneeLow: 0.05, swingLow: -0.02, overlapMin: 0.15, belly: 0.5, loop: 0.02, determinism: 1e-9, flyClear: 26, bankMax: 58, flyPitch: 24, flyLoad: 1.9, wing: 62, fixShare: 0.02, idleBreath: 0.02, idleSlip: 0.004, anticipation: 0.04, recovery: 0.03 };

export function load(realmDir, { course = false } = {}) {
  const noop = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : noop()), apply: () => noop(), construct: () => noop() });
  // the sources run as one function with everything they name passed in (a vm context would look every `Math` up the slow way)
  const env = { location: { search: '' }, document: { querySelector: () => null, getElementById: () => null }, window: {}, THREE: noop(), REALM_ASSETS: null, REALM_META: {} };
  const lib = ['00_core.js', '35_terrain.js', '48_mech.js', '48_mech_fly.js', '48_mech_gait.js'].map((f) => readFileSync(join(skill, 'lib', f), 'utf8'));
  const srcDir = join(realmDir, 'src'), src = existsSync(srcDir) ? readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort().map((f) => `\n// ── src/${f} ──\n` + readFileSync(join(srcDir, f), 'utf8')) : [];
  // everything the numbers do not need is a stand-in that swallows any call (water, plants, buildings, the renderer)
  const stubs = `
    const __noop = ${noop.toString()};
    for (const k of ['U','gpu','render','mat','water','arch','props','flora','grass','models','atlas','sky','wx','fx','audio','player','hud','chunk']) if (!LR[k]) LR[k] = __noop();
    LR.world = { solids: [], floors: [], lights: [], sounds: [], places: [], smokers: [], fires: [], add: () => null, solidBox(x, z, hx, hz, yaw = 0, o = {}) { this.solids.push(Object.assign({ x, z, hx, hz, yaw, c: Math.cos(yaw), s: Math.sin(yaw) }, o)); }, solidCircle(x, z, r, o = {}) { this.solids.push(Object.assign({ x, z, r }, o)); }, light() {}, stats: {} };
    LR.water = { levelAt: () => -1e9, stream() {}, pond() {} };
    LR.start = (cfg) => { LR.cfg = cfg; }; LR.GYM = true;`, after = `LR.land.paint = () => {}; LR.land.patch = () => {}; { const road = LR.land.road; LR.land.road = (p, w, o = {}) => { if (o.ease !== false) road(p, w, Object.assign({}, o, { gymEase: true })); }; } LR.land.apron = () => {}; LR.land.border = () => {};`;
  const COURSE = `
    // the test course: an oval whose long straight carries a ramp up (14°), a level top, a drop of 1.2 m, a side slope (12°),
    // a ditch, a mound and a ramp down; the way back is level.  One kind at a time, with one halt and its first move.
    LR.gymCourse = (kind) => { const M = LR.mech, sm = LR.sm; M.units.length = 0; for (const k in M.routes) delete M.routes[k]; LR.world.solids.length = 0;
      const prof = (x) => 8 * sm(-110, -78, x) - 1.2 * sm(-39, -38, x) - 2.6 * Math.exp(-(((x - 46) / 5) ** 2)) + 2.2 * Math.exp(-(((x - 76) / 6) ** 2)) - 6.8 * sm(96, 126, x);
      const side = (x) => sm(-22, -8, x) * sm(32, 18, x) * 0.21;
      LR.land.create({ height: (x, z) => (prof(x) + side(x) * z) * sm(60, 30, Math.abs(z)) + (LR.fbm(x * 0.2, z * 0.2, 3) - 0.5) * 0.25, half: 256, res: 0.5 });
      const way = []; for (let x = -140; x <= 140; x += 28) way.push([x, 0]); way.push([165, 35], [150, 80]); for (let x = 120; x >= -120; x -= 40) way.push([x, 110]); way.push([-150, 80], [-165, 35]);
      M.route('course', way, { width: 0 }); const mv = Object.keys(M.kinds[kind].spec.moves || {})[0];
      return M.spawn(kind, { route: 'course', name: kind, halts: [{ at: 0.86, hold: 10, move: mv }] }); };`;
  const code = [lib[0], stubs, lib[1], after, lib[2], lib[3], lib[4], ...src, COURSE, '\nreturn LR;'].join('\n');
  return new Function(...Object.keys(env), code)(...Object.values(env));

}

export function judge(A, lim = LIMITS) {
  const bad = [], f = (ok, msg) => { if (!ok) bad.push(msg); };
  if (A.fly) {   // a flyer's rules
    f(A.clear >= lim.flyClear, `flight: it comes within ${A.clear.toFixed(1)} m of the land (${lim.flyClear} m keeps it over the trees: raise the line there)`);
    f(A.bankMax <= lim.bankMax, `flight: banked ${A.bankMax.toFixed(0)}° (a turn too tight for its speed: widen it or slow it)`); f(A.bankShare <= 0.08, `flight: in ${(A.bankShare * 100).toFixed(0)} % of its turns it is not banked into the turn`);
    f(A.pitchMax <= lim.flyPitch, `flight: pitched ${A.pitchMax.toFixed(0)}° (the line climbs or falls too steeply)`); f(A.load <= lim.flyLoad, `flight: a turn of ${A.load.toFixed(1)} g`);
    f(A.wing[0] >= -lim.wing && A.wing[1] <= lim.wing && A.wing[2] >= -lim.wing && A.wing[3] <= lim.wing, `wings: a hinge swings ${Math.min(A.wing[0], A.wing[2]).toFixed(0)}…${Math.max(A.wing[1], A.wing[3]).toFixed(0)}° (past ±${lim.wing}°)`);
    f(A.wing[1] - A.wing[0] >= 20, `wings: they hardly move (${(A.wing[1] - A.wing[0]).toFixed(0)}° at the shoulder)`); f(A.beatShare >= 0.15 && A.glide + A.beatShare < 1.01, `wings: it beats ${(A.beatShare * 100).toFixed(0)} % of the time (it must both beat and rest)`);
    f(A.bob >= 0.03, `weight: the body does not ride the beat (${(A.bob * 1000).toFixed(0)} mm): nothing carries it`); f(A.loop <= 0.05, `loop: one lap later it is ${A.loop.toFixed(2)} m off`); f(A.determinism <= lim.determinism, 'determinism: the same instant gave two poses');
    return bad; }
  f(A.clamp <= lim.clamp, `reach: a leg was asked for ${(A.clamp * 1000).toFixed(0)} mm more than it has`);
  f(A.slip <= lim.slip, `feet: a planted foot moved ${(A.slip * 1000).toFixed(1)} mm`);
  f(A.gap <= lim.gap, `feet: a planted sole is ${(A.gap * 1000).toFixed(0)} mm off the ground`);
  f(A.sole <= lim.sole, `feet: a sole is ${A.sole.toFixed(1)}° off the tilt it was planned at`); f(A.tiltOver <= lim.tiltOver, `feet: a footfall is on ground ${A.tiltOver.toFixed(0)}° steeper than the ball joint turns (move the way or widen the footing search)`);
  f(A.bendFlip === 0, `bends: a joint bent the wrong way in ${A.bendFlip} samples`);
  f(A.foldMax <= lim.foldMax, `bends: a joint folded ${A.foldMax.toFixed(0)}° (past ${lim.foldMax}° it is shut)`);
  f(A.kneeLow >= lim.kneeLow, `bends: a knee or ankle came to ${(A.kneeLow).toFixed(2)} m of the ground`);
  f(A.swingLow >= lim.swingLow, `feet: a swinging foot went ${(-A.swingLow * 1000).toFixed(0)} mm into the ground`);
  f(A.overlapMin >= lim.overlapMin, `cylinders: a rod has ${(A.overlapMin * 100).toFixed(0)} % of its barrel left`);
  f(A.belly >= lim.belly, `body: the belly came to ${A.belly.toFixed(2)} m of the land`);
  f(A.supportMin >= A.needSupport, `support: only ${A.supportMin} feet down at some moment (needs ${A.needSupport})`);
  f(A.loop <= lim.loop, `loop: one lap later the pose is ${(A.loop * 1000).toFixed(1)} mm off`);
  f(A.determinism <= lim.determinism, `determinism: the same instant gave two poses`);
  f(A.fixShare <= lim.fixShare, `reach: the body was snapped down to its feet in ${(A.fixShare * 100).toFixed(1)} % of the lap, by up to ${A.fixMax.toFixed(2)} m (the way crosses ground too broken for these legs: move it, shorten the stride or lower the ride)`); { const cap = Math.min(lim.bodyAccLight, Math.max(lim.bodyAcc, 3.2 - 0.02 * (A.tonnes || 100))); f(A.bodyAcc <= cap, `weight: the body is thrown about at ${A.bodyAcc.toFixed(1)} m/s² (at ${A.tonnes} t it may not pass ${cap.toFixed(1)}: lengthen dipTime, settleTime, the cycle)`); }
  if (A.idle) { f(A.idle.breath >= lim.idleBreath, `idle: the body moves ${(A.idle.breath * 1000).toFixed(0)} mm while it stands (dead still)`); f(A.idle.slip <= lim.idleSlip, `idle: a foot moved ${(A.idle.slip * 1000).toFixed(1)} mm while standing`); }
  else f(false, 'idle: this unit never stands (give it a halt or make it a post) — every machine breathes somewhere');
  for (const k in A.moves) { const m = A.moves[k]; f(m.anticipation >= lim.anticipation, `move ${k}: no gather before it (${(m.anticipation * 100).toFixed(0)} % of ${m.main})`); f(m.recovery >= lim.recovery, `move ${k}: no overshoot on the way back (${(m.recovery * 100).toFixed(0)} %)`); }
  return bad;
}
const line = (A) => A.fly ? `${A.unit.padEnd(12)} lap ${A.lap.toFixed(0)} s · ${A.len.toFixed(0)} m · ${A.speedMin.toFixed(1)}–${A.speedMax.toFixed(1)} m/s\n   over the land by ≥ ${A.clear.toFixed(1)} m · banks to ${A.bankMax.toFixed(0)}° (wrong in ${(A.bankShare * 100).toFixed(0)} % of its turns) · turns of ≤ ${A.load.toFixed(2)} g · pitch ≤ ${A.pitchMax.toFixed(0)}°\n   wings: shoulder ${A.wing[0].toFixed(0)}…${A.wing[1].toFixed(0)}° · elbow ${A.wing[2].toFixed(0)}…${A.wing[3].toFixed(0)}° · beating ${(A.beatShare * 100).toFixed(0)} %, gliding ${(A.glide * 100).toFixed(0)} % of the lap · the body rides the beat by ${(A.bob * 1000).toFixed(0)} mm` : `${A.unit.padEnd(12)} lap ${A.lap.toFixed(0)} s · ${A.cycles} cycles · stride ${A.stride.toFixed(2)} m · speed ≤ ${A.speedMax.toFixed(2)} m/s
   reach ${(A.spanMin * 100).toFixed(0)}–${(A.spanMax * 100).toFixed(0)} % of the leg · clamp ${(A.clamp * 1000).toFixed(1)} mm · body rides ≤ ${A.lowMax.toFixed(2)} m under its height for its legs' sake (mean ${A.lowMean.toFixed(2)}) · last-resort corrections ${(A.fixShare * 100).toFixed(1)} % of the lap, ≤ ${A.fixMax.toFixed(2)} m · body ≤ ${A.bodyAcc.toFixed(2)} m/s²
   planted: slip ${(A.slip * 1000).toFixed(2)} mm · sole off ground ${(A.gap * 1000).toFixed(1)} mm · sole vs ground tilt ${A.sole.toFixed(2)}° (ground up to ${A.tiltMax.toFixed(0)}°, footfalls moved ≤ ${A.moved.toFixed(2)} m)
   swing clears by ${A.swingLow > 1e8 ? '—' : A.swingLow.toFixed(2) + ' m'} · knees ≥ ${A.kneeLow.toFixed(2)} m up · belly ≥ ${A.belly.toFixed(2)} m · feet down ≥ ${A.supportMin} · joints bend ${A.straight.toFixed(0)}–${A.foldMax.toFixed(0)}° · wrong bends ${A.bendFlip}
   cylinders: rod in barrel ≥ ${(A.overlapMin * 100).toFixed(0)} % · lever ≥ ${A.leverMin.toFixed(2)} m · loop ${(A.loop * 1000).toFixed(2)} mm · idle ${A.idle ? `breath ${(A.idle.breath * 1000).toFixed(0)} mm, head ${A.idle.scan.toFixed(0)}°, light ${(A.idle.light * 100).toFixed(0)} %` : '—'}${Object.keys(A.moves).map((k) => ` · ${k}: gather ${(A.moves[k].anticipation * 100).toFixed(0)} %, overshoot ${(A.moves[k].recovery * 100).toFixed(0)} %`).join('')}`;

export function run(realmDir, { course = false, dt = 0.1, only = null, onEach = null } = {}) {
  const LR = load(realmDir, { course }), M = LR.mech;
  if (!LR.gym) throw new Error('the realm sets no LR.gym — see references/MACHINES.md');
  LR.gym({ course });
  const out = [], sheets = [];
  const each = () => { const fitted = M.plan({ press: !course }); for (const kind in fitted) for (const j in fitted[kind]) if (fitted[kind][j].fail) out.push({ unit: kind, bad: [`cylinders: ${j}: ${fitted[kind][j].fail}`] });
    for (const u of M.units) { const A = M.audit(u, { dt }); A.needSupport = u.kin.limbs.length >= 6 ? 3 : 2; out.push({ unit: u.name, A, bad: judge(A) }); } if (onEach) onEach(LR, sheets); };
  if (course) { for (const kind of Object.keys(M.kinds)) { if ((only && only !== kind) || M.kinds[kind].spec.flight) continue; LR.gymCourse(kind); each(); } } else each();
  return { LR, out, sheets };
}

// ── drawing: a unit from the side, unrolled along its way ─────────────────────────────────────────────────────────────
function sheetRows(LR, course, rows = []) {
  const M = LR.mech, W = 1500, seen = new Set();
  for (const u of M.units) {
    if (u.post || u.fly || seen.has(u.kind + u.R.name)) continue; seen.add(u.kind + u.R.name); const span = Math.min(u.R.len, course ? 290 : 150), s0 = course ? 6 : u.R.len * 0.05, sc = W / (span + 20), ride = u.K.spec.ride, H = Math.round((ride * 2.3 + 14) * sc);
    // the land's profile under the left and the right feet, and the bodies at 8 moments
    const px = (s) => (s - s0 + 10) * sc, zl = u.track / 2; let y0 = 1e9; const prof = [[], []];
    for (let s = s0 - 10; s <= s0 + span + 10; s += 0.5) { const b = u.bodyAt(s), rt = [-Math.sin(b.h), Math.cos(b.h)]; [-1, 1].forEach((sd, i) => { const y = LR.land.h(b.x + rt[0] * zl * sd, b.z + rt[1] * zl * sd); prof[i].push([s, y]); y0 = Math.min(y0, y); }); }
    const py = (y) => H - 12 - (y - y0) * sc; let g = `<g><text x="8" y="16" font-size="13" fill="#444">${u.name} · ${u.kind} · ${u.N} cycles, stride ${u.stride.toFixed(2)} m — left feet solid, right feet dashed</text>`;
    prof.forEach((p, i) => { g += `<polyline fill="none" stroke="${i ? '#b08a5a' : '#6b5a3c'}" stroke-width="1.2" ${i ? 'stroke-dasharray="5 4"' : ''} points="${p.map((q) => px(q[0]).toFixed(1) + ',' + py(q[1]).toFixed(1)).join(' ')}"/>`; });
    // the time when the body is at a given distance along the way: search the lap
    const tAt = (s) => { let lo = 0, hi = u.lap; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, c = M.cmd(u, m - (u.offset || 0)); if (u.Sof(c.u) < s) lo = m; else hi = m; } return lo; };
    const n = Math.max(3, Math.min(course ? 12 : 7, Math.floor(span / (u.wb * 2 + 10))));
    for (let i = 0; i < n; i++) { const s = s0 + ((i + 0.5) / n) * span, t = tAt(s) - (u.offset || 0), r = M.poseAt(u, t), c = r.cmd;
      // unroll: a world point → (distance along the way, height); the way's frame at the body
      const b = u.bodyAt(u.Sof(c.u)), fw = [Math.cos(b.h), Math.sin(b.h)], S0 = u.Sof(c.u), q = (p) => [px(S0 + (p[0] - b.x) * fw[0] + (p[2] - b.z) * fw[1]), py(p[1])];
      const seg = (a, b2, col, w, dash) => { const A = q(a), B = q(b2); return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${dash ? 'stroke-dasharray="4 3"' : ''}/>`; };
      const B = c.body, hull = [M.apply(B, [u.wb * 0.62, 0, 0]), M.apply(B, [-u.wb * 0.62, 0, 0])]; g += seg(hull[0], hull[1], '#222', 5);
      for (const l of u.kin.limbs) { const sol = r.sols[l.name], right = l.side > 0, col = c.limbs[l.name].sw ? '#d2452b' : '#1c5fa8'; for (let j = 0; j < l.n; j++) g += seg(sol.J[j], sol.J[j + 1], col, right ? 1.6 : 2.6, right);
        const F = r.W['foot_' + l.name]; g += seg(M.apply(F, [l.toeLen * 0.9, -l.ball, 0]), M.apply(F, [-l.toeLen * 0.5, -l.ball, 0]), col, right ? 1.4 : 2.4, right);
        for (let j = 0; j < l.n; j++) { const an = l.anchors[l.jointNames[j]]; if (!l.acts[j] || !an) continue; const pts = M.actPoints(l, sol, j, an); g += seg(pts[0], pts[1], '#e09a1a', right ? 0.9 : 1.5, right); } }
      let prev = null; for (const k in r.W) if (k.startsWith('neck_') || k === 'head') { if (prev) g += seg(prev, r.W[k].p, '#222', 3); prev = r.W[k].p; } if (r.W.head) g += seg(r.W.head.p, M.apply(r.W.head, [u.K.spec.head.len, 0, 0]), '#222', 4); }
    rows.push({ g: g + '</g>', H });
  }
  return rows;
}
function sheetWrite(rows, file) { const W = 1500; let y = 0; const body = rows.map((r) => { const s = `<g transform="translate(0,${y})">${r.g}</g>`; y += r.H + 8; return s; }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" font-family="sans-serif"><rect width="100%" height="100%" fill="#f4f1ea"/>${body}</svg>`;
  mkdirSync(dirname(file), { recursive: true }); writeFileSync(file.replace(/\.png$/, '.svg'), svg); return file.replace(/\.png$/, '.svg'); }

// ── a map: the land's height (tint, relief shading, a contour every 5 m), where it is too steep to stand (red), water (blue),
// the machines' ways, every footfall, and the realm's places ─────────────────────────────────────────────────────────
export async function map(LR, file, { half = 256, px = 3 } = {}) {
  const L = LR.land, n = half * 2, W = n * px, buf = Buffer.alloc(W * W * 3), H = new Float32Array((n + 1) * (n + 1)); let lo = 1e9, hi = -1e9;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const h = L.h(-half + i, -half + j); H[j * (n + 1) + i] = h; if (h < lo) lo = h; if (h > hi) hi = h; }
  const ramp = [[0, [70, 96, 72]], [0.25, [108, 132, 86]], [0.5, [160, 160, 108]], [0.75, [176, 150, 118]], [1, [224, 220, 214]]];
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const x = i / px, z = j / px, i0 = Math.min(n - 1, Math.floor(x)), j0 = Math.min(n - 1, Math.floor(z)), u = x - i0, v = z - j0, k = j0 * (n + 1) + i0;
    const h = H[k] * (1 - u) * (1 - v) + H[k + 1] * u * (1 - v) + H[k + n + 1] * (1 - u) * v + H[k + n + 2] * u * v, dx = (H[k + 1] - H[k]) * (1 - v) + (H[k + n + 2] - H[k + n + 1]) * v, dz = (H[k + n + 1] - H[k]) * (1 - u) + (H[k + n + 2] - H[k + 1]) * u;
    const t = (h - lo) / Math.max(1e-6, hi - lo); let a = ramp[0], b = ramp[ramp.length - 1]; for (let q = 1; q < ramp.length; q++) if (t <= ramp[q][0]) { a = ramp[q - 1]; b = ramp[q]; break; }
    const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]), sh = Math.max(0.35, Math.min(1.35, 0.9 + (-dx * 0.7 - dz * 0.7) * 0.9)), slope = Math.atan(Math.hypot(dx, dz)) * 57.3;
    let c = [0, 1, 2].map((q) => (a[1][q] + (b[1][q] - a[1][q]) * f) * sh); if (slope > 38) c = [c[0] * 0.6 + 100, c[1] * 0.45, c[2] * 0.45]; else if (slope > 30) c = [c[0] * 0.8 + 45, c[1] * 0.75, c[2] * 0.7];
    if (Math.abs(((h % 5) + 5) % 5) < Math.max(0.12, Math.hypot(dx, dz) * 0.5 / px * 1.2)) c = c.map((q) => q * 0.72);
    const wl = LR.water.levelAt(-half + x, -half + z); if (wl > h) c = [60, 110, 150];
    const o = (j * W + i) * 3; buf[o] = Math.min(255, c[0]); buf[o + 1] = Math.min(255, c[1]); buf[o + 2] = Math.min(255, c[2]); }
  const { spawnSync } = await import('node:child_process'); mkdirSync(dirname(file), { recursive: true }); const ppm = file + '.ppm'; writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${W} ${W}\n255\n`), buf]));
  const base = file + '.base.png'; spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', ppm, base]); const X = (x) => ((x + half) * px).toFixed(1); let g = '';
  const M = LR.mech, cols = ['#ffd24a', '#ff7a3c', '#7fd4ff', '#e58cff', '#b8ff7a'];
  Object.values(M.routes).forEach((r, i) => { const pts = []; for (let s = 0; s <= r.len; s += 2) { const p = r.at(s); pts.push(X(p[0]) + ',' + X(p[1])); } g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${cols[i % 5]}" stroke-width="${Math.max(2, r.width * px)}" stroke-opacity="0.16"/><polyline points="${pts.join(' ')}" fill="none" stroke="${cols[i % 5]}" stroke-width="1.6"/>`;
    for (let s = 0; s < r.len; s += 50) { const p = r.at(s); g += `<text x="${X(p[0])}" y="${X(p[1])}" font-size="11" fill="#fff" stroke="#000" stroke-width="2.4" paint-order="stroke">${r.name} ${s}</text>`; } });
  for (const u of M.units) if (u.fly) { const pts = []; for (let s = 0; s <= u.len; s += 4) { const p = u.at(s); pts.push(X(p[0] + 0) + ',' + X(p[2])); } g += `<polyline points="${pts.join(' ')}" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="7 5" stroke-opacity="0.8"/>`; }
  const seen = new Set(); for (const u of M.units) { if (u.fly) continue; const key = u.kind + '/' + (u.R ? u.R.name : u.name); if (seen.has(key)) continue; seen.add(key); for (const l of u.kin.limbs) for (const P of u.plants[l.name]) g += `<circle cx="${X(P.x)}" cy="${X(P.z)}" r="${Math.max(1.5, l.ball * 1.6 * px)}" fill="${P.moved > 0.01 ? '#ff3b3b' : '#111'}" fill-opacity="0.8"/>`; }
  for (const p of (LR.world.places || [])) g += `<circle cx="${X(p.x)}" cy="${X(p.z)}" r="4" fill="#fff" stroke="#000"/><text x="${+X(p.x) + 7}" y="${+X(p.z) + 4}" font-size="15" font-weight="bold" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${p.name}</text>`;
  for (let v = -half + (half % 50); v <= half; v += 50) g += `<line x1="${X(v)}" y1="0" x2="${X(v)}" y2="${W}" stroke="#000" stroke-opacity="0.18"/><line y1="${X(v)}" x1="0" y2="${X(v)}" x2="${W}" stroke="#000" stroke-opacity="0.18"/><text x="${+X(v) + 3}" y="12" font-size="11" fill="#000">${v}</text><text y="${+X(v) - 3}" x="3" font-size="11" fill="#000">${v}</text>`;
  g += `<text x="10" y="${W - 12}" font-size="14" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">x east → · z south ↓ · ${lo.toFixed(0)}…${hi.toFixed(0)} m · contours 5 m · red: steeper than 30° / 38° · dots: footfalls (red: moved to better ground)</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" font-family="sans-serif"><image href="data:image/png;base64,${readFileSync(base).toString('base64')}" width="${W}" height="${W}"/>${g}</svg>`;
  const b = await (await pw()).launch(), p = await b.newPage(); await p.setViewportSize({ width: W, height: W }); await p.setContent(`<body style="margin:0">${svg}</body>`); await p.screenshot({ path: file }); await b.close();
  const { rmSync } = await import('node:fs'); rmSync(ppm, { force: true }); rmSync(base, { force: true }); return file;
}
async function pw() { const { createRequire } = await import('node:module'); const require = createRequire(import.meta.url); try { return require('playwright').chromium; } catch { const { execSync } = await import('node:child_process'); return require(join(execSync('npm root -g').toString().trim(), 'playwright')).chromium; } }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const t0 = Date.now(), course = has('course'); let res;
  try { res = run(dir, { course, dt: +opt('dt', '0.1'), only: opt('kind', null), onEach: has('sheet') ? (LR, rows) => sheetRows(LR, course, rows) : null }); } catch (e) { console.error('gym failed:', e.stack || e.message); process.exit(1); }
  if (has('json')) { console.log(JSON.stringify(res.out.map((o) => ({ unit: o.unit, bad: o.bad, A: o.A })), null, 1)); process.exit(res.out.some((o) => o.bad.length) ? 1 : 0); }
  let fails = 0; for (const o of res.out) { if (o.A) console.log(line(o.A)); for (const b of o.bad) { console.log('   ✗ ' + b); fails++; } }
  if (has('sheet')) { const f = sheetWrite(res.sheets, join(dir, 'out', course ? 'gym-course.png' : 'gym.png'));
    try { const b = await (await pw()).launch(), p = await b.newPage(), svg = readFileSync(f, 'utf8'), m = svg.match(/width="(\d+)" height="(\d+)"/); await p.setViewportSize({ width: +m[1], height: Math.min(+m[2], 8000) }); await p.setContent(`<body style="margin:0">${svg}</body>`); await p.screenshot({ path: f.replace(/\.svg$/, '.png') }); await b.close(); console.log(f.replace(/\.svg$/, '.png')); } catch (e) { console.log(f + '  (no browser to make a PNG: ' + e.message.split('\n')[0] + ')'); } }
  if (has('map')) console.log(await map(res.LR, join(dir, 'out', 'map.png'), { px: +opt('px', '3'), half: res.LR.land.half }));
  console.log(`${fails ? fails + ' rule(s) broken' : 'gym OK'} · ${res.out.filter((o) => o.A).length} unit(s) · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(fails ? 1 : 0);
}
