// still.mjs — stills of a droste-page page with the feature on.
//   node scripts/still.mjs <page.html> --out <dir> [--poses "rest;fall=0.6,wind=1;fall=-0.25,wind=0"] [--size 1280x800] [--q 1] [--jpeg]
// Each pose is a set of hash parameters (fall, wind) frozen with #still=1 and #nointro, so a still is the same picture
// on every run. "rest" is the page's own rest pose. --act tap:<selector> rings a tap from that element before the shot.
import { stills } from './hic-test.mjs';
import { basename } from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const file = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--') && a[i - 1] !== '--jpeg'));
if (!file) { console.log('usage: node scripts/still.mjs <page.html> --out <dir> [--poses "rest;fall=0.6,wind=1"] [--size WxH] [--q 1] [--jpeg] [--act tap:#id]'); process.exit(1); }
const out = opt('out', 'out');
const [W, H] = opt('size', '1280x800').split('x').map(Number);
const q = opt('q', '1'), act = opt('act', '');
const poses = opt('poses', 'rest;fall=0.55,wind=1;fall=-0.25,wind=0;fall=-0.25,wind=2').split(';');
const name = basename(file).replace(/\.html$/, '') === 'index' ? basename(file.replace(/\/index\.html$/, '')) || 'page' : basename(file).replace(/\.html$/, '');
const shots = poses.map((p, i) => {
  const h = ['still=1', 'nointro', 'q=' + q].concat(p === 'rest' ? [] : p.split(',').map(s => s.trim())).join('&');
  return {
    name: `${name}-${i}-${p.replace(/[^a-z0-9.=]+/gi, '_')}`, hash: h, width: W, height: H, settle: 2500,
    type: a.includes('--jpeg') ? 'jpeg' : 'png',
    before: act.startsWith('tap:') ? async (page) => { await page.evaluate((s) => window.__droste.tap(document.querySelector(s)), act.slice(4)); } : null, after: 500
  };
});
await stills(file, out, shots);
