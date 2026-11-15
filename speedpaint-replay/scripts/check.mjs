// speedpaint-replay · check.mjs — proves a replay page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs piece.html [--step .25] [--scale .25] [--out out/]
// 1. loads with no page errors, console errors or failed requests; every stage has items and enough time
// 2. every item, drawn alone, leaves a mark (no zero-length line, no region clipped away to nothing — clips use the
//    VISIBLE part of a region, so a shadow clipped to something that is entirely covered fails here)
// 3. every frame draws without throwing (every --step s); the stylus stays on the canvas card while drawing
// 4. no fill pops in at its first frame; the finished piece covers the card (it is a painting, not a few lines on paper) and is not blown out or black
// 5. every rule (R.check(...)) holds at every sampled t
// 6. every UI character is in the bundled font; deterministic (same t → same pixels, also after seeking elsewhere)
// 7. body check (when the piece has a character: setPose + marks + eyes): the face turns one way, the neck and
//    shoulders are possible, the parts are in order down the head — and out/<name>-body.png is written to look at
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, basename } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <piece.html> [--step .25]'); process.exit(1); }
const step = +opt('step', .25), scale = opt('scale', '.25');
const name = basename(page$) === 'index.html' ? basename(resolve(page$, '..')) : basename(page$).replace(/\.html$/, '');
const outDir = resolve(opt('out', 'out')); mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 540, height: 610 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
  if (errors.length || Date.now() - t0 > 120000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const ok = m => console.log('ok   ' + m);
if (errors.length) fail('loading: ' + errors.join(' | ')); else ok('loads with no errors');

// 1. stages
const info = await page.evaluate(() => window.replayInfo());
const DUR = info.dur;
console.log(`     「${info.title || name}」 ${DUR} s · ` + info.stages.map(g => `${g.name} ${g.n} (${(g.end - g.start).toFixed(1)} s)`).join(' · '));
const thin = info.stages.filter(g => g.n === 0 || g.end - g.start < 1.5);
if (thin.length) fail(`stages with no items or under 1.5 s: ${thin.map(g => g.name).join(', ')} — every stage of the making is shown`);
else ok('all six stages have items and time');
if (info.count.line < 12) fail(`only ${info.count.line} line-art strokes — the line stage is the heart of the replay`);
if (DUR < 12 || DUR > 150) fail(`duration ${DUR} s is outside 12–150 s`);

// 2. items
const empty = await page.evaluate(() => window.itemCheck());
if (empty.length) for (const e of empty.slice(0, 12)) fail(`item ${e.id} (${e.stage} ${e.kind}${e.name ? ' "' + e.name + '"' : ''}${e.clip ? ' clip ' + e.clip : ''}, box ${e.box}) leaves no mark`);
else ok(`every item leaves a mark (${info.items.length} items)`);

// 3–5. frames
const thrown = new Map(), off = [], broken = new Map();
for (let t = 0; t <= DUR; t += step) {
  const r = await page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const st = window.replay._stylus, drawing = t >= window.replay.intro && t < window.replay.drawEnd;
    return { rules: window.runChecks(t), stage: window.stageAt(t), out: drawing && st && st.lift < .5 && (st.p[0] < -5 || st.p[0] > 1005 || st.p[1] < -5 || st.p[1] > 1005) ? st.p.map(Math.round) : null };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.out) off.push(`${t.toFixed(2)} (${r.stage}, ${r.out})`);
  for (const n of r.rules) if (!broken.has(n)) broken.set(n, +t.toFixed(2));
}
if (thrown.size) for (const [m, t] of thrown) fail(`a frame throws at t=${t}: ${m}`); else ok(`every frame draws (every ${step} s)`);
if (off.length) fail(`the stylus draws off the card at t = ${off.slice(0, 5).join(', ')} — an item lies outside the 1000 × 1000 picture`); else ok('the stylus stays on the card while drawing');
if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`); else ok('every rule holds');

// no pops: each big fill is brushed in, not switched on (drawn alone at its first frame's progress vs whole)
const pops = await page.evaluate(() => window.popCheck());
if (pops.length) fail(`fills that pop in instead of being painted: ${pops.slice(0, 5).join(', ')}`); else ok('no fill pops in (each one is painted in by the brush)');
const fin = await page.evaluate(d => {
  window.seek(d); const R = window.replay, a = R.art, g = a.getContext('2d'), px = g.getImageData(0, 0, a.width, a.height).data;
  const paper = R.s.paper.replace('#', ''), pr = parseInt(paper.slice(0, 2), 16), pg = parseInt(paper.slice(2, 4), 16), pb = parseInt(paper.slice(4, 6), 16);
  let n = 0, cov = 0, sum = 0;
  for (let i = 0; i < px.length; i += 4 * 7) { n++; if (Math.abs(px[i] - pr) + Math.abs(px[i + 1] - pg) + Math.abs(px[i + 2] - pb) > 24) cov++; sum += (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; }
  return { cov: cov / n, mean: sum / n };
}, DUR);
if (fin.cov < .6) fail(`the finished piece covers only ${(fin.cov * 100).toFixed(0)} % of the card — paint the background too`);
else ok(`the finished piece covers ${(fin.cov * 100).toFixed(0)} % of the card`);
if (fin.mean < .08 || fin.mean > .92) fail(`the finished piece is ${fin.mean < .08 ? 'nearly black' : 'blown out'} (mean luminance ${fin.mean.toFixed(2)})`);

// 6. glyphs, determinism
const miss = await page.evaluate(() => window.glyphCheck());
if (miss.length) fail(`UI characters missing from the bundled font: ${miss.join(' ')}`); else ok('every UI character is in the bundled font');
const grab = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); }, t);
const tm = +(DUR * .55).toFixed(2), A = await grab(tm); await grab(DUR * .2); await grab(DUR * .9); const B = await grab(tm);
let nd = 0; for (let i = 0; i < A.length; i++) if (Math.abs(A[i] - B[i]) > 2) nd++;
if (nd) fail(`not deterministic: ${nd} values differ at t=${tm} after seeking elsewhere (Math.random? state kept between frames?)`); else ok(`deterministic (t=${tm} twice)`);

// 7. body
const deg = r => r * 180 / Math.PI;
if (!info.pose && !info.eyes.length && !Object.keys(info.marks).length) console.log('     no character (no pose, marks or eyes): body check skipped');
else {
  const p = info.pose, m = info.marks, E = Object.fromEntries(info.eyes.map(e => [e.side, e])), bodyBad = [];
  if (!p) bodyBad.push('the piece draws eyes / marks but sets no pose (s.setPose({ facing, head, torso }))');
  else {
    const h = p.head || {}, tr = p.torso || {}, yaw = h.yaw ?? 0, roll = h.roll ?? 0;
    if (Math.abs(yaw - (tr.yaw ?? 0)) > 90) bodyBad.push(`neck turned ${Math.abs(yaw - (tr.yaw ?? 0))}° from the torso (≤ 90°)`);
    if (Math.abs(roll - (tr.roll ?? 0)) > 45) bodyBad.push(`neck tilted ${Math.abs(roll - (tr.roll ?? 0))}° sideways (≤ 45°)`);
    if (Math.abs(h.pitch ?? 0) > 45) bodyBad.push(`head pitched ${h.pitch}° (≤ 45°)`);
    if (p.facing === 'left' && yaw > -5) bodyBad.push(`facing left but head yaw is ${yaw}° (left is negative)`);
    if (p.facing === 'right' && yaw < 5) bodyBad.push(`facing right but head yaw is ${yaw}° (right is positive)`);
    if (p.facing === 'front' && Math.abs(yaw) > 15) bodyBad.push(`facing front but head yaw is ${yaw}°`);
    if (E.L && E.R) {
      const r = E.L.w / E.R.w;
      if (p.facing === 'left' && r > .96) bodyBad.push(`faces left, so the left eye is the far one and must be narrower (L/R width ${r.toFixed(2)})`);
      if (p.facing === 'right' && r < 1.04) bodyBad.push(`faces right, so the right eye is the far one and must be narrower (L/R width ${r.toFixed(2)})`);
      if (p.facing === 'front' && (r < .85 || r > 1.18)) bodyBad.push(`faces front but the eyes differ in width (L/R ${r.toFixed(2)})`);
      if (E.L.c[0] > E.R.c[0]) bodyBad.push('eye "L" is right of eye "R" (side = which side of the picture the eye is on)');
      const ang = deg(Math.atan2(E.R.c[1] - E.L.c[1], E.R.c[0] - E.L.c[0]));
      if (Math.abs(ang - roll) > 12) bodyBad.push(`the eye line leans ${ang.toFixed(0)}° but the pose says roll ${roll}°`);
    } else if (info.eyes.length === 1) console.log('     one eye drawn (profile or hidden eye): eye checks skipped');
    if (m.nose && E.L && E.R) {
      const mid = (E.L.c[0] + E.R.c[0]) / 2;
      if (p.facing === 'left' && m.nose[0] > mid) bodyBad.push('faces left but the nose is right of the eyes\' midpoint');
      if (p.facing === 'right' && m.nose[0] < mid) bodyBad.push('faces right but the nose is left of the eyes\' midpoint');
    }
    if (m.ear && m.nose) {
      if (p.facing === 'left' && m.ear[0] < m.nose[0]) bodyBad.push('faces left but the ear is in front of the nose (the ear is on the back of the head)');
      if (p.facing === 'right' && m.ear[0] > m.nose[0]) bodyBad.push('faces right but the ear is in front of the nose');
    }
    // order down the head: eyes → nose → mouth → chin, measured along the head's own down axis
    const r = roll * Math.PI / 180, down = q => -q[0] * Math.sin(r) + q[1] * Math.cos(r);
    const eyeY = E.L && E.R ? (down(E.L.c) + down(E.R.c)) / 2 : null, seq = [['eyes', eyeY], ['nose', m.nose && down(m.nose)], ['mouth', m.mouth && down(m.mouth)], ['chin', m.chin && down(m.chin)], ['neck', m.neck && down(m.neck)]].filter(([, v]) => v != null);
    for (let i = 1; i < seq.length; i++) if (seq[i][1] <= seq[i - 1][1]) bodyBad.push(`${seq[i][0]} is not below ${seq[i - 1][0]} along the head`);
    if (m.shoulderL && m.shoulderR) { const a = deg(Math.atan2(m.shoulderR[1] - m.shoulderL[1], m.shoulderR[0] - m.shoulderL[0])); if (Math.abs(a) > 30) bodyBad.push(`the shoulder line leans ${a.toFixed(0)}° (≤ 30°)`); }
  }
  if (bodyBad.length) for (const b of bodyBad) fail('body: ' + b); else ok(`body: the face turns ${info.pose.facing} as one, neck and shoulders possible, parts in order`);
  const sp = await browser.newPage({ viewport: { width: 800, height: 400 } });
  await sp.goto(pathToFileURL(page$).href + '?render=1&scale=.62&sheet=body', { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await sp.evaluate(() => window.__ready === true)) && Date.now() - t0 < 60000;) await new Promise(r => setTimeout(r, 100));
  const png = await sp.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  const f = join(outDir, `${name}-body.png`); writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`     body sheet → ${f} (look at it: line art + marks, finished, mirrored)`);
}

await browser.close();
console.log(bad ? `\n${bad} problem${bad > 1 ? 's' : ''}` : '\nall checks passed');
process.exit(bad ? 1 : 0);
