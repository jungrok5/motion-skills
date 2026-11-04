// sight-gag-short · check.mjs — prove a film page before rendering it:
//   node <skill>/scripts/check.mjs film.html [--scale .3]
// loads without errors · every shot draws a non-blank frame at its setup, act and button marks · the same t gives the
// same pixels (deterministic) · every glove/figure stays above the ground · the format's rules (Film.check: 4–7 gags of
// 3.5–5 s with notice / act / button marks, cuts on the beat, 25–45 s) · every sfx kind exists · prints DURATION, the
// shot table and the cue list.
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { openFilm } from './_browser.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const film = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(film)) { console.error('usage: check.mjs film.html [--scale .3]'); process.exit(1); }
const { browser, page, errors } = await openFilm(film, `scale=${opt('scale', '.3')}&mb=1`);
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(async () => {
  const F = window.film;
  const stat = (t) => {
    F.seek(t);
    const c = document.createElement('canvas'); c.width = 96; c.height = 54; const g = c.getContext('2d'); g.drawImage(F.canvas, 0, 0, 96, 54);
    const d = g.getImageData(0, 0, 96, 54).data; let s = 0, s2 = 0, h = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; }
    const n = d.length / 4, m = s / n; return { mean: m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), hash: h };
  };
  // anything posed below the ground: gloves (wrist) and figures (feet)
  const under = [];
  const probe = (t) => { F.pose(t); for (const a of F.actors) { if (!a.root?.visible) continue; if (a.fingers && a.root.position.y < -0.2) under.push(`${t.toFixed(2)} s glove wrist at y ${a.root.position.y.toFixed(2)}`); if (a.footY && a.root.visible && a.footY() < a.groundY - 0.12) under.push(`${t.toFixed(2)} s a figure's foot ${(a.groundY - a.footY()).toFixed(2)} m under the ground`); } };
  const shots = F.shots.map((s) => {
    const ts = [s.from + 0.15, ...Object.values(s.marks).map((m) => s.from + m), s.to - 0.1].filter((t) => t < s.to);
    const st = ts.map(stat), again = stat(ts[1] ?? ts[0]);
    for (let t = s.from; t < s.to; t += 0.2) probe(t);
    return { id: s.id, kind: s.kind, from: s.from, to: s.to, marks: s.marks, sfx: s.sfx.length, minSd: Math.min(...st.map((x) => x.sd)), mean: st.reduce((a, x) => a + x.mean, 0) / st.length, det: again.hash === st[1 < st.length ? 1 : 0].hash };
  });
  return { dur: F.duration, fps: F.fps, bpm: F.bpm, shots, rules: F.check(), cues: F.cues(), under: under.slice(0, 12), nUnder: under.length };
});
await browser.close();
const lib = existsSync(join(dirname(film), 'lib', 'score.js')) ? join(dirname(film), 'lib', 'score.js') : join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js');
info.kinds = (await import(pathToFileURL(lib).href)).SFX_KINDS;
const fail = [], warn = [];
console.log(`DURATION ${info.dur.toFixed(2)} s  (${Math.round(info.dur * info.fps)} frames @ ${info.fps} fps, ${info.bpm} bpm)`);
console.log('shot          kind    from →   to   len  luma   sd   marks');
for (const s of info.shots) {
  console.log(`${s.id.padEnd(13)} ${s.kind.padEnd(6)} ${s.from.toFixed(2).padStart(6)} → ${s.to.toFixed(2).padStart(6)}  ${(s.to - s.from).toFixed(1).padStart(4)}  ${s.mean.toFixed(2)}  ${s.minSd.toFixed(2)}  ${Object.entries(s.marks).map(([k, v]) => `${k} ${(+v).toFixed(2)}`).join(' · ')}`);
  if (s.minSd < 0.03) fail.push(`shot ${s.id} draws a blank frame (luma sd ${s.minSd.toFixed(3)})`);
  if (!s.det) fail.push(`shot ${s.id} is not deterministic (same t, different pixels)`);
  if (s.mean < 0.35 || s.mean > 0.85) warn.push(`shot ${s.id} mean luma ${s.mean.toFixed(2)} — the reference is a bright sunny street (~.55–.75)`);
  if (s.kind === 'gag' && !s.sfx) warn.push(`shot ${s.id} has no sfx cues (every gag lands on a sound)`);
}
for (const r of info.rules) (r.startsWith('FAIL') ? fail : warn).push(r.replace(/^FAIL /, ''));
if (info.kinds) { const bad = [...new Set(info.cues.filter((c) => !info.kinds.includes(c.kind)).map((c) => c.kind))]; if (bad.length) fail.push('unknown sfx kinds: ' + bad.join(', ')); }
if (info.nUnder) fail.push(`${info.nUnder} poses below the ground, e.g. ${info.under.slice(0, 3).join('; ')}`);
console.log(`cues (${info.cues.length}): ` + info.cues.map((c) => `${c.t.toFixed(2)} ${c.kind}`).join(' · '));
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
