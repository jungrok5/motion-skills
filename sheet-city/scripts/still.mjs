// still.mjs — stills of a sheet-city page (Chromium with HTML-in-Canvas on, the page frozen with #still).
//   node scripts/still.mjs <page.html> --out <dir> [--act idle,edit,orbit,flat,close,slider,draft] [--at 0.2,0.5] [--w 1280 --h 800 --dpr 1]
// Acts:
//   idle    the page at rest (home view)
//   edit    a typed-in cell with dependants gets a bigger number; --at = seconds after Enter (mid-light: 0.2–0.6)
//   orbit   the camera walked round to the other side and lower
//   flat    from straight above: plainly a spreadsheet
//   close   close on the selected cell, low, the numbers on the roofs large
//   slider  the slider pushed to its top
//   draft   a formula being typed in the formula field (the cell shows the draft)
// Files: <dir>/<page-name>-<act>[-<at>].png
import { stills } from './hic-test.mjs';
import { basename, dirname } from 'node:path';

const args = process.argv.slice(2), file = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
if (!file || file.startsWith('--')) { console.error('usage: node scripts/still.mjs <page.html> --out <dir> [--act idle,edit] [--at 0.3]'); process.exit(2); }
const out = opt('out', 'out'), acts = opt('act', 'idle').split(','), ats = opt('at', '').split(',').filter(Boolean).map(Number);
const W = +opt('w', 1280), H = +opt('h', 800), dpr = +opt('dpr', 1);
const name = basename(file) === 'index.html' ? basename(dirname(file)) : basename(file, '.html');

const ACT = {
  idle: async () => {},
  edit: async (page, at) => {
    await page.evaluate((at) => {
      const B = __city.book, L = __city.lots().filter(l => l.h > 8 && l.dependents && !/^=/.test(B.raw(l.i)) && typeof l.value === 'number');
      const vis = L.map(l => ({ l, p: __city.roofPoint(l.addr) })).filter(o => o.p && __city.pick(o.p[0], o.p[1]).addr === o.l.addr);
      vis.sort((a, b) => (b.l.dependents - a.l.dependents) || (b.p[1] - a.p[1]));
      const o = vis[0]; if (!o) return;
      const unit = B.unitOf(o.l.i) || __city.config.unit;
      B.select(o.l.i); B.set(o.l.i, String(Math.round(o.l.value + 4 * unit)), 'type');
      __city.advance(at || 0.35);
    }, at);
  },
  orbit: async (page) => { await page.evaluate(() => { const h = __city.home(); __city.camera(Object.assign({}, h, { yaw: h.yaw + 0.75, pitch: 0.42, dist: h.dist * 0.95 })); }); },
  flat: async (page) => { await page.evaluate(() => { const h = __city.home(); __city.camera(Object.assign({}, h, { yaw: 0, pitch: 1.45, dist: h.dist * 1.12, tx: 0, ty: 0, tz: 0 })); }); },
  close: async (page) => {
    await page.evaluate(() => {
      const B = __city.book, i = B.selected >= 0 ? B.selected : __city.lots()[0].i, b = B.box(B.td(i)), W = B.host.offsetWidth, H = B.host.offsetHeight, h = __city.home();
      __city.camera({ yaw: h.yaw - 0.25, pitch: 0.5, dist: h.dist * 0.42, tx: b.x + b.w / 2 - W / 2, ty: Math.max(0, __city.heightOf(i)) * 0.5, tz: b.y + b.h / 2 - H / 2 });
    });
  },
  slider: async (page) => { await page.evaluate(() => { const k = document.getElementById('knob'); if (!k) return; k.value = k.max; k.dispatchEvent(new Event('input', { bubbles: true })); __city.settle(600); }); },
  draft: async (page) => { await page.evaluate(() => { const fx = __city.book.fx; fx.focus(); fx.value = '=SUM(B4:B7)*1.1'; fx.dispatchEvent(new Event('input', { bubbles: true })); __city.stage.requestPaint(); }); }
};

const shots = [];
for (const a of acts) {
  if (!ACT[a]) { console.error('unknown act: ' + a); process.exit(2); }
  const list = a === 'edit' && ats.length ? ats : [null];
  for (const at of list) shots.push({ name: `${name}-${a}${at !== null ? '-' + at : ''}`, hash: 'still=1', width: W, height: H, dpr, settle: 900, before: (page) => ACT[a](page, at), after: 1500 });
}
await stills(file, out, shots);
