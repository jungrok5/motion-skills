// ultimate-move-short · domain.js — the ultimate's world: a thousand "watchers" (eyes in the reference; moons, mirrors,
// seals, or your own motif for a new topic) that open across the sky in depth, all turn toward the fighter, are tied by
// fine accent threads, crack like black glass and are pulled into the blade.
//
//   const D = domain({ motif: 'eye', seed: 5, accent: '#e0142d' })
//   D.giant({ p: [0, 9, -30], size: 22 })                       one huge watcher (or several)
//   D.wall({ z: -60, y0: 2, rows: 34, cols: 60, size: 2.6, curve: .25 })    a curved wall of thousands, fish-scale rows
//   D.swarm({ n: 260, c: [0, 2, 0], r0: 8, r1: 70, size: [.2, 9] })      scattered through space, dust to celestial
//   drawDomain(ctx, v, D, { open, crack, gone, look, threads, glow, only })
//     open 0…1    the bloom: watcher i opens when open passes its own threshold (big ones first, then the rest);
//                 wall and swarm watchers open only to their own `phase` (moons: crescent … full) unless phases: false
//     crack 0…1   glass cracks spread through them (nearest the fighter first)   gone 0…1  they shatter away
//     look [x,y,z] the point every pupil turns to (the fighter / the blade)    threads 0…1  accent lines between them
//   MOTIFS.eye(ctx, s) …  each draws one watcher in a unit box (x −1…1) given s = { open, crack, look:[dx,dy], glow,
//   accent, seed, detail } — add your own motif to MOTIFS (or pass motif: (ctx, s) => …) to design one for a topic.
import { clamp, lerp, hash, noise2, sn, rgba, mix, v3, TAU, ease } from './core.js';
import { brush, INK } from './ink.js';
import { spaceCrack } from './fx.js';

// ---------- motifs (unit box: x from −1 to 1, y from −1 to 1, centre 0, y down) ----------
export const MOTIFS = {
  // an ink eye: brushed lids that run off into dry ink past the corners, a pale sclera with fine veins, a big iris of
  // radial accent fibres, a black pupil with one hot point, two white glints, a hairline of accent along the lid
  eye(ctx, s) {
    const op = clamp(s.open), A = s.accent, seed = s.seed || 1, lx = (s.look?.[0] || 0) * .28, ly = (s.look?.[1] || 0) * .14;
    const h = .62 * ease.out(op), up = t => -h * Math.sin(Math.PI * t) * (1 - .12 * t), lo = t => h * .55 * Math.sin(Math.PI * t) * (1 + .1 * t);
    const lid = (f, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [-1 + 2 * t, f(t)]; });
    const U = lid(up), Lw = lid(lo);
    if (op > .02) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(U[0][0], U[0][1]); for (const p of U) ctx.lineTo(p[0], p[1]); for (let i = Lw.length - 1; i >= 0; i--) ctx.lineTo(Lw[i][0], Lw[i][1]); ctx.closePath(); ctx.clip();
      const g = ctx.createRadialGradient(0, 0, .1, 0, 0, 1.1); g.addColorStop(0, '#f1efec'); g.addColorStop(.7, '#d6d3cf'); g.addColorStop(1, '#8e8a86');
      ctx.fillStyle = g; ctx.fillRect(-1.2, -1, 2.4, 2);
      if (s.detail) { ctx.strokeStyle = rgba(A, .55); ctx.lineWidth = .008; for (let k = 0; k < 9; k++) { const sx = hash(seed, k) > .5 ? 1 : -1; ctx.beginPath(); let x = sx * .98, y = (hash(seed, k + 9) - .5) * .3; ctx.moveTo(x, y); for (let j = 0; j < 6; j++) { x -= sx * (.06 + hash(seed, k * 9 + j) * .05); y += (hash(seed, k * 13 + j) - .5) * .09; ctx.lineTo(x, y); } ctx.stroke(); } }
      // iris
      const ir = .43, cx = lx, cy = ly + .02;
      const gl = s.glow ?? 1, ig = ctx.createRadialGradient(cx, cy, .05, cx, cy, ir); ig.addColorStop(0, '#0e0a0b'); ig.addColorStop(.32, mix('#2b2729', mix(A, '#1a0507', .45), gl)); ig.addColorStop(.7, mix('#5d5759', mix(A, '#3a0a0f', .15), gl)); ig.addColorStop(.93, mix('#2a2628', '#2a1416', gl)); ig.addColorStop(1, '#0e0809');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, ir, 0, TAU); ctx.fill();
      if (s.detail) { for (let k = 0; k < 90; k++) { const a = k / 90 * TAU + hash(seed, k + 50) * .05, r0 = .14 + hash(seed, k + 60) * .06, r1 = ir * (.75 + hash(seed, k + 70) * .25); ctx.strokeStyle = k % 3 ? rgba('#120607', .55) : rgba(mix(A, '#ff9aa6', .3), .5); ctx.lineWidth = .01 + hash(seed, k + 80) * .012; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a + .04) * r1, cy + Math.sin(a + .04) * r1); ctx.stroke(); } }
      ctx.fillStyle = '#050304'; ctx.beginPath(); ctx.arc(cx, cy, .15 + .05 * (1 - op), 0, TAU); ctx.fill();
      if (gl > .5) { ctx.fillStyle = A; ctx.shadowColor = A; ctx.shadowBlur = s.detail ? 12 : 0; ctx.beginPath(); ctx.arc(cx, cy, .018, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
      // lid shadow on the eyeball
      const sg = ctx.createLinearGradient(0, -h, 0, -h + .3); sg.addColorStop(0, 'rgba(10,8,9,.6)'); sg.addColorStop(1, 'rgba(10,8,9,0)'); ctx.fillStyle = sg; ctx.fillRect(-1.2, -1, 2.4, 2);
      ctx.restore();
      // glints left and right of the iris
      ctx.fillStyle = '#ffffff'; for (const gx of [-.5, .52]) { ctx.beginPath(); ctx.ellipse(gx + lx * .3, -.02 + ly * .3, .1 * op, .025 * op, 0, 0, TAU); ctx.fill(); }
      // accent hairline under the upper lid
      ctx.save(); ctx.globalAlpha *= gl > .5 ? 1 : .25 + gl; ctx.strokeStyle = A; ctx.shadowColor = A; ctx.shadowBlur = s.detail ? 10 : 0; ctx.lineWidth = .025; ctx.beginPath(); ctx.moveTo(U[0][0], U[0][1]); for (const p of U) ctx.lineTo(p[0], p[1] + .02); ctx.stroke(); ctx.restore();
    }
    // lids: ink brush strokes running past the corners
    const S = 1 / 100, px = p => [p[0] * 100, p[1] * 100];
    ctx.save(); ctx.scale(S, S);
    const ext = (pts, k) => [[pts[0][0] - .35 * k, pts[0][1] + .02], ...pts, [pts[pts.length - 1][0] + .3 * k, pts[pts.length - 1][1] - .02]];
    brush(ctx, ext(U, 1).map(px), ext(U, 1).map((_, i, a) => (9 + 7 * Math.sin(Math.PI * i / (a.length - 1))) * (s.lidW ?? 1)), { seed, dry: .5, splatter: s.detail ? .9 : .2, hairs: !!s.detail, bristles: s.detail ? 14 : 6, col: s.ink || INK });
    if (op > .05) brush(ctx, ext(Lw, .6).map(px), ext(Lw, .6).map((_, i, a) => (4 + 4 * Math.sin(Math.PI * i / (a.length - 1))) * (s.lidW ?? 1)), { seed: seed + 3, dry: .6, splatter: s.detail ? .5 : 0, hairs: false, bristles: s.detail ? 10 : 5, col: s.ink || INK });
    ctx.restore();
  },
  // a moon that waxes as it opens (new → full), cold grey with soft craters; when full, an accent corona and core.
  // eclipse 0…1 slides a dark disc over it with a red rim (the blood eclipse); corona 0…1 the rim's strength
  moon(ctx, s) {
    const op = clamp(s.open), A = s.accent, seed = s.seed || 1, r = .8, ec = clamp(s.eclipse || 0), lx = (s.look?.[0] || 0), ly = (s.look?.[1] || 0);
    ctx.save();
    ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(0, 0, r * .55, 0, 0, r); g.addColorStop(0, '#eeede9'); g.addColorStop(1, '#bdbbb6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    if (s.detail) for (let k = 0; k < 16; k++) { const a = hash(seed, k) * TAU, d = Math.sqrt(hash(seed, k + 9)) * r * .82, cr = .03 + hash(seed, k + 19) * .13; ctx.fillStyle = 'rgba(70,68,66,.2)'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, cr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = .01; ctx.beginPath(); ctx.arc(Math.cos(a) * d - cr * .15, Math.sin(a) * d - cr * .15, cr, 2.5, 5); ctx.stroke(); }
    // the terminator: a dark disc sliding off as it waxes (from the side away from what it looks at)
    const sd = lx >= 0 ? -1 : 1;
    ctx.fillStyle = '#121215'; ctx.beginPath(); ctx.ellipse(sd * r * 2.15 * ease.io(op), 0, r * 1.03, r * 1.03, 0, 0, TAU); ctx.fill();
    // a pupil-like point where it looks, when full
    if (op > .85 && !ec && s.detail) { const k = (op - .85) / .15; ctx.fillStyle = rgba(A, k); ctx.shadowColor = A; ctx.shadowBlur = s.detail ? 14 : 0; ctx.beginPath(); ctx.arc(lx * .28, ly * .28, .045, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    if (ec > 0) { ctx.fillStyle = '#09090b'; ctx.beginPath(); ctx.arc(r * 2.1 * (1 - ease.out(ec)), 0, r * 1.01, 0, TAU); ctx.fill(); }
    ctx.restore();
    // rim: a broken ink circle; the accent corona when full or eclipsed
    const cor = ec > 0 ? ec * (s.corona ?? 1) : op > .85 ? (op - .85) / .15 * .6 : 0;
    if (cor > 0) { ctx.save(); ctx.strokeStyle = rgba(A, Math.min(1, cor)); ctx.shadowColor = A; ctx.shadowBlur = s.detail ? 30 * cor : 0; ctx.lineWidth = .035 + .03 * cor; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 0, TAU); ctx.stroke(); if (s.detail && ec > .5) { ctx.globalAlpha = cor * .5; ctx.lineWidth = .012; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU + hash(seed, k) * .2, l = r * (1.08 + hash(seed, k + 5) * .25); ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.03, Math.sin(a) * r * 1.03); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke(); } } ctx.restore(); }
    ctx.restore();
    ctx.save(); ctx.scale(.01, .01); const ring = Array.from({ length: 33 }, (_, i) => { const a = i / 32 * TAU * .9 + 2.4 + hash(seed, 3); return [Math.cos(a) * 84, Math.sin(a) * 84]; });
    brush(ctx, ring, ring.map((_, i) => 4 + 6 * Math.sin(Math.PI * i / 32)), { seed, dry: .6, splatter: s.detail ? .6 : 0, hairs: false, bristles: s.detail ? 10 : 5 }); ctx.restore();
  },
  // a round bronze mirror: a black ornamented rim, a face that clears from black to a pale reflection of a figure
  mirror(ctx, s) {
    const op = clamp(s.open), A = s.accent, r = .78;
    ctx.save();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, TAU); ctx.fill();
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2, .06, 0, TAU); ctx.fill(); }
    const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, mix('#151518', '#f3f2ef', op)); g.addColorStop(1, mix('#0d0d10', '#b9b8b4', op));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    if (op > .3) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); const lx = (s.look?.[0] || 0) * .3; ctx.fillStyle = rgba('#0b0b0e', (op - .3) / .7); ctx.beginPath(); ctx.moveTo(lx - .12, .6); ctx.lineTo(lx - .07, -.1); ctx.arc(lx, -.22, .09, Math.PI * .8, Math.PI * 2.2); ctx.lineTo(lx + .12, .6); ctx.fill(); ctx.strokeStyle = rgba(A, (op - .3) / .7); ctx.lineWidth = .025; ctx.beginPath(); ctx.moveTo(lx + .1, .1); ctx.lineTo(lx + .35, -.45); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = rgba('#ffffff', .5 * op); ctx.lineWidth = .03; ctx.beginPath(); ctx.arc(0, 0, r * .9, 3.6, 4.4); ctx.stroke();
    ctx.restore();
  },
  // a carved seal: an accent square stamped into the world, white carved strokes (a generated glyph, never a real word)
  seal(ctx, s) {
    const op = clamp(s.open), A = s.accent, seed = s.seed || 1, k = .25 + .75 * ease.out(op), r = .7 * k;
    ctx.save(); ctx.rotate((hash(seed, 1) - .5) * .3);
    ctx.fillStyle = mix('#3a0a0e', A, op); ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = '#f4efe8'; ctx.lineWidth = .07 * k; ctx.lineCap = 'square'; ctx.strokeRect(-r * .86, -r * .86, r * 1.72, r * 1.72);
    ctx.lineWidth = .085 * k;
    for (let i = 0; i < 6; i++) { const x0 = (hash(seed, i * 4) - .5) * 1.2 * r, y0 = (hash(seed, i * 4 + 1) - .5) * 1.2 * r, hz = hash(seed, i * 4 + 2) > .5, L = (.3 + hash(seed, i * 4 + 3) * .7) * r; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(hz ? x0 + L : x0, hz ? y0 : y0 + L); if (hash(seed, i + 40) > .5) ctx.lineTo(hz ? x0 + L : x0 + L * .6, hz ? y0 + L * .6 : y0 + L); ctx.stroke(); }
    ctx.restore();
  },
};

// sprite cache for the many small watchers: motif × open level × crack level, rendered once
const SPR = new Map();
function sprite(D, lvl, crk) {
  const key = `${D.key}|${lvl}|${crk}`; let c = SPR.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = 192; c.height = 192; const x = c.getContext('2d');
  x.translate(96, 96); x.scale(80, 80);
  D.draw(x, { open: lvl / 8, crack: crk / 4, accent: D.accent, seed: D.seed, detail: false, glow: D.wallGlow ?? .2, look: [0, 0] });
  if (crk) { x.setTransform(1, 0, 0, 1, 0, 0); for (let k = 0; k < crk * 2; k++) spaceCrack(x, 96 + (hash(D.seed, k) - .5) * 40, 96 + (hash(D.seed, k + 5) - .5) * 30, 60 + crk * 15, hash(D.seed, k + 9) * TAU, { seed: k + 1, w: 2.2, col: k % 2 ? '#f5f3ef' : INK, branch: .4 }); }
  SPR.set(key, c); return c;
}

export function domain(o = {}) {
  const D = { seed: o.seed || 5, accent: o.accent || '#e0142d', items: [], motif: o.motif || 'eye', wallGlow: o.wallGlow ?? .2, fogDist: o.fogDist ?? 140 };
  D.draw = typeof D.motif === 'function' ? D.motif : MOTIFS[D.motif];
  D.key = (typeof D.motif === 'function' ? 'custom' + D.seed : D.motif) + D.accent + D.seed;
  const R = (a, b) => hash(D.seed * 1013 + a, b);
  // each watcher: p (world), size (m, half-width), th (open threshold 0…1), ck (crack threshold), tone
  D.giant = g => { D.items.push({ p: g.p, size: g.size, th: g.th ?? 0, ck: g.ck ?? .4, gone: g.gone ?? .9, big: true, plane: g.plane || null, tone: 1, id: D.items.length }); return D; };
  D.wall = w => {
    const rows = w.rows || 30, cols = w.cols || 50, size = w.size || 2.4, z = w.z ?? -60, curve = w.curve ?? .2, y0 = w.y0 ?? 1;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const u = (j + (i % 2) * .5) / cols - .5, x = u * cols * size * 1.55, y = y0 + i * size * .78;
      const zz = z + Math.sign(z || -1) * -1 * Math.abs(u) ** 2 * cols * size * curve * 2;
      const d = Math.hypot(u * 2, (i / rows - .3) * 1.2);
      D.items.push({ p: [x + (w.x || 0), y, zz], phase: w.phases === false ? 1 : .3 + R(i + 31, j + 17) * .7, size: size * (.92 + R(i, j) * .16), th: clamp(.05 + d * .55 + R(i + 77, j) * .25), ck: clamp(.15 + d * .5 + R(i, j + 99) * .3), gone: clamp(.2 + d * .55 + R(i + 5, j + 5) * .2), tone: .62 + R(i + 9, j + 9) * .3, plane: [0, 0, 1], id: D.items.length });
    }
    return D;
  };
  D.swarm = sw => {
    const n = sw.n || 200, c = sw.c || [0, 2, 0];
    for (let i = 0; i < n; i++) {
      const a = R(i, 1) * TAU, el = (R(i, 2) - .25) * 1.3, d = lerp(sw.r0 ?? 8, sw.r1 ?? 60, Math.pow(R(i, 3), .7));
      const p = [c[0] + Math.cos(a) * Math.cos(el) * d, Math.max(.5, c[1] + Math.sin(el) * d), c[2] + Math.sin(a) * Math.cos(el) * d];
      const sz = lerp(sw.size?.[0] ?? .2, sw.size?.[1] ?? 6, Math.pow(R(i, 4), 3)) * (d / 30 + .4);
      D.items.push({ p, phase: sw.phases === false ? 1 : .45 + R(i, 9) * .55, size: sz, th: clamp(.1 + R(i, 5) * .9), ck: clamp(R(i, 6) * .9), gone: clamp(.1 + R(i, 7) * .85), tone: .7 + R(i, 8) * .3, id: D.items.length });
    }
    return D;
  };
  return D;
}

// draws every watcher, far to near. st: { open, crack, gone, look, threads, glow, alpha, keep (ids that stay), fog }
export function drawDomain(ctx, v, D, st = {}) {
  const open = st.open ?? 1, crack = st.crack ?? 0, gone = st.gone ?? 0, look = st.look;
  const list = [];
  for (const it of D.items) {
    if (st.only && !st.only(it)) continue;
    const q = v.p(it.p); if (!q) continue;
    const r = it.size * v.k(q[2]); if (r < .8) continue;
    if (q[0] < -r * 1.5 || q[0] > v.W + r * 1.5 || q[1] < -r || q[1] > v.H + r) continue;
    const o = clamp((open - it.th) / .12) * (it.phase ?? 1); if (o <= 0 && !it.big) continue;
    const g = clamp((gone - it.gone) / .08); if (g >= 1) continue;
    list.push({ it, q, r, o, c: clamp((crack - it.ck) / .15), g });
  }
  list.sort((a, b) => b.q[2] - a.q[2]);
  let lq = null; if (look) lq = v.p(look);
  // threads first (behind)
  if (st.threads > 0) {
    ctx.save(); ctx.strokeStyle = D.accent; ctx.lineWidth = 1.1; ctx.globalAlpha = .55 * st.threads; ctx.shadowColor = D.accent; ctx.shadowBlur = 4;
    const ln = list.filter(e => e.o > .5 && e.g < .5);
    for (let i = 0; i < ln.length; i += 3) { const a = ln[i], b = ln[(i * 7 + 11) % ln.length]; if (!b || Math.hypot(a.q[0] - b.q[0], a.q[1] - b.q[1]) > v.W * .45) continue; ctx.beginPath(); ctx.moveTo(a.q[0], a.q[1]); ctx.lineTo(lerp(a.q[0], b.q[0], st.threads), lerp(a.q[1], b.q[1], st.threads)); ctx.stroke(); }
    if (lq) for (let i = 0; i < ln.length; i += 9) { const a = ln[i]; ctx.globalAlpha = .35 * st.threads; ctx.beginPath(); ctx.moveTo(a.q[0], a.q[1]); ctx.lineTo(lerp(a.q[0], lq[0], st.threads), lerp(a.q[1], lq[1], st.threads)); ctx.stroke(); }
    ctx.restore();
  }
  const fog = st.fog ?? 0;
  for (const e of list) {
    const { it, q, r, o, c, g } = e;
    let lk = [0, 0]; if (lq) { const dx = lq[0] - q[0], dy = lq[1] - q[1], l = Math.hypot(dx, dy) || 1; lk = [dx / l * Math.min(1, l / (r * 3)), dy / l * Math.min(1, l / (r * 3))]; }
    const fogA = it.big ? 1 : clamp(1.15 - q[2] / D.fogDist, .25, 1);
    ctx.save(); ctx.globalAlpha *= (st.alpha ?? 1) * (1 - g) * (it.big ? 1 : it.tone * fogA);
    if (r > 70 || it.big) {
      ctx.translate(q[0], q[1]); ctx.scale(r, r);
      if (g > 0) { ctx.scale(1 + g * .3, 1 + g * .3); }
      D.draw(ctx, { open: it.big ? clamp(o) : o, crack: c, accent: D.accent, seed: D.seed + it.id, detail: true, glow: st.glow ?? 1, look: lk, lidW: st.lidW, eclipse: st.eclipse?.(it) ?? 0, corona: st.corona ?? 1 });
      if (c > 0) { ctx.scale(1 / r, 1 / r); for (let k = 0; k < 7; k++) spaceCrack(ctx, (hash(it.id, k) - .5) * r * .5, (hash(it.id, k + 3) - .5) * r * .3, r * (.5 + c * 1.1), hash(it.id, k + 7) * TAU, { seed: it.id * 9 + k, grow: c, w: Math.max(1.5, r * .012), col: k % 3 ? '#f6f4f0' : INK, branch: .35, glow: it.big && k % 3 === 0 ? D.accent : null }); }
    } else {
      const lvl = Math.round(o * 8), ck = Math.min(4, Math.round(c * 4)), sp = sprite(D, lvl, ck), s = r / 80 * 96;
      ctx.drawImage(sp, q[0] - s + lk[0] * r * .05, q[1] - s, s * 2, s * 2);
    }
    ctx.restore();
  }
  // fog: depth haze over the far ones (drawn as a gradient by the caller if wanted)
  return list.length;
}
