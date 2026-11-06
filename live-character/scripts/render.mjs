// node <skill>/scripts/render.mjs <project> [--out out/demo.mp4] [--fps 30] [--w 720] [--stills 2,5.5]
// The character's demo (character.demo), frame by frame through renderAt(t): an MP4 (H.264, ffmpeg), or PNG stills.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { project, open, args } from './_lib.mjs'
const a = args(process.argv.slice(2), { fps: 30, w: 720 })
const prj = project(a._[0] || '.')
const W = +a.w, H = Math.round(W * 5 / 4 / 2) * 2
const { page, errors, close } = await open(prj, { w: W, h: H })
const dur = await page.evaluate(() => window.live.DURATION)
const shot = (t, type = 'png') => page.evaluate(([t, type]) => { window.live.renderAt(t); return window.live.canvas.toDataURL('image/' + type, 0.92).split(',')[1] }, [t, type])
if (a.stills) {
  const out = a.out || join(prj.dir, 'out'); mkdirSync(out, { recursive: true })
  const { writeFileSync } = await import('node:fs')
  for (const t of String(a.stills).split(',').map(Number)) writeFileSync(join(out, `still-${t.toFixed(2)}.png`), Buffer.from(await shot(t), 'base64'))
  console.log('stills in', out)
} else {
  const out = a.out || join(prj.dir, 'out', 'demo.mp4'); mkdirSync(dirname(out), { recursive: true })
  const fps = +a.fps, n = Math.round(dur * fps)
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let i = 0; i < n; i++) { const b = Buffer.from(await shot(i / fps, 'jpeg'), 'base64'); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)) }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r))
  console.log('wrote', out, `${n} frames, ${dur} s`)
}
if (errors.length) console.log('page errors:', errors)
await close()
