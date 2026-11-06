// scripts/_lib.mjs — shared by the scripts: find the project, serve it, open it in headless Chromium.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname, extname, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export function chromium() {
  const require = createRequire(import.meta.url)
  try { return require('playwright').chromium } catch { return require(join(execSync('npm root -g').toString().trim(), 'playwright')).chromium }
}

/** a project folder (or an example): the one with character.js and index.html; the served root is the nearest folder
 *  holding lib/rig.js (the project itself once scaffolded, the skill folder for its examples) */
export function project(dir = '.') {
  const p = resolve(dir)
  if (!existsSync(join(p, 'character.js'))) throw new Error(`${p}: no character.js here`)
  let root = p
  while (!existsSync(join(root, 'lib', 'rig.js'))) { const up = dirname(root); if (up === root) throw new Error('no lib/rig.js above ' + p); root = up }
  return { dir: p, root, url: '/' + relative(root, p).split(sep).filter(Boolean).map(encodeURIComponent).join('/') + (p === root ? '' : '/') }
}
export async function loadCharacter(dir) { return (await import(pathToFileURL(join(resolve(dir), 'character.js')).href)).default }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
export function serve(root) {
  return new Promise((ok) => {
    const srv = createServer(async (req, res) => {
      try {
        let f = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
        if (!f.startsWith(root)) throw 0
        if ((await stat(f)).isDirectory()) f = join(f, 'index.html')
        res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f))
      } catch { res.writeHead(404); res.end('not found') }
    })
    srv.listen(0, '127.0.0.1', () => ok({ port: srv.address().port, close: () => srv.close() }))
  })
}

/** open the project's page (?still: one frame, no loop) with the stage sized w x h CSS px; collects errors */
export async function open(prj, { w = 720, h = 900, query = 'still', scheme = 'light', scale = 1 } = {}) {
  const server = await serve(prj.root)
  const browser = await chromium().launch()
  const page = await browser.newPage({ viewport: { width: Math.max(1000, w + 40), height: Math.max(900, h + 40) }, deviceScaleFactor: scale, colorScheme: scheme })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push(m.text()) })   // ERR_FAILED: the fonts we abort
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1')) errors.push(`${r.status()} ${r.url()}`) })
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())   // renders never wait on the network
  await page.goto(`http://127.0.0.1:${server.port}${prj.url}?${query}`)
  await page.waitForFunction(() => window.live)
  await page.evaluate(([w, h]) => { const s = document.getElementById('stage'); s.style.cssText = `width:${w}px;height:${h}px;max-height:none;aspect-ratio:auto;border-radius:0;border:0`; document.body.style.padding = '0'; window.dispatchEvent(new Event('resize')) }, [w, h])
  await page.waitForTimeout(120)
  return { page, browser, errors, close: async () => { await browser.close(); server.close() } }
}

export function args(argv, defaults = {}) {
  const out = { _: [], ...defaults }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); out[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true) } else out._.push(a)
  }
  return out
}
