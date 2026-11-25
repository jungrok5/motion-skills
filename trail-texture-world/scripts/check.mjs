// trail-texture-world · check.mjs — proves a piece before you render it. Prints `ok` lines, numbers, or FAIL.
//   node <skill>/scripts/check.mjs index.html [--step .25]
//  1 loads with no page errors / console errors / failed requests (film, ?sheet=cast, ?map=1)
//  2 every step draws; no blank frame; no frame flooded by one colour
//  3 deterministic: the same t gives the same pixels, also after seeking elsewhere
//  4 THE TRAIL: every terrain the walk touches that says it reads the texture changes pixels because of it (frame with the
//    trail vs the same frame with ?off=trail, walker masked out), each in its own way (the colours it adds differ from
//    every other terrain's), the memory lasts (numbers at +0.3 s, +2 s, +6 s), and the texture itself is shown at least once
//  5 the body: planted feet never move (drift), prints sit exactly under the feet, legs never stretch past their reach,
//    the left foot stays left of the line of travel, the facing follows the travel, the root never jumps (teleport)
//  6 weight: every start gathers first, every hop gathers and recovers, acceleration within mass, idles breathe (pixels
//    change while it stands), followers (scarf, lantern, tail) lag behind
//  7 the format: 12–120 s, ≥ 3 steps, a title, captions that fit
//  8 code-only: no <img>, no image / video / model URLs, no Math.random / Date in the page; size of page + lib
//  9 the route keeps off solid props and inside the world; speed: a frame in each view fast enough for 30 fps live
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html> [--step .25]'); process.exit(1); }
const step = +opt('step', .25);
let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, ok = m => console.log('ok   ' + m), info = m => console.log('     ' + m);

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function open(q) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }), errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
  page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
  await page.goto(pathToFileURL(page$).href + '?render=1' + (q ? '&' + q : ''), { waitUntil: 'load', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (errors.length || Date.now() - t0 > 60000) break; await new Promise(r => setTimeout(r, 50)); }
  return { page, errors };
}
const main = await open('');
const extra = [await open('sheet=cast'), await open('map=1')];
const errs = [main, ...extra].flatMap(p => p.errors);
if (errs.length) { fail('loading: ' + errs.join(' | ')); await browser.close(); process.exit(1); } else ok('loads with no errors (film, cast sheet, route map)');
const page = main.page;
const DUR = await page.evaluate(() => window.DURATION), PX = await page.evaluate(() => window.PIXEL);
const T = await page.evaluate(() => { const T = window.TRAIL; return { HZ: T.HZ, steps: T.steps, walker: T.walker, world: T.world, matUse: T.matUse, title: T.title, n: T.samples.length, stamps: T.stamps }; });
info(`${DUR} s, ${T.steps.length} steps, ${T.stamps.filter(s => s.kind === 'foot').length} footprints on ` + Object.entries(T.matUse).map(([m, c]) => `${m} ${c}`).join(', ') + ` · ${T.world.blades} blades, ${T.world.litter} litter`);

// 2: draws, blanks
const thrown = new Map(), blank = [], flooded = [];
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => { // the film as it plays (any view), then the world view unlit (a flood hides under night light), read for blanks / floods
    try { window.TRAIL.setView(null); window.seek(t); window.TRAIL.setView('world'); window.TRAIL.setOff(['light']); window.seek(t); } catch (e) { return { err: e.message }; } finally { window.TRAIL.setOff([]); window.TRAIL.setView(null); }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set();
    const cnt = new Map(); let k = 0; for (let i = 0; i < d.length; i += 4 * 37) { const v = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); seen.add(v); cnt.set(v, (cnt.get(v) || 0) + 1); k++; }
    return { colours: seen.size, flood: Math.max(...cnt.values()) / k }; }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.colours < 10) blank.push(t.toFixed(2));
  if (r.flood > .8) flooded.push(`${t.toFixed(2)} (${Math.round(r.flood * 100)}%)`);
}
if (thrown.size) for (const [m, t] of thrown) fail(`throws at t=${t}: ${m}`); else ok(`every step draws (every ${step} s)`);
if (blank.length) fail(`blank / flat frames at t = ${blank.slice(0, 6).join(', ')}`); else ok('no blank frames');
if (flooded.length) fail(`one colour floods the frame at t = ${flooded.slice(0, 6).join(', ')} — a fill gone wrong?`); else ok('no flooded frames (no colour over 80% of a world frame)');

// 3: determinism
const pix = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return Array.from(new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer)); }, t);
const ts = [.17, .43, .66, .91].map(f => +(DUR * f).toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const b = await pix(ts[i]); let n = 0; for (let k = 0; k < b.length; k++) if (b[k] !== first[i][k]) n++; if (n) { det = false; fail(`t=${ts[i]} renders differently the second time (${n} pixels) — Math.random, Date or state between frames?`); } }
if (det) ok(`deterministic at t = ${ts.join(', ')}`);

// 4: the trail — each terrain reads the one texture its own way
const diffAt = (t, matName) => page.evaluate(([t, matName]) => {
  const T = window.TRAIL, c = document.querySelector('canvas'), g = () => new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer).slice();
  T.setView('world'); T.setOff(['caption', 'title']); window.seek(t); const on = g(); T.setOff(['trail', 'caption', 'title']); window.seek(t); const off = g(); T.setOff([]); T.setView(null); window.seek(t);
  const ids = T.world.materials.map(m => m.name), mask = T.matMask(t), bx = T.walkerBox(t), W = c.width, H = c.height; let n = 0; const cols = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (ids[mask[i]] !== matName) continue; if (Math.abs(x - bx.x) < 9 && y > bx.y - 26 && y < bx.y + 4) continue;
    if (on[i] !== off[i]) { n++; cols.add(on[i] >>> 4 & 0x0f0f0f); } }
  return { n, cols: [...cols] };
}, [t, matName]);
const reading = T.world.materials.filter(m => m.reads.length), stepped = reading.filter(m => T.stamps.some(s => (s.kind === 'foot' || s.kind === 'body') && s.mat === m.name));
const results = [];
for (const m of stepped) {
  const st = T.stamps.filter(s => s.mat === m.name && (m.reads.includes('foot') || m.reads.includes('wave') ? s.kind === 'foot' : s.kind === 'body'));
  const s0 = st[Math.min(st.length - 1, Math.floor(st.length * .5))];
  const r = []; for (const d of [.5, 2, 6]) { const t = Math.min(DUR - .01, s0.t + d); r.push({ d, t, ...(await diffAt(t, m.name)) }); }
  results.push({ m, r });
  const line = `${m.name} (${m.kind}, reads ${m.reads.join('+')}): ${r.map(x => `${x.n} px at +${x.d} s`).join(', ')}`;
  if (Math.max(r[0].n, r[1].n) < 4) fail(`${line} — the terrain does not show the trail`); else ok(line);
}
const ignoring = T.world.materials.filter(m => !m.reads.length && T.matUse[m.name]);
for (const m of ignoring) { const s0 = T.stamps.find(s => s.mat === m.name && s.kind === 'foot'); const r = await diffAt(Math.min(DUR - .01, s0.t + .3), m.name); info(`${m.name} reads nothing (hard ground): ${r.n} px changed — the contrast`); }
if (stepped.length < 2) fail(`only ${stepped.length} terrain(s) on the route read the trail — the point is one texture read several ways (route over ≥ 2, better 3+)`);
else ok(`${stepped.length} terrains on the route read the one trail texture: ${stepped.map(m => m.name).join(', ')}`);
// each its own way: the colours the trail adds in one terrain should not be the colours it adds in another
const sames = []; for (let a = 0; a < results.length; a++) for (let b = a + 1; b < results.length; b++) { const A = new Set(results[a].r.flatMap(x => x.cols)), B = new Set(results[b].r.flatMap(x => x.cols)); if (!A.size || !B.size) continue; const inter = [...A].filter(x => B.has(x)).length, j = inter / (A.size + B.size - inter); if (j > .5) sames.push(`${results[a].m.name}/${results[b].m.name} ${j.toFixed(2)}`); }
if (sames.length) fail('terrains read the trail the same way (shared colours): ' + sames.join(', ')); else if (results.length > 1) ok('each terrain reads it its own way (no two share most of their trail colours)');
const shown = T.steps.filter(s => s.view === 'split' || s.view === 'trail');
if (!shown.length) fail('the texture is never shown — give one beat view: "split" (or "trail")'); else ok(`the texture is shown: ${shown.map(s => `step ${s.i} ${s.view} ${(s.t1 - s.t0).toFixed(1)} s`).join(', ')}`);

// 5 + 6: the body, from the samples
const B = await page.evaluate(() => {
  const T = window.TRAIL, S = T.samples, W = T.walker, HZ = T.HZ, lat = d => [d[1], -d[0]], out = { drift: 0, driftAt: 0, reach: 0, reachAt: 0, cross: 0, crossAt: 0, face: 0, faceN: 0, faceBad: [], jump: 0, jumpAt: 0, acc: 0, accAt: 0, fol: 0, starts: [], hops: [], printOff: 0 };
  const lock = [null, null];
  for (let k = 0; k < S.length; k++) { const s = S[k];
    s.feet.forEach((f, i) => { if (f.pl) { if (!lock[i]) lock[i] = [f.x, f.y]; const d = Math.hypot(f.x - lock[i][0], f.y - lock[i][1]); if (d > out.drift) { out.drift = d; out.driftAt = s.t; } } else lock[i] = null;
      const l = lat(s.dir), side = i === 0 ? 1 : -1, sv = Math.abs(s.dir[0]) > Math.abs(s.dir[1]), hx = s.x + l[0] * side * W.footW, hy = s.y + l[1] * side * W.footW * (sv ? .6 : 1);
      if (s.mode === 'walk' || s.mode === 'idle' && s.sw < 0) { const r = Math.hypot(f.x - hx, f.y - hy); if (r > out.reach) { out.reach = r; out.reachAt = s.t; }
        const lc = ((f.x - s.x) * l[0] + (f.y - s.y) * l[1]) * side; if (-lc > out.cross) { out.cross = -lc; out.crossAt = s.t; } } });
    if (k) { const p = S[k - 1], d = Math.hypot(s.x - p.x, s.y - p.y); if (d > out.jump) { out.jump = d; out.jumpAt = s.t; }
      if (s.mode === 'walk' && p.mode === 'walk') { const a = Math.hypot(s.vx - p.vx, s.vy - p.vy) * HZ; if (a > out.acc) { out.acc = a; out.accAt = s.t; } }
      if (p.mode !== 'ant' && s.mode === 'ant') out.starts.push({ t: s.t, ant: 0 }); if (s.mode === 'ant') out.starts[out.starts.length - 1].ant += 1 / HZ;
      if (p.mode !== 'hopAnt' && s.mode === 'hopAnt') out.hops.push({ t: s.t, ant: 0, rec: 0, crouch: 0 }); const h = out.hops[out.hops.length - 1];
      if (h && s.mode === 'hopAnt') { h.ant += 1 / HZ; h.crouch = Math.max(h.crouch, s.crouch); } if (h && s.mode === 'hopLand') h.rec += 1 / HZ;
      // walking off from standing must pass through 'ant'
      if (p.mode === 'idle' && s.mode === 'walk') out.starts.push({ t: s.t, ant: 0, skipped: 1 }); }
    const v = Math.hypot(s.vx, s.vy);
    if (s.mode === 'walk' && v > W.speed * .5) { out.faceN++; const want = Math.abs(s.vx) > Math.abs(s.vy) ? (s.vx > 0 ? 'right' : 'left') : (s.vy > 0 ? 'down' : 'up');
      const k0 = Math.max(0, k - Math.round(HZ * W.step / W.speed * 1.3)); let recent = false; for (let j = k0; j < k; j++) { const q = S[j]; const w2 = Math.abs(q.vx) > Math.abs(q.vy) ? (q.vx > 0 ? 'right' : 'left') : (q.vy > 0 ? 'down' : 'up'); if (w2 !== want) { recent = true; break; } }
      const diag = Math.abs(Math.abs(s.vx) - Math.abs(s.vy)) < v * .25;
      if (s.face === want || recent || diag) out.face++; else if (out.faceBad.length < 4) out.faceBad.push(s.t.toFixed(2) + ' ' + s.face + '≠' + want); }
    if (s.mode === 'walk') for (const o of s.fo) out.fol = Math.max(out.fol, Math.hypot(o.x, o.y)); }
  // prints under feet
  for (const st of T.stamps) if (st.kind === 'foot') { const s = S[Math.round(st.t * HZ)] || S[S.length - 1], f = s.feet[st.foot]; out.printOff = Math.max(out.printOff, Math.hypot(f.x - st.x, f.y - st.y)); }
  return out;
});
const Wk = T.walker;
if (B.drift > .5) fail(`a planted foot slides ${B.drift.toFixed(2)} px at t=${B.driftAt.toFixed(2)}`); else ok(`planted feet stay put: max drift ${B.drift.toFixed(2)} px`);
if (B.printOff > .5) fail(`a print is ${B.printOff.toFixed(2)} px from the foot that made it`); else ok(`prints sit under the feet (max offset ${B.printOff.toFixed(2)} px)`);
if (B.reach > Wk.reach) fail(`a leg stretches to ${B.reach.toFixed(1)} px at t=${B.reachAt.toFixed(2)} (reach ${Wk.reach})`); else ok(`legs within reach: max ${B.reach.toFixed(1)} of ${Wk.reach} px`);
if (B.cross > 1) fail(`a foot crosses the line of travel by ${B.cross.toFixed(1)} px at t=${B.crossAt.toFixed(2)} (left foot must stay left)`); else ok(`left foot stays left, right stays right (max cross ${B.cross.toFixed(2)} px)`);
const fp = B.faceN ? B.face / B.faceN : 1;
if (fp < .97) fail(`facing ≠ travel in ${((1 - fp) * 100).toFixed(1)}% of walking: ${B.faceBad.join(', ')}`); else ok(`facing follows the travel (${(fp * 100).toFixed(1)}% of walking frames)`);
const jumpLim = Wk.speed * 2.1 / T.HZ;
if (B.jump > jumpLim) fail(`the body jumps ${B.jump.toFixed(2)} px in one tick at t=${B.jumpAt.toFixed(2)} (limit ${jumpLim.toFixed(2)}) — teleport`); else ok(`no teleport: max ${(B.jump * T.HZ).toFixed(0)} px/s (limit ${(jumpLim * T.HZ).toFixed(0)})`);
const skipped = B.starts.filter(s => s.skipped), shortAnt = B.starts.filter(s => !s.skipped && s.ant < Wk.ant * .9);
if (skipped.length || shortAnt.length) fail(`${skipped.length + shortAnt.length} start(s) without gathering first`); else ok(`every start gathers first: ${B.starts.length} start(s), ${Math.round(Wk.ant * 1000)} ms each`);
for (const h of B.hops) { if (h.ant < .12 || h.rec < .12 || h.crouch < 1.2) fail(`the hop at t=${h.t.toFixed(1)}: gather ${(h.ant * 1000).toFixed(0)} ms, crouch ${h.crouch.toFixed(1)} px, recover ${(h.rec * 1000).toFixed(0)} ms — too little`); else ok(`the hop at t=${h.t.toFixed(1)} gathers ${(h.ant * 1000).toFixed(0)} ms (crouch ${h.crouch.toFixed(1)} px) and recovers ${(h.rec * 1000).toFixed(0)} ms`); }
const accLim = Wk.accel / Wk.mass * 1.05;
if (B.acc > accLim) fail(`acceleration ${B.acc.toFixed(0)} px/s² at t=${B.accAt.toFixed(1)} (limit ${accLim.toFixed(0)} for mass ${Wk.mass})`); else ok(`weight: max acceleration ${B.acc.toFixed(0)} px/s² (limit ${accLim.toFixed(0)} for mass ${Wk.mass})`);
if (Wk.followers) { if (B.fol < .5) fail(`followers do not lag (max ${B.fol.toFixed(2)} px)`); else ok(`followers lag behind the body: up to ${B.fol.toFixed(1)} px`); }
// idles breathe: pixels round the walker change while it stands
const waits = T.steps.filter(s => s.kind === 'wait' && s.t1 - s.t0 >= 1.2 || s.i === 0);
for (const w of waits) {
  const r = await page.evaluate(([a, b]) => { const T = window.TRAIL, c = document.querySelector('canvas'), x = c.getContext('2d'); T.setOff(['caption', 'title', 'still', 'trail']); T.setView('world');
    let prev = null, changes = 0, n = 0;
    for (let t = a + .3; t < b - .05; t += .2) { const s = T.samples[Math.round(t * T.HZ)]; if (s.mode !== 'idle') continue; window.seek(t); const bx = T.walkerBox(t); const d = new Uint32Array(x.getImageData(bx.x - 12, bx.y - 30, 24, 34).data.buffer).slice();
      if (prev) { let k = 0; for (let i = 0; i < d.length; i++) if (d[i] !== prev[i]) k++; if (k) changes++; } n++; prev = d; }
    T.setOff([]); T.setView(null); return { changes, n }; }, [w.t0, w.t1]);
  if (r.n > 2 && r.changes === 0) fail(`step ${w.i} stands dead still for ${(w.t1 - w.t0).toFixed(1)} s (no pixel changes) — the idle must breathe`);
  else if (r.n > 2) ok(`step ${w.i} idle breathes: ${r.changes} of ${r.n - 1} looks change`); }

// 7: the format
const longCap = T.steps.filter(s => s.caption && (s.caption.length * 6 - 1) > PX.W - 14);
if (DUR < 12 || DUR > 120) fail(`length ${DUR} s (12–120)`); else if (T.steps.length < 3) fail(`only ${T.steps.length} steps`); else if (!T.title) fail('no title (TT.create({ title }))');
else if (longCap.length) fail('captions too wide for the frame: ' + longCap.map(s => `"${s.caption}"`).join(', '));
else ok(`format: ${DUR} s, ${T.steps.length} steps, title "${T.title}", ${T.steps.filter(s => s.caption).length} captions`);

// 8: code-only, size
const html = readFileSync(page$, 'utf8');
const libs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => resolve(dirname(page$), m[1])).filter(existsSync);
const code = html.replace(/<script[^>]+src="[^"]+"><\/script>/g, '');
const sins = [];
if (/<img|\.png|\.jpe?g|\.gif|\.webp|\.mp4|\.glb|\.gltf|\.wav|\.mp3/i.test(code)) sins.push('image / video / model / audio file');
if (/Math\.random|Date\.now|new Date|performance\.now/.test(code)) sins.push('Math.random / Date / performance.now');
if (sins.length) fail('not code-only / not deterministic: ' + sins.join(', ')); else ok('code-only: no image, video, model or audio files; no Math.random or Date in the page');
const kb = f => (statSync(f).size / 1024).toFixed(1);
info(`size: page ${kb(page$)} KB` + libs.map(f => ` + ${f.split('/').pop()} ${kb(f)} KB`).join('') + ` = ${(([page$, ...libs].reduce((a, f) => a + statSync(f).size, 0)) / 1024).toFixed(1)} KB, no assets`);

// 9: route, speed
const R = await page.evaluate(() => { const T = window.TRAIL, S = T.samples, sol = T.world.solids; let m = 1e9, at = null, edge = 1e9;
  for (const s of S) { for (const q of sol) { const d = Math.hypot(s.x - q.x, s.y - q.y) - q.r; if (d < m) { m = d; at = { t: s.t, name: q.name }; } } edge = Math.min(edge, s.x, s.y - 12, T.world.w - s.x, T.world.h - s.y); }
  return { m, at, edge }; });
if (R.m < 0) fail(`the walk passes through a ${R.at.name} at t=${R.at.t.toFixed(1)} (${R.m.toFixed(1)} px inside) — move the route or the prop (see ?map=1)`);
else if (R.edge < 4) fail(`the walk goes within ${R.edge.toFixed(1)} px of the world's edge`);
else ok(`the route keeps off solid props (closest ${R.m === 1e9 ? '-' : R.m.toFixed(1)} px) and inside the world`);
const sp = await page.evaluate(() => { const T = window.TRAIL, out = {}; for (const v of ['world', 'split', 'trail']) { const st = T.steps.find(s => s.view === v) || T.steps[Math.floor(T.steps.length / 2)]; const t = (st.t0 + st.t1) / 2; window.seek(t); const t0 = performance.now(); for (let k = 0; k < 8; k++) window.seek(t + k / 30); out[v] = (performance.now() - t0) / 8; } return out; });
const slow = Object.entries(sp).filter(([, ms]) => ms > 33);
info('ms per frame: ' + Object.entries(sp).map(([c, ms]) => `${c} ${ms.toFixed(1)}`).join(' · '));
if (slow.length) fail('too slow for 30 fps live: ' + slow.map(([c]) => c).join(', ')); else ok('fast enough for 30 fps live');

await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok'); process.exit(bad ? 1 : 0);
