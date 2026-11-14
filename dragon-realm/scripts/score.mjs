// dragon-realm · score.mjs — render a film's score in Node (no browser) and measure it.
//   node <skill>/scripts/score.mjs <film-dir>            → <film-dir>/out/score.wav (16-bit stereo 44.1 kHz) + a report
// The score is whatever the film registered with DR.score(...).  Only the sources that make sound are loaded:
// lib/00_core.js, lib/85_audio.js and the film's src files whose names contain beat / score / audio / sound / music
// (or the list given with --src a.js,b.js).  render.mjs muxes out/score.wav into the MP4 when it exists.
// Options: --solo bus,group   --mute bus,group   (stems keep the gain of the full mix and skip the limiter)
//          --stems            every bus alone → out/stems/<bus>.wav and a table of loudness per section
//          --from s --to s    write only that part      --name score      --out out      --no-wav      --twice (determinism)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
const args = process.argv.slice(2), has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.'), srcDir = join(dir, 'src');
if (!existsSync(srcDir)) { console.error('usage: score.mjs <film-dir> [--solo a,b] [--mute a,b] [--stems] [--from s --to s] [--twice]'); process.exit(1); }
const pick = opt('src') ? opt('src').split(',') : readdirSync(srcDir).filter((f) => f.endsWith('.js') && /beat|score|audio|sound|music/i.test(f)).sort();
const code = [join(skill, 'lib', '00_core.js'), join(skill, 'lib', '85_audio.js'), ...pick.map((f) => join(srcDir, f))].map((f) => readFileSync(f, 'utf8')).join('\n;\n');
const DR = new Function(code + '\n;return DR;')();
if (!DR.audio) { console.error(`no score: none of [${pick.join(', ')}] called DR.score(fn, opts)`); process.exit(1); }
const outDir = resolve(dir, opt('out', 'out')); mkdirSync(outDir, { recursive: true });
const SR = 44100, dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity), f1 = (x) => (isFinite(x) ? x.toFixed(1) : '-inf').padStart(6);
const sha = (r) => createHash('sha256').update(Buffer.from(r.L.buffer, r.L.byteOffset, r.L.byteLength)).update(Buffer.from(r.R.buffer, r.R.byteOffset, r.R.byteLength)).digest('hex');
const save = (name, r, from = 0, to = Infinity) => { const a = Math.max(0, Math.round(from * SR)), b = Math.min(r.L.length, Math.round(to * SR)), f = join(outDir, name); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, DR.audio.wav(r.L.subarray(a, b), r.R.subarray(a, b), SR)); return f; };
const opts = DR.audio.options, beats = opts.beats || {}, DUR = opts.duration;
const marks = Object.entries(beats).filter(([, t]) => typeof t === 'number' && t <= DUR).sort((a, b) => a[1] - b[1]);
const sections = []; for (let i = 0; i < marks.length; i++) { const t0 = marks[i][1], nx = marks.slice(i + 1).find((m) => m[1] > t0); if (nx && !sections.some((s) => s.t0 === t0)) sections.push({ name: marks[i][0], t0, t1: nx[1] }); }
if (!sections.length) sections.push({ name: 'ALL', t0: 0, t1: DUR });
const meterOf = (r) => DR.synthKit({ duration: 0.1 }).meter(r.L, r.R);

const solo = opt('solo'), mute = opt('mute');
const t0 = Date.now(), full = await DR.audio.render({ worker: false }), msFull = Date.now() - t0;
let r = full;
if (solo || mute) r = await DR.audio.render({ worker: false, solo, mute, master: Object.assign({}, opts.master, { gain: full.info.gain, limit: false }) });

// ── the report ──
const { L, R } = r, n = L.length; let bad = 0, pk = 0, sl = 0, sr = 0, ll = 0, rr = 0, lr = 0, jump = 0, jumpAt = 0, mm = 0, ss = 0;
for (let i = 0; i < n; i++) { const l = L[i], q = R[i]; if (!isFinite(l) || !isFinite(q)) bad++; const a = Math.max(Math.abs(l), Math.abs(q)); if (a > pk) pk = a; sl += l; sr += q; ll += l * l; rr += q * q; lr += l * q; mm += (l + q) * (l + q) / 4; ss += (l - q) * (l - q) / 4;
  if (i) { const d = Math.max(Math.abs(l - L[i - 1]), Math.abs(q - R[i - 1])); if (d > jump) { jump = d; jumpAt = i; } } }
// true peak: 4× windowed-sinc interpolation
let tp = pk; { const T = 8, ph = [1, 2, 3].map((p) => Array.from({ length: 2 * T }, (_, j) => { const x = j - (T - 1) - p / 4; return (Math.sin(Math.PI * x) / (Math.PI * x)) * (0.5 + 0.5 * Math.cos((Math.PI * x) / T)); }));
  for (const x of [L, R]) for (let i = T; i < n - T - 1; i++) { if (Math.abs(x[i]) < pk * 0.5 && Math.abs(x[i + 1]) < pk * 0.5) continue; for (const c of ph) { let s = 0; for (let j = 0; j < 2 * T; j++) s += x[i - (T - 1) + j] * c[j]; if (Math.abs(s) > tp) tp = Math.abs(s); } } }
const rms = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += L[i] * L[i] + R[i] * R[i]; return Math.sqrt(s / (2 * (b - a))); };
const q = Math.round(0.25 * SR), m = meterOf(r), loop = Math.max(Math.abs(L[0] - L[n - 1]), Math.abs(R[0] - R[n - 1]));
console.log(`sources: ${pick.join(', ')}${solo ? '   solo: ' + solo : ''}${mute ? '   mute: ' + mute : ''}`);
console.log(`rendered ${(n / SR).toFixed(2)} s in ${(msFull / 1000).toFixed(1)} s (Node, one core) · buses: ${full.info.buses.join(' ')}`);
console.log(`integrated ${m.integrated.toFixed(1)} LUFS (mix before the master gain ${full.info.lufsIn.toFixed(1)}, gain ${dB(full.info.gain).toFixed(1)} dB, limiter touched ${((full.info.limited || 0) * 100).toFixed(2)} % of samples)`);
console.log(`peak ${dB(pk).toFixed(2)} dBFS · true peak ${dB(tp).toFixed(2)} dBTP · DC ${(sl / n).toExponential(1)} / ${(sr / n).toExponential(1)} · NaN/Inf ${bad}`);
console.log(`stereo: L/R correlation ${(lr / Math.sqrt(ll * rr || 1)).toFixed(2)} · side/mid ${dB(Math.sqrt(ss / (mm || 1))).toFixed(1)} dB · mono sum ${dB(Math.sqrt(mm / ((ll + rr) / 2 || 1))).toFixed(1)} dB vs stereo`);
console.log(`largest step ${jump.toFixed(3)} at ${(jumpAt / SR).toFixed(3)} s · loop joint step ${loop.toExponential(1)} · first 0.25 s ${dB(rms(0, q)).toFixed(1)} dB rms, last 0.25 s ${dB(rms(n - q, n)).toFixed(1)} dB rms`);
console.log('\nsection          from     to    LUFS   peak dB');
for (const s of sections) { let p = 0; for (let i = Math.round(s.t0 * SR); i < Math.min(n, Math.round(s.t1 * SR)); i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i])); console.log(`${s.name.padEnd(12)} ${s.t0.toFixed(1).padStart(7)} ${s.t1.toFixed(1).padStart(6)}  ${f1(m.range(s.t0, s.t1))}  ${f1(dB(p))}`); }
console.log(`\nsha256 ${sha(r)}`);
if (has('twice')) { const again = await DR.audio.render({ worker: false, solo, mute, master: solo || mute ? Object.assign({}, opts.master, { gain: full.info.gain, limit: false }) : opts.master }); console.log(`second render ${sha(again) === sha(r) ? 'identical' : 'DIFFERENT — the score is not deterministic'}`); }
if (!has('no-wav')) console.log(save(opt('name', solo || mute ? 'part' : 'score') + '.wav', r, +opt('from', 0), +opt('to', Infinity)));

if (has('stems')) {
  console.log('\nstems (LUFS per section; same gain as the mix, no limiter)\n' + 'bus'.padEnd(11) + sections.map((s) => s.name.slice(0, 6).padStart(7)).join(''));
  for (const b of full.info.buses) { const st = await DR.audio.render({ worker: false, solo: b, master: Object.assign({}, opts.master, { gain: full.info.gain, limit: false }) }), ms = meterOf(st);
    console.log(b.padEnd(11) + sections.map((s) => { const v = ms.range(s.t0, s.t1); return (v < -70 ? '·' : v.toFixed(0)).padStart(7); }).join('')); save(join('stems', b + '.wav'), st); }
}
