// How things on the sheet live: a flock that keeps together, a body that follows its head, a tendril that trails, drops
// that fall. Each keeps the rules a body has to obey — a creature moves the way it faces, turns no faster than it can,
// bends no further than its spine allows, stays the right way up and stays in its element — and reports to the world
// when one is broken (`world.violations`, read by scripts/check.mjs). Build new creatures from these, not from raw
// positions, and the checks come with them.
import { TAU, clamp, lerp, angDiff, hash } from './brush.js';

/**
 * Tell the world how a body is posed this step. o: { h heading (rad), vx, vy, bends: [rad…] between spine segments,
 * limit: max bend (rad), lens: [segment lengths], len: the length they should have, up: y of the back's normal on screen
 * (negative = back is up), inZone: bool }. Called by Flock and Chain; call it yourself for a hand-built body.
 */
export function report(w, kind, o) {
  const V = w.violations, bad = (what, v) => { const k = kind + ': ' + what; (V[k] = V[k] || { n: 0, worst: 0, t: w.t }).n++; if (Math.abs(v) > V[k].worst) V[k].worst = Math.abs(v); };
  const sp = Math.hypot(o.vx || 0, o.vy || 0);
  if (o.h != null && sp > (o.minSpeed || 25)) { const d = Math.abs(angDiff(o.h, Math.atan2(o.vy, o.vx))); if (d > (o.slip || .9)) bad('moves sideways or backwards (heading vs travel, rad)', d); }
  if (o.bends) for (const b of o.bends) if (Math.abs(b) > o.limit + .02) bad('spine bends past its limit (rad)', b);
  if (o.lens) for (const l of o.lens) if (Math.abs(l - o.len) > o.len * .04) bad('a segment changed length (units)', l - o.len);
  if (o.up != null && o.up > .15) bad('is upside down (back points down)', o.up);
  if (o.inZone === false) bad('left its element (sea creature in the sky, bird under water…)', 1);
  w.bodies[kind] = (w.bodies[kind] || 0) + 1;
}

/** turn heading `h` toward angle `to` by at most `rate` rad/s */
export const turnTo = (h, to, rate, dt) => h + clamp(angDiff(to, h), -rate * dt, rate * dt);

/**
 * Draw a creature seen from the side: `fn(ctx)` draws it facing +x with its back toward −y, at the origin. The frame is
 * turned to the heading and, when the creature faces left, mirrored top-to-bottom so its back stays up and its belly
 * down — never rotate a side view past vertical without this. Returns the y of the back's normal on screen (for report).
 */
export function side(ctx, x, y, h, fn, roll = 0) {
  const left = Math.cos(h) < 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(h); if (left) ctx.scale(1, -1); if (roll) ctx.rotate(roll);
  fn(ctx, left); ctx.restore();
  return left ? Math.cos(h) : -Math.cos(h);          // back normal (0, −1) local → screen y; ≤ 0 means up
}
/** draw a creature seen from above: `fn(ctx)` draws it facing +x. No mirroring — left and right are its own. */
export function above(ctx, x, y, h, fn) { ctx.save(); ctx.translate(x, y); ctx.rotate(h); fn(ctx); ctx.restore(); }

/**
 * A flock: agents that keep apart, line up and stay together, are carried by the fluid, flee and follow.
 * o: { n, speed, turn (rad/s), sep, view, home: [x, y] or fn(w) → [x, y], zone(x, y, w) → true inside,
 *      element(x, y, w, agent) → true while it is where it can live at all (default: zone; give both when the zone is
 *      a comfortable band inside the element, e.g. zone 24 units under a waterline, element the waterline itself),
 *      flow: how much the fluid carries them (0…1), bottom: how far from the bottom edge they turn back (the chips
 *      cover the last ~120 units), kind: name for body reports }
 */
export class Flock {
  constructor(w, x, y, o) {
    this.o = Object.assign({ n: 12, speed: 90, turn: 2.6, sep: 26, view: 120, flow: .6, spread: 60, kind: 'flock', wander: .8 }, o);
    this.a = []; const r = w.rand;
    for (let i = 0; i < this.o.n; i++) { const h = r() * TAU; this.a.push({ x: x + (r() - .5) * this.o.spread, y: y + (r() - .5) * this.o.spread, h, sp: this.o.speed * (.7 + r() * .5), vx: 0, vy: 0, ph: r() * TAU, k: .8 + r() * .4, scare: 0, i }); }
    this.flee = []; this.seek = null; this.out = 0;
  }
  /** scatter from a point for a moment */
  startle(x, y, r = 300, power = 1) { for (const a of this.a) { const d = Math.hypot(a.x - x, a.y - y); if (d < r) { a.scare = Math.max(a.scare, power * (1 - d / r) + .3); a.fx = x; a.fy = y; } } }
  update(w, dt) {
    const o = this.o, A = this.a, home = typeof o.home === 'function' ? o.home(w) : o.home, f = [0, 0];
    for (const a of A) {
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
      for (const b of A) {
        if (b === a) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < o.sep && d > 0) { sx -= dx / d * (o.sep - d) / o.sep; sy -= dy / d * (o.sep - d) / o.sep; }
        if (d < o.view) { ax += Math.cos(b.h); ay += Math.sin(b.h); cx += dx; cy += dy; n++; }
      }
      let dx = Math.cos(a.h) * .6 + sx * 2.2, dy = Math.sin(a.h) * .6 + sy * 2.2;
      if (n) { dx += ax / n * .55 + cx / n / o.view * .7; dy += ay / n * .55 + cy / n / o.view * .7; }
      const wa = a.ph + w.t * (.5 + a.k * .4); dx += Math.cos(wa) * .25 * o.wander; dy += Math.sin(wa * 1.3) * .25 * o.wander;
      if (home) { const hx = home[0] - a.x, hy = home[1] - a.y, hd = Math.hypot(hx, hy) || 1, pull = clamp((hd - (o.range || 160)) / 300, 0, 1.2); dx += hx / hd * pull; dy += hy / hd * pull; }
      if (a.rest) { a.vx = a.vy = 0; report(w, o.kind, { h: a.h, vx: 0, vy: 0 }); continue; }          // perched / asleep: it does not move
      if (a.goal) { const hx = a.goal[0] - a.x, hy = a.goal[1] - a.y, hd = Math.hypot(hx, hy) || 1; dx += hx / hd * (a.goal[2] || 1.5); dy += hy / hd * (a.goal[2] || 1.5); }
      if (this.seek) { const hx = this.seek[0] - a.x, hy = this.seek[1] - a.y, hd = Math.hypot(hx, hy) || 1; dx += hx / hd * (this.seek[2] || .8); dy += hy / hd * (this.seek[2] || .8); }
      for (const p of this.flee) { const fx = a.x - p[0], fy = a.y - p[1], fd = Math.hypot(fx, fy) || 1; if (fd < p[2]) { const k = (1 - fd / p[2]) * (p[3] || 2.5); dx += fx / fd * k; dy += fy / fd * k; if (k * .3 > a.scare) { a.scare = k * .3; a.fx = p[0]; a.fy = p[1]; } } }
      if (a.scare > .02 && a.fx != null) { const fx = a.x - a.fx, fy = a.y - a.fy, fd = Math.hypot(fx, fy) || 1; dx += fx / fd * a.scare * 2.5; dy += fy / fd * a.scare * 2.5; a.scare *= Math.exp(-dt * 1.4); }
      // stay on the sheet and in the element: steer back before the edge, never teleport
      const m = 70, mb = o.bottom || m; if (a.x < m) dx += (m - a.x) / m * 2; if (a.x > w.W - m) dx -= (a.x - (w.W - m)) / m * 2; if (a.y < m) dy += (m - a.y) / m * 2; if (a.y > w.H - mb) dy -= (a.y - (w.H - mb)) / mb * 3;
      let inside = true;
      if (o.zone) { inside = o.zone(a.x, a.y, w, a); if (!inside) { const g = o.zoneGrad ? o.zoneGrad(a.x, a.y, w, a) : [0, 0]; dx += g[0] * 3; dy += g[1] * 3; } }
      a.h = turnTo(a.h, Math.atan2(dy, dx), o.turn * (1 + a.scare * 2) * (inside ? 1 : 2.2), dt);
      const sp = a.sp * (1 + a.scare * 1.6 + .25 * Math.sin(w.t * 3 * a.k + a.ph)); a.vx = Math.cos(a.h) * sp; a.vy = Math.sin(a.h) * sp;
      w.flow(a.x, a.y, f); a.x += (a.vx + f[0] * o.flow) * dt; a.y += (a.vy + f[1] * o.flow) * dt; a.fl = Math.hypot(f[0], f[1]);
      a.x = clamp(a.x, -40, w.W + 40); a.y = clamp(a.y, -40, w.H + 40);
      a.outT = inside ? 0 : (a.outT || 0) + dt;
      if (o.element) a.outT = o.element(a.x, a.y, w, a) ? 0 : (a.elT = (a.elT || 0) + dt, a.outT); if (o.element && o.element(a.x, a.y, w, a)) a.elT = 0;
      report(w, o.kind, { h: a.h, vx: a.vx, vy: a.vy, inZone: (o.element ? (a.elT || 0) : a.outT) > 2.5 ? false : true });
    }
    this.flee.length = 0; this.seek = null;
  }
  centre() { let x = 0, y = 0; for (const a of this.a) { x += a.x; y += a.y; } return [x / this.a.length, y / this.a.length]; }
}

/**
 * A body that follows its head: a spine of `n` segments of length `len`, each allowed to bend at most `limit` rad from
 * the one before it. Move the head (x, y, h) yourself — `swim()` does it for something that chases a target — then
 * `follow()`; draw along `pts`. Whales, eels, carp, dragons, snakes, kites, ribbons.
 */
export class Chain {
  constructor(x, y, h, { n = 8, len = 30, limit = .5, kind = 'chain' } = {}) {
    this.n = n; this.len = len; this.limit = limit; this.kind = kind; this.x = x; this.y = y; this.h = h; this.sp = 0; this.vx = 0; this.vy = 0;
    this.pts = []; for (let i = 0; i <= n; i++) this.pts.push([x - Math.cos(h) * len * i, y - Math.sin(h) * len * i]);
    this.ang = new Array(n).fill(h); this.roll = Math.cos(h) >= 0 ? 1 : -1; this._side = this.roll;
  }
  /** pose it without moving: heading h, every joint bent by `bend` rad (for cast sheets and held poses) */
  pose(x, y, h, bend = 0) {
    this.x = x; this.y = y; this.h = h; this.pts[0] = [x, y]; let a = h;
    for (let i = 1; i <= this.n; i++) { if (i > 1) a -= bend; this.ang[i - 1] = a; this.pts[i] = [this.pts[i - 1][0] - Math.cos(a) * this.len, this.pts[i - 1][1] - Math.sin(a) * this.len]; }
    this.roll = this._side = Math.cos(h) >= 0 ? 1 : -1; return this;
  }
  /** head toward (tx, ty): turns at most `turn` rad/s, speed eases to `speed`; the fluid carries it by `flow` */
  swim(w, dt, tx, ty, { speed = 120, turn = 1.4, flow = .3, wiggle = 0, zone } = {}) {
    let to = Math.atan2(ty - this.y, tx - this.x);
    if (wiggle) to += Math.sin(w.t * wiggle) * .35;
    const m = 90; let ex = 0, ey = 0;
    if (this.x < m) ex += 1; if (this.x > w.W - m) ex -= 1; if (this.y < m) ey += 1; if (this.y > w.H - m) ey -= 1;
    if (zone && !zone(this.x, this.y, w)) { const g = this.zoneGrad ? this.zoneGrad(this.x, this.y, w) : [0, 0]; ex += g[0] * 1.5; ey += g[1] * 1.5; this.outT = (this.outT || 0) + dt; } else this.outT = 0;
    if (ex || ey) to = Math.atan2(Math.sin(to) * .5 + ey, Math.cos(to) * .5 + ex);
    this.h = turnTo(this.h, to, turn, dt); this.sp = lerp(this.sp, speed, 1 - Math.exp(-dt * 2));
    this.vx = Math.cos(this.h) * this.sp; this.vy = Math.sin(this.h) * this.sp;
    const f = w.flow(this.x, this.y); this.x += (this.vx + f[0] * flow) * dt; this.y += (this.vy + f[1] * flow) * dt;
    this.follow(w);
  }
  follow(w) {
    const P = this.pts, bends = [], lens = []; P[0][0] = this.x; P[0][1] = this.y; let prev = this.h;
    for (let i = 1; i <= this.n; i++) {
      let a = Math.atan2(P[i - 1][1] - P[i][1], P[i - 1][0] - P[i][0]);           // direction this segment points (toward the head)
      const d = angDiff(a, prev); if (Math.abs(d) > this.limit) a = prev + Math.sign(d) * this.limit;
      P[i][0] = P[i - 1][0] - Math.cos(a) * this.len; P[i][1] = P[i - 1][1] - Math.sin(a) * this.len;
      bends.push(angDiff(a, prev)); lens.push(Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); this.ang[i - 1] = a; prev = a;
    }
    // a side view keeps its back up: when the head swings past vertical the body rolls over (roll eases from 1 to −1), it never just flips
    const c = Math.cos(this.h); if (Math.abs(c) > .22) this._side = c > 0 ? 1 : -1;
    this.roll += clamp(this._side - this.roll, -.06, .06);
    if (w) report(w, this.kind, { h: this.h, vx: this.vx, vy: this.vy, bends, limit: this.limit, lens, len: this.len, inZone: (this.outT || 0) > 3 ? false : true,
      up: this.sideView && Math.abs(this.roll) > .95 && Math.abs(c) > .5 ? -Math.cos(this.h) * this.roll : null });
  }
  /**
   * A frame on the body for hanging fins, legs and flukes: s 0 (head) … 1 (tail) → { x, y, a: the way the body points
   * there, bx, by: unit vector toward the back (dorsal side) for a side view — it already includes the roll, so
   * (x + bx·d, y + by·d) is always on the creature's back and (x − bx·d, y − by·d) on its belly }
   */
  frame(s) { const p = this.at(s), a = p[2]; return { x: p[0], y: p[1], a, bx: Math.sin(a) * this.roll, by: -Math.cos(a) * this.roll }; }
  /** a point and direction along the body: s 0 (head) … 1 (tail) */
  at(s) { const f = clamp(s) * this.n, i = Math.min(this.n - 1, Math.floor(f)), t = f - i, a = this.pts[i], b = this.pts[i + 1]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), this.ang[i]]; }
}

/**
 * A tendril hanging from a moving root: tentacles, reeds, ropes, hair, pennants. `rest` is the direction it wants to
 * hang or stand in (rad), `stiff` 0…1 how strongly; the fluid and wind bend it.
 */
export class Tendril {
  constructor(x, y, { n = 6, len = 14, rest = Math.PI / 2, stiff = .3, flow = .9, seed = 1 } = {}) {
    this.n = n; this.len = len; this.rest = rest; this.stiff = stiff; this.flowK = flow; this.seed = seed;
    this.pts = []; for (let i = 0; i <= n; i++) this.pts.push([x + Math.cos(rest) * len * i, y + Math.sin(rest) * len * i]);
  }
  update(w, dt, x, y, rest = this.rest) {
    const P = this.pts, f = [0, 0]; P[0][0] = x; P[0][1] = y;
    for (let i = 1; i <= this.n; i++) {
      w.flow(P[i][0], P[i][1], f);
      const sway = Math.sin(w.t * 1.7 + this.seed + i * .6) * 6;
      let tx = P[i][0] + (f[0] * this.flowK + (w.wind ? w.wind.x * .25 : 0) + sway) * dt + Math.cos(rest) * this.len * this.stiff, ty = P[i][1] + (f[1] * this.flowK + (w.wind ? w.wind.y * .25 : 0)) * dt + Math.sin(rest) * this.len * this.stiff;
      const dx = tx - P[i - 1][0], dy = ty - P[i - 1][1], d = Math.hypot(dx, dy) || 1;
      P[i][0] = P[i - 1][0] + dx / d * this.len; P[i][1] = P[i - 1][1] + dy / d * this.len;
    }
  }
}

/** falling, flying, drifting specks: rain, snow, petals, spray, sparks. spawn() them, update() moves them, each() draws */
export class Drift {
  constructor(max = 400) { this.p = []; this.max = max; }
  spawn(x, y, vx, vy, life = 1, size = 1, data) { if (this.p.length < this.max) this.p.push({ x, y, vx, vy, life, age: 0, size, data }); }
  /** o: { gravity, drag, flow, wind, floor(p, w) → true when it has landed (it is then removed and onLand called) } */
  update(w, dt, o = {}) {
    const f = [0, 0], P = this.p;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.age += dt;
      if (o.flow) { w.flow(p.x, p.y, f); p.x += f[0] * o.flow * dt; p.y += f[1] * o.flow * dt; }
      p.vy += (o.gravity || 0) * dt; if (o.wind && w.wind) { p.vx += (w.wind.x * o.wind - p.vx) * dt * 1.5; }
      if (o.drag) { p.vx *= Math.exp(-o.drag * dt); p.vy *= Math.exp(-o.drag * dt); }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const landed = o.floor && o.floor(p, w);
      if (landed && o.onLand) o.onLand(p, w);
      if (landed || p.age > p.life || p.x < -60 || p.x > w.W + 60 || p.y > w.H + 60 || p.y < -200) P.splice(i, 1);
    }
  }
  each(fn) { for (const p of this.p) fn(p, clamp(1 - p.age / p.life)); }
}

export { hash };
