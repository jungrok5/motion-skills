// lit-room · still.mjs — stills of a lit-room page with HTML-in-Canvas on (headless Chromium, software GL).
//   node <skill>/scripts/still.mjs <page.html> --out <dir> [--at 1] [--act "idle;close;mood:neon"] [--size 1280x800] [--q 1] [--jpeg] [--hint]
// --act names, joined by ',' inside one shot and ';' between shots:
//   idle            nothing (the home view)
//   close | left | right | high | wide     camera views
//   view:<yaw>/<pitch>/<dist>              any camera view
//   tab:<name>      click the page's [data-tab=name]          mood:<name>  click [data-mood=name]
//   lamp:<name>     toggle a room lamp                         drag:<i>/<x>/<y>  move the i-th [data-lamp] to page px x, y
//   type:<text>     type into the page's [data-hic-edit]       key:<code>  hold a key down on the 3D keyboard
// Each shot waits until the room has stopped drawing (settled), then screenshots with a long timeout.
import { open, waitReady } from './hic-test.mjs';
import { mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
const a = process.argv.slice(2), file = a.find((x, i) => !x.startsWith('--') && !(a[i - 1] || '').startsWith('--'));
const opt = k => { const i = a.indexOf('--' + k); return i > -1 ? a[i + 1] : null; };
if (!file) { console.error('usage: still.mjs <page.html> --out <dir> [--at 1] [--act a,b;c] [--size WxH] [--q 1] [--jpeg] [--name prefix]'); process.exit(1); }
const out = opt('out') || 'out', at = opt('at') || '1', [W, H] = (opt('size') || '1280x800').split('x').map(Number), q = opt('q') || '1';
const prefix = opt('name') || basename(file, '.html'), jpeg = a.includes('--jpeg');
const VIEWS = { close: [0, 0.05, 0.8], left: [-0.75, 0.2, 1.9], right: [0.85, 0.22, 1.9], high: [0.3, 0.55, 2.4], wide: [0.45, 0.25, 2.7] };
mkdirSync(out, { recursive: true });

async function settle(page, n = 3) {
  let same = 0;
  for (let i = 0; i < 400 && same < n; i++) { await page.waitForTimeout(400); const r = await page.evaluate(() => !window.__lit || window.__lit.fallback || window.__lit.settled); same = r ? same + 1 : 0; }
}
async function act(page, s) {
  const k = s.split(':')[0], v = s.slice(k.length + 1);
  if (k === 'idle' || !k) return;
  if (VIEWS[k] || k === 'view') { const p = VIEWS[k] || v.split('/').map(Number); await page.evaluate(p => window.__lit.view(p[0], p[1], p[2], true), p); return; }
  const clickSel = { tab: `[data-tab="${v}"]`, mood: `[data-mood="${v}"]` }[k];
  if (clickSel) { await page.evaluate(sel => document.querySelector(sel).click(), clickSel); return; }
  if (k === 'lamp') { await page.evaluate(n => window.__lit.lamp(n, !window.__lit.lamp(n)), v); return; }
  if (k === 'drag') { const [i, x, y] = v.split('/').map(Number); await page.evaluate(([i, x, y]) => { const el = document.querySelectorAll('[data-lamp]')[i]; el.style.left = x + 'px'; el.style.top = y + 'px'; }, [i, x, y]); return; }
  if (k === 'type') { await page.evaluate(t => { const e = document.querySelector('[data-hic-edit]'); e.textContent = t; }, decodeURIComponent(v)); return; }
  if (k === 'key') { await page.evaluate(c => window.__lit.press(c, true), v); return; }
  console.error('unknown act ' + s);
}
for (const shot of (opt('act') || 'idle').split(';')) {
  const name = `${prefix}-${shot.replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '')}`;
  const { browser, page, errors } = await open(file, { hash: `still=${at}&q=${q}`, width: W, height: H });
  if (!(await waitReady(page, errors, 180000))) { console.error(`${name}: never ready ${errors.join(' | ')}`); await browser.close(); process.exitCode = 1; continue; }
  if (!a.includes('--hint')) await page.addStyleTag({ content: '#hint { display: none !important }' });   // the page's own hint line
  await settle(page);
  for (const s of shot.split(',').filter(Boolean)) await act(page, s);
  await page.waitForTimeout(600); await settle(page);
  const f = join(out, name + (jpeg ? '.jpg' : '.png'));
  await page.screenshot({ path: f, type: jpeg ? 'jpeg' : 'png', quality: jpeg ? 88 : undefined, timeout: 240000 });
  if (errors.length) { console.error(`${name}: ${errors.join(' | ')}`); process.exitCode = 1; }
  console.log('wrote ' + f);
  await browser.close();
}
