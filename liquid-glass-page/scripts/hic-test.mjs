// hic-test.mjs — the shared checks for HTML-in-Canvas pages (master copy: tools/hic/hic-test.mjs in motion-skills;
// every live-page skill carries an identical copy in <skill>/scripts/hic-test.mjs, synced by tools/sync-hic.mjs).
//
//   import { run, open, stills } from './hic-test.mjs';
//   await run('index.html', { extra: async (t) => { … skill checks … } });
//
// What run() proves, with numbers:
//   1 loads with the feature on (Chromium flag) and reaches window.__hic.ready; no page errors, console errors or 404s
//   2 the canvas draws: not blank (pixel spread), the live page was uploaded (__hic.uploads ≥ 1)
//   3 the page is live: a real click on an editable element ([data-hic-edit], else contenteditable / text input) through
//     the drawing focuses it, typing changes its text, a new upload follows and the canvas pixels change
//   4 a real click on [data-hic-click] (if any) reaches it (its click handler or text changes)
//   5 it keeps drawing: frames per second over 1.5 s (headless software GL, so low numbers are normal; 0 is a failure)
//   6 phone width (390 × 844): loads, ready, no horizontal scroll
//   7 the fallback: with the feature off the same HTML is an ordinary readable page (no errors, text visible)
// Exit code 1 if anything failed. Prints `ok` / `FAIL` / numbers.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
export { chromium };

export const FLAG = '--enable-blink-features=CanvasDrawElement';
const NOISE = /GL Driver Message|GPU stall|WebGL-|swiftshader|Automatic fallback to software WebGL/i;

// open(file, { feature: true, width, height, dpr, hash }) → { browser, page, errors, url }
export async function open(file, o = {}) {
  const abs = resolve(file);
  if (!existsSync(abs)) throw new Error('not found: ' + abs);
  const args = ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  if (o.feature !== false) args.push(FLAG);
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width: o.width || 1280, height: o.height || 800 }, deviceScaleFactor: o.dpr || 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push('console error: ' + m.text().slice(0, 300)); });
  page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  const url = pathToFileURL(abs).href + (o.hash ? '#' + o.hash : '');
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  return { browser, page, errors, url };
}

export async function waitReady(page, errors, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await page.evaluate(() => !!(window.__hic && window.__hic.ready));
    if (r) return true;
    if (errors.length) return false;
    await page.waitForTimeout(100);
  }
  return false;
}

// pixel statistics of a screenshot region: { mean, spread (std of luma), colours (distinct 4-bit colours) }
export async function stats(page, clip) {
  const png = await page.screenshot({ clip, type: 'png' });
  return await decode(page, png);
}
async function decode(page, png) {
  return await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = Math.min(320, img.width); c.height = Math.round(img.height * c.width / img.width);
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; const set = new Set();
    for (let i = 0; i < d.length; i += 4) { const l = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; s += l; s2 += l * l; n++; set.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4); }
    const mean = s / n; return { mean: +mean.toFixed(1), spread: +Math.sqrt(Math.max(0, s2 / n - mean * mean)).toFixed(1), colours: set.size, sig: Array.from(d.filter((_, i) => i % 97 === 0)) };
  }, png.toString('base64'));
}
export function diff(a, b) { let s = 0; for (let i = 0; i < Math.min(a.sig.length, b.sig.length); i++) s += Math.abs(a.sig[i] - b.sig[i]); return s / Math.max(1, a.sig.length); }

async function canvasClip(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas[layoutsubtree], canvas[content="drawable"]');
    if (!c) return null; const r = c.getBoundingClientRect();
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(innerWidth, r.width), height: Math.min(innerHeight, r.height) };
  });
}
// where an element is on screen: the page's own __hic.screenOf(el) (for warped / 3D pages) or its layout box
async function screenPoint(page, sel) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return null;
    const c = document.querySelector('canvas[layoutsubtree], canvas[content="drawable"]'), cb = c ? c.getBoundingClientRect() : { left: 0, top: 0 };
    if (window.__hic && typeof window.__hic.screenOf === 'function') { const p = window.__hic.screenOf(el); if (p) return { x: cb.left + p[0], y: cb.top + p[1], via: 'screenOf' }; }
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, via: 'layout' };
  }, sel);
}

// run(file, { extra(t), edit: selector, click: selector, hash, settle: ms, phone: true, fallback: true })
// t = { page, ok, fail, info, stats, diff, screenPoint, clip }
export async function run(file, o = {}) {
  let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, ok = m => console.log('ok   ' + m), info = m => console.log('     ' + m);
  // 1 load
  const { browser, page, errors } = await open(file, { hash: o.hash, width: o.width, height: o.height });
  const ready = await waitReady(page, errors, o.timeout || 45000);
  const hic = await page.evaluate(() => window.__hic || null);
  if (!ready || !hic) { fail('never ready' + (errors.length ? ': ' + errors.join(' | ') : '')); await browser.close(); return finish(bad); }
  if (hic.fallback) fail('fell back to the plain page with the feature on (is the canvas markup right? does it need an extension?)');
  else ok(`ready · upload way: ${hic.way} · hit-test mode: ${hic.mode} · uploads ${hic.uploads}`);
  await page.waitForTimeout(o.settle ?? 800);
  const clip = await canvasClip(page);
  // 2 draws
  const s0 = await stats(page, clip);
  if (s0.spread < 6 || s0.colours < 12) fail(`the canvas looks blank (luma spread ${s0.spread}, ${s0.colours} colours)`); else ok(`draws: luma spread ${s0.spread}, ${s0.colours} colours`);
  if ((await page.evaluate(() => window.__hic.uploads)) < 1) fail('the live page was never uploaded');
  // 3 live: click through the drawing into an editable element, type
  const editSel = o.edit || await page.evaluate(() => {
    const c = document.querySelector('canvas[layoutsubtree], canvas[content="drawable"]'); if (!c) return null;
    const el = c.querySelector('[data-hic-edit]') || c.querySelector('[contenteditable]:not([contenteditable=false])') || c.querySelector('input[type=text], input:not([type]), textarea');
    if (!el) return null; if (!el.id) el.id = 'hic-edit-probe'; return '#' + el.id;
  });
  if (!editSel) fail('no editable element in the drawn page (mark one with data-hic-edit)');
  else {
    const pt = await screenPoint(page, editSel);
    const before = await page.evaluate(s => { const e = document.querySelector(s); return e.value ?? e.textContent; }, editSel);
    const up0 = await page.evaluate(() => window.__hic.uploads);
    await page.mouse.move(pt.x - 30, pt.y); await page.waitForTimeout(80);
    await page.mouse.move(pt.x, pt.y); await page.waitForTimeout(250);
    await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(150);
    const focused = await page.evaluate(s => { const e = document.querySelector(s); return document.activeElement === e || e.contains(document.activeElement); }, editSel);
    if (!focused) fail(`a click on ${editSel} at (${pt.x | 0}, ${pt.y | 0}) [${pt.via}] did not focus it (hit ${await page.evaluate(p => { const h = document.elementFromPoint(p.x, p.y); return h ? h.tagName + (h.id ? '#' + h.id : '') : 'nothing'; }, pt)})`);
    else ok(`a real click through the drawing focuses ${editSel} [${pt.via}]`);
    const sA = await stats(page, clip);
    await page.keyboard.press('End'); await page.keyboard.type(o.typeText || ' zq7', { delay: 40 }); await page.waitForTimeout(o.typeSettle ?? 700);
    const after = await page.evaluate(s => { const e = document.querySelector(s); return e.value ?? e.textContent; }, editSel);
    const up1 = await page.evaluate(() => window.__hic.uploads);
    const sB = await stats(page, clip);
    if (after === before) fail('typing did not change the text'); else ok(`typing changes the live text ("…${after.slice(-12)}")`);
    if (up1 <= up0) fail('no new upload after typing'); else ok(`typing re-uploads the page (${up1 - up0} uploads)`);
    const d = diff(sA, sB);
    if (d < 0.05) fail(`the canvas did not change after typing (diff ${d.toFixed(3)})`); else info(`canvas change after typing: ${d.toFixed(2)}`);
  }
  // 4 click
  const clickSel = o.click || await page.evaluate(() => { const e = document.querySelector('canvas [data-hic-click]'); if (!e) return null; if (!e.id) e.id = 'hic-click-probe'; return '#' + e.id; });
  if (clickSel) {
    const before = await page.evaluate(s => { const e = document.querySelector(s); window.__hicClicked = 0; e.addEventListener('click', () => window.__hicClicked++, { once: true }); return 0; }, clickSel);
    const pt = await screenPoint(page, clickSel);
    await page.mouse.move(pt.x, pt.y); await page.waitForTimeout(250);
    await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(200);
    const n = await page.evaluate(() => window.__hicClicked);
    if (n > before) ok(`a real click reaches ${clickSel} [${pt.via}]`); else fail(`a click at (${pt.x | 0}, ${pt.y | 0}) did not reach ${clickSel}`);
  }
  // 5 frames
  const f0 = await page.evaluate(() => window.__hic.frames); await page.waitForTimeout(1500); const f1 = await page.evaluate(() => window.__hic.frames);
  const fps = (f1 - f0) / 1.5;
  if (fps <= 0) fail('the page stopped drawing'); else info(`frames: ${fps.toFixed(1)} fps here (software GL in headless; a real GPU is far faster)`);
  // skill checks
  if (o.extra) await o.extra({ page, ok, fail, info, stats, diff, screenPoint, clip, errors });
  if (errors.length) fail('errors: ' + errors.join(' | ')); else ok('no page errors, console errors or failed requests');
  await browser.close();
  // 6 phone
  if (o.phone !== false) {
    const P = await open(file, { width: 390, height: 844, dpr: 2, hash: o.hash });
    const r = await waitReady(P.page, P.errors, o.timeout || 45000);
    const over = await P.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (!r) fail('phone width: never ready ' + P.errors.join(' | '));
    else if (over > 1) fail(`phone width: ${over}px of horizontal scroll`);
    else if (P.errors.length) fail('phone width: ' + P.errors.join(' | '));
    else ok('phone width 390: ready, no horizontal scroll');
    await P.browser.close();
  }
  // 7 fallback
  if (o.fallback !== false) {
    const F = await open(file, { feature: false });
    const r = await waitReady(F.page, F.errors, 15000);
    const v = await F.page.evaluate(() => ({ fb: !!(window.__hic && window.__hic.fallback), text: (document.querySelector('[data-hic-fallback]') || document.body).innerText.trim().length }));
    if (!r || !v.fb) fail('feature off: no fallback page (call HIC.fallback when !HIC.supported())');
    else if (v.text < 20) fail('feature off: the fallback page shows no text');
    else if (F.errors.length) fail('feature off: ' + F.errors.join(' | '));
    else ok(`feature off: an ordinary page with the same HTML (${v.text} characters of text)`);
    await F.browser.close();
  }
  return finish(bad);
}
function finish(bad) { console.log(bad ? `\n${bad} check(s) failed` : '\nall checks passed'); if (bad) process.exitCode = 1; return bad; }

// stills(file, outDir, [{ name, hash, width, height, dpr, before(page) }]) — screenshots with the feature on
export async function stills(file, outDir, shots) {
  mkdirSync(outDir, { recursive: true });
  const out = [];
  for (const s of shots) {
    const { browser, page, errors } = await open(file, { hash: s.hash, width: s.width || 1280, height: s.height || 800, dpr: s.dpr || 1 });
    if (!(await waitReady(page, errors))) { console.error(`${s.name}: never ready ${errors.join(' | ')}`); await browser.close(); continue; }
    await page.waitForTimeout(s.settle ?? 900);
    if (s.before) { await s.before(page); await page.waitForTimeout(s.after ?? 600); }
    const f = join(outDir, s.name + (s.type === 'jpeg' ? '.jpg' : '.png'));
    await page.screenshot({ path: f, type: s.type || 'png', quality: s.type === 'jpeg' ? (s.quality || 82) : undefined });
    if (errors.length) console.error(`${s.name}: ${errors.join(' | ')}`);
    out.push(f); console.log('wrote ' + f);
    await browser.close();
  }
  return out;
}
