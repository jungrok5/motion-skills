// paint.mjs — preview what Tessera-small paints for each cast prompt, before you settle prompt / seed / pick / faces.
//
//   node <skill>/scripts/paint.mjs <project> [--roles=hero,crab] [--seeds=7,21] [--prompt="red crab"]
//
// Runs the model in headless Chromium (CPU: about 25 s per sprite; 4 variations per prompt and seed) and writes
// ref/tessera/<role>-s<seed>.png (the four variations, 8×, numbered 0–3) and ref/tessera/sheet.png.
// ref/ is git-ignored: these PNGs are a reference for choosing, never committed and never put in docs/.
// Then write the chosen seed and pick (0–3) into game.json, and set "faces" by looking at the picked one.
import fs from 'node:fs';
import path from 'node:path';
import { openGame, projectArg, flag } from './_lib.mjs';

const project = projectArg();
const data = JSON.parse(fs.readFileSync(path.join(project, 'game.json'), 'utf8'));
const roles = (flag('roles') || Object.keys(data.cast).join(',')).split(',').filter(Boolean);
const seeds = flag('seeds') ? String(flag('seeds')).split(',').map(Number) : null;
const out = path.join(project, 'ref', 'tessera');
fs.mkdirSync(out, { recursive: true });

const { page, close } = await openGame(project, 'test=1');
page.setDefaultTimeout(0);
const rows = [];
for (const k of roles) {
  const m = data.cast[k]; if (!m) { console.error(`no cast member "${k}"`); continue; }
  const prompt = flag('prompt') || m.prompt;
  for (const seed of seeds || [m.seed ?? 7]) {
    const t0 = Date.now();
    const png = await page.evaluate(async ({ prompt, seed }) => {
      const { paint } = await import('./lib/tessera-link.js');
      const all = await paint(prompt, { seed, count: 4, device: navigator.gpu ? 'auto' : 'wasm' });
      const c = document.createElement('canvas'); c.width = 4 * 136; c.height = 136; const x = c.getContext('2d');
      x.fillStyle = '#20202a'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
      const s = document.createElement('canvas'); s.width = s.height = 16;
      all.forEach((rgba, i) => { s.getContext('2d').putImageData(new ImageData(rgba, 16, 16), 0, 0); x.fillStyle = (i % 2) ? '#3a3a48' : '#30303c'; x.fillRect(i * 136 + 4, 4, 128, 128); x.drawImage(s, i * 136 + 4, 4, 128, 128); x.fillStyle = '#fff'; x.font = '12px monospace'; x.fillText(String(i), i * 136 + 8, 18); });
      return c.toDataURL('image/png');
    }, { prompt, seed });
    const file = path.join(out, `${k}-s${seed}.png`);
    fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
    rows.push({ k, seed, prompt, file });
    console.log(`${k} · "${prompt}" · seed ${seed} → ${path.relative(project, file)} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}
// contact sheet
const sheet = await page.evaluate(async (rows) => {
  const imgs = await Promise.all(rows.map((r) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = r.data; })));
  const c = document.createElement('canvas'); c.width = 544 + 220; c.height = rows.length * 140; const x = c.getContext('2d');
  x.fillStyle = '#16161c'; x.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => { x.drawImage(im, 220, i * 140); x.fillStyle = '#eee'; x.font = '13px monospace'; x.fillText(rows[i].k, 10, i * 140 + 30); x.fillStyle = '#aaa'; x.fillText(`seed ${rows[i].seed}`, 10, i * 140 + 50); x.fillText(rows[i].prompt.slice(0, 26), 10, i * 140 + 70); });
  return c.toDataURL('image/png');
}, rows.map((r) => ({ ...r, data: 'data:image/png;base64,' + fs.readFileSync(r.file).toString('base64') })));
fs.writeFileSync(path.join(out, 'sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`sheet → ${path.relative(project, path.join(out, 'sheet.png'))}`);
await close();
