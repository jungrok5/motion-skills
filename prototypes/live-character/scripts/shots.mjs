// node scripts/shots.mjs <outdir> t1 t2 ... — stills of the scripted demo at those times (canvas only)
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))) }
const [out, ...ts] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
const errs = []
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
page.on('pageerror', (e) => errs.push(String(e)))
await page.goto(`http://localhost:${process.env.PORT || 8765}/index.html?still`)
await page.waitForFunction(() => window.live)
for (const t of ts) {
  await page.evaluate((t) => window.live.renderAt(+t), t)
  await page.locator('#cv').screenshot({ path: `${out}/t${String(t).padStart(5, '0')}.png` })
}
if (errs.length) console.log('ERRORS', errs)
await browser.close()
