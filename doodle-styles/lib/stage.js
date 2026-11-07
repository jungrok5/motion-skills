// lib/stage.js — the page player. index.html does:  import piece from './piece.js'; import { mount } from './lib/stage.js'; mount(piece)
// Query: ?style=<id> (try another hand without editing) · ?still (the finished picture only) · ?t=<s> (one moment)
//        ?live (loop only the life after the still) · ?bare (no controls) · ?scale=2
// window.doodle = { renderAt(t), drawAt(P, live), DURATION, timing, W, H, style, styleId, house, canvas, setStyle(id), passAt(t), passes(), ready }
import { renderer } from './doodle.js'
import { GROUPS, DEFAULT_STYLE, loadStyle, loadAll } from './styles/index.js'

const CSS = `
.dd-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;font:14px/1.4 system-ui,-apple-system,"Pretendard",sans-serif;color:#2b2522}
.dd-stage canvas{display:block;max-width:100%;height:auto;box-shadow:0 1px 3px rgba(0,0,0,.18),0 8px 30px rgba(0,0,0,.12);background:#fff}
.dd-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;max-width:100%}
.dd-bar select,.dd-bar button{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid #c9bfb2;background:#fffaf2;color:#2b2522;cursor:pointer}
.dd-cap{font-size:12px;opacity:.75;min-height:1.4em;text-align:center}
@media (prefers-color-scheme: dark){.dd-stage{color:#eee6da}.dd-bar select,.dd-bar button{background:#2a2622;color:#eee6da;border-color:#5a5048}}
`

// house: a URL of the studio's house-style.json (new-piece.mjs writes '../house-style.json'). The hand is chosen as
//   ?style=  >  piece.style (this piece only)  >  house.style (every piece in the studio)  >  the default
export async function mount(piece, { root = document.getElementById('stage') || document.body, house: houseUrl } = {}) {
  const q = new URLSearchParams(location.search)
  if (!document.getElementById('dd-css')) { const s = document.createElement('style'); s.id = 'dd-css'; s.textContent = CSS; document.head.appendChild(s) }
  const box = document.createElement('div'); box.className = 'dd-stage'; root.appendChild(box)
  const cnv = document.createElement('canvas'); box.appendChild(cnv)
  const scale = +(q.get('scale') || 1)
  let house = null
  if (houseUrl) { try { const r = await fetch(houseUrl, { cache: 'no-store' }); if (r.ok) house = await r.json() } catch { /* no house style yet */ } }
  let id = q.get('style') || piece.style || house?.style || DEFAULT_STYLE
  let R = null, t0 = 0, paused = false, raf = 0
  const cap = document.createElement('div'); cap.className = 'dd-cap'

  async function use(nid) {
    const style = await loadStyle(nid)
    id = nid
    R = renderer(cnv, piece, style, { scale, house })
    cnv.style.aspectRatio = `${R.W} / ${R.H}`
    cnv.style.width = `min(100%, ${Math.round(R.W / Math.max(1, R.H / 720))}px)`
    window.doodle = { ...R, canvas: cnv, setStyle: use, ready: true, styleId: nid, house }
    t0 = performance.now()
    return R
  }
  await use(id)

  const mode = q.has('still') ? 'still' : q.has('t') ? 'at' : q.has('live') ? 'live' : 'play'
  if (!q.has('bare')) {
    const bar = document.createElement('div'); bar.className = 'dd-bar'
    const sel = document.createElement('select'); sel.setAttribute('aria-label', 'style')
    const all = await loadAll(), have = new Set(all.map((s) => s.id))
    for (const g of GROUPS) {
      const og = document.createElement('optgroup'); og.label = g.ko
      for (const sid of g.ids) if (have.has(sid)) { const s = all.find((x) => x.id === sid), o = document.createElement('option'); o.value = sid; o.textContent = `${s.ko} · ${s.name}`; if (sid === id) o.selected = true; og.appendChild(o) }
      if (og.children.length) sel.appendChild(og)
    }
    sel.onchange = async () => { await use(sel.value); const u = new URL(location.href); u.searchParams.set('style', sel.value); history.replaceState(null, '', u); if (mode !== 'play') draw() }
    const again = document.createElement('button'); again.textContent = '↺ 다시 그리기'; again.onclick = () => { t0 = performance.now(); paused = false }
    const pause = document.createElement('button'); pause.textContent = '❚❚'; pause.onclick = () => { paused = !paused; pause.textContent = paused ? '▶' : '❚❚'; if (!paused) t0 = performance.now() - last * 1000 }
    bar.append(sel, again, pause); box.appendChild(bar)
  }
  box.appendChild(cap)

  let last = 0
  const draw = () => {
    if (mode === 'still') R.drawAt(1, 0)
    else if (mode === 'at') R.renderAt(+q.get('t'))
    cap.textContent = `${R.style.ko} — ${R.style.medium}`
  }
  if (mode === 'play' || mode === 'live') {
    const tick = (now) => {
      if (!paused) {
        const T = R.timing
        let t = (now - t0) / 1000
        if (mode === 'live') t = T.draw + T.hold + (T.live ? t % T.live : 0)
        else t = t % (T.total + 1) // a beat of the finished picture before it starts over
        last = Math.min(t, T.total)
        R.renderAt(last)
        cap.textContent = `${R.style.ko} · ${R.passAt(last) === 'finished' ? '완성' : R.passAt(last) === 'alive' ? '살아 움직임' : R.passAt(last)}`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  } else draw()
  return window.doodle
}
