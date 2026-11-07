// node <skill>/scripts/sheet.mjs <piece> --all | --styles a,b,c | --group print   [--w 300] [--cols n] [--out file.jpg]
//      one subject in many hands: the way to choose a hand is on YOUR subject, side by side
// node <skill>/scripts/sheet.mjs <piece> --steps 6 [--style id]
//      one hand's drawing order: the piece at 1/6, 2/6 … of the drawing
// Labels are English names (the render container may lack Hangul fonts); the Korean names are in `styles.mjs list`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SKILL, piece, open, args } from './_lib.mjs'

const a = args(process.argv.slice(2), { w: 300 })
const prj = piece(a._[0] || '.')
const { GROUPS, STYLE_IDS } = await import(pathToFileURL(join(SKILL, 'lib/styles/index.js')).href)
const v = await open(prj, { style: a.style })
const info = await v.info()
let tiles
if (a.steps) {
  const n = +a.steps
  tiles = Array.from({ length: n }, (_, i) => ({ style: info.style, P: (i + 1) / n, label: i + 1 === n ? 'finished' : `${Math.round(((i + 1) / n) * 100)}%` }))
} else {
  const ids = a.all ? STYLE_IDS : a.group ? GROUPS.find((g) => g.key === a.group)?.ids || [] : a.styles ? String(a.styles).split(',') : [info.style]
  tiles = ids.map((id) => ({ style: id, P: a.at ? +a.at : 1 }))
}
const w = +a.w, cols = +(a.cols || Math.min(tiles.length, a.steps ? tiles.length : 6)), h = Math.round((w * info.H) / info.W)
const data = await v.page.evaluate(async ({ tiles, w, h, cols }) => {
  const pad = 10, lab = 26, rows = Math.ceil(tiles.length / cols)
  const sheet = document.createElement('canvas'); sheet.width = cols * (w + pad) + pad; sheet.height = rows * (h + lab + pad) + pad
  const x = sheet.getContext('2d'); x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, sheet.width, sheet.height)
  const missing = []
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    try { await window.doodle.setStyle(t.style) } catch { missing.push(t.style); continue }
    window.doodle.drawAt(t.P, 0)
    const cx = pad + (i % cols) * (w + pad), cy = pad + Math.floor(i / cols) * (h + lab + pad)
    x.imageSmoothingQuality = 'high'; x.drawImage(window.doodle.canvas, cx, cy, w, h)
    x.fillStyle = '#2b2522'; x.font = '600 14px system-ui, sans-serif'; x.textBaseline = 'top'
    x.fillText(t.label || `${window.doodle.style.name}`, cx + 2, cy + h + 6)
    if (!t.label) { x.fillStyle = '#8a7f72'; x.font = '12px ui-monospace, monospace'; const id = t.style; x.fillText(id, cx + w - x.measureText(id).width - 2, cy + h + 8) }
  }
  return { url: sheet.toDataURL('image/jpeg', 0.86).split(',')[1], missing }
}, { tiles, w, h, cols })
const out = a.out || join(prj.dir, 'out', a.steps ? `${info.style}-steps.jpg` : 'sheet.jpg')
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, Buffer.from(data.url, 'base64'))
console.log('sheet', out, `${tiles.length - data.missing.length} tiles`)
if (data.missing.length) console.log('not written yet:', data.missing.join(', '))
if (v.errors.length) { console.log('page errors:', v.errors); process.exitCode = 1 }
await v.close()
