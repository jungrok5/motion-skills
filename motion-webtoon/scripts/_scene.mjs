// Shared by debug.mjs and bone-check.mjs: open one scene page of a film project in headless Chromium the way render.mjs does
// (fonts from <project>/fonts/ or $FONTS_DIR answered locally, ?render=1&o=<h|v>), and collect every page error, console error and
// failed request instead of hiding them.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

export const args = process.argv.slice(2);
export const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };

export async function openScene({ root = '.', scene, page: pagePath, o = 'v', query = '' } = {}) {
  root = resolve(root);
  const file = pagePath ? resolve(root, pagePath) : join(root, 'scenes', scene + '.html');
  if (!existsSync(file)) throw new Error('no scene page ' + file);
  const HOME = process.env.HOME || process.env.USERPROFILE || '.';
  const FONTS_DIR = resolve((process.env.FONTS_DIR || join(HOME, '.local/share/fonts')).replace(/^~/, HOME));
  let film = {}; try { film = JSON.parse(readFileSync(join(root, 'film.json'), 'utf8')); } catch {}
  const faces = [...((film.fonts || {}).base || []).map(([fam, , f]) => [fam, f]), ...Object.entries((film.fonts || {}).local || {})];
  const fontFile = f => [join(root, 'fonts', f), join(FONTS_DIR, f)].find(p => existsSync(p));
  const css = faces.filter(([, f]) => f && fontFile(f)).map(([fam, f]) => `@font-face{font-family:'${fam}';src:url('${pathToFileURL(fontFile(f)).href}');font-weight:100 900;}`).join('\n');
  const [W, H] = o === 'v' ? [1080, 1920] : [1920, 1080];
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const problems = [];
  page.on('pageerror', e => problems.push('page error: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/willReadFrequently/.test(m.text())) problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on('requestfailed', r => { if (!/fonts\.g/.test(r.url())) problems.push('request failed: ' + r.url()); });
  await page.route(/fonts\.googleapis\.com/, r => css ? r.fulfill({ status: 200, contentType: 'text/css', body: css }) : r.abort());
  await page.route(/fonts\.gstatic\.com/, r => r.abort());
  await page.goto(pathToFileURL(file).href + `?render=1&o=${o}` + (query ? '&' + query : ''));
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); }
  catch { problems.push('NOT READY: window.__ready never became true (an error before Pilot.run finished?)'); }
  return { browser, page, problems, file };
}
