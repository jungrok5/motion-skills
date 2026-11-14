// colored-pencil-world · check.mjs — prove a world page before any long render:
//   node <skill>/scripts/check.mjs world.html [--scale .4] [--q "px=5"]
// loads without errors or shader failures · the world's rules (W.runChecks: a sky is drawn, the way is on the land, every
// shot is long enough and at a walk or a run, the eye is above ground and outside solid things, the walker is in the
// picture and never in the water, every film pose and every cast pose is inside the joint ranges with the standing foot
// on the ground, the page's own W.check rules) · every shot's picture: nothing left undrawn (the clear colour never
// shows), not washed out (a coloured-pencil drawing is light, but it has colour), no black (shade is a coloured pencil),
// has light and dark · it moves (two moments of a shot differ) · deterministic (the same t gives the same pixels,
// whatever was drawn before).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs world.html [--scale .4]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels/.test(t)) return; if (m.type() === 'error' || /not compiled|program not valid/.test(t)) errors.push('console: ' + t.slice(0, 900)); else if (m.type() === 'warning') console.log('warn (console):', t.slice(0, 300)); });
const extra = opt('q', '');
await page.goto(pathToFileURL(page$).href + '?render=1&scale=' + opt('scale', '.4') + (extra ? '&' + extra : ''), { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
  if (errors.length) break;
  if (Date.now() - t0 > 300000) { errors.push('never set window.READY'); break; }
  await new Promise((r) => setTimeout(r, 200));
}
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => {
  const F = window.film, W = 192, H = 108, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  const grab = (t) => { F.renderAt(t); g.drawImage(F.canvas, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
  const stat = (d) => {
    let s = 0, s2 = 0, white = 0, black = 0, bare = 0, sat = 0, h = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, l = 0.2126 * r + 0.7152 * gg + 0.0722 * b; s += l; s2 += l * l;
      if (l > 0.95) white++; if (l < 0.1) black++; if (d[i] > 200 && d[i + 1] < 90 && d[i + 2] > 200) bare++;
      sat += Math.max(r, gg, b) - Math.min(r, gg, b);
      h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0;
    }
    return { mean: s / n, sd: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)), white: white / n, black: black / n, bare: bare / n, sat: sat / n, hash: h };
  };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
  const rules = F.runChecks();
  const rows = F.list.map((s) => {
    const t = (s.t0 + s.t1) / 2, A = grab(t), st = stat(A);
    F.bare(true); const bare = stat(grab(t)).bare; F.bare(false);
    const B = grab(Math.min(s.t1 - 0.05, t + 0.6));
    const again = stat(grab(t)).hash === st.hash;
    return { name: s.name, t, ...st, bare, move: diff(A, B), det: again };
  });
  F.renderAt(0);
  return { dur: F.DURATION, total: F.total, gpu: F.gpu, rules, rows };
});
const fail = [...info.rules.fail], warn = [...info.rules.warn];
console.log(`${info.gpu || 'WebGL'}`);
for (const l of info.rules.info) console.log(l);
for (const r of info.rows) {
  console.log(`  ${r.name.padEnd(22)} @${r.t.toFixed(1)} s: light ${r.mean.toFixed(2)} ± ${r.sd.toFixed(2)} · colour ${r.sat.toFixed(2)} · paper-white ${(r.white * 100).toFixed(0)}% · black ${(r.black * 100).toFixed(1)}% · undrawn ${(r.bare * 100).toFixed(2)}% · moves ${r.move.toFixed(1)}${r.det ? '' : ' · NOT DETERMINISTIC'}`);
  if (r.bare > 0.004) fail.push(`${r.name}: ${(r.bare * 100).toFixed(1)}% of the picture is undrawn (the clear colour shows) — a sky behind everything, a ground under everything`);
  if (r.black > 0.04) warn.push(`${r.name}: ${(r.black * 100).toFixed(0)}% of the picture is near black — a pencil drawing has no black: lighter pencils, a softer shadow pencil (pencil.shadow), or more sky light`);
  if (r.white > 0.6) warn.push(`${r.name}: ${(r.white * 100).toFixed(0)}% of the picture is bare paper — the eye is looking at sky or the margin; frame more of the world`);
  if (r.sat < 0.07) warn.push(`${r.name}: the drawing has little colour (${r.sat.toFixed(2)}) — this style is clear coloured pencils on white, not graphite`);
  if (r.sd < 0.06) warn.push(`${r.name}: the picture is flat (light ± ${r.sd.toFixed(2)}) — it wants sun and shade in the frame`);
  if (r.move < 0.25) warn.push(`${r.name}: hardly anything moves in 0.6 s — a walk, a drifting eye, wind, water or birds`);
  if (!r.det) fail.push(`${r.name}: not deterministic (same t, different pixels: Math.random, Date or state kept between frames?)`);
}
await browser.close();
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
