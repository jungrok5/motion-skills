// Shared: open a colossus project in headless Chromium (Playwright) and pull frames out of it.
// GPU: Chromium uses the machine's GPU when it can; with no GPU it falls back to SwiftShader (software, slow but
// identical output). Force one with COLOSSUS_GL=gpu | swiftshader. CHROME_PATH points at another Chromium/Chrome.
import { createRequire } from 'node:module';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('playwright-core')); }

export function parseArgs(argv = process.argv.slice(2)) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const s = argv[i];
    if (s.startsWith('--')) { const k = s.slice(2), n = argv[i + 1]; if (n === undefined || n.startsWith('--')) a[k] = true; else { a[k] = n; i++; } }
    else a._.push(s);
  }
  return a;
}

export async function openProject(dir, { w = 960, h = 540, mods = null, q = null, timeout = 600000 } = {}) {
  const { server, port } = await startServer(dir, 0);
  const gl = process.env.COLOSSUS_GL || 'auto';
  const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-webgl', '--disable-gpu-vsync', '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--enable-unsafe-swiftshader'];
  if (gl === 'swiftshader') args.push('--use-gl=angle', '--use-angle=swiftshader');
  const browser = await chromium.launch({ args, timeout, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(timeout);
  const logs = [];
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${t}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[404?] ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) logs.push(`[${r.status()}] ${r.url()}`); });
  const qs = new URLSearchParams({ w, h, still: 1 });
  if (mods) qs.set('mods', mods);
  if (q) for (const kv of String(q).split('&')) { const [k, v] = kv.split('='); qs.set(k, v ?? '1'); }
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/?${qs}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__app !== undefined');
  const res = await page.evaluate(async () => { const r = await window.__app.ready; return { errors: r.errors, info: window.__app.info() }; });
  res.readyMs = Date.now() - t0;
  const close = async () => { await browser.close().catch(() => {}); server.close(); };
  return { browser, page, server, port, logs, close, ...res };
}

// Render time t (optionally with motion-blur sub-frames) and return the canvas as a PNG buffer.
// opts: { shot, cam:[px,py,pz,tx,ty,tz,fov], mb (sub-frames), shutter (s) }
export async function frame(page, t, { shot = '', cam = null, mb = 1, shutter = 0.01 } = {}) {
  const b64 = await page.evaluate(({ t, shot, cam, mb, shutter }) => {
    const app = window.__app;
    if (cam) app.setCam(cam.slice(0, 3), cam.slice(3, 6), cam[6] || 45); else app.setShot(shot);
    if (mb > 1) app.renderBlur(t, mb, shutter); else app.renderAt(t);
    return document.getElementById('c').toDataURL('image/png').split(',')[1];
  }, { t, shot, cam, mb, shutter });
  return Buffer.from(b64, 'base64');
}

// Read a downscaled copy of the canvas as RGBA (for numeric checks)
export async function pixels(page, size = 96) {
  return page.evaluate((size) => {
    const src = document.getElementById('c');
    const c = document.createElement('canvas'); c.width = size; c.height = Math.round(size * src.height / src.width);
    const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height);
    return { w: c.width, h: c.height, data: Array.from(g.getImageData(0, 0, c.width, c.height).data) };
  }, size);
}
