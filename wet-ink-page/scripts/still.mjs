// wet-ink-page · still.mjs — stills of a wet-ink page (Chromium with the HTML-in-Canvas flag).
//   node <skill>/scripts/still.mjs <page.html> --out <dir> [--at 1,6.5] [--act comb,drops] [--width 1280 --height 800] [--dpr 1] [--jpg]
// --at t:    the page as the idle demo leaves it t seconds after load (#still=t; deterministic)
// --act name: a scripted state (the page's INK.acts, or built in: rest, comb, drops, swirl, settle-half)
// Default: --at 1 and the page's own acts (or comb, drops).
import { stills, open, waitReady } from './hic-test.mjs';
import { basename, dirname, resolve } from 'node:path';
const a = process.argv.slice(2), file = a.find(x => !x.startsWith('--') && !/^\d/.test(x) && /\.html?$/.test(x));
const opt = (k, d) => { const i = a.indexOf('--' + k); return i > -1 ? a[i + 1] : d; };
if (!file) { console.error('usage: still.mjs <page.html> --out <dir> [--at 1,6] [--act name,…]'); process.exit(1); }
const out = opt('out', 'out'), width = +opt('width', 1280), height = +opt('height', 800), dpr = +opt('dpr', 1), type = a.includes('--jpg') ? 'jpeg' : 'png';
let at = opt('at', null), acts = opt('act', null);
if (!at && !acts) {
  const P = await open(file, {}); await waitReady(P.page, P.errors);
  acts = (await P.page.evaluate(() => Object.keys(window.__hic.ink ? window.__hic.ink.cfg.acts || {} : {}))).join(',') || 'comb,drops';
  await P.browser.close(); at = '1';
}
const stem = basename(file).replace(/\.html?$/, '') === 'index' ? basename(dirname(resolve(file))) : basename(file).replace(/\.html?$/, '');
const shots = [];
for (const t of (at ? at.split(',') : [])) shots.push({ name: `${stem}-${width}-at${t}`, hash: 'still=' + t, width, height, dpr, type });
for (const n of (acts ? acts.split(',') : [])) shots.push({ name: `${stem}-${width}-${n}`, hash: 'still=0', width, height, dpr, type, before: async (page) => { await page.evaluate((n) => window.__hic.ink.act(n), n); } });
await stills(file, out, shots);
