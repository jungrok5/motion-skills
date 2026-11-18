// still.mjs — stills of a time-machine page, with the HTML-in-Canvas flag on.
//   node scripts/still.mjs <page.html> --out <dir> [--era <id>] [--all] [--travel <fromId>,<p>] [--zoom <z>,<u>,<v>]
//        [--xray] [--width 1280 --height 800] [--phone] [--at 1.5] [--name <file>] [--jpeg]
// --all writes one still per era (<era>.png). --travel freezes a journey from <fromId> to --era at progress p (0..1:
// 0.3 = deep in the dive, 0.5 = the material changing, 0.8 = rising out). --at sets the frozen time (#still) for grain etc.
import { stills } from './hic-test.mjs';

const argv = process.argv.slice(2);
const file = argv.find(a => !a.startsWith('--') && /\.html?$/.test(a));
if (!file) { console.error('usage: node scripts/still.mjs <page.html> --out <dir> [--era id] [--all] [--travel from,p] [--zoom z,u,v] [--xray] [--phone]'); process.exit(2); }
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = k => argv.includes('--' + k);
const out = arg('out', 'out');
const phone = has('phone');
const width = +arg('width', phone ? 390 : 1280), height = +arg('height', phone ? 844 : 800);
const type = has('jpeg') ? 'jpeg' : 'png';

async function eraIds() {
  // read the era ids from the page itself
  const { open, waitReady } = await import('./hic-test.mjs');
  const { browser, page, errors } = await open(file, { hash: 'nohint&q=0.25', width: 640, height: 400 });
  await waitReady(page, errors);
  const ids = await page.evaluate(() => (window.__tm && window.__tm.ids) || []);
  await browser.close();
  return ids;
}
function hashFor(era) {
  const h = ['nohint', 'still=' + arg('at', '1.3')];
  if (era) h.push('era=' + era);
  if (arg('travel')) h.push('travel=' + arg('travel'));
  if (arg('zoom')) h.push('zoom=' + arg('zoom'));
  if (has('xray')) h.push('xray');
  return h.join('&');
}
const shots = [];
if (has('all')) for (const id of await eraIds()) shots.push({ name: id + (phone ? '-phone' : ''), hash: hashFor(id) });
else shots.push({ name: arg('name', (arg('era') || 'still') + (arg('travel') ? '-travel' : '') + (arg('zoom') ? '-zoom' : '') + (phone ? '-phone' : '')), hash: hashFor(arg('era')) });
for (const s of shots) { s.width = width; s.height = height; s.dpr = phone ? 2 : 1; s.type = type; s.settle = arg('travel') ? 2500 : 1400; }
await stills(file, out, shots);
