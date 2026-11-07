// __TITLE__ — write the subject here, in no style. The hand comes from the studio's house-style.json
// (or set `style` below to override it for this piece only). Read BRIEF.md first; replace every TODO.
export default {
  title: '__TITLE__',
  size: [__W__, __H__],
  // style: 'woodblock',              // only to override the house style for this piece
  light: [-0.6, -0.8],                // TOWARD the light: here up-left. Cast shadows fall the other way
  seconds: { draw: 7, hold: 1.5, live: 0 }, // live > 0: the scene moves after it is drawn (make it loop over `live`)
  scene(K, t) {
    const W = __W__, H = __H__, out = []
    // back to front. TODO: replace this placeholder still life with the brief's subject, built from its real structure
    out.push({ region: K.rect(-10, -10, W + 20, H * 0.62 + 10), color: '#d9d0c0', role: 'bg', name: 'wall', depth: 0.95 })
    out.push({ region: K.rect(-10, H * 0.62, W + 20, H * 0.38 + 10), color: '#8f6a4a', role: 'ground', name: 'table', depth: 0.3 })
    const cx = W / 2, cy = H * 0.66
    out.push({ region: K.ellipse(cx + 70, cy + 128, W * 0.17, 26), color: '#2e261e', role: 'shadow', strength: 0.5, name: 'shadow' })
    // a pear: a lathe profile (right half, x out from the axis, y up from the base), mirrored and leaning a little
    const half = [[0, 0], [62, 5], [108, 28], [130, 72], [124, 126], [98, 172], [72, 214], [58, 258], [46, 296], [24, 322], [0, 330]]
    const side = (sgn) => half.map(([x, y]) => [cx + sgn * x, cy + 130 - y])
    const pear = K.turn(K.smooth([...side(1), ...side(-1).reverse().slice(1, -1)], true, 6), cx, cy + 130, 6)
    out.push({ region: pear, color: '#c9b13e', name: 'pear', form: 0.9, depth: 0.3 })
    out.push({ region: K.tube([[cx + 34, cy - 196], [cx + 40, cy - 236], [cx + 58, cy - 262]], 6, 4), color: '#4b3a26', role: 'detail', name: 'stalk' })
    out.push({ line: [[cx - 62, cy + 20], [cx - 72, cy + 80]], color: '#f4efe0', w: 6, name: 'shine' }) // a light line is drawn as light
    return out
  },
}
