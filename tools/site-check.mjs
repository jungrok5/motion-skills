// site-check.mjs — serve docs/ and check pages the way CLAUDE.md asks before a site change is finished:
// 1280 px and 390 px, dark and light — no horizontal scroll, no console errors, no failed requests, iframes load.
//
//   node tools/site-check.mjs [page …] [--shots=<dir>]        pages relative to docs/, e.g. "" (the hub) "prompt-sprite-game/"
//
// Exits 1 if any page fails. --shots writes a PNG per page × width × scheme for looking at.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const args = process.argv.slice(2);
const shots = (args.find((a) => a.startsWith('--shots=')) || '').split('=')[1];
const pages = args.filter((a) => !a.startsWith('--'));
if (!pages.length) pages.push('');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.onnx': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const base = `http://127.0.0.1:${srv.address().port}/`;
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(require.resolve('playwright', { paths: ['/usr/lib/node_modules', '/usr/local/lib/node_modules'] })); }
const browser = await pw.chromium.launch();
let bad = 0;
for (const pg of pages) for (const [w, h] of [[1280, 900], [390, 844]]) for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('response', (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url().replace(base, '/')}`));
  await p.goto(base + pg, { waitUntil: 'load' }); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('.demo')?.scrollIntoView()); await p.waitForTimeout(1500);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  const frames = await p.evaluate(() => [...document.querySelectorAll('iframe')].filter((f) => f.src).map((f) => { try { return f.contentDocument?.readyState || 'cross-origin'; } catch { return 'cross-origin'; } }));
  const real = errs.filter((e) => !/fonts\.|pretendard|favicon/.test(e));
  const ok = sw <= w && !real.length && frames.every((s) => s === 'complete' || s === 'cross-origin');
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} /${pg} ${w}px ${scheme}: scroll ${sw}${frames.length ? `, iframes ${frames.join(',')}` : ''}${real.length ? `, errors: ${real.slice(0, 3).join(' | ')}` : ''}`);
  if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.screenshot({ path: path.join(shots, `${(pg || 'hub').replace(/\W+/g, '_')}-${w}-${scheme}.png`) }); }
  await ctx.close();
}
await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
