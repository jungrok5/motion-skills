// Tarn Wyrm — ⑥ the light (looks keyed over time), ⑧ the shots, and the film.
{
  const { lerp } = DR, V = DR.vec;
  DR.light({
    dusk: { sun: [205, 9], keyCol: '#ffb489', keyK: 5.5, sunCol: '#ffc08a', sunK: 1.5, zen: '#22407c', hor: '#b0b8d0', gnd: '#2a2826', warm: '#ff9050', cover: 0.4, cloud: [260, 560, 1 / 900, 0.05],
      mist: 0.002, mistH: 12, haze: [0, 16, 0.006, 1 / 90], wind: [0.8, 0.4, 0.6], exposure: 1.05, rays: 0.6, grade: { lift: [0.006, 0.002, 0], gain: [1.05, 1, 0.95], sat: 1.1, contrast: 1.1 } },
    gloam: { sun: [205, 3], keyCol: '#ff9a78', keyK: 3.2, sunCol: '#ff9a70', sunK: 1.2, zen: '#182a5a', hor: '#8f94b4', gnd: '#201e22', warm: '#ff7040', cover: 0.5, cloud: [260, 560, 1 / 900, 0.05], stars: 0.2,
      mist: 0.003, mistH: 12, haze: [0, 18, 0.008, 1 / 90], wind: [0.8, 0.4, 0.8], exposure: 1.25, rays: 0.5, grade: { lift: [0.004, 0.002, 0.004], gain: [1.03, 1, 1], sat: 1.05, contrast: 1.12 } },
  }, [[0, 'dusk'], [B.TURN, 'dusk'], [B.END, 'gloam']]);
  const head = (t) => { const o = [0, 0, 0]; for (let k = -2; k <= 2; k++) V.mad(o, Wyrm.C.headAt(t + k * 0.07), 0.2, o); return o; };
  DR.film({
    title: 'Tarn Wyrm', duration: B.END, fps: 30, far: 9000,
    build: async ({ scene }) => { World.build(scene); Wyrm.build(scene); },
    ground: (x, z) => Math.max(World.height(x, z), 0),
    shots: [
      { name: 'open — the tarn at dusk', t0: 0, shadow: { span: 420, at: [0, 0, -60] }, shake: 0.15, cam: DR.rail([[0, [-6, 14, 70], [14, 40, -100], 46], [1, [-2, 6, 46], [12, 24, -80], 46]], 'out3') },
      { name: 'rise — out of the water and up', t0: B.RISE - 0.3, shadow: { span: 200, at: head }, shake: 0.4, cam: (u, t) => ({ p: [-26 + 6 * u, 3 + 3 * u, -6], l: head(Math.max(t, B.RISE)), fov: lerp(40, 46, u) }) },
      { name: 'turn — round the crag, and the call', t0: B.TURN - 0.5, shadow: { span: 260, at: head }, shake: 0.3, cam: (u, t) => ({ p: [-70 + 10 * u, 40 + 14 * u, 10], l: head(t), fov: lerp(34, 28, u) }) },
    ],
    fade: (t) => { const m = Math.max(1 - DR.smooth(0, 1.2, t), DR.smooth(B.OUT, B.END - 0.1, t)); return m > 0.002 ? [0.05, 0.06, 0.09, m] : null; },
  });
}
