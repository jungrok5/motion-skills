// aesthetics-film · check.mjs — prove a film page before rendering it:
//   node <skill>/scripts/check.mjs film.html [--scale .35]
// loads without errors or missing files · every shot draws a non-blank frame · the same t gives the same pixels ·
// shots tile the timeline · lines don't overlap and stay up long enough to read · callouts point at something on screen ·
// the fonts in fonts/ cover every character the film writes (else: node <skill>/scripts/fonts.mjs film.html) ·
// prints DURATION (score.mjs needs it), the chapter / shot / line tables.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { openFilm } from './_browser.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs film.html [--scale .35]'); process.exit(1); }
let film;
try { film = await openFilm(page$, 'render=1&msaa=0&scale=' + opt('scale', '.35')); }
catch (e) { console.error(e.message); console.log('FAIL: the page does not load'); process.exit(1); }
const { browser, page, errors } = film;
const fail = [], warn = [];
for (const e of errors) fail.push(e);
const info = await page.evaluate(() => {
  const F = window.film;
  const stat = (t) => {
    F.seek(t);
    const c = document.createElement('canvas'); c.width = 96; c.height = 54;
    const g = c.getContext('2d'); g.drawImage(F.canvas, 0, 0, 96, 54);
    const d = g.getImageData(0, 0, 96, 54).data; let s = 0, s2 = 0, h = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; }
    const n = d.length / 4, m = s / n;
    return { mean: m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), hash: h };
  };
  const shots = F.shots.map((s) => { const mid = (s.from + s.to) / 2, a = stat(mid), b = stat(mid); return { id: s.id, set: s.set, light: s.light, from: s.from, to: s.to, mean: a.mean, sd: a.sd, det: a.hash === b.hash }; });
  // callouts: is the anchor on screen at the middle of its time?
  const callouts = F.callouts.map((c) => { const t = (c.from + c.to) / 2; F.seek(t); const sh = F.shots.find((s) => t >= s.from && t < s.to); const p = typeof c.at === 'function' ? c.at(t - c.from) : c.at; const q = F.project(p); return { text: c.text, t, set: c.set ?? sh.set, shotSet: sh.set, q, W: F.W, H: F.H }; });
  return { dur: F.duration, fps: F.fps, shots, rules: F.check(), text: F.allText(), lines: F.lines.map((l) => ({ text: l.text, from: l.from, to: l.to })), chapters: F.chapters.map((c) => ({ n: c.n, title: c.title, from: c.from })), callouts };
});
console.log(`DURATION ${info.dur.toFixed(2)} s  (${Math.round(info.dur * info.fps)} frames @ ${info.fps} fps)`);
console.log('chapters: ' + info.chapters.map((c) => `${c.n} ${c.title} @${c.from.toFixed(1)}`).join(' · '));
console.log('shot  set          light      from →   to   len   luma   sd');
for (const s of info.shots) {
  console.log(`${String(s.id).padStart(4)}  ${s.set.padEnd(12)} ${s.light.padEnd(9)} ${s.from.toFixed(2).padStart(6)} → ${s.to.toFixed(2).padStart(6)}  ${(s.to - s.from).toFixed(1).padStart(4)}  ${s.mean.toFixed(2)}  ${s.sd.toFixed(2)}`);
  if (s.sd < 0.015) fail.push(`shot ${s.id} draws a flat frame (luma sd ${s.sd.toFixed(3)})`);
  if (!s.det) fail.push(`shot ${s.id} is not deterministic (same t, different pixels)`);
}
console.log(`${info.lines.length} lines: ` + info.lines.map((l) => `${l.from.toFixed(1)}–${l.to.toFixed(1)}`).join(' '));
for (const c of info.callouts) {
  if (c.set !== c.shotSet) fail.push(`callout "${c.text}" is in set ${c.set} but at ${c.t.toFixed(1)} s the shot shows ${c.shotSet}`);
  else if (!c.q || c.q[0] < c.W * 0.04 || c.q[0] > c.W * 0.96 || c.q[1] < c.H * 0.1 || c.q[1] > c.H * 0.82) fail.push(`callout "${c.text}" points off screen at ${c.t.toFixed(1)} s (${c.q ? c.q.map((v) => v.toFixed(0)).join(', ') : 'behind the camera'})`);
}
const last = info.lines[info.lines.length - 1];
if (last && last.to > info.dur) fail.push(`the last line ends at ${last.to.toFixed(2)} s, after the picture (${info.dur.toFixed(2)} s)`);
warn.push(...info.rules);
// fonts: every character must be in the subset fonts (fonts/chars.txt, written by fonts.mjs)
const charsFile = join(dirname(page$), 'fonts', 'chars.txt');
if (!existsSync(charsFile)) warn.push('no fonts/chars.txt: run node <skill>/scripts/fonts.mjs film.html (system serif fonts are used until then)');
else {
  const have = new Set([...readFileSync(charsFile, 'utf8')]);
  const missing = [...new Set([...info.text])].filter((c) => !/\s/.test(c) && !have.has(c));
  if (missing.length) fail.push(`fonts miss ${missing.length} character(s): ${missing.join('')} — run node <skill>/scripts/fonts.mjs film.html`);
}
await browser.close();
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
