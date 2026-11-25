// nested-world-loop · check.mjs — the gates. Ends with "all checks passed" or exits 1.
//   node <skill>/scripts/check.mjs my-loop [--scale .5] [--quick]
// structure   page loads with no errors; the contract (seek, DURATION, FPS, filmInfo, __nwl); ≥ 2 worlds or one self-holding
//             world; the ring zooms (one loop multiplies scale by ≤ 1/8 — worlds WITHIN worlds, not a tour)
// code-only   nothing fetched but the page, its scripts and three.js — no images, models, HDRIs, fonts, video, audio
// pure        the same t renders the same picture after other frames
// loop        frame(DURATION) == frame(0) (every animation closes on the loop) and the wrap is no bigger a step than
//             any other frame step
// hand-offs   each seam renders the same picture whether the frame is drawn from the outer world or the inner one —
//             lights, fog, shadows and masks rescale without a pop — and the step across it is an ordinary frame step
// camera      perceived speed (|move| / distance to what you look at) never stalls (< 30 % of median) or rushes
//             (> 2.6 × median), changes smoothly, and the look target stays in front of the camera
// picture     every world, mid-way and at its seam, is a picture: not crushed or clipped, has a spread of tones and
//             detail (few flat tiles)
// brief       BRIEF.md beside the page, with the ring, the seams and a filled stills review
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { opt, flag, pagePath, launch, open, grab, measureInPage, diff } from './_lib.mjs';

const file = pagePath('usage: check.mjs <loop folder | index.html> [--scale .5] [--quick]');
const scale = opt('scale', '.4'), quick = flag('quick');
const fails = [], notes = [];
const ok = (cond, label, detail = '') => { (cond ? notes : fails).push(`${cond ? '✓' : '✗'} ${label}${detail ? '  — ' + detail : ''}`); return cond; };
const browser = await launch();
let page, requests;
try { ({ page, requests } = await open(browser, file, { scale })); }
catch (e) { console.log('✗ page did not load — ' + e.message); await browser.close(); process.exit(1); }
const measure = async (t, off = 0) => { await grab(page, t, 'image/png', 1, off); return page.evaluate(measureInPage, {}); };

// structure
const info = await page.evaluate(() => ({ D: window.DURATION, F: window.FPS, seek: typeof window.seek, nwl: !!window.__nwl, info: window.filmInfo && window.filmInfo() }));
ok(info.seek === 'function' && info.nwl && info.info && info.D > 0 && info.F > 0, 'contract', `DURATION ${info.D} s, FPS ${info.F}`);
const W = info.info.worlds, D = info.D, F = info.F;
ok(W.length >= 1, 'ring', `${W.length} worlds: ${W.map(w => `${w.id} (${w.duration}s, portal ×${w.scale}${w.aperture ? ', aperture' : ''})`).join(' → ')} → back to ${W[0].id}`);
const zoom = info.info.loopZoom;
ok(zoom <= 1 / 8 || zoom >= 8, 'the ring zooms', `one loop scales by ×${zoom.toPrecision(3)} (1/${(1 / zoom).toFixed(0)})`);
ok(D >= 8 && D <= 90, 'length', `${D} s`);

// code-only
const bad = requests.filter(u => !/^(file|data|blob):/.test(u) || /\.(png|jpe?g|webp|gif|avif|hdr|exr|ktx2?|glb|gltf|obj|fbx|bin|mp4|webm|mov|wav|mp3|ogg|ttf|otf|woff2?)(\?|$)/i.test(u));
ok(!bad.length, 'code-only', bad.length ? bad.slice(0, 5).join(', ') : `${requests.length} requests, all page / script`);

// pure
const tA = +(D * .37).toFixed(3);
const a1 = await measure(tA); await measure(D * .8); await measure(D * .1); const a2 = await measure(tA);
ok(diff(a1.thumb, a2.thumb) < .3, 'pure', `same t after other frames: Δ ${diff(a1.thumb, a2.thumb).toFixed(3)}`);

// frame steps: the typical step, to judge the seams against
const steps = [];
for (const f of [.13, .29, .46, .61, .78, .92]) { const t = D * f, m0 = await measure(t), m1 = await measure(t + 1 / F); steps.push(diff(m0.thumb, m1.thumb)); }
steps.sort((a, b) => a - b); const stepMed = steps[Math.floor(steps.length / 2)], stepMax = steps[steps.length - 1];
notes.push(`· ordinary frame step: median Δ ${stepMed.toFixed(2)}, max ${stepMax.toFixed(2)} (of 255)`);
const allowStep = Math.max(stepMax * 1.6, stepMed * 3, 2.5);

// loop
const z0 = await measure(0), zD = await measure(D), zL = await measure(D - 1 / F);
ok(diff(z0.thumb, zD.thumb) < 1, 'loop closes', `frame(${D}) vs frame(0): Δ ${diff(z0.thumb, zD.thumb).toFixed(2)} (every animation must make whole cycles per loop — ctx.cycle / ctx.angle)`);
ok(diff(zL.thumb, z0.thumb) <= allowStep, 'loop wrap is an ordinary step', `last → first frame Δ ${diff(zL.thumb, z0.thumb).toFixed(2)} (allowed ${allowStep.toFixed(2)})`);

// hand-offs
for (let i = 0; i < W.length; i++) {
  const s = W[i].start, name = `${W[(i - 1 + W.length) % W.length].id} → ${W[i].id}`;
  const tIn = s + .5 / F, tOut = (s === 0 ? D : s) - .5 / F;
  const inA = await measure(tIn), inB = await measure(tIn, -1);
  const outA = await measure(tOut), outB = await measure(tOut, +1);
  const dIn = diff(inA.thumb, inB.thumb), dOut = diff(outA.thumb, outB.thumb);
  ok(dIn < 2.5 && dOut < 2.5, `hand-off ${name} is invisible`, `same moment drawn from either world: Δ ${dOut.toFixed(2)} before, ${dIn.toFixed(2)} after (< 2.5)`);
  const step = diff(outA.thumb, inA.thumb) * (1 / F) / (1 / F);
  ok(step <= allowStep, `hand-off ${name} is an ordinary step`, `Δ ${step.toFixed(2)} across the seam (allowed ${allowStep.toFixed(2)})`);
}

// camera
const cams = await page.evaluate(([D, n]) => Array.from({ length: n }, (_, i) => window.__nwl.cam(D * i / n)), [D, Math.round(D * 12)]);
const sp = cams.map(c => c.speed), sorted = sp.slice().sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
const mn = sorted[0], mx = sorted[sorted.length - 1];
let jump = 0; for (let i = 0; i < sp.length; i++) jump = Math.max(jump, Math.abs(sp[(i + 1) % sp.length] - sp[i]) / med);
const tAt = i => (D * i / cams.length).toFixed(1);
ok(mn >= med * .3, 'camera never stalls', `perceived speed min ${(mn / med * 100).toFixed(0)} % of median (at ${tAt(sp.indexOf(mn))} s) — keep ≥ 30 %: one continuous move`);
ok(mx <= med * 2.6, 'camera never rushes', `max ${(mx / med).toFixed(2)} × median (at ${tAt(sp.indexOf(mx))} s) — keep ≤ 2.6 ×`);
ok(jump <= .2, 'speed changes smoothly', `largest change between samples ${(jump * 100).toFixed(0)} % of median`);
ok(cams.every(c => c.sigma > 0 && isFinite(c.sigma)), 'look target in front', 'distance to the look target > 0 everywhere');

// picture
if (!quick) for (let i = 0; i < W.length; i++) {
  for (const [lab, t] of [['mid', W[i].start + W[i].duration * .5], ['entry', W[i].start + .2]]) {
    const m = await measure(t), spread = m.p95 - m.p05;
    const good = m.p50 > .025 && m.p50 < .8 && m.clip < .02 && spread > .12 && m.flat < .55;
    ok(good, `picture · ${W[i].id} ${lab} (${t.toFixed(1)} s)`, `median ${(m.p50 * 255).toFixed(0)}, spread ${(spread * 255).toFixed(0)}, clipped ${(m.clip * 100).toFixed(1)} %, black ${(m.black * 100).toFixed(0)} %, flat tiles ${(m.flat * 100).toFixed(0)} %`);
  }
}

// brief
const brief = join(dirname(file), 'BRIEF.md');
if (ok(existsSync(brief), 'BRIEF.md beside the page')) {
  const b = readFileSync(brief, 'utf8');
  const need = ['## The ring', '## Seams', '## Stills review'].filter(h => !b.includes(h));
  ok(!need.length, 'brief has the ring, the seams and the review', need.length ? 'missing: ' + need.join(', ') : '');
  const review = (b.split('## Stills review')[1] || '');
  ok(review.length > 0 && !/TODO|_\?_|\| *\? *\|/.test(review), 'stills review filled', /TODO|_\?_|\| *\? *\|/.test(review) ? 'TODO / ? left in the review' : '');
}

await browser.close();
console.log(notes.join('\n'));
if (fails.length) { console.log(fails.join('\n')); console.log(`\n${fails.length} check${fails.length > 1 ? 's' : ''} failed`); process.exit(1); }
console.log('\nall checks passed');
