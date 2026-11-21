// bounce-symphony · machine.js — the score becomes a machine, and the machine is proved by physics.
// Pure JavaScript (no three.js, no DOM): the page, check.mjs and solve.mjs all run this same file.
//
//   parseNotes(text, opts)  → notes in beats (sticky durations, bar checks, [ … ]*n repeats)
//   solveMachine(spec)      → pads, balls, droppers, cups and hits: every note is one pad, struck once, by a real
//                             ballistic flight that lands exactly on the note's time (inverse design)
//   simulate(machine)       → an independent event-driven forward simulation of every ball against every object in the
//                             machine: proves each note is hit on time, on the right pad, and nothing else is touched
//
// Units: metres, seconds, y up, g = 9.81. A pad is placed so that the bounce it gives (frictionless, restitution e along
// its normal) sends the ball to the next pad in exactly the time between the two notes.

export const G = 9.81;
const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const midiName = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);

// ---------------------------------------------------------------- notes
// "c5:8 e5 g5 | a5:4. r:8 | [d5:16 e5]*2 f#5:4 bb4" — pitch + octave (c4 = middle C), ':n' = 1/n note (sticky), '.' dot,
// 'r' rest, '|' bar line (checked against the meter), '[ … ]*n' repeat. Returns { notes: [{beat, beats, midi, bar}], errors }.
export function parseNotes(text, { meter = '4/4', label = 'notes' } = {}) {
  let src = String(text);
  for (let guard = 0; /\[[^[\]]*\]\*\d+/.test(src) && guard < 50; guard++)
    src = src.replace(/\[([^[\]]*)\]\*(\d+)/g, (_, body, n) => Array(+n).fill(body).join(' '));
  const [mn, md] = meter.split('/').map(Number), barBeats = (mn * 4) / md;
  const notes = [], errors = [];
  let beat = 0, dur = 1, barStart = 0, bar = 1;
  const toks = src.replace(/\|/g, ' | ').split(/\s+/).filter(Boolean);
  toks.forEach((tok, i) => {
    if (tok === '|') {
      const len = beat - barStart;
      if (Math.abs(len - barBeats) > 1e-6 && !(bar === 1 && len < barBeats)) errors.push(`${label}: bar ${bar} has ${+len.toFixed(4)} beats, the meter ${meter} wants ${barBeats}`);
      barStart = beat; bar++; return;
    }
    const m = /^(r|[a-g](?:#|b)?-?\d)(?::(\d+))?(\.)?$/i.exec(tok);
    if (!m) { errors.push(`${label}: cannot read "${tok}" (token ${i + 1})`); return; }
    if (m[2]) dur = 4 / +m[2];
    const beats = dur * (m[3] ? 1.5 : 1);
    if (m[1].toLowerCase() !== 'r') {
      const p = /^([a-g])(#|b)?(-?\d)$/i.exec(m[1]);
      const midi = 12 * (+p[3] + 1) + NOTE[p[1].toLowerCase()] + (p[2] === '#' ? 1 : p[2] === 'b' ? -1 : 0);
      notes.push({ beat, beats, midi, bar });
    }
    beat += beats;
  });
  return { notes, errors, beats: beat, bars: bar };
}

// ---------------------------------------------------------------- vectors
const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const len = (a) => Math.sqrt(dot(a, a));
const norm = (a) => mul(a, 1 / (len(a) || 1));
export const vec = { v3, add, sub, mul, dot, cross, len, norm };
const GV = v3(0, -G, 0);
const fly = (p, v, t) => v3(p.x + v.x * t, p.y + v.y * t - 0.5 * G * t * t, p.z + v.z * t);
const velAt = (v, t) => v3(v.x, v.y - G * t, v.z);
export { fly, velAt };

// ---------------------------------------------------------------- layouts: where along the floor the pads go
// Each layout maps arclength s (m) and the note index i to a floor point and a travel direction.
// spiral { center:[x,z], r0, grow (m per turn), angle0 (deg), dir (+1 ccw / -1 cw) } — Archimedean, outward
// arc    { from:[x,z], heading (deg, 0 = +x, 90 = +z), bend (deg per m; 0 = straight) }
// zigzag { from, heading, bend, width } — the arc, alternating left / right of it note by note
// path   { points: [[x,z], …] } — a polyline you draw
function makeLayout(L) {
  const kind = L.kind || 'arc', rad = Math.PI / 180;
  if (kind === 'spiral') {
    const [cx, cz] = L.center || [0, 0], r0 = L.r0 ?? 0.3, grow = L.grow ?? 0.25, a0 = (L.angle0 ?? 0) * rad, dir = L.dir ?? 1;
    const k = grow / (2 * Math.PI), tab = [[0, 0]]; // s(θ) table
    for (let th = 0, s = 0; th < 400; th += 0.01) { const r = r0 + k * th; s += Math.sqrt(r * r + k * k) * 0.01; tab.push([th + 0.01, s]); }
    const thetaAt = (s) => { let lo = 0, hi = tab.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m][1] < s) lo = m; else hi = m; } const [t0, s0] = tab[lo], [t1, s1] = tab[hi]; return t0 + ((s - s0) / (s1 - s0 || 1)) * (t1 - t0); };
    return (s) => {
      const th = thetaAt(s), r = r0 + k * th, a = a0 + dir * th;
      const x = cx + r * Math.cos(a), z = cz + r * Math.sin(a);
      const dx = k * Math.cos(a) - r * dir * Math.sin(a), dz = k * Math.sin(a) + r * dir * Math.cos(a), d = Math.hypot(dx, dz);
      return { x, z, tx: dx / d, tz: dz / d };
    };
  }
  if (kind === 'arc' || kind === 'zigzag') {
    const [fx, fz] = L.from || [0, 0], h0 = (L.heading ?? 0) * rad, b = (L.bend ?? 0) * rad, w = L.width ?? 0.16;
    const base = (s) => {
      if (Math.abs(b) < 1e-9) return { x: fx + s * Math.cos(h0), z: fz + s * Math.sin(h0), tx: Math.cos(h0), tz: Math.sin(h0) };
      const R = 1 / b, h = h0 + b * s;
      return { x: fx + R * (Math.sin(h) - Math.sin(h0)), z: fz - R * (Math.cos(h) - Math.cos(h0)), tx: Math.cos(h), tz: Math.sin(h) };
    };
    if (kind === 'arc') return base;
    return (s, i) => { const p = base(s), side = i % 2 ? 1 : -1; return { ...p, x: p.x - p.tz * side * w / 2, z: p.z + p.tx * side * w / 2 }; };
  }
  if (kind === 'path') {
    const P = L.points, seg = [];
    let acc = 0; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push([acc, d]); acc += d; }
    return (s) => {
      let i = seg.findIndex(([a, d]) => s <= a + d); if (i < 0) i = seg.length - 1;
      const [a, d] = seg[i], u = (s - a) / d, tx = (P[i + 1][0] - P[i][0]) / d, tz = (P[i + 1][1] - P[i][1]) / d;
      return { x: P[i][0] + (P[i + 1][0] - P[i][0]) * u, z: P[i][1] + (P[i + 1][1] - P[i][1]) * u, tx, tz };
    };
  }
  throw new Error(`unknown layout kind "${kind}" (spiral, arc, zigzag, path)`);
}

// ---------------------------------------------------------------- instruments: what a pad looks like and how it rings
// shape: 'bar' (length by pitch, like a marimba key: L ∝ 1/√f; L0 at the reference note `ref`) | 'disc' (radius by pitch)
// e: restitution of the bounce (ball on that surface) — it decides how many notes one ball can chain.
export const KINDS = {
  marimba: { ref: 60, shape: 'bar', e: 0.8, L0: 0.2, w: 0.042, th: 0.016, wobble: 0.05 },
  xylophone: { ref: 72, shape: 'bar', e: 0.84, L0: 0.16, w: 0.036, th: 0.016, wobble: 0.04 },
  vibraphone: { ref: 65, shape: 'bar', e: 0.82, L0: 0.18, w: 0.04, th: 0.011, wobble: 0.05 },
  glockenspiel: { ref: 84, shape: 'bar', e: 0.86, L0: 0.11, w: 0.026, th: 0.007, wobble: 0.04 },
  steelpan: { ref: 67, shape: 'disc', e: 0.8, R0: 0.06, th: 0.012, wobble: 0.05 },
  bowl: { ref: 60, shape: 'disc', e: 0.72, R0: 0.055, th: 0.03, wobble: 0.02 },
  gong: { ref: 48, shape: 'disc', e: 0.66, R0: 0.08, th: 0.008, wobble: 0.12 },
  cymbal: { ref: 72, shape: 'disc', e: 0.62, R0: 0.085, th: 0.004, wobble: 0.18 },
  drum: { ref: 40, shape: 'disc', e: 0.74, R0: 0.07, th: 0.05, wobble: 0.01 },
  woodblock: { ref: 72, shape: 'bar', e: 0.78, L0: 0.09, w: 0.045, th: 0.03, wobble: 0.01 },
  kalimba: { ref: 72, shape: 'bar', e: 0.85, L0: 0.08, w: 0.016, th: 0.004, wobble: 0.08 },
};
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
export function padSize(kind, midi, inst = {}) {
  const K = { ...KINDS[kind], ...inst }, f = mtof(midi), f0 = mtof(K.ref ?? 60);
  if (K.shape === 'bar') return { shape: 'bar', L: Math.min(K.L0 * 1.9, Math.max(K.L0 * 0.35, K.L0 * Math.sqrt(f0 / f))), w: K.w, th: K.th };
  return { shape: 'disc', R: Math.min(K.R0 * 1.8, Math.max(K.R0 * 0.45, K.R0 * (f0 / f) ** 0.25)), th: K.th };
}

// ---------------------------------------------------------------- the solver
// spec: { bpm, meter, intro, ballR, lanes: [{ id, inst, layout, notes, top, drop, speed, minStep, maxStep, e, maxGap,
//         floor, runGap, catchT, catchStep, color }], instruments: { id: { kind, … } } }
export function solveMachine(spec) {
  const bpm = spec.bpm ?? 100, spb = 60 / bpm, intro = spec.intro ?? 3, R = spec.ballR ?? 0.014;
  const errors = [], warnings = [], pads = [], balls = [], cups = [], droppers = [], hits = [], notesPerLane = {}, rails_ = [];
  for (const lane of spec.lanes) {
    const inst = spec.instruments?.[lane.inst] || { kind: lane.inst };
    if (!KINDS[inst.kind]) { errors.push(`lane ${lane.id}: unknown instrument kind "${inst.kind}" (have ${Object.keys(KINDS).join(', ')})`); continue; }
    const K = { ...KINDS[inst.kind], ...inst };
    const parsed = parseNotes(lane.notes, { meter: spec.meter, label: `lane ${lane.id}` });
    errors.push(...parsed.errors);
    const at = makeLayout(lane.layout || {}), top = lane.top ?? 1.2, drop = lane.drop ?? 0.18, speed = lane.speed ?? 0.45;
    const minGap0 = K.shape === 'bar' ? K.w : 2 * K.R0 * 0.8, minStep = Math.max(lane.minStep ?? 0.06, minGap0 + 0.02), maxStep = lane.maxStep ?? 0.5;
    const e = lane.e ?? K.e;
    if (!(e > 0.3 && e <= 0.95)) errors.push(`lane ${lane.id}: restitution e = ${e} — keep it physical (0.3 < e ≤ 0.95); split the phrase into more balls instead`);
    const maxGap = lane.maxGap ?? 0.95, floor = lane.floor ?? 0.3, runGap = lane.runGap ?? 0.28;
    const catchT = lane.catchT ?? 0.34, catchStep = lane.catchStep ?? 0.13, maxTilt = lane.maxTilt ?? 42;
    // rails: a long gap inside a phrase is bridged by a funnel and a gentle rail the ball rolls down (rolling sphere:
    // a = 5/7 g sin α), leaving the rail end exactly in time to fly to the next pad — so one ball can carry long notes
    const rails = lane.rails !== false, maxRoll = lane.maxRoll ?? 2.6, outT = lane.railOutT ?? 0.26;
    // starts: 'drop' (a trap-door dropper above the first pad) | 'catapult' (a seesaw on the floor flings the ball up to
    // the first pad) | 'alternate' (run by run)
    const startKind = (k) => { const st = lane.start ?? 'drop'; return st === 'alternate' ? (k % 2 ? 'catapult' : 'drop') : st; };
    const notes = parsed.notes.map((n) => ({ ...n, t: intro + n.beat * spb }));
    notesPerLane[lane.id] = notes.length;
    let s = -runGap, i = 0, runNo = 0;
    while (i < notes.length) {
      // ---- one run = one ball, from a dropper above its first pad to a cup after its last
      s += runGap;
      const kind = startKind(runNo);
      if (kind === 'catapult' && runNo > 0) s += 0.42; // room for the seesaw behind the first pad, past the last cup
      const first = at(s, i), p0 = v3(first.x, top, first.z);
      let vin0 = v3(0, -Math.sqrt(2 * G * drop), 0), tFall = Math.sqrt((2 * drop) / G), rest = add(p0, v3(0, drop, 0)), launch = v3();
      if (kind === 'catapult') {
        // the ball rests in the cup of a seesaw on the floor, behind the first pad; the flight peaks `drop` above the pad
        const back = 0.34, sx = first.x - first.tx * back, sz = first.z - first.tz * back;
        rest = v3(sx, 0.135, sz);
        const vy = Math.sqrt(2 * G * (top + drop - rest.y)), T0 = vy / G + Math.sqrt((2 * drop) / G);
        launch = v3((p0.x - sx) / T0, vy, (p0.z - sz) / T0); tFall = T0; vin0 = velAt(launch, T0);
      }
      const run = [{ note: notes[i], p: p0, vin: vin0, s, dirx: first.tx, dirz: first.tz }];
      run.rails = [];
      let j = i + 1;
      // place the following pads one by one; split the run when the next note can't be reached
      for (; j <= notes.length; j++) {
        const last = run[run.length - 1];
        if (j < notes.length && rails && notes[j].t - last.note.t > maxGap && notes[j].t - last.note.t <= maxRoll + catchT + 0.12 + outT) {
          const r = tryRail(last, notes[j]); if (r) { run.push(r); continue; }
        }
        if (j === notes.length || notes[j].t - last.note.t > maxGap) { run.splitReason = j < notes.length ? `gap ${(notes[j].t - last.note.t).toFixed(2)} s` : 'end'; closeRun(); break; }
        const T = notes[j].t - last.note.t, step = Math.min(maxStep, Math.max(minStep, speed * T));
        const fl = at(last.s + step, j), dir = v3(fl.x - last.p.x, 0, fl.z - last.p.z);
        const sol = solveBounce(last, fl, T);
        if (!sol || sol.q.y < floor) { run.splitReason = sol ? 'ran out of height' : `cannot reach ${midiName(notes[j].midi)}`; closeRun(); break; }
        accept(last, sol, dir);
        run.push({ note: notes[j], p: sol.q, vin: velAt(sol.vout, T), s: last.s + step, dirx: fl.tx, dirz: fl.tz });
      }
      // the bounce off `last` that lands on floor point fl after T seconds, at restitution e: find the landing height
      function solveBounce(last, fl, T) {
        const effE = (y) => {
          const q = v3(fl.x, y, fl.z), vout = v3((q.x - last.p.x) / T, (q.y - last.p.y) / T + 0.5 * G * T, (q.z - last.p.z) / T);
          const n = norm(sub(vout, last.vin));
          return { e: -dot(vout, n) / dot(last.vin, n), n, vout, q };
        };
        // e falls as the landing point drops. Scan down from above for the first crossing of e inside the region of real
        // bounces (normal points up, the ball comes in against it and leaves along it, and it is falling when it lands
        // on the next pad — never struck from below), then bisect.
        const ok = (r) => r.n.y > 0.25 && dot(last.vin, r.n) < 0 && dot(r.vout, r.n) > 0 && r.vout.y - G * T < -0.25;
        let hi = null;
        for (let y = last.p.y + 3; y >= last.p.y - 6; y -= 0.01) {
          const r = effE(y);
          if (!ok(r)) { if (hi !== null) return null; continue; }
          if (r.e >= e) { hi = y; continue; }
          if (hi === null) return null; // even the highest real landing asks for more bounce than e gives
          let lo = y; for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (effE(mid).e < e) lo = mid; else hi = mid; }
          return effE((lo + hi) / 2);
        }
        return null;
      }
      function accept(last, sol, dir) {
        last.n = sol.n; last.vout = sol.vout; last.e = e; last.dir = norm(dir);
        last.tilt = (Math.acos(Math.min(1, sol.n.y)) * 180) / Math.PI;
        if (last.tilt > maxTilt) errors.push(`lane ${lane.id}: pad for ${midiName(last.note.midi)} (bar ${last.note.bar}) tilts ${last.tilt.toFixed(0)}° (> ${maxTilt}°) — raise speed / step or shorten the gap`);
      }
      // last pad → (catchT) a funnel → (0.12 s) the rail's top, at rest → roll T_r → leave the rail end → (outT) the next pad
      function tryRail(last, next) {
        const gap = next.t - last.note.t, Tr = gap - catchT - 0.12 - outT;
        if (Tr < 0.35) return null;
        const fl = at(last.s + catchStep, j), sol = solveBounce(last, fl, catchT);
        if (!sol || sol.q.y < floor + 0.12) return null;
        const q = sol.q, top = sub(q, v3(0, 0.075, 0));
        const a6 = (5 / 7) * G * Math.sin((5 * Math.PI) / 180); // aim for a 5° rail, between 15 cm and 80 cm long
        let L = Math.min(0.8, Math.max(0.15, 0.5 * a6 * Tr * Tr)), a = (2 * L) / (Tr * Tr), sinA = (7 * a) / (5 * G);
        if (sinA < Math.sin((0.8 * Math.PI) / 180)) { sinA = Math.sin((0.8 * Math.PI) / 180); a = (5 / 7) * G * sinA; L = 0.5 * a * Tr * Tr; }
        if (sinA > Math.sin((20 * Math.PI) / 180) || L > 1.1) return null;
        const cosA = Math.sqrt(1 - sinA * sinA), d = norm(v3(fl.tx, 0, fl.tz)), u = v3(d.x * cosA, -sinA, d.z * cosA);
        const end = add(top, mul(u, L)), vex = mul(u, a * Tr);
        const pnext = fly(end, vex, outT), vin = velAt(vex, outT);
        if (pnext.y < floor) return null;
        accept(last, sol, v3(fl.x - last.p.x, 0, fl.z - last.p.z));
        last.rail = { q, top, end, u, L, a, Tr, sinA, tIn: last.note.t + catchT, tTop: last.note.t + catchT + 0.12, tEnd: last.note.t + catchT + 0.12 + Tr, vex, catchT };
        run.rails.push(last.rail);
        const sNext = last.s + catchStep + L * cosA + Math.hypot(vex.x, vex.z) * outT;
        return { note: next, p: pnext, vin, s: sNext, dirx: d.x, dirz: d.z, afterRail: true };
      }
      function closeRun() {
        // the run ends at its last pad: aim it at a cup a catchStep further along, catchT (or a little less) later
        // (a fast ball may need a longer or shorter flight to land in a cup above the floor)
        const last = run[run.length - 1];
        for (const k of [1, 0.8, 0.65, 1.3, 1.7, 2.2, 2.8, 3.5]) {
          const T = catchT * k, fl = at(last.s + catchStep * Math.max(1, k), j);
          const sol = solveBounce(last, fl, T);
          if (!sol || sol.q.y < 0.08) continue;
          accept(last, sol, v3(fl.x - last.p.x, 0, fl.z - last.p.z));
          run.cup = { p: sol.q, vin: velAt(sol.vout, T), T, s: last.s + catchStep * Math.max(1, k) };
          return true;
        }
        errors.push(`lane ${lane.id}: cannot catch the ball after ${midiName(last.note.midi)} (bar ${last.note.bar})`); return false;
      }
      if (!run.cup) { s = run[run.length - 1].s + catchStep; i = Math.max(j, i + 1); continue; }
      // ---- emit the run as objects
      const ballId = balls.length, release = run[0].note.t - tFall;
      // the dropper's post stands behind the first pad (against the direction of travel), clear of it
      const side = norm(v3(-run[0].dir.x, 0, -run[0].dir.z)), sz0 = padSize(K.kind, run[0].note.midi, inst);
      const off = (sz0.shape === 'bar' ? sz0.w / 2 : sz0.R) + 0.035;
      droppers.push({ id: droppers.length, lane: lane.id, ball: ballId, kind, p: rest, side, off, t: release, launch, pad0: run[0].p });
      const segs = [{ t0: release, p: rest, v: launch, t1: run[0].note.t }];
      run.forEach((r, k) => {
        const size = padSize(K.kind, r.note.midi, inst);
        const n = r.n, perp = v3(-r.dir.z, 0, r.dir.x);
        const long = norm(sub(perp, mul(n, dot(perp, n)))), across = cross(long, n);
        const center = sub(r.p, mul(n, R)); // centre of the pad's top face
        const vn = -dot(r.vin, n);
        const pad = { id: pads.length, lane: lane.id, inst: lane.inst, kind: K.kind, ball: ballId, run: runNo, k, midi: r.note.midi, bar: r.note.bar, t: r.note.t, beat: r.note.beat, center, n, long, across, e: r.e, tilt: r.tilt, vn, ...size, contact: r.p };
        pads.push(pad);
        hits.push({ t: r.note.t, pad: pad.id, lane: lane.id, inst: lane.inst, kind: K.kind, midi: r.note.midi, vn, x: r.p.x, z: r.p.z, ball: ballId });
        if (r.rail) { // fly into the funnel, drop through it, roll down the rail, fly off its end
          const R_ = r.rail;
          segs.push({ t0: r.note.t, p: r.p, v: r.vout, t1: R_.tIn, pad: pad.id });
          segs.push({ kind: 'lerp', t0: R_.tIn, t1: R_.tTop, a: R_.q, b: R_.top });
          segs.push({ kind: 'roll', t0: R_.tTop, t1: R_.tEnd, p: R_.top, u: R_.u, acc: R_.a });
          segs.push({ t0: R_.tEnd, p: R_.end, v: R_.vex, t1: run[k + 1].note.t, rail: rails_.length });
          rails_.push({ id: rails_.length, lane: lane.id, ball: ballId, ...R_ });
          return;
        }
        const T1 = k + 1 < run.length ? run[k + 1].note.t - r.note.t : run.cup.T;
        segs.push({ t0: r.note.t, p: r.p, v: r.vout, t1: r.note.t + T1, pad: pad.id });
      });
      const cup = { id: cups.length, lane: lane.id, ball: ballId, rim: run.cup.p, t: run[run.length - 1].note.t + run.cup.T, vin: run.cup.vin, r: 0.034, depth: 0.045 };
      cups.push(cup);
      balls.push({ id: ballId, lane: lane.id, color: lane.color, r: R, release, segs, cup: cup.id, first: run[0].note.t, last: cup.t, notes: run.length });
      runNo++;
      s = run.cup.s; // the next run starts further along the same path
      i = j;
    }
  }
  hits.sort((a, b) => a.t - b.t);
  const end = Math.max(0, ...balls.map((b) => b.last));
  return { pads, balls, cups, droppers, rails: rails_, hits, errors, warnings, notesPerLane, ballR: R, intro, spb, end };
}

// where a ball is at time t (analytic: on its dropper before release, parabolas between pads, settled in its cup after)
export function ballAt(ball, t, cups) {
  const S = ball.segs;
  if (t <= S[0].t0) return { p: S[0].p, state: 'loaded' };
  for (const s of S) if (t <= s.t1) {
    const u = t - s.t0;
    if (s.kind === 'lerp') { const k = u / (s.t1 - s.t0), e = k * k; return { p: add(mul(s.a, 1 - e), mul(s.b, e)), state: 'funnel' }; }
    if (s.kind === 'roll') return { p: add(s.p, mul(s.u, 0.5 * s.acc * u * u)), v: mul(s.u, s.acc * u), state: 'rolling', roll: 0.5 * s.acc * u * u };
    return { p: fly(s.p, s.v, u), v: velAt(s.v, u), state: 'flying' };
  }
  if (ball.tailAt && t > cups[ball.cup].t + 0.05) { const r = ball.tailAt(t); if (r) return r; } // a relay: the ball leaves its cup
  const c = cups[ball.cup], dt = t - c.t, bottom = c.rim.y - c.depth + ball.r + 0.004;
  // drop into the cup and settle with two small, decaying bounces
  const fall = Math.sqrt((2 * (c.rim.y - bottom)) / G);
  let y = bottom;
  if (dt < fall) y = c.rim.y + c.vin.y * 0 - 0.5 * G * dt * dt;
  else { const u = dt - fall, h1 = 0.006, T1 = 2 * Math.sqrt((2 * h1) / G), h2 = 0.0015, T2 = 2 * Math.sqrt((2 * h2) / G);
    if (u < T1) y = bottom + (Math.sqrt(2 * G * h1) * u - 0.5 * G * u * u);
    else if (u < T1 + T2) { const w = u - T1; y = bottom + (Math.sqrt(2 * G * h2) * w - 0.5 * G * w * w); } }
  return { p: v3(c.rim.x, Math.max(bottom, Math.min(c.rim.y, y)), c.rim.z), state: dt < fall ? 'dropping' : 'caught' };
}

// ---------------------------------------------------------------- the proof: event-driven forward simulation
// Each ball starts at rest on its dropper and is integrated exactly (parabolas) against every pad (thin slabs), every
// pole, every dropper post and cup, and the floor. A bounce uses only the pad's normal and restitution — never the
// solver's planned velocity — so a mistake anywhere shows up as a late / early / wrong / extra hit.
export function simulate(m, { margin = 0.004, poleR = 0.0045 } = {}) {
  const R = m.ballR, errors = [], report = [];
  const roots = (a, b, c) => {
    if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
    const d = b * b - 4 * a * c; if (d < 0) return [];
    const s = Math.sqrt(d); return [(-b - s) / (2 * a), (-b + s) / (2 * a)];
  };
  // every time τ in (lo, hi] a parabola (p, v) is at signed distance `off` from plane (c, n), earliest first
  const planeHits = (p, v, c, n, off, lo, hi) => {
    const A = 0.5 * dot(GV, n), B = dot(v, n), C = dot(sub(p, c), n) - off;
    return roots(A, B, C).filter((t) => t > lo && t <= hi).sort((a, b) => a - b);
  };
  const inPad = (pad, q, grow) => {
    const d = sub(q, pad.center);
    if (pad.shape === 'bar') return Math.abs(dot(d, pad.long)) <= pad.L / 2 + grow && Math.abs(dot(d, pad.across)) <= pad.w / 2 + grow;
    const h = sub(d, mul(pad.n, dot(d, pad.n))); return len(h) <= pad.R + grow;
  };
  const cylHit = (p, v, cx, cz, rad, y0, y1, lo, hi) => {
    const dx = p.x - cx, dz = p.z - cz;
    let best = Infinity;
    for (const t of roots(v.x * v.x + v.z * v.z, 2 * (dx * v.x + dz * v.z), dx * dx + dz * dz - rad * rad)) {
      if (t > lo && t <= hi) { const y = fly(p, v, t).y; if (y >= y0 && y <= y1 && t < best) best = t; }
    }
    return best;
  };
  const poles = m.pads.map((pd) => ({ id: `pole of pad ${pd.id}`, pad: pd.id, x: pd.center.x - pd.n.x * pd.th, z: pd.center.z - pd.n.z * pd.th, y1: pd.center.y - pd.th }));
  for (const c of m.cups) poles.push({ id: `cup ${c.id}`, cup: c.id, x: c.rim.x, z: c.rim.z, y1: c.rim.y, r: c.r + 0.004 });
  for (const d of m.droppers) {
    if (d.kind === 'catapult') poles.push({ id: `seesaw ${d.id}`, dropper: d.id, x: d.p.x, z: d.p.z, y1: d.p.y - 0.02, r: 0.03 });
    else poles.push({ id: `dropper post ${d.id}`, dropper: d.id, x: d.p.x + d.side.x * d.off, z: d.p.z + d.side.z * d.off, y1: d.p.y + 0.06, r: 0.006 });
  }
  for (const r of m.rails || []) {
    poles.push({ id: `funnel post of rail ${r.id}`, rail: r.id, own: 'in', x: r.q.x, z: r.q.z, y1: r.q.y - 0.09, r: 0.005 });
    const e2 = sub(r.end, mul(r.u, 0.04)); poles.push({ id: `rail post ${r.id}`, rail: r.id, x: e2.x, z: e2.z, y1: e2.y - 0.012, r: 0.005 });
  }
  for (const o of m.obstacles || []) poles.push(o); // mechanisms: helix towers, push rods, posts …
  // rails and funnels of other balls are tested by sampling the flight every 3 ms
  const nearRail = (ballId, q) => {
    for (const r of m.rails || []) {
      if (r.ball === ballId) continue;
      const d = sub(q, r.top), u = Math.max(0, Math.min(r.L, dot(d, r.u))), c = add(r.top, mul(r.u, u));
      if (len(sub(q, c)) < R + 0.014) return `rail ${r.id} (${r.lane})`;
      const f = sub(q, r.q); if (Math.hypot(f.x, f.z) < 0.04 + R && f.y < 0.012 && f.y > -0.09) return `funnel of rail ${r.id} (${r.lane})`;
    }
    for (const sgm of m.obstacleSegs || []) { // strings overhead
      const ab = sub(sgm.b, sgm.a), l2 = dot(ab, ab) || 1, u = Math.max(0, Math.min(1, dot(sub(q, sgm.a), ab) / l2));
      if (len(sub(q, add(sgm.a, mul(ab, u)))) < R + sgm.r + 0.004) return sgm.id;
    }
    return null;
  };
  for (const ball of m.balls) {
    let p = ball.segs[0].p, v = ball.segs[0].v, t = ball.release, worst = 0, ok = true, notes = 0, prev = null;
    const cup = m.cups[ball.cup], S = ball.segs;
    for (let i = 0; i < S.length; ) {
      const next = S[i + 1];
      // what this flight must reach: a pad, a funnel (rail) or the cup
      const target = next && next.pad !== undefined ? m.pads[next.pad] : null, funnel = next && next.kind === 'lerp' ? next : null;
      const want = target ? target.t : funnel ? funnel.t0 : cup.t;
      const horizon = want - t + 0.25;
      let tHit = Infinity;
      if (target) { // coming down onto its top face, inside its outline
        for (const th of planeHits(p, v, target.center, target.n, R, 1e-7, horizon))
          if (dot(velAt(v, th), target.n) < 0 && inPad(target, sub(fly(p, v, th), mul(target.n, R)), -0.002)) { tHit = th; break; }
      } else { // a funnel or the cup: the ball centre comes down through the rim plane inside the rim
        const rim = funnel ? funnel.a : cup.rim, rr = funnel ? 0.034 : cup.r;
        for (const th of planeHits(p, v, rim, v3(0, 1, 0), 0, 1e-7, horizon)) {
          const q = fly(p, v, th); if (velAt(v, th).y < 0 && Math.hypot(q.x - rim.x, q.z - rim.z) <= rr - R) { tHit = th; break; }
        }
      }
      // anything struck before it?
      let clash = null, tc = tHit;
      for (const pd of m.pads) {
        if (pd === target || pd === prev) continue;
        for (const off of [R + margin, -(pd.th + R + margin)]) {
          for (const th of planeHits(p, v, pd.center, pd.n, off, 1e-7, Math.min(tc, horizon)))
            if (inPad(pd, sub(fly(p, v, th), mul(pd.n, off)), R + margin)) { tc = th; clash = `pad ${pd.id} (${pd.lane} ${midiName(pd.midi)})`; break; }
        }
      }
      const myRail = S[i].rail !== undefined ? S[i].rail : funnel ? m.rails.findIndex((r) => r.ball === ball.id && Math.abs(r.tIn - funnel.t0) < 1e-6) : -1;
      for (const po of poles) {
        if ((target && po.pad === target.id) || (prev && po.pad === prev.id) || po.cup === ball.cup || (po.dropper !== undefined && m.droppers[po.dropper].ball === ball.id && i === 0)) continue;
        if (po.rail !== undefined && po.rail === myRail) continue;
        if (po.ball === ball.id) continue;
        const th = cylHit(p, v, po.x, po.z, (po.r ?? poleR) + R + margin, po.y0 ?? 0, po.y1, 1e-7, Math.min(tc, horizon));
        if (th < tc) { tc = th; clash = po.id; }
      }
      const tf = planeHits(p, v, v3(), v3(0, 1, 0), R, 1e-7, Math.min(tc, horizon))[0];
      if (tf !== undefined) { tc = tf; clash = 'the floor'; }
      if (!clash && Number.isFinite(tc)) for (let u = 0.003; u < tc; u += 0.003) { const w = nearRail(ball.id, fly(p, v, u)); if (w) { tc = u; clash = w; break; } }
      const what = target ? `pad ${target.id} (${midiName(target.midi)} @ ${want.toFixed(3)} s)` : funnel ? `its funnel @ ${want.toFixed(3)} s` : `its cup @ ${want.toFixed(3)} s`;
      if (clash) { errors.push(`ball ${ball.id} (${ball.lane}) hits ${clash} at ${(t + tc).toFixed(3)} s before ${what}`); ok = false; break; }
      if (tHit === Infinity) { errors.push(`ball ${ball.id} (${ball.lane}) misses ${what}`); ok = false; break; }
      const err = Math.abs(t + tHit - want); worst = Math.max(worst, err);
      if (err > 0.002) { errors.push(`ball ${ball.id} (${ball.lane}) reaches ${what} at ${(t + tHit).toFixed(4)} s`); ok = false; break; }
      if (!next) break;
      if (funnel) { // the rail guides it: rolling (a = 5/7 g sin α) is exact, so the ball leaves the rail end as solved
        const out = S[i + 3]; p = out.p; v = out.v; t = out.t0; prev = null; i += 3; continue;
      }
      // bounce: only the pad's normal and restitution
      const vi = velAt(v, tHit), vn = dot(vi, target.n);
      p = fly(p, v, tHit); v = sub(vi, mul(target.n, (1 + target.e) * vn)); t += tHit; prev = target; notes++; i += 1;
    }
    report.push({ ball: ball.id, lane: ball.lane, notes, ok, worstMs: worst * 1000 });
  }
  return { errors, report };
}

// ---------------------------------------------------------------- the build: nothing passes through anything else
// A machine you could build: no pole, dropper post or cup stem runs through a pad, and no two pads overlap.
export function clearance(m, { poleR = 0.0045, gap = 0.004 } = {}) {
  const errors = [];
  const inside = (pd, q, grow, slab) => { // q in pad pd's volume (slab = thickness tolerance)
    const d = sub(q, pd.center), h = dot(d, pd.n);
    if (h > slab || h < -pd.th - slab) return false;
    if (pd.shape === 'bar') return Math.abs(dot(d, pd.long)) <= pd.L / 2 + grow && Math.abs(dot(d, pd.across)) <= pd.w / 2 + grow;
    return len(sub(d, mul(pd.n, h))) <= pd.R + grow;
  };
  const verticals = [
    ...m.pads.map((pd) => ({ what: `the pole of pad ${pd.id} (${pd.lane} ${midiName(pd.midi)})`, pad: pd.id, x: pd.center.x - pd.n.x * pd.th, z: pd.center.z - pd.n.z * pd.th, y1: pd.center.y - pd.th, r: poleR })),
    ...m.cups.map((c) => ({ what: `the stem of cup ${c.id} (${c.lane})`, x: c.rim.x, z: c.rim.z, y1: c.rim.y, r: c.r })),
    ...m.droppers.map((d) => ({ what: `dropper post ${d.id} (${d.lane})`, x: d.p.x + d.side.x * d.off, z: d.p.z + d.side.z * d.off, y1: d.p.y + 0.06, r: 0.006 })),
  ];
  for (const v of verticals) for (const pd of m.pads) {
    if (pd.id === v.pad) continue;
    const y = pd.center.y - (pd.n.x * (v.x - pd.center.x) + pd.n.z * (v.z - pd.center.z)) / pd.n.y; // the pad's plane above (x, z)
    if (y > 0 && y - pd.th < v.y1 + gap && inside(pd, v3(v.x, y, v.z), v.r + gap, 0.001)) { errors.push(`${v.what} runs through pad ${pd.id} (${pd.lane} ${midiName(pd.midi)}) — move a lane or change its layout`); break; }
  }
  for (let i = 0; i < m.pads.length; i++) {
    const a = m.pads[i];
    for (let j = i + 1; j < m.pads.length; j++) {
      const b = m.pads[j], reach = (p) => (p.shape === 'bar' ? Math.hypot(p.L, p.w) / 2 : p.R);
      if (len(sub(a.center, b.center)) > reach(a) + reach(b) + 0.03) continue;
      let hit = false;
      for (let u = -1; u <= 1 && !hit; u += 0.5) for (let w = -1; w <= 1 && !hit; w += 1) for (const dep of [0, -a.th]) {
        const q = a.shape === 'bar' ? add(add(a.center, mul(a.long, (u * a.L) / 2)), add(mul(a.across, (w * a.w) / 2), mul(a.n, dep)))
          : add(a.center, add(mul(a.long, u * a.R * 0.9), add(mul(a.across, w * a.R * 0.9 * Math.sqrt(1 - Math.min(1, u * u) * 0.5)), mul(a.n, dep))));
        if (inside(b, q, gap, gap)) { hit = true; break; }
      }
      if (hit) errors.push(`pads ${a.id} (${a.lane} ${midiName(a.midi)}) and ${b.id} (${b.lane} ${midiName(b.midi)}) overlap`);
    }
  }
  return { errors };
}
