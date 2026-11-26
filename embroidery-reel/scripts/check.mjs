// embroidery-reel · check.mjs — the gates. Ends with "all checks passed" or exits 1. Numbers, not just ✓ / ✗.
//   node <skill>/scripts/check.mjs my-reel [--scale .4]
// structure  page loads with no errors; the contract (seek, DURATION, FPS, SIZE, filmInfo, __reel); every font face loaded
// code-only  nothing fetched but the page, its scripts, three.js and the bundled fonts — no images, models, video, audio
// pure       the same t renders the same picture after other frames
// designed   every item has its own patch (≥ 3 shapes, ≥ 2 thread colours, no two patches alike) and a title
// legible    each layer of a patch stands apart from the one under it; the title thread reads on the cloth
// stitched   every patch, title and the card's underline go from nothing to fully sewn inside their window
// framing    when each tag has landed: patch, title and tag inside the frame, the patch ≥ 28 % of the frame width,
//            the tag text and the title big enough to read on a phone; the tag rests ≥ .35 s before the camera leaves
// needle     planted while through the cloth (no slide), an anticipation rise before every plunge, no teleport
// camera     never jumps, never freezes during a hold (every idle breathes), speed changes smoothly
// outro      the cord is couched end to end, the end card fills the last frame and its list is readable
// picture    tones spread, nothing crushed or clipped, detail everywhere (few flat tiles)
// brief      BRIEF.md beside the page, with every item designed and a filled stills review
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { opt, pagePath, launch, open, grab, measureInPage, diff } from './_lib.mjs';

const file = pagePath('usage: check.mjs <reel folder | index.html> [--scale .4]');
const scale = opt('scale', '.4');
const fails = [], notes = [];
const ok = (cond, label, detail = '') => { (cond ? notes : fails).push(`${cond ? '✓' : '✗'} ${label}${detail ? '  — ' + detail : ''}`); return cond; };
const browser = await launch();
let page, requests;
try { ({ page, requests } = await open(browser, file, { scale })); }
catch (e) { console.log('✗ page did not load — ' + e.message); await browser.close(); process.exit(1); }
const measure = async t => { await grab(page, t, 'image/png', 1); return page.evaluate(measureInPage, {}); };
const ev = (fn, arg) => page.evaluate(fn, arg);

// structure
const S = await ev(() => ({ D: window.DURATION, F: window.FPS, size: window.SIZE, seek: typeof window.seek, reel: !!window.__reel, info: window.filmInfo && window.filmInfo(), fonts: window.__reel && window.__reel.fontsOk() }));
ok(S.seek === 'function' && S.reel && S.info && S.D > 0 && S.F > 0 && S.size, 'contract', `DURATION ${S.D} s, FPS ${S.F}, ${S.size.join('×')}`);
ok(S.fonts, 'fonts', S.fonts ? 'every bundled face loaded' : 'a FontFace did not load (lib/fonts/ missing?)');
const I = S.info, D = S.D, F = S.F;
ok(I.n >= 2 && I.n <= 24, 'items', `${I.n} items on a ${I.cols}×${I.rows} grid, ${I.props.length} props (${[...new Set(I.props)].join(', ')})`);

// code-only
const bad = requests.filter(u => !/^(file|data|blob):/.test(u) || (/\.(png|jpe?g|webp|gif|avif|hdr|exr|ktx2?|glb|gltf|obj|fbx|bin|mp4|webm|mov|wav|mp3|ogg|ttf|otf)(\?|$)/i.test(u)) || (/\.woff2?(\?|$)/i.test(u) && !/\/lib\/fonts\//.test(u)));
ok(!bad.length, 'code-only', bad.length ? bad.slice(0, 5).join(', ') : `${requests.length} requests: page, scripts, three.js, bundled fonts`);

// pure
const tA = +(D * .37).toFixed(3);
const a1 = await measure(tA); await measure(D * .8); await measure(D * .1); const a2 = await measure(tA);
ok(diff(a1.thumb, a2.thumb) < .4, 'pure', `same t after other frames: Δ ${diff(a1.thumb, a2.thumb).toFixed(3)}`);

// designed
const sigs = I.items.map(it => it.palette.join('|') + '/' + it.layers);
const dup = sigs.filter((s, i) => sigs.indexOf(s) !== i).length;
const thin = I.items.filter(it => it.layers < 3 || it.palette.length < 2).map(it => it.title);
ok(!thin.length && !dup && I.items.every(it => String(it.title || '').trim()), 'designed per item', thin.length ? `too plain (need ≥ 3 shapes, ≥ 2 threads): ${thin.join(', ')}` : dup ? `${dup} patches share palette + layer count — design each one` : I.items.map(it => `${it.title} (${it.layers} shapes, ${it.palette.length} threads, ${it.stitches} stitches)`).join(' · '));

// legible
const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const L = c => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; const [r, g, b] = hex(c); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const CR = (a, b) => (Math.max(L(a), L(b)) + .05) / (Math.min(L(a), L(b)) + .05);
const lay = await ev(() => window.__reel.info().items.map((_, i) => i));
void lay;
let worstPair = { cr: 99 };
I.items.forEach(it => { const p = it.palette; for (let k = 1; k < p.length; k++) { const cr = Math.max(...p.slice(0, k).map(q => CR(q, p[k]))); if (cr < worstPair.cr) worstPair = { cr, it: it.title, a: p[k] }; } });
ok(worstPair.cr >= 1.35, 'patch layers stand apart', `weakest: ${worstPair.it || '—'} ${worstPair.a || ''} vs the threads under it, contrast ${worstPair.cr.toFixed(2)} (≥ 1.35)`);
const tc = Math.min(...I.items.map(it => CR(it.thread, I.cloth)));
ok(tc >= 3, 'title thread on the cloth', `contrast ${tc.toFixed(2)} (≥ 3)`);

// stitched
const P = await ev(() => window.__reel.progress(0));
const badS = [];
for (const e of P) {
  const p0 = (await ev(t => window.__reel.progress(t), Math.max(0, e.s0 - .01))).find(x => x.s0 === e.s0 && x.kind === e.kind && x.item === e.item);
  const p1 = (await ev(t => window.__reel.progress(t), e.s1 + .01)).find(x => x.s0 === e.s0 && x.kind === e.kind && x.item === e.item);
  if (p0.p > 0 || p1.p < 1 || e.s1 > D) badS.push(`${e.kind}${e.item != null ? ' ' + e.item : ''} (${p0.p.toFixed(2)} → ${p1.p.toFixed(2)})`);
}
ok(!badS.length, 'stitched', badS.length ? badS.join(', ') : `${P.length} elements each sewn from 0 to 1 inside its window`);

// framing
const fr = [];
let minPatch = 1, minTag = 1e9, minTitle = 1e9, outside = [], shortRest = [];
for (let i = 0; i < I.n; i++) {
  const it = I.items[i], t = Math.min(it.leave - .02, it.Dl + .2), f = await ev(([i, t]) => window.__reel.frameOf(i, t), [i, t]);
  fr.push(f);
  const inb = b => b[0] >= .015 && b[1] >= .015 && b[2] <= .985 && b[3] <= .985;
  if (!inb(f.patch) || !inb(f.title) || !inb(f.tag)) outside.push(`${it.title} (${['patch', 'title', 'tag'].filter(k => !inb(f[k])).join('/')})`);
  minPatch = Math.min(minPatch, f.patchW); minTag = Math.min(minTag, f.tagTextPx); minTitle = Math.min(minTitle, f.titleCapPx);
  if (it.leave - it.Dl < .35) shortRest.push(`${it.title} ${(it.leave - it.Dl).toFixed(2)} s`);
}
ok(!outside.length, 'each item in frame', outside.length ? `cut off: ${outside.join(', ')}` : 'patch, title and tag inside the frame when the tag lands');
ok(minPatch >= .28, 'patch size', `smallest patch ${(minPatch * 100).toFixed(0)} % of the frame width (≥ 28 %)`);
ok(minTag >= 14, 'tag text readable', `smallest tag cap height ${minTag.toFixed(1)} px at ${S.size[0]} px wide (≥ 14)`);
ok(minTitle >= 28, 'title readable', `smallest title cap height ${minTitle.toFixed(1)} px (≥ 28)`);
ok(!shortRest.length, 'tag rests before the camera leaves', shortRest.length ? shortRest.join(', ') : `≥ .35 s on every item`);

// needle
const nd = await ev(([D, F]) => { const out = []; for (let f = 0; f <= Math.round(D * F); f++) { const n = window.__reel.needleAt(f / F), c = window.__reel.camAt(f / F); n.camD = Math.hypot(...n.tip.map((v, j) => v - c.pos[j])); out.push(n); } return out; }, [D, F]);
let slide = 0, plantedN = 0, maxStep = 0, stepAt = 0, rises = 0, plunges = 0;
for (let k = 1; k < nd.length; k++) {
  const a = nd[k - 1], b = nd[k], step = Math.hypot(b.tip[0] - a.tip[0], b.tip[1] - a.tip[1], b.tip[2] - a.tip[2]) / b.camD; if (step > maxStep) { maxStep = step; stepAt = k / F; }
  if (a.planted && b.planted && b.phase > a.phase) { plantedN++; slide = Math.max(slide, Math.hypot(b.tip[0] - a.tip[0], b.tip[2] - a.tip[2])); }
}
const ant = await ev(() => { let n = 0, good = 0; for (const e of window.__reel.progress(0)) { const per = 1 / e.rate, nc = Math.round((e.s1 - e.s0) * e.rate); for (let k = 0; k < nc; k++) { const base = e.s0 + k * per, y1 = window.__reel.needleAt(base + per * .3).tip[1], y2 = window.__reel.needleAt(base + per * .44).tip[1], y3 = window.__reel.needleAt(base + per * .58).tip[1]; n++; if (y2 > y1 && y3 < y2) good++; } } return { n, good }; });
rises = ant.good; plunges = ant.n;
ok(slide < 1e-4 && plantedN > 0, 'needle planted', `${plantedN} planted frame pairs, max slide ${slide.toExponential(1)} units`);
ok(plunges > 0 && rises === plunges, 'anticipation before every plunge', `${rises}/${plunges} punches rise before they plunge`);
ok(maxStep < .12, 'needle never teleports', `largest step ${maxStep.toFixed(3)} × its distance to the lens per frame, at ${stepAt.toFixed(2)} s (< .12)`);

// camera
const cam = await ev(([D, F]) => { const o = []; for (let f = 0; f <= Math.round(D * F); f++) o.push(window.__reel.camAt(f / F)); return o; }, [D, F]);
let camMax = 0, frozen = 0, accMax = 0, accAt = 0, camAt = 0, run = 0, runMax = 0; const sp = [];
for (let k = 1; k < cam.length; k++) {
  const a = cam[k - 1].pos, b = cam[k].pos, d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), tg = Math.hypot(...cam[k].tgt.map((v, j) => v - cam[k - 1].tgt[j]));
  const dist = Math.hypot(...cam[k].pos.map((v, j) => v - cam[k].tgt[j])), pd = d / dist;
  sp.push(d); if (pd > camMax) { camMax = pd; camAt = k / F; }
  if (d + tg < 2e-5) { run++; runMax = Math.max(runMax, run); } else run = 0;
}
// a kink is a one-frame spike in the change of speed, against its neighbours (a fast but smooth dolly is fine)
const dv = sp.map((v, k) => k ? Math.abs(v - sp[k - 1]) : 0);
for (let k = 2; k < dv.length - 1; k++) { const spike = dv[k] - (dv[k - 1] + dv[k + 1]) / 2; if (spike > accMax) { accMax = spike; accAt = k / F; } }
frozen = runMax / F;
ok(camMax < .09, 'camera never jumps', `largest move ${camMax.toFixed(3)} × the distance to what it looks at, per frame (at ${camAt.toFixed(2)} s; < .09)`);
ok(frozen < .3, 'camera breathes', `longest still stretch ${frozen.toFixed(2)} s (< .3)`);
ok(accMax < .006, 'camera speed changes smoothly', `largest one-frame spike in acceleration ${accMax.toFixed(4)} at ${accAt.toFixed(2)} s (< .006)`);

// outro
if (I.outro) {
  const cf = await ev(t => window.__reel.cardFrame(t), D - .02);
  const inb = cf.box[0] >= .01 && cf.box[1] >= .01 && cf.box[2] <= .99 && cf.box[3] <= .99;
  ok(inb && (cf.box[3] - cf.box[1]) > .7, 'end card', `fills ${((cf.box[3] - cf.box[1]) * 100).toFixed(0)} % of the height, list cap ${cf.listPx.toFixed(1)} px`);
  ok(cf.listPx >= 13, 'end card list readable', `${cf.listPx.toFixed(1)} px (≥ 13)`);
  ok(I.outro.c1 < I.outro.l1 && I.outro.ul[1] < D, 'outro order', `cord ${I.outro.c0.toFixed(1)}–${I.outro.c1.toFixed(1)} s, card landed ${I.outro.l1.toFixed(1)} s, underline sewn by ${I.outro.ul[1].toFixed(1)} s, end ${D} s`);
}

// picture
const pics = [];
for (const t of [I.items[0].Dl + .1, I.items[Math.floor(I.n / 2)].A + .3, I.items[I.n - 1].Dl + .1, D - .1]) { const m = await measure(t); pics.push({ t, ...m }); }
const worst = pics.reduce((w, m) => (m.p95 - m.p05) < (w.p95 - w.p05) ? m : w, pics[0]);
ok(pics.every(m => m.p05 > .03 && m.p95 < .985 && m.clip < .01 && m.flat < .55 && m.p95 - m.p05 > .18), 'picture', pics.map(m => `${m.t.toFixed(1)}s: ${(m.p05 * 100).toFixed(0)}–${(m.p95 * 100).toFixed(0)} %, clip ${(m.clip * 100).toFixed(2)} %, flat ${(m.flat * 100).toFixed(0)} %`).join(' · ') + `  (weakest spread at ${worst.t.toFixed(1)} s)`);

// brief
const bp = join(dirname(file), 'BRIEF.md');
if (ok(existsSync(bp), 'brief', existsSync(bp) ? 'BRIEF.md found' : 'write BRIEF.md beside index.html (references/BRIEF.md)')) {
  const b = readFileSync(bp, 'utf8'), missing = I.items.filter(it => !b.includes(it.title)).map(it => it.title);
  const review = b.split(/^##\s*Stills review/mi)[1] || '';
  ok(!missing.length, 'brief covers every item', missing.length ? `not in BRIEF.md: ${missing.join(', ')}` : `${I.n} items designed on paper`);
  ok(review.trim().length > 80 && !/__|TODO|TBD/.test(b), 'stills review filled', review.trim().length > 80 ? 'filled' : 'fill "## Stills review" from rendered sheets (render.mjs --items)');
}

await browser.close();
console.log(notes.join('\n')); if (fails.length) console.log(fails.join('\n'));
console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
