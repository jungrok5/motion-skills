// 청룡 · 여의주 (The Blue Dragon and the Pearl) — light, cameras, and the film itself.
{
  const { smooth, pulse, lerp } = DR, V = DR.vec;
  // ── the light of the film: blue hour → the storm gathers → storm → the clouds open → golden sunrise ──
  const SUN = [165, 14], MOON = [196, 33];   // both stand in the last picture: the sun low on the right, the moon high on the left
  const cool = { lift: [0.0, 0.003, 0.010], gain: [0.97, 1.0, 1.06], sat: 0.96, contrast: 1.12 };
  DR.light({
    blue: { key: 'moon', moon: MOON, sun: [150, -9], keyCol: '#b4c8ff', keyK: 2.6, moonCol: '#eef2ff', moonK: 1.6, sunK: 0, zen: '#0d1c40', hor: '#4a629a', gnd: '#182030', warm: '#6a4f66', skyK: 1.25, amb: 1.25, stars: 0.75,
      air: 0.0004, mist: 0.0034, mistH: 14, fogCol: '#c8d4ff', cover: 0.16, shadowK: 0.7, cloud: [330, 640, 1 / 900, 0.045], haze: [0, 26, 0.010, 1 / 95], wind: [0.9, 0.3, 0.3], exposure: 2.0, bloom: 0.1, rays: 0, vignette: 0.38, grade: cool },
    omen: { key: 'moon', moon: MOON, sun: [150, -4], keyCol: '#a9c2ff', keyK: 0.35, moonCol: '#e6eeff', moonK: 0.25, sunK: 0, zen: '#111a28', hor: '#42536a', gnd: '#161c24', skyK: 1.4, amb: 1.2, stars: 0.05,
      air: 0.0006, mist: 0.005, mistH: 20, fogCol: '#b6c2dc', cover: 0.86, shadowK: 0.9, cloud: [210, 560, 1 / 820, 0.06], cloudDark: 0.35, cloudSpeed: 2.2, haze: [0, 36, 0.008, 1 / 95], wind: [0.9, 0.3, 1.9], exposure: 2.1, bloom: 0.09, rays: 0, vignette: 0.4, grade: { ...cool, sat: 0.92 } },
    storm: { key: 'sun', sun: [150, 30], moon: MOON, keyCol: '#d9e2f0', keyK: 3.4, sunK: 0, moonK: 0, zen: '#141c26', hor: '#46535f', gnd: '#161b20', skyK: 1.7, amb: 1.25, stars: 0,
      air: 0.0007, mist: 0.004, mistH: 24, fogCol: '#aab6c8', cover: 0.97, shadowK: 0.92, cloud: [150, 540, 1 / 800, 0.075], cloudDark: 0.5, cloudSpeed: 3.2, haze: [0, 40, 0.006, 1 / 95], wind: [0.9, 0.3, 2.5], wet: 1, rain: 0.95, exposure: 1.95, bloom: 0.1, rays: 0, vignette: 0.42,
      grade: { lift: [0, 0.003, 0.008], gain: [0.92, 1.0, 1.08], sat: 0.9, contrast: 1.16 } },
    gilt: { key: 'sun', sun: [150, 30], moon: MOON, keyCol: '#ffd9a0', keyK: 2.4, sunK: 0, moonK: 0, zen: '#141a22', hor: '#5a5248', gnd: '#1a1816', skyK: 1.3, amb: 1.1, stars: 0,
      air: 0.0007, mist: 0.004, mistH: 24, fogCol: '#d8c8b0', cover: 0.95, shadowK: 0.9, cloud: [150, 540, 1 / 800, 0.075], cloudDark: 0.6, cloudSpeed: 3.0, haze: [0, 40, 0.006, 1 / 95], wind: [0.9, 0.3, 2.2], wet: 1, rain: 0.8, exposure: 1.2, bloom: 0.12, rays: 0, vignette: 0.42,
      grade: { lift: [0.004, 0.002, 0.002], gain: [1.03, 1.0, 0.98], sat: 1.0, contrast: 1.14 } },
    turn: { key: 'sun', sun: [150, 12], moon: MOON, keyCol: '#ffc08a', keyK: 3.2, sunCol: '#ffc890', sunK: 1.4, moonK: 0.2, zen: '#1d3058', hor: '#8f9ab0', gnd: '#201e1e', warm: '#ff9048', skyK: 1, amb: 1.0, stars: 0,
      air: 0.0006, mist: 0.004, mistH: 22, fogCol: '#ffe2c4', cover: 0.7, shadowK: 0.85, cloud: [230, 600, 1 / 850, 0.06], cloudDark: 0.25, cloudSpeed: 2.2, haze: [0, 38, 0.010, 1 / 95], wind: [0.9, 0.3, 1.4], wet: 0.8, rain: 0.4, exposure: 1.25, bloom: 0.12, rays: 0.8, vignette: 0.34,
      grade: { lift: [0.006, 0.002, 0], gain: [1.05, 1.0, 0.96], sat: 1.06, contrast: 1.1 } },
    dawn: { key: 'sun', sun: SUN, moon: MOON, keyCol: '#ffc08c', keyK: 6.4, sunCol: '#ffc48a', sunK: 1.2, moonCol: '#f4f0e6', moonK: 0.45, zen: '#2a57a4', hor: '#b7c6de', gnd: '#34302c', warm: '#ff9a52', skyK: 1, amb: 1.0, stars: 0,
      air: 0.0004, mist: 0.0015, mistH: 14, fogCol: '#fff0e0', cover: 0.4, shadowK: 0.82, cloud: [300, 640, 1 / 900, 0.05], haze: [0, 22, 0.0035, 1 / 95], wind: [0.9, 0.3, 0.7], wet: 0.45, rain: 0.1, rainbow: 0, exposure: 1.02, bloom: 0.09, rays: 0.6, vignette: 0.3,
      grade: { lift: [0.008, 0.003, 0], gain: [1.07, 1.0, 0.93], sat: 1.14, contrast: 1.1 } },
    bow: { key: 'sun', sun: SUN, moon: MOON, keyCol: '#ffc08c', keyK: 6.4, sunCol: '#ffc48a', sunK: 1.2, moonCol: '#f4f0e6', moonK: 0.5, zen: '#2a57a4', hor: '#b7c6de', gnd: '#34302c', warm: '#ff9a52', skyK: 1, amb: 1.0,
      air: 0.0004, mist: 0.0015, mistH: 14, fogCol: '#fff0e0', cover: 0.36, shadowK: 0.82, cloud: [300, 640, 1 / 900, 0.05], haze: [0, 22, 0.0035, 1 / 95], wind: [0.9, 0.3, 0.6], wet: 0.3, rain: 0.06, rainbow: 1, exposure: 1.02, bloom: 0.09, rays: 0.6, vignette: 0.3,
      grade: { lift: [0.008, 0.003, 0], gain: [1.07, 1.0, 0.93], sat: 1.14, contrast: 1.1 } },
    tableau: { key: 'sun', keyDir: [112, 27], sun: [165, 30], moon: MOON, keyCol: '#fff0d6', keyK: 5.6, sunCol: '#ff9a62', sunK: 0.25, sunSize: 2.5, sunDisc: '#ff4a22', sunDiscK: 4, moonSize: 2.3, moonCol: '#f6f2ea', moonK: 0.8, zen: '#2456ac', hor: '#c6d6ee', gnd: '#3a3834', warm: '#000000', skyK: 1, amb: 1.05,
      air: 0.0004, mist: 0.0018, mistH: 9, fogCol: '#ffffff', cover: 0.3, shadowK: 0.8, cloud: [310, 640, 1 / 900, 0.045], haze: [0, 13, 0.006, 1 / 95], wind: [0.9, 0.3, 0.4], wet: 0.15, rain: 0, rainbow: 0.35, exposure: 1.04, bloom: 0.07, rays: 0.2, vignette: 0.3,
      grade: { lift: [0.004, 0.003, 0.002], gain: [1.03, 1.0, 0.98], sat: 1.14, contrast: 1.1 } },
  }, [[0, 'blue'], [B.EYE + 3, 'blue'], [B.THUNDER1 + 0.5, 'omen', 'io2'], [B.PEARL + 2.5, 'storm'], [B.SEIZE, 'storm'], [B.SEIZE + 1.4, 'gilt', 'out3'], [B.ROAR + 1.5, 'gilt'], [B.DAWN + 0.5, 'turn', 'io2'], [B.DAWN + 3.5, 'dawn'], [B.SKIM + 1, 'dawn'], [B.RAINBOW + 0.5, 'bow'], [B.TABLEAU - 2, 'bow'], [B.TABLEAU + 2, 'tableau', 'lin'], [B.END, 'tableau']]);

  // ── cameras ──
  const C = () => Yong.C, head = (t) => C().headAt(t), body = (a) => (t) => C().bodyAt(t, a);
  const beside = (a, side, up, back = 0) => (t) => { const p = C().bodyAt(t, a), q = C().bodyAt(t, a - 6), d = V.norm(V.sub(q, p)), s = V.norm(V.cross(d, [0, 1, 0])); return [p[0] + s[0] * side + d[0] * back, p[1] + up, p[2] + s[2] * side + d[2] * back]; };
  const smoothHead = (t) => { const o = [0, 0, 0]; for (let k = -2; k <= 2; k++) V.mad(o, head(t + k * 0.07), 0.2, o); return o; };
  const pearl = (t) => Yong.pearlAt(t);
  const HOME = [4, 10, 97], PEAKS = [0, 104, -230];
  const SHOTS = [
    { name: 'open — five peaks at blue hour', t0: B.OPEN, shadow: { span: 620, at: [0, 0, -90] }, shake: 0.12,
      cam: DR.rail([[0, [10, 52, 180], [0, 112, -230], 46], [1, HOME, PEAKS, 48]], 'out3') },
    { name: 'stir — something long under the lake', t0: B.STIR, shadow: { span: 300, at: [0, 0, -40] }, shake: 0.2,
      cam: DR.rail([[0, [74, 17, -22], (t) => { const p = C().bodyAt(t, 18); return [p[0], 0, p[2]]; }, 34], [1, [70, 15, -30], (t) => { const p = C().bodyAt(t, 18); return [p[0], 0, p[2]]; }, 30]], 'lin') },
    { name: 'pavilion — the wake passes the shore', t0: 16.5, shadow: { span: 150, at: [-66, 4, -18] }, shake: 0.18,
      cam: DR.rail([[0, [-90, 7.5, -40], [-52, 6, -4], 36], [1, [-86, 8.6, -37], [-44, 3, 6], 36]], 'io2') },
    { name: 'eye — the imugi looks out', t0: B.EYE - 0.4, shadow: { span: 46, at: (t) => head(t) }, shake: 0.1, near: 0.3,
      cam: (u, t) => { const h = smoothHead(t), f = V.norm(V.sub(head(t + 0.4), head(t - 0.4))), s = V.norm(V.cross(f, [0, 1, 0])), k = smooth(0.62, 1, u);
        return { p: [h[0] + f[0] * 6.5 - s[0] * 10.5, Math.max(1.0, h[1] + 1.8 + 3 * k), h[2] + f[2] * 6.5 - s[2] * 10.5], l: [h[0] + f[0] * 3.0, lerp(h[1] + 1.6, h[1] + 30, k * k), h[2] + f[2] * 3.0 - 30 * k * k], fov: lerp(26, 34, k) }; } },
    { name: 'omen — the sky closes', t0: B.OMEN, shadow: { span: 420, at: [0, 0, -60] }, shake: 0.3,
      cam: DR.rail([[0, [-26, 6, 76], [0, 96, -230], 52], [1, [-20, 5.2, 66], [6, 150, -220], 50]], 'io2') },
    { name: 'pearl — the yeouiju comes down', t0: B.PEARL - 0.3, shadow: { span: 420, at: [0, 0, -60] }, shake: 0.3,
      cam: (u, t) => { const p = pearl(t), k = smooth(0.74, 1, u); return { p: [34 - 6 * u, 3.2 + u, 16 - 8 * u], l: [lerp(p[0], 4, k), lerp(Math.min(p[1], 330), 3, k), lerp(p[2], -56, k)], fov: lerp(44, 36, u) }; } },
    { name: 'burst — out of the lake', t0: B.BURST - 0.25, shadow: { span: 240, at: [4, 20, -56] }, shake: 0.4,
      cam: (u, t) => { const h = smoothHead(Math.max(t, B.BURST)), k = smooth(0.0, 1, u); return { p: [46 - 6 * u, 2.6 + 2 * u, -14 + 4 * u], l: [lerp(4, h[0], k), Math.min(lerp(4, h[1] * 0.72, k), 150), lerp(-56, h[2], k)], fov: lerp(40, 46, u) }; } },
    { name: 'climb — up the crags into the storm', t0: 42.6, shadow: { span: 420, at: (t) => head(t) }, shake: 0.5, mirror: false,
      cam: (u, t) => { const h = smoothHead(t), b2 = C().bodyAt(t, 34); return { p: [-128 + 30 * u, 96 + 60 * u, -40 - 40 * u], l: V.lerp(h, b2, 0.4), fov: lerp(40, 34, u) }; } },
    { name: 'chase — through the clouds after the light', t0: 46.1, shadow: { span: 200, at: (t) => head(t) }, shake: 0.7, mirror: false,
      cam: (u, t) => { const p = beside(36 - 8 * u, 11 - 3 * u, 7)(t), pe = pearl(t); return { p, l: V.lerp(C().bodyAt(t, 8), pe, 0.1 + 0.08 * u), fov: 50, roll: 7 * Math.sin(u * 4) }; } },
    { name: 'seize — it takes the pearl', t0: 50.25, shadow: { span: 120, at: (t) => head(t) }, shake: 0.5, mirror: false,
      cam: (u, t) => { const pe = pearl(Math.min(t, B.SEIZE - 0.02)), h = smoothHead(t); return { p: [pe[0] + 13 - 3 * u, pe[1] + 1.5, pe[2] - 15 + 2 * u], l: V.lerp(pe, h, 0.3), fov: lerp(40, 30, u) }; } },
    { name: 'becoming — blue and gold run down the body', t0: 51.7, shadow: { span: 110, at: (t) => C().bodyAt(t, Math.max(8, Yong.front(t))) }, shake: 0.35, mirror: false,
      cam: (u, t) => { const a = Math.min(100, Math.max(10, Yong.front(t) + 4)); return { p: beside(a + 10, 15, 4.5)(t), l: C().bodyAt(t, a - 6), fov: 40 }; } },
    { name: 'roar — the Blue Dragon', t0: B.ROAR - 0.35, shadow: { span: 70, at: (t) => head(t) }, shake: 0.3, mirror: false, near: 0.3,
      cam: (u, t) => { const h = smoothHead(t), f = V.norm(V.sub(head(t + 0.4), head(t - 0.4))), s = V.norm(V.cross(f, [0, 1, 0])); const d = lerp(21, 15, DR.ease.out3(u));
        return { p: [h[0] + f[0] * d + s[0] * 8, h[1] - 3.5 + 2 * u, h[2] + f[2] * d + s[2] * 8], l: [h[0] + f[0] * 4, h[1] + 1.2, h[2] + f[2] * 4], fov: 36 }; } },
    { name: 'dawn — the clouds open', t0: B.DAWN, shadow: { span: 640, at: [0, 0, -60] }, shake: 0.25,
      cam: (u, t) => { const h = smoothHead(t); return { p: [-10 + 30 * u, 20 + 10 * u, 150 - 16 * u], l: V.lerp([40, 150, -160], h, 0.55 + 0.25 * u), fov: lerp(50, 44, u) }; } },
    { name: 'pass — past the pavilion eaves', t0: 61.6, shadow: { span: 150, at: [-60, 6, -20] }, shake: 0.4,
      cam: (u, t) => { const h = smoothHead(t), b2 = C().bodyAt(t, 22), k = smooth(0.35, 0.8, u); return { p: [-37 - 2 * u, 5.2 + 1.2 * u, -66 + 3 * u], l: V.lerp(V.lerp([-66, 12, -20], h, 0.6), b2, k * 0.7), fov: lerp(34, 40, u) }; } },
    { name: 'skim — over the lake at the lens', t0: 64.7, shadow: { span: 220, at: (t) => head(t) }, shake: 0.35,
      cam: (u, t) => { const h = smoothHead(t); return { p: [9, 1.5 + 0.5 * u, 27 + 2 * u], l: [h[0], Math.max(h[1], 2.2) + 1, h[2]], fov: lerp(28, 44, smooth(0.3, 0.95, u)) }; } },
    { name: 'rainbow — the valley after the rain', t0: 68.35, shadow: { span: 420, at: [-30, 0, -20] }, shake: 0.25,
      cam: (u, t) => { const h = smoothHead(t); return { p: [-14 - 10 * u, 5 + 5 * u, -66 - 6 * u], l: V.lerp([-20, 42, 60], h, 0.42), fov: lerp(52, 48, u) }; } },
    { name: 'tableau — sun, moon, five peaks, the dragon', t0: B.TABLEAU, shadow: { span: 640, at: [0, 0, -90] }, shake: 0.1,
      cam: DR.rail([[0, [4, 10, 97], [0, 100, -230], 47], [1, [4, 24, 124], [0, 104, -230], 49]], 'io2') },
  ];

  DR.film({
    title: '청룡 · 여의주', duration: B.END, fps: 30, far: 14000, near: 0.5, seed: 7,
    build: async ({ scene }) => {
      const T = (label, fn) => { const a = performance.now(), r = fn(); DR.progress(0.1 + 0.8 * (T.i = (T.i || 0) + 1) / 6, label); if (DR.P.has('log')) console.log(`[build] ${label} ${(performance.now() - a).toFixed(0)} ms`); return r; };
      T('land', () => World.build(scene)); await DR.breathe();
      T('dragon', () => Yong.build(scene)); await DR.breathe();
      if (typeof Stage !== 'undefined') { T('stage', () => Stage.build(scene)); await DR.breathe(); }
      T('weather', () => Weather.build());
    },
    shots: SHOTS, ground: (x, z) => Math.max(World.height(x, z), 0),
    // white at the seizing, mist at the very end and beginning so the loop closes
    fade: (t) => { const w = 0.92 * Math.exp(-Math.max(0, t - B.SEIZE) * 3.2) * (t >= B.SEIZE - 0.02 ? 1 : 0); if (w > 0.004) return [1, 0.97, 0.9, w];
      const m = Math.max(1 - smooth(0, 1.6, t), smooth(B.OUT, B.END - 0.15, t)); return m > 0.002 ? [0.62, 0.68, 0.82, m] : null; },
  });
}
