// aesthetics-film · _browser.mjs — shared by the scripts: find Playwright, open a film page and wait for window.__ready.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
export let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

// file:// pages need the module flag; SwiftShader runs WebGL where there is no GPU
export const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'];

/** open page$ with a query; returns { browser, page, errors } once window.__ready (or throws) */
export async function openFilm(page$, query = 'render=1', { errors = [], tolerate = () => false } = {}) {
  const browser = await chromium.launch({ args: ARGS });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !tolerate(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('requestfailed', (r) => { if (!tolerate(r.url())) errors.push('failed to load: ' + r.url().slice(0, 200)); });
  await page.goto(pathToFileURL(page$).href + '?' + query, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (errors.some((e) => e.startsWith('page error'))) throw new Error(errors.join('\n'));
    if (Date.now() - t0 > 300000) throw new Error('the film never set window.__ready');
    await new Promise((r) => setTimeout(r, 150));
  }
  return { browser, page, errors };
}
