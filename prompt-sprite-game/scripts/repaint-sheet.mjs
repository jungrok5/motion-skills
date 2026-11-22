// repaint-sheet.mjs — same character, new look: paint a base sprite with Tessera, then repaint one region per edit.
//
//   node <skill>/scripts/repaint-sheet.mjs --base="orange cat" [--base-seed=7] \
//        [--edits="orange cat wearing a wizard hat:hat|orange cat with a red scarf:neck|orange cat in the rain:background"] \
//        [--shrink=12 --anchor=left|center|right] [--seed=11] [--count=4] [--out=ref/repaint.png]
//
// Regions come from lib/decorate.js (hat, crown, eyes, neck, feet, background, all). Each row: the base, the freed
// region tinted, then `count` repaints; every kept pixel is identical to the base. --shrink scales the base down first
// (lib/decorate.js shrink) so props have room beside it. CPU ~65 s per edit here.
// Output is generated imagery: keep it in ref/ (git-ignored), never in docs/.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBlank, flag, savePNG } from './_lib.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = String(flag('base', 'orange cat')); const baseSeed = Number(flag('base-seed', 7));
const edits = String(flag('edits', `${base} wearing a wizard hat:hat|${base} with a red scarf:neck|${base} wearing sunglasses:eyes|${base} holding a fish:background`))
  .split('|').filter(Boolean).map((s) => { const i = s.lastIndexOf(':'); return { prompt: s.slice(0, i), region: s.slice(i + 1) }; });
const shrinkTo = Number(flag('shrink', 0)); const anchor = flag('anchor', 'left');
const seed = Number(flag('seed', 11)); const count = Number(flag('count', 4)); const out = flag('out', 'ref/repaint.png');

const { page, errors, close } = await openBlank(skill);
const res = await page.evaluate(async ({ base, baseSeed, edits, seed, count, shrinkTo, anchor }) => {
  const T = await import('/lib/tessera-link.js'); const D = await import('/lib/decorate.js');
  const device = navigator.gpu ? 'auto' : 'wasm';
  const [b0] = await T.paintTokens(base, { seed: baseSeed, count: 1, device });
  if (shrinkTo) { b0.tokens = D.shrink(b0.tokens, shrinkTo, anchor); const t = await T.loadTessera({ device }); b0.rgba = new Uint8ClampedArray(256 * 4); for (let i = 0; i < 256; i++) b0.rgba.set(t.palette.subarray(b0.tokens[i] * 4, b0.tokens[i] * 4 + 4), i * 4); }
  const rows = [];
  for (const e of edits) {
    const keep = D.keepMask(b0.tokens, e.region); const t0 = performance.now();
    const outs = await T.repaint(b0.tokens, keep, e.prompt, { seed, count, device });
    rows.push({ ...e, keep: Array.from(keep), ms: performance.now() - t0, rgba: outs.map((o) => o.rgba) });
  }
  const Z = 6, S = 16 * Z, G = 6, lab = 330, head = 8;
  const W = lab + (count + 2) * (S + G) + 20, H = head + (rows.length + 1) * (S + G);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#18181e'; x.fillRect(0, 0, W, H);
  const s16 = document.createElement('canvas'); s16.width = s16.height = 16;
  const put = (rgba, px, py, keep) => {
    const img = new ImageData(new Uint8ClampedArray(rgba), 16, 16);
    if (keep) for (let i = 0; i < 256; i++) if (!keep[i]) { img.data[i * 4] = 200; img.data[i * 4 + 1] = 60; img.data[i * 4 + 2] = 200; img.data[i * 4 + 3] = 255; }
    s16.getContext('2d').putImageData(img, 0, 0); x.fillStyle = '#30303a'; x.fillRect(px, py, S, S); x.drawImage(s16, px, py, S, S);
  };
  x.font = '15px sans-serif'; x.fillStyle = '#ffcf5a'; x.fillText(`${base} (base)`, 10, head + S / 2); put(b0.rgba, lab, head);
  rows.forEach((r, k) => {
    const y = head + (k + 1) * (S + G);
    x.fillStyle = '#ddd8cc'; x.fillText(r.prompt, 10, y + S / 2 - 6); x.fillStyle = '#99948a'; x.fillText(`region: ${r.region}`, 10, y + S / 2 + 14);
    put(b0.rgba, lab, y); put(b0.rgba, lab + S + G, y, r.keep);
    r.rgba.forEach((rgba, j) => put(rgba, lab + (j + 2) * (S + G) + 20, y));
  });
  return { png: c.toDataURL('image/png'), ms: rows.map((r) => Math.round(r.ms)) };
}, { base, baseSeed, edits, seed, count, shrinkTo, anchor });
savePNG(out, res.png); console.log(`ms per edit: ${res.ms.join(' ')} → ${out}`); if (errors.length) console.log('page errors:', errors);
await close();
