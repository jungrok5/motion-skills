// 쇠울림 골짜기 · the reel (scripts/film.mjs).  Seven shots; in each the camera and the machines' clock are functions of the shot's
// time, so a frame can be drawn alone.  `t` is the second of the valley's clock the shot starts at — found by asking the gym
// where a machine is (the walk is a pure function of time).  A camera returns { at, up | y, look | yaw, pitch, fov }.
{
  const U = (name) => LR.mech.units.find((q) => q.name === name), at = (name, t) => LR.mech.poseAt(U(name), t), mix = (a, b, k) => a + (b - a) * k, ease = (u) => u * u * (3 - 2 * u);
  // a hand holds the camera: a breath of drift, never a tripod
  const hold = (sec, k = 1) => [Math.sin(sec * 0.7) * 0.05 * k + Math.sin(sec * 1.9 + 1) * 0.02 * k, Math.sin(sec * 0.9 + 2) * 0.03 * k + Math.sin(sec * 2.3) * 0.012 * k];
  V.film = [
    // the relic passes the way in: lit windows over the wood, legs between the trunks, the ground carrying each step
    { name: 'relic', dur: 5.5, tod: 20.4, weather: 'mist', t: 971, cam: (u, LR, s) => { const b = at('마루', 971 + s).W.body.p, h = hold(s); return { at: [-150 - 2.2 * ease(u) + h[0], 120 + 1.4 * ease(u)], up: 1.66 + h[1], look: [b[0], b[1] - 7, b[2]], fov: 56 }; } },
    // out on the viaduct: a crane comes through the gap and slows
    { name: 'approach', dur: 5.5, tod: 20.4, weather: 'mist', t: 141.5, cam: (u, LR, s) => { const b = at('두루미 1', 141.5 + s).W.body.p, h = hold(s); return { at: [-22.6 + h[0], 53 - 7.4 * ease(u)], up: 1.66 + h[1], look: [b[0] + 3, b[1] + 5.5, b[2]], fov: 58 }; } },
    // it stands, lifts its head over the mist and looks: the search light comes round across the eye
    { name: 'survey', dur: 6.5, tod: 20.4, weather: 'mist', t: 155.2, cam: (u, LR, s) => { const r = at('두루미 1', 155.2 + s).W, hd = r.head.p, b = r.body.p, h = hold(s, 1.4); return { at: [-23.2 + h[0], 44.4], up: 1.62 + h[1], look: [mix(b[0], hd[0], 0.72), mix(b[1], hd[1], 0.72), mix(b[2], hd[2], 0.72)], fov: 54 }; } },
    // the kites come down out of the mist over the viaduct, five beams combing the deck, and bank away west over the one that fell
    { name: 'kites', dur: 6.5, tod: 20.4, weather: 'mist', t: 44.2, cam: (u, LR, s) => { const P = ['솔개 1', '솔개 2', '솔개 3'].map((n) => at(n, 44.2 + s).W.body.p), h = hold(s, 1.3); return { at: [-22.4 + h[0], 47.5 + 0.8 * ease(u)], up: 1.66 + h[1], look: [0, 1, 2].map((i) => (P[0][i] * 2 + P[1][i] + P[2][i]) / 4), fov: 64 }; } },
    // a carrier on the north bank, at the height of its knees: two amber eyes, feet finding the ground
    { name: 'porter', dur: 6, tod: 20.4, weather: 'mist', t: 16.5, cam: (u, LR, s) => { const r = at('등짐 1', 16.5 + s).W, hd = r.head.p, h = hold(s); return { at: [-19.6 + 1.8 * ease(u) + h[0], -85.6 - 3.2 * ease(u)], up: 1.15 + h[1], look: [hd[0], hd[1] - 1.2, hd[2]], fov: 60 }; } },
    // dawn on the valley floor: a crane walks past the one that fell — every leg its own length on the worn ground
    { name: 'floor', dur: 5.5, tod: 6.5, weather: 'mist', t: 85, cam: (u, LR, s) => { const b = at('두루미 1', 85 + s).W.body.p, h = hold(s), gy = LR.land.h(b[0], b[2]); return { at: [-64 + h[0], 35.5 - 1.2 * ease(u)], up: 1.2 + h[1], look: [b[0] + 2, gy + 6.5, b[2]], fov: 62 }; } },
    // and at noon, in clear air: its back goes by level with the broken deck
    { name: 'noon', dur: 5, tod: 13, weather: 'clear', t: 125.5, cam: (u, LR, s) => { const b = at('두루미 1', 125.5 + s).W.body.p, h = hold(s); return { at: [-23 + h[0], 43.9], up: 1.64 + h[1], look: [b[0] + 1, b[1] + 1.5, b[2]], fov: 58 }; } },
  ];
}
