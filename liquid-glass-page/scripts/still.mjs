// liquid-glass-page · still.mjs — stills of a liquid page (HTML-in-Canvas on, software GL).
//   node <skill>/scripts/still.mjs index.html --out out [--at 1,2.5] [--act idle|splash|drag|trail|type] [--to <selector>]
//        [--size 1280x800] [--hash dark] [--liquid honey] [--name base] [--jpeg]
// Time stands still at each --at (#still=<s>: the simulation runs that many seconds once, deterministically, then waits).
// An act is done with the real mouse and keyboard, then the frozen page is stepped 40 frames so the liquid answers:
//   splash  clicks [data-liquid=splash]       drag  drags the big drop onto --to (default [data-hic-click])
//   trail   sweeps the pointer across the page type  types into [data-hic-edit]
import { open, waitReady } from './hic-test.mjs';
import { mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--') && /\.html?$/.test(a));
const opt = k => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : null; };
if (!file) { console.error('usage: still.mjs <page.html> --out <dir> [--at 1] [--act idle|splash|drag|trail|type] [--to sel]'); process.exit(1); }
const out = opt('out') || 'out', ats = (opt('at') || '1').split(',').map(Number), act = opt('act') || 'idle';
const [w, h] = (opt('size') || '1280x800').split('x').map(Number);
const extra = [opt('hash'), opt('liquid') ? 'liquid=' + opt('liquid') : null].filter(Boolean).join('&');
const jpeg = args.includes('--jpeg');
mkdirSync(out, { recursive: true });
const CONTROL = 'input,button,select,textarea,a,label,summary,[contenteditable]';

for (const at of ats) {
  const { browser, page, errors } = await open(file, { hash: 'still=' + at + (extra ? '&' + extra : ''), width: w, height: h });
  if (!(await waitReady(page, errors, 60000))) { console.error('never ready: ' + errors.join(' | ')); await browser.close(); process.exitCode = 1; continue; }
  await page.waitForTimeout(800);
  const step = n => page.evaluate(n => window.__liquid.run(n), n);
  if (act === 'splash') {
    await page.evaluate(() => document.querySelector('canvas [data-liquid=splash]').click());
    await step(14);
  } else if (act === 'drag') {
    const to = opt('to') || 'canvas [data-hic-click]';
    const t = await page.evaluate(sel => { const b = window.__liquid.boxOf(document.querySelector(sel)); return [b[0] + b[2] / 2, b[1] + b[3] / 2]; }, to);
    const g = await page.evaluate((C) => { const h = window.__liquid.state().hero; for (let i = 0; i < 60; i++) { const a = i * 2.4, r = h.r * .5 * Math.sqrt(i / 60), x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r, e = document.elementFromPoint(x, y); if (e && !e.closest(C)) return [x, y, h.x, h.y]; } return [h.x, h.y, h.x, h.y]; }, CONTROL);
    await page.mouse.move(g[0], g[1]); await page.mouse.down();
    await page.mouse.move(t[0] + (g[0] - g[2]), t[1] + (g[1] - g[3]), { steps: 16 });
    await step(50); await page.mouse.up(); await step(30);
    await page.mouse.move(t[0], t[1]);
  } else if (act === 'trail') {
    await page.mouse.move(w * .08, h * .82);
    await page.mouse.move(w * .5, h * .7, { steps: 30 });
    await step(8);
  } else if (act === 'type') {
    const p = await page.evaluate(() => window.__hic.screenOf(document.querySelector('[data-hic-edit]')));
    await page.mouse.click(p[0], p[1]); await page.keyboard.type('rain on the page', { delay: 30 }); await step(20);
    await page.mouse.move(5, 5);
  }
  await page.waitForTimeout(700);
  const name = (opt('name') || basename(file, '.html')) + '-' + act + '-' + at + (extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '-') : '') + (jpeg ? '.jpg' : '.png');
  await page.screenshot({ path: join(out, name), type: jpeg ? 'jpeg' : 'png', quality: jpeg ? 85 : undefined, timeout: 120000 });
  if (errors.length) console.error(errors.join(' | '));
  console.log('wrote ' + join(out, name));
  await browser.close();
}
