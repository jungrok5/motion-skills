// luminous-score · browser.mjs — open a piece page in headless Chromium (SwiftShader WebGL) and wait for window.READY.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];

export async function openPiece(file, { query = 'render=1', viewport = { width: 960, height: 540 }, quiet = false } = {}) {
  const browser = await chromium.launch({ args: ARGS });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const log = { errors: [], warnings: [], failed: [] };
  page.on('pageerror', (e) => { log.errors.push(e.message); if (!quiet) console.error('page error:', e.message); });
  page.on('requestfailed', (r) => log.failed.push(r.url()));
  page.on('console', (m) => {
    const t = m.text(); if (/GPU stall|ReadPixels|GroupMarkerNotSet|Automatic fallback to software WebGL/.test(t)) return;
    if (m.type() === 'error') { log.errors.push(t); if (!quiet) console.error('console error:', t.slice(0, 400)); }
    else if (m.type() === 'warning') log.warnings.push(t);
  });
  await page.goto(pathToFileURL(file).href + (query ? '?' + query : ''), { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true).catch(() => false));) {
    if (log.errors.length) throw new Error('piece failed to load: ' + log.errors[0]);
    if (Date.now() - t0 > 180000) throw new Error('piece never set window.READY');
    await new Promise((r) => setTimeout(r, 120));
  }
  return { browser, page, log };
}
export const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => { window.seek(t); return document.querySelector('#frame').toDataURL(type, 0.92); }, [t, type]);
export const b64 = (d) => Buffer.from(d.split(',')[1], 'base64');
