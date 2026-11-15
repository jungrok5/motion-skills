#!/usr/bin/env node
// Browser acceptance pass for one built page: loads it in Chromium (Playwright), renders the
// assembled and separated states at desktop and phone sizes, saves stills, and fails on
// console errors, unloaded embedded fonts, a blank canvas, or callouts that overlap each
// other, the fixed controls or the screen edge. It does not judge historical accuracy:
// compare the stills with the reference photos yourself.
//
//   node <skill>/scripts/check.mjs <out>/model.html [--stills <dir>] [--sizes 1920x1080,390x844,320x740] [--angles ne:45:4,s:-90:8]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {({chromium} = require('playwright'));} catch {
  try {({chromium} = require(require.resolve('playwright', {paths: [process.cwd()]})));} catch {
    console.error('Playwright is required: npm i -D playwright (or use a preinstalled one).'); process.exit(2);
  }
}
const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
if (!file) {console.error('Usage: node check.mjs <page.html> [--stills dir] [--sizes WxH,...]'); process.exit(2);}
const opt = k => {const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null;};
const stills = path.resolve(opt('--stills') || path.join(path.dirname(file), 'stills'));
const sizes = (opt('--sizes') || '1920x1080,390x844,320x740').split(',').map(s => s.split('x').map(Number));
fs.mkdirSync(stills, {recursive: true});
const angles = (opt('--angles') || '').split(',').filter(Boolean).map(a => {const [n, y, p] = a.split(':'); return [n, Number(y), Number(p)];});
const base = path.basename(file, '.html');
const url = pathToFileURL(path.resolve(file)).href;

const overlap = (a, b, pad = 0) => a[0] < b[0] + b[2] + pad && b[0] < a[0] + a[2] + pad && a[1] < b[1] + b[3] + pad && b[1] < a[1] + a[3] + pad;
const failures = [], report = [];
const browser = await chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
for (const [w, h] of sizes) {
  const page = await browser.newPage({viewport: {width: w, height: h}, deviceScaleFactor: 1});
  const errors = [];
  page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.controlsFont, null, {timeout: 15000}).catch(() => {});
  await page.waitForTimeout(300);
  const tag = `${base}-${w}x${h}`;
  const state = async () => page.evaluate(() => {
    const r = el => {const b = document.querySelector(el)?.getBoundingClientRect(); return b ? [b.left, b.top, b.width, b.height] : null;};
    const c = document.getElementById('model'), g = c.getContext('webgl', {preserveDrawingBuffer: true});
    let ink = 0;
    if (g) {const px = new Uint8Array(4 * 64 * 64); g.readPixels(Math.floor(g.drawingBufferWidth / 2) - 32, Math.floor(g.drawingBufferHeight / 2) - 32, 64, 64, g.RGBA, g.UNSIGNED_BYTE, px); for (let i = 3; i < px.length; i += 4) if (px[i] > 0) ink++;}
    const labels = JSON.parse(document.getElementById('annotations').dataset.labels || '[]');
    // Share of each callout box that lies on drawn model pixels (WebGL y runs bottom-up).
    const covered = labels.map(([x, y, bw, bh]) => {
      if (!g) return 0; const d = devicePixelRatio, X = Math.max(0, Math.round(x * d)), W = Math.max(1, Math.round(bw * d)), Hh = Math.max(1, Math.round(bh * d));
      const Y = Math.max(0, g.drawingBufferHeight - Math.round((y + bh) * d)), px = new Uint8Array(4 * W * Hh);
      g.readPixels(X, Y, W, Hh, g.RGBA, g.UNSIGNED_BYTE, px); let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0) n++;
      return n / (W * Hh);
    });
    return {labels, covered, ink,
      fixed: ['footer', '.view-tools', '.siteplan'].map(r).filter(Boolean), stage: r('#stage'),
      controlsFont: document.documentElement.dataset.controlsFont, labelFont: document.documentElement.dataset.labelFont,
      scrollX: document.documentElement.scrollWidth > innerWidth};
  });
  await page.screenshot({path: path.join(stills, `${tag}-closed.png`)});
  const closed = await state();
  await page.click('#toggle');
  await page.waitForFunction(() => document.getElementById('model').dataset.state === 'open', null, {timeout: 10000});
  await page.waitForTimeout(150);
  await page.screenshot({path: path.join(stills, `${tag}-open.png`)});
  const open = await state();
  // A side view catches callouts that only collide after orbiting.
  await page.mouse.move(w / 2, h * .4); await page.mouse.down(); await page.mouse.move(w / 2 + Math.min(260, w * .3), h * .4, {steps: 8}); await page.mouse.up();
  await page.waitForTimeout(150);
  await page.screenshot({path: path.join(stills, `${tag}-open-orbit.png`)});
  const orbit = await state();
  // Photo-matching stills: --angles ne:45:4,s:-90:10 (yaw: direction the camera stands in,
  // degrees from +X/east toward +Y/north; pitch above the horizon). Assembled state only.
  if (angles.length && w === sizes[0][0] && h === sizes[0][1]) {
    await page.click('#toggle');
    await page.waitForFunction(() => document.getElementById('model').dataset.state === 'closed', null, {timeout: 10000});
    for (const [name, yawDeg, pitchDeg] of angles) {
      await page.evaluate(([y, p]) => window.heritageBlueprint.setOrbit(y, p), [yawDeg, pitchDeg]);
      await page.waitForTimeout(100);
      await page.screenshot({path: path.join(stills, `${base}-view-${name}.png`)});
    }
  }
  const issues = [], warnings = [];
  if (errors.length) issues.push('console: ' + errors.join(' | '));
  if (closed.controlsFont !== 'loaded') issues.push('title font ' + closed.controlsFont);
  if (closed.labelFont && closed.labelFont !== 'loaded') issues.push('label font ' + closed.labelFont);
  if (closed.ink < 20) issues.push('canvas centre looks blank');
  if (closed.scrollX) issues.push('horizontal scroll');
  for (const [name, s] of [['open', open], ['orbit', orbit]]) {
    if (!s.labels.length) issues.push(name + ': no callouts drawn');
    // Callout boxes are in model-area coordinates; move them to the viewport for these tests.
    const boxes = s.labels.map(([x, y, bw, bh]) => [x + s.stage[0], y + s.stage[1], bw, bh]);
    boxes.forEach((a, i) => {
      if (a[0] < 0 || a[1] < 0 || a[0] + a[2] > w || a[1] + a[3] > h) issues.push(`${name}: callout ${i + 1} leaves the screen`);
      boxes.forEach((b, j) => {if (j > i && overlap(a, b)) issues.push(`${name}: callouts ${i + 1} and ${j + 1} overlap`);});
      // Phones often have no free column beside the model: report, but only fail on wider screens.
      if (s.covered[i] > .08) (w >= 600 ? issues : warnings).push(`${name}: callout ${i + 1} covers the model (${Math.round(s.covered[i] * 100)}% of its box)`);
      s.fixed.forEach((f, k) => {if (overlap(a, f)) issues.push(`${name}: callout ${i + 1} overlaps ${['footer', 'view tools', 'corner diagram'][k] || 'fixed UI'}`);});
    });
  }
  report.push({size: `${w}x${h}`, callouts: open.labels.length, issues, warnings});
  if (issues.length) failures.push(...issues.map(x => `${w}x${h} ${x}`));
  await page.close();
}
await browser.close();
console.log(JSON.stringify({page: file, stills, report, pass: !failures.length,
  note: 'Pixels, fonts and layout only. Compare stills with reference photos from matching angles before calling the model accurate.'}, null, 2));
process.exitCode = failures.length ? 1 : 0;
