// nested-world-loop · shared helpers for the scripts: open a loop page in headless Chromium (SwiftShader WebGL, no GPU
// needed), grab frames, measure them.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

export const args = process.argv.slice(2);
export const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
export const flag = k => args.includes('--' + k);
export function pagePath(usage) {
  let p = args.find(a => a.endsWith('.html') || (!a.startsWith('--') && existsSync(resolve(a, 'index.html'))));
  if (p && !p.endsWith('.html')) p = join(p, 'index.html');
  if (!p || !existsSync(resolve(p))) { console.error(usage); process.exit(1); }
  return resolve(p);
}
export const loopName = p => basename(p) === 'index.html' ? basename(dirname(p)) : basename(p).replace(/\.html$/, '');

export async function launch() {
  return chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-webgl'] });
}
// open(browser, file, { scale, ss, extra }) → { page, errors, requests }
export async function open(browser, file, o = {}) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|swiftshader|WebGL: INVALID|Automatic fallback/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('requestfailed', r => errors.push('failed request: ' + r.url()));
  page.on('request', r => requests.push(r.url()));
  const q = '?render=1' + (o.scale ? '&scale=' + o.scale : '') + (o.ss ? '&ss=' + o.ss : '') + (o.extra || '');
  await page.goto(pathToFileURL(file).href + q, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true).catch(() => false));) {
    if (errors.length) throw new Error(errors.join('\n'));
    if (Date.now() - t0 > (o.timeout || 300000)) throw new Error('page never set window.__ready');
    await new Promise(r => setTimeout(r, 150));
  }
  return { page, errors, requests };
}
// grab(page, t, type, q, off) — render film time t (off: force the root world k+off, for the hand-off test)
export const grab = (page, t, type = 'image/png', q = .95, off = 0) => page.evaluate(([t, type, q, off]) => {
  if (t !== null) { if (off) window.__nwl.renderAt(t, off); else window.seek(t); }
  return document.getElementById('film').toDataURL(type, q);
}, [t, type, q, off]);
export const buf = d => Buffer.from(d.split(',')[1], 'base64');

// In-page: pixels of the current frame, downsampled → numbers (luminance spread, clipping, flat tiles) and a small
// grey thumbnail for frame-to-frame comparison.
export function measureInPage(o = {}) {
  const src = document.getElementById('film'), W = o.w || 320, H = Math.round(W * src.height / src.width);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
  const L = new Float32Array(W * H); let clip = 0, black = 0, sat = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    L[p] = .2126 * r + .7152 * g + .0722 * b; if (mx > .985 && (mx - mn) / (mx || 1) > .85) clip++; if (mx < .015) black++; sat += mx ? (mx - mn) / mx : 0;
  }
  const T = 16, tw = Math.floor(W / T), th = Math.floor(H / T); let flat = 0;
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) { let s = 0, s2 = 0; for (let y = ty * T; y < ty * T + T; y++) for (let xx = tx * T; xx < tx * T + T; xx++) { const v = L[y * W + xx] * 255; s += v; s2 += v * v; } const n = T * T, m = s / n; if (Math.sqrt(Math.max(0, s2 / n - m * m)) < 1.2) flat++; }
  const sorted = Array.from(L).sort((a, b) => a - b), pct = q => sorted[Math.floor(q * (sorted.length - 1))];
  return { p05: pct(.05), p50: pct(.5), p95: pct(.95), p99: pct(.99), clip: clip / L.length, black: black / L.length, sat: sat / L.length, flat: flat / (tw * th), thumb: Array.from(L, v => Math.round(v * 255)), w: W, h: H };
}
// mean absolute difference (0..255) between two thumbnails
export const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
