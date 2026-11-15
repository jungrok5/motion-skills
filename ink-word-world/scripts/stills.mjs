#!/usr/bin/env node
// Stills of a world's performance, to look at and score against references/BRIEF.md:
//   node <skill>/scripts/stills.mjs <project> --at 6,14,30        frames at those seconds → out/still-006.jpg …
//   node <skill>/scripts/stills.mjs <project> --sheet 12          twelve frames across the performance → out/sheet.jpg
//   node <skill>/scripts/stills.mjs <project> --cast              the cast sheet (cast.html) → out/cast.png
// Options: --size 1280x720 · --scale 1 (device pixels per px; 2 for stills people will see) · --out out
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { open, args, pageOf, browser, serve, rootOf } from './_lib.mjs';

const { a, flag, bool } = args(process.argv), cast = bool('--cast'), at = flag('--at'), sheet = flag('--sheet'), [W, H] = flag('--size', '1280x720').split('x').map(Number), scale = +flag('--scale', 1);
const target = a[0] || '.', file = pageOf(target), dir = path.dirname(path.resolve(file)), out = path.resolve(flag('--out', path.join(dir, 'out'))); fs.mkdirSync(out, { recursive: true });
if (cast) {
  const cf = path.join(dir, 'cast.html'), sv = serve(rootOf(cf)), b = await browser(), p = await b.newPage({ viewport: { width: 1780, height: 1000 }, deviceScaleFactor: scale });
  await p.goto(sv.url(cf)); await p.waitForFunction(() => window.__cast && window.__cast.ready, null, { timeout: 30000 });
  await p.locator('canvas').screenshot({ path: path.join(out, 'cast.png') }); console.log(path.join(out, 'cast.png')); await b.close(); sv.server.close();
}
if (at || sheet) {
  const s = await open(file, { width: W, height: H, scale }), D = await s.page.evaluate(() => __inkworld.DURATION);
  const times = at ? at.split(',').map(Number) : Array.from({ length: +sheet }, (_, i) => Math.round((i + .7) / +sheet * (D - 4) * 10) / 10), files = [];
  for (const t of times.sort((x, y) => x - y)) { await s.page.evaluate(t => __inkworld.seek(t), t); const f = path.join(out, `still-${String(Math.round(t)).padStart(3, '0')}.jpg`); await s.page.screenshot({ path: f, quality: 90 }); files.push(f); console.log(f); }
  if (s.errors.length) console.log('errors:', s.errors.join(' | '));
  await s.close();
  if (sheet) { const cols = Math.ceil(Math.sqrt(files.length)), rows = Math.ceil(files.length / cols), list = path.join(out, 'sheet.txt'); fs.writeFileSync(list, files.map(f => `file '${f}'\nduration 1`).join('\n'));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `scale=640:-1,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', path.join(out, 'sheet.jpg')]); fs.unlinkSync(list); console.log(path.join(out, 'sheet.jpg')); }
}
if (!cast && !at && !sheet) console.log('nothing to do: pass --at, --sheet or --cast');
