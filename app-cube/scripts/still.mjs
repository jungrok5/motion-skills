// app-cube · still.mjs — stills of a page with the feature on, for the still review (references/BRIEF.md).
//   node <skill>/scripts/still.mjs <page.html> --out <dir> [--at 1,2.5] [--act idle,twist,scramble,typed,back,under]
//        [--size 1280x800] [--dpr 1] [--jpg]
// Each act × time is one PNG (or JPEG) named <page>-<act>-<t>.png. Time stands at --at (#still), so stills repeat exactly.
// Acts (combine with +, e.g. --act scramble+twist):
//   idle      the page as it loads, nobody touching it
//   twist     the top layer held mid-turn (about 32°)
//   scramble  a fixed ten-move scramble applied at once: the apps lie scattered as tiles
//   typed     scramble, then a few words typed into the first [data-hic-edit] field (the cube turns to show the caret)
//   back      the view from behind: back, left and top faces
//   under     the view from below: bottom, front and right faces
//   solved    scramble, then Solve run to the end (the light sweep and the hop are caught mid-way)
import { stills } from './hic-test.mjs';
import { basename, resolve } from 'node:path';

const args = process.argv.slice(2), file = args.find(a => a.endsWith('.html'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
if (!file) { console.error('usage: still.mjs <page.html> --out <dir> [--at 1] [--act idle] [--size 1280x800] [--jpg]'); process.exit(1); }
const out = resolve(opt('out', 'out')), at = opt('at', '1').split(',').map(Number), acts = opt('act', 'idle').split(',');
const [w, h] = opt('size', '1280x800').split('x').map(Number), dpr = Number(opt('dpr', '1')), jpg = args.includes('--jpg');
const SCRAMBLE = "R U2 F' L D' B R2 U' F2 L'";

async function act(page, name) {
  for (const a of name.split('+')) {
    if (a === 'idle') continue;
    await page.evaluate(({ a, SCRAMBLE }) => {
      const c = window.__cube;
      if (a === 'twist') c.hold(1, 1, -0.56);
      if (a === 'scramble' || a === 'typed' || a === 'solved') c.apply(SCRAMBLE);
      if (a === 'back') c.view(2.45, 0.42);
      if (a === 'under') c.view(-0.62, -0.48);
      if (a === 'solved') c.solve();
    }, { a, SCRAMBLE });
    if (a === 'typed') {
      await page.evaluate(() => {
        const e = document.querySelector('canvas [data-hic-edit]') || document.querySelector('canvas [contenteditable]');
        e.focus(); const r = document.createRange(); r.selectNodeContents(e); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      });
      await page.keyboard.type(' still typing', { delay: 25 });
    }
    if (a === 'solved') { for (let i = 0; i < 1200 && await page.evaluate(() => window.__cube.state().busy); i++) await page.waitForTimeout(50); await page.waitForTimeout(250); }
  }
  // wait until the cube is at rest (turns, reveal spins): a slow machine draws few frames, and time in a still runs per frame
  if (!name.includes('solved')) for (let i = 0; i < 1200; i++) { const s = await page.evaluate(() => window.__cube.state()); if (!s.busy && !s.spinning) break; await page.waitForTimeout(50); }
}
const shots = [];
for (const a of acts) for (const t of at) shots.push({
  name: `${basename(file, '.html') === 'index' ? basename(resolve(file, '..')) : basename(file, '.html')}-${a}-${t}`,
  hash: 'still=' + t, width: w, height: h, dpr, type: jpg ? 'jpeg' : 'png', settle: 1200, after: 1500,
  before: (page) => act(page, a)
});
await stills(file, out, shots);
