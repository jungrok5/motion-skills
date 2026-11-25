// fold-out-map · score.mjs — a light score made from the film's own cues, written as a WAV (no samples, no network):
// a warm pad and music-box plucks; paper sounds where the paper moves — a rustle when the cover opens, a soft crackle
// and thump for every crease that opens, a quick card "flap" when a pop-up springs up, a small chime when a label tilts
// up; a low bell under titles. As the light turns to night the pad darkens (minor, lower, slower plucks).
// Deterministic: the same film gives the same file.
//   node <skill>/scripts/score.mjs film.html [--bpm 84] [--key 62] [--out out/score.wav] [--seed 3]
//   node <skill>/scripts/render.mjs film.html --audio out/score.wav
// Swap in your own music the same way (--audio any.mp3); keep the paper sounds on the cue times if you do.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: score.mjs film.html [--bpm 84] [--key 62] [--out out/score.wav]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 180, height: 320 } });
await page.goto(pathToFileURL(page$).href + '?render=1&scale=.1&msaa=0&tex=.15', { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (Date.now() - t0 > 240000) throw new Error('never ready'); await new Promise(r => setTimeout(r, 100)); }
const C = await page.evaluate(() => window.FILM.cues());
await browser.close();

const SR = 48000, DUR = C.duration + .4, N = Math.round(SR * DUR), L = new Float32Array(N), R = new Float32Array(N);
const bpm = +opt('bpm', 84), beat = 60 / bpm, key = +opt('key', 62);
let seed = +opt('seed', 3) >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hz = m => 440 * 2 ** ((m - 69) / 12);
const nightAt = t => { const x = Math.max(0, Math.min(C.night.length - 1.001, t / C.nightStep)), i = Math.floor(x); return C.night[i] + (C.night[i + 1] - C.night[i]) * (x - i); };
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// pad: I – vi – IV – V by day, i – VI – iv – v by night, crossfaded by the night value
const DAY = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]], NIGHT = [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -4, 0, 3], [-5, -2, 2, 7]];
const bar = beat * 4, ph = new Float64Array(32);
for (let i = 0; i < N; i++) {
  const t = i / SR, b = Math.floor(t / bar) % 4, n = nightAt(t), env = Math.min(1, t / 2) * Math.min(1, (DUR - t) / 1.4);
  let l = 0, r = 0;
  for (let v = 0; v < 4; v++) for (const [set, w, o] of [[DAY, 1 - n, 0], [NIGHT, n, 8]]) {
    if (w < .001) continue;
    const f = hz(key - 12 + set[b][v] - n * 2), k = v * 2 + o; ph[k] += 2 * Math.PI * f / SR; ph[k + 1] += 2 * Math.PI * f * 1.003 / SR;
    const s = (Math.sin(ph[k]) + .3 * Math.sin(2 * ph[k]) + Math.sin(ph[k + 1])) * w; l += s * (v % 2 ? .7 : 1); r += s * (v % 2 ? 1 : .7);
  }
  const sw = .8 + .2 * Math.sin(t * .6); L[i] += l * .016 * env * sw; R[i] += r * .016 * env * sw;
}
const pluck = (t0, f, amp, pan) => {
  const n = Math.round(SR * 1.6), i0 = Math.round(t0 * SR);
  for (let j = 0; j < n; j++) { const t = j / SR, e = Math.exp(-t * 4) * Math.min(1, t * 400), s = (Math.sin(2 * Math.PI * f * t) + .3 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 9)) * e * amp; add(i0 + j, s * (1 - pan), s * pan); }
};
const start = C.cues.find(c => c.kind === 'pop')?.t ?? 2;
for (let t = Math.max(beat * 2, start - beat * 4); t < C.duration - .8; t += beat / 2) {
  const n = nightAt(t), step = Math.round(t / (beat / 2)); if (n > .5 && step % 2) continue;
  const b = Math.floor(t / bar) % 4, ch = (n > .5 ? NIGHT : DAY)[b], m = key + 12 + ch[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] - (n > .5 ? 12 : 0);
  pluck(t, hz(m), .06 * (step % 4 === 0 ? 1.2 : .8), .3 + .4 * rnd());
}
// paper: band-passed noise with a crackle of short clicks (a sheet moving), and a soft low thump when it lands
const paper = (t0, d, amp, { crackle = 30, land = true } = {}) => {
  const n = Math.round(d * SR), i0 = Math.round(t0 * SR); let lp = 0, lp2 = 0, hp = 0, prev = 0;
  for (let j = 0; j < n; j++) {
    const x = j / n, e = Math.sin(Math.PI * Math.min(1, x * 1.1)) ** 1.5, w = rnd() * 2 - 1;
    lp += .35 * (w - lp); lp2 += .35 * (lp - lp2); hp = lp2 - prev; prev = lp2;   // a band of noise around 2–5 kHz
    let s = hp * e * amp * 3;
    if (rnd() < crackle / SR * (.4 + e)) s += (rnd() - .5) * amp * 1.6;
    add(i0 + j, s * (.9 + .1 * rnd()), s * (.9 + .1 * rnd()));
  }
  if (land) { const m = Math.round(.25 * SR), i1 = i0 + Math.round(d * .82 * SR); for (let j = 0; j < m; j++) { const t = j / SR, s = Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 22) * amp * .9; add(i1 + j, s, s); } }
};
for (const c of C.cues) {
  if (c.kind === 'rustle') paper(c.t, (c.d || 1.2) + .3, .1, { crackle: 60 });
  if (c.kind === 'crease') paper(c.t + .1, (c.d || 1.4) * .9, .06, { crackle: 40 });
  if (c.kind === 'pop') { paper(c.t, .22, .09, { crackle: 140, land: false }); pluck(c.t + .05, hz(key + 24 + 7), .07, .6); }
  if (c.kind === 'label') pluck(c.t + .08, hz(key + 24 + 12), .05, .4);
  if (c.kind === 'title') { const n = Math.round(3 * SR), i0 = Math.round(c.t * SR), f = hz(key - 12); for (let j = 0; j < n; j++) { const t = j / SR, s = (Math.sin(2 * Math.PI * f * t) + .4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3)) * Math.exp(-t * 1.3) * Math.min(1, t * 200) * .07; add(i0 + j, s, s); } }
}
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = peak > 0 ? .708 / peak : 1, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
const out = resolve(opt('out', 'out/score.wav')); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  ${C.duration} s, ${C.cues.length} cues (${[...new Set(C.cues.map(c => c.kind))].join(', ')})`);
