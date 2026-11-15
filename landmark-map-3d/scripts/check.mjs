// landmark-map-3d · check.mjs — proves a film page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs film.html [--step .5] [--scale .25]
// 1. loads with no page errors, console errors or missing files (place.json, fonts)
// 2. the text has its fonts: every character the film writes is in fonts/chars.txt (run fonts.mjs after changing text)
// 2b. no degenerate geometry (zero normals → NaN pixels → black blocks on GPUs)
// 3. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 4. no blank frames, nothing blown out: every sampled frame has detail and is not one flat colour
// 5. pins never pile up: two pins drawn mostly opaque never overlap
// 6. every rule holds at every sampled t: built-ins (the frame stays on the map, the camera clears the roofs, pitch in
//    range, every F.poi / F.street found in place.json) plus the film's own F.check(...)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { serve, CHROME_ARGS } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <film.html> [--step .5]'); process.exit(1); }
const step = +opt('step', .5), scale = opt('scale', '.25');

const { srv, url } = await serve(page$, `?render=1&scale=${scale}&msaa=0&shadow=1024`);
const browser = await chromium.launch({ args: CHROME_ARGS });
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|ReadPixels/.test(m.text())) errors.push('console error: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`missing (${r.status()}): ${r.url()}`); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (errors.some(e => /page error/.test(e)) || Date.now() - t0 > 300000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
    await new Promise(r => setTimeout(r, 150));
  }
  if (errors.length) fail('loading: ' + errors.join(' | ')); else console.log('ok   loads with no errors or missing files');
  const logs = await page.evaluate(() => window.FILM.logs); for (const l of logs) console.log('     ' + l);

  // geometry: a zero-length normal or a NaN position renders as NaN on real GPUs (SwiftShader hides it), and the blur
  // and bloom passes spread each such pixel into a black block
  const badGeo = await page.evaluate(() => { let n = 0; window.FILM.scene.traverse(o => { const a = o.isMesh && o.geometry.attributes; if (!a || !a.normal) return; const N = a.normal.array, P = a.position.array; for (let i = 0; i < N.length; i += 3) if (!(Math.hypot(N[i], N[i + 1], N[i + 2]) > .5) || !isFinite(P[i] + P[i + 1] + P[i + 2])) n++; }); return n; });
  if (badGeo) fail(`${badGeo} vertices with a zero normal or NaN position — they show as black blocks on GPUs (skip degenerate triangles)`); else console.log('ok   no degenerate geometry');

  const text = await page.evaluate(() => window.FILM.allText());
  const charsF = join(dirname(page$), 'fonts', 'chars.txt');
  const have = existsSync(charsF) ? new Set([...readFileSync(charsF, 'utf8')]) : null;
  const missing = [...new Set([...text])].filter(c => c.trim() && (!have || !have.has(c)));
  if (!have) fail(`no fonts/ next to the page — run: node <skill>/scripts/fonts.mjs ${page$.split('/').pop()}`);
  else if (missing.length) fail(`${missing.length} character(s) not in fonts/ (${missing.slice(0, 20).join('')}) — run fonts.mjs again`);
  else console.log(`ok   fonts hold all ${new Set(text).size} characters`);

  const pix = t => page.evaluate(t => { window.seek(t); const c = document.getElementById('frame'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); }, t);
  const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > 2) n++; if (d > mx) mx = d; } return { n, mx }; };
  const stats = a => { let s = 0, s2 = 0, n = 0, hi = 0; for (let i = 0; i < a.length; i += 4 * 5) { const v = (a[i] + a[i + 1] + a[i + 2]) / 3; s += v; s2 += v * v; n++; if (v > 250) hi++; } return { sd: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)), hi: hi / n }; };
  const DUR = await page.evaluate(() => window.DURATION);
  const ts = [DUR * .13, DUR * .41, DUR * .67, DUR * .93].map(t => +t.toFixed(2)), first = [];
  for (const t of ts) first.push(await pix(t));
  let det = true;
  for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n > first[i].length * .0005) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — state carried between frames?`); } }
  if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);
  const flat = [], blown = [];
  for (let t = 0; t <= DUR + 1e-6; t += 1) { const s = stats(await pix(+t.toFixed(2))); if (s.sd < 8 && t > .7) flat.push(t); if (s.hi > .2) blown.push(t); }
  if (flat.length) fail(`flat (blank-looking) frames at t = ${flat.join(', ')}`); else console.log('ok   no blank frames (every 1 s)');
  if (blown.length) fail(`blown-out frames (>20% white) at t = ${blown.join(', ')}`); else console.log('ok   nothing blown out');

  const broken = new Map(), piles = new Map();
  for (let t = 0; t <= DUR + 1e-6; t += step) {
    const tt = +t.toFixed(3);
    const b = await page.evaluate(t => window.runChecks(t), tt);
    for (const name of b) if (!broken.has(name)) broken.set(name, tt);
    const ov = await page.evaluate(t => { window.seek(t); return window.FILM.labels.overlaps || []; }, tt);
    for (const o of ov) if (!piles.has(o)) piles.set(o, tt);
  }
  if (piles.size) for (const [n, t] of piles) fail(`pins overlap: ${n} (first at t=${t}) — move one (side: 'left'), change its window or its anchor`);
  else console.log(`ok   pins never pile up (every ${step} s)`);
  if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`);
  else console.log(`ok   every rule holds at every ${step} s`);
} finally { await browser.close(); srv.close(); }
console.log(bad ? `${bad} problem(s)` : 'check OK');
process.exit(bad ? 1 : 0);
