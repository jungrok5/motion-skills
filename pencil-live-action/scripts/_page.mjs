// pencil-live-action · _page.mjs — shared by render / check / score: a small static server for the project (a film page
// reads its scans with fetch(), which file:// does not allow) and a Chromium page that waits for window.__ready.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, extname, sep } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
export { chromium };

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.hdr': 'application/octet-stream', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.wav': 'audio/wav', '.css': 'text/css' };
/** serve `root` on a free port → { url(pathUnderRoot), close() } */
export async function serve(root) {
  root = resolve(root);
  const srv = http.createServer((rq, rs) => {
    const f = resolve(join(root, decodeURIComponent(rq.url.split('?')[0])));
    if (!(f === root || f.startsWith(root + sep)) || !existsSync(f) || statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); }
    rs.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(f).pipe(rs);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  return { url: p => `http://127.0.0.1:${port}/${relative(root, resolve(p)).split(sep).join('/')}`, close: () => srv.close() };
}
/** the server root: --root, else the nearest folder above the page that holds its lib/ (the import map points there) */
export function rootFor(page, opt) {
  if (opt) return resolve(opt);
  let d = resolve(page, '..');
  for (let i = 0; i < 6; i++) { if (existsSync(join(d, 'lib', 'film.js'))) return d; const up = resolve(d, '..'); if (up === d) break; d = up; }
  return process.cwd();
}
/** open a film page (with query) and wait for __ready; logs page errors */
export async function openFilm(browser, url, { quiet = false, viewport = { width: 960, height: 540 } } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  let failed = null; const errors = [];
  page.on('pageerror', e => { failed = failed || e; errors.push(e.message); if (!quiet) console.error('page error:', e.message); });
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver Message|WebGL|willReadFrequently/.test(m.text())) { errors.push(m.text()); if (!quiet) console.error(`console ${m.type()}:`, m.text().slice(0, 400)); } });
  page.on('requestfailed', r => errors.push('request failed: ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (failed) throw new Error('film failed to load: ' + failed.message);
    if (Date.now() - t0 > 300000) throw new Error('film never set window.__ready');
    await new Promise(r => setTimeout(r, 150));
  }
  page.errors = errors; return page;
}
export const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
