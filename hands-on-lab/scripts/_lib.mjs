// Shared by the scripts: a static server rooted at the current directory and a Chromium page with WebGL (SwiftShader).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
export function playwright() {
  try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.txt': 'text/plain' };
export function serve(root = process.cwd()) {
  const misses = [];
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(root) || !fs.existsSync(file)) { misses.push(req.url); res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const url = (page, query = '') => `http://127.0.0.1:${server.address().port}/${path.relative(root, path.resolve(page)).split(path.sep).join('/')}${query ? '?' + query : ''}`;
  return { server, url, misses };
}
export async function browser() {
  const { chromium } = playwright();
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}
export function args(argv) {
  const a = argv.slice(2), flag = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; }, bool = (n) => { const i = a.indexOf(n); if (i >= 0) a.splice(i, 1); return i >= 0; };
  return { a, flag, bool };
}
/** the page to open: a project folder (its index.html) or an html file */
export function pageOf(p) { return fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p; }
