// still.mjs — stills of an exploded-view-map page (Chromium with HTML-in-Canvas on, time frozen with #still).
//   node <skill>/scripts/still.mjs <page.html> --out <dir> [--act flat,apart,turn,low,dusk,night,lift,variant,phone] [--w 1280 --h 800 --dpr 1]
// Acts (each a hash pose the page understands; the engine snaps every spring when #still is set):
//   flat     the page as an ordinary page (apart 0)
//   apart    the default pose after the intro (the hero still)
//   turn     turned to the other side and lower
//   low      low and close, along the relief
//   dusk     low amber sun from the side          (needs a #sun slider the page reads, as the template does)
//   night    after dark: lamps at the pins, the route glowing
//   lift     the middle plate lifted with everything above it
//   variant  the page's second palette variant
//   phone    390 × 844 at dpr 2
// Files: <dir>/<page-name>-<act>.png
import { stills } from './hic-test.mjs';
import { basename, dirname } from 'node:path';

const args = process.argv.slice(2), file = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
if (!file || file.startsWith('--')) { console.error('usage: node scripts/still.mjs <page.html> --out <dir> [--act flat,apart,turn]'); process.exit(2); }
const out = opt('out', 'out'), acts = opt('act', 'flat,apart,turn,night').split(','), W = +opt('w', 1280), H = +opt('h', 800), dpr = +opt('dpr', 1);
const name = basename(file) === 'index.html' ? basename(dirname(file)) : basename(file, '.html');
const extra = opt('hash', '');

const ACT = {
  flat: 'apart=0',
  apart: 'apart=1',
  turn: 'apart=1&yaw=-1.1&tilt=0.12',
  low: 'apart=1.1&tilt=0.3&zoom=1.35&yaw=0.35',
  dusk: 'apart=1&sun=0.84&yaw=0.5',
  night: 'apart=1&sun=0.99&yaw=-0.3',
  lift: 'apart=1&lift=MID&yaw=0.25',
  variant: 'apart=1&variant=SECOND&sun=0.3',
  phone: 'apart=1'
};
const shots = [];
for (const a of acts) {
  if (!(a in ACT)) { console.error('unknown act: ' + a); process.exit(2); }
  let hash = 'still=2&' + ACT[a] + (extra ? '&' + extra : '');
  const s = { name: `${name}-${a}`, hash, width: a === 'phone' ? 390 : W, height: a === 'phone' ? 844 : H, dpr: a === 'phone' ? 2 : dpr, settle: 1500 };
  if (/MID|SECOND/.test(hash)) {
    // these depend on the page: ask it, then reload with the answer
    s.before = async (page) => {
      const info = await page.evaluate(() => ({ n: window.__ev.plates.length, v: Object.keys((window.__evVariants || {})) }));
      await page.evaluate((n) => { window.__ev.pose({ lift: Math.max(2, Math.round(n / 2)), snap: true }); }, info.n);
      if (/SECOND/.test(hash)) await page.evaluate(() => { const r = [...document.querySelectorAll('input[type=radio]')][1]; if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } });
    };
    s.hash = hash.replace(/&lift=MID|&variant=SECOND/, '');
    s.after = 2500;
  }
  shots.push(s);
}
await stills(file, out, shots);
