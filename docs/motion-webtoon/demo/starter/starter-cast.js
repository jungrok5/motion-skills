/* starter-cast.js — the starter's two people, defined as DATA on the shared rig (../../../lib/cast-rig.js). This is the whole cast
   file a film needs: one Cast.define per person (look + wardrobe + values) and, if a preset hair does not fit, a small hair drawing.
   Identity in the mono print = hair shape + the VALUE of each garment: 준호 dark (black jacket, black hair), 민지 light (paper
   cardigan, dotted skirt). Keep two people who share a panel apart in value, not only in shape.
   Load after lib.js, webtoon.js, manga.js, cast-rig.js. */
(function () {
  const C = Cast, MG = Manga;

  // 준호 — spiky black hair, round-neck tee under a black jacket, dark-dot trousers
  C.define('junho', {
    name: '준호', seed: 17, h: 1.03, expr: 'happy', hair: 'spiky',
    build: { sh: 64, waist: 46, hip: 48, neck: 13.5 },
    pal: { skin: '#f6d3b9', hair: '#24212a', hairL: '#55516a', shirt: '#f4f1e8', outer: '#2f3a52', pants: '#5b6478', shoes: '#f0f0ec' },
    shirt: { collar: 'round' }, outer: { kind: 'jacket', open: 44 }, browW: 1.2,
    look: { hair: { ink: 1 }, shirt: { tone: 0, white: 1, sh: .28 }, outer: { ink: 1 }, pants: { tone: .34, sh: .3 }, shoes: { tone: 0, white: 1, sh: .28 } },
  });

  // 민지 — a bob with a high ponytail (preset 'bob' + her own ponytail below), paper cardigan, mid-dot skirt, black shoes
  const bob = C.HAIR.bob;
  C.define('minji', {
    name: '민지', seed: 29, h: .95, expr: 'smile', lashes: true, browW: .85,
    build: { sh: 52, waist: 37, hip: 43, neck: 11, arm: .95 },
    pal: { skin: '#ffe7da', hair: '#3c2824', hairL: '#6e5048', shirt: '#fbf8f1', outer: '#e9d6b6', skirt: '#6f7d92', shoes: '#3a2a26', sock: '#ffe7da' },
    shirt: { collar: 'round' }, outer: { kind: 'cardigan', open: 30 }, skirt: { len: 150 },
    look: { hair: { ink: 1 }, shirt: { tone: 0, white: 1, sh: .28 }, outer: { tone: 0, sh: .28 }, skirt: { tone: .3, sh: .3 }, shoes: { ink: 1 }, sock: { tone: 0, sh: 0, white: 1 } },
    hair: {
      // hair is drawn in HEAD UNITS (1 = face half-width, eyes at y≈0, crown ≈ −1.14). H.O(x, y) = a point on the skull's outline,
      // H.F(x, y) = a point on the face that turns with it, H.sn = sin(turn), H.spring(i) = a damped sway, H.shadow = the fringe-shadow pass.
      back(ctx, H) {
        bob.back(ctx, H);
        if (H.shadow) return;
        const side = H.sn > .05 ? -1 : 1, sw = H.spring(2) * .22;   // the tail hangs on the side away from where she faces
        const P = (x, y) => H.O(side * x, y);
        MG.ink(ctx, [P(.55, -1.38), P(1.05, -1.5), P(1.5 + sw * .3, -1.1), P(1.68 + sw, -.35), P(1.55 + sw, .3), P(1.38 + sw * .8, .05), P(1.32 + sw * .5, -.6), P(1.05, -1.08), P(.62, -1.12)],
          Object.assign({ lw: 1.05 }, C.hairPaint(H)));
        MG.ink(ctx, [P(.86, -1.52), P(1.06, -1.38), P(.96, -1.2), P(.76, -1.32)], Object.assign({ lw: .8, smooth: false }, C.paint(H.S, 'shirt', H.o)));   // the band
      },
      front: bob.front,
    },
  });
})();
