// manga-background-3d · check.mjs — proves a film page keeps the style's rules. Run from the project root:
//   node <skill>/scripts/check.mjs piece.html
// Fails (exit 1) on: page errors · a missing contract · a film that does not open on the clay model, has no wipe or
// does not end on a card · a shot shorter than 1.8 s or longer than 7 s · a wipe faster than 0.8 s · a scene that is
// not a built set (< 40 primitives) · a manga frame with almost no ink (< 0.8 %) or drowned in it (> 30 %) · fewer
// than 60 strokes · lines that boil between frames (< 85 % of ink stays put) · z-fighting (faces sharing a plane flicker) · a camera that whips (> 0.06 m or
// > 0.5° per frame) or sits inside geometry · a frame that changes when seeked twice · glyphs the font lacks ·
// captions that do not fit · a line plate that is not transparent.
// Warns on: a day frame with little paper white (< 12 %), a night frame without a dark sky or a glow, a shot with no caption.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const CHROME_ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'];
const page$ = resolve(process.argv.slice(2).find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <piece.html>'); process.exit(1); }

const fails = [], warns = [], ok = [];
const F = m => fails.push(m), Wn = m => warns.push(m), O = m => ok.push(m);
const browser = await chromium.launch({ args: CHROME_ARGS });
async function open(extra = '') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|WebGL/.test(m.text())) errors.push(m.text()); });
  await page.goto(pathToFileURL(page$).href + '?render=1&scale=.5' + extra, { waitUntil: 'commit' });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true).catch(() => false));) {
    if (errors.length || Date.now() - t0 > 180000) { console.error('page did not load:', errors.join('\n') || 'timeout'); process.exit(1); }
    await new Promise(r => setTimeout(r, 100));
  }
  page.errors = errors;
  return page;
}
const page = await open();
for (const k of ['seek', 'DURATION', 'FPS', 'SIZE', 'filmInfo', 'viewAt', 'wipeAt', 'linesAt', 'toneAt', 'depthStats', 'textCheck', 'glyphCheck', 'soundEvents', 'strokeCount'])
  if (!(await page.evaluate(k => k in window, k))) F(`contract: window.${k} missing`);
const info = await page.evaluate(() => window.filmInfo());
const FPS = info.fps;
O(`film ${info.duration} s · ${info.shots.length} shots · ${info.scenes.length} scenes (${info.scenes.map(s => `${s.id}: ${s.prims} prims, ${s.edges} edges, ${s.wires} wires`).join(' · ')})`);

// 1 · the film's shape
const shots = info.shots, sets = shots.filter(s => !s.card);
if (!(shots[0].mode === 'model' || shots[0].mode === 'wipe')) F(`the film opens on "${shots[0].mode}": it opens on the clay model (mode 'model' or 'wipe')`);
if (!shots.some(s => s.mode === 'wipe')) F('no wipe: the clay → manga reveal is the style');
if (!shots[shots.length - 1].card) F('the film does not end on a card');
for (const s of shots) {
  if (s.dur < 1.8 || s.dur > 7) F(`shot ${s.i} lasts ${s.dur} s (keep 1.8–7 s: one beat per shot)`);
  if (s.mode === 'wipe') { const [a, b] = s.wipe ?? [0.28, 0.72], d = (b - a) * s.dur; if (d < 0.8) F(`shot ${s.i}: the wipe takes ${d.toFixed(2)} s (≥ 0.8 s — it must read as a reveal)`); }
  if (!s.card && !s.caption) Wn(`shot ${s.i} has no caption`);
}
if (info.duration < 12 || info.duration > 75) Wn(`film is ${info.duration} s (the format is ~20–40 s)`);
for (const sc of info.scenes) { if (sc.prims < 40) F(`scene "${sc.id}" has ${sc.prims} primitives: a set is built, not a box`); }

// 2 · each shot's manga frame: ink, tone, strokes, camera
const rnd = (t) => +t.toFixed(3);
for (const s of sets) {
  const u = s.mode === 'wipe' ? Math.min(0.97, (s.wipe?.[1] ?? 0.72) + 0.12) : 0.5, t = rnd(s.start + u * s.dur);
  if (s.mode === 'model') { O(`shot ${s.i} (${s.scene}): clay only`); continue; }
  const st = await page.evaluate(t => {
    window.seek(t);
    const cv = document.querySelector('canvas'), g = cv.getContext('2d'), bar = Math.round(window.SIZE.bar * cv.width / window.SIZE.W);
    const d = g.getImageData(0, bar, cv.width, cv.height - 2 * bar).data, n = d.length / 4;
    let white = 0, dark = 0; const hist = new Array(10).fill(0);
    for (let i = 0; i < n; i++) { const l = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255; if (l > 0.93) white++; if (l < 0.3) dark++; hist[Math.min(9, l * 10 | 0)]++; }
    return { white: white / n, dark: dark / n, levels: hist.filter(h => h / n > 0.02).length, strokes: window.strokeCount() };
  }, t);
  const sc = info.scenes.find(x => x.id === s.scene);
  const tag = `shot ${s.i} (${s.scene}) t=${t}`;
  const a = await page.evaluate(([t, w]) => window.linesAt(t, w), [t, 640]), b = await page.evaluate(([t, w]) => window.linesAt(t, w), [rnd(t + 1 / FPS), 640]);
  const ma = Buffer.from(a.mask, 'base64'), mb = Buffer.from(b.mask, 'base64'), W = a.w, H = a.h;
  st.ink = ma.reduce((s, v) => s + v, 0) / ma.length;   // the line layer alone: the share of the frame that is ink
  if (st.ink < 0.008) F(`${tag}: ink covers ${(st.ink * 100).toFixed(1)} % — almost no line work`);
  else if (st.ink > 0.3) F(`${tag}: ink covers ${(st.ink * 100).toFixed(1)} % — drowned (thin the far detail, raise crease angles)`);
  if (st.strokes < 60) F(`${tag}: ${st.strokes} strokes (≥ 60: a manga background is drawn)`);
  if (sc.mood !== 'night' && st.white < 0.12) Wn(`${tag}: only ${(st.white * 100).toFixed(0)} % paper white — manga backgrounds breathe (lighter tones, a brighter sun)`);
  if (sc.mood === 'night' && st.dark < 0.08) Wn(`${tag}: a night frame with only ${(st.dark * 100).toFixed(0)} % dark — lower the ambient or show the sky`);
  O(`${tag}: ${st.strokes} strokes · ink ${(st.ink * 100).toFixed(1)} % · paper ${(st.white * 100).toFixed(0)} % · ${st.levels} tone bands`);
  // the lines stay put between frames (habits seeded by edges, not by frame)
  let inkB = 0, kept = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!mb[y * W + x]) continue; inkB++;
    let hit = 0; for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) if (ma[(y + dy) * W + x + dx]) { hit = 1; break; }
    kept += hit;
  }
  const stay = inkB ? kept / inkB : 1;
  if (stay < 0.85) F(`${tag}: only ${(stay * 100).toFixed(0)} % of the ink stays put frame to frame — the lines boil`); else O(`${tag}: ${(stay * 100).toFixed(0)} % of the ink stays put frame to frame`);
  // z-fighting: two faces in one plane flicker as the camera moves. Over three frames of the tone layer (no ink), count
  // pixels that jump up then down (or down then up) and sit inside a patch of such pixels — a moving edge is 1–2 px wide
  // and never a patch; a z-fight is. (Check this test catches one: put two boxes in one plane and run it.)
  {
    const dt = 0.25 / FPS;   // quarter frames: a moving thin bar shifts < 1 px, a z-fight still flips
    const fr = []; for (let k = 0; k < 3; k++) fr.push(await page.evaluate(([t, w]) => window.toneAt(t, w), [+(t - dt + k * dt).toFixed(4), 640]));
    const g = fr.map(f => Buffer.from(f.grey, 'base64')), W = fr[0].w, H = fr[0].h, fl = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { const a = g[1][i] - g[0][i], c = g[2][i] - g[1][i]; fl[i] = (a > 20 && c < -20) || (a < -20 && c > 20) ? 1 : 0; }
    let patch = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!fl[y * W + x]) continue; let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += fl[(y + dy) * W + x + dx];
      if (n >= 8) patch++;
    }
    const zf = patch / (W * H);
    if (zf > 0.0004) F(`${tag}: ${(zf * 100).toFixed(2)} % of the frame flickers in patches — z-fighting (two faces in one plane: move one 5 mm, or shorten it so they only touch)`);
    else O(`${tag}: no z-fighting (${(zf * 100).toFixed(3)} % flicker patches)`);
  }
  // the camera: a slow dolly, never inside geometry
  let maxMove = 0, maxTurn = 0;
  const n = Math.round(s.dur * FPS);
  let prev = null;
  for (let f = 0; f <= n; f += 2) {
    const v = await page.evaluate(t => window.viewAt(t), rnd(Math.min(s.start + s.dur - 1e-3, s.start + f / FPS)));
    const dir = [v.look[0] - v.pos[0], v.look[1] - v.pos[1], v.look[2] - v.pos[2]], l = Math.hypot(...dir); dir.forEach((_, i) => dir[i] /= l);
    if (prev) {
      maxMove = Math.max(maxMove, Math.hypot(v.pos[0] - prev.pos[0], v.pos[1] - prev.pos[1], v.pos[2] - prev.pos[2]) / 2);
      maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, dir[0] * prev.dir[0] + dir[1] * prev.dir[1] + dir[2] * prev.dir[2])) * 180 / Math.PI / 2 + Math.abs(v.fov - prev.fov) / 2);
    }
    prev = { pos: v.pos, dir, fov: v.fov };
  }
  if (maxMove > 0.06 || maxTurn > 0.5) F(`${tag}: the camera moves ${maxMove.toFixed(3)} m / ${maxTurn.toFixed(2)}° per frame (≤ 0.06 m, ≤ 0.5°: a slow dolly)`);
  const ds = await page.evaluate(t => window.depthStats(t), t);
  if (ds.near > 0.02) F(`${tag}: ${(ds.near * 100).toFixed(1)} % of the view is closer than 0.3 m — the camera is inside or against something`);
  if (sc.mood === 'night' && ds.sky < 0.02 && st.white < 0.02) Wn(`${tag}: night with no sky and no glow in view`);
}

// 3 · determinism: the same t gives the same frame, whatever was drawn before
const hashAt = t => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t).then(d => createHash('md5').update(d).digest('hex'));
const tA = rnd(sets[0].start + sets[0].dur * 0.5), tB = rnd(sets[sets.length - 1].start + sets[sets.length - 1].dur * 0.6);
const h1 = await hashAt(tA); await hashAt(tB); const h2 = await hashAt(tA);
if (h1 !== h2) F(`frame at ${tA} s changes when seeked again — something depends on state or time`); else O(`deterministic: t=${tA} s renders the same after seeking elsewhere`);

// 4 · text
const gc = await page.evaluate(() => window.glyphCheck());
if (gc.missing.length) F(`glyphs missing from the font: ${gc.missing.join(' ')} (add a font that has them: new Film({ fonts }))`); else O(`text: ${gc.chars} distinct characters, all in the font`);
for (const m of await page.evaluate(() => window.textCheck())) F(m);

// 5 · a line plate is ink on transparent
const firstSet = sets.find(s => s.mode !== 'model') ?? sets[0];
const pp = await open(`&plate=${firstSet.i}&layer=lines&w=640`);
const clear = await pp.evaluate(() => { const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let z = 0; for (let i = 3; i < d.length; i += 4) if (d[i] === 0) z++; return z / (d.length / 4); });
if (clear < 0.5) F(`line plate of shot ${firstSet.i} is ${(clear * 100).toFixed(0)} % transparent — the line layer must lift off the tone`); else O(`line plate: ${(clear * 100).toFixed(0)} % transparent (lines lift off onto any page)`);

if (page.errors.length) page.errors.forEach(e => F(`page error: ${e}`));
await browser.close();
for (const m of ok) console.log('  ok   ' + m);
for (const m of warns) console.log('  warn ' + m);
for (const m of fails) console.log('  FAIL ' + m);
console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
