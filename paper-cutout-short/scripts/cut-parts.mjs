// paper-cutout-short · cut-parts.mjs — cut a parts sheet (one image with every piece of a puppet or prop laid out apart, from an
// image generator or a scan of real paper) into separate transparent PNG parts, in reading order, with a manifest.
//   node <skill>/scripts/cut-parts.mjs sheets/ember.png --names head,torso,armN,foreN,thighN,shinN,footN,tail --out parts/ember
//   node <skill>/scripts/cut-parts.mjs sheets/props.png --key '#00b140' --tol 70 --out parts/props
// The background is taken from the PNG's alpha when it has one (gpt-image with background=transparent), else from a flat key
// colour (the median of the border, or --key). Pieces closer than --merge px (default 6) are joined into one part (a highlight
// that floats off a cheek); specks under --min px² (default 0.05 % of the sheet) are dropped. Writes:
//   <out>/<name>.png         each part, cropped with --pad px (default 4), background transparent, key-colour spill removed
//   <out>/parts.json         { sheet, size, parts: [{ name, file, x, y, w, h, area }] }
//   <out>/parts.js           the same manifest as an ES module with every PNG inlined as a data URL — pages import this, so
//                            they work from file:// (no fetch, no tainted canvas) and in the render scripts
//   <out>/preview.jpg        the sheet with each part boxed and named in reading order (look at it: did the cut find what you meant?)
// Needs only ffmpeg (decodes and encodes the PNGs).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, basename, relative } from 'node:path';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const sheet = args.find(a => /\.(png|webp|jpe?g)$/i.test(a));
if (!sheet || !existsSync(sheet)) { console.error('usage: cut-parts.mjs <sheet.png> [--names a,b,c] [--out parts/x] [--key #rrggbb] [--tol 60] [--merge 6] [--min px²] [--pad 4]'); process.exit(1); }
const out = resolve(opt('out', join('parts', basename(sheet).replace(/\.\w+$/, ''))));
mkdirSync(out, { recursive: true });

// decode to raw RGBA
const [W, H] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', sheet]).toString().trim().split(',').map(Number);
const px = execFileSync('ffmpeg', ['-v', 'error', '-i', sheet, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: W * H * 4 + 1024 });
const N = W * H;

// the mask: alpha, or distance from the key colour
let transparent = 0; for (let i = 0; i < N; i++) if (px[i * 4 + 3] < 250) transparent++;
const useAlpha = transparent > N * .01 && !opt('key');
const tol = +opt('tol', 60);
let key = null;
if (!useAlpha) {
  if (opt('key')) { const h = opt('key').replace('#', ''); key = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  else {   // median of the border pixels
    const bs = [[], [], []];
    for (let x = 0; x < W; x += 2) for (const y of [0, 1, H - 2, H - 1]) for (let c = 0; c < 3; c++) bs[c].push(px[(y * W + x) * 4 + c]);
    for (let y = 0; y < H; y += 2) for (const x of [0, 1, W - 2, W - 1]) for (let c = 0; c < 3; c++) bs[c].push(px[(y * W + x) * 4 + c]);
    key = bs.map(a => a.sort((p, q) => p - q)[a.length >> 1]);
  }
}
const alpha = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (useAlpha) { alpha[i] = px[i * 4 + 3]; continue; }
  const d = Math.hypot(px[i * 4] - key[0], px[i * 4 + 1] - key[1], px[i * 4 + 2] - key[2]);
  alpha[i] = d <= tol ? 0 : d >= tol * 1.7 ? 255 : Math.round((d - tol) / (tol * .7) * 255);   // a soft edge, not a stair-step
}
const solid = i => alpha[i] > 40;

// connected components (4-neighbour) on the solid mask
const lab = new Int32Array(N).fill(-1), comps = [], stack = new Int32Array(N);
for (let s = 0; s < N; s++) {
  if (lab[s] !== -1 || !solid(s)) continue;
  const id = comps.length; let sp = 0, area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; stack[sp++] = s; lab[s] = id;
  while (sp) {
    const i = stack[--sp], x = i % W, y = (i - x) / W; area++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (x > 0 && lab[i - 1] === -1 && solid(i - 1)) { lab[i - 1] = id; stack[sp++] = i - 1; }
    if (x < W - 1 && lab[i + 1] === -1 && solid(i + 1)) { lab[i + 1] = id; stack[sp++] = i + 1; }
    if (y > 0 && lab[i - W] === -1 && solid(i - W)) { lab[i - W] = id; stack[sp++] = i - W; }
    if (y < H - 1 && lab[i + W] === -1 && solid(i + W)) { lab[i + W] = id; stack[sp++] = i + W; }
  }
  comps.push({ ids: [id], area, x0, y0, x1, y1 });
}
// join pieces whose boxes come within `merge` px, drop specks
const merge = +opt('merge', 6), minA = +opt('min', Math.round(N * .0005));
let groups = comps.filter(c => c.area >= Math.min(minA, 60));
for (let changed = true; changed;) {
  changed = false;
  outer: for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
    const A = groups[a], B = groups[b];
    if (A.x0 - merge <= B.x1 && B.x0 - merge <= A.x1 && A.y0 - merge <= B.y1 && B.y0 - merge <= A.y1) {
      groups[a] = { ids: A.ids.concat(B.ids), area: A.area + B.area, x0: Math.min(A.x0, B.x0), y0: Math.min(A.y0, B.y0), x1: Math.max(A.x1, B.x1), y1: Math.max(A.y1, B.y1) };
      groups.splice(b, 1); changed = true; break outer;
    }
  }
}
const dropped = groups.filter(g => g.area < minA).length;
groups = groups.filter(g => g.area >= minA);
if (!groups.length) { console.error(`no parts found (background ${useAlpha ? 'from alpha' : 'key ' + key}, tol ${tol}) — try --key or --tol`); process.exit(1); }
// reading order: a part joins a row when their vertical spans overlap by ≥ 30 % of the smaller height; rows top → bottom, left → right
groups.sort((a, b) => a.y0 - b.y0);
const rows = [];
for (const g of groups) {
  const r = rows.find(r => Math.min(r.y1, g.y1) - Math.max(r.y0, g.y0) >= .3 * Math.min(r.y1 - r.y0, g.y1 - g.y0));
  if (r) { r.g.push(g); r.y0 = Math.min(r.y0, g.y0); r.y1 = Math.max(r.y1, g.y1); } else rows.push({ y0: g.y0, y1: g.y1, g: [g] });
}
groups = rows.flatMap(r => r.g.sort((a, b) => a.x0 - b.x0));

const names = (opt('names', '') || '').split(',').map(s => s.trim()).filter(Boolean);
if (names.length && names.length !== groups.length) console.warn(`warning: ${names.length} names for ${groups.length} parts — extra parts get numbers; check preview.jpg`);
const pad = +opt('pad', 4), manifest = { sheet: relative(out, resolve(sheet)), size: [W, H], background: useAlpha ? 'alpha' : '#' + key.map(v => v.toString(16).padStart(2, '0')).join(''), parts: [] };
const mod = [];
groups.forEach((g, k) => {
  const name = names[k] || `part-${String(k + 1).padStart(2, '0')}`, set = new Set(g.ids);
  const x0 = Math.max(0, g.x0 - pad), y0 = Math.max(0, g.y0 - pad), x1 = Math.min(W - 1, g.x1 + pad), y1 = Math.min(H - 1, g.y1 + pad), w = x1 - x0 + 1, h = y1 - y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y0 + y) * W + (x0 + x), o = (y * w + x) * 4;
    // keep the pixel if it belongs to this part (or is a soft edge pixel touching it)
    let a = alpha[i];
    if (lab[i] !== -1 && !set.has(lab[i])) a = 0;
    if (lab[i] === -1 && a > 0) { let near = false; for (const d of [-1, 1, -W, W]) { const j = i + d; if (j >= 0 && j < N && set.has(lab[j])) near = true; } if (!near) a = 0; }
    let r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
    if (key && a < 255 && a > 0) {   // remove the key colour bleeding into soft edges
      const k2 = 1 - a / 255; r = Math.round((r - key[0] * k2) / Math.max(.2, 1 - k2)); gg = Math.round((gg - key[1] * k2) / Math.max(.2, 1 - k2)); b = Math.round((b - key[2] * k2) / Math.max(.2, 1 - k2));
    }
    buf[o] = Math.max(0, Math.min(255, r)); buf[o + 1] = Math.max(0, Math.min(255, gg)); buf[o + 2] = Math.max(0, Math.min(255, b)); buf[o + 3] = a;
  }
  const file = `${name}.png`, f = join(out, file);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', '-pix_fmt', 'rgba', f], { input: buf });
  manifest.parts.push({ name, file, x: x0, y: y0, w, h, area: g.area });
  mod.push(`  ${JSON.stringify(name)}: { w: ${w}, h: ${h}, x: ${x0}, y: ${y0}, src: 'data:image/png;base64,${readFileSync(f).toString('base64')}' }`);
});
writeFileSync(join(out, 'parts.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(out, 'parts.js'), `// cut by paper-cutout-short/scripts/cut-parts.mjs from ${manifest.sheet} — do not edit; re-cut instead\nexport default {\n${mod.join(',\n')}\n};\n`);
// preview: boxes and names on the sheet
const esc = s => s.replace(/[:\\']/g, '\\$&');
const vf = manifest.parts.map((p, k) => `drawbox=x=${p.x}:y=${p.y}:w=${p.w}:h=${p.h}:color=red@0.8:t=3,drawtext=text='${k + 1} ${esc(p.name)}':x=${p.x + 4}:y=${p.y + 4}:fontsize=${Math.max(14, Math.round(W / 70))}:fontcolor=white:box=1:boxcolor=black@0.6`).join(',');
try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', sheet, '-vf', vf + ',scale=min(1600\\,iw):-2', '-q:v', '3', join(out, 'preview.jpg')]); } catch (e) { console.warn('preview.jpg not written:', e.message.split('\n')[0]); }
console.log(`${groups.length} parts (${useAlpha ? 'alpha' : 'key ' + manifest.background}, ${dropped} specks dropped) → ${out}/`);
for (const p of manifest.parts) console.log(`  ${p.name.padEnd(12)} ${p.w}×${p.h}  at ${p.x},${p.y}`);
