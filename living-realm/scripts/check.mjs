// living-realm · check.mjs — does the realm load clean, can it be walked, and does every state read?
//   node <skill>/scripts/check.mjs <realm-dir> [--views 4] [--size 480x270] [--q "mat=256"]
//   node <skill>/scripts/check.mjs <realm-dir> --walk      only step 2 (after moving a building or the tour): one page load;
//                                                           writes out/walk.png — solids, water, ways and the tour from above —
//                                                           and a close-up out/walk-N.png of every blocked stretch;
//                                                           --at x,z[,r] adds a close-up out/walk-at.png of that spot
// 1. the page builds and loads with no shader or script error
// 2. the world's rules: the spawn point, every view and the whole tour stand on open ground (not inside a wall, a
//    trunk or deep water), named places are inside the world, counts are within the engine's limits
// 3. every view (or the first --views of them) in day, dusk, night, rain and snow: not blank, not black, not blown;
//    night is darker than day, rain and snow change the picture, something moves in half a second
//    a clear day is not washed out or grey (warnings, with the numbers)
// 4. budgets: draw calls and triangles per view (warnings)
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
  if (LR.mat.defs.length > 48) fail.push(`${LR.mat.defs.length} materials — the engine carries 48`);
  if (!W.places.length) warn.push('no named places');
  info.push(`${LR.mat.defs.length} materials · ${W.solids.length} solids · ${W.lights.length} lights · ${W.floors.length} decks · ${W.places.length} places · built ${(W.stats.tris / 1e6).toFixed(2)} M triangles in ${W.stats.meshes} meshes`);
  return { fail, warn, info, hits: W.tourHits || [], views: (LR.cfg.views || []).map((v) => ({ name: v.name, cam: v.cam })), gpu: window.realm.info().gpu, tier: window.realm.info().tier };
});
console.log(rules.gpu + ' · tier ' + rules.tier); for (const l of rules.info) console.log(l);
fail.push(...rules.fail); warn.push(...rules.warn);
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
    console.log(`  ${(v.name + ' · ' + sn).padEnd(22)} light ${x.mean.toFixed(2)} ± ${x.sd.toFixed(2)}  sat ${x.sat.toFixed(2)}  blown ${(x.blown * 100).toFixed(1)}%  black ${(x.murk * 100).toFixed(0)}%  ${r.info.calls} calls  ${(r.info.tris / 1e6).toFixed(2)} M tris`);
    if (x.sd < 0.02) fail.push(`${v.name} · ${sn}: a blank picture`); else if (x.sd < 0.045) warn.push(`${v.name} · ${sn}: flat (light ± ${x.sd.toFixed(2)}) — fog too thick, or nothing lit against shade`);
    // flat is a number: a clear day that is bright all over, or grey all over, has lost its shade or its air (references/LOOK.md)
    if (sn === 'day' && x.mean > 0.56) warn.push(`${v.name} · day: washed out (mean light ${x.mean.toFixed(2)}, the look wants 0.40–0.46) — the sky fills the shade or the air is thick: LR.wx.key, fill, the look's fog`);
    if (sn === 'day' && x.sat < 0.13) warn.push(`${v.name} · day: grey (saturation ${x.sat.toFixed(2)}) — LR.wx.colour, or haze over everything`);
    if (x.blown > 0.2) warn.push(`${v.name} · ${sn}: ${(x.blown * 100).toFixed(0)}% blown white`); if (x.murk > 0.6) warn.push(`${v.name} · ${sn}: ${(x.murk * 100).toFixed(0)}% near black — a night still needs a readable sky and lit windows`);
    if (r.info.calls > 520) warn.push(`${v.name} · ${sn}: ${r.info.calls} draw calls into the G-buffer`); if (r.info.tris > 4.2e6) warn.push(`${v.name} · ${sn}: ${(r.info.tris / 1e6).toFixed(1)} M triangles`); }
  if (S.night.mean > S.day.mean * 0.75) fail.push(`${v.name}: night (${S.night.mean.toFixed(2)}) is not darker than day (${S.day.mean.toFixed(2)})`);
  if (diff(S.day, S.rain) < 6) fail.push(`${v.name}: rain does not change the picture`); if (diff(S.day, S.snow) < 10) fail.push(`${v.name}: snow does not change the picture`);
  if (i === 0) { const a = await shoot(page, { cam: v.cam, frames: 6, tod: 13.5, weather: 'clear', t: 20 }, 'image/jpeg'), b = await shoot(page, { cam: v.cam, frames: 6, tod: 13.5, weather: 'clear', t: 20.6 }, 'image/jpeg'); const m = diff(await stat(a.url), await stat(b.url)); console.log(`  ${v.name}: moves ${m.toFixed(2)} in 0.6 s`); if (m < 0.05) warn.push(`${v.name}: nothing moves in 0.6 s — wind, water, smoke?`); }
}
await browser.close();
for (const w of warn) console.log('warn:', w); for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK'); process.exit(fail.length ? 1 : 0);
