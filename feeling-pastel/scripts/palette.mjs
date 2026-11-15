#!/usr/bin/env node
// palette.mjs — pull a palette out of reference pictures (the user's "see the oav folder"), via ffmpeg. No browser.
//   node <skill>/scripts/palette.mjs refs/ [--k 12] [--out out/palette.png]
// Prints the colours darkest → lightest as hex (paste them into BRIEF.md → Palette) and writes a swatch sheet.
// It reads colour only. What the pictures show is never copied into the piece.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { writePNG } from './png.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const k = +opt('k', 12), out = opt('out', 'out/palette.png');
const inputs = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'))
  .flatMap((p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((f) => path.join(p, f)) : [p]))
  .filter((f) => /\.(jpe?g|png|webp|gif|bmp)$/i.test(f));
if (!inputs.length) { console.error('give a folder or pictures'); process.exit(1); }
const px = [];
for (const f of inputs) {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-vf', 'scale=96:-1', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 });
  for (let i = 0; i + 2 < raw.length; i += 3) px.push([raw[i] / 255, raw[i + 1] / 255, raw[i + 2] / 255]);
}
// k-means++ (seeded) in RGB
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const C = [px[Math.floor(rnd() * px.length)]];
while (C.length < k) { const ds = px.map((p) => Math.min(...C.map((c) => d2(p, c)))); let t = rnd() * ds.reduce((a, b) => a + b, 0), i = 0; while ((t -= ds[i]) > 0 && i < px.length - 1) i++; C.push(px[i]); }
let count = [];
for (let it = 0; it < 20; it++) {
  const sum = C.map(() => [0, 0, 0]); count = C.map(() => 0);
  for (const p of px) { let bi = 0, bd = 9; C.forEach((c, j) => { const dd = d2(p, c); if (dd < bd) { bd = dd; bi = j; } }); sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2] += p[2]; count[bi]++; }
  C.forEach((c, j) => { if (count[j]) C[j] = sum[j].map((v) => v / count[j]); });
}
const order = C.map((c, j) => ({ c, n: count[j], l: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] })).filter((x) => x.n).sort((a, b) => a.l - b.l);
const hex = (c) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
console.log(order.map((x) => `${hex(x.c)}  ${(100 * x.n / px.length).toFixed(1).padStart(5)} %`).join('\n'));
const SW = 80, img = new Uint8ClampedArray(order.length * SW * SW * 4);
order.forEach((x, j) => { for (let y = 0; y < SW; y++) for (let i = 0; i < SW; i++) { const o = (y * order.length * SW + j * SW + i) * 4; img[o] = x.c[0] * 255; img[o + 1] = x.c[1] * 255; img[o + 2] = x.c[2] * 255; img[o + 3] = 255; } });
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
writePNG(out, img, order.length * SW, SW);
console.log(`\n${out} (${inputs.length} picture${inputs.length > 1 ? 's' : ''})`);
