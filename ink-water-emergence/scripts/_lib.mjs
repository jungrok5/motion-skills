// ink-water-emergence · _lib.mjs — shared by the scripts: a static server rooted where both the page and the library it
// imports live, and a Chromium page with WebGL2 (SwiftShader when there is no GPU). Adapted from ink-word-world.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
export function playwright() {
  try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.jpg': 'image/jpeg', '.md': 'text/plain' };
export function serve(root) {
  const misses = [];
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(root) || !fs.existsSync(file)) { if (!/favicon/.test(req.url)) misses.push(req.url); res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const url = (page, query = '') => `http://127.0.0.1:${server.address().port}/${path.relative(root, path.resolve(page)).split(path.sep).join('/')}${query ? '?' + query : ''}`;
  return { server, url, misses };
}
export const LAUNCH = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
export async function browser() { const { chromium } = playwright(); return chromium.launch({ args: LAUNCH }); }
/** the page to open: a project folder (its index.html) or an html file */
export function pageOf(p) { return fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p; }
/** the folder to serve: the page's folder, widened until it contains the library the import map points at */
export function rootOf(page) {
  let dir = path.dirname(path.resolve(page));
  const html = fs.readFileSync(page, 'utf8'), m = html.match(/"inkwater\/"\s*:\s*"([^"]+)"/), lib = m ? path.resolve(dir, m[1]) : dir;
  while (!(lib + path.sep).startsWith(dir + path.sep) && path.dirname(dir) !== dir) dir = path.dirname(dir);
  return dir;
}
export function args(argv) {
  const a = argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf('--' + k); return i > -1 ? a[i + 1] : d; };
  const has = (k) => a.includes('--' + k);
  return { a, opt, has };
}
/** open a film page; returns { page, errors, misses, close } once window.__ready */
export async function openFilm(target, query = 'render=1', { b = null, server = null } = {}) {
  const file = pageOf(target), s = server || serve(rootOf(file)), br = b || await browser();
  const page = await br.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 }), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|WebGL/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(s.url(file, query));
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (errors.length) throw new Error('film failed to load: ' + errors[0]);
    if (Date.now() - t0 > 120000) throw new Error('film never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return { page, errors, misses: s.misses, server: s, browser: br, close: async () => { await page.close(); if (!b) await br.close(); if (!server) s.server.close(); } };
}
export const grab = (page, t) => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t);
export const png = d => Buffer.from(d.split(',')[1], 'base64');
