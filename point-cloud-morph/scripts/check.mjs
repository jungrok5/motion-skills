// point-cloud-morph · check.mjs — prove a film page before any long render:
//   node <skill>/scripts/check.mjs film.html [--scale .4]
// loads without errors or shader failures · fonts loaded · the film's geometry rules (film.runChecks: every form holds
// long enough to read, sits inside the frame and clear of the copy, is big enough; callouts on screen, apart, after the
// form has formed; the page's own F.check rules) · every settled form draws a visible, not blown-out frame · every
// transition moves (its middle differs from both ends) · no jump at a shot boundary (the cloud is continuous) ·
// deterministic (the same t gives the same pixels, whatever was drawn before).
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
if (!existsSync(page$)) { console.error('usage: check.mjs film.html [--scale .4]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels/.test(t)) return; if (m.type() === 'error' || /not compiled|program not valid/.test(t)) errors.push('console: ' + t.slice(0, 400)); else if (m.type() === 'warning') console.log('warn (console):', t.slice(0, 300)); });
await page.goto(pathToFileURL(page$).href + '?render=1&scale=' + opt('scale', '.4'), { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
  if (errors.length) break;
  if (Date.now() - t0 > 300000) { errors.push('never set window.READY'); break; }
  await new Promise((r) => setTimeout(r, 200));
}
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => {
  const F = window.film, W = 192, H = 108, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  const grab = (t) => { F.renderAt(t); g.drawImage(F.frame, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
  const stat = (d) => { let s = 0, lit = 0, blown = 0, h = 0; for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; if (l > 0.12) lit++; if (l > 0.97) blown++; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; } const n = d.length / 4; return { mean: s / n, lit: lit / n, blown: blown / n, hash: h }; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
  const fonts = ['14px "PCM Mono"', '600 40px "PCM Sans"'].every((f) => document.fonts.check(f));
  const rules = F.runChecks();
  const rows = F.shots.map((s) => {
    const tSet = s.t0 + s.in.dur + Math.min(1, (s.dur - s.in.dur) * 0.4), a = grab(tSet), st = stat(a);
    const row = { name: s.name || s.form, t: tSet, lit: st.lit, blown: st.blown, det: true, move: null };
    grab(F.DURATION * 0.37); row.det = stat(grab(tSet)).hash === st.hash;
    if (s.in.dur > 0) { F.off.add('hud'); const A = grab(s.t0 + 0.001), M = grab(s.t0 + s.in.dur * 0.5), B = grab(s.t0 + s.in.dur); F.off.delete('hud'); row.move = Math.min(diff(A, M), diff(M, B)); }
    return row;
  });
  // continuity across each boundary, HUD off: the cloud must not jump
  F.off.add('hud');
  const seams = F.shots.slice(1).map((s) => ({ name: s.name || s.form, t: s.t0, d: diff(grab(s.t0 - 1 / 60), grab(s.t0 + 1 / 60)) }));
  F.off.delete('hud'); F.renderAt(0);
  return { dur: F.DURATION, n: F.N, fonts, rules, rows, seams };
});
const fail = [...info.rules.fail], warn = [...info.rules.warn];
console.log(`DURATION ${info.dur.toFixed(2)} s · ${info.n.toLocaleString('en')} points · ${info.rows.length} shots`);
for (const l of info.rules.info) console.log(l);
if (!info.fonts) fail.push('HUD fonts did not load (lib/fonts next to cloud.js?)');
for (const r of info.rows) {
  console.log(`  ${r.name.padEnd(14)} settled at ${r.t.toFixed(2)} s: lit ${(r.lit * 100).toFixed(1)}% · blown ${(r.blown * 100).toFixed(2)}%${r.move != null ? ` · morph moves ${r.move.toFixed(1)}` : ''}${r.det ? '' : ' · NOT DETERMINISTIC'}`);
  if (r.lit < 0.01) fail.push(`${r.name}: the settled form is almost invisible (${(r.lit * 100).toFixed(1)}% of pixels lit) — more points, bigger size, or move in`);
  if (r.blown > 0.06) warn.push(`${r.name}: ${(r.blown * 100).toFixed(1)}% of the frame is blown to white — lower alpha / density, or fewer points on that part`);
  if (!r.det) fail.push(`${r.name}: not deterministic (same t, different pixels: Math.random, Date or state between frames?)`);
  if (r.move != null && r.move < 0.6) fail.push(`${r.name}: the transition hardly moves (middle ≈ ends) — is the form the same as the one before?`);
}
for (const s of info.seams) { if (s.d > 3) fail.push(`${s.name}: the cloud jumps at the shot boundary ${s.t.toFixed(2)} s (diff ${s.d.toFixed(1)}) — a motion or camera key starts somewhere else`); }
console.log(`seams: ${info.seams.map((s) => s.d.toFixed(2)).join(' · ') || '—'}`);
await browser.close();
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
