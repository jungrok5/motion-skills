// ink-summoning · ink.js — sumi-e ink in 3D space, drawn with Canvas 2D.
//
//   ribbon(pts, wid, o)       a brush stroke: centreline pts[] (world, metres) and the brush's width axis wid[] at each
//                             point (unit vectors — the brush's bristle axis, so the ribbon twists like a real flung
//                             ribbon of ink and goes thin when seen edge-on). o: { w (m) | w(s), seed, dry, splat, wash, … }
//   drawRibbon(ctx, v, st, { head, fade, zmin, zmax })    head = how much of it is painted (0…1)
//   smokeSprites(R)           soft noisy ink-cloud sprites, made once
//   billow(t, o) → puffs      an ink cloud blooming from a point (pure function of t)
//   drawPuffs(ctx, v, puffs)  · drops(t, o) → { air, floor } ballistic droplets and the splats they leave
//   drawDrops / drawSplats    · floorRibbon: a stroke lying on the floor
//
// The look (references/LOOK.md): a dense black core with ragged edges, dry-brush bristle streaks ("flying white") on the
// outer edges and the tail, a fat wet head while painting, a faint wet sheen, splatter thrown off the outside of curves.
import { clamp, lerp, hash, noise2, sn, rng, v3, TAU, smooth, rgba } from './core.js';

export const INK = '#0b0b0d';

export function ribbon(pts, wid, o = {}) {
  const n = pts.length, len = [0];
  for (let i = 1; i < n; i++) len.push(len[i - 1] + v3.dist(pts[i], pts[i - 1]));
  const L = len[n - 1] || 1;
  return {
    kind: 'ribbon', pts, wid, n, s: len.map(l => l / L), L,
    w: o.w ?? .45, seed: o.seed ?? 1, dry: o.dry ?? .5, splat: o.splat ?? .6, wash: o.wash ?? 0, ink: o.ink || INK,
    alpha: o.alpha ?? 1, tone: o.tone ?? 0, bristles: o.bristles ?? 64, entry: o.entry ?? .12, tail: o.tail ?? .3, sheen: o.sheen ?? .1,
    flat: o.flat || false,  // flat: lying on the floor (drawn in the floor pass)
  };
}
// width profile along s: a pressed entry, a full body, a long dry taper
const profile = (st, s) => {
  const w = typeof st.w === 'function' ? st.w(s) : st.w;
  const e = st.entry, tl = st.tail;
  const a = s < e ? .55 + .45 * Math.sin(Math.PI / 2 * s / e) : 1;
  const b = s > 1 - tl ? Math.pow(Math.max(0, (1 - s) / tl), .6) * .85 + .15 : 1;
  return w * a * b;
};

// project the painted part of a ribbon → per-sample screen data
function sample(v, st, head) {
  const out = [], last = Math.max(1, Math.round(head * (st.n - 1)));
  for (let i = 0; i <= last && i < st.n; i++) {
    const c = st.pts[i], s = st.s[i], w = profile(st, s) * (0.92 + .16 * noise2(i * .31, st.seed));
    const a = v.p(v3.mad(c, st.wid[i], w / 2)), b = v.p(v3.mad(c, st.wid[i], -w / 2)), m = v.p(c);
    if (!a || !b || !m) { out.push(null); continue; }
    // a ribbon seen edge-on still has some body: widen to a minimum screen width across the tangent
    let dx = a[0] - b[0], dy = a[1] - b[1], sw = Math.hypot(dx, dy);
    const minW = w * v.k(m[2]) * .16;
    if (sw < minW) {
      const nx = st.pts[Math.min(st.n - 1, i + 1)], pv = st.pts[Math.max(0, i - 1)], p1 = v.p(nx), p0 = v.p(pv);
      let tx = 1, ty = 0; if (p1 && p0) { tx = p1[0] - p0[0]; ty = p1[1] - p0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; }
      const k = minW / 2; const ax = m[0] - ty * k, ay = m[1] + tx * k, bx = m[0] + ty * k, by = m[1] - tx * k;
      // keep the original side so the ribbon does not flip
      if ((ax - bx) * dx + (ay - by) * dy >= 0) { out.push({ a: [ax, ay], b: [bx, by], m, s, i, z: m[2] }); } else out.push({ a: [bx, by], b: [ax, ay], m, s, i, z: m[2] });
      continue;
    }
    out.push({ a, b, m, s, i, z: m[2] });
  }
  return out;
}
const at = (q, o) => { const k = (o + 1) / 2; return [lerp(q.b[0], q.a[0], k), lerp(q.b[1], q.a[1], k)]; };

// runs of consecutive visible samples inside [zmin, zmax)
function runs(sm, zmin, zmax) {
  const r = []; let cur = null;
  for (let i = 0; i < sm.length; i++) {
    const q = sm[i], ok = q && q.z >= zmin && q.z < zmax;
    if (ok) { if (!cur) { cur = []; r.push(cur); if (i > 0 && sm[i - 1]) cur.push(sm[i - 1]); } cur.push(q); }
    else if (cur) { if (q) cur.push(q); cur = null; }
  }
  return r.filter(x => x.length > 1);
}

export function drawRibbon(ctx, v, st, o = {}) {
  const head = clamp(o.head ?? 1), fade = clamp(o.fade ?? 0), zmin = o.zmin ?? -1e9, zmax = o.zmax ?? 1e9;
  if (head <= 0 || fade >= 1) return;
  const sm = sample(v, st, head);
  if (sm.length < 2) return;
  const parts = runs(sm, zmin, zmax);
  const A = st.alpha * (1 - fade), sd = st.seed, dry = st.dry, ink = st.ink, L = st.L;
  const last = sm[sm.length - 1], headS = last ? last.s : head, growing = head < .999;
  // fade eats the stroke from its tail end first, bristle by bristle (ink evaporating), not as a uniform alpha
  const eat = fade > 0 ? fade * 1.15 : 0;
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (const run of parts) {
    const zf = run[Math.floor(run.length / 2)].z, fog = clamp((zf - 7) / 26) * .55, a0 = A * (1 - fog);
    const wpx = q => Math.hypot(q.a[0] - q.b[0], q.a[1] - q.b[1]);
    const tailK = q => smooth(1 - st.tail, 1, q.s);
    // 1 · the core: a ragged polygon over the loaded middle of the brush; it narrows into the dry tail
    const core = q => Math.max(0, (1 - tailK(q) * 1.08) * (.7 - dry * .38) * (.82 + .3 * noise2(q.s * L * .9, sd + 30)) - (eat > 0 ? Math.max(0, eat - (1 - q.s)) * 2 : 0));
    if (!st.wash || st.tone) {
      ctx.globalAlpha = a0 * (st.wash ? st.tone : .96); ctx.fillStyle = ink; ctx.beginPath(); let started = false;
      const L1 = [], R1 = [];
      for (const q of run) { const c = core(q); if (c <= .02) continue; L1.push(at(q, c * (1 + .05 * sn(q.s * L * 7, sd + 3) + .05 * sn(q.s * L * 31, sd + 4)))); R1.push(at(q, -c * (1 + .05 * sn(q.s * L * 7, sd + 9) + .05 * sn(q.s * L * 29, sd + 8)))); }
      if (L1.length > 1) { for (const p of L1) { started ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); started = true; } for (let j = R1.length - 1; j >= 0; j--) ctx.lineTo(R1[j][0], R1[j][1]); ctx.closePath(); ctx.fill(); }
    }
    // 2 · bristles across the whole width. Each has its own ink load, thickness, and a dry pattern in arc length
    // (metres, so it is the same at any distance); outer bristles and the tail run dry first; tails end ragged.
    const nb = st.bristles;
    for (let b = 0; b < nb; b++) {
      const hb = hash(b, sd), hb2 = hash(b, sd + 1), hb3 = hash(b, sd + 2);
      const ob = ((b + .5) / nb * 2 - 1) * 1.04 + (hb - .5) * .05, edge = Math.abs(ob);
      const load = (1 - dry * .55) * (.45 + .55 * hb3) * (1 - Math.max(0, edge - .75) * 1.6);
      const end = 1 - st.tail * .7 * Math.pow(hb2, 1.5) * (.4 + edge);      // where this bristle runs out
      const start = st.entry * .25 * hash(b, sd + 4) * edge;
      const freq = .9 + hb * 2.4, mid = wpx(run[Math.floor(run.length / 2)]);
      ctx.lineWidth = Math.max(.6, mid / nb * (1.3 + hb2 * 2.2) * (1 - edge * .4));
      ctx.fillStyle = ink; ctx.globalAlpha = a0 * (st.wash ? (st.tone ? .12 + st.tone * .5 : .16) + .22 * load : (hb3 < .12 ? .35 : .72 + .28 * load));
      const bw = ctx.lineWidth; let seg = [];
      ctx.beginPath();
      const flush = () => { if (seg.length > 1) hair(ctx, seg, bw); seg = []; };
      for (const q of run) {
        const tk = tailK(q), cw = core(q);
        const inCore = edge < cw * .9 && tk < .05;
        const dryness = dry * .5 + tk * .75 + Math.max(0, edge - .7) * .7 + (eat > 0 ? Math.max(0, eat - (1 - q.s) - hb * .3) * 3 : 0);
        const wet = noise2(q.s * L * freq, b * 3.7 + sd) * .8 + noise2(q.s * L * freq * 5.3, b * 1.3 + sd) * .2;
        const on = !inCore && q.s >= start && q.s <= end && wet > .16 + dryness * .62;
        if (on) seg.push(at(q, ob * (1 + .025 * sn(q.s * L * 9, b)))); else flush();
      }
      flush(); ctx.fill();
    }
    // 3 · streaks of lighter ink inside the core (the texture of the bristles under the loaded middle) + a wet sheen
    if (!st.wash) {
      for (let k = 0; k < 7; k++) {
        const ob = (hash(k, sd + 20) * 2 - 1) * .55, sh = k === 0;
        ctx.strokeStyle = sh ? '#c9cfd5' : '#5b5f66'; ctx.globalAlpha = a0 * (sh ? st.sheen : .14 + .16 * hash(k, sd + 21));
        ctx.lineWidth = Math.max(.6, wpx(run[Math.floor(run.length / 2)]) * (sh ? .035 : .02 + .03 * hash(k, sd + 22)));
        ctx.beginPath(); let pen = false;
        for (const q of run) { const on = core(q) > Math.abs(ob) + .05 && noise2(q.s * L * 1.6, k * 5 + sd) > (sh ? .5 : .4); if (on) { const p = at(q, ob + .06 * sn(q.s * L * 2, k)); pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; } else pen = false; }
        ctx.stroke();
      }
    }
  }
  // 5 · splatter: fine round drops thrown off the outer edge just behind the head, a few larger, a rare flick
  if (st.splat > 0) {
    const R = rng(sd * 131 + 7), N = Math.round(70 * st.splat * Math.min(3, L / 3));
    ctx.fillStyle = ink;
    for (let k = 0; k < N; k++) {
      const s = R(), side = R() < .78 ? 1 : -1, d = Math.pow(R(), 2.6), big = R(), jit = R(), sh = R(), fl = R();
      if (s > headS - .015 || s < .04) continue;
      const i = Math.min(st.n - 1, Math.round(s * (st.n - 1))), c = st.pts[i], w = profile(st, s);
      const p0 = st.pts[Math.max(0, i - 2)], p2 = st.pts[Math.min(st.n - 1, i + 2)], tan = v3.norm(v3.sub(p2, p0));
      const off = v3.mad(v3.mad(c, st.wid[i], side * (w * .5 + d * w * 1.3 + .02)), tan, (jit - .5) * w * .5);
      const q = v.p(off); if (!q || q[2] < zmin || q[2] >= zmax) continue;
      const sz = big > .97 ? .022 + sh * .022 : .004 + Math.pow(big, 5) * .016;
      const r = Math.max(.55, sz * v.k(q[2]) * (1 - d * .5));
      ctx.globalAlpha = A * (.75 + .25 * sh) * clamp((headS - s) * 12) * (1 - (eat > 0 ? clamp(eat * 1.5 - s * .5) : 0));
      ctx.beginPath(); ctx.ellipse(q[0], q[1], r * (1 + sh * .35), r, sh * 3, 0, TAU); ctx.fill();
      if (fl > .985) {
        const e = v.p(v3.mad(v3.mad(off, tan, -w * (.25 + jit * .5)), st.wid[i], side * w * .15));
        if (e) { ctx.lineWidth = r * .7; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); }
      }
    }
  }
  ctx.restore();
}
// one bristle run as a filled hair: full width in the middle, tapering to a point at both ends (no dash-like caps)
function hair(ctx, s, w) {
  const m = s.length, L = [], R = [], tp = Math.max(1, m * .3);
  for (let j = 0; j < m; j++) {
    const a = s[Math.max(0, j - 1)], b = s[Math.min(m - 1, j + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const k = Math.pow(Math.min(1, (j + .5) / tp, (m - j - .5) / tp), .6) * w / 2;
    L.push([s[j][0] - ty * k, s[j][1] + tx * k]); R.push([s[j][0] + ty * k, s[j][1] - tx * k]);
  }
  ctx.moveTo(L[0][0], L[0][1]); for (let j = 1; j < m; j++) ctx.lineTo(L[j][0], L[j][1]);
  for (let j = m - 1; j >= 0; j--) ctx.lineTo(R[j][0], R[j][1]); ctx.closePath();
}
const wpx0 = q => Math.hypot(q.a[0] - q.b[0], q.a[1] - q.b[1]);

// ---------- ink smoke ----------
// soft ink-cloud sprites: an fbm-shaped blob with curly edges, black with soft alpha (drawn source-over: greys on white)
export function smokeSprites(mk, seed = 5, n = 6, size = 256) {
  const R = rng(seed), out = [];
  for (let k = 0; k < n; k++) {
    const c = mk(size, size), x = c.getContext('2d'), d = x.createImageData(size, size), ox = R() * 100, oy = R() * 100;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const u = i / size * 2 - 1, w = j / size * 2 - 1, r = Math.hypot(u, w);
      let f = 0, a = .5, fr = 2.2; for (let o = 0; o < 5; o++) { f += a * noise2(ox + u * fr + o * 13, oy + w * fr - o * 7); a *= .5; fr *= 2.1; }
      const curl = noise2(ox + u * 5, oy + w * 5);
      const al = clamp((1 - r * (1.05 + .5 * (curl - .5))) * 1.6) * clamp((f - .32) * 2.4);
      const p = (j * size + i) * 4; d.data[p] = d.data[p + 1] = d.data[p + 2] = 10; d.data[p + 3] = Math.round(255 * Math.pow(al, 1.3));
    }
    x.putImageData(d, 0, 0); out.push(c);
  }
  return out;
}
// an ink cloud blooming at o.at from time o.t0: o = { at, t0, n, every, r0, grow, life, rise, spread, a, seed, dir }
export function billow(t, o) {
  const out = [], n = o.n ?? 24, every = o.every ?? .04, life = o.life ?? 1.6, R = rng(o.seed ?? 3);
  for (let i = 0; i < n; i++) {
    const t0 = o.t0 + i * every, jx = R() * 2 - 1, jy = R(), jz = R() * 2 - 1, rot = R() * TAU, sp = R(), kind = Math.floor(R() * 6);
    const age = t - t0; if (age < 0 || age > life) continue;
    const k = age / life, sprd = (o.spread ?? 1) * (.4 + sp * .8);
    const d = o.dir || [0, 0, 0];
    const p = [o.at[0] + jx * sprd * (.3 + k) + d[0] * age, o.at[1] + jy * (o.rise ?? 1) * (.2 + k * 1.2) + d[1] * age, o.at[2] + jz * sprd * (.3 + k) + d[2] * age];
    out.push({ p, r: (o.r0 ?? .5) + (o.grow ?? 1.4) * Math.sqrt(k) * (.6 + sp * .7), a: (o.a ?? .55) * Math.sin(Math.PI * Math.min(1, k * 4)) * Math.pow(1 - k, 1.3), rot: rot + age * (sp - .5), kind });
  }
  return out;
}
export function drawPuffs(ctx, v, puffs, sprites, o = {}) {
  const zmin = o.zmin ?? -1e9, zmax = o.zmax ?? 1e9;
  ctx.save();
  for (const pf of puffs) {
    const q = v.p(pf.p); if (!q || q[2] < zmin || q[2] >= zmax || pf.a <= .003) continue;
    const r = pf.r * v.k(q[2]); if (r < 1) continue;
    ctx.save(); ctx.globalAlpha = clamp(pf.a * (1 - clamp((q[2] - 8) / 30) * .5)); ctx.translate(q[0], q[1]); ctx.rotate(pf.rot);
    ctx.drawImage(sprites[pf.kind % sprites.length], -r, -r, r * 2, r * 2); ctx.restore();
  }
  ctx.restore();
}

// ---------- droplets ----------
// o = { at, t0, n, speed, dir:[x,y,z] (main throw direction), cone (0…1), size, seed }. Pure in t: positions are
// ballistic; a drop that reaches the floor becomes a splat on it from its landing time on.
export function drops(t, o) {
  const air = [], floor = [], R = rng(o.seed ?? 11), g = 9.8, n = o.n ?? 30;
  const d0 = v3.norm(o.dir || [0, 1, 0]);
  for (let i = 0; i < n; i++) {
    const sp = (o.speed ?? 4) * (.35 + R() * .9), cone = o.cone ?? .6;
    const dv = v3.norm([d0[0] + (R() * 2 - 1) * cone, d0[1] + (R() * 2 - 1) * cone, d0[2] + (R() * 2 - 1) * cone]);
    const vel = v3.mul(dv, sp), size = (o.size ?? .03) * (.3 + Math.pow(R(), 2) * 1.7), delay = R() * (o.spread ?? .08);
    const t0 = o.t0 + delay, age = t - t0; if (age < 0) continue;
    // landing time: y0 + vy·t − g/2·t² = 0
    const y0 = o.at[1], vy = vel[1], tl = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, y0))) / g;
    if (age < tl) {
      const p = [o.at[0] + vel[0] * age, y0 + vy * age - g / 2 * age * age, o.at[2] + vel[2] * age];
      air.push({ p, v: [vel[0], vy - g * age, vel[2]], size });
    } else floor.push({ p: [o.at[0] + vel[0] * tl, 0, o.at[2] + vel[2] * tl], size: size * 1.3 * (1 + Math.min(1, (age - tl) * 8) * .3), seed: i + (o.seed ?? 0) * 97 });
  }
  return { air, floor };
}
export function drawDrops(ctx, v, air, o = {}) {
  const zmin = o.zmin ?? -1e9, zmax = o.zmax ?? 1e9, sh = o.shutter ?? .02;
  ctx.save(); ctx.strokeStyle = INK; ctx.lineCap = 'round';
  for (const d of air) {
    const a = v.p(d.p), b = v.p(v3.mad(d.p, d.v, -sh)); if (!a || !b || a[2] < zmin || a[2] >= zmax) continue;
    ctx.lineWidth = Math.max(.8, d.size * .6 * v.k(a[2])); ctx.globalAlpha = .85;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  ctx.restore();
}
// splats on the floor: a blobby disc (projected as a polygon so it lies flat) with a few satellite dots
export function drawSplats(ctx, v, list) {
  ctx.save(); ctx.fillStyle = INK;
  for (const s of list) {
    const R = rng(s.seed * 7 + 1), n = 12, pts = [];
    for (let k = 0; k < n; k++) { const a = k / n * TAU, r = s.size * (.7 + .5 * R()); pts.push([s.p[0] + Math.cos(a) * r, .002, s.p[2] + Math.sin(a) * r]); }
    const q = v.poly(pts); if (!q) continue;
    ctx.globalAlpha = .92; ctx.beginPath(); const N = q.length; ctx.moveTo((q[N - 1][0] + q[0][0]) / 2, (q[N - 1][1] + q[0][1]) / 2); for (let k = 0; k < N; k++) { const a = q[k], b = q[(k + 1) % N]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.closePath(); ctx.fill();
    for (let k = 0; k < 3; k++) { const a = R() * TAU, r = s.size * (1.3 + R() * 1.6), c = v.p([s.p[0] + Math.cos(a) * r, .002, s.p[2] + Math.sin(a) * r]); if (c) { const rr = Math.max(.6, s.size * .25 * R() * v.k(c[2])); ctx.beginPath(); ctx.ellipse(c[0], c[1], rr, rr * .5, 0, 0, TAU); ctx.fill(); } }
  }
  ctx.restore();
}

// ---------- helpers to build ribbons from shapes ----------
// a circle / arc / spiral in 3D: centre c, radius r (or r(u)), from angle a0 to a1, in the plane spanned by unit
// vectors e1, e2; the brush axis is the plane normal tilted by `twist` (so it reads as a flat flung ribbon)
export function arc(c, r, a0, a1, e1, e2, n = 90, o = {}) {
  const pts = [], wid = [], nrm = v3.norm(v3.cross(e1, e2));
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), a = lerp(a0, a1, u), rr = typeof r === 'function' ? r(u) : r, rise = (o.rise || 0) * u;
    const radial = v3.add(v3.mul(e1, Math.cos(a)), v3.mul(e2, Math.sin(a)));
    pts.push(v3.add(v3.add(c, v3.mul(radial, rr)), v3.mul(nrm, rise)));
    const tw = (o.twist ?? .35) + (o.wobble ?? .4) * Math.sin(u * TAU * 1.3 + (o.seed || 0));
    wid.push(v3.norm(v3.add(v3.mul(nrm, Math.cos(tw)), v3.mul(radial, Math.sin(tw)))));
  }
  return { pts, wid };
}
// a free path through control points (Catmull-Rom), brush axis given per point by fn(u, tangent) or a fixed up-ish axis
export function path(ctrl, n = 80, axis = [0, 1, 0], o = {}) {
  const pts = [], wid = [];
  const cr = (u) => { const m = ctrl.length - 1, x = clamp(u) * m, i = Math.min(m - 1, Math.floor(x)), f = x - i, p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(m, i + 2)], f2 = f * f, f3 = f2 * f; return [0, 1, 2].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3)); };
  for (let i = 0; i < n; i++) pts.push(cr(i / (n - 1)));
  for (let i = 0; i < n; i++) {
    const tan = v3.norm(v3.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    let a = typeof axis === 'function' ? axis(i / (n - 1), tan) : axis;
    a = v3.sub(a, v3.mul(tan, v3.dot(a, tan))); wid.push(v3.norm(a));
  }
  return { pts, wid };
}
export const rib = (shape, o) => ribbon(shape.pts, shape.wid, o);
