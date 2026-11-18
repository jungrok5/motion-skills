// paper-desk · still.mjs — stills of a page with HTML-in-Canvas on (headless Chromium, software GL).
//   node <skill>/scripts/still.mjs index.html --out out [--at 1.5] [--act burn,wrinkled] [--size 1280x800] [--name x] [--jpeg]
//   --act takes any desk.stage() names joined by commas: curl fold crumple half wrinkled burn stain night select stock:<name> tool:<name>
//   Several shots: --act "idle;curl;crumple;burn" (';' separates shots; 'idle' = nothing staged).
import { open, waitReady } from './hic-test.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { basename } from 'node:path';
const a = process.argv.slice(2), file = a.find(x => !x.startsWith('--') && !a[a.indexOf(x) - 1]?.startsWith('--'));
const opt = k => { const i = a.indexOf('--' + k); return i > -1 ? a[i + 1] : null; };
if (!file) { console.error('usage: still.mjs <page.html> --out <dir> [--at 1.5] [--act a,b;c] [--size WxH] [--name prefix] [--jpeg]'); process.exit(1); }
const out = opt('out') || 'out', at = opt('at') || '1.5', [w, h] = (opt('size') || '1280x800').split('x').map(Number);
const prefix = opt('name') || basename(file, '.html'), acts = (opt('act') || 'idle').split(';');
const shots = acts.map(act => ({
  name: `${prefix}-${act.replace(/[^a-z0-9]+/gi, '-')}`, width: w, height: h, settle: 2500, type: a.includes('--jpeg') ? 'jpeg' : 'png',
  hash: `still=${at}` + (act && act !== 'idle' ? `&act=${encodeURIComponent(act)}` : '')
}));
// Each shot waits until the desk has stopped drawing (a staged still is at rest), then screenshots with a long timeout:
// software GL on a loaded machine can take many seconds a frame.
mkdirSync(out, { recursive: true });
for (const s of shots) {
  const { browser, page, errors } = await open(file, { hash: s.hash, width: s.width, height: s.height });
  if (!(await waitReady(page, errors, 120000))) { console.error(`${s.name}: never ready ${errors.join(' | ')}`); await browser.close(); process.exitCode = 1; continue; }
  let same = 0;   // settled: nothing left to draw and the GPU has finished the last frame
  for (let i = 0; i < 360 && same < 3; i++) { await page.waitForTimeout(500); const r = await page.evaluate(() => !window.__desk || window.__desk.fallback || window.__desk.settled); same = r ? same + 1 : 0; }
  const f = join(out, s.name + (s.type === 'jpeg' ? '.jpg' : '.png'));
  await page.screenshot({ path: f, type: s.type, quality: s.type === 'jpeg' ? 85 : undefined, timeout: 180000 });
  if (errors.length) { console.error(`${s.name}: ${errors.join(' | ')}`); process.exitCode = 1; }
  console.log('wrote ' + f);
  await browser.close();
}
