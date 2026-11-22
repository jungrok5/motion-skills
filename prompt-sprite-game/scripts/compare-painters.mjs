// compare-painters.mjs — the same prompts, side by side: Tessera-small and/or a themed painter under one or more settings.
//
//   node <skill>/scripts/compare-painters.mjs --prompts="ginger cat|black cat|ghost cat" \
//        [--painter=models/cat/cat] [--tessera] [--settings='first:{"steps":12,"temp":1,"topP":1,"nms":false,"despeckle":false}|now:{}'] \
//        [--seed=7] [--count=4] [--out=ref/compare.png]
//
// Columns: Tessera (if --tessera; CPU ~65 s per prompt here, WebGPU ~1 s) then one block per painter setting
// (`{}` = the painter's own defaults from its JSON). Writes a PNG and prints ms per prompt. The PNG shows generated
// sprites: keep it in a git-ignored place (ref/), never in docs/.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBlank, flag, savePNG } from './_lib.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prompts = String(flag('prompts', 'ginger cat|black cat|calico cat|siamese cat|ghost cat')).split('|').map((s) => s.trim()).filter(Boolean);
const painter = flag('painter', 'models/cat/cat');
const sets = String(flag('settings', 'now:{}')).split('|').filter(Boolean).map((s) => { const i = s.indexOf(':'); return { label: s.slice(0, i), opts: JSON.parse(s.slice(i + 1) || '{}') }; });
const tessera = !!flag('tessera'); const seed = Number(flag('seed', 7)); const count = Number(flag('count', 4));
const out = flag('out', 'ref/compare.png');

const { page, errors, close } = await openBlank(skill);
const res = await page.evaluate(async ({ prompts, painter, sets, tessera, seed, count }) => {
  const cols = [];
  if (tessera) {
    const T = await import('/lib/tessera-link.js'); const rows = [];
    for (const p of prompts) { const t0 = performance.now(); rows.push({ ms: performance.now() - t0, rgba: await T.paint(p, { seed, count, device: navigator.gpu ? 'auto' : 'wasm' }) }); rows.at(-1).ms = performance.now() - t0; }
    cols.push({ label: 'Tessera-small', rows });
  }
  if (painter && sets.length) {
    const { loadPainter } = await import('/lib/painter-link.js'); const P = await loadPainter(painter.startsWith('http') ? painter : '/' + painter);
    for (const s of sets) {
      const rows = [];
      for (const p of prompts) { const t0 = performance.now(); const rgba = await P.paint(p, { seed, count, ...s.opts }); rows.push({ ms: performance.now() - t0, rgba }); }
      cols.push({ label: `${P.meta.name} painter · ${s.label}`, rows });
    }
  }
  // sheet
  const Z = 6, T = 16 * Z, G = 4, gap = 30, lab = 230, head = 36;
  const W = lab + cols.length * count * (T + G) + (cols.length - 1) * gap, H = head + prompts.length * (T + G);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#18181e'; x.fillRect(0, 0, W, H); x.font = '16px sans-serif';
  const s16 = document.createElement('canvas'); s16.width = s16.height = 16;
  cols.forEach((col, ci) => {
    const x0 = lab + ci * (count * (T + G) + gap);
    x.fillStyle = '#ffcf5a'; x.fillText(col.label, x0, 22);
    col.rows.forEach((row, ri) => row.rgba.forEach((rgba, k) => {
      s16.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), 16, 16), 0, 0);
      x.fillStyle = '#30303a'; x.fillRect(x0 + k * (T + G), head + ri * (T + G), T, T); x.drawImage(s16, x0 + k * (T + G), head + ri * (T + G), T, T);
    }));
  });
  x.fillStyle = '#ddd8cc'; x.font = '14px sans-serif'; prompts.forEach((p, ri) => x.fillText(p, 10, head + ri * (T + G) + T / 2));
  return { png: c.toDataURL('image/png'), ms: cols.map((col) => ({ label: col.label, ms: Math.round(col.rows.reduce((a, r) => a + r.ms, 0) / col.rows.length) })) };
}, { prompts, painter, sets, tessera, seed, count });
savePNG(out, res.png);
for (const m of res.ms) console.log(`${m.label}: ${m.ms} ms per prompt (${count} sprites)`);
console.log(`→ ${out}`); if (errors.length) console.log('page errors:', errors);
await close();
