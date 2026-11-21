// Check a pop-up-quest book before you render or ship it. Fails (exit 1) on anything that would break the book:
//   pieces    every piece folds flat inside its own page (no gutter crossing, nothing hanging off, nothing sunk)
//   quest     every chapter has a prop and a well-formed task (choice / order / count) with a solved line
//   props     each chapter's prop is on screen and not hidden behind another piece at the reader's seat
//   body      every puppet stays inside its joint limits through walk-in, turn, point and cheer
//   motion    planted boots never slide (≤ 1.5 px), idles move, the cheer gathers before it hops
//   text      headings, journey lines and the task card fit at 1280 × 800, 390 × 844 and 640 × 420 (an embedded frame)
//   frames    each chapter's frame is drawn (not blank), differs from the others, and renders the same twice
// Usage (from the project root): node <skill>/scripts/check.mjs <book/index.html> [--shots dir]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2);
const shotsAt = (() => { const i = args.indexOf('--shots'); return i >= 0 ? args.splice(i, 2)[1] : null; })();
const page = args[0];
if (!page) { console.error('usage: check.mjs <book/index.html> [--shots dir]'); process.exit(1); }

const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/${path.relative(root, path.resolve(page)).split(path.sep).join('/')}?render`;
const fails = [], warn = [];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(w, h) {
  const tab = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  tab.on('pageerror', e => fails.push(`page error: ${e.message}`));
  tab.on('console', m => { if (m.type() === 'error') fails.push(`console error: ${m.text()}`); });
  tab.on('requestfailed', r => fails.push(`404: ${r.url()}`));
  await tab.goto(url); await tab.evaluate(() => window.ready); return tab;
}

// ── wide: structure, motion, props, frames ──────────────────────────────────────────────────────────────
const tab = await open(1280, 800);
if (!(await tab.evaluate(() => !!window.quest))) { console.log('the book did not start:'); for (const f of fails) console.log('  ✗', f); process.exit(1); }
const audit = await tab.evaluate(() => window.quest.audit());
const times = await tab.evaluate(() => { const q = window.quest, N = q.book.chapters.length, SEG = q.book.tour?.segment || 8.6; return Array.from({ length: N }, (_, i) => ({ settled: 1.4 + i * SEG + 2.2, solved: 1.4 + i * SEG + 6.4 })); });
console.log(`book: ${audit.chapters.length} chapters, tour ${audit.tour.duration.toFixed(1)} s`);
for (const c of audit.chapters) {
  console.log(`  ${c.id.padEnd(12)} pieces ${String(c.pieces).padStart(3)} · props ${c.props} · actors ${c.actors} · folds ${Object.entries(c.folds).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const b of c.bad) fails.push(`pieces [${c.id}]: ${b}`);
  for (const b of c.task) fails.push(`quest [${c.id}]: ${b}`);
  if (!c.props) fails.push(`quest [${c.id}]: no prop to poke`);
  if (!c.actors) warn.push(`[${c.id}] has no puppet on it`);
}
console.log('body + motion (worst over walk-in, turn, point, cheer):');
for (const a of audit.actors) {
  console.log(`  ${(a.chapter + '/' + a.id).padEnd(20)} slide ${a.slidePx.toFixed(2)} px · idle ${a.idleMove.toFixed(3)} · gather ${a.anticipation.toFixed(3)} · head ${a.worst.head.toFixed(0)}° paw ${a.worst.paw.toFixed(0)}° tail ${a.worst.tail.toFixed(0)}° lean ${a.worst.lean.toFixed(0)}°`);
  for (const [k, v] of Object.entries(a.limits)) fails.push(`body [${a.chapter}/${a.id}]: ${k} reaches ${v.toFixed(1)}° (limit ${k})`);
  if (a.slidePx > 1.5) fails.push(`motion [${a.chapter}/${a.id}]: a planted boot slides ${a.slidePx.toFixed(2)} px`);
  if (a.idleMove < .01) fails.push(`motion [${a.chapter}/${a.id}]: stands dead still at idle (${a.idleMove.toFixed(4)})`);
  if (a.anticipation < .04) fails.push(`motion [${a.chapter}/${a.id}]: the cheer hops without gathering first (${a.anticipation.toFixed(3)})`);
  if (!a.hop) fails.push(`motion [${a.chapter}/${a.id}]: the cheer never leaves the ground`);
}
console.log('props and frames:');
const hashes = [];
if (shotsAt) fs.mkdirSync(shotsAt, { recursive: true });
for (const [i, t] of times.entries()) {
  const pc = await tab.evaluate(({ t, i }) => { window.renderAt(t); return window.quest.propCheck(i); }, { t: t.settled, i });
  const shot = await tab.screenshot({ type: 'png' });
  await tab.evaluate(t => window.renderAt(t), t.settled); const again = await tab.screenshot({ type: 'png' });
  const h = crypto.createHash('md5').update(shot).digest('hex'); hashes.push(h);
  const same = h === crypto.createHash('md5').update(again).digest('hex');
  const spread = await tab.evaluate(() => { const c = document.querySelector('.pq-world'), g = document.createElement('canvas'); g.width = 64; g.height = 40; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 40); const d = x.getImageData(0, 0, 64, 40).data; let lo = 255, hi = 0; for (let k = 0; k < d.length; k += 4) { const v = (d[k] + d[k + 1] + d[k + 2]) / 3; lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi - lo; });
  console.log(`  ${String(i + 1).padStart(2)} prop ${pc.ok ? 'ok' : 'BAD'} at (${pc.screen.map(v => v.toFixed(2)).join(', ')}) · contrast ${spread.toFixed(0)} · deterministic ${same ? 'yes' : 'NO'}`);
  if (!pc.onScreen) fails.push(`props [${i + 1}]: the prop is off screen at the reader's seat`);
  if (!pc.unhidden) fails.push(`props [${i + 1}]: the prop is hidden behind ${pc.blocker}`);
  if (spread < 40) fails.push(`frames [${i + 1}]: the frame looks blank (contrast ${spread.toFixed(0)})`);
  if (!same) fails.push(`frames [${i + 1}]: renderAt(${t.settled}) is not deterministic`);
  if (shotsAt) fs.writeFileSync(path.join(shotsAt, `chapter-${i + 1}.png`), shot);
  // the top of a piece (a sun, a tower, a tree crown) may not stand behind the chapter heading, top left
  const hidden = await tab.evaluate(i => { const h = [...document.querySelectorAll('.pq-title, .pq-region')].map(e => e.getBoundingClientRect());
    const hr = [Math.min(...h.map(b => b.left)), Math.min(...h.map(b => b.top)), Math.max(...h.map(b => b.right)), Math.max(...h.map(b => b.bottom))];
    return window.quest.screenRects(i).filter(p => { const [a, b, c] = p.rect, d = p.rect[1] + (p.rect[3] - p.rect[1]) * .3, ix = Math.max(0, Math.min(c, hr[2]) - Math.max(a, hr[0])), iy = Math.max(0, Math.min(d, hr[3]) - Math.max(b, hr[1])); return ix * iy > .25 * (c - a) * (d - b); }).map(p => `${p.name} at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`); }, i);
  for (const n of hidden) fails.push(`layout [${i + 1}]: ${n} stands behind the chapter heading — move it right or lower`);
}
if (new Set(hashes).size !== hashes.length) fails.push('frames: two chapters render the same picture');
await tab.close();

// ── text fit at both widths, with the task card open and solved ───────────────────────────────────────────
for (const [w, h] of [[1280, 800], [390, 844], [640, 420]]) {   // desktop, phone, an embedded demo frame
  const t2 = await open(w, h);
  for (const [i, t] of times.entries()) {
    const r = await t2.evaluate(t => { window.renderAt(t); const over = [];
      const fit = (sel, name) => { const e = document.querySelector(sel); if (!e || e.offsetParent === null) return; if (e.scrollWidth > e.clientWidth + 1) over.push(`${name} is too wide`); const b = e.getBoundingClientRect(); if (b.right > innerWidth + 1 || b.bottom > innerHeight + 1 || b.left < -1) over.push(`${name} leaves the screen`); };
      fit('.pq-title', 'heading'); fit('.pq-line', 'journey line'); fit('.pq-task', 'task card'); fit('.pq-transport', 'page rail');
      const title = document.querySelector('.pq-title'), lines = Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight));
      if (lines > 2) over.push(`heading wraps to ${lines} lines`);
      const line = document.querySelector('.pq-line'); const ll = Math.round(line.getBoundingClientRect().height / parseFloat(getComputedStyle(line).lineHeight)); if (ll > 3) over.push(`journey line wraps to ${ll} lines`);
      const task = document.querySelector('.pq-task'), bottom = document.querySelector('.pq-bottom'); if (task && !task.hidden && innerWidth > innerHeight) { const a = task.getBoundingClientRect(), b = document.querySelector('.pq-transport').getBoundingClientRect(); if (a.bottom > b.top && a.left < b.right && a.right > b.left) over.push('task card covers the page rail'); }
      return over; }, t.solved);
    for (const o of r) fails.push(`text [${w}px, chapter ${i + 1}]: ${o}`);
  }
  await t2.close();
}
await browser.close(); server.close();
for (const w of warn) console.log('warn:', w);
if (fails.length) { console.log(`\n${fails.length} problem(s):`); for (const f of [...new Set(fails)]) console.log('  ✗', f); process.exit(1); }
console.log('\nall checks passed');
