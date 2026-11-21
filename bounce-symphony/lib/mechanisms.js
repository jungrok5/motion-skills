// bounce-symphony · mechanisms.js — nothing starts by itself: every dropper and seesaw is set off by a chain of causes.
// Pure JavaScript, run after solveMachine (the page, check.mjs and the scripts run this same file).
//
//   planCauses(m, spec) → m.mech = { lines, helices, rods, levers, starter, causes, sounds } and m.obstacles
//
// A start (a dropper opening, a seesaw flinging) at time t needs a cause that happened earlier, plus a delay that ends
// exactly at t. The causes on offer:
//   strike — a pad struck by a ball (any lane) swings a push rod hanging from its end, which kicks a floor domino line;
//   relay  — a ball landing in a cup tips the cup; the same ball rolls down a helix round a little tower and onto the
//            floor, where it knocks a domino line (the helix's turns are the delay);
//   branch — a domino of a line already laid knocks a side line (a Y in the floor);
//   starter — the very first starts: a little pendulum hammer swings onto a plate that knocks a fan of domino lines.
// The domino line carries the cause across the floor to the start: to a lever at the foot of a dropper's post (a string
// up the post pulls the trap door) or onto the back arm of a seesaw. Its spacing, count and curve are solved so the last
// domino falls exactly when the start must happen.
//
// Physics used (all closed-form, deterministic):
//   domino wave speed  v = (0.9 + 1.2 r) √(g h)  for spacing r = gap / height in 0.25 … 0.85 — an empirical fit inside the
//                      measured range for real dominoes (about 1 – 2 √(gh));
//   rolling on a helix a = 5/7 g sin α (a solid ball rolling without slipping), T = L √(14 / (5 g H));
//   pendulum           quarter period (π/2) √(l/g) × 1.05 for a 50° release.
import { G, vec, midiName } from './machine.js';
const { v3, add, sub, mul, dot, len, norm } = vec;

const TERM = { drop: 0.03, catapult: 0.05 }; // lever + string to the trap door / the heavy last domino onto the seesaw arm
const H_CHOICES = [0.05, 0.04, 0.065, 0.08];
const waveV = (r, h) => (0.9 + 1.2 * r) * Math.sqrt(G * h);
const B_RATIO = 0.16; // domino thickness / height

// a domino line along a floor path of length L lasting exactly D seconds (first push → last domino down):
// n dominoes, pitch = (L − 0.9h) / (n − 1); the height h is the continuous knob (bigger dominoes run faster)
function solveForPath(L, D, hMax = 0.09) {
  // knobs: the count n, the height h, and where on the lever's 4 cm plate the last domino lands (tail) — the tail makes
  // the timing exact even when the path's room fixes h
  let best = null;
  const hs = []; for (let i = 0; i <= 10; i++) hs.push(0.035 + ((Math.min(0.09, hMax) - 0.035) * i) / 10);
  for (let n = 3; n < 500; n++) for (const h of hs) {
    const tail0 = 0.5 * h, tail1 = 0.5 * h + 0.04;
    const f = (tail) => { const pitch = (L - tail) / (n - 1), r = pitch / h - B_RATIO; return { pitch, r, D: ((n + 0.6) * pitch) / waveV(Math.max(0.01, r), h) }; };
    const a0 = f(tail0), a1 = f(tail1); // duration falls as the tail grows (closer dominoes)
    if (a0.D < D || a1.D > D) continue;
    let lo = tail0, hi = tail1; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (f(mid).D > D) lo = mid; else hi = mid; }
    const tail = (lo + hi) / 2, o = f(tail);
    if (o.r < 0.25 || o.r > 0.85) continue;
    const cand = { h, n, r: o.r, pitch: o.pitch, L, tail, tau: o.pitch / waveV(o.r, h) };
    const score = (c) => Math.abs(c.h - 0.05) + Math.abs(c.r - 0.5) * 0.04;
    if (!best || score(cand) < score(best)) best = cand;
  }
  return best;
}
// floor paths from A to B: circular arcs of a few lengths and both sides, and a path found round the obstacles (A*)
function arcPath(A, B, m, side) {
  const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, nx = -uz * side, nz = ux * side, L = d * m;
  let phi = 0;
  if (m > 1.0005) { let lo = 1e-4, hi = 2 * Math.PI * 0.95; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (mid / 2 / Math.sin(mid / 2) < m) lo = mid; else hi = mid; } phi = (lo + hi) / 2; }
  const pts = [], N = Math.max(2, Math.ceil(L / 0.02));
  for (let k = 0; k <= N; k++) {
    const s = (k / N) * L;
    if (phi < 1e-3) { pts.push([A.x + ux * s, A.z + uz * s]); continue; }
    const R = L / phi, a = s / R - phi / 2, cx = A.x + ux * d / 2 - nx * R * Math.cos(phi / 2), cz = A.z + uz * d / 2 - nz * R * Math.cos(phi / 2);
    pts.push([cx + ux * R * Math.sin(a) + nx * R * Math.cos(a), cz + uz * R * Math.sin(a) + nz * R * Math.cos(a)]);
  }
  return pts;
}
function astarPath(A, B, blocked, circles) {
  const c = 0.011, pad = 0.45, x0 = Math.min(A.x, B.x) - pad, z0 = Math.min(A.z, B.z) - pad, W = Math.ceil((Math.abs(A.x - B.x) + 2 * pad) / c), H = Math.ceil((Math.abs(A.z - B.z) + 2 * pad) / c);
  if (W * H > 700000) return null;
  const free = new Uint8Array(W * H).fill(1); // rasterise the obstacles' discs
  for (const f of circles) {
    const i0 = Math.max(0, Math.floor((f.x - f.r - x0) / c)), i1 = Math.min(W - 1, Math.ceil((f.x + f.r - x0) / c)), j0 = Math.max(0, Math.floor((f.z - f.r - z0) / c)), j1 = Math.min(H - 1, Math.ceil((f.z + f.r - z0) / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(x0 + i * c - f.x, z0 + j * c - f.z) < f.r) free[j * W + i] = 0;
  }
  const idx = (x, z) => Math.round((z - z0) / c) * W + Math.round((x - x0) / c), sI = idx(A.x, A.z), gI = idx(B.x, B.z);
  free[sI] = 1; free[gI] = 1;
  const g = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1); g[sI] = 0;
  let hn = 0, hk = new Float64Array(4096), hv = new Int32Array(4096); // a binary heap of (f, cell)
  const push = (f, k) => {
    if (hn === hk.length) { const a = new Float64Array(hn * 2), b = new Int32Array(hn * 2); a.set(hk); b.set(hv); hk = a; hv = b; }
    let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= f) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = f; hv[i] = k;
  };
  const pop = () => {
    const top = hv[0], f = hk[--hn], k = hv[hn]; let i = 0;
    for (;;) { const l = 2 * i + 1; if (l >= hn) break; const r = l + 1, c = r < hn && hk[r] < hk[l] ? r : l; if (hk[c] >= f) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; }
    hk[i] = f; hv[i] = k; return top;
  };
  push(0, sI);
  const hx = (k) => { const dx = Math.abs((k % W) - (gI % W)), dz = Math.abs(((k / W) | 0) - ((gI / W) | 0)); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let found = false;
  let pops = 0;
  while (hn) {
    const k = pop(); if (++pops > 120000) { astarPath.why = 'goal'; return null; }
    if (k === gI) { found = true; break; }
    const kx = k % W, kz = (k / W) | 0;
    for (const [dx, dz, w] of D8) {
      const nx = kx + dx, nz = kz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const nk = nz * W + nx; if (!free[nk]) continue;
      const ng = g[k] + w; if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(ng + 1.5 * hx(nk), nk); } // weighted: fast, near-shortest
    }
  }
  if (!found) { astarPath.why = pops < 4000 ? 'start' : 'goal'; return null; }
  let path = []; for (let k = gI; k !== -1; k = from[k]) path.push([x0 + (k % W) * c, z0 + ((k / W) | 0) * c]);
  path.reverse(); path[0] = [A.x, A.z]; path[path.length - 1] = [B.x, B.z];
  // pull the string (drop corners the path can see past), then round what is left
  const sees = (p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / (c / 2)); for (let i = 1; i < n; i++) { const u = i / n; if (blocked(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u)) return false; } return true; };
  const out = [path[0]]; let i = 0;
  while (i < path.length - 1) { let j = path.length - 1; while (j > i + 1 && !sees(path[i], path[j])) j--; out.push(path[j]); i = j; }
  return out;
}
const pathLen = (P) => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
// domino floor points along a polyline: domino k at arclength k·pitch, facing along the path
function layOnPath(P, sol) {
  const pts = []; let seg = 0, acc = 0;
  for (let k = 0; k < sol.n; k++) {
    const s = k * sol.pitch;
    while (seg < P.length - 2 && acc + Math.hypot(P[seg + 1][0] - P[seg][0], P[seg + 1][1] - P[seg][1]) < s) { acc += Math.hypot(P[seg + 1][0] - P[seg][0], P[seg + 1][1] - P[seg][1]); seg++; }
    const [ax, az] = P[seg], [bx, bz] = P[seg + 1], l = Math.hypot(bx - ax, bz - az) || 1, u = (s - acc) / l;
    pts.push({ x: ax + (bx - ax) * u, z: az + (bz - az) * u, hx: (bx - ax) / l, hz: (bz - az) / l });
  }
  return pts;
}

export function planCauses(m, spec = {}) {
  const errors = [], lines = [], helices = [], rods = [], levers = [], causes = [], sounds = [], obstacles = [];
  const R = m.ballR;
  // ---- the floor: everything standing on it, so domino lines can steer round them
  const floorThings = [], grid = new Map(), GC = 0.15, key = (i, j) => i * 100003 + j;
  const hashAdd = (f) => { const i = Math.floor(f.x / GC), j = Math.floor(f.z / GC), k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(f); };
  const nearby = (x, z) => { const i = Math.floor(x / GC), j = Math.floor(z / GC), out = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const c = grid.get(key(i + a, j + b)); if (c) out.push(...c); } return out; };
  const addFoot = (x, z, r, what) => { const f = { x, z, r, what }; floorThings.push(f); hashAdd(f); };
  for (const pd of m.pads) addFoot(pd.center.x - pd.n.x * pd.th, pd.center.z - pd.n.z * pd.th, 0.025, `the foot of pad ${pd.id}`);
  for (const c of m.cups) addFoot(c.rim.x, c.rim.z, 0.036, `the foot of cup ${c.id}`);
  for (const d of m.droppers) {
    if (d.kind === 'catapult') { // the mousetrap's base board, from its spoon back to its trigger plate
      const dirH = norm(v3(d.launch.x, 0, d.launch.z));
      for (const k of [0, -0.06, -0.12, -0.18, -0.23]) addFoot(d.p.x + dirH.x * k, d.p.z + dirH.z * k, 0.045, `catapult ${d.id}`);
    }
    else addFoot(d.p.x + d.side.x * d.off, d.p.z + d.side.z * d.off, 0.025, `dropper post ${d.id}`);
  }
  for (const r of m.rails || []) { addFoot(r.q.x, r.q.z, 0.025, `funnel post ${r.id}`); const e2 = sub(r.end, mul(r.u, 0.04)); addFoot(e2.x, e2.z, 0.025, `rail post ${r.id}`); }
  // where balls fly (any height): a strung lever must not hang its string through a flight
  const FC = 0.05, flown = new Set(), fk = (x, z) => Math.floor(x / FC) * 100003 + Math.floor(z / FC);
  for (const b of m.balls) for (const sg of b.segs) { if (sg.kind) continue; for (let u = 0; u <= sg.t1 - sg.t0; u += 0.01) { const q = { x: sg.p.x + sg.v.x * u, z: sg.p.z + sg.v.z * u }; for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) flown.add(fk(q.x + a * FC, q.z + c * FC)); } }
  for (const pd of m.pads) for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) flown.add(fk(pd.center.x + a * FC, pd.center.z + c * FC));
  // a line from A to B lasting D: try arcs, then a path round the obstacles; return the first that is clear
  let allowAstar = true, astarBudget = 0; const pocket = new Set();
  const route = (A, B, D, ignore) => {
    const d = Math.hypot(B.x - A.x, B.z - A.z); if (d < 0.03 || D < 0.2) return null;
    const blockedBy = (x, z, hh) => nearby(x, z).find((f) => !ignore(f) && Math.hypot(x - f.x, z - f.z) < f.r + hh * 0.3 + 0.002);
    const tryPath = (P) => {
      // the biggest domino this path has room for
      let hMax = 0.09;
      for (let i = 1; i < P.length; i++) { const n = Math.ceil(Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) / 0.01); for (let k = 0; k <= n; k++) { const x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * (k / n), z = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (k / n); for (const f of nearby(x, z)) if (!ignore(f)) hMax = Math.min(hMax, (Math.hypot(x - f.x, z - f.z) - f.r - 0.002) / 0.3); } }
      if (hMax < 0.035) return null;
      const sol = solveForPath(pathLen(P), D, hMax); if (!sol) return null;
      const pts = layOnPath(P, sol);
      for (const p of pts) if (blockedBy(p.x, p.z, sol.h)) return null; // feet, towers and the dominoes already laid
      return { sol, pts, path: P };
    };
    for (const m of [1, 1.12, 1.25, 1.4, 1.6]) for (const side of [1, -1]) { const r = tryPath(arcPath(A, B, m, side)); if (r) return r; if (m === 1) break; }
    if (!allowAstar || astarBudget <= 0) return null;
    const star = (P0, P1, hh = 0.036) => {
      const kS = `${P0.x.toFixed(3)},${P0.z.toFixed(3)},${hh},${lines.length}`, kG = `${P1.x.toFixed(3)},${P1.z.toFixed(3)},${hh},${lines.length}`;
      if (pocket.has(kS) || pocket.has(kG)) return null; // already known to be walled in
      if (astarBudget-- <= 0) return null;
      const bx0 = Math.min(P0.x, P1.x) - 0.5, bx1 = Math.max(P0.x, P1.x) + 0.5, bz0 = Math.min(P0.z, P1.z) - 0.5, bz1 = Math.max(P0.z, P1.z) + 0.5;
      const circles = floorThings.filter((f) => f.x > bx0 && f.x < bx1 && f.z > bz0 && f.z < bz1 && !ignore(f)).map((f) => ({ x: f.x, z: f.z, r: f.r + hh * 0.3 + 0.003 }));
      const P = astarPath(P0, P1, (x, z) => !!blockedBy(x, z, hh), circles);
      if (!P) pocket.add(astarPath.why === 'start' ? kS : kG);
      return P;
    };
    let P = star(A, B, 0.05) || star(A, B); if (!P) return null;
    const vMin = waveV(0.25, 0.035), vMax = waveV(0.85, 0.09), Lp = pathLen(P);
    if (Lp >= D * vMin * 1.02 || Lp > D * vMax) { const r = tryPath(P); if (r) return r; if (Lp > D * vMax) return null; }
    // too short for so long a delay: wind the line out round a waypoint
    const want = D * waveV(0.45, 0.045), mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, half = Lp / 2;
    const rho = Math.sqrt(Math.max(0.01, (want / 2) ** 2 - half * half));
    for (let k = 0; k < 8 && astarBudget > 1; k++) {
      const ang = Math.atan2(B.z - A.z, B.x - A.x) + Math.PI / 2 + (k % 2 ? Math.PI : 0) + Math.floor(k / 2) * 0.5 * (k % 4 < 2 ? 1 : -1);
      const W = v3(mx + Math.cos(ang) * rho, 0, mz + Math.sin(ang) * rho);
      if (nearby(W.x, W.z).some((f) => Math.hypot(W.x - f.x, W.z - f.z) < f.r + 0.04)) continue;
      const P1 = star(A, W, 0.05) || star(A, W); if (!P1) continue; const P2 = star(W, B, 0.05) || star(W, B); if (!P2) continue;
      const Pw = [...P1, ...P2.slice(1)], r = tryPath(Pw); if (r) return r;
    }
    P = null;
    return null;
  };
  // ---- the starts, in time order, and where their cause must arrive
  const starts0 = m.droppers.map((d) => {
    const ball = m.balls[d.ball];
    if (d.kind === 'catapult') { // the seesaw: pivot behind the ball, back arm further back; the last domino falls on it
      const dirH = norm(v3(d.launch.x, 0, d.launch.z)), B = sub(d.p, mul(dirH, 0.33)); // the trigger plate behind the board
      // failing a line to the plate, a lever off to the side pulls a cord along the floor to the latch
      const alts = []; for (const rr of [0.25, 0.4, 0.6]) for (let k = 0; k < 10; k++) { const a = (k / 10) * 2 * Math.PI; alts.push(v3(B.x + Math.cos(a) * rr, 0, B.z + Math.sin(a) * rr)); }
      return { d, t: d.t, kind: 'catapult', B: v3(B.x, 0, B.z), B0: v3(B.x, 0, B.z), alts, dirH, lane: d.lane, ball };
    }
    const post = add(d.p, mul(d.side, d.off)), lev = add(post, mul(d.side, 0.05));
    // a lever at the foot of the post pulls a string up it; failing that, a lever further off pulls a string over a pulley
    const alts = [];
    for (const rr of [0.3, 0.5, 0.75]) for (let k = 0; k < 10; k++) { const a = (k / 10) * 2 * Math.PI, x = post.x + Math.cos(a) * rr, z = post.z + Math.sin(a) * rr; if (!flown.has(fk(x, z))) alts.push(v3(x, 0, z)); }
    return { d, t: d.t, kind: 'drop', B: v3(lev.x, 0, lev.z), B0: v3(lev.x, 0, lev.z), alts, post, lane: d.lane, ball };
  });
  const starts = starts0.sort((a, b) => a.t - b.t);
  // ---- the events that can cause them
  const usedPad = new Set(), usedCup = new Set();
  const strikeAt = (pd) => { const ext = (pd.shape === 'bar' ? pd.L / 2 : pd.R) + 0.006, e = add(pd.center, mul(pd.long, ext)); return { top: e, A: v3(e.x + pd.across.x * 0.02, 0, e.z + pd.across.z * 0.02) }; };
  const tryStrike = (S, pd) => {
    if (usedPad.has(pd.id) || pd.t > S.t - 0.25) return null;
    const { top, A } = strikeAt(pd), D = S.t - TERM[S.kind] - (pd.t + 0.03);
    const r = route(A, S.B, D, (f) => f.what === `the foot of pad ${pd.id}` || Math.hypot(f.x - S.B.x, f.z - S.B.z) < 0.07);
    return r ? { kind: 'strike', pd, top, A, ...r, t0: pd.t + 0.03 } : null;
  };
  const tryRelay = (S, cup) => {
    if (usedCup.has(cup.id) || cup.t > S.t - 0.6 || cup.t < S.t - 9) return null;
    const ball = m.balls[cup.ball], dir = norm(sub(cup.rim, ball.segs[ball.segs.length - 1].p)), side = norm(v3(-dir.z, 0, dir.x));
    for (const [sgn, rh] of [[1, 0.045], [-1, 0.045], [1, 0.07], [-1, 0.07], [1, 0.095], [-1, 0.095]]) {
      const pole = add(cup.rim, mul(side, (rh + 0.075) * sgn)), H = cup.rim.y - 0.075;
      if (H < 0.12) return null;
      const tooClose = nearby(pole.x, pole.z).find((f) => Math.hypot(f.x - pole.x, f.z - pole.z) < f.r + rh + 0.02 && f.what !== `the foot of cup ${cup.id}`);
      if (tooClose) continue;
      const tTop = cup.t + 0.2, k14 = Math.sqrt(14 / (5 * G * H)), Tmin = H * 1.05 * k14, nMax = H / 0.036;
      const Tmax = Math.hypot(2 * Math.PI * rh * nMax, H) * k14;
      const total = S.t - TERM[S.kind] - tTop - 0.06; // helix + floor roll (0.06) + dominoes
      const a0 = Math.atan2(cup.rim.z - pole.z, cup.rim.x - pole.x), dirSign = sgn; // the helix starts facing the cup
      const dGuess = Math.hypot(S.B.x - pole.x, S.B.z - pole.z);
      // give the dominoes what they need for the distance at a comfortable speed, the helix the rest
      for (const frac of [0.8, 1, 0.65, 1.25, 0.5, 1.5, 2]) {
        const Ddom = Math.max(0.25, (dGuess / waveV(0.5, 0.05)) * frac), Th = total - Ddom;
        if (Th < Tmin || Th > Tmax) continue;
        const Lh = Th / k14, turns = Math.sqrt(Math.max(0, Lh * Lh - H * H)) / (2 * Math.PI * rh);
        const aEnd = a0 + dirSign * 2 * Math.PI * turns, pEnd = v3(pole.x + Math.cos(aEnd) * rh, 0, pole.z + Math.sin(aEnd) * rh);
        const exitDir = v3(-Math.sin(aEnd) * dirSign, 0, Math.cos(aEnd) * dirSign), A = add(pEnd, mul(exitDir, 0.07));
        const r = route(A, S.B, Ddom, (f) => Math.hypot(f.x - S.B.x, f.z - S.B.z) < 0.07);
        if (r) return { kind: 'relay', cup, ball, pole, rh, H, turns, Lh, Th, tTop, A, a0, exitDir, ...r, t0: tTop + Th + 0.06, sgn };
      }
    }
    return null;
  };
  // ---- assign causes, latest first-come: prefer the previous run's cup in the same lane (a baton), then a strike in
  // another lane (lanes interlock), then any cup, then a strike in the same lane, then the starter
  const firstEvent = Math.min(...m.pads.map((p) => p.t));
  const orphans = starts.filter((S) => S.t < firstEvent + 0.35), late = [];
  // ---- the starter: a pendulum swings onto a plate that knocks a fan of lines, one per orphan start
  let starter = null;
  if (orphans.length) {
    // default: a low hammer among the first starts (the orphans' centroid), moved to the nearest clear patch of floor
    const c0 = spec.starter?.at ? v3(spec.starter.at[0], 0, spec.starter.at[1]) : (() => {
      const o = mul(orphans.reduce((s, o) => add(s, o.B), v3()), 1 / orphans.length);
      for (let rr = 0; rr < 2.5; rr += 0.03) for (let k = 0; k < Math.max(1, Math.round(rr * 40)); k++) {
        const a = (k / Math.max(1, Math.round(rr * 40))) * 2 * Math.PI, x = o.x + Math.cos(a) * rr, z = o.z + Math.sin(a) * rr;
        if (!nearby(x, z).some((f) => Math.hypot(x - f.x, z - f.z) < f.r + 0.16) && !m.pads.some((p) => Math.hypot(p.center.x - x, p.center.z - z) < 0.2 && p.center.y < 0.55)) return v3(x, 0, z);
      }
      return o;
    })();
    // the plate's moment: inside every first line's window [t − L/v_min, t − L/v_max], measured on straight distance × 1.3
    const win = orphans.map((S) => { const Lg = 1.3 * Math.hypot(S.B.x - c0.x, S.B.z - c0.z) + 0.1; return [S.t - TERM[S.kind] - Lg / waveV(0.25, 0.035), S.t - TERM[S.kind] - Lg / waveV(0.85, 0.09)]; });
    const lo = Math.max(0.5, ...win.map((w) => w[0])), hi = Math.min(...win.map((w) => w[1]));
    const tPlate = spec.starter?.t ?? Math.max(0.5, lo <= hi ? lo + (hi - lo) * 0.35 : hi - 0.1);
    const l = spec.starter?.length ?? 0.14, quarter = (Math.PI / 2) * Math.sqrt(l / G) * 1.05;
    starter = { at: c0, l, tPlate, tRelease: Math.max(0.15, tPlate - quarter), quarter: Math.min(quarter, tPlate - 0.15), theta0: 50 };
    if (tPlate - quarter < 0.15) errors.push(`starter: the first start comes too early (${orphans[0].t.toFixed(2)} s) — lengthen the intro`);
    obstacles.push({ id: 'the starter', x: c0.x, z: c0.z, y1: l + 0.08, r: 0.12 });
    addFoot(c0.x, c0.z, 0.08, 'the starter plate');
    for (const S of orphans) {
      const dir = norm(v3(S.B.x - c0.x, 0, S.B.z - c0.z)), A = v3(c0.x + dir.x * 0.08, 0, c0.z + dir.z * 0.08);
      astarBudget = 12;
      const D = S.t - TERM[S.kind] - tPlate, r = route(A, S.B, D, (f) => f.what === 'the starter plate' || Math.hypot(f.x - S.B.x, f.z - S.B.z) < 0.07);
      const rb = r ? null : tryBranch(S);
      if (r) emit(S, { kind: 'starter', A, ...r, t0: tPlate });
      else if (rb) emit(S, rb);
      else errors.push(`no cause for the ${S.kind === 'drop' ? 'dropper' : 'seesaw'} of ball ${S.d.ball} (${S.lane}) at ${S.t.toFixed(2)} s: no strike, cup or starter line fits — move the starter (spec.starter.at) or the lane`);
    }
  }
  for (const S of starts) {
    if (orphans.includes(S)) continue;
    const sameCups = m.cups.filter((c) => c.lane === S.lane && c.t < S.t).sort((a, b) => b.t - a.t);
    const near = (p) => Math.hypot(p.center.x - S.B.x, p.center.z - S.B.z) < 2.2;
    const otherPads = m.pads.filter((p) => p.lane !== S.lane && p.t < S.t - 0.3 && p.t > S.t - 4 && near(p)).sort((a, b) => b.t - a.t);
    const anyCups = m.cups.filter((c) => c.t < S.t).sort((a, b) => Math.hypot(a.rim.x - S.B.x, a.rim.z - S.B.z) - Math.hypot(b.rim.x - S.B.x, b.rim.z - S.B.z));
    const samePads = m.pads.filter((p) => p.lane === S.lane && p.t < S.t - 0.3 && p.t > S.t - 3.5 && near(p)).sort((a, b) => b.t - a.t);
    let c = null; astarBudget = 9;
    if (sameCups[0]) c = tryRelay(S, sameCups[0]);
    const quick = otherPads.filter((p) => S.t - p.t < 1.7), slow = otherPads.filter((p) => S.t - p.t >= 1.7);
    quick.slice(0, 30).forEach((pd, k) => { if (c) return; allowAstar = k < 6; c = tryStrike(S, pd); }); allowAstar = true;
    for (const cp of anyCups.slice(0, 10)) { if (c) break; c = tryRelay(S, cp); } // a helix soaks up a long wait
    slow.slice(0, 20).forEach((pd, k) => { if (c) return; allowAstar = k < 3; c = tryStrike(S, pd); }); allowAstar = true;
    samePads.slice(0, 25).forEach((pd, k) => { if (c) return; allowAstar = k < 6; c = tryStrike(S, pd); }); allowAstar = true;
    if (!c) c = tryBranch(S);
    if (!c && S.alts) for (const B of S.alts.slice(0, 16)) { // a lever further off, with a string over a pulley
      if (nearby(B.x, B.z).some((f) => Math.hypot(B.x - f.x, B.z - f.z) < f.r + 0.04)) continue;
      S.B = B; astarBudget = 3;
      for (const pd of [...otherPads, ...samePads].slice(0, 8)) { if (c) break; c = tryStrike(S, pd); }
      if (!c) for (const cp of anyCups.slice(0, 4)) { if (c) break; c = tryRelay(S, cp); }
      if (!c) c = tryBranch(S);
      if (c) { S.strung = true; break; }
    }
    if (!c && S.B0) S.B = S.B0;
    if (!c) { // a harder search before giving up: more paths round the obstacles
      astarBudget = 24;
      for (const pd of [...otherPads, ...samePads].slice(0, 40)) { if (c) break; c = tryStrike(S, pd); }
      if (!c) c = tryBranch(S, true);
    }
    if (!c) { late.push(S); continue; }
    emit(S, c);
  }
  for (const S of late) errors.push(`no cause for the ${S.kind === 'drop' ? 'dropper' : 'catapult'} of ball ${S.d.ball} (${S.lane}) at ${S.t.toFixed(2)} s: no strike or cup earlier fits a domino line — move the lane, or give it more room on the floor`);
  // a branch off a domino line already laid: a domino on its way knocks a side line (a Y in the floor)
  function tryBranch(S, wide = false) {
    {
      const vN = waveV(0.45, 0.045), cands = [];
      for (const L of lines) for (let k = 2; k < L.n - 2; k += wide ? 1 : 3) {
        const p = L.pts[k], tE = L.t0 + (k + 0.8) * L.tau, D = S.t - TERM[S.kind] - tE; if (D < 0.3) continue;
        const side = Math.sign((S.B.x - p.x) * -p.hz + (S.B.z - p.z) * p.hx) || 1, A = v3(p.x - p.hz * side * (L.h * 0.55 + 0.022), 0, p.z + p.hx * side * (L.h * 0.55 + 0.022));
        const d = Math.hypot(S.B.x - A.x, S.B.z - A.z); if (d > D * waveV(0.85, 0.09)) continue;
        cands.push({ L, k, A, tE, D, score: Math.abs(D * vN - d * 1.25) });
      }
      cands.sort((a, b) => a.score - b.score);
      astarBudget = Math.max(astarBudget, 8);
      for (const cd of cands.slice(0, wide ? 30 : 10)) {
        const r = route(cd.A, S.B, cd.D, (f) => f.what === `domino line ${cd.L.id}` && Math.hypot(f.x - cd.A.x, f.z - cd.A.z) < 0.06 || Math.hypot(f.x - S.B.x, f.z - S.B.z) < 0.07);
        if (r) return { kind: 'branch', parent: cd.L.id, at: cd.k, A: cd.A, ...r, t0: cd.tE };
      }
    }
    return null;
  }
  function emit(S, c) {
    const L = { id: lines.length, h: c.sol.h, r: c.sol.r, pitch: c.sol.pitch, n: c.sol.n, tau: c.sol.tau, pts: c.pts, t0: c.t0, start: S.d.id, cause: c.kind, lane: S.lane, parent: c.parent, parentAt: c.at };
    L.tEnd = L.t0 + (L.n + 0.6) * L.tau;
    lines.push(L);
    for (const p of c.pts) addFoot(p.x, p.z, L.h * 0.3 + 0.006, `domino line ${L.id}`);
    for (let k = 1; k < L.n; k++) sounds.push({ t: L.t0 + k * L.tau, kind: 'tick', vel: 0.35 + 0.25 * (L.h / 0.08) });
    sounds.push({ t: L.tEnd, kind: 'catch', vel: 0.45 });
    if (c.kind === 'strike') {
      usedPad.add(c.pd.id);
      rods.push({ pad: c.pd.id, top: c.top, A: c.A, t: c.pd.t, line: L.id });
      obstacles.push({ id: `push rod of pad ${c.pd.id}`, pad: c.pd.id, x: c.top.x, z: c.top.z, y1: c.top.y - 0.004, r: 0.003 });
    }
    if (c.kind === 'relay') {
      usedCup.add(c.cup.id);
      const hx = { id: helices.length, cup: c.cup.id, ball: c.ball.id, pole: c.pole, rh: c.rh, H: c.H, turns: c.turns, Lh: c.Lh, T: c.Th, tTop: c.tTop, A: c.A, a0: c.a0, exitDir: c.exitDir, line: L.id, sgn: c.sgn };
      helices.push(hx); addFoot(c.pole.x, c.pole.z, c.rh + 0.03, `helix ${hx.id}`);
      obstacles.push({ id: `helix tower ${hx.id}`, ball: c.ball.id, x: c.pole.x, z: c.pole.z, y1: c.H + 0.06, r: c.rh + 0.02 });
      c.ball.tailAt = helixTail(c.cup, hx, R, L);
      c.ball.relay = hx.id;
    }
    if (S.kind === 'catapult' && S.strung) { levers.push({ start: S.d.id, x: S.B.x, z: S.B.z, t: L.tEnd, cord: S.B0 }); addFoot(S.B.x, S.B.z, 0.03, `cord lever ${S.d.id}`); }
    if (S.kind === 'drop') {
      const lv = { start: S.d.id, x: S.B.x, z: S.B.z, post: S.post, t: L.tEnd, top: S.d.p, strung: !!S.strung };
      if (S.strung) { // string: up from the lever to a pulley, across to one above the post, down the post
        lv.yTop = S.d.p.y + 0.14;
        obstacles.push({ id: `the string of ball ${S.d.ball}'s lever`, x: S.B.x, z: S.B.z, y1: lv.yTop, r: 0.002 });
        (m.obstacleSegs ||= []).push({ id: `the overhead string of ball ${S.d.ball}`, a: v3(S.B.x, lv.yTop, S.B.z), b: v3(S.post.x, lv.yTop, S.post.z), r: 0.003, ball: S.d.ball });
        addFoot(S.B.x, S.B.z, 0.03, `strung lever ${S.d.id}`);
      }
      levers.push(lv);
    }
    causes.push({ start: S.d.id, ball: S.d.ball, lane: S.lane, t: S.t, kind: c.kind, line: L.id, from: c.kind === 'strike' ? `pad ${c.pd.id} (${c.pd.lane} ${midiName(c.pd.midi)} @ ${c.pd.t.toFixed(2)} s)` : c.kind === 'relay' ? `cup ${c.cup.id} (${c.cup.lane} @ ${c.cup.t.toFixed(2)} s)` : c.kind === 'branch' ? `domino line ${c.parent}, domino ${c.at} @ ${c.t0.toFixed(2)} s` : `the starter @ ${c.t0.toFixed(2)} s`, arrives: L.tEnd + TERM[S.kind] });
  }
  m.mech = { lines, helices, rods, levers, starter, causes, sounds };
  m.obstacles = obstacles;
  m.errors.push(...errors);
  return m.mech;
}

// the relay ball's journey after its cup: tipped out, down the helix, across the floor into the first domino, resting
function helixTail(cup, hx, R, L) {
  const a = (5 / 7) * G * (hx.H / hx.Lh), yTop = cup.rim.y - 0.075 + R;
  const P = (u) => { // u = 0..1 down the helix, starting on the side facing the cup
    const ang = hx.a0 + hx.sgn * 2 * Math.PI * hx.turns * u;
    return v3(hx.pole.x + Math.cos(ang) * hx.rh, yTop - hx.H * u, hx.pole.z + Math.sin(ang) * hx.rh);
  };
  const p0 = P(0), pEnd = P(1), ex = hx.exitDir, stop = v3(hx.A.x - ex.x * 0.012, R, hx.A.z - ex.z * 0.012);
  const inCup = add(cup.rim, v3(0, -cup.depth + R + 0.004, 0));
  return (t) => {
    const tTip = cup.t + 0.12;
    if (t < tTip) return null; // still in the cup
    if (t < hx.tTop) { const k = (t - tTip) / (hx.tTop - tTip); return { p: add(mul(inCup, 1 - k), mul(p0, k)), state: 'tipping' }; }
    const u = t - hx.tTop;
    if (u < hx.T) return { p: P((0.5 * a * u * u) / hx.Lh), state: 'helix' };
    const w = (u - hx.T) / 0.06;
    if (w < 1) return { p: add(mul(v3(pEnd.x, R, pEnd.z), 1 - w), mul(stop, w)), state: 'floor' };
    return { p: stop, state: 'spent' };
  };
}

// domino k's tilt at time t (radians, 0 = upright): pushed at t0 + kτ, it falls with gravity (a quarter-sine ease that
// matches the pivoting fall), meets the next at its contact angle at t0 + (k+1)τ, then lies on it as the wave runs on
export function dominoAngle(L, k, t) {
  const tk = L.t0 + k * L.tau; if (t <= tk) return 0;
  const thc = Math.asin(Math.min(0.95, L.r)), last = k === L.n - 1;
  const u = (t - tk) / L.tau;
  if (u < 1) return thc * u * u * (1.6 - 0.6 * u); // accelerating fall to contact
  const rest = last ? Math.PI / 2 - 0.05 : Math.min(1.35, thc + 0.9);
  return thc + (rest - thc) * Math.min(1, (u - 1) / (last ? 0.6 : 1.4)) ** 0.7;
}
