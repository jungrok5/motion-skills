// lib/styles/_book.js — small helpers shared by the folk-tale, scrapbook and risograph hands (not a style).

/** split a polyline into the runs a viewer can see: points inside any occluder (closed outlines) are dropped.
 *  For marks drawn inside one shared layer, where a layer `cut` would also erase the neighbours' marks. */
export function visibleRuns(K, pts, occ, step = 4) {
  if (!occ.length) return [pts]
  const boxes = occ.map((o) => [o, K.bbox(o)])
  const hidden = ([x, y]) => boxes.some(([o, b]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && K.inside(o, x, y))
  const out = []
  let cur = []
  for (const p of K.densify(pts, step)) {
    if (hidden(p)) { if (cur.length > 1) out.push(cur); cur = [] } else cur.push(p)
  }
  if (cur.length > 1) out.push(cur)
  return out
}

/** a signature of what a plate-sampling hand depends on: the regions and the DARK lines, not the light ones. In a living
 *  piece the steam (a light line) moves every frame; a hand that knocks light lines out itself can key a cache on this
 *  and skip re-sampling (and even re-building) the value plate for every frame of life. */
export function sceneKey(S, K) {
  const reg = S.regions.map((r) => `${r.pts.length}:${r.color}:${r.role}:${Math.round(r.bbox.x0 * 3 + r.bbox.y1 * 5 + r.area / 50)}`).join(',')
  const dark = S.lines.filter((l) => !K.isLight(l.color)).map((l) => `${l.pts.length}:${l.color}:${Math.round(l.pts[0][0] * 3 + l.pts[0][1] * 5 + l.pts[l.pts.length - 1][0])}`).join(',')
  return `${S.W}x${S.H}|${S.light.map((v) => v.toFixed(3))}|${reg}|${dark}`
}

/** S.colorAt / S.tone without the engine plate's one shortcut: the plate strokes every line over everything, so a
 *  line that runs BEHIND a later region (a table edge behind the fruit) shows through. Where a sample sits on a line
 *  that is hidden there, take the colour of the region on top instead. Returns { colorAt(x, y), tone(x, y) }. */
export function cleanPlate(S, K, { skipLight = false } = {}) {
  const hiddenLines = []
  for (const l of S.lines) {
    // skipLight: light lines (steam, a white bar) are left out of the plate everywhere — a hand that knocks them out
    // itself can then cache what it cut from the plate across frames of life, while the steam moves
    const occ = skipLight && K.isLight(l.color) ? 'all' : S.occluders(l, { light: false })
    if (!occ.length) continue
    const b = K.bbox(l.pts), pad = l.w / 2 + 2
    hiddenLines.push({ pts: l.pts, pad, b: { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad }, occ: occ === 'all' ? null : occ.map((o) => [o, K.bbox(o)]) })
  }
  const near = (pts, x, y, d) => {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1
      const t = K.clamp(((x - ax) * dx + (y - ay) * dy) / l2), px = ax + t * dx - x, py = ay + t * dy - y
      if (px * px + py * py < d * d) return true
    }
    return false
  }
  const covered = (x, y) => {
    for (const h of hiddenLines) {
      if (x < h.b.x0 || x > h.b.x1 || y < h.b.y0 || y > h.b.y1) continue
      if (!near(h.pts, x, y, h.pad)) continue
      if (!h.occ || h.occ.some(([o, b]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && K.inside(o, x, y))) return true
    }
    return false
  }
  const colorAt = (x, y) => {
    if (hiddenLines.length && covered(x, y)) { const r = S.regionAt(x, y); return r ? K.rgb(r.colorAt(x, y)) : K.rgb(S.bg) }
    return S.colorAt(x, y)
  }
  return { colorAt, tone: (x, y) => { const [r, g, b] = colorAt(x, y); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 } }
}
