// 「시계탑 심부름」 world — the sets, designed for this topic (BRIEF.md). Every object is an engraved plate (kit.js, or
// drawn here with Plate calls) standing as a card in metres. Colour never enters the world: only the cast is painted.
import { Plate } from 'ec/engrave.js';
import { facade, tower, skyline, tree, cloud, lamp, figure, balloon, ground, sky } from 'ec/kit.js';

/** a little topic prop drawn here (not in the kit): the clockmaker's hanging shop sign, a big pocket-watch */
function watchSign(seed = 61) {
  const ppm = 90, W = 1.4 * ppm, H = 1.9 * ppm, P = new Plate(W, H, { seed, gap: 3.4 }), cx = W / 2, cy = H * 0.62, r = W * 0.42;
  P.line(cx - r * 0.9, 0, cx - r * 0.5, cy - r * 0.9, 2); P.line(cx + r * 0.9, 0, cx + r * 0.5, cy - r * 0.9, 2);
  P.fill(P.ellipse(cx, cy - r * 1.08, r * 0.2, r * 0.16), { tone: 0.6, angle: 45 }); P.stroke(P.ellipse(cx, cy - r * 1.08, r * 0.2, r * 0.16), 2);
  P.fill(P.ellipse(cx, cy, r, r), { tone: { cx: cx - r * 0.3, cy: cy - r * 0.3, r: r * 1.6, from: 0.2, to: 0.8 }, angle: 30 }); P.stroke(P.ellipse(cx, cy, r, r), 2.6);
  P.white(P.ellipse(cx, cy, r * 0.78, r * 0.78)); P.stroke(P.ellipse(cx, cy, r * 0.78, r * 0.78), 2);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; P.line(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, k % 3 ? 1.6 : 3); }
  P.line(cx, cy, cx + r * 0.3, cy - r * 0.32, 3.2); P.line(cx, cy, cx - r * 0.05, cy - r * 0.58, 2.2);
  const res = P.done({ margin: 4 }); res.m = [res.w / ppm, res.h / ppm]; res.base = res.pad; return res;
}

/** another topic prop: the belfry's stone parapet — balusters between a plinth and a coping rail */
function parapet(len = 6, seed = 71) {
  const ppm = 110, W = len * ppm, H = 1.0 * ppm, P = new Plate(W, H, { seed, gap: 3.6 });
  P.fill(P.rect(0, H * 0.8, W, H * 0.2), { tone: { from: 0.3, to: 0.6, x0: 0, y0: H * 0.8, x1: 0, y1: H }, angle: 0 }); P.stroke(P.rect(0, H * 0.8, W, H * 0.2), 2.4);
  const n = Math.round(len / 0.32);
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * W / n, bw = W / n * 0.36, bal = P.path(p => { p.moveTo(cx - bw * 0.5, H * 0.8); p.quadraticCurveTo(cx - bw * 1.1, H * 0.6, cx - bw * 0.35, H * 0.42); p.quadraticCurveTo(cx - bw * 0.7, H * 0.3, cx - bw * 0.45, H * 0.2); p.lineTo(cx + bw * 0.45, H * 0.2); p.quadraticCurveTo(cx + bw * 0.7, H * 0.3, cx + bw * 0.35, H * 0.42); p.quadraticCurveTo(cx + bw * 1.1, H * 0.6, cx + bw * 0.5, H * 0.8); p.closePath(); });
    P.fill(bal, { tone: { from: 0.06, to: 0.62, x0: cx - bw, y0: 0, x1: cx + bw, y1: 0 }, angle: 90 }); P.stroke(bal, 1.8);
  }
  P.fill(P.rect(0, H * 0.2, W, H * 0.05), { tone: 0.8, angle: 0 });
  P.white(P.rect(-2, 0, W + 4, H * 0.2)); P.stroke(P.rect(-2, 0, W + 4, H * 0.2), 2.4); P.line(0, H * 0.08, W, H * 0.08, 1.4);
  const res = P.done({ margin: 3 }); res.m = [res.w / ppm, res.h / ppm]; res.base = res.pad; return res;
}
const backdrop = (S, r, y = 0, seed = 19) => S.ring([0, 1, 2, 3].map(i => sky({ seed: seed + i, w: 300 })), { r, y: y - 6, span: 165 });

export const sets = {
  // 1 · the market street: façades turned at collage angles down both sides, lamps, passers-by; two blocks pop up as we pass
  street: {
    haze: [18, 90, 0.6],
    build(S) {
      S.floor(ground({ w: 18, d: 70, kind: 'paving', ppm: 24, seed: 4, tone: 0.1 }), { at: [0, 0, -24] });
      const left = [[-6.2, 1, 64, 4, 'mix', 'mansard', 3], [-7.4, -11, 58, 5, 'rect', 'gable', 7], [-6.6, -22, 66, 4, 'arch', 'mansard', 11], [-7.8, -34, 60, 3, 'rect', 'flat', 15]];
      const right = [[6.4, -3, -62, 4, 'rect', 'mansard', 5], [7.2, -14, -56, 5, 'mix', 'mansard', 9], [6.6, -26, -66, 4, 'arch', 'gable', 13], [7.9, -38, -60, 3, 'rect', 'mansard', 17]];
      const rows = [];
      for (const [x, z, rot, fl, win, roof, seed] of [...left, ...right]) rows.push(S.card(facade({ w: 10, floors: fl, bays: 4, window: win, roof, seed, ppm: 64, lit: [1, 6] }), { at: [x, 0, z], rot, layer: 'street', name: `house${seed}` }));
      S.rise(rows[5], 1.5, 0.9); S.rise(rows[2], 2.3, 0.9);                   // blocks hinge up out of the cobbles as the camera nears
      S.card(tower({ h: 30, w: 4.4, time: [4, 50], seed: 21, ppm: 40 }), { at: [1.5, 0, -62], rot: -8, layer: 'buildings' });
      S.card(skyline({ w: 140, h: 20, seed: 6, spires: 4, domes: 1 }), { at: [0, 0, -95], layer: 'far', shadow: false });
      backdrop(S, 175, 0, 19);
      for (const [x, z] of [[-4.4, -2], [4.5, -7], [-4.6, -14], [4.6, -20], [-4.7, -27]]) S.card(lamp({ seed: 23 + z }), { at: [x, 0, z], rot: x < 0 ? 30 : -30, layer: 'props', h: 4.2 });
      S.card(watchSign(), { at: [-4.2, 3.5, -5.5], rot: 70, layer: 'props', h: 1.5 });
      const folk = [['gent', -4.1, -9, 1], ['lady', 3.9, -11, -1], ['worker', -3.8, -19, 1], ['gent', 4.2, -23, -1], ['lady', -4.0, -30, 1]];
      folk.forEach(([kind, x, z, f], i) => S.card(figure({ kind, facing: f, seed: 40 + i, ppm: 110 }), { at: [x, 0, z], rot: x < 0 ? 35 : -35, layer: 'props', h: 1.95 }));
      for (const [x, y, z, s] of [[-30, 26, -110, 2], [25, 32, -120, 3], [2, 40, -140, 5]]) S.drift(S.card(cloud({ w: 34, h: 9, seed: s }), { at: [x, y, z], layer: 'sky', shadow: false, haze: 0.4 }), [0.5, 0, 0]);
    },
  },
  // 2 · the square under the clock tower: the tower straight ahead, houses turned in toward it, a plane tree, clouds above
  square: {
    haze: [20, 120, 0.5],
    build(S) {
      S.floor(ground({ w: 40, d: 40, kind: 'paving', ppm: 22, seed: 8 }), { at: [0, 0, -10] });
      S.card(tower({ h: 34, w: 5, time: [4, 52], seed: 22, ppm: 46 }), { at: [0, 0, -16], layer: 'buildings', name: 'tower' });
      S.card(facade({ w: 12, floors: 4, bays: 5, window: 'arch', roof: 'mansard', seed: 31, ppm: 60, side: 0.25 }), { at: [-10, 0, -15], rot: 32, layer: 'buildings' });
      S.card(facade({ w: 11, floors: 3, bays: 4, window: 'rect', roof: 'gable', seed: 33, ppm: 60 }), { at: [10, 0, -14], rot: -34, layer: 'buildings' });
      S.card(skyline({ w: 160, h: 24, seed: 9, spires: 3, domes: 2, tone: 0.16 }), { at: [0, 0, -100], layer: 'far', shadow: false });
      backdrop(S, 155, 0, 24);
      S.card(tree({ h: 9, w: 7.5, seed: 12 }), { at: [-5.5, 0, -7], rot: 10, layer: 'props' });
      S.card(lamp({ seed: 77 }), { at: [3.2, 0, -5], rot: -12, layer: 'props', h: 4.2 });
      S.card(figure({ kind: 'gent', facing: -1, seed: 51, ppm: 110 }), { at: [5.2, 0, -9], rot: -20, layer: 'props', h: 1.9 });
      S.card(figure({ kind: 'lady', facing: 1, seed: 52, ppm: 110 }), { at: [-3.4, 0, -11], rot: 15, layer: 'props', h: 1.85 });
      for (const [x, y, z, s] of [[-14, 30, -40, 21], [12, 38, -55, 22], [-4, 46, -70, 23]]) S.drift(S.card(cloud({ w: 26, h: 8, seed: s }), { at: [x, y, z], layer: 'sky', shadow: false, haze: 0.3 }), [0.6, 0, 0]);
    },
  },
  // 3 · up on the belfry ledge: planks under Oto, the town's roofs below (façades sunk so only their roofs show), the far skyline, a balloon going by
  roofs: {
    haze: [25, 200, 0.55],
    build(S) {
      S.floor(ground({ w: 6.4, d: 3.2, kind: 'paving', ppm: 60, seed: 14, tone: 0.14 }), { at: [0, 0, 0] });
      const roofs = [[-9, -16, -18, 30, 41], [7, -15, -22, -20, 42], [-2, -17, -34, 8, 43], [14, -16, -40, -35, 44], [-16, -15, -44, 40, 45]];
      for (const [x, y, z, rot, seed] of roofs) S.card(facade({ w: 11, floors: 4, bays: 4, roof: seed % 2 ? 'mansard' : 'gable', seed, ppm: 46, chimneys: 3 }), { at: [x, y, z], rot, layer: 'buildings' });
      S.card(skyline({ w: 220, h: 26, seed: 15, spires: 5, domes: 2, tone: 0.14 }), { at: [0, -16, -120], layer: 'far', shadow: false });
      backdrop(S, 195, -16, 27);
      S.card(parapet(6.4), { at: [0, 0, -1.55], layer: 'props', h: 1.0 });
      for (const x of [-3.2, 3.2]) S.card(parapet(3.2, 72 + x), { at: [x, 0, 0.05], rot: x < 0 ? 90 : -90, layer: 'props', h: 1.0 });
      S.drift(S.card(balloon({ h: 14, seed: 31 }), { at: [-26, 10, -60], layer: 'props', haze: 0.5 }), [2.2, 0.35, 0]);
      for (const [x, y, z, s] of [[-30, 14, -90, 31], [20, 22, -110, 32], [-6, 30, -150, 33], [35, 8, -80, 34]]) S.drift(S.card(cloud({ w: 34, h: 10, seed: s }), { at: [x, y, z], layer: 'sky', shadow: false, haze: 0.3 }), [0.7, 0, 0]);
    },
  },
};
