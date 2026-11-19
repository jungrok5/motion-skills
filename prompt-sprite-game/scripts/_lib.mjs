// shared helpers for the scripts: a static server for a project folder and a Playwright page on it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

export function serve(root) {
  root = path.resolve(root);
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(root, p);
      if (!f.startsWith(path.resolve(root)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
  });
}

export function playwright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { return require(require.resolve('playwright', { paths: [process.cwd(), '/usr/lib/node_modules', '/usr/local/lib/node_modules'] })); }
}

export async function openGame(project, query = 'test=1', { width = 960, height = 600, scale = 1 } = {}) {
  const { chromium } = playwright();
  const srv = await serve(project);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(srv.url + 'index.html?' + query);
  await page.waitForFunction(() => window.GAME, null, { timeout: 15000 });
  return { page, browser, srv, errors, close: async () => { await browser.close(); srv.close(); } };
}

export function projectArg() {
  const p = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!p) { console.error('usage: node <skill>/scripts/<script>.mjs <project-folder> [options]'); process.exit(2); }
  const dir = path.resolve(p);
  if (!fs.existsSync(path.join(dir, 'game.json'))) { console.error(`${dir}: no game.json`); process.exit(2); }
  return dir;
}
export const flag = (name, dflt = null) => { const a = process.argv.find((x) => x.startsWith(`--${name}`)); if (!a) return dflt; const v = a.split('=')[1]; return v === undefined ? true : v; };
