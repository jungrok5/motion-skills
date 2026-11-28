// latte-art-pour · check.mjs — the gates. Run from the project's parent:
//   node <skill>/scripts/check.mjs my-film            (ends "all checks passed", or exits 1 with what failed)
// Options: --no-brief (skip the brief row while you are still designing)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flag, pagePath, launch, open, grab } from './_lib.mjs';
import { synth } from './audio.mjs';

const file = pagePath('usage: check.mjs <film folder | index.html> [--no-brief]');
const dir = dirname(file), skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const row = (name, ok, msg) => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(13)} ${msg}`); };
const f2 = v => (+v).toFixed(2), f3 = v => (+v).toFixed(3);

// ── static: the film's source ──
const src = existsSync(join(dir, 'film.js')) ? readFileSync(join(dir, 'film.js'), 'utf8') : '';
row('source', !!src, src ? 'film.js found' : 'no film.js next to index.html');
const banned = [/Math\.random/, /Date\.now|new Date/, /performance\.now/, /setTimeout|setInterval/].filter(r => r.test(src));
const fetches = [/fetch\(/, /XMLHttpRequest/, /new Image\(/, /<img/, /import\s*\(\s*['"]https?:/, /from\s+['"]https?:/, /\.(png|jpe?g|gif|webp|mp4|webm|glb|gltf|wav|mp3)['"]/i].filter(r => r.test(src));
row('code only', !fetches.length, fetches.length ? `film.js loads media or fetches: ${fetches.join(' ')}` : 'no images, video, audio, models or fetches in film.js');
row('pure source', !banned.length, banned.length ? `film.js uses ${banned.join(' ')} (everything must be a function of t and the seed)` : 'no Math.random, Date, timers');
const strayMedia = []; const walk = d => { for (const f of readdirSync(d)) { if (['out', 'lib', 'node_modules', 'ref'].includes(f)) continue; const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(png|jpe?g|gif|webp|mp4|mov|webm|wav|mp3|glb|gltf)$/i.test(f)) strayMedia.push(relative(dir, p)); } };
walk(dir);
row('no media', !strayMedia.length, strayMedia.length ? `media files in the project (renders belong in out/): ${strayMedia.slice(0, 4).join(', ')}` : 'no images, video or audio files beside the film');

const browser = await launch();
const { page, errors, requests } = await open(browser, file, {});
const info = await page.evaluate(() => window.filmInfo());
const fx = (fn, ...a) => page.evaluate(([fn, a]) => window.__film[fn](...a), [fn, a]);
const lay = await page.evaluate(() => window.__film.layout), U = lay.W / 1080 > lay.H / 1080 ? lay.H / 1080 : lay.W / 1080;

// ── contract ──
const contract = await page.evaluate(() => ['seek', 'DURATION', 'FPS', 'SIZE', 'filmInfo', '__film'].filter(k => window[k] === undefined));
row('contract', !contract.length, contract.length ? `missing ${contract.join(', ')}` : `seek · DURATION ${info.duration} s · FPS ${await page.evaluate(() => FPS)} · SIZE ${lay.W}×${lay.H} · ${info.layout}`);
row('fonts', await page.evaluate(() => window.__film.fontsOk), 'bundled Source Serif 4, Nanum Myeongjo, Inter, Noto Sans KR loaded');
const outside = requests.filter(u => !u.startsWith('file:') && !u.startsWith('data:'));
const media = requests.filter(u => /\.(png|jpe?g|gif|webp|mp4|webm|glb|gltf|wav|mp3|ogg)(\?|$)/i.test(u));
row('no network', !outside.length && !media.length, outside.length ? `requests leave the page: ${outside.slice(0, 3).join(' ')}` : media.length ? `loads media: ${media.slice(0, 3).join(' ')}` : `${requests.length} local requests (html, js, fonts)`);
row('length', info.duration >= 8 && info.duration <= 45, `${f2(info.duration)} s (8–45: a pour reads in 8–20 s; past 45 nobody watches a cup)`);

// ── pure: the same t gives the same frame, whatever was seeked before ──
{ const t = +(info.pourEnd - .7).toFixed(3), a = await grab(page, t); await grab(page, info.duration - .1); await grab(page, 1.2); const b = await grab(page, t);
  const tm = +((info.steps[1]?.t0 ?? info.intro) + .9).toFixed(3), c = await grab(page, tm); await grab(page, info.duration - .2); const d = await grab(page, tm);
  row('pure', a === b && c === d, a === b && c === d ? `t=${t} and t=${tm} render identically after seeking away and back` : 'a frame differs on the second render — something depends on order or state'); }

// ── the score ──
const S = 60, NS = Math.floor(info.duration * S);
const track = await page.evaluate(([NS, S]) => { const o = []; for (let k = 0; k <= NS; k++) { const p = window.__film.at(k / S); o.push([p.x, p.y, p.h, p.q, p.enter, p.pin ? +p.pin.on : 0, p.pin ? p.pin.x : 0, p.pin ? p.pin.y : 0, p.move]); } return o; }, [NS, S]);
const kinds = new Set(info.moves.map(m => m.do));
row('steps', info.steps.length >= 3 && info.steps.length <= 7, `${info.steps.length} steps on screen (3–7): ${info.steps.map(s => `"${s.label}"`).join(' · ')}`);
row('figure', kinds.has('drop') && (kinds.has('pour') || kinds.has('wiggle')) && (kinds.has('fill')), `moves: ${[...kinds].join(', ')}${kinds.has('fill') ? '' : ' — no fill (high pour first sets the base)'}${kinds.has('drop') ? '' : ' — nothing ever drops low, nothing white will appear'}`);
// the spout stays over the liquid while milk runs; low pours stay off the wall
let outP = 0, outLow = 0, hBad = 0;
for (const [x, y, h, q, e] of track) { if (q > .02 && e > .98) { const r = Math.hypot(x, y); if (r > .93) outP++; if (h < .3 && r > .86) outLow++; } if (h < -.01 || h > 1.16 || q < 0 || q > 1) hBad++; }
row('over the cup', !outP && !outLow && !hBad, `${outP} pouring samples past r .93, ${outLow} low past .86, ${hBad} out-of-range h / q${outP || outLow ? ' — milk would land on the rim' : ''}`);

// ── the pitcher's motion (keyed in code: timing, anticipation, no teleport) ──
{ let vmax = 0, jump = 0, step = 0; const V = [];
  for (let k = 1; k < track.length; k++) { const a = track[k - 1], b = track[k]; if (b[4] < .98 || a[4] < .98) { V.push(null); continue; } const v = Math.hypot(b[0] - a[0], b[1] - a[1]) * S; V.push(v); vmax = Math.max(vmax, v); jump = Math.max(jump, v / S); }
  for (let k = 1; k < V.length; k++) if (V[k] != null && V[k - 1] != null) step = Math.max(step, Math.abs(V[k] - V[k - 1]) / (vmax || 1));
  row('no teleport', jump < .12, `largest spout move in one 1/60 s: ${f3(jump)} of the cup radius (< .12)`);
  row('ease', step < .35, `largest speed change in one 1/60 s: ${Math.round(step * 100)} % of peak (< 35 %: every move eases in and out)`);
  // anticipation: every drop lifts the spout a little first
  const drops = info.spans.filter(s => s.do === 'drop'); let ant = 0;
  for (const d of drops) { const k0 = Math.round(d.t0 * S), k1 = Math.round((d.t0 + (d.t1 - d.t0) * .45) * S); const h0 = track[k0][2]; let hm = h0; for (let k = k0; k <= k1; k++) hm = Math.max(hm, track[k][2]); if (hm - h0 >= .04) ant++; }
  row('anticipation', ant === drops.length, `${ant}/${drops.length} drops lift first (≥ .04 of the height) before coming down`);
  const enter = track.findIndex(r => r[4] > .99) / S, exit = (track.length - 1 - [...track].reverse().findIndex(r => r[4] > .99)) / S;
  row('in and out', enter > 0 && exit < info.duration - 1, `the pitcher arrives by ${f2(enter)} s and has left by ${f2(exit + .8)} s (the finished cup is held clean)`);
}

// ── the art ──
const end = await fx('foamStats', info.duration - .05), mid = await fx('foamStats', (info.steps[0].t1 + info.pourEnd) / 2), atPour = await fx('foamStats', Math.min(info.duration - .1, info.pourEnd + 1.5));
const reqEdges = 8 * Math.sqrt(end.coverage / Math.PI) * 1, complexity = end.edges / Math.max(1e-3, reqEdges);
row('art', end.coverage > .12 && end.coverage < .8, `white covers ${Math.round(end.coverage * 100)} % of the surface (12–80 %)`);
row('shape', complexity > 1.15, `outline ${f2(complexity)}× a plain blob of the same area (> 1.15: a figure, not a puddle)`);
row('centred', Math.hypot(end.cx, end.cy) < .45, `the figure's centre sits ${f2(Math.hypot(end.cx, end.cy))} of the radius from the middle (< .45)`);
row('grows', mid.coverage > .02 && mid.coverage < end.coverage + .05, `mid-pour ${Math.round(mid.coverage * 100)} % → end ${Math.round(end.coverage * 100)} %: the figure builds on camera`);
{ const a = await fx('foamGrid', Math.min(info.duration - .1, info.pourEnd + 1.5)), b = await fx('foamGrid', info.duration - .02); let d = 0; for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i]));
  row('settles', d < .02 || info.moves.some(m => m.do === 'etch'), `the surface after the pour changes by ${f3(d)} by the last frame (still once the milk stops${info.moves.some(m => m.do === 'etch') ? '; an etch may still draw' : ''})`); }
{ const c = await page.evaluate(() => window.__film.colors), L = v => (.2126 * v[0] + .7152 * v[1] + .0722 * v[2]) / 255, d = L(c.foam) - Math.max(L(c.crema[0]), L(c.crema[1]));
  row('contrast', d > .18, `foam ${f2(L(c.foam))} against the lighter crema ${f2(Math.max(L(c.crema[0]), L(c.crema[1])))} (Δ ${f2(d)} > .18: the figure reads)`); }

// ── words: legible, inside the frame, clear of the cup and each other ──
{ const MIN = { title: 56, step: 40, kicker: 24, label: 22, caption: 28 };
  const times = [info.intro * .7, ...info.steps.map(s => (s.t0 + s.t1) / 2), info.duration - .1];
  let small = [], outF = [], overCup = [], overlap = [], seen = 0;
  for (const t of times) {
    await grab(page, t); const T = await fx('texts');
    for (const b of T) {
      seen++;
      if (b.size < MIN[b.role]) small.push(`${b.role} "${b.text.slice(0, 20)}" ${b.size}px`);
      const m = 24 * U; if (b.x < m || b.y < m || b.x + b.w > lay.W - m || b.y + b.h > lay.H - m) outF.push(`"${b.text.slice(0, 20)}"`);
      const nx = Math.max(b.x, Math.min(lay.cx, b.x + b.w)), ny = Math.max(b.y, Math.min(lay.cy, b.y + b.h));
      if (Math.hypot(nx - lay.cx, ny - lay.cy) < lay.saucer) overCup.push(`"${b.text.slice(0, 20)}" @${f2(t)}s`);
    }
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const a = T[i], b = T[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap.push(`"${a.text.slice(0, 14)}" × "${b.text.slice(0, 14)}" @${f2(t)}s`); }
  }
  row('legible', !small.length, small.length ? small.slice(0, 3).join(', ') : `${seen} text boxes at ${times.length} moments, all at or above their sizes (title ≥ 56, step ≥ 40, caption ≥ 28 at 1080)`);
  row('framing', !outF.length && !overCup.length && !overlap.length, [outF.length ? `outside the frame: ${outF.slice(0, 2).join(', ')}` : '', overCup.length ? `over the saucer: ${overCup.slice(0, 2).join(', ')}` : '', overlap.length ? `overlapping: ${overlap.slice(0, 2).join(', ')}` : ''].filter(Boolean).join(' · ') || 'every line inside the frame, clear of the saucer and of each other');
  const titleOne = (await (async () => { await grab(page, info.intro * .7); return (await fx('texts')).find(b => b.role === 'title'); })());
  row('title', !!titleOne && titleOne.lines <= 2, titleOne ? `"${info.title}" on ${titleOne.lines} line${titleOne.lines > 1 ? 's' : ''} (≤ 2)` : 'no title on screen');
}

// ── sound: the synthesised pour does not clip and follows the milk ──
{ const rows = await fx('audio', 60), a = synth(rows, { fps: 60, duration: info.duration, rate: 16000 });
  const rms = (t0, t1) => { let s = 0, n = 0; for (let i = Math.floor(t0 * a.rate); i < Math.min(a.samples.length, t1 * a.rate); i++) { s += a.samples[i] ** 2; n++; } return Math.sqrt(s / Math.max(1, n)); };
  const pouring = rms(info.steps[0].t0 + .5, info.pourEnd - .3), after = rms(info.duration - 1.5, info.duration - .7);
  row('sound', a.peak <= .71 && pouring > after * 3, `peak ${f2(20 * Math.log10(a.peak))} dBFS, pouring ${f3(pouring)} vs held cup ${f3(after)} rms (the stream is heard, the end is quiet)`); }

// ── designed for this topic (not borrowed from the bundled films) ──
{ const own = [join(skill, 'starter'), ...readdirSync(join(skill, 'examples')).map(f => join(skill, 'examples', f))].filter(p => existsSync(join(p, 'film.js')) && resolve(p) !== resolve(dir));
  if (resolve(dir).startsWith(resolve(skill))) row('designed', true, 'a bundled film (starter / example)');
  else {
    const words = [info.title, info.caption, ...info.steps.map(s => s.label)].filter(Boolean), lifted = [];
    for (const p of own) { const t = readFileSync(join(p, 'film.js'), 'utf8'); for (const w of words) if (t.includes(`'${w}'`)) lifted.push(`"${w}" (${relative(skill, p)})`); }
    for (const w of words) if (/^Replace:/.test(w)) lifted.push(`"${w}" (the skeleton's placeholder)`);
    const sig = JSON.stringify(info.moves.map(m => [m.do, m.dur, m.at || m.to || null]));
    const sameScore = []; for (const p of own) { const t = readFileSync(join(p, 'film.js'), 'utf8'); const mm = t.match(/pour:\s*\[([\s\S]*?)\n\s*\],/); if (mm && mm[1].replace(/say:\s*'[^']*',?/g, '').replace(/\s/g, '') === (src.match(/pour:\s*\[([\s\S]*?)\n\s*\],/)?.[1] || '').replace(/say:\s*'[^']*',?/g, '').replace(/\s/g, '')) sameScore.push(relative(skill, p)); }
    row('designed', !lifted.length && !sameScore.length, lifted.length ? `borrowed words: ${lifted.join(', ')}` : sameScore.length ? `the pour score is a copy of ${sameScore.join(', ')} — design the figure for this topic` : `${words.length} lines and a ${info.moves.length}-move score of this film's own (${sig.length} chars)`);
  }
}

// ── brief ──
if (!flag('no-brief')) {
  const bp = join(dir, 'BRIEF.md'), b = existsSync(bp) ? readFileSync(bp, 'utf8') : '';
  const sec = b.split(/^## Stills review/m)[1] || '', done = (sec.match(/^- \[x\]/gmi) || []).length, open_ = (sec.match(/^- \[ \]/gm) || []).length;
  const blanks = (b.match(/TODO|＿|_{3,}|Replace:/g) || []).length;
  row('brief', !!b && done >= 8 && !open_ && !blanks, !b ? 'no BRIEF.md' : `stills review ${done} answered, ${open_} open, ${blanks} blanks${done >= 8 && !open_ && !blanks ? '' : ' — fill the brief and answer the review from rendered frames'}`);
}
if (errors.length) row('console', false, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check${failed > 1 ? 's' : ''} failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
