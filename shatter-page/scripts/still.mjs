// still.mjs — stills of a shatter page, with the feature on (headless Chromium, software GL).
//   node <skill>/scripts/still.mjs <page.html> --out <dir> [--act idle,crack,fall,rest,mended] [--at 0.2,0.5]
//        [--break 0.45,0.3] [--size 1280x800] [--q 1] [--jpeg]
// Acts (each is an address the page understands, so a still is the same picture every time):
//   idle    #still=1                              the whole pane in the light
//   crack   #break=u,v&at=0.03&still=1           cracked, the pieces just leaving
//   fall    #break=u,v&at=<s>&still=1            mid-fall (one still per --at value; default 0.35)
//   rest    #break=u,v&rest&still=1              the pieces at rest on the floor
//   mended  #mended&still=1                      broken, at rest, mended: the pane with its seams
import { stills } from './hic-test.mjs';
import { basename } from 'node:path';

const a = process.argv.slice(2), file = a.find(x => !x.startsWith('--') && /\.html?$/.test(x));
const opt = k => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : null; };
if (!file) { console.error('usage: node still.mjs <page.html> --out <dir> [--act idle,fall] [--at 0.2,0.5] [--break u,v]'); process.exit(2); }
const out = opt('out') || 'out', acts = (opt('act') || 'idle,crack,fall,rest,mended').split(','), ats = (opt('at') || '0.35').split(',');
const br = opt('break') || '0.45,0.32', [W, H] = (opt('size') || '1280x800').split('x').map(Number), q = opt('q') || '1', jpeg = a.includes('--jpeg');
const name = basename(file).replace(/\.html?$/, '') === 'index' ? basename(file.replace(/\/index\.html?$/, '')) : basename(file).replace(/\.html?$/, '');
const shots = [];
for (const act of acts) {
  const base = { width: W, height: H, settle: 1500, type: jpeg ? 'jpeg' : 'png' };
  if (act === 'idle') shots.push({ ...base, name: `${name}-idle`, hash: `still=1&q=${q}` });
  else if (act === 'crack') shots.push({ ...base, name: `${name}-crack`, hash: `break=${br}&at=0.03&still=1&q=${q}` });
  else if (act === 'fall') for (const t of ats) shots.push({ ...base, name: `${name}-fall-${t}`, hash: `break=${br}&at=${t}&still=1&q=${q}` });
  else if (act === 'rest') shots.push({ ...base, name: `${name}-rest`, hash: `break=${br}&rest&still=1&q=${q}` });
  else if (act === 'mended') shots.push({ ...base, name: `${name}-mended`, hash: `mended&break=${br}&still=1&q=${q}` });
  else console.error('unknown act ' + act);
}
await stills(file, out, shots);
