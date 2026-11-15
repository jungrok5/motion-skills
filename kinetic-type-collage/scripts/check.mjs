// kinetic-type-collage · check.mjs — prove a film page before any long render:
//   node <skill>/scripts/check.mjs film.html [--scale .3]
// loads without errors or shader failures · the film's own rules (film.runChecks: the cutting pace, every `read` word is
// whole inside the frame, big enough and on long enough; palette; the page's F.check rules) · every shot draws something ·
// every shot moves (first frame ≠ last) · every cut changes the picture · no strobing (≤ 3 big light/dark swings a second) ·
// paper and ink carry the film (colour stays the accent) · deterministic (same t, same pixels, whatever was drawn before).
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
if (!existsSync(page$)) { console.error('usage: check.mjs film.html [--scale .3]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels/.test(t)) return; if (m.type() === 'error' || /not compiled|program not valid/.test(t)) errors.push('console: ' + t.slice(0, 400)); else if (m.type() === 'warning') console.log('warn (console):', t.slice(0, 300)); });
await page.goto(pathToFileURL(page$).href + '?render=1&scale=' + opt('scale', '.3'), { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
  if (errors.length) break;
  if (Date.now() - t0 > 300000) { errors.push('never set window.READY'); break; }
  await new Promise((r) => setTimeout(r, 200));
}
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => {
  const F = window.film, W = 240, H = Math.round((240 * F.H) / F.W), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  const hex = (n) => { const k = F.col(n); return [k.r, k.g, k.b].map((v) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055))); };
  const paper = hex('paper'), ink = hex('ink');
  const grab = (t) => { F.renderAt(t); g.drawImage(F.frame, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
  const stat = (d, bg) => {
    let lum = 0, bw = 0, chroma = 0, fg = 0, h = 0; const n = d.length / 4, near = (i, k) => Math.abs(d[i] - k[0]) + Math.abs(d[i + 1] - k[1]) + Math.abs(d[i + 2] - k[2]) < 54;
    for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); lum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; if (mx - mn < 30) bw++; else if (mx - mn > 70) chroma++; if (!near(i, bg)) fg++; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; }
    return { lum: lum / n, bw: bw / n, chroma: chroma / n, fg: fg / n, hash: h };
  };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
  const changed = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 60) n++; return n / (a.length / 4); };
  const rules = F.runChecks(), f = 1 / F.FPS; let prevEnd = null;
  const rows = F.shots.map((s) => {
    const tm = s.t0 + s.dur * 0.6; F.pose(tm); const bg = hex(F.bg);
    const A = grab(s.t0 + f * 0.3).slice(), M = grab(tm).slice(), st = stat(M, bg), Z = grab(s.t1 - f * 0.7).slice();
    grab(F.DURATION * 0.371); const det = stat(grab(tm), bg).hash === st.hash;
    const row = { name: s.name, t0: s.t0, dur: s.dur, hold: !!s.o.hold, fg: st.fg, bw: st.bw, chroma: st.chroma, lumA: stat(A, bg).lum, lumZ: stat(Z, bg).lum, move: diff(A, Z), moved: changed(A, Z), cut: prevEnd ? diff(prevEnd, A) : null, det };
    prevEnd = Z; return row;
  });
  F.renderAt(0);
  return { dur: F.DURATION, rules, rows, fonts: [...F.ts.loaded].length };
});
await browser.close();
const fail = [...info.rules.fail], warn = [...info.rules.warn];
console.log(`DURATION ${info.dur.toFixed(2)} s · ${info.rows.length} shots · ${info.fonts} font files`);
for (const l of info.rules.info) console.log(l);
let bw = 0, chroma = 0; const swings = [];
for (const [i, r] of info.rows.entries()) {
  console.log(`  ${String(i).padStart(2)} ${r.name.padEnd(14)} ${r.t0.toFixed(2).padStart(6)} s +${r.dur.toFixed(2)}  drawn ${(r.fg * 100).toFixed(0).padStart(3)}%  b/w ${(r.bw * 100).toFixed(0).padStart(3)}%  colour ${(r.chroma * 100).toFixed(0).padStart(3)}%  moves ${r.move.toFixed(1).padStart(5)}${r.cut != null ? '  cut ' + r.cut.toFixed(1).padStart(5) : ''}${r.det ? '' : '  NOT DETERMINISTIC'}`);
  bw += r.bw * r.dur; chroma += r.chroma * r.dur;
  if (r.fg < 0.006) fail.push(`${r.name}: almost nothing is drawn (${(r.fg * 100).toFixed(1)}% of the frame) — is it off camera?`);
  if (!r.det) fail.push(`${r.name}: not deterministic (same t, different pixels: Math.random, Date or state between frames?)`);
  if (r.move < 0.5 && r.moved < 0.0012 && !r.hold) fail.push(`${r.name}: nothing moves between its first and last frame — every shot has a move (camera, word or prop)`);
  if (r.cut != null && r.cut < 7) fail.push(`${r.name}: the cut into it hardly changes the picture (diff ${r.cut.toFixed(1)}) — change scale, ground or subject across a cut`);
  if (i && Math.abs(r.lumA - info.rows[i - 1].lumZ) > 0.38) swings.push(r.t0);
}
for (const t of swings) { const n = swings.filter((x) => x >= t && x < t + 1).length; if (n > 3) { fail.push(`${n} light/dark flashes within 1 s from ${t.toFixed(2)} s — more than 3 a second can trigger photosensitive seizures; keep the ground the same across some of those cuts`); break; } }
bw /= info.dur; chroma /= info.dur;
console.log(`paper + ink + greys ${(bw * 100).toFixed(0)}% of the film · strong colour ${(chroma * 100).toFixed(0)}%`);
if (chroma > 0.3) warn.push(`strong colour covers ${(chroma * 100).toFixed(0)}% of the film — the style is black and white with colour as the accent (aim under 25%)`);
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
