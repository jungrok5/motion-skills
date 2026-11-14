#!/usr/bin/env node
// check.mjs — does the piece keep the style's promises? Pure Node, no browser.
//   node <skill>/scripts/check.mjs art.js [--brief BRIEF.md] [--scale .5]
// Fails (exit 1) on: not 16:9 · fewer than 3 or more than 5 drawing tools · a stage with no strokes · paper left bare
// (every pixel is used) · flat, digital-looking areas (a hand never lays a perfectly even field) · too narrow a value range ·
// blown-out or black areas · a word from BRIEF.md's "Never drawn" list used in the code · not deterministic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadArt } from './load.mjs';

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--') && /\.m?js$/.test(a)) || 'art.js';
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const scale = +opt('scale', 0.5);
const briefFile = opt('brief', path.join(path.dirname(path.resolve(file)), 'BRIEF.md'));
const fails = [], notes = [];
const ok = (cond, msg, note) => { (cond ? notes : fails).push((cond ? 'ok   ' : 'FAIL ') + msg + (note ? ` — ${note}` : '')); };

const { d, Surface } = await loadArt(file);
const render = (s) => { const surf = new Surface(d.W, d.H, s, d.paper); for (const op of d.ops) surf.apply(op); return surf; };

// 1. format
ok(Math.abs(d.W / d.H - 16 / 9) < 0.01, `16:9 canvas`, `${d.W}×${d.H}`);
// 2. tools: 3–5 drawing tools (the finger / blender is not counted)
const tools = [...d.toolsUsed.keys()].filter((n) => n !== 'blender');
ok(tools.length >= 3 && tools.length <= 5, `3–5 dry tools`, tools.join(' · '));
// 3. stages
ok(d.stages.length >= 3, `at least 3 stages`, d.stages.map((s) => s.name).join(' → '));
d.stages.forEach((s, i) => { const n = (d.stages[i + 1]?.start ?? d.ops.length) - s.start; if (n <= 0) fails.push(`FAIL stage "${s.name}" has no strokes`); });

const surf = render(scale);
const { w, h } = surf, C = surf.rgb, F = surf.fill;
const L = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) L[i] = 0.2126 * C[i * 3] + 0.7152 * C[i * 3 + 1] + 0.0722 * C[i * 3 + 2];
// 4. every pixel used: tiles where the paper is (almost) untouched
const tile = Math.max(8, Math.round(40 * scale));
let tiles = 0, bare = 0, flat = 0;
const bareAt = [], flatAt = [];
for (let ty = 0; ty + tile <= h; ty += tile) for (let tx = 0; tx + tile <= w; tx += tile) {
  let f = 0, s = 0, s2 = 0, n = 0;
  for (let y = ty; y < ty + tile; y++) for (let x = tx; x < tx + tile; x++) { const p = y * w + x; f += F[p]; s += L[p]; s2 += L[p] * L[p]; n++; }
  tiles++;
  const mf = f / n, sd = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
  if (mf < 0.12) { bare++; bareAt.push([Math.round(tx / scale), Math.round(ty / scale)]); }
  if (sd < 0.012) { flat++; flatAt.push([Math.round(tx / scale), Math.round(ty / scale)]); }
}
ok(bare / tiles < 0.01, `every part of the sheet is worked`, `${bare}/${tiles} bare tiles${bare ? ' e.g. at ' + bareAt.slice(0, 4).map((p) => p.join(',')).join(' ') : ''}`);
ok(flat / tiles < 0.02, `no flat, even fields (human marks everywhere)`, `${flat}/${tiles} flat tiles${flat ? ' e.g. at ' + flatAt.slice(0, 4).map((p) => p.join(',')).join(' ') : ''}`);
// 5. value range and clipping
const sorted = Float32Array.from(L).sort();
const p2 = sorted[Math.floor(sorted.length * 0.02)], p98 = sorted[Math.floor(sorted.length * 0.98)];
// a night piece is low-key and a snow piece high-key; what matters is the range between the darkest darks and the lightest lights
ok(p98 - p2 >= 0.4, `a real value range (darks to lights)`, `2nd pct ${p2.toFixed(2)}, 98th ${p98.toFixed(2)}, range ${(p98 - p2).toFixed(2)}, ${p98 < 0.65 ? 'low' : p2 > 0.35 ? 'high' : 'full'} key`);
let white = 0, black = 0;
for (let i = 0; i < w * h; i++) { if (C[i * 3] > 0.985 && C[i * 3 + 1] > 0.985 && C[i * 3 + 2] > 0.985) white++; if (L[i] < 0.02) black++; }
ok(white / (w * h) < 0.03 && black / (w * h) < 0.01, `not blown out, not black`, `${(100 * white / (w * h)).toFixed(1)} % white, ${(100 * black / (w * h)).toFixed(1)} % black`);
// 6. colour: mean saturation (90s anime colour is saturated but not neon) — reported, not failed
let sat = 0; for (let i = 0; i < w * h; i++) { const r = C[i * 3], g = C[i * 3 + 1], b = C[i * 3 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx ? (mx - mn) / mx : 0; }
notes.push(`info mean saturation ${(sat / (w * h)).toFixed(2)} · ${d.ops.length} strokes`);
// 7. never drawn: words from BRIEF.md "Never drawn" must not name anything in the code
if (fs.existsSync(briefFile)) {
  const brief = fs.readFileSync(briefFile, 'utf8');
  const sec = (brief.match(/##\s*Never drawn[^\n]*\n([\s\S]*?)(\n##\s|$)/i) || [])[1] || '';
  const words = sec.split('\n').map((l) => l.replace(/^[-*\s]+/, '').split(/[—(:]/)[0].trim()).filter(Boolean).flatMap((l) => l.split(/[,/·]/)).map((x) => x.trim().toLowerCase()).filter((x) => x.length > 1);
  const code = fs.readFileSync(path.resolve(file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').toLowerCase();
  const hit = words.filter((wd) => new RegExp(`(^|[^a-z가-힣])${wd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z가-힣]|$)`).test(code));
  ok(words.length > 0, `BRIEF.md lists what is never drawn`, `${words.length} words`);
  ok(!hit.length, `nothing from the story is drawn (by name)`, hit.length ? hit.join(', ') : '');
} else fails.push(`FAIL no BRIEF.md beside ${file} (write it first: references/BRIEF.md)`);
// 8. deterministic
const hash = (s) => crypto.createHash('md5').update(Buffer.from(s.rgb.buffer)).digest('hex');
const again = await loadArt(file);
const s1 = new Surface(d.W, d.H, 0.2, d.paper), s2 = new Surface(again.d.W, again.d.H, 0.2, again.d.paper);
for (const op of d.ops) s1.apply(op);
for (const op of again.d.ops) s2.apply(op);
ok(hash(s1) === hash(s2) && d.ops.length === again.d.ops.length, `deterministic (same strokes, same pixels)`);

console.log(notes.concat(fails).join('\n'));
if (fails.length) { console.log(`\n${fails.length} problem(s).`); process.exit(1); }
console.log('\nall checks passed');
