// living-realm · check.mjs — does the realm load clean, can it be walked, and does every state read?
//   node <skill>/scripts/check.mjs <realm-dir> [--views 4] [--size 480x270] [--q "mat=256"]
// 1. the page builds and loads with no shader or script error
// 2. the world's rules: the spawn point, every view and the whole tour stand on open ground (not inside a wall, a
//    trunk or deep water), named places are inside the world, counts are within the engine's limits
// 3. every view (or the first --views of them) in day, dusk, night, rain and snow: not blank, not black, not blown;
//    night is darker than day, rain and snow change the picture, something moves in half a second
// 4. budgets: draw calls and triangles per view (warnings)
// Exit code 1 on FAIL.  Needs Playwright Chromium; on a machine without a GPU it runs on the CPU and takes minutes.
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
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
  if (P.tour) { let worst = 0, at = null, wet = 0, wat = null, n = 0; for (let s = 0; s < P.tour.total; s += 0.5) { const t = P.tour.tab; let lo = 0, hi = t.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m][0] <= s) lo = m; else hi = m; } const u = t[lo][1] + (t[hi][1] - t[lo][1]) * ((s - t[lo][0]) / (t[hi][0] - t[lo][0] || 1)), q = P.tour.at(u); const d = stuck(q[0], q[1]); if (d > worst) { worst = d; at = q; } const w = onFloor(q[0], q[1]) ? 0 : deep(q[0], q[1]); if (w > wet) { wet = w; wat = q; } n++; }
    info.push(`tour ${P.tour.total.toFixed(0)} m (${(P.tour.total / 1.55 / 60).toFixed(1)} min), ${n} samples`);
    if (worst > 0.25) fail.push(`the tour walks through something solid near (${at[0].toFixed(1)}, ${at[1].toFixed(1)}) — ${worst.toFixed(2)} m inside`); else if (worst > 0.05) warn.push(`the tour brushes something solid near (${at[0].toFixed(1)}, ${at[1].toFixed(1)})`);
    if (wet > 0.45) fail.push(`the tour wades ${wet.toFixed(2)} m deep near (${wat[0].toFixed(1)}, ${wat[1].toFixed(1)}) — use the bridge`); }
  else warn.push('no tour: LR.start({ tour: [...] }) gives the page something to show before anyone touches it');
  for (const p of W.places) if (Math.hypot(p.x, p.z) > W.radius + p.r) warn.push(`place "${p.name}" is outside the world radius`);
  if (LR.mat.defs.length > 48) fail.push(`${LR.mat.defs.length} materials — the engine carries 48`);
  if (!W.places.length) warn.push('no named places');
  info.push(`${LR.mat.defs.length} materials · ${W.solids.length} solids · ${W.lights.length} lights · ${W.floors.length} decks · ${W.places.length} places · built ${(W.stats.tris / 1e6).toFixed(2)} M triangles in ${W.stats.meshes} meshes`);
  return { fail, warn, info, views: (LR.cfg.views || []).map((v) => ({ name: v.name, cam: v.cam })), gpu: window.realm.info().gpu, tier: window.realm.info().tier };
});
console.log(rules.gpu + ' · tier ' + rules.tier); for (const l of rules.info) console.log(l);
fail.push(...rules.fail); warn.push(...rules.warn);
const stat = (url) => page.evaluate(async (url) => { const im = new Image(); im.src = url; await im.decode(); const W = 96, H = 54, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data; let s = 0, s2 = 0, blown = 0, murk = 0; const n = d.length / 4, px = []; for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; if (l > 0.97) blown++; if (l < 0.025) murk++; px.push(d[i], d[i + 1], d[i + 2]); } return { mean: s / n, sd: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)), blown: blown / n, murk: murk / n, px }; }, url);
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.px.length; i++) s += Math.abs(a.px[i] - b.px[i]); return s / a.px.length; };
const nv = Math.min(rules.views.length, +opt('views', '3'));
if (!rules.views.length) warn.push('no views: LR.start({ views: [{ name, cam }] }) lets check.mjs and render.mjs look at the realm');
for (let i = 0; i < nv; i++) {
  const v = rules.views[i], S = {};
  for (const [sn, st] of STATES) { const r = await shoot(page, Object.assign({ cam: v.cam, frames: 6 }, st), 'image/jpeg'); S[sn] = Object.assign(await stat(r.url), { info: r.info }); const x = S[sn];
    console.log(`  ${(v.name + ' · ' + sn).padEnd(22)} light ${x.mean.toFixed(2)} ± ${x.sd.toFixed(2)}  blown ${(x.blown * 100).toFixed(1)}%  black ${(x.murk * 100).toFixed(0)}%  ${r.info.calls} calls  ${(r.info.tris / 1e6).toFixed(2)} M tris`);
    if (x.sd < 0.02) fail.push(`${v.name} · ${sn}: a blank picture`); else if (x.sd < 0.045) warn.push(`${v.name} · ${sn}: flat (light ± ${x.sd.toFixed(2)}) — fog too thick, or nothing lit against shade`);
    if (x.blown > 0.2) warn.push(`${v.name} · ${sn}: ${(x.blown * 100).toFixed(0)}% blown white`); if (x.murk > 0.6) warn.push(`${v.name} · ${sn}: ${(x.murk * 100).toFixed(0)}% near black — a night still needs a readable sky and lit windows`);
    if (r.info.calls > 520) warn.push(`${v.name} · ${sn}: ${r.info.calls} draw calls into the G-buffer`); if (r.info.tris > 4.2e6) warn.push(`${v.name} · ${sn}: ${(r.info.tris / 1e6).toFixed(1)} M triangles`); }
  if (S.night.mean > S.day.mean * 0.75) fail.push(`${v.name}: night (${S.night.mean.toFixed(2)}) is not darker than day (${S.day.mean.toFixed(2)})`);
  if (diff(S.day, S.rain) < 6) fail.push(`${v.name}: rain does not change the picture`); if (diff(S.day, S.snow) < 10) fail.push(`${v.name}: snow does not change the picture`);
  if (i === 0) { const a = await shoot(page, { cam: v.cam, frames: 6, tod: 13.5, weather: 'clear', t: 20 }, 'image/jpeg'), b = await shoot(page, { cam: v.cam, frames: 6, tod: 13.5, weather: 'clear', t: 20.6 }, 'image/jpeg'); const m = diff(await stat(a.url), await stat(b.url)); console.log(`  ${v.name}: moves ${m.toFixed(2)} in 0.6 s`); if (m < 0.05) warn.push(`${v.name}: nothing moves in 0.6 s — wind, water, smoke?`); }
}
await browser.close();
for (const w of warn) console.log('warn:', w); for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK'); process.exit(fail.length ? 1 : 0);
