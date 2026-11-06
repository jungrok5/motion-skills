// Render a course: its tour to MP4, stills of the tour, or one still per lesson.
// Run from a directory that contains both the page and lib/ (the project root; for the skill's examples, the skill folder).
//   node <skill>/scripts/render.mjs <course> out/tour.mp4                      tour → 1920×1080 MP4 (1280×720 page at 1.5×)
//   node <skill>/scripts/render.mjs <course> out/st --stills 2,9.5,20          stills of the tour
//   node <skill>/scripts/render.mjs <course> out/lessons --lessons [--on]      one still per lesson (and per build); --on powers it
//   options: --size 1280x720  --scale 1.5  --fps 30  --crf 18  --from s --to s  --query k=v&…  --jpeg
// <course> is the project folder (or its index.html). The page must expose window.ready / renderAt / DURATION / lab (lab.js does).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, args, pageOf } from './_lib.mjs';

const { a, flag, bool } = args(process.argv);
const fps = Number(flag('--fps', 30)), crf = flag('--crf', '18'), stills = flag('--stills', null);
const from = Number(flag('--from', 0)), to = flag('--to', null), query = flag('--query', '');
const size = flag('--size', '1280x720').split('x').map(Number), scale = Number(flag('--scale', 1.5));
const lessonsMode = bool('--lessons'), on = bool('--on'), jpeg = bool('--jpeg');
const [course, out] = a;
if (!course || !out) { console.error('usage: render.mjs <course> <out.mp4|dir> [--stills t1,t2 | --lessons] [--size WxH] [--scale 1.5]'); process.exit(1); }

const { server, url, misses } = serve();
const br = await browser();
const tab = await br.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: scale });
tab.on('console', (m) => m.type() === 'error' && console.log('[page]', m.text()));
tab.on('pageerror', (e) => { console.error('[page error]', e); process.exitCode = 1; });
await tab.goto(url(pageOf(course), `render${query ? '&' + query : ''}`));
await tab.evaluate(() => window.ready);
const shot = () => tab.screenshot({ type: jpeg ? 'jpeg' : 'png', quality: jpeg ? 92 : undefined });

if (lessonsMode) {
  fs.mkdirSync(out, { recursive: true });
  const list = await tab.evaluate(() => window.lab.lessons.map((L) => ({ id: L.id, builds: (L.builds || []).map((b) => b.id) })));
  for (const L of list) {
    for (const b of L.builds.length ? L.builds : [null]) {
      await tab.evaluate(({ id, b, on }) => { window.lab.go(id); if (b) window.lab.act({ do: 'build', id: b }); if (on) window.lab.act({ do: 'power', value: true }); window.lab.run(on ? 3 : 0.05); }, { id: L.id, b, on });
      const f = path.join(out, `${L.id}${b ? '-' + b : ''}.${jpeg ? 'jpg' : 'png'}`);
      fs.writeFileSync(f, await shot());
    }
  }
  console.log(`wrote ${list.length} lessons to ${out}`);
} else if (stills) {
  fs.mkdirSync(out, { recursive: true });
  for (const t of stills.split(',').map(Number)) { await tab.evaluate((t) => window.renderAt(t), t); fs.writeFileSync(path.join(out, `t${t.toFixed(1).padStart(5, '0')}.${jpeg ? 'jpg' : 'png'}`), await shot()); }
  console.log(`wrote ${stills.split(',').length} stills to ${out}`);
} else {
  const duration = await tab.evaluate(() => window.DURATION);
  const end = to != null ? Number(to) : duration;
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((end - from) * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await tab.evaluate((t) => window.renderAt(t), from + i / fps);
    if (!ff.stdin.write(await shot())) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 2) === 0) process.stdout.write(`\r${(from + i / fps).toFixed(1)} / ${end.toFixed(1)} s  (${((Date.now() - t0) / 1000 / Math.max(1, i)).toFixed(2)} s/frame)   `);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log(`\nwrote ${out}`);
}
if (misses.length) console.log('[404]', [...new Set(misses)].join(' '));
await br.close(); server.close();
