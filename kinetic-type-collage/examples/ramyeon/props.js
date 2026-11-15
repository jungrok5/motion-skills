// 「라면 4분 30초」 — the props, designed for this topic from the kit's parts (references/KIT.md). One unit ≈ 10 cm.
// Every prop rests on y = 0 and is centred on x / z, so a shot can put it on the ground and spin it.

export function props(F) {
  // the pot: brushed steel, two black ears, water inside
  F.prop('pot', (K) => {
    const steel = K.mat('steel', { rough: 0.3, metal: 0.55 }), ear = K.mat('ink', { rough: 0.35 });
    const body = K.lathe([[0, 0], [1.16, 0], [1.27, 0.09], [1.32, 1.22], [1.4, 1.27], [1.4, 1.33], [1.25, 1.33], [1.2, 0.16], [0, 0.16]], steel);
    const water = K.at(K.cyl(1.22, 0.02, K.mat('water', { rough: 0.06, clear: 1 })), [0, 0.98, 0]);
    const e = (s) => K.at(K.torus(0.24, 0.055, ear, { arc: 180 }), [s * 1.4, 1.12, 0], [90, 0, s > 0 ? -90 : 90]);
    return K.group(body, water, e(1), e(-1));
  });
  // the block of noodles: a brick with the waves standing proud on top and bottom
  F.prop('noodle', (K) => {
    const m = K.mat('noodle', { rough: 0.7 }), G = K.group(K.at(K.rbox(2.1, 0.34, 1.8, 0.12, m), [0, 0.27, 0]));
    for (const y of [0.46, 0.08]) for (let i = 0; i < 9; i++) {
      const z = -0.74 + i * 0.185, pts = []; for (let j = 0; j <= 28; j++) { const x = -0.98 + (j / 28) * 1.96; pts.push([x, y + 0.03 * Math.sin(j * 1.9 + i), z + 0.07 * Math.sin(j * 0.9 + i * 2.1)]); }
      G.add(K.tube(pts, 0.062, m, { seg: 56 }));
    }
    return G;
  });
  // the soup packet: a flat foil pouch, red face, crimped ends
  F.prop('packet', (K) => K.at(K.slab(1.5, 1.9, 0.1, {
    side: 'steel', r: 0.05, rough: 0.35,
    face: (g, w, h) => {
      K.tex.fill(g, w, h, 'red'); g.fillStyle = K.css('paper'); g.fillRect(0, 0, w, h * 0.09); g.fillRect(0, h * 0.91, w, h * 0.09);
      g.fillStyle = K.css('ink'); for (let i = 0; i < 22; i++) { g.fillRect((i / 22) * w, 0, w / 44, h * 0.09); g.fillRect((i / 22) * w, h * 0.91, w / 44, h * 0.09); }
      g.fillStyle = K.css('paper'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = K.font('han', h * 0.36); g.fillText('스프', w / 2, h * 0.43);
      g.font = K.font('text', h * 0.055); g.fillText('SOUP BASE · 11 g', w / 2, h * 0.7); g.fillStyle = K.css('yellow'); g.beginPath(); g.arc(w * 0.5, h * 0.82, h * 0.035, 0, 7); g.fill();
    },
    back: (g, w, h) => { K.tex.fill(g, w, h, 'steel'); g.fillStyle = K.css('ink'); g.font = K.font('text', h * 0.05); g.textAlign = 'center'; for (let i = 0; i < 6; i++) g.fillRect(w * 0.2, h * (0.3 + i * 0.07), w * (0.6 - (i % 3) * 0.1), h * 0.015); },
  }), [0, 0.95, 0]));
  // an egg, standing
  F.prop('egg', (K) => {
    const pts = []; for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI; pts.push([0.46 * Math.sin(a) * (1 + 0.2 * Math.cos(a)), 0.62 - 0.62 * Math.cos(a)]); }
    return K.lathe(pts, K.mat('shell', { rough: 0.5 }));
  });
  // the egg, opened: white with a domed yolk
  F.prop('yolk', (K) => {
    const white = K.sphere(1, K.mat('paper', { rough: 0.18, clear: 0.8 }), { s: [1, 0.12, 0.86] }); white.position.y = 0.06;
    const lobe = K.at(K.sphere(0.5, K.mat('paper', { rough: 0.18, clear: 0.8 }), { s: [1, 0.2, 1] }), [0.7, 0.05, 0.4]);
    const y = K.sphere(0.42, K.mat('yellow', { rough: 0.12, clear: 1 }), { s: [1, 0.62, 1] }); y.position.set(-0.1, 0.16, 0.02);
    return K.group(white, lobe, y);
  });
  // a kitchen timer: the dial carries the words
  F.prop('timer', (K) => {
    const G = K.disc(1.2, 0.5, {
      side: 'paper', rough: 0.3,
      face: (g, w) => {
        K.tex.fill(g, w, w, 'paper'); const c = w / 2; g.translate(c, c);
        g.fillStyle = K.css('red'); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, c * 0.86, -Math.PI / 2, -Math.PI / 2 + (4.5 / 12) * Math.PI * 2); g.fill();
        g.fillStyle = K.css('paper'); g.beginPath(); g.arc(0, 0, c * 0.6, 0, 7); g.fill();
        g.fillStyle = K.css('ink'); for (let i = 0; i < 60; i++) { g.save(); g.rotate((i / 60) * Math.PI * 2); g.fillRect(-(i % 5 ? 0.006 : 0.016) * w, -c * 0.96, (i % 5 ? 0.012 : 0.032) * w, (i % 5 ? 0.05 : 0.1) * w); g.restore(); }
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = K.font('cond', w * 0.25); g.fillText('4:30', 0, w * 0.19);
        g.font = K.font('text', w * 0.042); g.fillText('MIN  ·  SEC', 0, -w * 0.16);
      },
    });
    G.add(K.at(K.cyl(0.12, 0.14, K.mat('ink', { rough: 0.3 })), [0, 0, 0.3], [90, 0, 0]));
    G.add(K.at(K.rbox(0.06, 0.95, 0.04, 0.015, K.mat('ink', { rough: 0.3 })), [0.36, 0.2, 0.3], [0, 0, -61]));
    return K.at(K.group(G), [0, 1.2, 0]);
  });
  // green onion, cut: a ring (white to green)
  F.prop('leek', (K) => K.at(K.group(K.torus(0.3, 0.1, K.mat('leek', { rough: 0.5 })), K.torus(0.17, 0.06, K.mat('leekpale', { rough: 0.5 }))), [0, 0.1, 0], [90, 0, 0]));
  // chopsticks, crossed a little
  F.prop('sticks', (K) => {
    const m = K.mat('ink', { rough: 0.3 }), s = (x, r) => K.at(K.cyl(0.035, 3.6, m, { r2: 0.07 }), [x, 1.8, 0], [0, 0, r]);
    return K.group(s(-0.08, 2.5), s(0.08, -2.5));
  });
  // the burner: a ring of blue flames
  F.prop('flame', (K) => {
    const G = K.group(K.at(K.torus(1.0, 0.07, K.mat('ink', { rough: 0.4, metal: 0.6 })), [0, 0.07, 0], [90, 0, 0])), m = K.mat('blue', { emissive: 'blue', glow: 1.4, rough: 0.4 });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.2832; G.add(K.at(K.cyl(0.11, i % 2 ? 0.5 : 0.36, m, { r2: 0.005, seg: 12 }), [Math.cos(a) * 1.0, 0.3, Math.sin(a) * 1.0], [-18 * Math.sin(a), 0, 18 * Math.cos(a)])); }
    return G;
  });
  // the finished bowl: white ceramic, red line, broth, a nest of noodles, the egg and the leek
  F.prop('bowl', (K) => {
    const cer = K.mat('paper', { rough: 0.2, clear: 0.6 }), G = K.group();
    G.add(K.lathe([[0, 0], [0.62, 0], [0.66, 0.12], [1.05, 0.5], [1.5, 1.05], [1.56, 1.1], [1.56, 1.16], [1.44, 1.14], [1.0, 0.6], [0.6, 0.24], [0, 0.2]], cer));
    G.add(K.at(K.torus(1.535, 0.035, K.mat('red', { rough: 0.3 })), [0, 1.13, 0], [90, 0, 0]));
    G.add(K.at(K.cyl(1.36, 0.02, K.mat('broth', { rough: 0.4 })), [0, 0.98, 0]));
    const m = K.mat('noodle', { rough: 0.6 }), r = K.rng(4);
    for (let i = 0; i < 9; i++) { const pts = [], a0 = r() * 6.28, R = 0.35 + r() * 0.6, cx = (r() - 0.5) * 0.6, cz = (r() - 0.5) * 0.6; for (let j = 0; j <= 20; j++) { const a = a0 + (j / 20) * (3 + r() * 2); pts.push([cx + Math.cos(a) * R * (1 + 0.1 * Math.sin(j * 2.1)), 1.03 + 0.05 * Math.sin(j * 1.3 + i), cz + Math.sin(a) * R * 0.9]); } G.add(K.tube(pts, 0.05, m, { seg: 48 })); }
    const yolk = F.makeProp('yolk'); G.add(K.at(yolk, [-0.35, 1.02, 0.2], [0, 30, 0], 0.55));
    for (const [x, z, ry] of [[0.6, 0.5, 20], [0.75, -0.2, 70], [0.3, -0.7, 140], [0.85, 0.15, 100]]) G.add(K.at(F.makeProp('leek'), [x, 1.07, z], [80, ry, 0], 0.55));
    return G;
  });
}
