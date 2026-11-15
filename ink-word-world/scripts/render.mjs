#!/usr/bin/env node
// Film a world's performance: node <skill>/scripts/render.mjs <project> [--out out/film.mp4]
// Options: --size 1920x1080 · --fps 30 · --seconds N (default: the whole performance) · --no-audio · --crf 18
// The page is stepped under the script's clock (60 steps per second of film), each frame is a screenshot — sheet, seal,
// key caps and lines included — and the sound is rendered offline from the same run's cues, so the film is the live piece.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { open, args, pageOf } from './_lib.mjs';

const { a, flag, bool } = args(process.argv), [W, H] = flag('--size', '1920x1080').split('x').map(Number), fps = +flag('--fps', 30), noAudio = bool('--no-audio'), crf = flag('--crf', '18');
const target = a[0] || '.', file = pageOf(target), dir = path.dirname(path.resolve(file)), out = path.resolve(flag('--out', path.join(dir, 'out', 'film.mp4'))); fs.mkdirSync(path.dirname(out), { recursive: true });
const s = await open(file, { width: W, height: H }), D = +flag('--seconds', await s.page.evaluate(() => __inkworld.DURATION)), frames = Math.round(D * fps), silent = out.replace(/\.mp4$/, '.silent.mp4');
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', crf, '-preset', 'medium', '-movflags', '+faststart', noAudio ? out : silent], { stdio: ['pipe', 'inherit', 'inherit'] });
await s.page.evaluate(() => __inkworld.reset(true)); const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await s.page.evaluate(n => __inkworld.advance(n), 60 / fps);
  const img = await s.page.screenshot({ type: 'jpeg', quality: 95 }); if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % (fps * 5) === 0) process.stdout.write(`\r${(f / fps).toFixed(0)}s / ${D}s  (${((Date.now() - t0) / 1000 / (f + 1)).toFixed(2)} s per frame)   `);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('');
if (!noAudio) {
  const au = await s.page.evaluate(d => __inkworld.audio(d), D), wav = out.replace(/\.mp4$/, '.wav'); fs.writeFileSync(wav, Buffer.from(au.wav, 'base64'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]); fs.unlinkSync(silent);
  console.log(`sound: ${au.cues} cues, peak ${au.peak.toFixed(2)} → ${wav}`);
}
if (s.errors.length) console.log('errors:', s.errors.join(' | '));
await s.close(); console.log(out);
