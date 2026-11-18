// still.mjs — stills of a hypertext-hotel page (Chromium with HTML-in-Canvas on, time frozen with #still).
//   node scripts/still.mjs <page.html> --out <dir> [--act idle,lens,plain,room,lift] [--room <id>] [--lens <data-k>]
//        [--set key=value;key=value] [--w 1280 --h 800 --dpr 1 --q 1]
// Acts:
//   idle   the whole building at rest, every lamp on (lens put away)
//   lens   the lens over a control (--lens <data-k>; default: the [data-hic-edit] field's control): its plain twin, magnified
//   plain  "Show just HTML elements": the twins on a sheet of paper over the building's lines
//   room   one room close up (--room <id>; default: the first room)
//   lift   the lift (or hoist) at its top stop
// --set changes controls first (a checkbox: true/false; anything else: its value), then lets springs settle: e.g.
//   --set "bake.oven=260;prove.rise=100;shop.open=false"
// Files: <dir>/<page-name>-<act>.png
import { stills } from './hic-test.mjs';
import { basename, dirname } from 'node:path';

const args = process.argv.slice(2), file = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
if (!file || file.startsWith('--')) { console.error('usage: node scripts/still.mjs <page.html> --out <dir> [--act idle,lens,plain,room,lift]'); process.exit(2); }
const out = opt('out', 'out'), acts = opt('act', 'idle').split(','), W = +opt('w', 1280), H = +opt('h', 800), dpr = +opt('dpr', 1), q = opt('q', '1');
const set = opt('set', ''), room = opt('room', ''), lensKey = opt('lens', ''), tag = opt('tag', '');
const name = (basename(file) === 'index.html' ? basename(dirname(file)) : basename(file, '.html')) + (tag ? '-' + tag : '');
const base = `still=4&nointro&q=${q}`;
const apply = async (page) => {
  await page.evaluate((set) => {
    const D = __hic.dh;
    for (const kv of set.split(';').filter(Boolean)) {
      const [k, v] = kv.split('='); const f = D.field(k.trim()); if (!f) { console.warn('no control ' + k); continue; }
      if (f.type === 'checkbox') f.checked = v.trim() === 'true'; else if ('value' in f && f.tagName !== 'OUTPUT') f.value = v.trim(); else f.textContent = v.trim();
      f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); D.touch(k.trim());
    }
    D.advance(3);
  }, set);
};
const ACT = {
  idle: { hash: '&lens=off' },
  lens: { hash: '', before: async (page) => { await page.evaluate((k) => { const D = __hic.dh; const key = k || (D.panels.find(p => p.el.querySelector('[data-hic-edit]') || p.el.matches('[data-hic-edit]')) || D.panels[0]).key; D.lensTo(key); D.advance(0.5); }, lensKey); } },
  plain: { hash: '&plain&lens=off' },
  room: { hash: '&lens=off', before: async (page) => { await page.evaluate((r) => { const D = __hic.dh; D.view(r || D.rooms[0].id); D.advance(0.5); }, room); } },
  lift: { hash: '&lens=off', before: async (page) => { await page.evaluate(() => { const D = __hic.dh, p = D.panels.find(p => p.liftOwned); if (!p) return; const f = p.el.matches('input') ? p.el : p.el.querySelector('input'); f.value = f.max; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); D.advance(4); }); } }
};
const shots = acts.map(a => {
  if (!ACT[a]) { console.error('unknown act: ' + a); process.exit(2); }
  return { name: `${name}-${a}`, hash: base + ACT[a].hash, width: W, height: H, dpr, settle: 2500, after: 3000,
    before: async (page) => { if (set) await apply(page); if (ACT[a].before) await ACT[a].before(page); await page.evaluate(() => __hic.dh.advance(0.1)); } };
});
await stills(file, out, shots);
