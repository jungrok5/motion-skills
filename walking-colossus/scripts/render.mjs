// Render the film to PNG frames (headless Chromium). Resumable: existing frames are skipped.
// Run from the project folder:
//   node <skill>/scripts/render.mjs [--w 1920 --h 1080] [--fps 30] [--mb 5] [--from 0 --to 45] [--every 1] [--force]
//   --shot NAME   render one shot preset instead of the timeline     --dir out/frames
// Frames are out/frames/f_000000.png (index = round(t * fps)); the browser is restarted every 300 frames.
// Speed: ~1-4 s/frame at 1080p on a laptop GPU with --mb 5; SwiftShader (no GPU) is ~15-60 s/frame — preview there
// with --w 960 --h 540 --mb 1 --every 3.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, openProject, frame } from './_browser.mjs';
import { loadProject } from './_project.mjs';

const a = parseArgs();
const dir = path.resolve(a.dir2 || a._[0] || '.');
const P = await loadProject(dir);
const W = +(a.w || 1920), H = +(a.h || 1080), FPS = +(a.fps || 30), MB = +(a.mb || 5), every = +(a.every || 1);
const from = +(a.from || 0), to = +(a.to ?? P.config.DURATION);
const out = path.resolve(dir, a.dir || 'out/frames');
fs.mkdirSync(out, { recursive: true });
const todo = [];
for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f += every) {
  const file = path.join(out, `f_${String(f).padStart(6, '0')}.png`);
  if (a.force || !fs.existsSync(file) || fs.statSync(file).size < 1000) todo.push([f, file]);
}
console.log(`${todo.length} frames to render at ${W}x${H}, ${FPS} fps, motion blur ${MB} sub-frames -> ${path.relative(dir, out)}`);
if (!todo.length) process.exit(0);
let B = null, done = 0;
const t0 = Date.now();
try {
  for (const [f, file] of todo) {
    if (!B || (done > 0 && done % 300 === 0)) {
      if (B) await B.close();
      B = await openProject(dir, { w: W, h: H, q: a.q });
      if (B.errors.length) console.log('MODULE ERRORS:\n' + B.errors.join('\n'));
    }
    // shutter: 0.3 of a frame (the source film's look: crisp but never strobing)
    fs.writeFileSync(file, await frame(B.page, f / FPS, { shot: a.shot || '', mb: MB, shutter: 0.3 / FPS }));
    done++;
    if (done % 10 === 0 || done === todo.length) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${done}/${todo.length}  ${(el / done).toFixed(1)} s/frame  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
    }
  }
} catch (e) { console.error('RENDER FAILED after', done, 'frames:', e.message); process.exitCode = 1; }
if (B) await B.close();
