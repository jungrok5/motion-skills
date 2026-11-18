// machine-wilds · check.mjs — do the machines keep the rules of a body, does the realm load clean, can it be walked, and does every state read?
//   node <skill>/scripts/check.mjs <realm-dir> [--views 4] [--size 480x270] [--q "mat=256"]
//   node <skill>/scripts/check.mjs <realm-dir> --walk      only step 2 (after moving a building or the tour): one page load;
//                                                           writes out/walk.png — solids, water, ways and the tour from above —
//                                                           and a close-up out/walk-N.png of every blocked stretch;
//                                                           --at x,z[,r] adds a close-up out/walk-at.png of that spot
// 0. the machines (gym.mjs, in Node): on the realm's own ways and over the test course — reach, bends, planted feet, soles on the
//    ground, support, cylinders, the body's accelerations, idle, moves, loop, determinism; no two machines in each other's legs
// 1. the page builds and loads with no shader or script error
// 2. the world's rules: the spawn point, every view and the whole tour stand on open ground (not inside a wall, a
//    trunk or deep water) and no stretch of it is a climb the walker cannot make, named places are inside the world, counts are
//    within the engine's limits; the machines audited again in the page; nothing solid on a machine's way
// 3. every view (or the first --views of them) in day, dusk, night, rain and snow: not blank, not black, not blown;
//    night is darker than day, rain and snow change the picture, something moves in half a second
//    a clear day is not washed out or grey (warnings, with the numbers)
// 4. budgets: draw calls and triangles per view (warnings)
// 5. the lamps in the mist: in front of a machine with a beam, at night in mist, the picture with its lamps differs from the picture without
// Exit code 1 on FAIL.  Needs Playwright Chromium; on a machine without a GPU it runs on the CPU and takes minutes.
import { resolve, join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
if (!existsSync(join(dir, 'src'))) { console.error('usage: check.mjs <realm-dir> [--views 3] [--size 480x270] [--q "mat=256"]'); process.exit(1); }
if (!args.includes('--size')) process.argv.push('--size', '480x270');
if (!args.includes('--q')) process.argv.push('--q', 'mat=256');
const { open, shoot, STATES } = await import('./render.mjs');
const fail = [], warn = [];
// 0. the machines, walked over the land in Node (seconds): every rule a body must keep, with its numbers — and the same again
//    over the test course (a ramp, a step, a side slope, a ditch, a mound), so a kind is known to cope before its way is laid
const gym = await import('./gym.mjs');
if (!args.includes('--walk')) for (const course of [false, true]) { let res; try { res = gym.run(dir, { course, dt: 0.1 }); } catch (e) { if (/no LR\.gym/.test(e.message)) { console.log('no machines (the realm sets no LR.gym)'); break; } fail.push('gym: ' + e.message); break; }
  for (const o of res.out) { for (const b of o.bad) fail.push(`${course ? 'course' : 'machines'} · ${o.unit}: ${b}`); if (o.A) console.log(`${course ? 'course ' : 'gym    '}${o.unit}: ${o.A.cycles} cycles a lap · reach ${(o.A.spanMin * 100).toFixed(0)}–${(o.A.spanMax * 100).toFixed(0)} % · slip ${(o.A.slip * 1000).toFixed(2)} mm · sole off ground ${(o.A.gap * 1000).toFixed(1)} mm · rod in barrel ≥ ${(o.A.overlapMin * 100).toFixed(0)} % · body ≤ ${o.A.bodyAcc.toFixed(2)} m/s² · ${o.bad.length ? o.bad.length + ' broken' : 'ok'}`); }
  if (!course) { const U = res.LR.mech.units; for (let i = 0; i < U.length; i++) for (let j = i + 1; j < U.length; j++) { const a = U[i], b = U[j]; if (a.post || b.post) continue; const span = Math.min(900, Math.max(a.lap, b.lap)), need = (Math.max(a.wb, a.track) + Math.max(b.wb, b.track)) * 0.62 + (a.K.spec.gait.stride + b.K.spec.gait.stride) * 0.5; let near = 1e9, at = 0;
      for (let t = 0; t < span; t += 1) { const p = res.LR.mech.cmd(a, t).body.p, q = res.LR.mech.cmd(b, t).body.p, d = Math.hypot(p[0] - q[0], p[2] - q[2]); if (d < near) { near = d; at = t; } } if (near < need) fail.push(`machines · ${a.name} and ${b.name} come within ${near.toFixed(1)} m of each other at t = ${at} s (their legs need ${need.toFixed(1)} m): space their offsets or part their ways`); } } }
let ctx; try { ctx = await open(); } catch (e) { console.error('FAIL:', e.message); process.exit(1); }
const { browser, page } = ctx;
const rules = await page.evaluate(() => {
  const LR = window.realm.LR, W = LR.world, P = LR.player, fail = [], warn = [], info = [];
  const stuck = (x, z) => { const [nx, nz] = P.collide(x, z, P.radius); return Math.hypot(nx - x, nz - z); };
  const deep = (x, z) => (LR.water ? LR.water.levelAt(x, z) - LR.land.h(x, z) : -1);
  const onFloor = (x, z) => W.floors.some((f) => { const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c; return Math.abs(lx) <= f.hx && Math.abs(lz) <= f.hz; });
  const sp = W.spawn; if (stuck(sp.x, sp.z) > 0.05) fail.push(`the spawn point (${sp.x}, ${sp.z}) is inside something solid`); if (Math.hypot(sp.x, sp.z) > W.radius) fail.push('the spawn point is outside the world radius');
  for (const v of LR.cfg.views || []) { const [x, z] = v.cam; if (stuck(x, z) > 0.3) fail.push(`view "${v.name}" stands inside something solid at (${x}, ${z})`); if (deep(x, z) > 0.8 && !onFloor(x, z)) warn.push(`view "${v.name}" stands in deep water`); }
  if (P.tour) { let worst = 0, at = null, wet = 0, wat = null, n = 0; const hits = []; let run = null; for (let s = 0; s < P.tour.total; s += 0.5) { const t = P.tour.tab; let lo = 0, hi = t.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m][0] <= s) lo = m; else hi = m; } const u = t[lo][1] + (t[hi][1] - t[lo][1]) * ((s - t[lo][0]) / (t[hi][0] - t[lo][0] || 1)), q = P.tour.at(u); const d = stuck(q[0], q[1]); if (d > worst) { worst = d; at = q; } if (d > 0.05) { if (!run) hits.push((run = { d: 0, at: q, from: s })); if (d > run.d) { run.d = d; run.at = q; } run.to = s; } else run = null; const w = onFloor(q[0], q[1]) ? 0 : deep(q[0], q[1]); if (w > wet) { wet = w; wat = q; } n++; }
    info.push(`tour ${P.tour.total.toFixed(0)} m (${(P.tour.total / 1.55 / 60).toFixed(1)} min), ${n} samples`);
    const hard = hits.filter((h) => h.d > 0.25), soft = hits.filter((h) => h.d <= 0.25);
    for (const h of hard.slice(0, 12)) fail.push(`the tour walks through something solid near (${h.at[0].toFixed(1)}, ${h.at[1].toFixed(1)}) — ${h.d.toFixed(2)} m inside, ${(h.to - h.from + 0.5).toFixed(1)} m of the way (${h.from.toFixed(0)} m along)`); if (hard.length > 12) fail.push(`… and ${hard.length - 12} more stretches of the tour inside something solid`);
    for (const h of soft.slice(0, 12)) warn.push(`the tour brushes something solid near (${h.at[0].toFixed(1)}, ${h.at[1].toFixed(1)})`);
    W.tourHits = hard.map((h) => ({ x: h.at[0], z: h.at[1], d: h.d })).concat(soft.map((h) => ({ x: h.at[0], z: h.at[1], d: h.d, soft: true })));
    if (wet > 0.45) fail.push(`the tour wades ${wet.toFixed(2)} m deep near (${wat[0].toFixed(1)}, ${wat[1].toFixed(1)}) — use the bridge`); }
  else warn.push('no tour: LR.start({ tour: [...] }) gives the page something to show before anyone touches it');
  for (const p of W.places) if (Math.hypot(p.x, p.z) > W.radius + p.r) warn.push(`place "${p.name}" is outside the world radius`);
  // the machines as the page has them (the land pressed, the ruins standing): the same audit the gym ran, coarser; nothing may stand
  // on a way; and the tour may not ask the walker up a face they cannot climb
  const mech = []; if (LR.mech && LR.mech.units.length) { const M = LR.mech; for (const s of W.solids) if (s.mech) s.r = 0;
    for (const u of M.units) { const A = M.audit(u, { dt: 0.25 }); A.needSupport = u.kin.limbs.length >= 6 ? 3 : 2; mech.push(A); }
    for (const k in M.routes) { const r = M.routes[k], hw = r.width * 0.36; let n = 0, first = null; for (let d = 0; d < r.len; d += 1.5) { const p = r.at(d); for (const s of W.solids) { if (s.mech) continue; const hit = s.r !== undefined ? Math.hypot(p[0] - s.x, p[1] - s.z) < s.r + hw : (() => { const dx = p[0] - s.x, dz = p[1] - s.z, lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c; return Math.abs(lx) < s.hx + hw && Math.abs(lz) < s.hz + hw; })(); if (hit) { n++; first = first || [s.x, s.z]; break; } } }
      if (n) fail.push(`something solid stands on the machines' way "${k}" (${n} places, the first near ${first[0].toFixed(0)}, ${first[1].toFixed(0)}): a tree, a scan or a ruin — keep them off with LR.mech.wayDist(x, z)`); }
    for (const v of [W.spawn, ...(LR.cfg.views || []).map((q) => ({ x: q.cam[0], z: q.cam[1], name: q.name }))]) if (M.wayDist(v.x, v.z) < 0 && !onFloor(v.x, v.z)) warn.push(`${v.name ? 'view "' + v.name + '"' : 'the spawn point'} stands on a machine's way`);
    const K = {}; for (const u of M.units) K[u.kind] = u.K; info.push('machines: ' + Object.keys(K).map((k) => `${M.units.filter((u) => u.kind === k).length} × ${k} (${K[k].kin.nb} bones, ${K[k].tris.map((t) => Math.round(t / 1000) + 'k').join(' / ')} triangles)`).join(' · ') + ` · ${Object.keys(M.routes).length} ways`); }
  if (P.tour) { let worst = 0, at = null; for (let s = 0; s < P.tour.total; s += 0.5) { const a = P.tourPose(s).cam, b = P.tourPose(s + 0.5).cam, ga = P.groundAt(a[0], a[1]), gb = P.groundAt(b[0], b[1]); if (ga.surf || gb.surf) continue; const g = (gb.y - ga.y) / Math.max(0.05, Math.hypot(b[0] - a[0], b[1] - a[1])); if (g > worst) { worst = g; at = a; } }
    info.push(`the tour's steepest climb is ${(Math.atan(worst) * 57.3).toFixed(0)}°`); if (worst > 0.94) fail.push(`the tour climbs a face of ${(Math.atan(worst) * 57.3).toFixed(0)}° near (${at[0].toFixed(0)}, ${at[1].toFixed(0)}): a walker cannot (43° is the most)`); }
  if (LR.mat.defs.length > 48) fail.push(`${LR.mat.defs.length} materials — the engine carries 48`);
  if (!W.places.length) warn.push('no named places');
  // the scans: every surface and object the realm names must have arrived (a missing one is drawn from its generated
  // recipe, which is a different picture), and the copies of scanned objects must fit the triangle budget
  { const M = LR.mat, MD = LR.models, want = M.defs.filter((d) => d.photo).length, got = M.scanned || 0;
    if (!LR.ASSETS) warn.push('no assets/manifest.json — the place is drawn from its generated recipes and props only: run fetch-assets.mjs (assets.json names the scans), then build again');
    if (M.missed && M.missed.length) fail.push(`scans that did not arrive: ${M.missed.join(', ')} — run fetch-assets.mjs again (or the page was opened from file:// in a browser)`);
    if (MD.failed.length) fail.push(`scanned models that did not load: ${MD.failed.join(', ')}`);
    // whole trees: tens of megabytes and up to a million triangles each — they must be marked heavy (phones and the lowest quality leave them out) and must have their levels
    if (LR.ASSETS) for (const id in MD.opt) { const a = LR.ASSETS.models[id], o = MD.opt[id]; if (!a) continue; if (!a.heavy && a.bytes > 15e6) warn.push(`${id} is ${Math.round(a.bytes / 1e6)} MB and not marked "heavy" in assets.json — every phone will fetch it`);
      if (o.tree) { const d = MD.live.find((q) => q.model === id); if (d && d.nl < 5) warn.push(`${id} is a tree with ${d.nl} levels of detail (5 or 7 expected)`); else if (d && d.tri[d.nl - 1] > Math.max(4000, d.tri[0] * 0.03)) warn.push(`${id}: its farthest level still has ${d.tri[d.nl - 1]} triangles`); } }
    if (MD.skipped.length) info.push(`heavy scans left out on this device: ${MD.skipped.join(', ')}`);
    { const flat = MD.live.filter((d) => !d.plant && d.tris > 12000 && d.nl < 3).map((d) => `${d.id} (${Math.round(d.tris / 1000)}k triangles, ${d.nl} level${d.nl > 1 ? 's' : ''})`); if (flat.length) warn.push(`dense scans that could not be simplified — every copy is drawn whole: ${flat.join(', ')}`); }
    // … and must have something in them: a layer or a model's map that baked empty draws black (seen when a bake's
    // sources were freed before a software renderer had carried the bake out) — read the smallest copy of each
    { const R = LR.gpu.renderer, gl = R.getContext(), fb = gl.createFramebuffer(), px = new Uint8Array(4), empty = []; gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      const top = (size) => Math.floor(Math.log2(size)), blank = () => { if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false; px.fill(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return px[0] + px[1] + px[2] + px[3] === 0; };
      if (M.A) { const t = R.properties.get(M.A.texture).__webglTexture; M.defs.forEach((d, i) => { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, top(M.size), i); if (blank()) empty.push('material ' + d.name); }); }
      for (const k in MD.mats) { const m = MD.mats[k], t = R.properties.get(m.tex.A).__webglTexture; gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, top(m.tex.size)); if (blank()) empty.push('model ' + k); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); R.resetState();
      if (empty.length) fail.push(`baked empty (drawn black): ${empty.slice(0, 12).join(', ')}${empty.length > 12 ? ', …' : ''}`); }
    if (LR.ASSETS) { const by = Object.entries(MD.by).sort((a, b) => b[1][0] - a[1][0]);
      info.push(`scans: ${got} of ${want} surfaces · ${by.length} models in ${MD.placed} copies` + (by.length ? ' — ' + by.slice(0, 10).map(([k, v]) => `${k} ×${v[0]}`).join(', ') + (by.length > 10 ? ', …' : '') : '')); } }
  info.push(`${LR.mat.defs.length} materials · ${W.solids.length} solids · ${W.lights.length} lights · ${W.floors.length} decks · ${W.places.length} places · built ${(W.stats.tris / 1e6).toFixed(2)} M triangles in ${W.stats.meshes} meshes`);
  return { fail, warn, info, mech, hits: W.tourHits || [], views: (LR.cfg.views || []).map((v) => ({ name: v.name, cam: v.cam })), gpu: window.realm.info().gpu, tier: window.realm.info().tier };
});
console.log(rules.gpu + ' · tier ' + rules.tier); for (const l of rules.info) console.log(l);
fail.push(...rules.fail); warn.push(...rules.warn);
for (const A of rules.mech || []) for (const b of gym.judge(A)) fail.push(`in the page · ${A.unit}: ${b}`);
// the walk map: what the walker can bump into, seen from above, with the tour drawn on it — written by --walk (and
// whenever the tour fails), so a blocked stretch can be seen and moved instead of guessed at
const drawMap = (o) => page.evaluate((o) => {
  const LR = window.realm.LR, W = LR.world, P = LR.player, L = LR.land;
  const { x0, z0, x1, z1, s } = o, c = document.createElement('canvas'); c.width = Math.round((x1 - x0) * s); c.height = Math.round((z1 - z0) * s);
  const g = c.getContext('2d'), X = (x) => (x - x0) * s, Z = (z) => (z - z0) * s;
  const cell = Math.max(0.5, 2 / s), cv = (n, x, z) => { try { return L.coverAt(n, x, z); } catch { return 0; } };
  for (let z = z0; z < z1; z += cell) for (let x = x0; x < x1; x += cell) {
    const cx = x + cell / 2, cz = z + cell / 2, deep = LR.water ? LR.water.levelAt(cx, cz) - L.h(cx, cz) : -1;
    g.fillStyle = deep > 0.45 ? '#5d93c4' : deep > 0.05 ? '#9cc3e2' : cv('paved', cx, cz) > 0.5 ? '#d9d2c6' : cv('dirt', cx, cz) > 0.45 ? '#d2b98c' : cv('litter', cx, cz) > 0.5 ? '#a9bd8c' : '#c3d9a4';
    g.fillRect(X(x), Z(z), cell * s + 1, cell * s + 1);
  }
  g.strokeStyle = 'rgba(0,0,0,0.13)'; g.fillStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1; g.font = '11px sans-serif';
  const gr = s >= 8 ? 5 : s >= 3 ? 10 : 50;
  for (let x = Math.ceil(x0 / gr) * gr; x < x1; x += gr) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), c.height); g.stroke(); g.fillText(x, X(x) + 2, 11); }
  for (let z = Math.ceil(z0 / gr) * gr; z < z1; z += gr) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(c.width, Z(z)); g.stroke(); g.fillText(z, 2, Z(z) - 2); }
  for (const f of W.floors) { g.save(); g.translate(X(f.x), Z(f.z)); g.transform(f.c, -f.s, f.s, f.c, 0, 0); g.fillStyle = 'rgba(150,105,60,0.55)'; g.fillRect(-f.hx * s, -f.hz * s, f.hx * 2 * s, f.hz * 2 * s); g.restore(); }
  g.fillStyle = '#3b4048';
  for (const b of W.solids) {
    if (b.r !== undefined) { g.beginPath(); g.arc(X(b.x), Z(b.z), Math.max(1, b.r * s), 0, 7); g.fill(); }
    else { g.save(); g.translate(X(b.x), Z(b.z)); g.transform(b.c, -b.s, b.s, b.c, 0, 0); g.fillRect(-b.hx * s, -b.hz * s, b.hx * 2 * s, b.hz * 2 * s); g.restore(); }
  }
  if (P.tour) {
    g.strokeStyle = '#0a8f4e'; g.lineWidth = Math.max(1.5, P.radius * 2 * s); g.globalAlpha = 0.5; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0, n = P.tour.pts.length * 24; i <= n; i++) { const q = P.tour.at((i / n) * P.tour.pts.length); if (i) g.lineTo(X(q[0]), Z(q[1])); else g.moveTo(X(q[0]), Z(q[1])); }
    g.stroke(); g.globalAlpha = 1; g.font = 'bold 11px sans-serif';
    P.tour.pts.forEach((p, i) => { g.fillStyle = '#075c33'; g.beginPath(); g.arc(X(p.x), Z(p.z), 3, 0, 7); g.fill(); g.fillText(i, X(p.x) + 5, Z(p.z) - 4); });
  }
  g.font = '11px sans-serif';
  for (const v of LR.cfg.views || []) { const [x, z, yaw] = v.cam, a = (yaw || 0) * Math.PI / 180; g.strokeStyle = g.fillStyle = '#7a3fb0'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x) + Math.sin(a) * 16, Z(z) - Math.cos(a) * 16); g.stroke(); g.beginPath(); g.arc(X(x), Z(z), 3.5, 0, 7); g.fill(); g.fillText(v.name, X(x) + 6, Z(z) + 12); }
  for (const h of o.hits || []) { g.strokeStyle = h.soft ? '#e08a00' : '#e02020'; g.lineWidth = 2.5; g.beginPath(); g.arc(X(h.x), Z(h.z), Math.max(7, 1.2 * s), 0, 7); g.stroke(); }
  return c.toDataURL('image/png');
}, o);
const saveMap = (name, o) => drawMap(o).then((url) => { const out = join(dir, 'out'); mkdirSync(out, { recursive: true }); writeFileSync(join(out, name), Buffer.from(url.split(',')[1], 'base64')); return join(out, name); });
if (args.includes('--walk') || rules.hits.some((h) => !h.soft)) {
  const R = await page.evaluate(() => window.realm.LR.world.radius), s = Math.min(8, 1500 / (R * 2));
  console.log('walk map → ' + await saveMap('walk.png', { x0: -R, z0: -R, x1: R, z1: R, s, hits: rules.hits }));
  if (opt('at')) { const [ax, az, ar = 15] = opt('at').split(',').map(Number); console.log(`  (${ax}, ${az}) → ` + await saveMap('walk-at.png', { x0: ax - ar, z0: az - ar, x1: ax + ar, z1: az + ar, s: 300 / ar, hits: [] })); }
  let k = 0; for (const h of rules.hits.slice(0, 12)) console.log(`  (${h.x.toFixed(1)}, ${h.z.toFixed(1)}) → ` + await saveMap(`walk-${++k}.png`, { x0: h.x - 15, z0: h.z - 15, x1: h.x + 15, z1: h.z + 15, s: 20, hits: [h] }));
}
const stat = (url) => page.evaluate(async (url) => { const im = new Image(); im.src = url; await im.decode(); const W = 96, H = 54, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data; let s = 0, s2 = 0, blown = 0, murk = 0, sat = 0; const n = d.length / 4, px = []; for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; if (l > 0.97) blown++; if (l < 0.025) murk++; const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); sat += mx ? (mx - mn) / mx : 0; px.push(d[i], d[i + 1], d[i + 2]); } return { mean: s / n, sd: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)), blown: blown / n, murk: murk / n, sat: sat / n, px }; }, url);
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.px.length; i++) s += Math.abs(a.px[i] - b.px[i]); return s / a.px.length; };
const nv = args.includes('--walk') ? 0 : Math.min(rules.views.length, +opt('views', '3'));
if (!rules.views.length) warn.push('no views: LR.start({ views: [{ name, cam }] }) lets check.mjs and render.mjs look at the realm');
for (let i = 0; i < nv; i++) {
  const v = rules.views[i], S = {};
  for (const [sn, st] of STATES) { const r = await shoot(page, Object.assign({ cam: v.cam, frames: 6 }, st), 'image/jpeg'); S[sn] = Object.assign(await stat(r.url), { info: r.info }); const x = S[sn];
    console.log(`  ${(v.name + ' · ' + sn).padEnd(22)} light ${x.mean.toFixed(2)} ± ${x.sd.toFixed(2)}  sat ${x.sat.toFixed(2)}  blown ${(x.blown * 100).toFixed(1)}%  black ${(x.murk * 100).toFixed(0)}%  ${r.info.calls} calls (${r.info.shadowCalls || 0} shadow)  ${(r.info.tris / 1e6).toFixed(2)} M tris` + (r.info.scans && r.info.scans.inst ? `  scans ${r.info.scans.inst} × ${(r.info.scans.tris / 1e6).toFixed(2)} M` : ''));
    if (x.sd < 0.02) fail.push(`${v.name} · ${sn}: a blank picture`); else if (x.sd < 0.045) warn.push(`${v.name} · ${sn}: flat (light ± ${x.sd.toFixed(2)}) — fog too thick, or nothing lit against shade`);
    // flat is a number: a clear day that is bright all over, or grey all over, has lost its shade or its air (references/LOOK.md)
    if (sn === 'day' && x.mean > 0.56) warn.push(`${v.name} · day: washed out (mean light ${x.mean.toFixed(2)}, the look wants 0.40–0.46) — the sky fills the shade or the air is thick: LR.wx.key, fill, the look's fog`);
    if (sn === 'day' && x.sat < 0.13) warn.push(`${v.name} · day: grey (saturation ${x.sat.toFixed(2)}) — LR.wx.colour, or haze over everything`);
    if (x.blown > 0.2) warn.push(`${v.name} · ${sn}: ${(x.blown * 100).toFixed(0)}% blown white`); if (x.murk > 0.6) warn.push(`${v.name} · ${sn}: ${(x.murk * 100).toFixed(0)}% near black — a night still needs a readable sky and lit windows`);
    if (r.info.calls > 580) warn.push(`${v.name} · ${sn}: ${r.info.calls} draw calls (${r.info.shadowCalls || 0} of them the shadow cascades — a still draws all three, the live page one or two a frame)`); if (r.info.tris > 4.2e6) warn.push(`${v.name} · ${sn}: ${(r.info.tris / 1e6).toFixed(1)} M triangles`); }
  if (S.night.mean > S.day.mean * 0.75) fail.push(`${v.name}: night (${S.night.mean.toFixed(2)}) is not darker than day (${S.day.mean.toFixed(2)})`);
  if (diff(S.day, S.rain) < 6) fail.push(`${v.name}: rain does not change the picture`); if (diff(S.day, S.snow) < 10) fail.push(`${v.name}: snow does not change the picture`);
  if (i === 0) { const a = await shoot(page, { cam: v.cam, frames: 6, tod: 13.5, weather: 'clear', t: 20 }, 'image/jpeg'), b = await shoot(page, { cam: v.cam, frames: 6, tod: 13.5, weather: 'clear', t: 20.6 }, 'image/jpeg'); const m = diff(await stat(a.url), await stat(b.url)); console.log(`  ${v.name}: moves ${m.toFixed(2)} in 0.6 s`); if (m < 0.05) warn.push(`${v.name}: nothing moves in 0.6 s — wind, water, smoke?`); }
}
// 5. the lamps in the mist: stand in front of a machine that carries a beam, on a misty night — the picture with its lamps must
//    differ from the picture without them (a cone in the air, light on the ground), or the valley has lost what it is about
if (nv > 0 && (rules.mech || []).length) { const cam = await page.evaluate(() => { const LR = window.realm.LR, M = LR.mech, u = M.units.find((q) => q.lampDefs.some((l) => l.beam)); if (!u) return null; const t = 40, r = M.poseAt(u, t), b = r.W.body.p, h = r.cmd.h, k = u.K.spec.ride * 3.2, x = b[0] + Math.cos(h) * k - Math.sin(h) * 5, z = b[2] + Math.sin(h) * k + Math.cos(h) * 5, tg = (r.W.head || r.W.body).p;
    return { name: u.name, t, cam: [x, z, (Math.atan2(tg[0] - x, -(tg[2] - z)) * 180) / Math.PI, (Math.atan2(tg[1] - LR.land.h(x, z) - 1.7, Math.hypot(tg[0] - x, tg[2] - z)) * 180) / Math.PI * 0.6] }; });
  if (!cam) warn.push('no machine carries a beam (k.lamp with a cone): nothing cuts the mist');
  else { const st = { cam: cam.cam, frames: 6, tod: 23, weather: 'mist', t: cam.t }, a = await stat((await shoot(page, st, 'image/jpeg')).url); await page.evaluate(() => window.realm.LR.off.add('lamps')); const b = await stat((await shoot(page, st, 'image/jpeg')).url); await page.evaluate(() => window.realm.LR.off.delete('lamps'));
    const d = diff(a, b); console.log(`  lamps in the mist (${cam.name}): the picture changes by ${d.toFixed(2)} with them, light ${b.mean.toFixed(3)} → ${a.mean.toFixed(3)}`); if (d < 0.6) fail.push(`the lamps of ${cam.name} do not show in the mist (the picture changes by ${d.toFixed(2)}): raise their power or the mist (LR.wx.looks.mist.fog)`); } }
await browser.close();
for (const w of warn) console.log('warn:', w); for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK'); process.exit(fail.length ? 1 : 0);
