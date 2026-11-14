// 청룡 · 여의주 — weather and effects: the tear in the clouds, lightning, rain, the eruption from the lake, the wake,
// the sparks of the transformation, spray, leaves.  All keyed to the beat sheet.
const Weather = {};
{
  const { smooth, pulse, lerp } = DR, FX = DR.fx;
  Weather.build = () => {
    const C = Yong.C, W = World.water, P0 = Yong.PEARL0;
    // the clouds tear open over the pearl; after the seizing the tear spreads until the whole sky is open
    DR.weather.rift = (t) => [P0[0], P0[2], lerp(75, 900, DR.ease.in2(smooth(B.SEIZE + 2.5, B.DAWN + 3, t))), pulse(t, B.PEARL - 0.6, B.TABLEAU, 2.2, 6)];
    // lightning
    FX.bolt({ t0: B.THUNDER1, from: [-380, 420, -700], to: [-330, 200, -760], seed: 3, k: 2.2, width: 2.2 });
    FX.bolt({ t0: B.BOLT1, from: [-150, 330, -230], to: [-112, 204, -214], seed: 5, k: 9 });
    FX.bolt({ t0: B.BOLT2, from: [150, 340, -160], to: [118, 221, -220], seed: 9, k: 10 });
    FX.bolt({ t0: B.BOLT3, from: [40, 360, -290], to: [4, 284, -246], seed: 13, k: 12, width: 1.4 });
    FX.bolt({ t0: B.BOLT3 + 0.22, from: [-60, 350, -220], to: [-10, 262, -180], seed: 17, k: 6 });
    const seize = (t) => { const a = t - B.SEIZE; return a < 0 || a > 2.5 ? 0 : 16 * Math.exp(-a * 2.2); };
    DR.weather.flash = (t) => { const f = FX.flashAt(t), s = seize(t); if (s > (f ? f[3] : 0)) { const p = Yong.pearlAt(t); return [p[0], p[1], p[2], s]; } return f; };
    DR.weather.glow = (t) => { const p = Yong.pearlAt(t); if (!p[3]) return null; return [p[0], p[1], p[2], p[3] * (t < B.SEIZE ? 1.6 : 0.9) * (1 + 0.12 * Math.sin(t * 5.1))]; };
    DR.camKick = (t) => 2.4 * pulse(t, B.BURST, B.BURST + 1.6, 0.05, 1.2) + 1.6 * pulse(t, B.ROAR, B.ROAR + 2.2, 0.15, 0.8) + 1.2 * (pulse(t, B.BOLT1, B.BOLT1 + 0.5, 0.03, 0.4) + pulse(t, B.BOLT2, B.BOLT2 + 0.5, 0.03, 0.4) + pulse(t, B.BOLT3, B.BOLT3 + 0.6, 0.03, 0.5)) + 1.3 * pulse(t, 62.7, 63.6, 0.2, 0.6) + 1.2 * pulse(t, 67.6, 68.4, 0.2, 0.5);
    // the pearl's halo and the shaft of light it comes down in
    FX.glow({ color: '#fff0c0', at: (t) => { const p = Yong.pearlAt(t); if (!p[3]) return null; const s = seize(t); return [p[0], p[1], p[2], (t < B.SEIZE ? 40 : 9) + s * 12, p[3] * (t < B.SEIZE ? 0.8 : 0.5) + s * 0.5]; } });
    FX.beam({ color: '#ffe9c0', at: (t) => { const k = pulse(t, B.PEARL - 0.3, B.SEIZE + 1.5, 2.5, 2); if (k <= 0) return null; const p = Yong.pearlAt(t); return { a: [p[0] - 14, -2, p[2] + 30], b: [p[0] + 6, 560, p[2] - 10], width: 20, k: 0.07 * k }; } });
    FX.rain({ count: 9000 });
    // the lake: the long shape under the surface, the head coming up, the eruption, the skim
    for (const a of [4, 30, 60]) W.wake((t) => { const p = C.bodyAt(t, a); return [p[0], p[1], p[2], 2.6]; }, B.STIR - 2, B.BURST - 1.5, 0.33, 0.30 - a * 0.002, 7);
    W.ring(B.EYE - 0.4, 14, 10, 0.9, 8); W.ring(B.EYE + 0.5, 17, 8, 0.6, 8);
    const E = [4, 0, -56];
    FX.splash({ t0: B.BURST - 0.07, at: E, power: 2.1, seed: 11 });
    for (let i = 0; i < 6; i++) W.ring(B.BURST + i * 0.28, E[0], E[2], 3.2 - i * 0.4, 13, 5.5, 4);
    // water pouring off the body as it climbs out
    FX.sprites({ count: 1300, seed: 21, kind: 'drop', gravity: 9.8, drag: 0.2, cover: 0.6, stretch: 2.2, bright: 1.4, soft: 1.2, init: (i, r) => { const t0 = B.BURST + r() * 4.2, a = r() * 80, p = C.bodyAt(t0, a), ang = r() * DR.TAU; return { p: [p[0] + Math.cos(ang) * 2.2, p[1] - 1, p[2] + Math.sin(ang) * 2.2], v: [Math.cos(ang) * 3, r.range(-2, 5), Math.sin(ang) * 3], t0, life: r.range(1.4, 2.8), size: r.range(0.1, 0.3), grow: 0.7, a: 0.85, col: [0.85, 0.92, 1] }; } });
    FX.sprites({ count: 260, seed: 22, kind: 'puff', gravity: 1.5, drag: 0.8, cover: 0.6, wind: 0.4, soft: 4, init: (i, r) => { const t0 = B.BURST + r() * 3.2, a = r() * 60, p = C.bodyAt(t0, a); return { p: [p[0], p[1], p[2]], v: [r.gauss() * 3, r.range(-3, 2), r.gauss() * 3], t0, life: r.range(1.5, 3.2), size: r.range(2.5, 6), grow: 2.4, a: r.range(0.2, 0.42), col: [0.82, 0.88, 0.95] }; } });
    // the transformation: sparks thrown off where the new colour arrives
    FX.sprites({ count: 2600, seed: 31, kind: 'spark', gravity: -1.2, drag: 1.3, cover: 0, lit: 0, bright: 5, soft: 1.5, init: (i, r) => { const t0 = B.SEIZE + r() * 5.6, a = Math.max(0, Yong.front(t0) + r.range(-5, 3)), p = C.bodyAt(t0, Math.min(a, 110)), ang = r() * DR.TAU, u2 = r.range(-1, 1), q = Math.sqrt(1 - u2 * u2), sp = r.range(4, 16);
      return { p: [p[0] + Math.cos(ang) * q * 2.4, p[1] + u2 * 2.4, p[2] + Math.sin(ang) * q * 2.4], v: [Math.cos(ang) * q * sp, u2 * sp + 2, Math.sin(ang) * q * sp], t0, life: r.range(0.7, 2.0), size: r.range(0.14, 0.42), grow: 0.3, a: 1, col: r() < 0.7 ? [1, 0.72, 0.28] : [0.5, 0.8, 1] }; } });
    // a ring of light and cloud at the seizing
    FX.sprites({ count: 500, seed: 33, kind: 'puff', gravity: 0, drag: 0.5, cover: 0.1, lit: 0, bright: 2.2, soft: 8, init: (i, r) => { const ang = r() * DR.TAU, sp = r.range(38, 62); return { p: [P0[0], P0[1], P0[2]], v: [Math.cos(ang) * sp, r.gauss() * 4, Math.sin(ang) * sp], t0: B.SEIZE + r() * 0.12, life: r.range(1.4, 2.6), size: r.range(5, 11), grow: 3, a: r.range(0.15, 0.4), col: [1, 0.85, 0.55] }; } });
    // the skim: a curtain of spray along the path
    FX.sprites({ count: 2200, seed: 41, kind: 'drop', gravity: 9.8, drag: 0.35, cover: 0.65, stretch: 1.8, bright: 1.6, soft: 1.2, init: (i, r) => { const t0 = 65.0 + r() * 2.5, p = C.bodyAt(t0, r() * 14 + 4), p2 = C.bodyAt(t0 + 0.05, 4), d = DR.vec.norm([p2[0] - p[0], 0, p2[2] - p[2]]), s = r.sign(), sp = r.range(6, 17);
      return { p: [p[0] + -d[2] * s * 2, 0.2, p[2] + d[0] * s * 2], v: [-d[2] * s * sp + d[0] * 6, r.range(5, 15), d[0] * s * sp + d[2] * 6], t0, life: r.range(1.2, 2.6), size: r.range(0.1, 0.34), grow: 0.7, a: 0.9, col: [1, 0.96, 0.9] }; } });
    FX.sprites({ count: 420, seed: 42, kind: 'puff', gravity: 2, drag: 0.9, cover: 0.55, wind: 0.3, soft: 3, init: (i, r) => { const t0 = 65.0 + r() * 2.5, p = C.bodyAt(t0, r() * 20 + 4), s = r.sign(); return { p: [p[0] + r.gauss() * 2, 0.5, p[2] + r.gauss() * 2], v: [r.gauss() * 4, r.range(3, 9), r.gauss() * 4], t0, life: r.range(1.6, 3.4), size: r.range(2, 5), grow: 2.6, a: r.range(0.2, 0.45), col: [1, 0.95, 0.88] }; } });
    for (const a of [6, 26]) W.wake((t) => { const p = C.bodyAt(t, a); return [p[0], p[1] - 3.2, p[2], 1.6]; }, 64.8, 67.6, 0.14, 0.6, 7);
    // leaves torn loose when the dragon passes the pavilion, and a slow fall of leaves all through the valley
    const leafCol = (r) => DR.rgb(r.pick(['#c8401c', '#e07a1e', '#e9b22c', '#a82a18', '#d85a22']));
    FX.sprites({ count: 900, seed: 51, kind: 'leaf', gravity: 1.6, drag: 0.7, cover: 1, wind: 0.6, soft: 0.6, init: (i, r) => { const t0 = 62.2 + r() * 1.6, p = C.bodyAt(t0, r() * 30); return { p: [p[0] + r.gauss() * 12 - 8, Math.max(1, p[1] + r.gauss() * 6), p[2] + r.gauss() * 12], v: [r.gauss() * 5 + 6, r.range(1, 9), r.gauss() * 5 - 14], t0, life: r.range(3, 6.5), size: r.range(0.16, 0.32), grow: 1, a: 1, col: leafCol(r), spin: r.range(3, 9) }; } });
    FX.sprites({ count: 380, seed: 52, kind: 'leaf', gravity: 0.7, drag: 0.3, cover: 1, wind: 0.5, loop: 14, soft: 0.6, init: (i, r) => ({ p: [r.range(-110, 110), r.range(12, 46), r.range(-70, 110)], v: [r.gauss() * 0.6, -r.range(0.3, 1.2), r.gauss() * 0.6], t0: -r() * 14, life: r.range(9, 14), size: r.range(0.12, 0.24), grow: 1, a: 1, col: leafCol(r), spin: r.range(1.5, 5) }) });
    // mist at the foot of the two falls
    World.falls.forEach((f, k) => FX.sprites({ count: 70, seed: 61 + k, kind: 'puff', gravity: -0.4, drag: 0.6, cover: 0.5, wind: 0.25, loop: 6, soft: 5, init: (i, r) => ({ p: [f.foot[0] + r.gauss() * 3, 0.6 + r() * 2, f.foot[2] + r.gauss() * 2.5], v: [r.gauss() * 1.6, r.range(0.6, 2.6), r.range(0.5, 3)], t0: -r() * 6, life: r.range(3.5, 6), size: r.range(3, 7), grow: 2.4, a: r.range(0.18, 0.4), col: [0.9, 0.94, 1] }) }));
  };
}
