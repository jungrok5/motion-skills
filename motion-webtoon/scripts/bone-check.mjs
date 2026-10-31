// Numeric body check: step through a whole scene with Cast.debugBones on and read Cast.boneLog every frame →
//   · bone lengths per person and limb (upper / lower must not change: a spread means a limb is not solved by the rig),
//   · elbow jumps between consecutive frames (an elbow flipping sides mid-reach — the pole changed),
//   · wrists bent past 80° off the forearm, elbows buried in the torso ("bad"),
//   · the Manga.grade time per frame (median / p95).
// It cannot see a hand that LOOKS wrong (palm to camera on a grab, thumb on the wrong side, a rude 'point'): that is what the
// body-check.py pack and a fresh reviewer are for (references/BODY-CHECK.md). Run both.
// Generalised from the scratch checker used on 「마지막 도넛」. Run from the film project root:
//   node <skill>/scripts/bone-check.mjs --scene ep2-standoff [--fps 10] [--o v]
// Exit code 1 when anything is flagged (wrist > 80°, elbow jump, buried elbow, page error).
import { openScene, opt } from './_scene.mjs';

const fps = +opt('fps', 10);
const { browser, page, problems } = await openScene({ root: opt('root', '.'), scene: opt('scene'), page: opt('page'), o: opt('o', 'v') });
const res = await page.evaluate(fps => {
  const C = window.Cast; if (!C) return { err: 'no window.Cast on this page' };
  C.debugBones = true; const D = window.DURATION, len = {}, prev = new Map(), flips = [], wrist = [], bad = [], gms = []; let frames = 0;
  for (let t = 0; t < D; t += 1 / fps) {
    C.boneLog = []; window.seek(t); frames++; if (window.Manga && Manga.lastGradeMs) gms.push(Manga.lastGradeMs);
    const seen = {}, cur = new Map();
    for (const e of C.boneLog) {
      const k0 = e.who + ' ' + e.limb, n = seen[k0] = (seen[k0] || 0) + 1, k = k0 + ' #' + n;
      (len[k0] ||= { l1: [], l2: [] }); len[k0].l1.push(e.l1); len[k0].l2.push(e.l2);
      if (!e.limb.startsWith('arm')) continue;
      cur.set(k, e); const q = prev.get(k);
      if (q) { const de = Math.hypot(e.e[0] - q.e[0], e.e[1] - q.e[1], e.e[2] - q.e[2]), dw = Math.hypot(e.w[0] - q.w[0], e.w[1] - q.w[1], e.w[2] - q.w[2]);
        if (de > 2 * dw + 12) flips.push(`${t.toFixed(2)}s ${k}: elbow jumped ${de.toFixed(0)} px while the wrist moved ${dw.toFixed(0)}`); }
      if (e.wrist > 80.5) wrist.push(`${t.toFixed(2)}s ${k}: wrist ${e.wrist}°`);
      if (e.bad) bad.push(`${t.toFixed(2)}s ${k}: elbow inside the torso`);
    }
    prev.clear(); for (const [k, v] of cur) prev.set(k, v);
  }
  C.debugBones = false;
  const L = {}; for (const k in len) { const a = len[k].l1, c = len[k].l2, mm = x => `${Math.min(...x)}–${Math.max(...x)}`; L[k] = `upper ${mm(a)}  lower ${mm(c)}  (${a.length} solves)`; }
  gms.sort((a, b) => a - b);
  return { frames, L, flips, wrist, bad, grade: gms.length ? [gms[gms.length >> 1], gms[Math.floor(gms.length * .95)]] : null };
}, fps);
await browser.close();
if (res.err) { console.error(res.err); process.exit(1); }
console.log(`${res.frames} frames at ${fps} fps\nbone lengths (fixed per person — a range means a limb is not on the rig):`);
for (const k in res.L) console.log('  ' + k.padEnd(26) + res.L[k]);
const show = (title, a) => { console.log(`${title}: ${a.length}`); for (const s of a.slice(0, 25)) console.log('  ' + s); if (a.length > 25) console.log(`  … ${a.length - 25} more`); };
show('elbow jumps', res.flips); show('wrists past 80°', res.wrist); show('elbows in the torso', res.bad);
if (res.grade) console.log(`Manga.grade: median ${res.grade[0].toFixed(1)} ms, p95 ${res.grade[1].toFixed(1)} ms per frame`);
const errs = [...new Set(problems)].filter(p => /^page error|^NOT READY/.test(p)); if (errs.length) console.log(errs.join('\n'));
const n = res.flips.length + res.wrist.length + res.bad.length + errs.length;
console.log(n ? `\n${n} flagged — open those times in a body-check pack and fix (cast-level if every scene shows it, scene-level otherwise)` : '\nbones OK (now the visual pack: body-check.py + a fresh reviewer)');
process.exit(n ? 1 : 0);
