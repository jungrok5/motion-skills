// landmark-map-3d · place-map.mjs — draw place.json from above with a metre grid, so you can see what the data holds and
// read off coordinates for the landmark, the camera path, labels and street names. Writes out/place-map.png.
//   node <skill>/scripts/place-map.mjs place.json [--px 2400] [--out out/place-map.png] [--grid 100]
//   node <skill>/scripts/place-map.mjs place.json --find "Champ"          (also lists roads / POIs / areas whose name matches)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const src = resolve(args.find(a => a.endsWith('.json')) || 'place.json');
const place = JSON.parse(readFileSync(src, 'utf8'));
const find = opt('find');
if (find) {
  const re = new RegExp(find, 'i'), nm = n => n ? Object.values(n).join(' / ') : '';
  const mid = p => p[Math.floor(p.length / 2)].map(Math.round).join(', ');
  for (const r of place.roads) if (re.test(nm(r.n))) console.log(`road  ${r.k.padEnd(12)} ${nm(r.n)}  @ ${mid(r.p)}`);
  for (const a of place.areas) if (re.test(nm(a.n))) console.log(`area  ${a.k.padEnd(12)} ${nm(a.n)}  @ ${mid(a.p)}`);
  for (const b of place.buildings) if (re.test(nm(b.n))) console.log(`bldg  ${String(b.kind).padEnd(12)} ${nm(b.n)}  @ ${mid(b.p)}  id ${b.id}${b.h ? '  h ' + b.h : ''}`);
  for (const p of place.pois) if (re.test(nm(p.n))) console.log(`poi   ${p.c.padEnd(12)} ${nm(p.n)}  @ ${Math.round(p.x)}, ${Math.round(p.z)}`);
  process.exit(0);
}
const px = +opt('px', 2400), grid = +opt('grid', 100), out = resolve(opt('out', join(dirname(src), 'out', 'place-map.png')));
mkdirSync(dirname(out), { recursive: true });
const [W, H] = place.size, s = px / Math.max(W, H), cw = Math.round(W * s), ch = Math.round(H * s);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
const data = await page.evaluate(({ place, cw, ch, s, grid }) => {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  const [W, H] = place.size, X = x => (x + W / 2) * s, Z = z => (z + H / 2) * s;
  const poly = (p, holes) => { g.beginPath(); for (const r of [p, ...(holes || [])]) { r.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.closePath(); } };
  g.fillStyle = '#ece6dc'; g.fillRect(0, 0, cw, ch);
  const AC = { water: '#7fb6e6', fountain: '#9cc9f0', park: '#a9d58c', grass: '#b8dd98', wood: '#7fb36b', pitch: '#9fd29a', playground: '#cfe3a8', flowerbed: '#e3a9c6', sand: '#f0dca4', deck: '#d9cbb5', parking: '#d6d3dc', plaza: '#e4dccd', roadarea: '#cfc8d6' };
  for (const a of place.areas) { poly(a.p, a.holes); g.fillStyle = AC[a.k] || '#ddd'; g.fill('evenodd'); }
  const RW = { motorway: 18, trunk: 16, primary: 14, secondary: 12, tertiary: 10, unclassified: 7, residential: 7, living_street: 6, service: 4, pedestrian: 5, footway: 2, path: 1.5, cycleway: 2, steps: 2, track: 3, busway: 7 };
  for (const r of place.rail) { g.strokeStyle = '#8a7fa0'; g.lineWidth = 2; g.beginPath(); r.p.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); }
  for (const r of place.roads) {
    const w = r.w || RW[r.k] || 4; g.lineWidth = Math.max(1, w * s); g.lineCap = g.lineJoin = 'round';
    g.strokeStyle = /footway|path|steps|cycleway|pedestrian/.test(r.k) ? '#f7f3ec' : r.bridge ? '#8c7fb0' : '#7b7590';
    g.beginPath(); r.p.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke();
  }
  for (const b of place.buildings) { poly(b.p, b.holes); const h = b.h || (b.lv ? b.lv * 3.2 : 0); g.fillStyle = h ? `hsl(${260 - Math.min(h, 60) * 3}, 35%, ${78 - Math.min(h, 80) * .45}%)` : '#c9c2d1'; g.fill('evenodd'); g.strokeStyle = 'rgba(60,50,80,.35)'; g.lineWidth = 1; g.stroke(); }
  g.fillStyle = '#3f8a3f'; for (const [x, z] of place.trees) { g.beginPath(); g.arc(X(x), Z(z), Math.max(1.2, 2.2 * s), 0, 7); g.fill(); }
  g.fillStyle = '#f2b544'; for (const [x, z] of place.lamps) g.fillRect(X(x) - 1.5, Z(z) - 1.5, 3, 3);
  // grid + coordinates
  g.strokeStyle = 'rgba(200,30,60,.28)'; g.lineWidth = 1; g.fillStyle = 'rgba(170,20,50,.9)'; g.font = '600 15px sans-serif';
  for (let x = Math.ceil(-W / 2 / grid) * grid; x <= W / 2; x += grid) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), ch); g.stroke(); g.fillText(x, X(x) + 3, 16); }
  for (let z = Math.ceil(-H / 2 / grid) * grid; z <= H / 2; z += grid) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(cw, Z(z)); g.stroke(); g.fillText(z, 4, Z(z) - 4); }
  g.strokeStyle = 'rgba(200,30,60,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0) - 12, Z(0)); g.lineTo(X(0) + 12, Z(0)); g.moveTo(X(0), Z(0) - 12); g.lineTo(X(0), Z(0) + 12); g.stroke();
  // named things
  g.font = '700 14px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.9)';
  const seen = new Set();
  for (const p of place.pois.filter(p => p.star || /sight|museum|transit|park|worship/.test(p.c))) {
    const t = p.n.name || Object.values(p.n)[0]; if (seen.has(t)) continue; seen.add(t);
    g.fillStyle = p.star ? '#7a2fd0' : '#334'; g.strokeText(t, X(p.x), Z(p.z) - 6); g.fillText(t, X(p.x), Z(p.z) - 6); g.beginPath(); g.arc(X(p.x), Z(p.z), 3, 0, 7); g.fill();
  }
  g.font = 'italic 600 13px sans-serif'; g.fillStyle = '#2c2440';
  const done = new Set();
  for (const r of place.roads) { const t = r.n?.name; if (!t || done.has(t) || /footway|path|steps|service/.test(r.k)) continue; done.add(t); const m = r.p[Math.floor(r.p.length / 2)]; g.strokeText(t, X(m[0]), Z(m[1])); g.fillText(t, X(m[0]), Z(m[1])); }
  g.textAlign = 'left'; g.font = '700 18px sans-serif'; g.fillStyle = '#222'; g.fillText(`${place.name || ''}  ·  ${W}×${H} m  ·  x → east, z → south  ·  grid ${grid} m  ·  ${place.credit}`, 10, ch - 12);
  return c.toDataURL('image/png');
}, { place, cw, ch, s, grid });
writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log(out);
