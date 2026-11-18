// Stills of a colossus project (headless Chromium).
// Run from the project folder (or pass --dir <project>):
//   node <skill>/scripts/shot.mjs --shots hero,side --t 2            -> shots/<prefix>_hero.png ...
//   node <skill>/scripts/shot.mjs --shots f_foot --ts 17,18.9 --mb 4  film shots take GLOBAL film time; --mb = motion blur
//   node <skill>/scripts/shot.mjs --cam "-60,3,40,0,20,0,45"          free camera in the path frame: pos xyz, target xyz, fov
//   node <skill>/scripts/shot.mjs --board [--n 3]                     storyboard: n frames per timeline shot + contact sheet
//   node <skill>/scripts/shot.mjs --shots leg --ts 0,1.6,3.2 --sheet  several times + contact sheet (animation check)
//   --mods ground,legs   load only these modules   --w/--h size (default 960x540)   --prefix name   --out dir (default shots/)
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, openProject, frame } from './_browser.mjs';

const a = parseArgs();
const dir = path.resolve(a.dir || a._[0] || '.');
const W = +(a.w || 960), H = +(a.h || 540);
const prefix = a.prefix || 's';
const outDir = path.resolve(dir, a.out || 'shots');
fs.mkdirSync(outDir, { recursive: true });
const times = String(a.ts ?? a.t ?? '2').split(',').map(Number);
const P = await openProject(dir, { w: W, h: H, mods: a.mods, q: a.q });
console.log(`ready in ${P.readyMs} ms  gl=${P.info.gl}\n  calls=${P.info.calls} tris=${P.info.tris}  build ms ${JSON.stringify(P.info.buildMs)}`);
let code = 0;
if (P.errors.length) { console.log('MODULE ERRORS:\n' + P.errors.join('\n')); code = 2; }
const files = [];
const save = (buf, name) => { const f = path.join(outDir, name); fs.writeFileSync(f, buf); files.push(f); console.log(`wrote ${path.relative(dir, f)}`); };
try {
  if (a.board) {
    const n = +(a.n || 3);
    const tl = await P.page.evaluate(async () => (await import('./engine/config.js')).TIMELINE);
    for (const seg of tl) for (let i = 0; i < n; i++) {
      const t = seg.start + (seg.end - seg.start) * (n === 1 ? 0.5 : 0.04 + 0.92 * i / (n - 1));
      const t0 = Date.now();
      save(await frame(P.page, t, { mb: +(a.mb || 1) }), `${prefix}_${seg.shot}_${i}.png`);
      if (i === 0) console.log(`  ${seg.shot} t=${t.toFixed(2)} (${Date.now() - t0} ms)`);
    }
    a.sheet = true; a.cols = a.cols || n;
  } else {
    const shots = a.cam ? [a.name || 'cam'] : String(a.shots || a.shot || 'hero').split(',');
    for (const shot of shots) for (const t of times) {
      const t0 = Date.now();
      const buf = await frame(P.page, t, { shot: a.cam ? '' : shot, cam: a.cam ? String(a.cam).split(',').map(Number) : null, mb: +(a.mb || 1) });
      save(buf, `${prefix}_${shot}${times.length > 1 ? '_t' + t : ''}.png`);
      console.log(`  t=${t} ${Date.now() - t0} ms`);
    }
  }
  const logs = [...new Set(P.logs)];
  if (logs.length) console.log('CONSOLE:\n' + logs.slice(0, 30).join('\n'));
  if (a.sheet && files.length > 1) {
    const cols = +(a.cols || (files.length <= 4 ? 2 : 3)), cw = +(a.cw || 480), ch = Math.round(cw * H / W);
    const rows = Math.ceil(files.length / cols);
    const sp = await P.browser.newPage({ viewport: { width: cols * cw, height: rows * ch } });
    const imgs = files.map((f) => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:${cw}px;height:${ch}px;display:block">`).join('');
    await sp.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},${cw}px)">${imgs}</body>`);
    const sheet = path.join(outDir, `${prefix}_sheet.jpg`);
    await sp.screenshot({ path: sheet, type: 'jpeg', quality: 88 });
    console.log(`wrote ${path.relative(dir, sheet)}`);
  }
} catch (e) { console.error('SHOT FAILED:', e.message); code = 1; }
await P.close();
process.exit(code);
