// 감 세 알 — three persimmons on a celadon dish, a fallen leaf, afternoon light from a window up-left.
// The subject in no style: regions in painter's order (back to front), each with its local colour.
// Any of the 32 hands draws this same scene; switch with ?style=<id> or `style` below.
export default {
  title: '감 세 알',
  size: [1080, 1080],
  style: 'watercolour',
  light: [-0.62, -0.78], // toward the window, up and to the left
  seconds: { draw: 7, hold: 2, live: 0 },
  scene(K) {
    const out = []
    // the room: a plaster wall, a wooden table seen a little from above, the window's light on the wall
    out.push({ region: K.rect(-10, -10, 1100, 652), color: '#d8cdbb', role: 'bg', name: 'wall', depth: 0.95, form: 0.1 })
    out.push({ region: K.displace(K.rect(60, 40, 300, 400), 10, 0.01, 4), color: '#efe4cc', role: 'highlight', name: 'window light', depth: 0.95 })
    out.push({ region: [[-10, 640], [1090, 640], [1090, 1090], [-10, 1090]], color: '#9b6a43', role: 'ground', name: 'table', grain: 0.03, depth: 0.3, form: 0.2 })
    out.push({ line: [[-10, 641], [1090, 641]], color: '#6f4a2e', w: 3, name: 'table edge', depth: 0.6 })

    // the dish and its shadow on the table (cast away from the light: down and to the right)
    out.push({ region: K.ellipse(600, 852, 365, 96), color: '#3b261a', role: 'shadow', strength: 0.55, name: 'dish shadow' })
    out.push({ region: K.ellipse(560, 820, 350, 92), color: '#cfd8c6', name: 'dish rim', form: 0.35, depth: 0.35 })
    out.push({ region: K.ellipse(565, 828, 285, 66), color: '#b9c6b0', name: 'dish well', form: 0.25, depth: 0.35, contour: false })

    // three persimmons: squarish, a little four-lobed, flat-topped; never a circle
    const fruit = (cx, cy, w, h, seed, rot) => {
      const n = 64, pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
        const k = 1 / (Math.abs(c) ** 2.7 + Math.abs(s) ** 2.7) ** (1 / 2.7), lobe = 1 + 0.035 * Math.cos(4 * (a + 0.4))
        const flat = s < 0 ? 1 - 0.1 * s * s : 1 // the shoulders are flatter than the base
        return [cx + c * k * (w / 2) * lobe, cy + s * k * (h / 2) * lobe * flat]
      })
      return K.turn(K.displace(pts, 6, 0.03, seed), cx, cy, rot)
    }
    const calyx = (cx, top, s, seed) => {
      const parts = []
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.75 + (seed % 3) * 0.1, len = s * (0.9 + (i % 2) * 0.25)
        const tip = [cx + Math.cos(a + Math.PI / 2) * len * 1.25, top + Math.sin(a + Math.PI / 2) * len * 0.3 - 4]
        const lf = K.leaf([cx, top], tip, s * 0.55, { bend: (i % 2 ? 0.06 : -0.06), seed: seed + i })
        parts.push({ region: lf.outline, color: '#6b6532', role: 'detail', name: 'calyx', form: 0.3, grain: a })
      }
      parts.push({ region: K.tube([[cx, top + 2], [cx + 3, top - 14], [cx + 9, top - 26]], 4.5, 3), color: '#4b3a26', role: 'detail', name: 'stem', form: 0.4 })
      return parts
    }
    const persimmon = (cx, cy, w, h, seed, rot) => [
      { region: K.ellipse(cx + 34, cy + h * 0.44, w * 0.5, 26), color: '#2e2a20', role: 'shadow', strength: 0.5, name: 'fruit shadow' },
      { region: fruit(cx, cy, w, h, seed, rot), color: '#e5732c', name: 'persimmon', form: 0.95, depth: 0.25 },
      ...calyx(cx + rot * 1.2, cy - h * 0.45, w * 0.2, seed),
    ]
    out.push(...persimmon(640, 704, 226, 196, 11, 6))   // the one behind
    out.push(...persimmon(452, 778, 250, 218, 23, -5))  // front left
    out.push(...persimmon(728, 800, 238, 206, 37, 3))   // front right

    // a fallen persimmon leaf on the table, turning orange at the tip
    const lf = K.leaf([196, 1000], [342, 930], 84, { bend: -0.07, seed: 5 })
    out.push({ region: K.translate(lf.outline, 10, 12), color: '#2e2214', role: 'shadow', strength: 0.4, name: 'leaf shadow' })
    out.push({ region: lf.outline, color: '#a7832f', name: 'leaf', form: 0.35, depth: 0.2, grain: -0.44 })
    out.push({ line: lf.midrib, color: '#6a5220', w: 2.2, name: 'midrib', depth: 0.2 })
    out.push({ line: [[196, 1000], [180, 1006], [164, 1004]], color: '#5a4320', w: 3, name: 'leaf stalk' })
    // frame it closer: everything on the table grows about the front edge, so the fruit fills the picture
    const Z = (pts) => pts.map(([x, y]) => [560 + (x - 560) * 1.24, 1010 + (y - 1010) * 1.24])
    return out.map((it) => (['wall', 'table', 'window light'].includes(it.name) ? it : it.region ? { ...it, region: Z(it.region) } : { ...it, line: Z(it.line) }))
  },
}
