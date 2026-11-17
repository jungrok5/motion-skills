// 「The Long Way Home」 — the traveller, as data (lib/rider.js reads it). Designed for this topic: a red fox who carries a
// potted lemon tree home. Mass: light (a small fox on a light step-through bike) → quick to start, quick to settle; the long
// brush tail and the scarf are what lag behind. Idle: the chest breathes on a ~3 s cycle, irregular blinks, ears twitch.
export const HANA = {
  name: 'Hana', kind: 'snout', R: 96, seed: 3,
  body: '#d8642c', headCol: '#de6a2f', belly: '#f6ead8', snout: .55, snoutCol: '#de6a2f', muzzle: '#f6ead8', nose: '#2a1d18',
  ears: 'pointed', earIn: '#3a2620', eye: '#231a15', head: .6, neck: .28, torso: 1.18, girth: .5,
  coat: '#d8642c',
  arm: { col: '#d8642c', sleeve: '#d8642c', hand: '#3a2620' },
  legs: { col: '#d8642c', trousers: '#c75a28', shoe: '#2e2420' },
  tail: { kind: 'brush', col: '#d8642c', tip: '#f6ece0', len: 1.5 },
  scarf: { col: '#2c8a7a', len: 1.3 },
  hat: { kind: 'beanie', col: '#e8b13a', pom: '#f4d77a' },
  bike: { col: '#3f72b8', frame: 'step', tyre: '#2a2826', saddle: '#5b3a28', metal: '#8f8d88', basket: '#c09356' },
  // the story object: a small lemon tree in a clay pot; its crown sways with the ride and lags the bumps
  cargo(ctx, M, W, at, st, J) {
    const H = { role: 'hero' }, sw = Math.sin((st.t || 0) * 2.1) * .03 + (st.acc || 0) * .12, [x, y] = at;
    M.shape(ctx, [[x - .2, y - .02], [x + .2, y - .02], [x + .15, y - .34], [x - .15, y - .34]].map(W), { fill: '#c2603c', seed: 501 + (st.boil || 0), smooth: false, ...H });
    M.line(ctx, [[x, y - .34], [x + sw * .5, y - .7], [x + sw, y - .9]].map(W), { col: '#6b4a2c', w: 4, seed: 502 + (st.boil || 0), role: 'hero' });
    const cx = x + sw, cy = y - 1.0, P = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, k = 1 + .14 * Math.sin(i * 2.7); return [cx + Math.cos(a) * .34 * k, cy + Math.sin(a) * .26 * k]; });
    M.shape(ctx, P.map(W), { fill: '#4f9a3e', seed: 503 + (st.boil || 0), ...H });
    for (const [dx, dy] of [[.12, .05], [-.16, -.06]]) M.shape(ctx, [[cx + dx - .07, cy + dy], [cx + dx, cy + dy - .06], [cx + dx + .07, cy + dy], [cx + dx, cy + dy + .07]].map(W), { fill: '#f4d23c', seed: 504 + dx * 100 + (st.boil || 0), lw: 1.6, ...H });
  },
};
