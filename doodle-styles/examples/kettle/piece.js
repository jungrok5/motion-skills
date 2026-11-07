// 저녁 주전자 — a red enamel kettle coming to the boil on a stove by an evening window; steam keeps rising.
// Made from BRIEF.md (a topic none of the style references drew). 4:5 portrait, light from the window on the RIGHT.
export default {
  title: '저녁 주전자',
  size: [1080, 1350],
  style: 'woodblock',
  light: [0.75, -0.66], // toward the window: up and to the right
  seconds: { draw: 7, hold: 1, live: 4 }, // after it is drawn, the steam rises for a 4-second loop
  scene(K, t) {
    const out = []
    // the kitchen: a sage wall, the evening window (the light source), a steel stove top
    out.push({ region: K.rect(-10, -10, 1100, 930), color: '#7d958c', role: 'bg', name: 'wall', depth: 0.95, form: 0.1 })
    const win = K.rect(640, 110, 330, 470)
    out.push({ region: K.rect(622, 92, 366, 506), color: '#e9e1cf', name: 'window frame', form: 0.1, depth: 0.85 })
    out.push({ region: win, color: '#f2c879', role: 'glow', name: 'evening sky', depth: 1 })
    out.push({ region: [[640, 470], [700, 430], [760, 455], [830, 410], [900, 445], [970, 420], [970, 580], [640, 580]], color: '#8a6f73', name: 'far roofs', depth: 1, form: 0, contour: false })
    out.push({ line: [[805, 110], [805, 580]], color: '#e9e1cf', w: 12, name: 'mullion', depth: 0.85 })
    out.push({ line: [[640, 345], [970, 345]], color: '#e9e1cf', w: 12, name: 'transom', depth: 0.85 })
    out.push({ region: [[560, 920], [1060, 920], [1000, 760], [620, 760]].map(([x, y]) => [x, y]), color: '#f0c46e', role: 'highlight', name: 'window light on the wall', depth: 0.9 })
    out.push({ region: [[-10, 900], [1090, 900], [1090, 1360], [-10, 1360]], color: '#4f555c', role: 'ground', name: 'stove top', depth: 0.3, grain: 0 })
    out.push({ line: [[-10, 901], [1090, 901]], color: '#2f3338', w: 4, name: 'stove edge' })
    out.push({ region: K.ellipse(500, 1080, 300, 72), color: '#24272b', name: 'burner grate', form: 0.2, depth: 0.3 })

    // the kettle: a lathe profile (wide belly, sloping shoulder, lid), spout to the left, bail handle above
    const cx = 500, base = 1070
    const prof = [[0, 0], [205, -6], [232, -40], [236, -110], [214, -190], [168, -250], [110, -284], [0, -292]] // right half: [x, y up]
    const side = (sgn) => K.smooth(prof.map(([x, y]) => [cx + sgn * x, base + y]), false, 6)
    const bodyPts = [...side(1), ...side(-1).reverse()]
    out.push({ region: K.ellipse(cx - 70, base + 8, 280, 40), color: '#141414', role: 'shadow', strength: 0.6, name: 'kettle shadow' })
    out.push({ region: K.tube([[cx - 190, base - 120], [cx - 270, base - 190], [cx - 320, base - 270], [cx - 342, base - 300]], 34, 13, false), color: '#b5382a', name: 'spout', form: 0.8, depth: 0.25 })
    out.push({ region: bodyPts, color: '#c8402e', name: 'kettle', form: 0.95, depth: 0.25 })
    out.push({ region: K.ellipse(cx, base - 286, 118, 22), color: '#a83324', name: 'lid', form: 0.5, depth: 0.25 })
    out.push({ region: K.blob(cx, base - 320, 30, { sx: 1.1, sy: 0.7, seed: 4, wob: 0.06 }), color: '#2b2523', name: 'knob', form: 0.9, role: 'detail' })
    out.push({ region: K.tube([[cx - 150, base - 250], [cx - 150, base - 420], [cx, base - 470], [cx + 150, base - 420], [cx + 150, base - 250]], 11, 11, false), color: '#3a302b', name: 'handle', form: 0.6, role: 'detail' })
    out.push({ region: K.softBox(cx + 60, base - 120, 210, 56, 6), color: '#efe6d2', name: 'enamel band', form: 0.6, depth: 0.25, role: 'detail' })

    // a mug waiting on the right
    const mx = 860, mb = 1150
    out.push({ region: K.ellipse(mx + 30, mb + 6, 110, 22), color: '#141414', role: 'shadow', strength: 0.5, name: 'mug shadow' })
    out.push({ region: K.tube([[mx + 88, mb - 150], [mx + 150, mb - 130], [mx + 150, mb - 60], [mx + 88, mb - 40]], 13, 13, false), color: '#ddd1b8', name: 'mug handle', form: 0.6 })
    out.push({ region: [...K.arc(mx, mb - 210, 95, 20, Math.PI, 0, 20), ...K.arc(mx, mb - 6, 95, 24, 0, Math.PI, 20)], color: '#efe6d2', name: 'mug', form: 0.85, depth: 0.2 })
    out.push({ region: K.ellipse(mx, mb - 210, 88, 17), color: '#5b3a28', name: 'tea', form: 0.2, role: 'detail' })

    // steam from the spout: three ribbons that rise and curl; with t they drift up and sway (period 4 s)
    const tip = [cx - 342, base - 300]
    for (let s = 0; s < 3; s++) {
      const ph = (t / 4 + s / 3) % 1, pts = []
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, rise = 40 + u * 360 + ph * 60
        pts.push([tip[0] - 10 + Math.sin(u * 5 + s * 2 + (t / 4) * Math.PI * 2) * (14 + u * 46) + u * 30 * (s - 1), tip[1] - rise])
      }
      out.push({ line: pts, color: '#f4efe6', w: 7 - s * 1.5, role: 'steam', name: 'steam', depth: 0.2 })
    }
    return out
  },
}
