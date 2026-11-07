// node <skill>/scripts/render.mjs <piece> [--style id] [--scale 1]
//      --still [out.png]              the finished picture (default out/<style>.png)
//      --at 0.25,0.5,0.75             drawing-progress stills (0..1) → out/<style>-p25.png …
//      --film [out.mp4] [--fps 30]    the whole timeline: drawing → hold → life (H.264, ffmpeg)
// Without --still/--at/--film it writes the still. The style is --style, else the piece's own `style`.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { piece, open, args } from './_lib.mjs'

const a = args(process.argv.slice(2), { fps: 30, scale: 1 })
const prj = piece(a._[0] || '.')
const v = await open(prj, { style: a.style, scale: +a.scale })
const info = await v.info()
const outDir = join(prj.dir, 'out'); mkdirSync(outDir, { recursive: true })
const doFilm = !!a.film, doAt = !!a.at, doStill = !!a.still || (!doFilm && !doAt)

if (doStill) {
  const f = typeof a.still === 'string' ? a.still : join(outDir, `${info.style}.png`)
  mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, Buffer.from(await v.shot(info.timing.draw), 'base64')); console.log('still', f)
}
if (doAt) for (const P of String(a.at).split(',').map(Number)) {
  const f = join(outDir, `${info.style}-p${Math.round(P * 100)}.png`)
  writeFileSync(f, Buffer.from(await v.shotP(P), 'base64')); console.log('progress', P, f)
}
if (doFilm) {
  const f = typeof a.film === 'string' ? a.film : join(outDir, `${info.style}.mp4`); mkdirSync(dirname(f), { recursive: true })
  const fps = +a.fps, n = Math.round(info.DURATION * fps)
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', f], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let i = 0; i < n; i++) { const b = Buffer.from(await v.shot(i / fps, 'jpeg', 0.93), 'base64'); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)) }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r))
  console.log('film', f, `${n} frames, ${info.DURATION} s`)
}
if (v.errors.length) { console.log('page errors:', v.errors); process.exitCode = 1 }
await v.close()
