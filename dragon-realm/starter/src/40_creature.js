// Tarn Wyrm — ③ the creature: a pale horned wyrm.  One rail for the whole film ([x, y, z, time the HEAD is there]).
const Wyrm = {};
{
  const { pulse, smooth } = DR;
  const ROUTE = [[-30, -9, -70, 0], [-10, -5, -52], [6, -2, -44, B.RISE - 0.4], [14, 8, -46, B.RISE + 0.4], [30, 34, -58], [58, 58, -84, 6.2], [60, 76, -118], [30, 88, -132, B.TURN + 0.6], [2, 92, -112], [-4, 98, -80, B.CALL + 0.4], [10, 110, -50], [44, 124, -40, 15]];
  Wyrm.state = (t) => ({ morph: 1e4, morphHead: 1, grow: [1, 1, 1],                 // already "after": no transformation in this film
    jaw: 0.12 + 0.8 * pulse(t, B.CALL - 0.1, B.CALL + 1.6, 0.2, 0.6), wet: 1 - 0.7 * smooth(B.RISE + 1, B.TURN + 2, t), lid: 0, pitch: -0.2 * pulse(t, B.CALL, B.CALL + 1.6, 0.2, 0.6) });
  Wyrm.build = (scene) => {
    const C = (Wyrm.C = DR.creature({ name: 'wyrm', length: 70, radius: 1.7, rings: 220, rail: { points: ROUTE.map((p) => p.slice(0, 3)), keys: ROUTE.map((p, i) => [p[3], i]).filter((k) => k[0] != null) },
      palette: { a: { back: '#20262a', side: '#2c343a', belly: '#6a6858', rim: '#3a4248' }, b: { back: '#9aa7ad', side: '#c9d2d4', belly: '#efe6cf', rim: '#6f8fa0' }, sheen: '#bfe6ff' }, state: Wyrm.state, castTime: 9 }));
    // ④ its parts: every number is a design choice — a long snout, two swept horns, no legs, a short mane
    Wyrm.parts = DR.dragon(C, { headScale: 1.2, head: { snout: 1.15, brow: 1.1, nose: 0.85 }, antlers: { len: 2.6, tines: 1, spread: 0.3 }, legs: false, hair: { mane: 0.5, fins: 0.8, beard: 0.4, plume: 0.8 },
      hairColors: { root: '#2a3034', tip: '#50585c', rootB: '#5d7888', tipB: '#e6f2f6' }, hornColor: '#e8e2d2', iris: '#9fe8ff', iris2: '#1c6f9a' });
    scene.add(C.group);
    // ⑤ what the world does when it passes: rings where it breaks the water, a splash, spray falling from it
    World.water.wake((t) => { const p = C.bodyAt(t, 6); return [p[0], p[1], p[2], 2.2]; }, 0.5, B.RISE, 0.3, 0.3, 6);
    DR.fx.splash({ t0: B.RISE - 0.05, at: [9, 0, -45], power: 1.1, seed: 3 });
    for (let i = 0; i < 4; i++) World.water.ring(B.RISE + i * 0.3, 9, -45, 2.2 - i * 0.4, 10, 4.5, 3);
    DR.camKick = (t) => 1.5 * pulse(t, B.RISE, B.RISE + 1.2, 0.05, 0.9) + 1.2 * pulse(t, B.CALL, B.CALL + 1.5, 0.1, 0.7);
  };
}
