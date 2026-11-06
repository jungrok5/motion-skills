// node scripts/poses.mjs <out.png> — a pose sheet: the head turned to its limits (left/right, up/down, tilts) and
// the faces, each drawn straight from params (no idle), to check nothing bends or tears at the extremes
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))) }
const out = process.argv[2]
const POSES = [
  ['정면', {}], ['왼쪽 끝', { angleX: -30, eyeBallX: -0.8 }], ['오른쪽 끝', { angleX: 30, eyeBallX: 0.8 }], ['위', { angleY: 30, eyeBallY: 0.6 }],
  ['아래', { angleY: -30, eyeBallY: -0.6 }], ['기울기 왼', { angleZ: -30 }], ['기울기 오른', { angleZ: 30 }], ['대각 끝', { angleX: 30, angleY: 30, angleZ: 30, bodyX: 10, bodyZ: 10 }],
  ['반대 대각', { angleX: -30, angleY: -30, angleZ: -30, bodyX: -10, bodyZ: -10 }], ['웃음', { smile: 1, blush: 0.6 }], ['놀람', { surprise: 1, brow: 0.6, mouthOpen: 0.4, vowel: -0.8 }], ['시무룩', { sad: 1, eyeLOpen: 0.8, eyeROpen: 0.8 }],
  ['아 (말하기)', { mouthOpen: 1, vowel: 0 }], ['이', { mouthOpen: 0.5, vowel: 1 }], ['오', { mouthOpen: 0.7, vowel: -1 }], ['감은 눈', { eyeLOpen: 0, eyeROpen: 0 }],
]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
await page.goto(`http://localhost:${process.env.PORT || 8765}/index.html?still`)
await page.waitForFunction(() => window.live)
const shots = []
for (const [name, p] of POSES) {
  const b64 = await page.evaluate(([p]) => {
    const { sim, paint } = window.live
    sim.reset(); sim.snap(p); paint()
    return document.getElementById('cv').toDataURL('image/png')
  }, [p])
  shots.push([name, b64])
}
// tile them on one page
const html = `<body style="margin:0;background:#fff;display:grid;grid-template-columns:repeat(4,300px);gap:6px;font:14px sans-serif">${shots.map(([n, s]) => `<figure style="margin:0"><img src="${s}" style="width:300px;display:block"><figcaption>${n}</figcaption></figure>`).join('')}</body>`
await page.setContent(html)
await page.screenshot({ path: out, fullPage: true })
if (errs.length) console.log('ERRORS', errs)
await browser.close()
