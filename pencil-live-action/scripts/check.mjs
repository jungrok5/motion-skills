// pencil-live-action · check.mjs — proves a film page (or a cast sheet) and prints `ok` or what is broken, with numbers.
//   node <skill>/scripts/check.mjs film.html [--step .25] [--q "cdn=1"]
//   node <skill>/scripts/check.mjs cast.html
// Film checks: loads clean (no page errors, no 404s) · real scans, not the stand-in plate (a note, not a failure, with --allow-standin)
// · deterministic (the same t twice gives the same pixels) · no blank frames · every drawing draws · the drawing stays
// graphite (lead, tone, paper — colour belongs to the real world) · bodies that can exist (lib/hero.js audits: knees,
// elbows, neck, reach) · planted feet do not slide (> 1.5 px between frames while planted) · the idle breathes (a standing
// hero's head moves over any 1.5 s) · every F.action has an anticipation (≥ .15 s) and a recovery (≥ .2 s) · a held pencil
// does not float (its back end leaves the frame while it is in) · the film's own F.check rules · the score renders.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { serve, rootFor, openFilm, launch } from './_page.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <film.html | cast.html> [--step .25]'); process.exit(1); }
const server = await serve(rootFor(page$, opt('root'))), browser = await launch();
const fails = [], notes = [], F = (m) => fails.push(m), N = (m) => notes.push(m);
const page = await openFilm(browser, server.url(page$) + '?render=1&scale=.25' + (opt('q') ? '&' + opt('q') : ''), { quiet: true });

const isCast = await page.evaluate(() => !!window.castSheet);
if (isCast) {
  const r = await page.evaluate(() => window.castSheet());
  for (const a of r.audit) F(a);
  if (r.views < 8) F(`cast sheet: ${r.views} views (want front, back, 3/4 and profile both ways)`);
  if (!r.motion) F('cast sheet: no motion row (idle loop, a turn on the spot, one big move both ways)');
  else for (const m of r.motion) F(m);
} else {
  const info = await page.evaluate(() => ({ dur: window.DURATION, fps: window.FPS, notes: window.film.plate.notes, colours: window.film.drawnColours(), sketches: window.film.sketches.map(s => ({ name: s.name, at: s.at, end: s.end, n: s.alloc.length })), actions: window.film.actions, beats: window.film.shots.map(s => `${s.name} ${s.start.toFixed(1)}`), hasScore: !!window.film.score, heroes: window.film.heroes.map(h => h.name) }));
  const step = +opt('step', .25), dur = info.dur;
  for (const n of new Set(info.notes)) (/stand-in plate/.test(n) && !args.includes('--allow-standin') ? F : N)(n);
  // the drawing stays graphite
  const bad = info.colours.filter(c => !['lead', 'spot', 'paper'].includes(c)); if (bad.length) F(`the drawing uses colour ${bad.join(', ')} — keep drawings graphite (lead / tone / paper); colour belongs to the real world`);
  for (const s of info.sketches) if (!s.n) F(`drawing "${s.name}" has no strokes`);
  // determinism and blank frames
  const hashAt = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 64) { const v = d[i] + d[i + 1] + d[i + 2]; s += v; s2 += v * v; n++; } return { sum: [...d.filter((_, i) => i % 97 === 0)].join(','), sd: Math.sqrt(s2 / n - (s / n) ** 2) }; }, t);
  for (const t of [dur * .3, dur * .7]) { const a = await hashAt(t); await hashAt(t * .5); const b = await hashAt(t); if (createHash('md5').update(a.sum).digest('hex') !== createHash('md5').update(b.sum).digest('hex')) F(`not deterministic at t=${t.toFixed(2)} (seek there twice: different pixels) — no Math.random / Date / state between frames`); }
  // per-frame scan: rules, audits, feet, pencil, idle
  const scan = await page.evaluate(({ step, dur, fps }) => {
    const f = window.film, out = { rules: {}, audits: {}, slide: [], float: [], blank: [], idle: [] };
    const frames = []; for (let t = 0; t < dur; t += 1 / fps) frames.push(+t.toFixed(4));
    let prevFeet = null;
    for (const t of frames) {
      const feet = f.feetAt(t), key = x => `${x.hero}/${x.foot}`;
      if (prevFeet) for (const ft of feet) { const p = prevFeet.find(q => key(q) === key(ft)); if (!p || !ft.planted || !p.planted) continue;
        const d = Math.hypot(ft.world[0] - p.world[0], ft.world[1] - p.world[1], ft.world[2] - p.world[2]), px = d * f.pxPerM(ft.world); if (px > 1.5) out.slide.push([t, key(ft), +px.toFixed(1)]); }
      prevFeet = feet;
      const pen = f.pencilPx(t); if (pen && pen.back) { const b = pen.back, inside = b[0] > 20 && b[0] < 1900 && b[1] > 20 && b[1] < 1060; if (inside) out.float.push([t, b.map(Math.round)]); }
    }
    for (let t = 0; t < dur; t += step) {
      const broken = window.runChecks(t); for (const b of broken) (b.startsWith('body:') ? out.audits : out.rules)[b] = ((b.startsWith('body:') ? out.audits : out.rules)[b] || []).concat(+t.toFixed(2));
      const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 128) { const v = d[i] + d[i + 1] + d[i + 2]; s += v; s2 += v * v; n++; }
      if (Math.sqrt(s2 / n - (s / n) ** 2) < 4 && t > .5 && t < dur - .9) out.blank.push(+t.toFixed(2));
    }
    // the idle breathes: windows where both feet are planted for 1.5 s → the head must move (world) by > 0.3 % of the height
    for (const h of f.heroes) { let run = []; for (const t of frames) { const w = f.heroWorld(h, t); const still = w && w.tr.planted && w.tr.planted.L && w.tr.planted.R;
      if (still) run.push([t, w.head]); if ((!still || t === frames[frames.length - 1]) && run.length) { if (run[run.length - 1][0] - run[0][0] >= 1.5) { let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const [, p] of run) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
        const mv = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / h.height; if (mv < .003) out.idle.push([h.name, run[0][0], run[run.length - 1][0], +(mv * 100).toFixed(2)]); } run = []; } } }
    return out;
  }, { step, dur, fps: info.fps });
  for (const [r, ts] of Object.entries(scan.rules)) F(`rule "${r}" broken at ${ts.slice(0, 6).join(', ')}${ts.length > 6 ? ` … (${ts.length}×)` : ''} s`);
  for (const [a, ts] of Object.entries(scan.audits)) F(`${a} at ${ts.slice(0, 6).join(', ')}${ts.length > 6 ? ` … (${ts.length}×)` : ''} s`);
  if (scan.slide.length) { const worst = scan.slide.reduce((a, b) => b[2] > a[2] ? b : a); F(`planted feet slide: ${scan.slide.length} frames over 1.5 px (worst ${worst[2]} px, ${worst[1]} at ${worst[0].toFixed(2)} s) — step the feet (lib/gait.js), never move a planted one`); }
  if (scan.float.length > 2) F(`the held pencil floats: its back end is in frame for ${scan.float.length} frames (first at ${scan.float[0][0].toFixed(2)} s, ${scan.float[0][1].join(',')}) — hold it so the hand stays out of frame (pencil({ hold }), the camera)`);
  if (scan.blank.length) F(`blank-looking frames at ${scan.blank.slice(0, 6).join(', ')} s`);
  for (const [h, a, b, mv] of scan.idle) F(`${h} stands dead still ${a.toFixed(1)}–${b.toFixed(1)} s (head moves ${mv} % of his height) — every idle breathes`);
  for (const a of info.actions) { const an = a.anticipation ? a.anticipation[1] - a.anticipation[0] : 0, rc = a.recovery ? a.recovery[1] - a.recovery[0] : 0;
    if (an < .15) F(`action "${a.name}": anticipation ${an.toFixed(2)} s (want ≥ .15 s — gather before the move)`); if (rc < .2) F(`action "${a.name}": recovery ${rc.toFixed(2)} s (want ≥ .2 s — settle after it)`); }
  if (!info.actions.length && info.heroes.length) F('no F.action declared: name the big moves with their anticipation / action / recovery');
  if (info.hasScore) { const ok = await page.evaluate(() => { const [L] = window.film.renderScore(window.film.score, 8000, Math.min(6, window.DURATION)); let pk = 0, nan = false; for (const v of L) { if (!Number.isFinite(v)) nan = true; pk = Math.max(pk, Math.abs(v)); } return !nan && pk > .01; }); if (!ok) F('the score does not render (silent or NaN)'); }
  else N('no score');
  console.log(`beats: ${info.beats.join(' · ')}`);
  console.log(`drawings: ${info.sketches.map(s => `${s.name} ${s.at.toFixed(1)}–${s.end.toFixed(1)}`).join(' · ')}`);
  console.log(`feet: ${scan.slide.length} sliding frames · pencil: ${scan.float.length} floating frames · idle: ${scan.idle.length} dead windows`);
}
for (const e of new Set(page.errors)) F('page: ' + e);
for (const n of notes) console.log('note:', n);
await browser.close(); server.close();
if (fails.length) { for (const f of fails) console.log('FAIL', f); process.exit(1); }
console.log('ok');
