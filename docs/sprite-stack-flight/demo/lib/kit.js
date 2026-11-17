// sprite-stack-flight · lib/kit.js — parts you build a topic from (window.SK). Nothing here is a finished craft, world
// or cockpit: a piece composes these with its own sizes, colours and shapes (see the examples). Add your own parts in the
// piece itself; the kit never needs editing.
(function () {
'use strict';
const SK = {}, TAU = Math.PI * 2, clamp = SS.clamp, lerp = SS.lerp;

// ================= terrain =================
// colour by terrace level: [[maxLevel, colour | [colourA, colourB] (dithered 50/50 by cell)], …]; level ≤ 0 is water
SK.bands = list => (lv, x, y, i) => { for (const [m, c] of list) if (lv <= m) return Array.isArray(c) ? c[i.rnd < (c[2] ?? .5) ? 0 : 1] : c; const c = list[list.length - 1][1]; return Array.isArray(c) ? c[0] : c; };
// island mask: smooth bumps around centres [[x, y, radius, height], …] on a wrapped world, plus noise
SK.blobs = (n, x, y, list) => { let h = -1e9; for (const [cx, cy, r, ht] of list) { const d = n.dist(x, y, cx, cy) / r; h = Math.max(h, ht * (1 - d * d)); } return h; };
// scatter: `count` tries at random cells; `where(x, y, W)` says yes; `stamp(W, x, y, r)` draws
SK.scatter = (W, o) => { const r = W.rng; let n = 0; for (let k = 0; k < o.count; k++) { const x = Math.floor(r() * W.N), y = Math.floor(r() * W.N); if (!o.where || o.where(x, y, W)) { o.stamp(W, x, y, r); n++; } } return n; };
// a voxel tree: a plus-shaped crown of 5–9 cells raised `h` levels, lit from the north-west
SK.tree = (W, x, y, o = {}) => { const h = o.h ?? 2, dark = o.dark || '#1f5a2a', mid = o.mid || '#2f7d33', lite = o.lite || '#56a83c', big = o.big;
  const cells = big ? [[0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, -1, 1], [0, 1, 0], [-1, -1, 1], [1, 1, 0], [1, -1, 0], [-1, 1, 0]] : [[0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, -1, 1], [0, 1, 0]];
  for (const [dx, dy, top] of cells) W.stamp(x + dx, y + dy, h + (top ? 1 : 0), top ? (dx + dy < 0 ? lite : mid) : (dx + dy < 0 ? mid : dark), o.side || dark); };
// a pine: a tall narrow stack (1 cell + a shoulder ring)
SK.pine = (W, x, y, o = {}) => { const h = o.h ?? 4, dark = o.dark || '#1d3b30', lite = o.lite || '#2f5a46', snow = o.snow;
  W.stamp(x, y, h + 2, snow || lite, dark); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) W.stamp(x + dx, y + dy, h, dx + dy < 0 ? (snow || lite) : dark, dark); };
SK.rock = (W, x, y, o = {}) => { const r = o.r ?? 2, h = o.h ?? 3, c = o.color || '#8a8580', s = o.side || '#5f5a58';
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j) / (r + .5); if (d < 1) W.stamp(x + i, y + j, Math.max(1, Math.round(h * (1 - d * d))), i + j < 0 ? SS.shade(SS.hex(c), 1.1) : c, s); } };
// a house: w × d cells, wall height, roof colour along the ridge
SK.house = (W, x, y, o = {}) => { const w = o.w ?? 3, d = o.d ?? 2, h = o.h ?? 2, roof = o.roof || '#b5473a', ridge = o.ridge || SS.css(SS.shade(SS.hex(roof), 1.2)), wall = o.wall || '#e9e0cf';
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) W.stamp(x + i, y + j, h + (j === Math.floor(d / 2) ? 1 : 0), j === Math.floor(d / 2) ? ridge : roof, wall); };

// ================= craft parts (voxel builders on a model M) =================
// coordinates: x across (port → starboard), y along (0 = nose), z up. `c` may be a colour or (x,y,z) => colour.
// a fuselage: a tube from y0 to y1 with a radius profile r(u) (u = 0 at the nose); squash < 1 = flatter
SK.fuselage = (M, o) => M.tube(o.cx ?? M.w / 2 - .5, o.cz, o.y0, o.y1, o.r, o.color, o.squash ?? 1);
// a pair of wings (mirrored): root at x = cx ± root, span to the tip, chord root → tip, sweep (tip moves back), thickness
SK.wings = (M, o) => { const cx = o.cx ?? M.w / 2 - .5, y = o.y, sw = o.sweep || 0, z0 = o.z, z1 = o.z + (o.thick ?? 1) - 1;
  for (const s of [-1, 1]) { const r = cx + s * (o.root ?? 0), t = cx + s * (o.span); M.plate([[r, y], [t, y + sw], [t, y + sw + o.tip], [r, y + o.chord]], z0, z1, o.color); } };
// a vertical fin: profile in (y, z): base from y0 to y1 at z0, top edge from yt0 to yt1 at z1
SK.fin = (M, o) => { const cx = Math.round(o.cx ?? M.w / 2 - .5), th = o.thick ?? 1; M.fin([[o.y0, o.z0], [o.y1, o.z0], [o.yt1, o.z1], [o.yt0, o.z1]], cx - Math.floor((th - 1) / 2), cx + Math.ceil((th - 1) / 2), o.color); };
// a propeller in front of the nose: frame f of n: two blades at angle f·π/n, plus a dithered disc when spinning
SK.prop = (M, f, o) => { const cx = o.cx ?? M.w / 2 - .5, cz = o.cz, y = o.y, r = o.r, a = f * Math.PI / (o.frames || 3);
  for (let k = -r; k <= r; k++) M.set(cx + Math.cos(a) * k, y, cz + Math.sin(a) * k * (o.squash ?? 1), o.color || '#3a3530');
  if (o.disc) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r && ((i + j + f) % 3 === 0)) M.set(cx + i, y, cz + j, o.disc);
  if (o.spinner) M.set(cx, y - 1, cz, o.spinner); };
// the two navigation lights: red on the port tip, green on the starboard tip (the check reads them)
SK.navLights = (M, o) => { const cx = o.cx ?? M.w / 2 - .5; M.light('port', cx - o.x, o.y, o.z, o.port || '#ff2a3a'); M.light('starboard', cx + o.x, o.y, o.z, o.starboard || '#2aff6a'); };
// an envelope (airship / balloon): an ellipsoid with optional panel stripes every `panel` voxels along y
SK.envelope = (M, o) => M.ell(o.cx ?? M.w / 2 - .5, o.cy, o.cz, o.rx, o.ry, o.rz, o.panel ? (x, y, z) => (Math.floor(y / o.panel) % 2 ? o.color : o.alt) : o.color);
// a flame / exhaust behind the tail: frame-dependent length, hot core → cool tip
SK.flame = (M, f, o) => { const cx = o.cx ?? M.w / 2 - .5, len = o.len[f % o.len.length]; for (let k = 0; k < len; k++) { const c = k < len * .35 ? o.core || '#fff6c8' : k < len * .7 ? o.mid || '#ffb43c' : o.tip || '#ff5a28'; const r = (o.r ?? 1) * (1 - k / (len + 1));
  for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) if (i * i + j * j <= r * r + .3) M.glow(cx + i, o.y + k, o.cz + j, c); } };

// ================= cockpit + HUD parts (painter P, state s) =================
// a canopy frame: a thick arch across the top with highlight and rivets, and two posts
SK.canopy = (P, o) => { const W = 480, cx = o.cx ?? W / 2, cy = o.cy ?? 300, r = o.r ?? 330, th = o.thick ?? 14, c = o.color || '#3a3440', hi = o.hi || '#5a5260', lo = o.lo || '#24202a';
  P.ring(cx, cy, r, r + th, c, -Math.PI, 0); P.ring(cx, cy, r + th - 2, r + th, lo, -Math.PI, 0); P.ring(cx, cy, r, r + 2, hi, -Math.PI, 0);
  if (o.accent) for (const a of o.accent) P.ring(cx, cy, r + 3, r + th - 3, o.accentColor || '#e0602a', a[0], a[1]);
  for (let a = -Math.PI + .08; a < 0; a += .16) P.px(cx + Math.cos(a) * (r + th / 2), cy + Math.sin(a) * (r + th / 2), hi); };
// a dashboard slab from y down, with a lip and a dithered top shadow
SK.dash = (P, o) => { const W = 480, H = 270, y = o.y, c = o.color || '#2b2730', lip = o.lip || '#4a4450', sh = o.shadow || '#1a171e';
  if (o.shape) P.poly(o.shape, c); else P.rect(0, y, W, H - y, c);
  P.rect(0, y, W, 2, lip); P.dither(0, y + 2, W, 4, sh, .5); };
// a round dial: value 0..1 sweeps a0..a1; ticks; needle
SK.gauge = (P, x, y, r, v, o = {}) => { const a0 = o.a0 ?? Math.PI * .75, a1 = o.a1 ?? Math.PI * 2.25, face = o.face || '#1d1b22', rim = o.rim || '#6a6270', tick = o.tick || '#d8d2c0', needle = o.needle || '#ff7a3a';
  P.disc(x, y, r + 1, rim); P.disc(x, y, r - 1, face);
  const n = o.ticks ?? 8; for (let k = 0; k <= n; k++) { const a = lerp(a0, a1, k / n); P.px(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), tick); }
  const a = lerp(a0, a1, clamp(v, 0, 1)); P.line(x, y, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3), needle); P.px(x, y, rim);
  if (o.label) P.text(o.label, x, y + r + 3, o.labelColor || '#8f889a', 1, 'center'); };
// an attitude ball: sky / ground split rotated by bank, shifted by pitch
SK.attitude = (P, x, y, r, s, o = {}) => { const sky = o.sky || '#5ab0e8', gnd = o.ground || '#8a5a32', line = o.line || '#ffffff', rim = o.rim || '#6a6270', mark = o.mark || '#ffb02a';
  const ctx = P.ctx, c = Math.cos(-s.bank), sn = Math.sin(-s.bank), off = clamp(s.th * r * 1.6, -r, r);
  ctx.fillStyle = SS.css(SS.hex(rim)); P.disc(x, y, r + 2, rim);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (i * i + j * j > r * r) continue; const v = -i * sn + j * c - off; P.px(x + i, y + j, Math.abs(v) < .6 ? line : v < 0 ? sky : gnd); }
  P.rect(x - r + 3, y, r - 5, 1, mark); P.rect(x + 3, y, r - 5, 1, mark); P.px(x, y, mark); };
// a radar / map screen: the world's colours around the craft, heading up, tinted
SK.radar = (P, x, y, w, h, s, F, o = {}) => { const k = o.zoom ?? 3, tint = SS.hex(o.tint || '#38ff8a'), bg = SS.hex(o.bg || '#06140c'), sw = Math.sin(s.psi), cw = Math.cos(s.psi);
  const ctx = P.ctx; P.rect(x - 1, y - 1, w + 2, h + 2, o.rim || '#4a4450');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = (i - w / 2) * k, v = (j - h * .62) * k, wx = s.x + u * cw - v * sw, wy = s.y + u * sw + v * cw, land = F.terrainAt(wx, wy) > 0;
    const c = land ? SS.mix(bg, tint, .35 + Math.min(.55, F.terrainAt(wx, wy) / 60)) : ((i + j) % 2 && (j % 6 === 0 || i % 6 === 0) ? SS.mix(bg, tint, .18) : bg); ctx.fillStyle = SS.css(c); ctx.fillRect(x + i, y + j, 1, 1); }
  const sweep = ((s.t || 0) * 1.4) % TAU, cx = x + w / 2, cy = y + h * .62; P.line(cx, cy, cx + Math.cos(sweep) * w * .45, cy + Math.sin(sweep) * h * .45, SS.mix(bg, tint, .8));
  P.px(cx, cy - 1, '#ffffff'); P.px(cx - 1, cy, '#ffffff'); P.px(cx + 1, cy, '#ffffff'); P.px(cx, cy, '#ffffff'); };
// a number readout in a small screen
SK.readout = (P, x, y, text, o = {}) => { const w = SS.textWidth(String(text), o.k || 1) + 6; P.rect(x - 1, y - 1, w + 2, 9 * (o.k || 1) - 1, o.rim || '#4a4450'); P.rect(x, y, w, 7 * (o.k || 1), o.bg || '#06140c'); P.text(text, x + 3, y + 1, o.color || '#7dff9a', o.k || 1); };
// a green head-up display: pitch ladder rotated with bank, heading tape, speed / altitude boxes
SK.hudLadder = (P, s, o = {}) => { const W = 480, cx = o.cx ?? W / 2, cy = o.cy ?? 112, c = o.color || '#7dff9a', step = o.step ?? 22, span = o.span ?? 30;
  const cb = Math.cos(-s.bank), sb = Math.sin(-s.bank), rotp = (x, y) => [cx + x * cb - y * sb, cy + x * sb + y * cb];
  for (let k = -3; k <= 3; k++) { const deg = Math.round(s.th * 180 / Math.PI / 10) * 10 + k * 10, y = (s.th * 180 / Math.PI - deg) * step / 10;
    if (Math.abs(y) > (o.clip ?? 60)) continue; const a = rotp(-span, y), b = rotp(-8, y), e = rotp(8, y), d = rotp(span, y);
    P.line(a[0], a[1], b[0], b[1], c, deg < 0 ? 2 : 1); P.line(e[0], e[1], d[0], d[1], c, deg < 0 ? 2 : 1); if (deg) P.text(Math.abs(deg), d[0] + 3, d[1] - 2, c); }
  P.line(cx - 6, cy, cx - 2, cy + 3, c); P.line(cx - 2, cy + 3, cx + 2, cy + 3, c); P.line(cx + 2, cy + 3, cx + 6, cy, c);
  const hd = s.heading ?? ((s.psi * 180 / Math.PI) % 360 + 360) % 360; for (let k = -4; k <= 4; k++) { const v = Math.round(hd / 10) * 10 + k * 10, x = cx + (v - hd) * 2.2; P.rect(x, cy - (o.tape ?? 64), 1, v % 30 ? 2 : 4, c); if (v % 30 === 0) P.text(String(((v % 360) + 360) % 360 / 10).padStart(2, '0'), x, cy - (o.tape ?? 64) - 7, c, 1, 'center'); }
  if (o.speed !== false) { P.text(Math.round(s.v * (o.kts ?? 12)), cx - span - 30, cy - 2, c, 1, 'right'); P.text(Math.round(s.z * (o.ft ?? 30)), cx + span + 30, cy - 2, c, 1, 'left'); } };

window.SK = SK;
})();
