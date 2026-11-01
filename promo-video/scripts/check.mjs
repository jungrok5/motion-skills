// check.mjs — automatic QA of a promo-video page BEFORE the full render. Exit code 1 if any error.
//
// Usage (from the project root):
//   node <skill>/scripts/check.mjs <video>/index.html [--fmt p|l|both] [--step 0.5] [--sheet out/<name>-check.jpg]
//
// It steps through the whole timeline (every --step seconds, plus 3 moments per scene if the page sets
// window.SCENES = [{id, start, end}] or [[id, start, end]]) and reports, with the time and the element:
//   ERROR  text outside the frame · text under the Shorts/Reels UI (portrait: bottom 18 %) · text under the caption box
//          · a pen mark (assets/pen.js) not on its target or drawn on an invisible target · a font that did not load
//          · render(t) not deterministic · page errors, console errors, failed requests
//          · a stretched, hand-placed SVG stroke (preserveAspectRatio="none") — such marks never fit: use pen.js
//   WARN   text overlapping other text in the same scene · text in the right-hand button column (portrait, lower half)
//          · a visible card with nothing visible in it · text clipped by an overflow:hidden box · a caption over 2 lines
// It also writes a contact sheet (one frame per scene, or every 4 s) to look at.
// Conventions it relies on: fixed stage #stage (1080×1920 or 1920×1080), caption box #cap (optional), cards have class
// "card", decorative elements that may overlap text on purpose carry class "deco" (ignored by the overlap test).
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const page0 = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!page0) { console.error('usage: node check.mjs <page.html> [--fmt p|l|both] [--step 0.5] [--sheet out/x.jpg]'); process.exit(2); }
const pageFile = path.resolve(page0);
const name = path.basename(path.dirname(pageFile));
const fmts = { l: ['l'], p: ['p'], both: ['l', 'p'] }[arg('--fmt', 'p')];
const STEP = Number(arg('--step', 0.5));
const sheetTpl = arg('--sheet', `out/${name}-check-{fmt}.jpg`);

// ---------------------------------------------------------------- in-page probe (runs inside Chromium)
function probe(fmt) {
  const stage = document.querySelector('#stage') || document.body;
  const W = stage.offsetWidth, H = stage.offsetHeight;
  const sr = stage.getBoundingClientRect(), k = sr.width / W;
  const R = el => { const r = el.getBoundingClientRect(); return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k }; };
  // what the viewer sees: visibility is inherited but a child can override it, so only the element's own computed value
  // counts; display:none and opacity apply through every ancestor
  const effOpacity = el => {
    if (getComputedStyle(el).visibility === 'hidden') return 0;
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none') return 0;
      o *= parseFloat(cs.opacity);
      if (o < 0.02) return 0;
    }
    return o;
  };
  const label = el => {
    const id = el.id ? '#' + el.id : '';
    const cls = el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '';
    const sc = el.closest('[id^="s"], section'); const scn = sc && sc !== el && sc.id ? sc.id + ' ' : '';
    return `${scn}${el.tagName.toLowerCase()}${id}${cls} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
  };
  const issues = [];
  const add = (level, kind, msg) => issues.push({ level, kind, msg });
  const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

  // visible text elements = elements with their own non-empty text node
  const cap = document.querySelector('#cap');
  const texts = [];
  document.querySelectorAll('#stage *').forEach(el => {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'text') return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const o = effOpacity(el);
    if (o < 0.5) return;
    // the area the glyphs really cover (a block element's box spans its whole width)
    const rg = document.createRange(), boxes = [];
    [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).forEach(n => { rg.selectNodeContents(n); boxes.push(...rg.getClientRects()); });
    if (!boxes.length) return;
    const xs = boxes.map(b => (b.left - sr.left) / k), ys = boxes.map(b => (b.top - sr.top) / k);
    const r = { x: Math.min(...xs), y: Math.min(...ys) };
    r.w = Math.max(...boxes.map(b => (b.right - sr.left) / k)) - r.x; r.h = Math.max(...boxes.map(b => (b.bottom - sr.top) / k)) - r.y;
    if (r.w < 2 || r.h < 2) return;
    const scene = el.closest('section, .scene');
    texts.push({ el, r, o, scene, inCap: cap && cap.contains(el), deco: !!el.closest('.deco') });
  });

  for (const t of texts) {
    const { r } = t;
    if (r.x < -2 || r.y < -2 || r.x + r.w > W + 2 || r.y + r.h > H + 2) add('ERROR', 'off-frame', `${label(t.el)} is outside the frame`);
    if (fmt === 'p' && !t.inCap) {
      if (r.y + r.h > H * 0.82) add('ERROR', 'unsafe-bottom', `${label(t.el)} is in the bottom 18 % (Shorts title/description area)`);
      else if (r.x + r.w > W - 140 && r.y + r.h > H * 0.5) add('WARN', 'unsafe-right', `${label(t.el)} reaches the right-hand button column`);
    }
    // clipped by an overflow:hidden ancestor (kinetic word wrappers .w are exempt while words slide in)
    for (let n = t.el.parentElement; n && n !== stage; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowY === 'hidden') && !n.classList.contains('w')) {
        const a = R(n);
        if (r.x < a.x - 2 || r.y < a.y - 2 || r.x + r.w > a.x + a.w + 2 || r.y + r.h > a.y + a.h + 2) add('WARN', 'clipped', `${label(t.el)} is cut off by ${label(n)}`);
        break;
      }
    }
  }
  // caption box overlap + caption length
  if (cap && effOpacity(cap) > 0.5) {
    const cr = R(cap.firstElementChild || cap);
    for (const t of texts) if (!t.inCap && !t.deco && inter(cr, t.r) > 4) add('ERROR', 'under-caption', `${label(t.el)} is under the caption box`);
    const box = cap.firstElementChild || cap, lh = parseFloat(getComputedStyle(box).lineHeight) || 60;
    if (box.scrollHeight > lh * 2.6 + 50) add('WARN', 'caption-long', `caption "${box.textContent.trim().slice(0, 30)}" runs over 2 lines`);
  }
  // text over text
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.deco || b.deco || a.inCap || b.inCap || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    if (a.scene !== b.scene) continue;                 // outgoing and incoming scenes overlap during a transition
    const ov = inter(a.r, b.r), small = Math.min(a.r.w * a.r.h, b.r.w * b.r.h);
    if (ov > small * 0.15) add('WARN', 'overlap', `${label(a.el)} overlaps ${label(b.el)}`);
  }
  // empty cards
  document.querySelectorAll('#stage .card').forEach(c => {
    if (effOpacity(c) < 0.6) return;
    const hasContent = [...c.querySelectorAll('*')].some(n => {
      const own = [...n.childNodes].some(x => x.nodeType === 3 && x.textContent.trim()) || /^(img|svg|canvas)$/i.test(n.tagName);
      return own && effOpacity(n) > 0.3;
    }) || [...c.childNodes].some(x => x.nodeType === 3 && x.textContent.trim());
    if (!hasContent) add('WARN', 'empty-card', `${label(c)} is visible but nothing in it is`);
  });
  // pen marks on their targets
  const marks = (window.Pen && window.Pen.marks) || [];
  for (const m of marks) {
    const svg = m.svg && m.svg(), p = m.path && m.path();
    if (!svg || !p || effOpacity(p) < 0.3) continue;
    if (parseFloat(p.style.strokeDashoffset || '1') > 0.02) continue;            // only judge finished marks
    const tg = m.targets();
    if (!tg.length) { add('ERROR', 'pen-target', `pen ${m.kind}: target missing`); continue; }
    if (Math.max(...tg.map(effOpacity)) < 0.3) { add('ERROR', 'pen-hidden', `pen ${m.kind} drawn while its target ${label(tg[0])} is invisible`); continue; }
    const rs = tg.map(R), t = { x: Math.min(...rs.map(r => r.x)), y: Math.min(...rs.map(r => r.y)) };
    t.w = Math.max(...rs.map(r => r.x + r.w)) - t.x; t.h = Math.max(...rs.map(r => r.y + r.h)) - t.y;
    const b = R(p);
    if (m.kind === 'circle' || m.kind === 'box') {
      if (b.x > t.x + 3 || b.y > t.y + 3 || b.x + b.w < t.x + t.w - 3 || b.y + b.h < t.y + t.h - 3) add('ERROR', 'pen-off', `pen ${m.kind} does not enclose ${label(tg[0])}`);
    } else if (m.kind === 'strike') {
      if (b.x > t.x + 3 || b.x + b.w < t.x + t.w - 3 || b.y < t.y || b.y + b.h > t.y + t.h) add('ERROR', 'pen-off', `pen strike does not cross all of ${label(tg[0])}`);
    } else if (inter(b, { x: t.x - 40, y: t.y - 40, w: t.w + 120, h: t.h + 80 }) < 1) add('ERROR', 'pen-off', `pen ${m.kind} is away from ${label(tg[0])}`);
  }
  // hand-placed stretched SVG strokes
  document.querySelectorAll('#stage svg[preserveAspectRatio="none"]').forEach(s => {
    if (s.classList.contains('pen-mark') || s.classList.contains('deco') || effOpacity(s) < 0.3) return;
    const stroked = [...s.querySelectorAll('path,line,polyline')].some(e => getComputedStyle(e).stroke !== 'none' && parseFloat(getComputedStyle(e).strokeDashoffset || 0) < 0.98);
    if (stroked) add('ERROR', 'stretched-svg', `${label(s.parentElement)} has a hand-placed stretched SVG stroke — draw it with pen.js so it fits its target`);
  });
  // fonts actually loaded for the visible text
  const seen = new Set();
  for (const t of texts) {
    const cs = getComputedStyle(t.el), fam = cs.fontFamily.split(',')[0].trim().replace(/["']/g, '');
    const key = fam + cs.fontWeight;
    if (seen.has(key) || /^(serif|sans-serif|monospace|cursive|system-ui)$/i.test(fam)) continue;
    seen.add(key);
    const sample = t.el.textContent.trim().slice(0, 8) || 'A';
    if (!document.fonts.check(`${cs.fontWeight} 40px "${fam}"`, sample)) add('ERROR', 'font', `font "${fam}" ${cs.fontWeight} is not loaded (text falls back to another font): ${label(t.el)}`);
  }
  return issues;
}

// ---------------------------------------------------------------- driver
const browser = await chromium.launch();
let errors = 0, warns = 0;
for (const fmt of fmts) {
  const [W, H] = fmt === 'l' ? [1920, 1080] : [1080, 1920];
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const pageErr = [];
  page.on('pageerror', e => pageErr.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') pageErr.push('console error: ' + m.text()); });
  page.on('requestfailed', r => pageErr.push('failed request: ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) pageErr.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(pathToFileURL(pageFile).href + `?f=${fmt}&render=1`);
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
    await document.fonts.ready;
    if ('__ready' in window) while (!window.__ready) await new Promise(r => setTimeout(r, 50));
  });
  const { dur, scenes } = await page.evaluate(() => ({ dur: window.DUR, scenes: (window.SCENES || []).map(s => Array.isArray(s) ? { id: s[0], start: s[1], end: s[2] } : s) }));
  if (!(dur > 0) || !(await page.evaluate(() => typeof window.render === 'function'))) { console.error('ERROR page has no window.DUR / window.render(t)'); process.exit(1); }

  const times = new Set();
  for (let t = 0; t < dur; t += STEP) times.add(+t.toFixed(2));
  const keyTimes = [];
  for (const s of scenes) {
    const end = s.end ?? dur, mid = (s.start + end) / 2;
    [s.start + 0.6, mid, end - 0.25].forEach(t => times.add(+Math.min(dur - 0.04, Math.max(0, t)).toFixed(2)));
    keyTimes.push({ t: +Math.max(s.start, end - 0.3).toFixed(2), label: s.id });
  }
  if (!keyTimes.length) for (let t = 2; t < dur; t += 4) keyTimes.push({ t, label: t + 's' });

  const found = new Map();                          // de-duplicate: same kind+message → list of times
  for (const t of [...times].sort((a, b) => a - b)) {
    await page.evaluate(t => window.render(t), t);
    for (const is of await page.evaluate(probe, fmt)) {
      const key = is.level + '|' + is.kind + '|' + is.msg;
      if (!found.has(key)) found.set(key, { ...is, times: [] });
      found.get(key).times.push(t);
    }
  }
  // determinism: same t → same pixels, whatever was rendered before
  for (const t of [dur * 0.21, dur * 0.53, dur * 0.87].map(x => +x.toFixed(2))) {
    await page.evaluate(t => window.render(t), t); const a = await page.screenshot({ type: 'png' });
    await page.evaluate(t => window.render(t), +(dur - t).toFixed(2));
    await page.evaluate(t => window.render(t), t); const b = await page.screenshot({ type: 'png' });
    if (!a.equals(b)) found.set('det' + t, { level: 'ERROR', kind: 'determinism', msg: 'render(t) gives different frames for the same t (clock, random or CSS animation?)', times: [t] });
  }
  [...new Set(pageErr)].forEach(m => found.set('pe' + m, { level: 'ERROR', kind: 'page', msg: m, times: [] }));

  // contact sheet
  const shots = [];
  for (const k of keyTimes) { await page.evaluate(t => window.render(t), k.t); shots.push({ ...k, buf: await page.screenshot({ type: 'jpeg', quality: 70 }) }); }
  const sheet = path.resolve(sheetTpl.replace('{fmt}', fmt === 'l' ? 'landscape' : 'portrait'));
  fs.mkdirSync(path.dirname(sheet), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(path.dirname(sheet), '.sheet-'));
  shots.forEach((s, i) => fs.writeFileSync(path.join(tmp, `${String(i).padStart(3, '0')}.jpg`), s.buf));
  const cols = Math.min(6, shots.length), tw = fmt === 'l' ? 480 : 300;
  await new Promise(r => spawn('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, '%03d.jpg'),
    '-vf', `scale=${tw}:-1,tile=${cols}x${Math.ceil(shots.length / cols)}:padding=6:color=white`, '-frames:v', '1', sheet], { stdio: 'inherit' }).on('close', r));
  fs.rmSync(tmp, { recursive: true, force: true });

  const list = [...found.values()].sort((a, b) => (a.level > b.level ? 1 : -1));
  const e = list.filter(x => x.level === 'ERROR').length, w = list.length - e;
  errors += e; warns += w;
  console.log(`\n[${name} ${fmt === 'l' ? 'landscape' : 'portrait'}] ${dur}s, ${times.size} moments checked: ${e} error(s), ${w} warning(s)`);
  for (const x of list) {
    const ts = x.times.length ? ` @ ${x.times.slice(0, 4).join(', ')}${x.times.length > 4 ? ` … (${x.times.length}×)` : ''}s` : '';
    console.log(`  ${x.level.padEnd(5)} ${x.kind.padEnd(14)} ${x.msg}${ts}`);
  }
  console.log(`  contact sheet: ${path.relative(process.cwd(), sheet)}  (frames: ${keyTimes.map(k => k.label + '@' + k.t).join(' ')})`);
  await page.close();
}
await browser.close();
console.log(errors ? `\nFAIL: fix the ${errors} error(s) before rendering.` : `\nPASS${warns ? ` (look at the ${warns} warning(s) on the contact sheet)` : ''}.`);
process.exit(errors ? 1 : 0);
