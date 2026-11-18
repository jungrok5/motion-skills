// still.mjs — stills of a jelly page, rendered with HTML-in-Canvas on (headless Chromium, software GL).
//   node <skill>/scripts/still.mjs <page.html> --out <dir> [--at 1,0.35] [--act pull|release|drop|poke|type|melt|set|flavour:<name>]
//        [--size 1280x800] [--phone] [--name prefix] [--jpeg]
// Each --at value is a time: at rest (no --act) the jelly is set and still; with --act the act starts at 0 from rest and
// the still is taken that many seconds later (e.g. --act drop --at 0.25,0.5,0.9 for the lift, the fall, the squash).
import { stills } from './hic-test.mjs';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !/^\d/.test(a) && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
if (!file) { console.error('usage: still.mjs <page.html> --out <dir> [--at 1] [--act name] [--size WxH] [--phone] [--jpeg]'); process.exit(1); }
const out = opt('out') || 'out';
const at = (opt('at') || '1').split(',').map(Number);
const act = opt('act');
let [w, h] = (opt('size') || '1280x800').split('x').map(Number);
if (args.includes('--phone')) { w = 390; h = 844; }
const prefix = opt('name') || basename(file, '.html') + (act ? '-' + act.replace(/[:]/g, '-') : '');
const shots = at.map(t => ({
  name: `${prefix}-${String(t).replace('.', '_')}`,
  hash: `still=${t}` + (act ? `&act=${encodeURIComponent(act)}` : ''),
  width: w, height: h, dpr: args.includes('--phone') ? 2 : 1, settle: 1500,
  type: args.includes('--jpeg') ? 'jpeg' : 'png',
  // wait until the page owes no frames (the act has been drawn), even on a busy machine
  before: async (page) => { await page.waitForFunction(() => window.__hic.owed === 0, null, { timeout: 90000 }); }, after: 300
}));
await stills(file, out, shots);
