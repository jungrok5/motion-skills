// node <skill>/scripts/check.mjs <piece> [--style id | --all]
// For each hand on this piece, fails (exit 1) unless:
//   loads    the page loads without errors or 404s
//   determ   the still renders to the same pixels twice (no Math.random, no clock)
//   grows    the drawing changes between every eighth of its progress (no dead air), starting from the bare sheet
//   still    the finished still differs from the bare sheet over a real share of the picture (something was drawn)
//   lives    if the piece lives (seconds.live > 0): life frames differ from the still, and the loop's ends match
// and reports how long a still takes.
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { SKILL, piece, open, args } from './_lib.mjs'

const a = args(process.argv.slice(2))
const prj = piece(a._[0] || '.')
const { STYLE_IDS } = await import(pathToFileURL(join(SKILL, 'lib/styles/index.js')).href)
const v = await open(prj, { style: a.style && a.style !== true ? a.style : undefined })
const first = (await v.info()).style
const ids = a.all ? STYLE_IDS : [first]
let bad = 0
console.log(`piece ${prj.dir}`)
for (const id of ids) {
  const r = await v.page.evaluate(async (id) => {
    const out = { id, fails: [] }
    try { await window.doodle.setStyle(id) } catch (e) { out.missing = true; return out }
    const D = window.doodle, c = D.canvas, x = c.getContext('2d', { willReadFrequently: true })
    const grab = () => x.getImageData(0, 0, c.width, c.height).data
    const hash = (d) => { let h = 2166136261; for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619) } return (h >>> 0).toString(16) }
    const diff = (p, q) => { let n = 0, m = 0; for (let i = 0; i < p.length; i += 16) { m++; if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 24) n++ } return n / m }
    let t0 = performance.now(); D.drawAt(1, 0); out.ms = Math.round(performance.now() - t0)
    const s1 = grab(); out.hash = hash(s1)
    await D.setStyle(id); D.drawAt(1, 0); const s2 = grab()
    if (hash(s2) !== out.hash) out.fails.push('determ: the still changed between two renders')
    D.drawAt(0, 0); const bare = grab()
    out.drawn = diff(bare, s1)
    if (out.drawn < 0.15) out.fails.push(`still: only ${(out.drawn * 100).toFixed(1)}% of the picture differs from the bare sheet`)
    let prev = bare, quiet = []
    for (let k = 1; k <= 8; k++) { D.drawAt(k / 8, 0); const f = grab(), d = diff(prev, f); if (d < 0.002) quiet.push(`${(k - 1) * 12.5}–${k * 12.5}%`); prev = f }
    if (quiet.length) out.fails.push(`grows: nothing visible changes during ${quiet.join(', ')} of the drawing`)
    const T = D.timing
    if (T.live > 0) {
      D.drawAt(1, T.live / 2); const mid = grab()
      if (diff(s1, mid) < 0.001) out.fails.push('lives: nothing moves once alive')
      D.drawAt(1, T.live - 1e-3); const end = grab()
      D.drawAt(1, 1e-3); const beg = grab()
      if (diff(end, beg) > Math.max(0.02, diff(s1, mid))) out.fails.push('lives: the loop jumps at its seam')
    }
    return out
  }, id)
  if (r.missing) { console.log(`  ${id.padEnd(16)} — not written`); if (!a.all) bad++; continue }
  const ok = r.fails.length === 0
  if (!ok) bad++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(16)} still ${String(r.ms).padStart(5)} ms · drawn ${(r.drawn * 100).toFixed(0)}% · ${r.hash}${ok ? '' : '\n         ' + r.fails.join('\n         ')}`)
}
if (v.errors.length) { bad++; console.log('  FAIL loads:', v.errors.join(' | ')) }
console.log(bad ? `${bad} failing` : 'all passing')
process.exitCode = bad ? 1 : 0
await v.close()
