#!/usr/bin/env node
// render.mjs — play a piece's strokes onto paper and save it. Pure Node: no browser, no GPU.
//   node <skill>/scripts/render.mjs art.js                     out/piece.png at 1920×1080
//   node <skill>/scripts/render.mjs art.js --scale 2           3840×2160 (the masterpiece size)
//   node <skill>/scripts/render.mjs art.js --scale .5 --stages  out/stage-<n>-<name>.png at the end of each stage + out/stages.png sheet
//   node <skill>/scripts/render.mjs art.js --crops              three 100 % crops (out/crop-*.png) to judge the marks up close
//   node <skill>/scripts/render.mjs art.js --film --seconds 24  out/piece.mp4: the drawing laid down stroke by stroke (ffmpeg)
//   --out <dir> (default out/ beside art.js) · --name piece
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadArt } from './load.mjs';
import { writePNG, downscale } from './png.mjs';

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--') && /\.m?js$/.test(a)) || 'art.js';
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true; };
const scale = +opt('scale', 1);
const out = path.resolve(opt('out', path.join(path.dirname(path.resolve(file)), 'out')));
const name = opt('name', 'piece');
fs.mkdirSync(out, { recursive: true });

const t0 = Date.now();
const { d, Surface } = await loadArt(file);
const surf = new Surface(d.W, d.H, scale, d.paper);
const { w, h } = surf;
console.log(`${d.title || file}: ${d.ops.length} strokes, ${d.stages.length} stages, tools ${[...d.toolsUsed.keys()].join(' · ')} → ${w}×${h}`);
const rgba = new Uint8ClampedArray(w * h * 4);

if (opt('film', false)) {
  const fps = +opt('fps', 30), secs = +opt('seconds', 24), hold = +opt('hold', 3);
  const fw = Math.min(w, +opt('width', 1920)) & ~1, fh = Math.round((fw * h) / w) & ~1;
  const frames = Math.round(fps * secs), file4 = path.join(out, name + '.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${fw}x${fh}`, '-r', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', file4], { stdio: ['pipe', 'inherit', 'inherit'] });
  // time is shared by stroke area (a big side stroke takes longer than a dab), eased so the start is not a blur
  const cost = d.ops.map((o) => Math.max(1, o.width) * Math.max(4, o.pts.length * 3));
  const total = cost.reduce((a, b) => a + b, 0);
  let k = 0, acc = 0;
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
  for (let f = 0; f < frames; f++) {
    const target = total * (f + 1) / frames;
    while (k < d.ops.length && acc + cost[k] <= target) { surf.apply(d.ops[k]); acc += cost[k]; k++; }
    surf.toRGBA(rgba);
    const fr = fw === w ? rgba : downscale(rgba, w, h, fw).data;
    await write(Buffer.from(fr.buffer, fr.byteOffset, fr.byteLength));
  }
  while (k < d.ops.length) surf.apply(d.ops[k++]);
  surf.toRGBA(rgba);
  const last = Buffer.from((fw === w ? rgba : downscale(rgba, w, h, fw).data).buffer);
  for (let f = 0; f < fps * hold; f++) await write(last);
  ff.stdin.end();
  await new Promise((res) => ff.on('close', res));
  writePNG(path.join(out, name + '.png'), rgba, w, h);
  console.log(`${file4} (${secs + hold} s) + ${name}.png in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}

const stills = [];
const bounds = d.stages.map((s, i) => [s, d.stages[i + 1] ? d.stages[i + 1].start : d.ops.length]);
let k = 0;
if (opt('stages', false) && bounds.length) {
  for (const [i, [st, end]] of bounds.entries()) {
    while (k < end) surf.apply(d.ops[k++]);
    surf.toRGBA(rgba);
    const f = path.join(out, `stage-${i + 1}-${st.name.replace(/\W+/g, '-')}.png`);
    writePNG(f, rgba, w, h);
    stills.push({ ...downscale(rgba, w, h, 640), label: st.name });
    console.log(`  ${f} (${end - st.start} strokes)`);
  }
  // sheet: stages in a grid, 640 px each
  const cols = Math.min(3, stills.length), rows = Math.ceil(stills.length / cols), tw = stills[0].w, th = stills[0].h, G = 8;
  const SW = cols * tw + (cols + 1) * G, SH = rows * th + (rows + 1) * G, sheet = new Uint8ClampedArray(SW * SH * 4).fill(30);
  stills.forEach((s, i) => { const ox = G + (i % cols) * (tw + G), oy = G + Math.floor(i / cols) * (th + G); for (let y = 0; y < th; y++) sheet.set(s.data.subarray(y * tw * 4, (y + 1) * tw * 4), ((oy + y) * SW + ox) * 4); });
  for (let i = 3; i < sheet.length; i += 4) sheet[i] = 255;
  writePNG(path.join(out, 'stages.png'), sheet, SW, SH);
}
while (k < d.ops.length) surf.apply(d.ops[k++]);
surf.toRGBA(rgba);
writePNG(path.join(out, name + '.png'), rgba, w, h);
if (opt('crops', false)) {
  // 100 % crops from three places the eye goes: upper third, centre, lower third
  const cw = Math.min(w, 720), ch = Math.min(h, 720);
  [[0.22, 0.25], [0.5, 0.5], [0.78, 0.78]].forEach(([fx, fy], i) => {
    const x0 = Math.max(0, Math.min(w - cw, Math.round(fx * w - cw / 2))), y0 = Math.max(0, Math.min(h - ch, Math.round(fy * h - ch / 2))), c = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) c.set(rgba.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x0 + cw) * 4), y * cw * 4);
    writePNG(path.join(out, `crop-${i + 1}.png`), c, cw, ch);
  });
}
console.log(`${path.join(out, name + '.png')} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
