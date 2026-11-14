// 청룡 · 여의주 — the creature: an imugi (a great dark serpent that has waited a thousand years in the lake) that takes
// the yeouiju and becomes the Blue Dragon.  One rail for the whole film; the state track opens its eye, wets and dries
// it, runs the wave of blue and gold down its body, and grows the antlers, the mane and the legs.
const Yong = {};
{
  const { smooth, pulse, lerp, sat } = DR;
  // the route: [x, y, z] then the film time at which the HEAD is there (null = let the speed settle between keys)
  const ROUTE = [
    [30, -10, -96, 0], [44, -7, -72], [30, -4, -48, B.STIR], [-10, -2.3, -34], [-44, -2.0, -12, 16.5], [-30, -1.8, 8], [0, -1.2, 13, 20.5],
    [16, -0.5, 9, 22], [36, -1.7, -8], [40, -5, -34, 26], [18, -9, -58], [-6, -11, -66, 31], [-14, -12, -52], [-2, -12, -44, 36], [6, -10, -52, 38.3],
    [4, 6, -56, B.BURST], [0, 48, -64, 40.2], [-22, 92, -92], [-34, 128, -136, 42.4], [-8, 160, -176, 43.6], [36, 188, -196], [64, 214, -168, 46],
    [48, 236, -128], [4, 246, -116, 48.4], [-30, 252, -140], [-16, 256, -172, 50.3], [8, 258, -164, B.SEIZE],
    [30, 276, -136], [22, 300, -100, 53.4], [-8, 318, -76, 54.6], [-40, 326, -44], [-78, 300, 6, 57.2], [-118, 236, 50], [-124, 150, 76, 59.6],
    [-98, 74, 70], [-70, 28, 34, 61.9], [-56, 13.5, -8, 62.8], [-44, 9, -52], [-10, 6, -84, 64.6], [30, 4.2, -80], [44, 3.3, -52, 65.8],
    [26, 3.0, -20], [6, 3.6, 14, 67.3], [2, 16, 60, 68.0], [12, 60, 118], [60, 128, 110, 70.2], [104, 190, 40], [96, 238, -60, 72.6],
    [60, 268, -150], [40, 290, -230, 75.0], [0, 300, -300], [-50, 296, -262, 77.6], [-52, 292, -214], [-8, 288, -186, 80.4], [44, 292, -204], [58, 298, -250, 83.4], [20, 304, -296], [-30, 302, -290, 86.4],
  ];
  Yong.PEARL0 = [8, 258, -164];
  const LEN = 112;
  Yong.front = (t) => (t < B.SEIZE ? -1e3 : ((t - B.SEIZE) / 5.4) * (LEN + 8));     // metres from the head the new colour has reached
  Yong.state = (t) => {
    const out = t > B.BURST - 0.2, dragon = smooth(B.SEIZE, B.SEIZE + 0.9, t);
    const blink = pulse(t, 23.4, 23.62, 0.08) + pulse(t, 55.9, 56.1, 0.08) + pulse(t, 75.2, 75.42, 0.08);
    return {
      morph: Yong.front(t), morphHead: dragon,
      grow: [smooth(B.SEIZE + 0.2, B.SEIZE + 2.6, t), smooth(B.SEIZE, B.SEIZE + 3.4, t), smooth(B.SEIZE + 1.0, B.SEIZE + 4.2, t)],
      lid: Math.max(1 - smooth(B.EYE, B.EYE + 0.7, t), blink),
      eyeGlow: lerp(0.7, 1.7, dragon) + 1.5 * pulse(t, B.EYE, B.EYE + 2.5, 0.5, 1.5),
      jaw: 0.1 + 0.75 * pulse(t, B.BURST - 0.1, B.BURST + 1.6, 0.25, 0.7) + 0.5 * pulse(t, B.SEIZE - 0.7, B.SEIZE + 0.05, 0.4, 0.1) + 0.85 * pulse(t, B.ROAR - 0.1, B.ROAR + 2.2, 0.25, 0.6) + 0.35 * pulse(t, 62.4, 63.6, 0.3) + 0.12 * pulse(t, 40.5, 50, 1),
      wet: t < 57 ? (t < B.BURST ? 1 : 0.85) : lerp(0.6, 0.12, smooth(57, 66, t)) + 0.5 * pulse(t, 66, 69, 0.4, 1.5),
      glow: 2.2 * pulse(t, B.SEIZE, B.DAWN + 1.5, 0.3, 2.5) + 0.35 * dragon,
      wave: t < B.BURST ? 0.75 : 1, reach: pulse(t, B.SEIZE - 0.6, B.SEIZE + 0.4, 0.3, 0.6),
      pitch: -0.25 * pulse(t, B.ROAR - 0.2, B.ROAR + 2.2, 0.3, 0.6),
    };
  };
  Yong.build = (scene) => {
    const C = (Yong.C = DR.creature({ name: 'yong', length: LEN, radius: 2.35, rings: 290, sides: 28,
      rail: { points: ROUTE.map((p) => p.slice(0, 3)), keys: ROUTE.map((p, i) => [p[3], i]).filter((k) => k[0] != null) }, wave: { length: 33, amp: 1.0, speed: 5.5 }, scale: { around: 44, row: 0.5 },
      palette: { a: { back: '#0c120e', side: '#182019', belly: '#4f4c34', rim: '#2b3226' }, b: { back: '#0a3690', side: '#1470b8', belly: '#ead9a2', rim: '#f0c050' }, edge: '#ffd98a', sheen: '#86d8ff' },
      state: Yong.state }));
    Yong.parts = DR.dragon(C, { headScale: 1.3, antlers: { len: 3.6, tines: 3, spread: 0.6 }, hairColors: { root: '#141812', tip: '#3c3a2a', rootB: '#b9852b', tipB: '#fff0b4' }, iris: '#ffb400', iris2: '#c23a00', hair: { mane: 1.1, fins: 1, beard: 1, plume: 1.2 } });
    scene.add(C.group);
    // the yeouiju: it comes down through the torn cloud, waits, and after the seizing rides under the dragon's chin
    const pm = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), DR.mat({ base: 'basic', color: '#000000', air: false, fBody: 'vec3 Vp = normalize(cameraPosition - vWPos); float f = pow(1.0 - max(dot(normalize(vONrm), Vp), 0.0), 1.5); drEmit = mix(vec3(9.0, 7.6, 4.6), vec3(4.0, 6.5, 9.0), f) * (0.8 + 0.2 * sin(uTime * 3.0 + vWPos.y));' }));
    scene.add(pm); Yong.pearlMesh = pm;
    const tmp = [0, 0, 0];
    Yong.pearlAt = (t, o = [0, 0, 0]) => {
      if (t < B.PEARL - 0.5) { o[0] = Yong.PEARL0[0]; o[1] = 900; o[2] = Yong.PEARL0[2]; o[3] = 0; return o; }
      if (t < B.SEIZE) { const d = 1 - DR.ease.out3(sat((t - B.PEARL) / 5.5)); o[0] = Yong.PEARL0[0] + Math.sin(t * 0.7) * 1.2; o[1] = Yong.PEARL0[1] + d * 190 + Math.sin(t * 1.3) * 0.8; o[2] = Yong.PEARL0[2] + Math.cos(t * 0.6) * 1.2; o[3] = smooth(B.PEARL - 0.5, B.PEARL + 1.5, t); return o; }
      const P = Yong.parts; P.point(0, -1.25, P.sn * 0.62, tmp); o[0] = tmp[0]; o[1] = tmp[1]; o[2] = tmp[2]; o[3] = 1; return o; };
    DR.onFrame((t) => { const p = Yong.pearlAt(t, Yong._p || (Yong._p = [0, 0, 0, 0])); pm.position.set(p[0], p[1], p[2]); const s = (t < B.SEIZE ? 2.2 : 1.15) * p[3]; pm.scale.setScalar(Math.max(s, 1e-3)); pm.visible = p[3] > 0.01; }, 20);
    return C;
  };
}
