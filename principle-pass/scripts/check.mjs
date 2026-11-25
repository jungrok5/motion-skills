// principle-pass · check.mjs — does the piece hold up? Prints numbers, exits 1 on any failure.
//   node <skill>/scripts/check.mjs index.html
// brief · loads · draws (a creature in both panels at every beat) · deterministic · principles (the after panel passes
// every measured principle, the before panel fails at least four, every tag on a beat is backed by a passing number) ·
// body (no joint bends the wrong way or past its limit, planted feet within reach) · form (beats, rests, a study, labels).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const page$ = resolve(process.argv.slice(2).find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html>'); process.exit(1); }
const fails = [], ok = (cond, label, detail = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!cond) fails.push(label); };

// brief
{ const f = join(dirname(page$), 'BRIEF.md'), b = existsSync(f) ? readFileSync(f, 'utf8') : '';
  const need = ['Topic', 'Creature', 'Beats', 'Pass', 'Review'], miss = need.filter(h => !new RegExp('^#+ .*' + h, 'mi').test(b));
  ok(b.length > 400 && !miss.length, 'brief', b ? (miss.length ? 'missing: ' + miss.join(', ') : `${b.length} chars`) : 'no BRIEF.md beside the page'); }

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(page$).href + '?render=1', { waitUntil: 'commit' });
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); } catch { }
const ready = await page.evaluate(() => window.__ready === true);
ok(ready && !errs.length, 'loads', errs.length ? errs.slice(0, 3).join(' | ') : '');
if (!ready) { await browser.close(); process.exit(1); }

const info = await page.evaluate(() => { const f = window.__film.film, d = f.def; return { W: f.W, H: f.H, dur: f.DURATION, fps: f.FPS, beats: d.beats || [], rest: d.rest || [], study: d.study, title: d.title, nPass: d.keys.filter(k => k.pass).length, nStory: d.keys.filter(k => !k.pass).length }; });
ok(info.dur >= 4 && info.dur <= 24, 'length', `${info.dur} s · ${info.W}×${info.H} @ ${info.fps} fps`);

// draws: count pixels that differ from the bare ground in each panel, at the middle of every beat
const draws = await page.evaluate(() => {
  const f = window.__film.film, cv = document.querySelector('canvas'), g = cv.getContext('2d'), out = [];
  for (const b of f.def.beats) { const t = (b.t0 + b.t1) / 2; window.seek(t);
    for (const p of f.panels) { const a = g.getImageData(p.x, p.y, p.w, p.h).data, gr = f.ground(p).getContext('2d').getImageData(0, 0, p.w, p.h).data; let n = 0;
      for (let i = 0; i < a.length; i += 16) if (Math.abs(a[i] - gr[i]) + Math.abs(a[i + 1] - gr[i + 1]) + Math.abs(a[i + 2] - gr[i + 2]) > 40) n++;
      out.push({ beat: b.name, side: p.side, frac: n / (a.length / 16) }); } }
  return out; });
const thin = draws.filter(d => d.frac < .012);
ok(!thin.length, 'draws', thin.length ? thin.map(d => `${d.side} at "${d.beat}" ${(d.frac * 100).toFixed(1)} %`).join(', ') : `creature covers ${(Math.min(...draws.map(d => d.frac)) * 100).toFixed(1)}–${(Math.max(...draws.map(d => d.frac)) * 100).toFixed(1)} % of a panel`);

// deterministic
{ const h = await page.evaluate(async () => { const cv = document.querySelector('canvas'), hash = async () => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; const b = await crypto.subtle.digest('SHA-256', d); return [...new Uint8Array(b)].slice(0, 6).join('.'); };
    const T = window.DURATION; window.seek(T * .41); const a = await hash(); window.seek(T * .9); window.seek(.1); window.seek(T * .41); return [a, await hash()]; });
  ok(h[0] === h[1], 'deterministic', h[0] === h[1] ? 'same pixels after seeking away and back' : h.join(' ≠ ')); }

// principles
const A = await page.evaluate(() => window.__film.audit());
console.log('\n  principle                           before          after');
for (const r of A.rows) console.log(`  ${r.name.padEnd(34)} ${String(r.before).padStart(8)} ${r.beforePass ? 'ok' : '--'}   ${String(r.after).padStart(8)} ${r.afterPass ? 'ok' : 'XX'}   ${r.unit}`);
const notes = A.after.results.filter(r => r.note).map(r => `    ${r.id}: ${r.note}`); if (notes.length) console.log(notes.join('\n'));
console.log('');
const bad = A.rows.filter(r => !r.afterPass);
ok(!bad.length, 'principles: after passes all', bad.length ? 'fails: ' + bad.map(r => r.name).join(', ') : `${A.after.passed}/${A.after.of}`);
const bFail = A.rows.filter(r => r.beforePass === false).length;
ok(bFail >= 4, 'principles: before shows the problem', `${bFail} of ${A.rows.length} fail in the before panel (need ≥ 4 — the same story keys, no pass)`);
const TAG = { 'anticipation': 'anticipation', 'arcs': 'arcs', 'squash & stretch': 'squash', 'squash': 'squash', 'stretch': 'squash', 'follow-through': 'follow', 'settle': 'follow',
  'overlap': 'overlap', 'overlapping action': 'overlap', 'eyes lead': 'overlap', 'slow in / out': 'ease', 'slow in / slow out': 'ease', 'timing': 'timing', 'spacing': 'timing',
  'secondary action': 'alive', 'breath': 'alive', 'planted feet': 'planted' };
const JUDGED = ['staging', 'appeal', 'solid drawing', 'exaggeration', 'straight ahead', 'pose to pose'];
const untagged = [];
for (const b of info.beats) for (const tg of b.tags || []) { const id = TAG[tg.toLowerCase()]; if (id) { const r = A.rows.find(x => x.id === id); if (!r?.afterPass) untagged.push(`"${tg}" on ${b.name}`); } else if (!JUDGED.includes(tg.toLowerCase())) untagged.push(`"${tg}" is not a principle the meter knows (or a judged one: ${JUDGED.join(', ')})`); }
ok(!untagged.length, 'principles: tags are earned', untagged.length ? untagged.join('; ') : `${info.beats.reduce((n, b) => n + (b.tags?.length || 0), 0)} tags, each backed by a passing number`);

// body
const rig = await page.evaluate(() => window.__film.rig());
const show = L => L.slice(0, 4).map(j => `${j.id} ${j.joint} ${j.deg}${j.joint === 'reach' ? ' px' : '°'} @ ${j.t} s (${j.bad})`).join('; ');
ok(!rig.after.bad.length, 'body: after', rig.after.bad.length ? `${rig.after.bad.length} bad frames: ` + show(rig.after.bad) : `${rig.after.frames} frames, every knee and ankle bends its own way, every planted foot in reach`);
ok(!rig.before.bad.length, 'body: before', rig.before.bad.length ? show(rig.before.bad) : `${rig.before.frames} frames (feet slide there on purpose; joints still legal)`);

// form
ok(info.beats.length >= 2 && info.beats.some(b => b.big), 'form: beats', `${info.beats.length} beats, ${info.beats.filter(b => b.big).length} big; ${info.nStory} story keys + ${info.nPass} pass keys`);
ok(info.nPass >= 3, 'form: the pass adds keys', `${info.nPass} keys exist only in the after panel`);
ok(info.rest.length >= 1 && info.rest.every(r => r.t1 - r.t0 >= .8), 'form: rests', info.rest.map(r => `${r.t0}–${r.t1} s`).join(', ') || 'none — the after panel must show an idle that breathes');
ok(info.study && info.dur - info.study.t0 >= 1.6, 'form: study', info.study ? `${(info.dur - info.study.t0).toFixed(1)} s of paths and spacing dots` : 'no study section');
const longL = info.beats.filter(b => (b.label || b.name).length > 28 || (b.tags || []).length > 4);
ok(!longL.length, 'form: labels', longL.length ? longL.map(b => b.name).join(', ') + ' — label ≤ 28 chars, ≤ 4 tags' : info.beats.map(b => b.label || b.name).join(' / '));

await browser.close();
console.log(fails.length ? `\n${fails.length} failed: ${fails.join(', ')}` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
