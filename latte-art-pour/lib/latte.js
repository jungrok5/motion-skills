// latte-art-pour · latte.js — the cup surface as a 2D fluid: microfoam (white) on crema (brown), moved by the pour.
// Pure ES module (no DOM, no Math.random): the same pour track gives the same surface on every run and in Node.
//
// The surface is the unit disc (radius 1 = the liquid's edge). Each step the velocity is written in closed form from
// what is touching the surface — no pressure solve:
//   source  milk landing at the pour point spreads out like a 2D source, S·d/(|d|²+ε²); strong when the pitcher is low
//           (the foam rides up and pushes the surface), weak when high (the milk dives under the crema)
//   jet     the stream's momentum carries the surface forward along the pour direction, just ahead of the point
//   drag    a moving stream (or the etching pin) pulls the surface along its path — the draw-through that turns a
//           rosetta's leaves into a stem, a stack into a tulip
//   wall    the rim takes no outflow: what is pushed outward slides along the wall and piles into thin bands
// Then two fields are carried by that velocity with MacCormack advection (sharp, clamped, so the foam keeps its edges):
//   foam  0 … 1, microfoam on the surface (drawn white above ~.5)
//   tone  0 … 1, the crema's marbling (darker / lighter brown streaks), lightened where a high pour mixes milk in
// and foam is deposited where the low stream lands.

export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// tiny seeded value noise (deterministic)
export function hash2(x, y, s = 1) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function vnoise(x, y, s = 1) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y, s = 1, o = 4) => { let t = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, s + i * 17); f *= 2; a *= .5; } return t / (1 - Math.pow(.5, o)); };

// The physical constants (tuned against the source clips; see references/PHYSICS.md before changing them).
export const PHYS = {
  source: .070,     // area rate of a full low pour (unit-disc units² / s / 2π)
  highSource: .012, // a high pour still nudges the surface
  eps: .030,        // source core (keeps the speed finite at the point)
  forward: .95,     // how much of the outflow goes ahead rather than back (0 = round, 1 = none goes back)
  jet: 1.0,         // forward push of the stream (units / s at full flow)
  jetOff: .045, jetR: .060,
  drag: .95, dragR: .045,       // how much a moving low stream pulls the surface, and how wide
  cutDrag: 1.3, cutR: .050,     // a high, fast stream: the thin draw-through
  etch: 1.0, etchR: .016,       // the pin
  wall0: .80,                   // outflow starts to be refused from this radius
  deposit: .030, depositQ: .030,// radius of fresh foam where it surfaces: deposit + depositQ·flow
  srcAhead: 0,                  // where the surface flow springs from, ahead of the stream
  ahead: 0,                  // the foam surfaces this far ahead of the stream (along the pour direction)
  lingerV: .80, rushV: 1.8,     // stream speed (units/s) below which it brings up foam, above which brown
  cutBrown: 1,                  // how brown a rushing stream is (0 = always foam)
  punch: .14,                   // radius of that hole at full flow (∝ flow²: a gentle high cut stays thin)
  emitRate: 60,                 // how fast the core takes the emitted colour (1/s)
  mix: .35,                     // how fast a high pour lightens the crema around it
};

export class Surface {
  constructor({ n = 320, seed = 7, phys = {} } = {}) {
    this.n = n; this.seed = seed; this.P = { ...PHYS, ...phys };
    const N = n * n;
    this.foam = new Float32Array(N); this.tone = new Float32Array(N);
    this.a = new Float32Array(N); this.b = new Float32Array(N); this.c = new Float32Array(N);
    this.U = new Float32Array(N); this.V = new Float32Array(N);
    this.inside = new Uint8Array(N);
    this.h = 2 / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -1 + (i + .5) * this.h, y = -1 + (j + .5) * this.h, k = j * n + i;
      this.inside[k] = x * x + y * y < 1.0 ? 1 : 0;
      // crema marbling: soft blotches + finer tiger flecks
      this.tone[k] = .55 * fbm(x * 2.2 + 3, y * 2.2 - 1, seed, 4) + .45 * fbm(x * 7 + 11, y * 7, seed + 5, 3);
    }
    this.t = 0; this.steps = 0;
  }
  snapshot() { return { foam: this.foam.slice(), tone: this.tone.slice(), t: this.t, steps: this.steps }; }
  restore(s) { this.foam.set(s.foam); this.tone.set(s.tone); this.t = s.t; this.steps = s.steps; }

  // pour: { x, y, q (0…1 flow), h (0 low … 1 high), dx, dy (unit pour direction), vx, vy (point velocity) }
  // pin:  { x, y, vx, vy, on } (etching) — either may be null
  velocity(pour, pin) {
    const { n, h, U, V, P } = this;
    const low = pour ? 1 - smooth(.22, .58, pour.h) : 0, q = pour ? pour.q : 0;
    const S = q * (P.source * low + P.highSource * (1 - low)), e2 = P.eps * P.eps, fw = P.forward;
    const J = q * P.jet * (.35 + .65 * low), jr2 = P.jetR * P.jetR;
    const sp = pour ? Math.hypot(pour.vx, pour.vy) : 0;
    const D = q > .02 ? (low * P.drag + (1 - low) * P.cutDrag * smooth(.05, .5, sp)) : 0;
    const dr = low * P.dragR + (1 - low) * P.cutR, dr2 = dr * dr;
    const pinOn = pin && pin.on, er2 = P.etchR * P.etchR;
    for (let j = 0; j < n; j++) {
      const y = -1 + (j + .5) * h;
      for (let i = 0; i < n; i++) {
        const k = j * n + i; if (!this.inside[k]) { U[k] = V[k] = 0; continue; }
        const x = -1 + (i + .5) * h;
        let u = 0, v = 0;
        if (q > 0) {
          const dx = x - pour.x, dy = y - pour.y, r2 = dx * dx + dy * dy;
          const sx = dx - pour.dx * P.srcAhead, sy = dy - pour.dy * P.srcAhead, s2 = sx * sx + sy * sy;
          // the stream's momentum biases the outflow forward: more surface goes the way it pours than back
          const cs = (sx * pour.dx + sy * pour.dy) / Math.sqrt(s2 + 1e-9), w = S * (1 + fw * cs) / (s2 + e2);
          u += sx * w; v += sy * w;
          const jx = dx - pour.dx * P.jetOff, jy = dy - pour.dy * P.jetOff, g = J * Math.exp(-(jx * jx + jy * jy) / jr2);
          u += pour.dx * g; v += pour.dy * g;
          if (D) { const gd = D * Math.exp(-r2 / dr2); u += pour.vx * gd; v += pour.vy * gd; }
        }
        if (pinOn) { const dx = x - pin.x, dy = y - pin.y, gd = P.etch * Math.exp(-(dx * dx + dy * dy) / er2); u += pin.vx * gd; v += pin.vy * gd; }
        // the wall refuses outflow: slide along it
        const r = Math.sqrt(x * x + y * y);
        if (r > P.wall0) { const nx = x / r, ny = y / r, vn = u * nx + v * ny; if (vn > 0) { const s = smooth(P.wall0, .995, r); u -= nx * vn * s; v -= ny * vn * s; } }
        U[k] = u; V[k] = v;
      }
    }
  }
  // bilinear sample of field F at domain point (x, y); records the 4 neighbours' min/max in this._mn/_mx
  sample(F, x, y) {
    const n = this.n, gx = (x + 1) / this.h - .5, gy = (y + 1) / this.h - .5;
    let i = Math.floor(gx), j = Math.floor(gy); const fx = gx - i, fy = gy - j;
    if (i < 0) i = 0; if (j < 0) j = 0; if (i > n - 2) i = n - 2; if (j > n - 2) j = n - 2;
    const k = j * n + i, a = F[k], b = F[k + 1], c = F[k + n], d = F[k + n + 1];
    this._mn = Math.min(a, b, c, d); this._mx = Math.max(a, b, c, d);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  // MacCormack advection of foam (sharp, clamped) and plain semi-Lagrangian of tone, sharing one trace per cell.
  advect(dt) {
    const { n, h, U, V, foam, tone, inside } = this, A = this.a, B = this.b, T = this.c, inv = 1 / h, n2 = n - 2;
    const MN = this.mn || (this.mn = new Float32Array(n * n)), MX = this.mx || (this.mx = new Float32Array(n * n));
    for (let j = 0; j < n; j++) {
      const y = -1 + (j + .5) * h;
      for (let i = 0; i < n; i++) {
        const k = j * n + i; if (!inside[k]) { A[k] = foam[k]; T[k] = tone[k]; continue; }
        const x = -1 + (i + .5) * h;
        // backward trace (Euler on the cell's velocity; substeps keep it short)
        let gx = (x - dt * U[k] + 1) * inv - .5, gy = (y - dt * V[k] + 1) * inv - .5;
        let i0 = gx | 0, j0 = gy | 0; if (gx < 0) i0 = 0; if (gy < 0) j0 = 0; if (i0 > n2) i0 = n2; if (j0 > n2) j0 = n2;
        let fx = gx - i0, fy = gy - j0; fx = fx < 0 ? 0 : fx > 1 ? 1 : fx; fy = fy < 0 ? 0 : fy > 1 ? 1 : fy;
        const q = j0 * n + i0, a = foam[q], b = foam[q + 1], c = foam[q + n], d = foam[q + n + 1];
        A[k] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
        let mn = a, mx = a; if (b < mn) mn = b; else if (b > mx) mx = b; if (c < mn) mn = c; else if (c > mx) mx = c; if (d < mn) mn = d; else if (d > mx) mx = d;
        MN[k] = mn; MX[k] = mx;
        const ta = tone[q], tb = tone[q + 1], tc = tone[q + n], td = tone[q + n + 1];
        T[k] = ta + (tb - ta) * fx + (tc - ta) * fy + (ta - tb - tc + td) * fx * fy;
      }
    }
    for (let j = 0; j < n; j++) {
      const y = -1 + (j + .5) * h;
      for (let i = 0; i < n; i++) {
        const k = j * n + i; if (!inside[k]) { B[k] = A[k]; continue; }
        const x = -1 + (i + .5) * h;
        let gx = (x + dt * U[k] + 1) * inv - .5, gy = (y + dt * V[k] + 1) * inv - .5;
        let i0 = gx | 0, j0 = gy | 0; if (gx < 0) i0 = 0; if (gy < 0) j0 = 0; if (i0 > n2) i0 = n2; if (j0 > n2) j0 = n2;
        let fx = gx - i0, fy = gy - j0; fx = fx < 0 ? 0 : fx > 1 ? 1 : fx; fy = fy < 0 ? 0 : fy > 1 ? 1 : fy;
        const q = j0 * n + i0, a = A[q], b = A[q + 1], c = A[q + n], d = A[q + n + 1];
        let v = A[k] + .5 * (foam[k] - (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy));
        if (v < MN[k]) v = MN[k]; else if (v > MX[k]) v = MX[k];
        B[k] = v;
      }
    }
    foam.set(B); tone.set(T);
  }
  deposit(pour, dt) {
    const { n, h, foam, tone, P } = this;
    const low = 1 - smooth(.22, .58, pour.h), q = pour.q; if (q <= .01) return;
    // a full, high stream punches a wide brown hole through foam (how a tulip's stacks stay apart)
    const r = Math.max((P.deposit + P.depositQ * q) * (.32 + .68 * low), P.punch * q * q * (1 - low)), R = r * 1.6 + P.ahead;
    const i0 = Math.max(0, Math.floor((pour.x - R + 1) / h)), i1 = Math.min(n - 1, Math.ceil((pour.x + R + 1) / h));
    const j0 = Math.max(0, Math.floor((pour.y - R + 1) / h)), j1 = Math.min(n - 1, Math.ceil((pour.y + R + 1) / h));
    // What the stream brings up: foam when it lingers low, brown (crema dragged down and back up) when it moves fast
    // or is high. A wiggle lingers at each end and rushes through the middle → alternating foam lobes with brown lines
    // between them: the leaves of a rosetta.
    const sp = Math.hypot(pour.vx || 0, pour.vy || 0), e = low * (1 - P.cutBrown * smooth(P.lingerV, P.rushV, sp));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * n + i; if (!this.inside[k]) continue;
      const x = -1 + (i + .5) * h, y = -1 + (j + .5) * h;
      const d = Math.hypot(x - pour.x - pour.dx * P.ahead, y - pour.y - pour.dy * P.ahead);
      const w = (1 - smooth(r * .55, r, d)) * Math.min(1, dt * P.emitRate);
      if (w > 0 && (low > .02 || foam[k] > e)) foam[k] += (e - foam[k]) * w;
    }
    if (low < .98) {   // a high pour lightens the crema around the point (milk mixing up through it)
      const mixR = .12 + .1 * q, R2 = mixR * 1.5;
      const a0 = Math.max(0, Math.floor((pour.x - R2 + 1) / h)), a1 = Math.min(n - 1, Math.ceil((pour.x + R2 + 1) / h));
      const b0 = Math.max(0, Math.floor((pour.y - R2 + 1) / h)), b1 = Math.min(n - 1, Math.ceil((pour.y + R2 + 1) / h));
      for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) {
        const k = j * n + i; if (!this.inside[k]) continue;
        const x = -1 + (i + .5) * h, y = -1 + (j + .5) * h, d2 = (x - pour.x) ** 2 + (y - pour.y) ** 2;
        tone[k] += (1.05 - tone[k]) * (1 - low) * q * P.mix * dt * Math.exp(-d2 / (mixR * mixR));
      }
    }
  }
  // the etching pin carries a bead of crema (ink 0) or foam (ink 1) and leaves it along its path
  inkPin(pin, dt) {
    const { n, h, foam, P } = this, r = P.etchR * (pin.width ?? 1), R = r * 1.6;
    const i0 = Math.max(0, Math.floor((pin.x - R + 1) / h)), i1 = Math.min(n - 1, Math.ceil((pin.x + R + 1) / h));
    const j0 = Math.max(0, Math.floor((pin.y - R + 1) / h)), j1 = Math.min(n - 1, Math.ceil((pin.y + R + 1) / h));
    const w0 = Math.min(1, dt * 40);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * n + i; if (!this.inside[k]) continue;
      const x = -1 + (i + .5) * h, y = -1 + (j + .5) * h, w = (1 - smooth(r * .45, r, Math.hypot(x - pin.x, y - pin.y))) * w0;
      if (w > 0) foam[k] += (pin.ink - foam[k]) * w;
    }
  }
  // one step of dt seconds (split into substeps so no cell moves more than ~1.5 cells a substep)
  step(dt, pour, pin) {
    this.velocity(pour, pin);
    let vmax = 0; for (let k = 0; k < this.U.length; k++) { const s = Math.abs(this.U[k]) + Math.abs(this.V[k]); if (s > vmax) vmax = s; }
    const sub = Math.max(1, Math.min(4, Math.ceil(vmax * dt / (this.h * 1.5))));
    for (let s = 0; s < sub; s++) {
      this.advect(dt / sub);
      if (pour && pour.q > 0) this.deposit(pour, dt / sub);
      if (pin && pin.on && pin.ink !== null && pin.ink !== undefined) this.inkPin(pin, dt / sub);
    }
    this.t += dt; this.steps++;
    return sub;
  }
  // foam value at a domain point (for renderers / checks)
  foamAt(x, y) { return this.sample(this.foam, x, y); }
  toneAt(x, y) { return this.sample(this.tone, x, y); }
}
