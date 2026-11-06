// node scripts/render.mjs <out.mp4> [fps=30] [w=720] — the scripted demo, frame by frame through renderAt(t), to MP4
import { createRequire } from 'node:module'
import { execSync, spawn } from 'node:child_process'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))) }
const [out, fpsArg, wArg] = process.argv.slice(2)
const fps = +(fpsArg || 30), W = +(wArg || 720), Hh = Math.round(W * 5 / 4 / 2) * 2
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 1 })
await page.goto(`http://localhost:${process.env.PORT || 8765}/index.html?still`)
await page.waitForFunction(() => window.live)
await page.evaluate(([w, h]) => { const s = document.getElementById('stage'); s.style.cssText = `width:${w}px;height:${h}px;max-height:none;aspect-ratio:auto;border-radius:0` }, [W, Hh])
await page.waitForTimeout(100)
const dur = await page.evaluate(() => window.live.DURATION)
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
const n = Math.round(dur * fps)
for (let i = 0; i < n; i++) {
  const b64 = await page.evaluate((t) => { window.live.renderAt(t); return document.getElementById('cv').toDataURL('image/jpeg', 0.92).split(',')[1] }, i / fps)
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r))
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
await browser.close()
console.log('wrote', out, n, 'frames')
