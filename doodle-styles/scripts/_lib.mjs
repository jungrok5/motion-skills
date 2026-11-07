// scripts/_lib.mjs — shared by the scripts: find the piece, serve it, open it in headless Chromium.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname, extname, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function chromium() {
  const require = createRequire(import.meta.url)
  try { return require('playwright').chromium } catch { return require(join(execSync('npm root -g').toString().trim(), 'playwright')).chromium }
}

/** a piece folder (piece.js + index.html); the served root is the nearest folder above it holding lib/doodle.js */
export function piece(dir = '.') {
  const p = resolve(dir)
  if (!existsSync(join(p, 'piece.js'))) throw new Error(`${p}: no piece.js here`)
  let root = p
  while (!existsSync(join(root, 'lib', 'doodle.js'))) { const up = dirname(root); if (up === root) throw new Error('no lib/doodle.js above ' + p); root = up }
  return { dir: p, root, url: '/' + relative(root, p).split(sep).filter(Boolean).map(encodeURIComponent).join('/') + (p === root ? '' : '/') }
}
export async function loadPiece(dir) { return (await import(pathToFileURL(join(resolve(dir), 'piece.js')).href + '?' + Date.now())).default }

/** the house style: house-style.json in the folder or the nearest one above it */
export function findHouse(dir = '.') {
  let d = resolve(dir)
  for (;;) { const f = join(d, 'house-style.json'); if (existsSync(f)) return f; const up = dirname(d); if (up === d) return null; d = up }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }
export function serve(root) {
  return new Promise((ok) => {
    const srv = createServer(async (req, res) => {
      try {
        let f = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
        if (!f.startsWith(root)) throw 0
        if ((await stat(f)).isDirectory()) f = join(f, 'index.html')
        res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(await readFile(f))
      } catch { res.writeHead(404); res.end('not found') }
    })
    srv.listen(0, '127.0.0.1', () => ok({ port: srv.address().port, close: () => srv.close() }))
  })
}

/** open the piece's page bare (no controls, nothing playing) with a style; collects page errors */
export async function open(prj, { style, scale = 1, query = '' } = {}) {
  const server = await serve(prj.root)
  const browser = await chromium().launch()
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1')) errors.push(`${r.status()} ${r.url()}`) })
  const qs = new URLSearchParams(query); qs.set('bare', ''); qs.set('t', '0'); qs.set('scale', String(scale)); if (style) qs.set('style', style)
  await page.goto(`http://127.0.0.1:${server.port}${prj.url}?${qs.toString().replace(/=(&|$)/g, '$1')}`)
  await page.waitForFunction(() => window.doodle && window.doodle.ready, null, { timeout: 30000 })
  const api = {
    page, browser, errors,
    setStyle: (id) => page.evaluate((id) => window.doodle.setStyle(id).then(() => true), id),
    /** render time t (s) and return the canvas as a base64 PNG / JPEG */
    shot: (t, type = 'png', q = 0.92) => page.evaluate(([t, type, q]) => { window.doodle.renderAt(t); return window.doodle.canvas.toDataURL('image/' + type, q).split(',')[1] }, [t, type, q]),
    /** render drawing progress P (0..1) at life time `live` */
    shotP: (P, live = 0, type = 'png') => page.evaluate(([P, live, type]) => { window.doodle.drawAt(P, live); return window.doodle.canvas.toDataURL('image/' + type, 0.92).split(',')[1] }, [P, live, type]),
    info: () => page.evaluate(() => ({ W: window.doodle.W, H: window.doodle.H, DURATION: window.doodle.DURATION, timing: window.doodle.timing, style: window.doodle.styleId, passes: window.doodle.passes() })),
    close: async () => { await browser.close(); server.close() },
  }
  return api
}

export function args(argv, defaults = {}) {
  const out = { _: [], ...defaults }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('='), k = eq > 0 ? a.slice(2, eq) : a.slice(2), v = eq > 0 ? a.slice(eq + 1) : argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
      out[k] = k in out && k !== '_' && out[k] !== defaults[k] ? [].concat(out[k], v) : v // a repeated flag collects (--set a=1 --set b=2)
    } else out._.push(a)
  }
  return out
}
