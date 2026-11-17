// sprite-stack-flight · check.mjs — proves a flight page before you render it. Prints `ok` lines, numbers, or FAIL.
//   node <skill>/scripts/check.mjs index.html [--step .25]
//  1 loads with no page errors / console errors / failed requests (film, ?sheet=craft, ?map=1)
//  2 every step of the plan draws; no blank frame; every camera the plan names is used
//  3 deterministic: the same t gives the same pixels, also after seeking elsewhere
//  4 the flight clears the ground: height above the terrain ≥ the craft's clearance at every sampled t
//  5 the craft: a real stack (≥ 8 slices, ≥ 150 voxels); port (red) and starboard (green) lights both seen from above at
//    8 headings, starboard always on the right of the nose (no mirrored model, no flipped axis)
//  6 weight, with numbers: bank never snaps (max bank rate outside rolls), the bank overshoots and settles after a change
//    (inertia), a roll gathers first (it starts with a small counter-roll), the chase camera lags the heading in turns
//  7 the format: ≥ 3 steps and ≥ 2 cameras, no step shorter than 1.5 s, 12–120 s long
//  8 code-only: no <img>, no image / video URLs, no Math.random / Date in the page; size of page + lib
//  9 speed: one frame per camera at the live size (the live page must keep up)
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
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (errors.length || Date.now() - t0 > 60000) break; await new Promise(r => setTimeout(r, 50));
  }
  return { page, errors };
}
const main = await open('');
const extra = [await open('sheet=craft'), await open('map=1')];
const errs = [main, ...extra].flatMap(p => p.errors);
if (errs.length) { fail('loading: ' + errs.join(' | ')); await browser.close(); process.exit(1); } else ok('loads with no errors (film, craft sheet, plan map)');
const page = main.page;

const DUR = await page.evaluate(() => window.DURATION);
const FL = await page.evaluate(() => ({ steps: window.FLIGHT.steps, clearance: window.FLIGHT.clearance, mass: window.FLIGHT.mass, voxels: window.FLIGHT.voxels, slices: window.FLIGHT.slices, frames: window.FLIGHT.frames }));
info(`${DUR} s, ${FL.steps.length} steps: ` + FL.steps.map(s => `${s.cam} ${(s.t1 - s.t0).toFixed(1)}${s.roll ? ' roll-' + s.roll : ''}`).join(' · '));

// 2: draws, blanks, cameras
const thrown = new Map(), blank = [];
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 53) seen.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3));
    return { colours: seen.size };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.colours < 12) blank.push(t.toFixed(2));
}
if (thrown.size) for (const [m, t] of thrown) fail(`throws at t=${t}: ${m}`); else ok(`every step draws (every ${step} s)`);
if (blank.length) fail(`blank / flat frames at t = ${blank.slice(0, 6).join(', ')}`); else ok('no blank frames');
const cams = [...new Set(FL.steps.map(s => s.cam))];
if (cams.some(c => !['over', 'chase', 'cockpit'].includes(c))) fail('unknown camera: ' + cams.join(', ')); else info('cameras: ' + cams.join(', '));

// 3: determinism
const pix = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); }, t);
const ts = [.13, .41, .66, .88].map(f => +(DUR * f).toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const b = await pix(ts[i]); let n = 0; for (let k = 0; k < b.length; k++) if (b[k] !== first[i][k]) n++; if (n) { det = false; fail(`t=${ts[i]} renders differently the second time (${n} values) — Math.random, Date or state between frames?`); } }
if (det) ok(`deterministic at t = ${ts.join(', ')}`);

// 4 + 6: the flight, sampled
const S = await page.evaluate(([dur]) => { const out = []; for (let t = -1; t <= dur; t += 1 / 60) { const s = window.FLIGHT.sample(t); out.push({ t, agl: s.agl, bank: s.bank, phi: s.phi, cmd: s.bankCmd, psi: s.psi, cy: s.camYaw, roll: s.rolling, z: s.z }); } return out; }, [DUR]);
const film = S.filter(s => s.t >= 0);
let minA = 1e9, at = 0; for (const s of film) if (s.agl < minA) { minA = s.agl; at = s.t; }
if (minA < FL.clearance) fail(`flies ${minA.toFixed(1)} above the ground at t=${at.toFixed(2)} (clearance ${FL.clearance}) — raise the plan there (see ?map=1)`);
else ok(`clears the ground: lowest ${minA.toFixed(1)} above the terrain at t=${at.toFixed(1)} (clearance ${FL.clearance})`);

let maxRate = 0; for (let i = 1; i < S.length; i++) if (!S[i].roll && !S[i - 1].roll) maxRate = Math.max(maxRate, Math.abs(S[i].phi - S[i - 1].phi) * 60);
const rateDeg = maxRate * 180 / Math.PI, limit = 260 / Math.sqrt(FL.mass);
if (rateDeg > limit) fail(`bank snaps at ${rateDeg.toFixed(0)}°/s (limit ${limit.toFixed(0)}°/s for mass ${FL.mass})`); else ok(`bank never snaps: max ${rateDeg.toFixed(0)}°/s (limit ${limit.toFixed(0)}°/s for mass ${FL.mass})`);
// overshoot: after each change of the bank command, does the bank pass the new command and come back?
const changes = []; for (let i = 1; i < S.length; i++) if (Math.abs(S[i].cmd - S[i - 1].cmd) > .1) changes.push(i);
const over = changes.map(i => { const c = S[i].cmd, d = Math.sign(S[i].cmd - S[i - 1].cmd); let peak = -1e9; for (let k = i; k < Math.min(S.length, i + 150); k++) peak = Math.max(peak, (S[k].phi - c) * d); return peak * 180 / Math.PI; });
if (!changes.length) info('no bank changes in the plan');
else if (over.filter(o => o > .3).length < Math.ceil(changes.length / 2)) fail(`the bank settles without overshoot (${over.map(o => o.toFixed(1)).join(', ')}°) — no inertia`);
else ok(`bank overshoots and settles after ${changes.length} change(s): ${over.map(o => o.toFixed(1) + '°').join(', ')}`);
// rolls gather: the first frames of a roll turn the other way
const rollStarts = []; for (let i = 1; i < S.length; i++) if (S[i].roll && !S[i - 1].roll) rollStarts.push(i);
for (const i of rollStarts) { const dir = Math.sign(S[Math.min(S.length - 1, i + 40)].bank - S[i].bank - (S[Math.min(S.length - 1, i + 40)].phi - S[i].phi)); let anti = 0; for (let k = i; k < i + 20 && k < S.length; k++) anti = Math.max(anti, -dir * ((S[k].bank - S[k].phi) - (S[i].bank - S[i].phi)));
  if (anti * 180 / Math.PI < 2) fail(`the roll at t=${S[i].t.toFixed(1)} starts without gathering (counter-roll ${(anti * 180 / Math.PI).toFixed(1)}°)`); else ok(`the roll at t=${S[i].t.toFixed(1)} gathers first: counter-roll ${(anti * 180 / Math.PI).toFixed(1)}°`); }
let lag = 0; for (const s of film) lag = Math.max(lag, Math.abs(s.psi - s.cy));
if (FL.steps.some(s => s.cam === 'chase' && Math.abs(s.bank) > 5)) { if (lag * 180 / Math.PI < 3) fail('the chase camera turns with the craft rigidly (no lag)'); else ok(`the chase camera lags the heading in turns (up to ${(lag * 180 / Math.PI).toFixed(0)}°)`); }

// 5: the craft
if (FL.slices < 8 || FL.voxels < 150) fail(`the craft is not much of a stack: ${FL.slices} slices, ${FL.voxels} voxels`); else ok(`craft: ${FL.slices} slices, ${FL.voxels} voxels, ${FL.frames} frame(s)`);
const hd = await page.evaluate(() => window.FLIGHT.handedness());
if (hd.missing) fail('the craft has no port / starboard lights (SK.navLights or M.light("port" | "starboard", …))');
else { const unseen = hd.out.filter(h => !h.seen).map(h => h.heading), wrong = hd.out.filter(h => h.seen && h.cross <= 0).map(h => h.heading);
  if (unseen.length) fail(`a nav light is hidden from above at heading ${unseen.join(', ')}° — put them on the top surface or the tips`);
  if (wrong.length) fail(`starboard (green) is left of the nose at heading ${wrong.join(', ')}° — the model is mirrored`);
  if (!unseen.length && !wrong.length) ok('handedness: red port / green starboard seen at 8 headings, starboard always right of the nose'); }

// 7: the format
const short = FL.steps.filter(s => s.t1 - s.t0 < 1.5);
if (FL.steps.length < 3 || cams.length < 2) fail(`the plan needs ≥ 3 steps and ≥ 2 cameras (has ${FL.steps.length}, ${cams.length})`);
else if (short.length) fail(`steps shorter than 1.5 s at t = ${short.map(s => s.t0.toFixed(1)).join(', ')} — cuts too fast to read`);
else if (DUR < 12 || DUR > 120) fail(`length ${DUR} s (12–120)`);
else ok(`format: ${FL.steps.length} steps, ${cams.length} cameras, ${DUR} s`);

// 8: code-only, size
const html = readFileSync(page$, 'utf8');
const libs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => resolve(dirname(page$), m[1])).filter(existsSync);
const code = html.replace(/<script[^>]+src="[^"]+"><\/script>/g, '');
const sins = [];
if (/<img|\.png|\.jpe?g|\.gif|\.webp|\.mp4|\.glb|\.gltf/i.test(code)) sins.push('image / video / model file');
if (/Math\.random|Date\.now|new Date|performance\.now/.test(code)) sins.push('Math.random / Date / performance.now');
if (sins.length) fail('not code-only / not deterministic: ' + sins.join(', ')); else ok('code-only: no image, video or model files; no Math.random or Date in the page');
const kb = f => (statSync(f).size / 1024).toFixed(1);
info(`size: page ${kb(page$)} KB` + libs.map(f => ` + ${f.split('/').pop()} ${kb(f)} KB`).join('') + ` = ${(([page$, ...libs].reduce((a, f) => a + statSync(f).size, 0)) / 1024).toFixed(1)} KB, no assets`);

// 9: speed
const sp = await page.evaluate(() => { const out = {}; for (const c of ['over', 'chase', 'cockpit']) { const st = window.FLIGHT.steps.find(s => s.cam === c); if (!st) continue; const t = (st.t0 + st.t1) / 2; window.seek(t); const t0 = performance.now(); for (let k = 0; k < 8; k++) window.seek(t + k / 30); out[c] = (performance.now() - t0) / 8; } return out; });
const slow = Object.entries(sp).filter(([, ms]) => ms > 33);
info('ms per frame: ' + Object.entries(sp).map(([c, ms]) => `${c} ${ms.toFixed(1)}`).join(' · '));
if (slow.length) fail('too slow for 30 fps live: ' + slow.map(([c]) => c).join(', ')); else ok('fast enough for 30 fps live');

await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok'); process.exit(bad ? 1 : 0);
