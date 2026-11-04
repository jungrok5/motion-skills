// sight-gag-short · _browser.mjs — shared Playwright launcher for the scripts (headless Chromium, SwiftShader WebGL).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
export const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'];
/** open a film page (?render=1 + query) and wait for window.__ready; returns { browser, page, errors } */
export async function openFilm(file, query = '', viewport = { width: 960, height: 540 }) {
  const browser = await chromium.launch({ args: ARGS });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(file).href + '?render=1' + (query ? '&' + query : ''), { waitUntil: 'commit', timeout: 0 });
  const t0 = Date.now();
  while (!(await page.evaluate(() => window.__ready === true).catch(() => false))) {
    if (errors.length) break;
    if (Date.now() - t0 > 300000) { errors.push('never set window.__ready'); break; }
    await new Promise(r => setTimeout(r, 150));
  }
  return { browser, page, errors };
}
