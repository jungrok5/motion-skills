// Debug runner: open a scene the way render.mjs does and PRINT what goes wrong — page errors (with the first stack lines), console
// errors / warnings (the kit warns when a balloon is shorter than its reading time), failed requests — plus the draw time per frame
// and the Manga.grade share of it. Use it whenever a still comes out blank or half drawn, after every big edit, and before a long render.
// Generalised from the scratch runner used on 「마지막 도넛」 (render.mjs used to hide page errors: a scene that threw just drew less).
// Run from the film project root:
//   node <skill>/scripts/debug.mjs --scene ep1-find [--o v] [--at 0,2,5.5] [--every 1]
//   node <skill>/scripts/debug.mjs --page scenes/cast-sheet.html --at 1,3
// Exit code 1 when there is any page error or the scene never became ready.
import { openScene, opt } from './_scene.mjs';

const { browser, page, problems } = await openScene({ root: opt('root', '.'), scene: opt('scene'), page: opt('page'), o: opt('o', 'v') });
const dur = await page.evaluate(() => window.DURATION || 0);
let ts = opt('at') ? opt('at').split(',').map(Number) : [];
if (!ts.length) { const ev = +opt('every', 1); for (let t = 0; t <= dur; t += ev) ts.push(+t.toFixed(3)); }
const rows = [];
for (const t of ts) {
  const r = await page.evaluate(t => { if (!window.seek) return null; const a = performance.now(); window.seek(t);
    return { ms: performance.now() - a, grade: window.Manga && Manga.lastGradeMs }; }, t).catch(e => ({ err: e.message }));
  rows.push([t, r]);
}
await browser.close();
console.log(`DURATION ${dur}s · ${ts.length} frames`);
for (const [t, r] of rows) console.log(`  t ${String(t).padEnd(6)} ${r && r.ms != null ? r.ms.toFixed(1).padStart(6) + ' ms' : 'no seek'}${r && r.grade ? `  (grade ${r.grade.toFixed(1)} ms)` : ''}${r && r.err ? '  ' + r.err : ''}`);
const uniq = [...new Set(problems)];
console.log(uniq.length ? `\n${uniq.length} problem(s):\n  ` + uniq.slice(0, 40).join('\n  ') : '\nno page errors, console errors or failed requests');
process.exit(uniq.some(p => /^page error|^NOT READY/.test(p)) ? 1 : 0);
