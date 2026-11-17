// pencil-live-action · gait.js — feet that step: footholds first, the body follows (a pure function of t).
//
// A drawn hero walking on a real surface must not skate: every move is a list of FOOTHOLDS (where and when each foot
// is put down). Between holds a foot swings (lifted, eased); while held it does not move at all. The hips ride on the
// legs: their height comes from how far apart the feet are (a compass gait — lowest in double support), so the bob is a
// consequence of the steps, not a sine added on top. check.mjs measures planted feet frame to frame.
//
//   const g = gait({ start: { L: [x, y, z], R: [x, y, z] }, legLen: .37 * H, ankle: .025 * H, face0 })   (H = the hero's height, m)
//   g.walk({ to: [x, z] | path: [[x, z]…], t0, speed: .05 (m/s), stride: .45 × legLen, y: (x, z) => surface y })
//   g.step('L', [x, y, z], t0, dur)      one explicit step (stairs, a ladder rung, a turn on the spot)
//   g.hop(t0, dur, height, to?)          both feet leave and land together (a jump, a landing)
//   g.at(t) → { L, R (ankle-ground points, world), planted: { L, R }, root: [x, y, z] (between the feet), face (deg), hipY (world),
//               lift: { L, R } (0…1 of the swing) }
// face: world yaw in degrees, 0 = toward +z, 90 = toward +x (film.js turns it into the drawing's yaw against the camera).
const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const sm = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const L3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const yawOf = (dx, dz) => Math.atan2(dx, dz) * 180 / Math.PI;
const angLerp = (a, b, k) => { let d = ((b - a + 540) % 360) - 180; return a + d * k; };

export function gait(o) {
  const legLen = o.legLen, ank = o.ankle ?? 0, ev = { L: [], R: [] }, faces = [{ t: -1e9, face: o.face0 ?? 0, dur: 0 }], hops = [];
  const pos0 = { L: o.start.L.slice(), R: o.start.R.slice() };
  const last = s => ev[s].length ? ev[s][ev[s].length - 1].to : pos0[s];
  const lastT = () => Math.max(...['L', 'R'].map(s => ev[s].length ? ev[s][ev[s].length - 1].t1 : -1e9));
  const G = {
    legLen, events: ev,
    /** one step: foot s lifts at t0 and lands at `to` after dur (lift = swing height, m) */
    step(s, to, t0, dur = .32, lift = legLen * .14) { ev[s].push({ t0, t1: t0 + dur, from: last(s), to: to.slice(), lift }); return G; },
    /** turn the body to `face` over [t0, t0 + dur] (the feet step on their own with turnInPlace) */
    face(face, t0, dur = .3) { faces.push({ t: t0, face, dur }); faces.sort((a, b) => a.t - b.t); return G; },
    /** a turn on the spot: two small steps that re-plant both feet around the root, facing `face` */
    turnInPlace(face, t0, dur = .7, width = legLen * .32) {
      const a = G.at(t0), mid = [(a.L[0] + a.R[0]) / 2, (a.L[1] + a.R[1]) / 2, (a.L[2] + a.R[2]) / 2], r = face * Math.PI / 180, side = [Math.cos(r), 0, -Math.sin(r)];
      const pl = [mid[0] + side[0] * width / 2, mid[1], mid[2] + side[2] * width / 2], pr = [mid[0] - side[0] * width / 2, mid[1], mid[2] - side[2] * width / 2];   // facing +z, the left foot is at +x
      // the foot on the side we turn toward goes first
      const cur = G.at(t0).face, first = ((face - cur + 540) % 360) - 180 > 0 ? 'R' : 'L', second = first === 'R' ? 'L' : 'R';
      G.step(first, first === 'L' ? pl : pr, t0, dur * .5, legLen * .08); G.step(second, second === 'L' ? pl : pr, t0 + dur * .45, dur * .5, legLen * .08); G.face(face, t0, dur);
      return G;
    },
    /** walk along a path (xz points) — footholds every half stride, alternating, the trailing foot closing up at the end */
    walk(w) {
      const yAt = w.y || ((x, z) => last('L')[1]), stride = w.stride ?? legLen * .9, h = stride / 2, speed = w.speed ?? legLen * 1.1, width = w.width ?? legLen * .3;
      const a = last('L'), b = last('R'), st = [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2], pts = [st, ...(w.path || [w.to])];
      const seg = []; let Ltot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); Ltot += d; }
      const P = s => { let i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; } const k = seg[i] ? clamp(s / seg[i]) : 1, A = pts[i], B = pts[i + 1]; return { p: [lerp(A[0], B[0], k), lerp(A[1], B[1], k)], d: [B[0] - A[0], B[1] - A[1]] }; };
      const n = Math.max(2, Math.ceil(Ltot / h)), dt = (Ltot / n) / speed, swing = dt * .86;   // a walk: one foot is always down
      let first = w.lead || 'R', t = w.t0 ?? lastT();
      for (let k = 1; k <= n; k++) {
        const s = k === n ? Ltot : k * Ltot / n, q = P(s), dl = Math.hypot(q.d[0], q.d[1]) || 1, nx = q.d[1] / dl, nz = -q.d[0] / dl;
        const foot = k % 2 ? first : (first === 'R' ? 'L' : 'R'), sg = foot === 'R' ? -1 : 1;   // the right foot is on the right of the walking direction
        const to = [q.p[0] + nx * sg * width / 2, 0, q.p[1] + nz * sg * width / 2]; to[1] = yAt(to[0], to[2]);
        G.step(foot, to, t, swing, w.lift ?? legLen * .16); t += dt;
        if (k === 1) G.face(yawOf(q.d[0], q.d[1]), w.t0 ?? t - dt, dt * 1.2);
      }
      // the trailing foot closes up beside the last one
      const q = P(Ltot), dl = Math.hypot(q.d[0], q.d[1]) || 1, nx = q.d[1] / dl, nz = -q.d[0] / dl, lastFoot = n % 2 ? first : (first === 'R' ? 'L' : 'R'), other = lastFoot === 'R' ? 'L' : 'R', sg = other === 'R' ? -1 : 1;
      const to = [q.p[0] + nx * sg * width / 2, 0, q.p[1] + nz * sg * width / 2]; to[1] = yAt(to[0], to[2]);
      G.step(other, to, t, swing * .8, legLen * .1); G.lastEnd = t + swing * .8;
      return G;
    },
    /** both feet leave together and land at `to` (offset, m) — a hop; `height` of the arc above the take-off */
    hop(t0, dur, height, to = [0, 0, 0]) {
      for (const s of ['L', 'R']) { const f = last(s); ev[s].push({ t0, t1: t0 + dur, from: f, to: [f[0] + to[0], f[1] + to[1], f[2] + to[2]], lift: height, hop: true }); }
      hops.push({ t0, t1: t0 + dur }); return G;
    },
    at(t) {
      const out = { planted: {}, lift: {} };
      for (const s of ['L', 'R']) {
        let p = pos0[s], pl = true, lf = 0;
        for (const e of ev[s]) {
          if (t >= e.t1) { p = e.to; continue; }
          if (t > e.t0) { const k = (t - e.t0) / (e.t1 - e.t0), ke = e.hop ? k : sm(k); p = L3(e.from, e.to, ke); p = [p[0], p[1] + Math.sin(Math.PI * k) * e.lift * (e.hop ? 1 : 1), p[2]]; pl = false; lf = Math.sin(Math.PI * k); }
          break;
        }
        out[s] = p; out.planted[s] = pl; out.lift[s] = lf;
      }
      out.root = [(out.L[0] + out.R[0]) / 2, Math.min(out.L[1], out.R[1]), (out.L[2] + out.R[2]) / 2];
      let f = faces[0].face; for (const e of faces) { if (t >= e.t + e.dur) f = e.face; else if (t > e.t) { f = angLerp(f, e.face, sm((t - e.t) / e.dur)); break; } else break; }
      out.face = f;
      // compass gait: the hip rides on the legs — lowest when the feet are far apart, highest as the swing foot passes
      const spread = Math.hypot(out.L[0] - out.R[0], out.L[2] - out.R[2]), down = ['L', 'R'].filter(s => out.planted[s]);
      const base = down.length ? down.reduce((a, s) => a + out[s][1], 0) / down.length : Math.min(out.L[1], out.R[1]);
      out.hipY = base + ank + Math.sqrt(Math.max(0, legLen * legLen * .992 - (spread / 2) ** 2));
      out.airborne = hops.some(h => t > h.t0 && t < h.t1);
      return out;
    },
  };
  return G;
}
