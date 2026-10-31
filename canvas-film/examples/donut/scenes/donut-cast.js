/* donut-cast.js — 「마지막 도넛」 the shared cast + props. Every scene draws the people and things through THIS file, so they stay
   identical across ep1/ep2/ep3. Global: window.Cast. Load after lib.js, kit-webtoon.js and donut-manga.js.

   THE LOOK (2026-10-31 redraw): the characters are built the way the risograph dinner scene's faces were (table-risoline face():
   a round head, dot / arc eyes, a hooked nose tick, hatched blush, a big open laughing mouth, simple ears, a thick boiling ink line
   on twos) and printed as a premium monochrome manga: cream paper, one black ink, 45° round-dot screentone for shade and for
   clothing values. Identity is carried by hair shape, glasses / moustache and the VALUE of each garment:
     박대리 messy black hair + ahoge, round glasses, light shirt with rolled sleeves, loose black tie, eye bags
     김과장 black hair with a side part on HIS left (screen-right) and grey temples, a wide soft brush moustache, mid-tone vest, mug
     최주임 short spiky mid-tone hair, light-dot hoodie under a dark-dot blazer, a black wristband (left wrist)
     하늘   black bob with a clip (screen-right), light-dot cardigan, lanyard + ID card, mid-tone skirt
     사장님 bald with light-dot grey sides and bushy brows, dark-dot cardigan
   The donut pink (#ff6fa3) stays the only colour. Cast.style = 'riso' switches the same drawings to flat riso colour fills.

   PEOPLE (keys): park 박대리 · kim 김과장 · choi 최주임 · haneul 하늘 · boss 사장님
     Cast.draw(ctx, t, who, o)  → G   the normal body (≈1:5). o:
          { x, y (feet), s (1 → ~640 px tall), turn (0 front, ±.55 3/4, + faces right), headTurn, tilt, nod, lean, bob, alpha,
            pose: 'stand' | 'walk' (ph) | 'sit' | 'kneel' | 'crouch' (crouch 0…1), sway (amp, false = still), hairEv [t…],
            expr + eyes / brows / mouth / talk (0…1) / look [gx, gy] / blush (0…1) / open (blink, false = never) / glint / gloom / tears,
            laugh (0…1: laugh marks round the head), stone (0…1), crack (0…1), only: 'head',
            arms: { L, R } = screen-left / screen-right arm: { to: [x, y] (where the GRIP lands), hand: 'open'|'cup'|'fist'|'rock'|'hold'|
              'point'|'scissors'|'paper'|'wave'|'grab'|'pinch'|'thumb', ang (world hand angle; clamped ≤ 80° off the forearm),
              bend (±1: force the elbow to that side of the shoulder→wrist line, kept for the whole reach), thumb (±1), front (draw a far
              arm wholly in front), prop(ctx, H) / propFront(ctx, H) (a held thing behind / in front of the fingers; rig-local coords,
              H = { x, y, ang, sz, grip }) } }
          expr: neutral · smile (closed-eye) · glint · shock · cry · joy · chew · determined · dead · talk · happy · worried · tired ·
          angry · blank (each person has a default: park 'tired', kim 'smile', choi 'neutral', haneul 'neutral', boss 'happy')
     Cast.face(ctx, t, who, x, y, s, o) → G   head (+ neck) only, centred on (x, y)   (o.bust = true adds the shoulders)
     Cast.sd(ctx, t, who, o)    → G   SD / chibi (1:1.5): o as Cast.draw + pose 'stand'|'run'|'sit'|'flail'|'slump'|'kneel', SD eyes
                                      'sparkle', tears 'fall'|'stream', stone, crack; arms default to mitten hands ('mitt')
     Cast.stone(ctx, t, who, o) → G   SD in grey stone (blank eyes, cracks by o.crack)
     Cast.crumble(ctx, t, who, o, c) the stone SD cracking and falling to rubble (c = { t0, dur, floor, … } → Webtoon.crumble)
     Cast.geom(t, who, o) / Cast.sdGeom(t, who, o) → G (geometry only)
     G = { head: { x, y, r, dir, tilt }, eyes: [[x, y], [x, y]], mouth, hands: { L, R } ({ x, y, ang, grip, reach, elbow }),
           shoulders: { L, R }, neck, hip, top, box { x, y, w, h }, s, bones (the solved joints, rig-local) }
     Cast.hand(ctx, who, pose, x, y, ang, sz, o) a big close-up hand with that person's sleeve + cuff → { grip, tip, P(u, v) }
          (x, y) = the wrist, sz = palm length; o { flip, len (sleeve length in palm lengths, 3.2), sleeve: false, lw }
     Cast.SPEC[who] (the look; .pal keeps the colour palette), Cast.NAME, Cast.WHO, Cast.COLOR
     Cast.style = 'manga' (default) | 'riso'      Cast.debugBones = true  → joints, bone lengths (3D | on screen) and the elbow / knee
          pole drawn over every figure; violations (a wrist past 80°, an elbow buried in the torso) in red. Cast.boneLog collects them.
   BODY RULES (canvas-film BODY-CHECK, the owner's "joints must be physically possible"):
     · every limb is a 2-bone IK in 3D with FIXED bone lengths (upper arm / forearm, thigh / shin, per person; SD has shorter bones),
       solved toward a POLE that never changes during a reach (elbows down-out-back, knees forward-out) — no sign flips mid-move;
       an explicit arms.X.bend keeps the elbow on that side of the shoulder→wrist line instead;
     · a target in front of the torso is given depth (the hand comes toward the camera, the forearm foreshortens) instead of the arm
       passing through the body; the far arm's upper arm always stays behind the torso, its forearm comes round in front only when
       the hand is in front of the chest;
     · the wrist bends at most 80° off the forearm; hands are drawn AT the grip point and held things move with them;
     · sleeves run shoulder → wrist along the solved bones (rolled sleeves: the sleeve ends at a roll just below the elbow, skin below).
   THINGS (unchanged): Cast.donut · box · mug · fridge · counter · coffee · desk · chair · room — see below. */
(function () {
  const WT = window.Webtoon, MG = window.Manga, R = WT.Rig, { clamp, lerp, ss, eo, eio, rng } = Pilot, TAU = Math.PI * 2, PINK = WT.ACCENT;
  const C = {};
  C.style = 'manga';
  C.debugBones = false;
  C.boneLog = [];
  const INK = () => MG.C.ink, PAPER = () => MG.C.paper, PAPERL = () => MG.C.paperL;

  /* ================================================================ the five specs
     look: per part { pal (palette key for riso colour), tone (manga dot coverage), ink (solid black), sh (extra shade coverage) } */
  const SPEC = C.SPEC = {
    park: { name: '박대리', seed: 11, h: 1.0, head: 1.0, expr: 'tired', build: { sh: 60, waist: 42, hip: 46, neck: 12.5 },
      pal: { skin: '#ffe1cf', hair: '#2a2631', hairL: '#55516a', eye: '#3a2e36', brow: '#24212a', shirt: '#bcd6f1', pants: '#3b4050', shoes: '#2a2528', tie: '#2c3a66' },
      shirt: { collar: 'shirt', open: true, roll: true }, tie: { loose: true }, glasses: { r: .3 }, bags: true, outer: null,
      look: { hair: { ink: 1 }, shirt: { tone: 0, sh: .12, white: 1 }, tie: { ink: 1 }, pants: { tone: .62, sh: .16 }, shoes: { ink: 1 }, skin: {} },
      hairStyle: 'park' },
    kim: { name: '김과장', seed: 23, h: 1.02, expr: 'smile', build: { sh: 64, waist: 50, hip: 52, belly: 12, neck: 14 },
      pal: { skin: '#fbdcc6', hair: '#3b312d', hairL: '#6b5d56', eye: '#2f2a28', brow: '#2e2724', shirt: '#f7f6f1', outer: '#8b929d', pants: '#474c58', shoes: '#2c2626', tie: '#5b4b6f', grey: '#a7a19b' },
      shirt: { collar: 'shirt' }, outer: { kind: 'vest' }, tie: {}, moustache: { w: .6 }, browW: 1.2,
      look: { hair: { ink: 1 }, grey: { tone: .22, pal: 'grey' }, shirt: { tone: 0, sh: .12, white: 1 }, outer: { tone: .3 }, tie: { tone: .78 }, pants: { tone: .45 }, shoes: { ink: 1 }, skin: {} },
      hairStyle: 'kim' },
    choi: { name: '최주임', seed: 37, h: 1.04, expr: 'neutral', build: { sh: 68, waist: 46, hip: 48, neck: 14 },
      pal: { skin: '#f6d3b9', hair: '#5a3926', hairL: '#8c6248', eye: '#3a2a20', brow: '#3a2418', shirt: '#a3e1cf', outer: '#3e4659', pants: '#2f3442', shoes: '#f0f0ec', band: '#ef6a5a' },
      shirt: { collar: 'hood' }, hood: true, outer: { kind: 'jacket', open: 40 }, band: true, browW: 1.3,
      look: { hair: { tone: .4 }, shirt: { tone: .12 }, outer: { tone: .76, sh: .14 }, pants: { tone: .5 }, shoes: { tone: 0, white: 1, sh: .14 }, band: { ink: 1 }, skin: {} },
      hairStyle: 'choi' },
    haneul: { name: '하늘', seed: 41, h: .93, head: 1.0, expr: 'neutral', build: { sh: 52, waist: 37, hip: 43, neck: 11, arm: .95 },
      pal: { skin: '#ffe7da', hair: '#3c2824', hairL: '#6e5048', eye: '#5b3a2c', brow: '#3c2824', shirt: '#fbf8f1', outer: '#e9d6b6', skirt: '#6f7d92', shoes: '#8a5a44', sock: '#ffe7da', lanyard: '#4b7bd0', clip: '#ffd23f' },
      shirt: { collar: 'round' }, outer: { kind: 'cardigan', open: 30 }, skirt: { len: 150 }, lanyard: {}, browW: .85, lashes: true,
      look: { hair: { ink: 1 }, shirt: { tone: 0, white: 1 }, outer: { tone: .12, sh: .14 }, skirt: { tone: .42 }, shoes: { tone: .7 }, sock: { tone: 0, sh: .1, white: 1 }, lanyard: { ink: 1 }, clip: { tone: 0, white: 1 }, skin: {} },
      hairStyle: 'haneul' },
    boss: { name: '사장님', seed: 53, h: .92, expr: 'happy', build: { sh: 68, waist: 58, hip: 56, belly: 24, neck: 16 },
      pal: { skin: '#f9d8c0', hair: '#c3bfba', hairL: '#e4e1dc', eye: '#3a3030', brow: '#aaa5a0', shirt: '#f5f3ee', outer: '#8b2f45', pants: '#4a4440', shoes: '#2c2523', tie: '#8b2f45' },
      shirt: { collar: 'shirt' }, outer: { kind: 'cardigan', open: 38 }, browW: 1.9, wrinkles: true,
      look: { hair: { tone: .2 }, brow: { tone: .2 }, shirt: { tone: 0, white: 1, sh: .12 }, outer: { tone: .74, sh: .14 }, pants: { tone: .42 }, shoes: { ink: 1 }, skin: {} },
      hairStyle: 'boss' },
  };
  C.WHO = ['park', 'kim', 'choi', 'haneul', 'boss'];
  C.NAME = { park: '박대리', kim: '김과장', choi: '최주임', haneul: '하늘', boss: '사장님' };
  C.COLOR = { park: '#bcd6f1', kim: '#8b929d', choi: '#a3e1cf', haneul: '#e9d6b6', boss: '#8b2f45' };

  /* ================================================================ paint: a part's fill in the current style */
  // paint(S, key, o, dx, dy) → { fill, tone, shade } for MG.ink. (dx, dy) = the light offset for the cel band (shape units).
  function paint(S, key, o, dx = 0, dy = 0) {
    const st = clamp(o.stone || 0), m = S.look[key] || {}, riso = C.style === 'riso';
    if (riso) { let col = S.pal[m.pal || key] || S.pal.shirt; if (key === 'skin') col = S.pal.skin; if (st) col = WT.stoneCol(col, st);
      return { fill: col, shade: key === 'skin' ? null : { tone: .2, dx, dy } }; }
    if (st > .5) return { fill: PAPER(), tone: m.ink ? .62 : .3, shade: { tone: m.ink ? .8 : .5, dx, dy } };
    if (m.ink) return { fill: INK() };
    const tn = m.tone || 0; return { fill: m.white || key === 'skin' ? PAPERL() : PAPER(), tone: tn, shade: key === 'skin' ? null : { tone: Math.min(.92, tn + (m.sh ?? .18)), dx, dy } };
  }
  const isInk = (S, key, o) => C.style !== 'riso' && !(o.stone > .5) && (S.look[key] || {}).ink;
  const skinP = (S, o) => paint(S, 'skin', o);

  /* ================================================================ HEAD (head units: 1 = face half-width; origin = face centre;
     eyes y ≈ 0, mouth ≈ .62, chin 1.2, crown 1.14 up; hair to ~1.5 up) */
  const RY = y => Math.max(.42, Math.sqrt(Math.max(0, 1 - (y / 1.28) ** 2))) * 1.02;
  // front-surface point x turned by th (a cylinder at that height); width factor of a feature there
  const wrapX = (x, y, th) => { const r = RY(y), a = Math.asin(clamp(x / r, -1, 1)); return r * Math.sin(clamp(a + th, -1.52, 1.52)); };
  const wrapW = (x, y, th) => { const r = RY(y), a = Math.asin(clamp(x / r, -1, 1)); return Math.max(.3, Math.cos(clamp(a + th, -1.52, 1.52)) / Math.max(.3, Math.cos(a))); };
  const hidden = (x, y, th, m = .22) => { const r = RY(y), a = Math.asin(clamp(x / r, -1, 1)) + th; return Math.abs(a) > Math.PI / 2 - m; };
  function headCtx(t, S, o, th, sd) {
    const sn = Math.sin(th), ev = o.hairEv || [];
    const H = { t, S, o, th, sn, sd,
      F: (x, y) => [wrapX(x, y, th), y],                                    // a point ON the face / front of the hair (turns with the face)
      O: (x, y) => [x * (1 - .05 * Math.abs(sn)) - .1 * sn, y],                // a silhouette point (the skull's outline: slides back)
      spring: (i = 0) => WT.spring(t, ev, { lag: i * .06, ph: (S.seed || 1) * .7, wind: o.wind ?? .06 }) };
    return H;
  }
  const hp = (S, key, o, H) => H && H.shadow ? { tone: .22, lw: 0, amp: .4 } : paint(S, key, o, -.12, -.1);
  const shineStroke = (ctx, pts, w = .9) => MG.taper(ctx, pts, w, .15, { col: PAPERL(), belly: true, mid: w * 1.2 });
  const strand = (ctx, pts, w = .55, col) => MG.taper(ctx, pts, w, .1, { col: col || PAPERL() });
  const arc = (H, cx, cy, rx, ry, a0, a1, n = 6) => { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push(H.F(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); } return o; };

  /* ---------------------------------------------------------------- hair, per person: back(ctx, H) behind the face, front(ctx, H) over it */
  const HAIR = {
    park: {
      back(ctx, H) { const { O, S, o } = H;
        MG.ink(ctx, [O(-1.0, .34), O(-1.1, .04), O(-1.24, -.16), O(-1.1, -.32), O(-1.2, -.62), O(-1.06, -.84), O(-1.12, -1.08), O(-.82, -1.24), O(-.72, -1.46), O(-.4, -1.4), O(-.16, -1.6),
          O(.12, -1.45), O(.42, -1.58), O(.62, -1.36), O(.92, -1.32), O(.98, -1.06), O(1.2, -.86), O(1.08, -.62), O(1.22, -.38), O(1.08, -.18), O(1.12, .06), O(1.0, .34), O(0, .1)],
          Object.assign({ smooth: false, step: 9, lw: 1.1 }, hp(S, 'hair', o, H))); },
      front(ctx, H) { const { O, F, S, o } = H, sp = H.spring(1) * .05;
        const pts = [O(-1.04, -.16), O(-1.09, -.6), O(-1.0, -.98), O(-.7, -1.27), O(-.22, -1.42), O(.3, -1.38), O(.72, -1.2), O(1.0, -.92), O(1.09, -.56), O(1.04, -.16),
          F(.92, -.34), F(.8, -.6 + sp), F(.64, -.32), F(.46, -.68 + sp), F(.28, -.36), F(.08, -.72 + sp), F(-.12, -.42), F(-.32, -.72 + sp), F(-.52, -.4), F(-.7, -.66 + sp), F(-.86, -.36), F(-.97, -.5)];
        const p = MG.ink(ctx, pts, Object.assign({ smooth: false, step: 8, lw: 1.1 }, hp(S, 'hair', o, H)));
        if (H.shadow) return;
        if (isInk(S, 'hair', o)) { ctx.save(); ctx.clip(p); shineStroke(ctx, arc(H, -.15, -.62, .62, .5, -2.75, -2.25, 4)); shineStroke(ctx, arc(H, -.15, -.62, .62, .5, -2.1, -1.75, 4), .8); shineStroke(ctx, arc(H, -.15, -.62, .62, .5, -1.6, -1.35, 3), .6);
          strand(ctx, [F(.1, -1.3), F(.18, -.95), F(.3, -.5)]); strand(ctx, [F(-.45, -1.25), F(-.38, -.9), F(-.3, -.55)]); ctx.restore(); }
        // the ahoge: a tapered curl springing from the crown
        const a = H.spring(0) * 1.4, c = Math.cos(a), s = Math.sin(a), b = F(.06, -1.36), Rr = (x, y) => [b[0] + x * c - y * s, b[1] + x * s + y * c];
        const curl = [Rr(0, .06), Rr(.02, -.26), Rr(.2, -.5), Rr(.42, -.52), Rr(.46, -.36), Rr(.34, -.3)];
        MG.taper(ctx, curl, 2.6, .5, { belly: true, mid: 2.8, col: C.style === 'riso' ? S.pal.hair : INK() }); },
    },
    kim: {
      back(ctx, H) { const { O, S, o } = H;
        const p = MG.ink(ctx, [O(-1.06, .2), O(-1.12, -.5), O(-1.0, -1.05), O(-.56, -1.38), O(.12, -1.46), O(.74, -1.3), O(1.06, -.92), O(1.12, -.45), O(1.06, .2), O(0, -.1)], Object.assign({ lw: 1.1 }, hp(S, 'hair', o, H)));
        if (H.shadow) return; ctx.save(); ctx.clip(p); for (const s of [-1, 1]) MG.ink(ctx, MG.ell(H.O(s * 1.04, -.2)[0], -.2, .18, .42, 14), Object.assign({ lw: 0 }, paint(S, 'grey', o))); ctx.restore(); },
      front(ctx, H) { const { O, F, S, o } = H;   // a 2:8 part on HIS left (screen-right); the sweep falls to screen-left
        const pts = [O(-1.04, -.2), O(-1.1, -.72), O(-.92, -1.12), O(-.42, -1.4), O(.18, -1.44), O(.7, -1.28), O(1.0, -.98), O(1.08, -.56), O(1.04, -.2),
          F(.88, -.48), F(.7, -.78), F(.52, -1.0), F(.38, -.84), F(.12, -.74), F(-.24, -.68), F(-.58, -.62), F(-.86, -.5)];
        const p = MG.ink(ctx, pts, Object.assign({ lw: 1.1 }, hp(S, 'hair', o, H)));
        if (H.shadow) return;
        ctx.save(); ctx.clip(p);
        if (isInk(S, 'hair', o)) { strand(ctx, [F(.5, -1.0), F(.49, -1.2), F(.5, -1.42)], .8); strand(ctx, [F(.42, -1.12), F(.0, -1.1), F(-.55, -.92), F(-.9, -.62)], .6); strand(ctx, [F(.34, -1.28), F(-.2, -1.26), F(-.7, -1.02)], .5);
          shineStroke(ctx, arc(H, .0, -.6, .7, .55, -2.6, -2.15, 4), .8); }
        for (const s of [-1, 1]) { if (s * H.sn > .4) continue; MG.ink(ctx, MG.ell(O(s * 1.03, -.32)[0], -.32, .14, .3, 14), Object.assign({ lw: 0 }, paint(S, 'grey', o))); }
        ctx.restore(); },
    },
    choi: {
      back(ctx, H) { const { O, S, o } = H;
        MG.ink(ctx, [O(-1.06, -.05), O(-1.1, -.8), O(-.86, -1.3), O(-.3, -1.5), O(.3, -1.52), O(.86, -1.3), O(1.1, -.8), O(1.06, -.05), O(0, -.3)], Object.assign({ lw: 1.1 }, hp(S, 'hair', o, H))); },
      front(ctx, H) { const { O, F, S, o } = H, sp = H.spring(0) * .18;
        const pts = [O(-1.04, -.42), O(-1.1, -.92), O(-1.02, -1.24), O(-.86 + sp, -1.64), O(-.62, -1.36), O(-.42 + sp, -1.8), O(-.18, -1.42), O(.06 + sp, -1.88), O(.28, -1.44), O(.52 + sp, -1.78), O(.68, -1.34), O(.94 + sp, -1.56), O(1.0, -1.2), O(1.1, -.92), O(1.04, -.42),
          F(.86, -.8), F(.7, -.94), F(.52, -.74), F(.32, -.98), F(.14, -.76), F(-.08, -1.0), F(-.28, -.78), F(-.48, -1.0), F(-.66, -.78), F(-.84, -.94)];
        const p = MG.ink(ctx, pts, Object.assign({ smooth: false, step: 8, lw: 1.1 }, hp(S, 'hair', o, H)));
        if (H.shadow) return;
        ctx.save(); ctx.clip(p); for (const [x0, x1] of [[-.5, -.42], [-.06, .06], [.4, .52]]) strand(ctx, [F(x0, -.98), F((x0 + x1) / 2, -1.3), O(x1 + sp, -1.7)], .6, INK()); ctx.restore();
        for (const s of [-1, 1]) { if (s * H.sn > .35) continue; const x = O(s * 1.03, -.3)[0]; MG.ink(ctx, [[x, -.5], [x - s * .12, -.5], [x - s * .09, -.14]], Object.assign({ lw: .6, smooth: false }, hp(S, 'hair', o, H))); } },
    },
    haneul: {
      back(ctx, H) { const { O, S, o } = H, sw = H.spring(0) * .08;
        MG.ink(ctx, [O(-1.24 + sw, .98), O(-1.34, .3), O(-1.3, -.55), O(-1.05, -1.2), O(-.4, -1.5), O(.4, -1.5), O(1.05, -1.2), O(1.3, -.55), O(1.34, .3), O(1.24 + sw, .98), O(.95, 1.06), O(-.95, 1.06)],
          Object.assign({ lw: 1.1 }, hp(S, 'hair', o, H))); },
      front(ctx, H) { const { O, F, S, o } = H, sw = H.spring(1) * .06;
        const pts = [O(-1.08, -.45), O(-1.12, -.9), O(-.92, -1.26), O(-.4, -1.46), O(.4, -1.46), O(.92, -1.26), O(1.12, -.9), O(1.08, -.45),
          F(.86, -.36), F(.62, -.42), F(.38, -.34), F(.14, -.42), F(-.1, -.34), F(-.34, -.42), F(-.58, -.34), F(-.84, -.4)];
        const p = MG.ink(ctx, pts, Object.assign({ lw: 1.1, step: 8 }, hp(S, 'hair', o, H)));
        if (!H.shadow && isInk(S, 'hair', o)) { ctx.save(); ctx.clip(p); shineStroke(ctx, arc(H, 0, -.55, .78, .6, -2.7, -2.2, 4)); shineStroke(ctx, arc(H, 0, -.55, .78, .6, -2.05, -1.75, 4), .8); shineStroke(ctx, arc(H, 0, -.55, .78, .6, -1.5, -1.2, 4), .7);
          for (const x of [-.5, .2, .66]) strand(ctx, [F(x, -1.3), F(x, -.9), F(x - .02, -.48)], .45); ctx.restore(); }
        if (H.shadow) return;
        for (const s of [-1, 1]) { if (s * H.sn > .45) continue; const x0 = O(s * 1.05, -.6)[0], x1 = O(s * 1.1, .4)[0];   // side locks in front of the cheeks
          MG.ink(ctx, [[x0, -.78], [x0 + s * .14, -.2], [x1 + s * .14 + sw, .7], [x1 + s * .08 + sw, 1.04], [x1 - s * .2 + sw, .98], [x1 - s * .13, .45], [x0 - s * .14, -.2], [x0 - s * .12, -.62]], Object.assign({ lw: 1.05 }, hp(S, 'hair', o, H))); }
        if (H.sn > -.5) { const c = F(.58, -1.04); ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(-.55);   // the hair clip (screen-right)
          MG.ink(ctx, [[-.26, -.08], [.26, -.08], [.26, .08], [-.26, .08]], Object.assign({ lw: .85, smooth: false }, paint(S, 'clip', o)));
          if (C.style !== 'riso') { ctx.fillStyle = INK(); ctx.fillRect(-.16, -.02, .32, .035); } ctx.restore(); } },
    },
    boss: {
      back(ctx, H) {},
      front(ctx, H) { const { O, F, S, o } = H; if (H.shadow) return;
        for (const s of [-1, 1]) { if (s * H.sn > .5) continue; const X = (x, y) => O(s * x, y);   // grey tufts round the ears
          MG.ink(ctx, [X(.9, -.78), X(1.12, -.66), X(1.24, -.4), X(1.2, -.12), X(1.26, .1), X(1.12, .34), X(.98, .4), X(.96, .05), X(.98, -.4)], Object.assign({ lw: 1 }, hp(S, 'hair', o, H)));
          MG.taper(ctx, [X(1.12, -.5), X(1.18, -.2), X(1.12, .2)], .5, .1); }
        // the dome's shine + two forehead lines
        MG.ink(ctx, [F(-.52, -.98), F(-.36, -1.06), F(-.18, -1.08)], { closed: false, lw: .55, single: true });
        MG.ink(ctx, [F(-.6, -.86), F(-.55, -.9)], { closed: false, lw: .55, single: true });
        MG.taper(ctx, [F(-.3, -.72), F(0, -.77), F(.3, -.72)], .35, .35, { belly: true, mid: .7 }); MG.taper(ctx, [F(-.22, -.6), F(0, -.63), F(.22, -.6)], .3, .3, { belly: true, mid: .6 }); },
    },
  };

  /* ---------------------------------------------------------------- features */
  const EXPR = R.EXPR;   // the same expression names as the webtoon rig
  // one eye at (x, y), sc = size, wf = width factor (3/4), side −1 = screen-left eye, open 0…1 (blink), look [gx, gy]
  function eye(ctx, kind, x, y, sc, wf, side, open, look, o) {
    const rx = .105 * sc * wf, ry = .14 * sc, lx = look[0] * .035 * sc, ly = look[1] * .03 * sc, P = INK(), W = PAPERL();
    const dot = (rr = 1) => { MG.ink(ctx, MG.ell(x + lx, y + ly, rx * rr, ry * rr, 14), { fill: P, lw: .5, single: true });
      ctx.fillStyle = W; ctx.beginPath(); ctx.arc(x + lx + rx * .35, y + ly - ry * .38, rx * .34 * rr, 0, TAU); ctx.fill(); };
    const line = (pts, w = 1) => MG.ink(ctx, pts, { closed: false, lw: w, single: true });
    if (kind === 'happy') return line([[x - .16 * sc * wf, y + .06 * sc], [x, y - .1 * sc], [x + .16 * sc * wf, y + .06 * sc]], 1.05);
    if (kind === 'content') return line([[x - .15 * sc * wf, y - .02 * sc], [x, y + .08 * sc], [x + .15 * sc * wf, y - .02 * sc]], 1);
    if (kind === 'squeeze') { const s = -side; return line([[x - s * .14 * sc * wf, y - .1 * sc], [x + s * .1 * sc * wf, y], [x - s * .14 * sc * wf, y + .1 * sc]], 1.05); }
    if (kind === 'line') return line([[x - .14 * sc * wf, y], [x + .14 * sc * wf, y + .005]], 1);
    if (open < .25 && kind !== 'shock' && kind !== 'blank' && kind !== 'dead') return line([[x - .14 * sc * wf, y], [x, y + .06 * sc], [x + .14 * sc * wf, y]], 1);
    if (kind === 'shock' || kind === 'blank') { MG.ink(ctx, MG.ell(x, y, .15 * sc * wf, .17 * sc, 16), { fill: W, lw: .8, single: true }); if (kind === 'shock') { ctx.fillStyle = P; ctx.beginPath(); ctx.arc(x + lx, y + ly, .035 * sc, 0, TAU); ctx.fill(); } return; }
    if (kind === 'dead') { MG.ink(ctx, MG.ell(x, y + .01, .13 * sc * wf, .13 * sc, 14), { fill: W, lw: .75, single: true }); ctx.fillStyle = P; ctx.beginPath(); ctx.arc(x, y + .01, .025 * sc, 0, TAU); ctx.fill();
      line([[x - .17 * sc * wf, y - .1 * sc], [x + .17 * sc * wf, y - .11 * sc]], .9); return; }
    if (kind === 'sparkle') { MG.ink(ctx, MG.ell(x, y, rx * 1.3, ry * 1.25, 16), { fill: P, lw: .5, single: true }); WT.star4(ctx, x - rx * .1, y - ry * .15, rx * 1.15 * (1 + .12 * Math.sin((o.t || 0) * 8)), .2, W, .2); return; }
    ctx.save(); ctx.translate(0, y + ry * .5); ctx.scale(1, Math.max(.2, open)); ctx.translate(0, -y - ry * .5);
    if (kind === 'sharp' || kind === 'focus' || kind === 'tired') {   // a lowered lid: the top of the eye cut by a slanted line
      const s = -side, inr = kind === 'focus' ? .07 : kind === 'sharp' ? .03 : -.02, out = kind === 'focus' ? -.05 : kind === 'sharp' ? -.06 : -.02, top = kind === 'tired' ? .0 : -.03;
      const lid = [[x - s * .2 * sc * wf, y + (top + out) * sc], [x + s * .2 * sc * wf, y + (top + inr) * sc]];
      ctx.save(); const cp = new Path2D(); cp.moveTo(lid[0][0], lid[0][1]); cp.lineTo(lid[1][0], lid[1][1]); cp.lineTo(lid[1][0], y + sc); cp.lineTo(lid[0][0], y + sc); cp.closePath(); ctx.clip(cp);
      dot(kind === 'tired' ? .95 : 1); ctx.restore();
      line([[lid[0][0] - s * .02, lid[0][1] - .01], [(lid[0][0] + lid[1][0]) / 2, (lid[0][1] + lid[1][1]) / 2 - .015 * sc], [lid[1][0], lid[1][1]]], kind === 'tired' ? 1 : 1.15);
      if (kind === 'sharp' && o.glint) WT.star4(ctx, x - rx * .2, y - ry * .3, rx * 1.4, .3, W, .16);
    } else dot(1);
    ctx.restore();
    if (o.lashes) line([[x + side * .12 * sc * wf, y - .03 * sc], [x + side * .2 * sc * wf, y - .1 * sc]], .8);
  }
  // one brow: inner → outer, kinds neutral | soft | up | sad | angry | flat
  function brow(ctx, kind, x, y, side, wf, wgt, col) {
    const sh = { neutral: [0, -.06, .01], soft: [.02, -.06, .04], up: [-.08, -.15, -.07], sad: [-.08, -.04, .05], angry: [.08, .0, -.07], flat: [0, -.01, 0] }[kind] || [0, -.06, .01];
    const s = side, pts = [[x - s * .17 * wf, y + sh[0]], [x, y + sh[1]], [x + s * .17 * wf, y + sh[2]]];
    MG.taper(ctx, pts, 1.9 * wgt, .7 * wgt, { belly: true, mid: 2.1 * wgt, col });
  }
  // the mouth at (mx, my), width factor mw. talk (0…1) opens the open kinds.
  function mouth(ctx, kind, mx, my, mw, o, sd) {
    const P = INK(), W = PAPERL(), t = o.t || 0, k = sd ? 1.15 : 1;
    const line = (pts, w = 1) => MG.ink(ctx, pts.map(([x, y]) => [mx + x * mw * k, my + y * k]), { closed: false, lw: w, single: true });
    const open = (w, h, teeth = true, tongue = true) => { const pts = [[-w, 0], [-w * .5, -.02], [w * .5, -.02], [w, 0], [w * .72, h * .78], [0, h], [-w * .72, h * .78]].map(([x, y]) => [mx + x * mw * k, my + y * k]);
      const p = MG.ink(ctx, pts, { fill: P, lw: .9 }); ctx.save(); ctx.clip(p);
      if (teeth) { ctx.fillStyle = W; ctx.fillRect(mx - w * k, my - .1 * k, w * 2 * k, .1 * k + h * .2 * k); }
      if (tongue && h > .16) { ctx.fillStyle = C.style === 'riso' ? '#e9707e' : MG.tone(ctx, .34); ctx.beginPath(); ctx.ellipse(mx, my + h * k, w * .55 * mw * k, h * .42 * k, 0, 0, TAU); if (C.style !== 'riso') { ctx.fillStyle = W; ctx.fill(); ctx.fillStyle = MG.tone(ctx, .34); } ctx.fill(); }
      ctx.restore(); };
    const tk = o.talk != null && o.talk > 0 ? .5 + .5 * clamp(o.talk) : null;
    if (kind === 'small') line([[-.08, 0], [0, .03], [.08, 0]], .9);
    else if (kind === 'smile') line([[-.2, -.03], [0, .1], [.2, -.03]], 1);
    else if (kind === 'smirk') line([[-.12, .03], [.06, .05], [.18, -.06]], 1);
    else if (kind === 'grin') open(.3, .34 * (tk ?? 1));
    else if (kind === 'talk') { const v = o.talk ?? (.5 + .5 * Math.abs(Math.sin(t * 11))); open(.13 + .05 * v, .06 + .2 * v, v > .45); }
    else if (kind === 'o') MG.ink(ctx, MG.ell(mx, my + .05 * k, .08 * mw * k, .11 * k, 12), { fill: P, lw: .8, single: true });
    else if (kind === 'wail') open(.34, (.44 + .04 * Math.sin(t * 9)) * (tk ?? 1));
    else if (kind === 'chew') { const ph = Math.floor(t * 6) % 2 ? 1 : -1; line([[-.15, 0], [-.05, .04 * ph], [.05, -.03 * ph], [.15, .01]], .95); }
    else if (kind === 'flat') line([[-.12, 0], [.12, 0]], .95);
    else if (kind === 'frown') line([[-.16, .05], [0, -.05], [.16, .05]], 1);
    else if (kind === 'teeth') { const pts = [[-.22, -.06], [.22, -.06], [.2, .1], [-.2, .1]].map(([x, y]) => [mx + x * mw * k, my + y * k]); MG.ink(ctx, pts, { fill: W, lw: .9, smooth: false });
      for (const x of [-.11, 0, .11]) line([[x, -.05], [x, .09]], .45); line([[-.2, .02], [.2, .02]], .45); }
    else if (kind === 'wavy') line([[-.18, 0], [-.09, .03], [0, -.02], [.09, .03], [.18, 0]], .9);
    else if (kind === 'cat') line([[-.16, -.02], [-.08, .06], [0, 0], [.08, .06], [.16, -.02]], .9);
    else if (kind === 'eat') open(.14, .2, false);
    else line([[-.08, 0], [0, .03], [.08, 0]], .9);
  }
  // the head at the current transform (head units); E = expression, th = turn. → { eyes, mouth } (head units)
  function drawHead(ctx, t, S, o, E, th, sd) {
    const H = headCtx(t, S, o, th, sd), sn = H.sn, seed = S.seed || 1, hs = HAIR[S.hairStyle];
    const open = o.open === false || o.blink === false ? 1 : (o.open ?? WT.blink(seed, t)), look = o.look || [sn * .6, 0];
    const eyeY = sd ? .2 : .02, eyeX = sd ? .42 : .4, eS = sd ? 1.45 : 1, mY = (sd ? .66 : .62) + (S.moustache && !sd ? .1 : 0), nod = (o.nod || 0) * .14, fy = nod;
    const sk = skinP(S, o);
    // back hair
    if (o.back !== false && hs) { ctx.save(); hs.back(ctx, H); ctx.restore(); }
    // ears (behind the face at the sides; on the cheek in 3/4)
    const ear = (side, front) => { const a = side * (Math.PI / 2 - .12) + th; if (Math.abs(a) > Math.PI / 2 + .12) return; const ex = Math.sin(a) * 1.0, inFace = Math.abs(Math.sin(a)) < .93; if (inFace !== front) return;
      const w = .17 * Math.max(.55, Math.abs(Math.cos(a)) + .45); MG.ink(ctx, MG.ell(ex + side * (inFace ? 0 : .02), .1 + fy * .3, w, .26, 14), Object.assign({ lw: 1 }, sk));
      MG.ink(ctx, [[ex + side * w * .1, .0], [ex + side * w * .45, .1], [ex + side * w * .05, .26]], { closed: false, lw: .55, single: true }); };
    ear(-1, false); ear(1, false);
    // the face: a round head (riso face(): rx 1, ry 1.17), the jaw sliding toward the turn
    const fp = []; const cheek = (E.cheek && !o.stone) ? (sn >= 0 ? 1 : -1) * (Math.floor(t * 6) % 2 ? 1 : .6) : 0;
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, c = Math.cos(a), s = Math.sin(a), ry = s > 0 ? (sd ? 1.08 : 1.2) : (sd ? 1.12 : 1.14);
      const bul = cheek && c * cheek > .3 && s > -.1 ? .12 * (c * cheek - .3) : 0; let x = c * (1 + bul) * (sd ? 1.06 : 1), y = s * ry; x += .09 * sn * Math.max(0, y) - .04 * sn; fp.push([x, y]); }
    const face = MG.ink(ctx, fp, Object.assign({ lw: 1.15 }, sk));
    ctx.save(); ctx.clip(face);
    // the fringe's cast shadow (light dots) on the forehead; gloom lines (shock / dead)
    if (hs && C.style !== 'riso' && !o.stone && o.front !== false) { ctx.save(); ctx.translate(.04, .12); H.shadow = true; hs.front(ctx, H); H.shadow = false; ctx.restore(); }
    if (E.shade || o.gloom) { const g = o.gloom ?? 1; for (let i = 0; i < 9; i++) { const x = -.8 + i * .2, L = .35 + .25 * ((i * 7) % 3) / 2; MG.taper(ctx, [[x, -1.2], [x, -1.2 + L * g + .2]], .9, .1, { amp: .3 }); } }
    ctx.restore();
    ear(-1, true); ear(1, true);
    // eyes, bags, glasses
    const eyes = []; const kind = o.stone ? (o.eyes || 'blank') : E.eyes;
    for (const side of [-1, 1]) { const x0 = side * eyeX, x = wrapX(x0, eyeY, th), wf = wrapW(x0, eyeY, th); eyes.push([x, eyeY + fy]);
      if (hidden(x0, eyeY, th, .3)) continue;
      eye(ctx, kind, x, eyeY + fy, eS, wf, side, open, look, { glint: E.glint, t, lashes: S.lashes });
      if (S.bags && !sd && kind !== 'happy' && kind !== 'squeeze') { MG.taper(ctx, [[x - .1 * wf, eyeY + .2 + fy], [x + side * .02, eyeY + .25 + fy], [x + side * .14 * wf, eyeY + .19 + fy]], .5, .2, { belly: true, mid: .6 }); }
      if (S.wrinkles && !sd) { MG.taper(ctx, [[x + side * .24 * wf, eyeY - .02 + fy], [x + side * .34 * wf, eyeY - .06 + fy]], .5, .1); MG.taper(ctx, [[x + side * .24 * wf, eyeY + .08 + fy], [x + side * .34 * wf, eyeY + .12 + fy]], .5, .1); } }
    if (S.glasses) { const gr = S.glasses.r * (sd ? 1.15 : 1); const G2 = eyes.map(([x, y], i) => [x, y + .01, gr * wrapW((i ? 1 : -1) * eyeX, eyeY, th), i ? 1 : -1]);
      for (const [x, y, rx, side] of G2) { if (hidden(side * eyeX, eyeY, th, .15)) continue;
        if (E.glint) { const p = MG.ink(ctx, MG.ell(x, y, rx, gr * .92, 18), { fill: PAPERL(), lw: .9 }); ctx.save(); ctx.clip(p); MG.taper(ctx, [[x - rx * .6, y + gr * .3], [x + rx * .3, y - gr * .7]], 1.6, 1.6); MG.taper(ctx, [[x - rx * .1, y + gr * .55], [x + rx * .6, y - gr * .25]], .7, .7); ctx.restore(); }
        else { MG.ink(ctx, MG.ell(x, y, rx, gr * .92, 18), { lw: .9 }); MG.taper(ctx, [[x - rx * .62, y - gr * .1], [x - rx * .2, y - gr * .58]], .45, .2); } }
      const [a, b] = G2; if (!hidden(-eyeX, eyeY, th, .15) && !hidden(eyeX, eyeY, th, .15)) MG.ink(ctx, [[a[0] + a[2] * .95, a[1] - .04], [(a[0] + b[0]) / 2, a[1] - .1], [b[0] - b[2] * .95, b[1] - .04]], { closed: false, lw: .8, single: true });
      const near = sn >= 0 ? 0 : 1, nr = G2[near], far = sn >= 0 ? -1 : 1;   // the temple arm on the near side, back to the ear
      if (Math.abs(sn) > .12) MG.ink(ctx, [[nr[0] + far * nr[2], nr[1] - .04], [far * (1 - .3 * Math.abs(sn)) + .1 * sn, -.02]], { closed: false, lw: .75, single: true });
      if (E.glint) for (const [x, y, rx] of G2) WT.star4(ctx, x + rx * .55, y - gr * .55, .3, .2, '#fff', .15); }
    // nose (a hooked tick pointing to the turn), blush hatching, moustache, mouth
    const nx = wrapX(0, .3, th), nd = sn > .1 ? 1 : sn < -.1 ? -1 : -1;
    if (!sd) MG.ink(ctx, [[nx - .02 * nd, .14 + fy], [nx + .09 * nd, .34 + fy], [nx - .06 * nd, .39 + fy]], { closed: false, lw: .8, single: true });
    else { ctx.fillStyle = INK(); ctx.beginPath(); ctx.arc(nx, .44 + fy, .025, 0, TAU); ctx.fill(); }
    const bl = o.blush || 0, by = sd ? .48 : .42, bx = sd ? .62 : .64;
    for (const side of [-1, 1]) { const x0 = side * bx; if (hidden(x0, by, th, .35)) continue; const x = wrapX(x0, by, th), wf = wrapW(x0, by, th), n = 3 + Math.round(bl * 2);
      if (bl > .2 && C.style !== 'riso') { ctx.fillStyle = MG.tone(ctx, .14); ctx.beginPath(); ctx.ellipse(x, by + .05, .2 * wf, .1, 0, 0, TAU); ctx.fill(); }
      for (let i = 0; i < n; i++) { const hx = x + (i - (n - 1) / 2) * .1 * wf; MG.taper(ctx, [[hx + .04 * wf, by - .04 + fy], [hx - .03 * wf, by + .1 + fy]], .7, .25, { col: C.style === 'riso' ? '#d9536f' : INK() }); } }
    const mx = wrapX(0, mY, th), mw = wrapW(0, mY, th);
    let mk = o.mouth || E.mouth; if (o.stone && !o.mouth) mk = 'flat';
    if (S.wrinkles && !sd) for (const side of [-1, 1]) { if (hidden(side * .32, mY, th, .3)) continue; const x = wrapX(side * .34, mY, th); MG.taper(ctx, [[x, mY - .18 + fy], [x + side * .05, mY - .02 + fy], [x + side * .01, mY + .1 + fy]], .5, .15); }
    mouth(ctx, mk, mx, mY + fy, mw, { t, talk: o.talk }, sd);
    if (S.moustache && !sd) { const w2 = S.moustache.w * mw, y = mY - .2 + fy, x = mx;   // a wide soft brush: thick in the middle, drooping tapered ends
      const pts = [[x, y - .06], [x - w2 * .35, y - .1], [x - w2 * .75, y - .06], [x - w2 * 1.0, y + .06], [x - w2 * 1.08, y + .16], [x - w2 * .8, y + .12], [x - w2 * .45, y + .1], [x - w2 * .15, y + .08], [x, y + .04],
        [x + w2 * .15, y + .08], [x + w2 * .45, y + .1], [x + w2 * .8, y + .12], [x + w2 * 1.08, y + .16], [x + w2 * 1.0, y + .06], [x + w2 * .75, y - .06], [x + w2 * .35, y - .1]];
      const p = MG.ink(ctx, pts, Object.assign({ lw: .8 }, paint(S, 'hair', o, -.03, -.03)));
      if (isInk(S, 'hair', o)) { ctx.save(); ctx.clip(p); for (const i of [-3, -2, -1, 1, 2, 3]) strand(ctx, [[x + i * w2 * .26, y - .05], [x + i * w2 * .3, y + .1]], .35); ctx.restore(); } }
    // front hair, then brows (over the hair: they read through a fringe)
    if (o.front !== false && hs) { ctx.save(); hs.front(ctx, H); ctx.restore(); }
    const bk = o.brows || E.brows, bY = (sd ? -.2 : -.33) + fy * .6, bcol = C.style === 'riso' ? (S.pal.brow || INK()) : (S.look.brow ? null : INK());
    for (const side of [-1, 1]) { const x0 = side * eyeX; if (hidden(x0, bY, th, .3)) continue; const x = wrapX(x0, bY, th), wf = wrapW(x0, bY, th);
      if (S.look.brow && C.style !== 'riso') { const s = side, pts = [[x - s * .19 * wf, bY + .02], [x, bY - .08], [x + s * .2 * wf, bY + .03], [x + s * .16 * wf, bY + .1], [x - s * .17 * wf, bY + .09]]; MG.ink(ctx, pts, Object.assign({ lw: .7 }, paint(S, 'brow', o))); }
      else brow(ctx, bk, x, bY, side, wf, (S.browW || 1) * (sd ? .9 : 1), bcol); }
    if (o.stone && o.crack) { const r = rng(WT.hash(S.name, 'crack')); for (let i = 0; i < 3; i++) { let x = (r() - .5) * 1.4, y = -1.1 + r() * .2; const pts = [[x, y]]; for (let j = 0; j < 4; j++) { x += (r() - .5) * .5; y += .3 + r() * .2; pts.push([x, y]); }
      ctx.save(); ctx.globalAlpha *= clamp(o.crack); MG.ink(ctx, pts, { closed: false, lw: .7, single: true, smooth: false }); ctx.restore(); } }
    return { eyes, mouth: [mx, mY + fy] };
  }
  C.drawHead = drawHead;

  /* ================================================================ HANDS (hand units: 1 = palm length; x from the wrist along the hand,
     the thumb on −y when flip = +1). Same grip table as the webtoon rig, so Webtoon.Rig.gripOffset still matches. */
  const GRIP = R.GRIP;
  const fingerPts = (x0, y0, ang, len, curl = 0, n = 4) => { const o = []; let a = ang, p = [x0, y0]; for (let i = 0; i <= n; i++) { o.push(p.slice()); p = [p[0] + Math.cos(a) * len / n, p[1] + Math.sin(a) * len / n]; a += curl / n; } return o; };
  function drawHand(ctx, pose, x, y, ang, sz, flip, S, o = {}) {
    const sk = skinP(S, o); ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sz, sz * (flip < 0 ? -1 : 1));
    const F = (pts, w, w2 = w * .85) => MG.ink(ctx, MG.tube(pts, pts.map((_, i) => lerp(w, w2, i / (pts.length - 1)))), Object.assign({ lw: .85, step: 5 }, sk));
    const palm = (x1 = .98, wt = .36) => MG.ink(ctx, [[-.06, -.26], [.3, -wt], [x1 * .8, -wt * 1.02], [x1, -wt * .62], [x1 + .04, 0], [x1, wt * .62], [x1 * .8, wt], [.3, wt * .98], [-.06, .26]], Object.assign({ lw: .9, step: 5 }, sk));
    const knuckles = (x0 = .62, x1 = 1.1, y0 = -.36, y1 = .36, n = 4) => { const pts = [[x0, y0], [x1 - .08, y0 - .02]]; for (let i = 0; i < n; i++) { const yy = lerp(y0, y1, (i + .5) / n), h = (y1 - y0) / n / 2; pts.push([x1 + .02, yy - h * .9], [x1 + .07, yy], [x1 + .02, yy + h * .9]); } pts.push([x1 - .08, y1 + .02], [x0, y1]);
      MG.ink(ctx, pts, Object.assign({ lw: .85, step: 4 }, sk)); for (let i = 1; i < n; i++) { const yy = lerp(y0, y1, i / n); MG.ink(ctx, [[x1 - .2, yy], [x1 + .03, yy]], { closed: false, lw: .45, single: true }); } };
    const thumb = (pts, w = .13) => F(pts, w, w * .9);
    if (pose === 'mitt') { MG.ink(ctx, MG.ell(.5, 0, .55, .46, 16), Object.assign({ lw: .9 }, sk)); MG.ink(ctx, MG.ell(.4, -.44, .19, .14, 12, -.5), Object.assign({ lw: .8 }, sk)); }
    else if (pose === 'open' || pose === 'cup') {   // a mitten (riso hand): palm + fingers as one rounded shape, finger lines at the tip, a thumb
      const c = pose === 'cup' ? -.22 : .1; thumb([[.18, -.3], [.46, -.52], [.7, -.56]], .14);
      const m = MG.ink(ctx, [[-.06, -.28], [.4, -.38], [.95, -.36], [1.35, -.3 + c * .4], [1.55, -.12 + c], [1.56, .08 + c], [1.38, .28 + c * .6], [.95, .38], [.4, .38], [-.06, .28]], Object.assign({ lw: .95, step: 5 }, sk));
      for (const y of [-.14, .04, .2]) MG.ink(ctx, [[1.14, y + c * .5], [1.44, y + c * .9]], { closed: false, lw: .5, single: true }); }
    else if (pose === 'paper' || pose === 'wave') {
      for (const [y0, L, a] of [[.24, .52, .42], [.08, .64, .14], [-.08, .68, -.12], [-.24, .6, -.4]]) F(fingerPts(.84, y0, a, L, 0), .13, .115);
      palm(); thumb([[.2, -.28], [.32, -.6], [.4, -.88]], .14); }
    else if (pose === 'fist' || pose === 'rock' || pose === 'hold' || pose === 'thumb') { palm(.8, .38); knuckles(.6, 1.12, -.38, .38);
      if (pose === 'thumb') thumb([[.3, -.32], [.36, -.68], [.38, -1.0]], .15); else thumb([[.22, -.38], [.58, -.46], [.92, -.38]], .14); }
    else if (pose === 'point') {   // the INDEX finger out along the hand, the thumb cocked up beside it, three fingers curled — never a lone raised digit
      palm(.8, .38); knuckles(.6, 1.04, -.04, .38, 3); F(fingerPts(.8, -.24, -.03, .98, .05), .13, .11); thumb([[.24, -.34], [.5, -.64], [.74, -.8]], .14); }
    else if (pose === 'scissors') { palm(.8, .38); knuckles(.6, 1.02, .04, .38, 2); F(fingerPts(.8, -.26, -.36, .84, 0), .125, .11); F(fingerPts(.82, -.06, .03, .9, 0), .13, .115); thumb([[.26, -.22], [.6, -.02], [.9, .12]], .14); }
    else if (pose === 'grab') { for (const [y0, a] of [[.27, .2], [.09, .06], [-.09, -.06], [-.27, -.2]]) F(fingerPts(.84, y0, a - .25, .62, 1.5, 5), .125, .11);
      palm(.88, .4); thumb([[.2, -.32], [.6, -.74], [.98, -.78], [1.16, -.6]], .14); }
    else if (pose === 'pinch') { for (const [y0, L] of [[.27, .44], [.1, .5]]) F(fingerPts(.84, y0, .3, L, 1.6, 4), .12, .105); F(fingerPts(.86, -.06, .05, .48, 1.2, 4), .125, .11);
      palm(.86, .38); F([[.84, -.24], [1.08, -.4], [1.3, -.5], [1.38, -.44]], .125, .105); thumb([[.22, -.32], [.62, -.6], [1.0, -.62], [1.32, -.46]], .14); }
    else { palm(); }
    ctx.restore();
    const g = GRIP[pose] || GRIP.open, c = Math.cos(ang), s = Math.sin(ang), fy = flip < 0 ? -1 : 1, P = (u, v) => [x + (u * c - v * fy * s) * sz, y + (u * s + v * fy * c) * sz];
    return { grip: P(g[0], g[1]), tip: P(pose === 'point' ? 1.8 : 1.6, pose === 'point' ? -.3 : 0), P };
  }
  C.drawHand = drawHand;

  /* ================================================================ 3D two-bone IK (fixed bone lengths; the joint toward a pole) */
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const n3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  function ik3(S, T, l1, l2, pole) {
    const d = sub3(T, S), L = Math.hypot(d[0], d[1], d[2]) || 1e-6, Lc = clamp(L, Math.abs(l1 - l2) + 1, l1 + l2 - .5), dn = [d[0] / L, d[1] / L, d[2] / L];
    const a = (l1 * l1 - l2 * l2 + Lc * Lc) / (2 * Lc), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let p = sub3(pole, [dn[0] * dot3(pole, dn), dn[1] * dot3(pole, dn), dn[2] * dot3(pole, dn)]); if (Math.hypot(p[0], p[1], p[2]) < 1e-4) p = [dn[1], -dn[0], 0]; p = n3(p);
    return { e: add3(add3(S, dn, a), p, h), w: add3(S, dn, Lc), reach: L <= l1 + l2 - .5 };
  }
  C.ik3 = ik3;
  const ZS = { head: 0, nod: 0, body: 0, breath: 0 };
  const toDeg = a => a * 180 / Math.PI;
  const angDiff = (a, b) => ((a - b + 3 * Math.PI) % TAU) - Math.PI;
  // the arm solver shared by person() and chibi(): shoulder S (rig-local 2D) + depth, target (rig-local 2D) or null, → arm
  function solveArm(A, side, S2, Sz, L1, L2, hsz, rest, depthOf, pose, defHand) {
    const pose2 = A.hand || defHand; let target = A.to ? A.toL : rest, ang, flip = A.thumb ?? 1, sol = null, wrist = target, z = 0;
    const wantAng = A.ang != null ? A.ang - (A.rot || 0) : null, S3 = [S2[0], S2[1], Sz];
    for (let it = 0; it < 3; it++) {
      const dir0 = sol ? Math.atan2(sol.w[1] - sol.e[1], sol.w[0] - sol.e[0]) : Math.atan2(target[1] - S2[1], target[0] - S2[0]);
      ang = wantAng == null ? dir0 + (A.to ? 0 : side * -.12) : dir0 + clamp(angDiff(wantAng, dir0), -1.4, 1.4);   // the wrist: ≤ 80° off the forearm
      if (A.thumb == null) { const c = Math.cos(ang); flip = Math.abs(c) > .35 ? (c > 0 ? 1 : -1) : (side < 0 ? 1 : -1); }
      if (A.to) { const off = R.gripOffset(pose2, ang, hsz, flip); wrist = [target[0] - off[0], target[1] - off[1]]; } else wrist = target;
      z = A.to ? depthOf(wrist, S2) : 0;
      let pole;
      if (A.bend != null) { const dx = wrist[0] - S2[0], dy = wrist[1] - S2[1]; pole = [-dy * A.bend, dx * A.bend, -Math.hypot(dx, dy) * .15]; }
      else pole = [side * .55, 1, -.45];                                                       // elbows down, out and a little back
      sol = ik3(S3, [wrist[0], wrist[1], z + Sz], L1, L2, pole);
    }
    const fa = Math.atan2(sol.w[1] - sol.e[1], sol.w[0] - sol.e[0]), wristDev = Math.abs(angDiff(ang, fa));
    return { side, S: S3, e: sol.e, w: sol.w, ang, flip, pose: pose2, A, reach: sol.reach, z: sol.w[2] - Sz, L1, L2, hsz, wristDev };
  }

  /* ================================================================ PERSON */
  function person(ctx, t, S, o = {}) {
    const s = o.s || 1, h = S.h || 1, B = S.build || {}, HU = 51 * (S.head || 1);
    const th = clamp(o.turn || 0, -.8, .8), sn = Math.sin(th), cs = Math.cos(th), fwd = Math.abs(sn) > .08 ? Math.sign(sn) : 0;
    const sw = o.sway === false ? ZS : WT.sway(t, S.seed || 1, o.sway ?? 1);
    const shW = B.sh || 62, waist = (B.waist || 44), hipW = B.hip || 48, belly = B.belly || 0, armK = B.arm || 1, legK = B.leg || 1, nw = (B.neck || 13) * h;
    const pose = o.pose || 'stand', ph = o.ph || 0;
    let hipY = -282 * h * legK + (o.bob || 0);
    const span = 282 * h * legK - 16, Lt = span * .512, Ls = span * .5, hipJ = hipW * .5;
    // ---- feet (body frame: x across, z forward) → ankles
    let ank = [[-hipJ - 3, -16, 0], [hipJ + 3, -16, 0]];
    if (pose === 'walk') { const st = 46 * h * legK; for (let i = 0; i < 2; i++) { const a = TAU * ph + i * Math.PI; ank[i][2] = st * Math.sin(a); ank[i][1] -= Math.max(0, Math.cos(a)) * 22 * h; }
      hipY += -6 * Math.abs(Math.cos(TAU * ph)) * h + 4 * h; }
    else if (pose === 'sit') { hipY = -232 * h; ank = [[-hipJ - 6, -16, 92], [hipJ + 6, -16, 98]]; }
    else if (pose === 'kneel') { hipY = -188 * h; ank = [[-hipJ - 4, -14, -70], [hipJ + 4, -16, 62]]; }
    else if (pose === 'crouch') { const k = clamp(o.crouch ?? 1); hipY = lerp(hipY, -165 * h, k); ank = [[-hipJ - 8 * k, -16, 6], [hipJ + 8 * k, -16, 6]]; }
    const P3 = ([x, y, z]) => [x * cs + z * sn, y, -x * sn + z * cs];          // body frame → camera (x right, y down, z toward us)
    const bodyRot = (o.lean || 0) * (fwd || 1) + sw.body;
    const shY = hipY - 178 * h, waistY = hipY - 88 * h, neckY = shY - 4 * h, neckTop = neckY - 17 * h, beltY = hipY - 26 * h;
    // torso rings (body y, rx, rz, cz) → silhouette half-width + centre
    const rings = [[shY + 6, shW, 28, 0], [shY + 80 * h, shW * .93 + belly * .2, 32 + belly * .4, belly * .3], [waistY, waist + belly * .5, 27 + belly * .7, belly * .6], [hipY - 8, hipW + belly * .3, 30 + belly * .3, belly * .25]];
    const ringW = r => Math.sqrt((r[1] * cs) ** 2 + (r[2] * sn) ** 2), ringC = r => r[3] * sn;
    const silAt = y => { if (y <= rings[0][0]) return [ringC(rings[0]), ringW(rings[0])]; for (let i = 1; i < rings.length; i++) if (y <= rings[i][0]) { const k = (y - rings[i - 1][0]) / (rings[i][0] - rings[i - 1][0]); return [lerp(ringC(rings[i - 1]), ringC(rings[i]), k), lerp(ringW(rings[i - 1]), ringW(rings[i]), k)]; } return [ringC(rings[3]), ringW(rings[3])]; };
    const frontX = y => { const [c] = silAt(y), r = y < waistY ? lerp(30, 27 + belly * .7, clamp((y - shY) / (waistY - shY))) : 28; return c + r * sn; };
    const cxN = 10 * sn, Mb = new DOMMatrix().translate(0, hipY).rotate(toDeg(bodyRot)).translate(0, -hipY), Mr = new DOMMatrix().translate(o.x || 0, o.y || 0).scale(s);
    const toW = (M, p) => { const q = M.transformPoint({ x: p[0], y: p[1] }); return [q.x, q.y]; }, MbW = Mr.multiply(Mb);
    const headRot = sw.head + (o.tilt || 0), thH = clamp(th + (o.headTurn || 0), -.85, .85);
    const hcx = cxN + 6 * Math.sin(thH), hcy = neckTop + 6 - 1.2 * HU + sw.nod * .3;
    const Mh = Mb.translate(hcx, neckTop + 4).rotate(toDeg(headRot)).translate(0, hcy - neckTop - 4).scale(HU), MhW = Mr.multiply(Mh);
    // ---- arms (rig-local, 3D IK)
    const Lu = 98 * h * armK, Lf = 90 * h * armK, hsz = 33 * h * armK, inv = Mr.inverse(), arms = o.arms || {}, rotW = Math.atan2(Mr.b, Mr.a);
    const shJ = [-1, 1].map(side => { const x = side * (shW - 14), p = P3([x, 0, 0]); return { p2: toW(Mb, [p[0], shY + 12]), z: p[2] }; });
    const depthOf = (w, S2) => { const yb = w[1]; if (yb < shY - 40 || yb > hipY + 70) return 0; const [c, hw] = silAt(clamp(yb, shY, hipY)), inside = 1 - ss(hw - 6, hw + 30, Math.abs(w[0] - c)), vert = ss(shY - 40, shY + 10, yb) * (1 - ss(hipY + 10, hipY + 70, yb));
      const d2 = Math.hypot(w[0] - S2[0], w[1] - S2[1]), want = clamp(Math.sqrt(Math.max(0, (.84 * (Lu + Lf)) ** 2 - d2 * d2)), 34, 120); return inside * vert * want; };
    const armSol = ['L', 'R'].map((k, i) => { const side = i ? 1 : -1, A = Object.assign({}, arms[k] || {}), S0 = shJ[i];
      if (A.to) { const q = inv.transformPoint({ x: A.to[0], y: A.to[1] }); A.toL = [q.x, q.y]; } A.rot = rotW;
      const swing = pose === 'walk' ? Math.sin(TAU * ph + (i ? 0 : Math.PI)) * .3 * (fwd || 0) : 0, a = Math.PI / 2 - side * .05 - swing;
      const rest = [S0.p2[0] + Math.cos(a) * (Lu + Lf) * .985 + side * 2, S0.p2[1] + Math.sin(a) * (Lu + Lf) * .985];
      return solveArm(A, side, S0.p2, S0.z, Lu, Lf, hsz, rest, depthOf, pose, 'open'); });
    // ---- legs (3D IK, knees forward + a little out)
    const fwdV = [sn, 0, cs];
    const legSol = [0, 1].map(i => { const side = i ? 1 : -1, a = P3([side * hipJ, hipY + 10, 0]), b = P3(ank[i]);
      const pole = [fwdV[0] + side * .25 * cs, -.15, fwdV[2] - side * .25 * sn], r = ik3(a, b, Lt, Ls, pole); return { a, k: r.e, b: r.w, side, L1: Lt, L2: Ls }; });
    // ---- geometry out
    const hC = toW(MhW, [0, 0]), Gout = { head: { x: hC[0], y: hC[1], r: HU * s * 1.25, dir: fwd || 1, tilt: headRot + bodyRot }, hands: {}, shoulders: {}, s };
    Gout.top = toW(MhW, [0, -1.5])[1]; Gout.neck = toW(MbW, [cxN, neckY]); Gout.hip = toW(Mr, [0, hipY]);
    Gout.box = { x: (o.x || 0) - 110 * s, y: Gout.top - 20 * s, w: 220 * s, h: (o.y || 0) - Gout.top + 30 * s };
    Gout.eyes = [toW(MhW, [wrapX(-.4, .02, thH), .02]), toW(MhW, [wrapX(.4, .02, thH), .02])]; Gout.mouth = toW(MhW, [wrapX(0, .62, thH), .62 + (S.moustache ? .1 : 0)]);
    armSol.forEach((a, i) => { const k = i ? 'R' : 'L', gp = R.gripOffset(a.pose, a.ang, hsz, a.flip), wq = toW(Mr, a.w);
      Gout.hands[k] = { x: wq[0], y: wq[1], ang: a.ang + rotW, grip: toW(Mr, [a.w[0] + gp[0], a.w[1] + gp[1]]), reach: a.reach, elbow: toW(Mr, a.e), z: a.z }; Gout.shoulders[k] = toW(Mr, a.S); });
    Gout.bones = { arms: armSol, legs: legSol };
    if (!ctx) return Gout;

    // ================= draw
    const base = ctx.getTransform(), oldLW = MG.figure(4 * Math.pow(s, .55)); MG.boil(t); ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const setM = M => ctx.setTransform(base.multiply(M)), L = { dx: -10, dy: -8 };
    const pnt = (key, k = 1) => paint(S, key, o, L.dx * k, L.dy * k);
    const sleeveKey = S.outer && S.outer.kind !== 'vest' ? 'outer' : 'shirt', roll = S.shirt && S.shirt.roll && sleeveKey === 'shirt';
    const R1 = 18.5 * armK * h, R2 = 16.5 * armK * h, R3 = 13.5 * armK * h;
    // -- an arm (rig-local); part: 'upper' | 'lower' | 'all'
    const drawArm = (a, part = 'all') => {
      const Sx = [a.S[0], a.S[1]], E = [a.e[0], a.e[1]], Wr = [a.w[0], a.w[1]], H = { x: Wr[0], y: Wr[1], ang: a.ang, sz: a.hsz }; const gp = R.gripOffset(a.pose, a.ang, a.hsz, a.flip); H.grip = [Wr[0] + gp[0], Wr[1] + gp[1]];
      const up = part !== 'lower', lo = part !== 'upper';
      if (lo && a.A.prop) a.A.prop(ctx, H);
      const mid = (p, q, k = .5) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
      if (roll) {
        const Rl = mid(E, Wr, .2);
        if (up) MG.ink(ctx, MG.tube([Sx, mid(Sx, E), E, Rl], [R1, R1 * .97, R2, R2 * .98]), Object.assign({ lw: 1 }, pnt('shirt')));
        if (lo) { MG.ink(ctx, MG.tube([Rl, mid(Rl, Wr), Wr], [R3 * 1.08, R3, R3 * .88]), Object.assign({ lw: 1 }, skinP(S, o)));
          drawHand(ctx, a.pose, Wr[0], Wr[1], a.ang, a.hsz, a.flip, S, o);
          const d = [Wr[0] - E[0], Wr[1] - E[1]], dl = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / dl, d[0] / dl], r0 = mid(E, Wr, .1), r1 = mid(E, Wr, .3), rw = R2 * 1.18;   // the roll band
          MG.ink(ctx, [[r0[0] + n[0] * rw, r0[1] + n[1] * rw], [r1[0] + n[0] * rw * .96, r1[1] + n[1] * rw * .96], [r1[0] - n[0] * rw * .96, r1[1] - n[1] * rw * .96], [r0[0] - n[0] * rw, r0[1] - n[1] * rw]], Object.assign({ lw: .95 }, pnt('shirt', .5)));
          MG.ink(ctx, [mid(r0, r1, .5).map((v, j) => v + n[j] * rw * .9), mid(r0, r1, .5).map((v, j) => v - n[j] * rw * .9)], { closed: false, lw: .45, single: true }); }
      } else {
        if (lo) drawHand(ctx, a.pose, Wr[0], Wr[1], a.ang, a.hsz, a.flip, S, o);
        if (up && lo) MG.ink(ctx, MG.tube([Sx, mid(Sx, E), E, mid(E, Wr), Wr], [R1, R1 * .97, R2, R2 * .94, R2 * .9]), Object.assign({ lw: 1 }, pnt(sleeveKey)));
        else if (up) MG.ink(ctx, MG.tube([Sx, mid(Sx, E), E], [R1, R1 * .97, R2]), Object.assign({ lw: 1 }, pnt(sleeveKey)));
        else MG.ink(ctx, MG.tube([E, mid(E, Wr), Wr], [R2, R2 * .94, R2 * .9]), Object.assign({ lw: 1 }, pnt(sleeveKey)));
        if (lo) { const c0 = mid(E, Wr, .84), c1 = mid(E, Wr, 1.0), d = [Wr[0] - E[0], Wr[1] - E[1]], dl = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / dl, d[0] / dl], cw = R2 * .98;
          const band = (p0, p1, w, key, k = 1) => MG.ink(ctx, [[p0[0] + n[0] * w, p0[1] + n[1] * w], [p1[0] + n[0] * w, p1[1] + n[1] * w], [p1[0] - n[0] * w, p1[1] - n[1] * w], [p0[0] - n[0] * w, p0[1] - n[1] * w]], Object.assign({ lw: .8, smooth: false }, paint(S, key, o, L.dx * .4, L.dy * .4)));
          if (S.outer && S.outer.kind !== 'vest') band(mid(E, Wr, .95), mid(E, Wr, 1.05), cw * .9, 'shirt');
          band(c0, c1, cw, sleeveKey);
          if (S.outer && S.outer.kind === 'cardigan') for (let j = 1; j < 4; j++) { const q = mid(c0, c1, j / 4); MG.ink(ctx, [[q[0] + n[0] * cw * .8, q[1] + n[1] * cw * .8], [q[0] - n[0] * cw * .8, q[1] - n[1] * cw * .8]], { closed: false, lw: .35, single: true }); }
          if (S.band && a.side < 0) { const b0 = mid(E, Wr, .7), b1 = mid(E, Wr, .8); band(b0, b1, cw * 1.04, 'band'); ctx.fillStyle = PAPERL(); const bm = mid(b0, b1); ctx.beginPath(); ctx.arc(bm[0], bm[1], 2.6, 0, TAU); ctx.fill(); } }
        if (up && lo) { const u1 = [Sx[0] - E[0], Sx[1] - E[1]], u2 = [Wr[0] - E[0], Wr[1] - E[1]], l1 = Math.hypot(...u1) || 1, l2 = Math.hypot(...u2) || 1, cosA = (u1[0] * u2[0] + u1[1] * u2[1]) / (l1 * l2);
          if (cosA > -.7) { let b = [u1[0] / l1 + u2[0] / l2, u1[1] / l1 + u2[1] / l2]; const bl = Math.hypot(...b) || 1; b = [b[0] / bl, b[1] / bl];   // the crease inside a bent elbow
            const c = [E[0] + b[0] * R2 * .55, E[1] + b[1] * R2 * .55], q = [-b[1], b[0]]; MG.taper(ctx, [[c[0] - q[0] * R2 * .45, c[1] - q[1] * R2 * .45], [c[0] + b[0] * 2, c[1] + b[1] * 2], [c[0] + q[0] * R2 * .45, c[1] + q[1] * R2 * .45]], .25, .25, { belly: true, mid: .7 }); } }
      }
      if (lo && a.A.propFront) a.A.propFront(ctx, H);
    };
    const farI = fwd > 0 ? 1 : fwd < 0 ? 0 : -1, far = farI >= 0 ? armSol[farI] : null, farFront = far && (far.A.front || far.z > 18);
    const legCol = S.skirt ? 'sock' : 'pants';
    // 1. the far arm behind the body (its forearm stays behind unless the hand is in front of the chest)
    setM(Mr); if (o.only !== 'head' && far && !far.A.front) drawArm(far, farFront ? 'upper' : 'all');
    // 2. back hair
    setM(MhW); { const hs = HAIR[S.hairStyle]; if (hs) { ctx.save(); hs.back(ctx, headCtx(t, S, o, thH, false)); ctx.restore(); } }
    // 3. hood bunched behind the neck
    setM(MbW); if (S.hood && o.only !== 'head') MG.ink(ctx, [[cxN - 44, neckY + 12], [cxN - 50, neckY - 14], [cxN, neckY - 26], [cxN + 50, neckY - 14], [cxN + 44, neckY + 12]], Object.assign({ lw: 1 }, pnt('shirt')));
    if (o.only !== 'head') {
      // 4. legs (far first) + shoes
      setM(Mr); const order = legSol.slice().sort((p, q) => p.k[2] - q.k[2]);
      for (const lg of order) { const a = lg.a, k = lg.k, b = lg.b, mid1 = [lerp(a[0], k[0], .5), lerp(a[1], k[1], .5)], mid2 = [lerp(k[0], b[0], .5), lerp(k[1], b[1], .5)];
        MG.ink(ctx, MG.tube([[a[0], a[1] - 14], mid1, [k[0], k[1]], mid2, [b[0], b[1]]], [27 * h, 25 * h, 21 * h, 18.5 * h, 16 * h]), Object.assign({ lw: 1 }, pnt(legCol)));
        const toe = fwd || (lg.side * .35), bx = b[0], by = b[1] + 4;
        const sp = [[bx - 16 + Math.min(0, toe) * 16, by - 12], [bx + toe * 30, by - 16], [bx + toe * 42 + (toe > 0 ? 6 : -6) * Math.abs(toe), by + 2], [bx + toe * 30, by + 14], [bx - Math.max(0, toe) * 4, by + 14], [bx - 19 + Math.min(0, toe) * 6, by + 2]];
        const shp = MG.ink(ctx, sp, Object.assign({ lw: 1 }, pnt('shoes')));
        if (isInk(S, 'shoes', o)) { ctx.save(); ctx.clip(shp); MG.taper(ctx, [[bx - 8 + toe * 6, by - 9], [bx + toe * 24, by - 11]], .9, .3, { col: PAPERL() }); ctx.restore(); }
        else MG.ink(ctx, [[bx - 14, by + 6], [bx + toe * 36, by + 7]], { closed: false, lw: .45, single: true }); }
      // 5. pelvis (trousers) from the belt down
      if (!S.skirt) { setM(MbW); const [c, w] = silAt(hipY - 8); MG.ink(ctx, [[c - w, beltY], [c + w, beltY], [c + w * 1.02, hipY + 6], [c + w * .7, hipY + 26], [c + fwd * 6, hipY + 18], [c - w * .7, hipY + 26], [c - w * 1.02, hipY + 6]], Object.assign({ lw: 1 }, pnt('pants')));
        MG.ink(ctx, [[c + fwd * 10, beltY + 8], [c + fwd * 6, hipY + 16]], { closed: false, lw: .45, single: true }); }
      else { setM(MbW); const len = S.skirt.len || 140, fl = 1 + .02 * Math.sin(t * 2 + 1), [c, w] = silAt(hipY - 8);
        MG.ink(ctx, [[c - waist + 2, waistY + 16], [c + waist - 2, waistY + 16], [c + w * 1.3 * fl, hipY + len - 20], [c, hipY + len - 8], [c - w * 1.3 * fl, hipY + len - 20]], Object.assign({ lw: 1 }, pnt('skirt')));
        for (const x of [-.45, .1, .55]) MG.ink(ctx, [[c + x * w * .5, hipY + 6], [c + x * w * 1.15, hipY + len - 22]], { closed: false, lw: .4, single: true }); }
    }
    // 6. neck (with the chin's shadow)
    setM(MbW);
    { const np = MG.ink(ctx, [[cxN - nw, neckTop - 10], [cxN + nw, neckTop - 10], [cxN + nw * 1.05, neckY + 10], [cxN - nw * 1.05, neckY + 10]], Object.assign({ lw: 1, smooth: false }, skinP(S, o)));
      if (C.style !== 'riso' && !o.stone) { ctx.save(); ctx.clip(np); ctx.fillStyle = MG.tone(ctx, .22); ctx.beginPath(); ctx.ellipse(cxN + 4 * sn, neckTop - 2, nw * 1.6, 13 * h, 0, 0, TAU); ctx.fill(); ctx.restore(); } }
    // 7. torso + clothes
    if (o.only !== 'head' || o.bust) {
      const outerHem = S.outer && S.outer.kind !== 'vest' ? hipY + 14 : null, hem = outerHem ?? (S.hood ? hipY + 4 : beltY + 2);
      const sideP = sg => { const pts = []; for (const r of rings) { const y = Math.min(r[0], hem - 10); pts.push([ringC(r) + sg * ringW(r), y]); } return pts; };
      const Lp = sideP(-1), Rp = sideP(1), [c0, w0] = silAt(shY + 6);
      const torso = [[cxN - nw - 3, neckY + 2], [c0 - w0 * .7, shY - 4], [c0 - w0 * 1.02, shY + 22], ...Lp.slice(1), [Lp[3][0] + 2, hem], [Rp[3][0] - 2, hem], ...Rp.slice(1).reverse(), [c0 + w0 * 1.02, shY + 22], [c0 + w0 * .7, shY - 4], [cxN + nw + 3, neckY + 2]];
      const tp = MG.ink(ctx, torso, Object.assign({ lw: 1.1 }, pnt(S.hood ? 'shirt' : 'shirt')));
      const fx = frontX;
      ctx.save(); ctx.clip(tp);
      if (!S.outer || S.outer.kind === 'vest') { if (!S.skirt) { MG.ink(ctx, [[-200, beltY - 12], [200, beltY - 12], [200, beltY + 4], [-200, beltY + 4]], Object.assign({ lw: .7, smooth: false }, paint(S, 'pants', o))); ctx.fillStyle = C.style === 'riso' ? '#c9b48a' : PAPERL(); ctx.fillRect(fx(beltY) - 7, beltY - 12, 14, 14); }
        MG.ink(ctx, [[fx(neckY + 30), neckY + 30], [fx(beltY - 14), beltY - 14]], { closed: false, lw: .45, single: true });
        for (let b = 0; b < 4; b++) { const y = neckY + 46 + b * 34; if (y > beltY - 16) break; ctx.fillStyle = INK(); ctx.beginPath(); ctx.arc(fx(y) + 5, y, 2.2, 0, TAU); ctx.fill(); } }
      if (S.hood) { for (const sg of [-1, 1]) MG.ink(ctx, [[fx(neckY) + sg * 9, neckY + 4], [fx(neckY + 50) + sg * 11, neckY + 56]], { closed: false, lw: .6, single: true });
        MG.ink(ctx, [[fx(waistY) - 44, waistY + 6], [fx(waistY), waistY], [fx(waistY) + 44, waistY + 6]], { closed: false, lw: .45, single: true }); }
      ctx.restore();
      // outer layer: vest / jacket / cardigan — two front panels leaving an opening
      if (S.outer) { const kd = S.outer.kind, op = S.outer.open ?? (kd === 'vest' ? 8 : 34), vy = kd === 'vest' ? shY + 104 : kd === 'cardigan' ? shY + 124 : shY + 76;
        const panel = sg => { const xs = sg < 0 ? Lp : Rp, ins = kd === 'vest' ? 15 : 0, pts = [[cxN + sg * (nw + 3), neckY + 1], [c0 + sg * (w0 * .7 - ins), shY - 4 + ins * .3], [c0 + sg * (w0 * 1.02 - ins * 1.2), shY + 22 + ins]];
          if (kd === 'vest') pts.push([xs[1][0] - sg * 12, xs[1][1] + 10]);
          pts.push(...xs.slice(1).map(([x, y]) => [x, y]), [xs[3][0], (outerHem ?? hipY - 12)], [fx(hipY) + sg * op, (outerHem ?? hipY - 14) - (kd === 'vest' ? 4 : 0)], [fx(vy) + sg * (kd === 'vest' ? 2 : op * .6), vy]); return pts; };
        for (const sg of [-1, 1]) MG.ink(ctx, panel(sg), Object.assign({ lw: 1.05 }, pnt('outer')));
        if (kd === 'jacket') for (const sg of [-1, 1]) MG.ink(ctx, [[cxN + sg * (nw + 3), neckY + 1], [fx(vy) + sg * op * .6, vy], [fx(vy - 40) + sg * (op * .6 + 24), vy - 40], [cxN + sg * (nw + 18), neckY + 8]], Object.assign({ lw: .8, smooth: false }, paint(S, 'outer', o, 0, 0), C.style === 'riso' ? { fill: WT.shadeOf(S.pal.outer, .5) } : { tone: Math.min(.95, S.look.outer.tone + .18) }));
        if (kd === 'cardigan') { for (const sg of [-1, 1]) MG.ink(ctx, [[fx(vy) + sg * (op * .6 + 7), vy], [fx(hipY) + sg * (op + 8), (outerHem || hipY) - 8]], { closed: false, lw: .45, single: true });
          MG.ink(ctx, [[Lp[3][0] + 2, (outerHem || hipY) - 14], [fx(hipY) - op, (outerHem || hipY) - 14]], { closed: false, lw: .45, single: true }); MG.ink(ctx, [[Rp[3][0] - 2, (outerHem || hipY) - 14], [fx(hipY) + op, (outerHem || hipY) - 14]], { closed: false, lw: .45, single: true }); }
        const nb = kd === 'vest' ? 3 : kd === 'cardigan' ? 4 : 1; for (let b = 0; b < nb; b++) { const y = vy + 20 + b * (kd === 'vest' ? 30 : 28), x = fx(y) - (kd === 'vest' ? 2 : op * .6 + 6) - (y - vy) / ((outerHem || hipY) - vy) * op * .4;
          MG.ink(ctx, MG.ell(x, y, 3.6, 3.6, 8), { fill: C.style === 'riso' ? WT.shadeOf(S.pal.outer, 1.6) : PAPERL(), lw: .55, single: true }); } }
      // collar
      const col = S.shirt && S.shirt.collar || 'shirt';
      if (col === 'shirt') { const open = S.shirt.open, sk = skinP(S, o);
        if (open) MG.ink(ctx, [[cxN - 9, neckY - 2], [cxN + 9, neckY - 2], [fx(neckY + 26), neckY + 26]], Object.assign({ lw: 0, smooth: false }, sk));
        for (const sg of [-1, 1]) MG.ink(ctx, [[cxN + sg * (nw + 3), neckY - 10], [cxN + sg * (nw + 22), neckY + 14], [fx(neckY + 22) + sg * (open ? 9 : 3), neckY + 22], [cxN + sg * (open ? 8 : 1), neckY + 2]], Object.assign({ lw: .85, smooth: false }, paint(S, 'shirt', o, 0, 0), { tone: 0 })); }
      else if (col === 'round') MG.ink(ctx, [[cxN - nw - 6, neckY], [cxN, neckY + 9], [cxN + nw + 6, neckY]], { closed: false, lw: .6, single: true });
      // tie (loose: knot lower, swinging)
      if (S.tie) { const lo = S.tie.loose ? 1 : 0, ky = neckY + 16 + lo * 14, kx = fx(ky) + lo * 4, swing = WT.spring(t, o.hairEv || [], { A: .25, wind: .02 }) * 20 + sw.body * 300, by = waistY - 6 - lo * 8;
        MG.ink(ctx, [[kx - 6, ky + 7], [kx + 6, ky + 7], [kx + 13 + swing * .5, by], [kx + swing, by + 16], [kx - 13 + swing * .5, by]], Object.assign({ lw: .9, smooth: false }, pnt('tie', .4)));
        MG.ink(ctx, [[kx - 9, ky - 7], [kx + 9, ky - 7], [kx + 6, ky + 9], [kx - 6, ky + 9]], Object.assign({ lw: .85, smooth: false }, pnt('tie', .2)));
        if (isInk(S, 'tie', o)) { MG.taper(ctx, [[kx - 3, ky + 32], [kx + 6, ky + 24]], .7, .4, { col: PAPERL() }); MG.taper(ctx, [[kx - 3 + swing * .3, ky + 62], [kx + 7 + swing * .3, ky + 54]], .7, .4, { col: PAPERL() }); } }
      // lanyard + ID card
      if (S.lanyard) { const sway2 = sw.body * 400, cy = shY + 118, cx = fx(cy) + sway2;
        for (const sg of [-1, 1]) MG.taper(ctx, [[cxN + sg * (nw + 2), neckY + 2], [fx(shY + 70) + sg * 22, shY + 70], [cx + sg * 4, cy - 8]], 1.6, 1.4, { col: C.style === 'riso' ? S.pal.lanyard : INK() });
        const card = MG.ink(ctx, [[cx - 22, cy - 6], [cx + 22, cy - 6], [cx + 22, cy + 52], [cx - 22, cy + 52]], { fill: PAPERL(), lw: .7, smooth: false });
        ctx.save(); ctx.clip(card); ctx.fillStyle = C.style === 'riso' ? S.pal.lanyard : INK(); ctx.fillRect(cx - 24, cy - 8, 48, 13); ctx.fillStyle = C.style === 'riso' ? '#d7dbe3' : MG.tone(ctx, .34); ctx.fillRect(cx - 15, cy + 14, 14, 17);
        ctx.fillStyle = INK(); ctx.fillRect(cx + 4, cy + 16, 12, 2.5); ctx.fillRect(cx + 4, cy + 24, 12, 2.5); ctx.restore(); }
    }
    // 8. head
    setM(MhW);
    const E = Object.assign({}, EXPR[o.expr || 'neutral'] || EXPR.neutral); if (o.eyes) E.eyes = o.eyes; if (o.brows) E.brows = o.brows; if (o.mouth) E.mouth = o.mouth; if (o.glint != null) E.glint = o.glint;
    MG.figure(4 * Math.pow(s, .55) * (o.only === 'head' ? 1.08 : 1));
    const hd = drawHead(ctx, t, S, Object.assign({}, o, { back: false }), E, thH, false);
    Gout.eyes = hd.eyes.map(p => toW(MhW, p)); Gout.mouth = toW(MhW, hd.mouth);
    MG.figure(4 * Math.pow(s, .55));
    // 9. arms in front: the far arm's forearm (hand in front of the chest), then the near arm(s)
    setM(Mr);
    if (o.only !== 'head') { if (!far) { drawArm(armSol[0]); drawArm(armSol[1]); } else { if (far.A.front) drawArm(far); else if (farFront) drawArm(far, 'lower'); drawArm(armSol[1 - farI]); } }
    if (C.debugBones && o.only !== 'head') debugOverlay(ctx, Mr, base, armSol, legSol, S, t, { shY, hipY, silAt });
    ctx.restore(); ctx.setTransform(base); MG.figure(oldLW);
    if (o.laugh) { MG.figure(4 * Math.pow(s, .55)); MG.laugh(ctx, t, Gout, o.laugh); MG.figure(oldLW); }
    if (E.tears && o.tears !== false) WT.tears(ctx, t, Gout.eyes, E.tears, { r: HU * s * .9, at: o.tearAt });
    return Gout;
  }

  /* ---------------------------------------------------------------- debug overlay (Cast.debugBones = true) */
  function debugOverlay(ctx, Mr, base, arms, legs, S, t, body) {
    ctx.save(); ctx.setTransform(base.multiply(Mr)); const sc = MG.scaleOf(ctx), px = v => v / sc;
    ctx.lineWidth = px(2.2); ctx.font = `600 ${px(15)}px monospace`; ctx.textAlign = 'center';
    const seg = (a, b, col) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const dot = (p, col, r = 5) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], px(r), 0, TAU); ctx.fill(); };
    const lab = (p, s, col) => { ctx.fillStyle = 'rgba(255,255,255,.85)'; const w = ctx.measureText(s).width; ctx.fillRect(p[0] - w / 2 - px(3), p[1] - px(13), w + px(6), px(17)); ctx.fillStyle = col; ctx.fillText(s, p[0], p[1]); };
    const L3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)), L2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const a of arms) { const bad = a.wristDev > 1.41 || (() => { const [c, hw] = body.silAt(clamp(a.e[1], body.shY, body.hipY)); return Math.abs(a.e[0] - c) < hw - 12 && a.e[2] - a.S[2] < 8 && a.e[1] > body.shY && a.e[1] < body.hipY; })();
      const col = bad ? '#e0261b' : '#0a8fbf'; seg(a.S, a.e, col); seg(a.e, a.w, col); dot(a.S, col); dot(a.e, col, 6); dot(a.w, col);
      lab([lerp(a.S[0], a.e[0], .5), lerp(a.S[1], a.e[1], .5)], `${L3(a.S, a.e).toFixed(0)}|${L2(a.S, a.e).toFixed(0)}`, col);
      lab([lerp(a.e[0], a.w[0], .5), lerp(a.e[1], a.w[1], .5)], `${L3(a.e, a.w).toFixed(0)}|${L2(a.e, a.w).toFixed(0)}`, col);
      lab([a.w[0], a.w[1] + px(22)], `wr ${(a.wristDev * 180 / Math.PI).toFixed(0)}° z${a.z.toFixed(0)}`, col);
      const cr = Math.sign((a.w[0] - a.S[0]) * (a.e[1] - a.S[1]) - (a.w[1] - a.S[1]) * (a.e[0] - a.S[0]));
      C.boneLog.push({ who: S.name, t, limb: a.side < 0 ? 'armL' : 'armR', l1: +L3(a.S, a.e).toFixed(2), l2: +L3(a.e, a.w).toFixed(2), side: cr, wrist: +(a.wristDev * 180 / Math.PI).toFixed(1), bad }); }
    for (const g of legs) { const col = '#1c9a4a'; seg(g.a, g.k, col); seg(g.k, g.b, col); dot(g.a, col); dot(g.k, col, 6); dot(g.b, col);
      lab([lerp(g.a[0], g.k[0], .5), lerp(g.a[1], g.k[1], .5)], `${L3(g.a, g.k).toFixed(0)}|${L2(g.a, g.k).toFixed(0)}`, col); lab([lerp(g.k[0], g.b[0], .5), lerp(g.k[1], g.b[1], .5)], `${L3(g.k, g.b).toFixed(0)}|${L2(g.k, g.b).toFixed(0)}`, col);
      C.boneLog.push({ who: S.name, t, limb: g.side < 0 ? 'legL' : 'legR', l1: +L3(g.a, g.k).toFixed(2), l2: +L3(g.k, g.b).toFixed(2) }); }
    if (C.boneLog.length > 4000) C.boneLog.splice(0, C.boneLog.length - 4000);
    ctx.restore();
  }

  /* ================================================================ SD / CHIBI (head : body ≈ 1 : 1.5, mitten hands, shorter bones — same rules) */
  function chibi(ctx, t, S, o = {}) {
    const s = o.s || 1, HU = 60 * (S.sdHead || 1), th = clamp(o.turn || 0, -.8, .8), sn = Math.sin(th), cs = Math.cos(th), fwd = Math.abs(sn) > .08 ? Math.sign(sn) : 0;
    const sw = o.sway === false ? ZS : WT.sway(t, S.seed || 1, (o.sway ?? 1) * 1.6);
    const pose = o.pose || 'stand', ph = o.ph || 0, B = S.build || {}, wide = (B.sh || 62) / 62, belly = (B.belly || 0) / 20, hk = S.h || 1;
    let hipY = -78 * (.9 + .1 * hk) + (o.bob || 0); const shY0 = hipY - 92 - belly * 6;
    if (pose === 'run') hipY += -10 * Math.abs(Math.sin(TAU * ph));
    if (pose === 'sit' || pose === 'slump') hipY = -40; if (pose === 'kneel') hipY = -46;
    const shY = hipY - 92 - belly * 6;
    const bodyRot = (o.lean || 0) * (fwd || 1) + sw.body * 2;
    const Mr = new DOMMatrix().translate(o.x || 0, o.y || 0).scale(s), Mb = new DOMMatrix().translate(0, hipY).rotate(toDeg(bodyRot)).translate(0, -hipY);
    const headRot = sw.head * 1.5 + (o.tilt || 0) + (pose === 'slump' ? .25 * (fwd || 1) : 0);
    const Mh = Mb.translate(.18 * sn * 40, shY + 8).rotate(toDeg(headRot)).translate(0, -HU * 1.02).scale(HU);
    const MhW = Mr.multiply(Mh), MbW = Mr.multiply(Mb), toW = (M, p) => { const q = M.transformPoint({ x: p[0], y: p[1] }); return [q.x, q.y]; };
    const torW = 38 * wide + belly * 4, cx = .25 * sn * torW;
    const P3 = ([x, y, z]) => [x * cs + z * sn, y, -x * sn + z * cs];
    const shJ = [-1, 1].map(side => { const p = P3([side * (torW - 9), 0, 0]); return { p2: toW(Mb, [p[0] + cx, shY + 18]), z: p[2] }; });
    const inv = Mr.inverse(), arms = o.arms || {}, Lu = 33, Lf = 31, rotW = Math.atan2(Mr.b, Mr.a);
    const depthOf = (w, S2) => { const inside = 1 - ss(torW - 4, torW + 16, Math.abs(w[0] - cx)), vert = ss(shY - 10, shY + 10, w[1]) * (1 - ss(hipY, hipY + 20, w[1])); return inside * vert * 30; };
    const armSol = ['L', 'R'].map((k, i) => { const side = i ? 1 : -1, A = Object.assign({}, arms[k] || {}), S0 = shJ[i];
      if (A.to) { const q = inv.transformPoint({ x: A.to[0], y: A.to[1] }); A.toL = [q.x, q.y]; } A.rot = rotW;
      let a; if (pose === 'flail') a = -Math.PI / 2 + side * (.7 + .4 * Math.sin(t * 14 + i)); else if (pose === 'run') a = Math.PI / 2 + Math.sin(TAU * ph + i * Math.PI) * .9 * (fwd || 1) - side * .2; else a = Math.PI / 2 - side * .3;
      const rest = [S0.p2[0] + Math.cos(a) * (Lu + Lf) * .97, S0.p2[1] + Math.sin(a) * (Lu + Lf) * .97];
      const sol = solveArm(A, side, S0.p2, S0.z, Lu, Lf, A.hand && A.hand !== 'mitt' ? 17 : 22, rest, depthOf, pose, 'mitt'); return sol; });
    const fwdV = [sn, 0, cs];
    const legSol = [0, 1].map(i => { const side = i ? 1 : -1, a = P3([side * 16 * wide, hipY, 0]); let b;
      if (pose === 'run') { const q = Math.sin(TAU * ph + i * Math.PI); b = P3([side * 16 * wide, -8 - Math.max(0, Math.cos(TAU * ph + i * Math.PI)) * 18, q * 26]); }
      else if (pose === 'sit' || pose === 'slump') b = P3([side * 18 * wide, -8, 40]);
      else if (pose === 'kneel') b = P3([side * 16 * wide, -6, i ? 30 : -34]);
      else if (pose === 'flail') b = P3([side * (16 * wide + 12) + Math.sin(t * 16 + i * 2) * 10, -6 - Math.abs(Math.sin(t * 16 + i * 2)) * 12, 0]);
      else b = P3([side * (16 * wide + 4), -8, 0]);
      const r = ik3(a, b, 36, 34, [fwdV[0] + side * .3 * cs, -.1, fwdV[2] - side * .3 * sn]); return { a, k: r.e, b: r.w, side, L1: 36, L2: 34 }; });
    const hC = toW(MhW, [0, 0]);
    const G = { head: { x: hC[0], y: hC[1], r: HU * s * 1.15, dir: fwd || 1, tilt: headRot + bodyRot }, hands: {}, s };
    G.top = toW(MhW, [0, -1.5])[1]; G.box = { x: (o.x || 0) - 95 * s, y: G.top - 10 * s, w: 190 * s, h: (o.y || 0) - G.top + 24 * s };
    armSol.forEach((a, i) => { const q = toW(Mr, a.w), gp = R.gripOffset(a.pose, a.ang, a.hsz, a.flip); G.hands[i ? 'R' : 'L'] = { x: q[0], y: q[1], ang: a.ang + rotW, reach: a.reach, grip: toW(Mr, [a.w[0] + gp[0], a.w[1] + gp[1]]), elbow: toW(Mr, a.e) }; });
    G.eyes = [toW(MhW, [wrapX(-.42, .2, th), .2]), toW(MhW, [wrapX(.42, .2, th), .2])]; G.mouth = toW(MhW, [wrapX(0, .66, th), .66]);
    G.bones = { arms: armSol, legs: legSol };
    if (!ctx) return G;
    const base = ctx.getTransform(), oldLW = MG.figure(4.2 * Math.pow(s, .55)); MG.boil(t); ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const setM = M => ctx.setTransform(base.multiply(M)), pnt = key => paint(S, key, o, -6, -5);
    const sleeveKey = S.outer && S.outer.kind !== 'vest' ? 'outer' : 'shirt', roll = S.shirt && S.shirt.roll && sleeveKey === 'shirt';
    const drawArm = a => { const pz = a.pose, Sx = [a.S[0], a.S[1]], E = [a.e[0], a.e[1]], Wr = [a.w[0], a.w[1]], H = { x: Wr[0], y: Wr[1], ang: a.ang, sz: a.hsz, grip: Wr };
      if (a.A.prop) a.A.prop(ctx, H);
      const mid = (p, q, k = .5) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
      if (roll) { const Rl = mid(E, Wr, .25); MG.ink(ctx, MG.tube([Sx, E, Rl], [11, 10.5, 10]), Object.assign({ lw: 1 }, pnt('shirt'))); MG.ink(ctx, MG.tube([Rl, mid(Rl, Wr), Wr], [8.5, 8, 7.5]), Object.assign({ lw: 1 }, skinP(S, o))); }
      else MG.ink(ctx, MG.tube([Sx, mid(Sx, E), E, mid(E, Wr), Wr], [11, 10.6, 10, 9.6, 9.2]), Object.assign({ lw: 1 }, pnt(sleeveKey)));
      if (S.band && a.side < 0) { const b0 = mid(E, Wr, .62), b1 = mid(E, Wr, .8); MG.ink(ctx, MG.tube([b0, b1], [10.5, 10.5]), Object.assign({ lw: .8 }, pnt('band'))); }
      drawHand(ctx, pz, Wr[0] - Math.cos(a.ang) * 6, Wr[1] - Math.sin(a.ang) * 6, a.ang, a.hsz, a.flip, S, o);
      if (a.A.propFront) a.A.propFront(ctx, H); };
    const farI = fwd > 0 ? 1 : fwd < 0 ? 0 : -1, far = farI >= 0 ? armSol[farI] : null;
    setM(Mr); if (far && !far.A.front && !(far.z > 10)) drawArm(far);
    setM(MhW.scale(1.06, .95)); { const hs = HAIR[S.hairStyle]; if (hs) { ctx.save(); hs.back(ctx, headCtx(t, S, o, th, true)); ctx.restore(); } }
    // legs + shoes
    setM(Mr); const legKey = S.skirt ? 'sock' : 'pants';
    for (const lg of legSol.slice().sort((p, q) => p.k[2] - q.k[2])) { MG.ink(ctx, MG.tube([[lg.a[0], lg.a[1] - 6], [lg.k[0], lg.k[1]], [lg.b[0], lg.b[1]]], [13, 12, 11]), Object.assign({ lw: 1 }, pnt(legKey)));
      const toe = fwd || (lg.side * .5); MG.ink(ctx, MG.ell(lg.b[0] + toe * 8, lg.b[1] + 3, 17, 11, 14), Object.assign({ lw: 1 }, pnt('shoes'))); }
    // torso
    setM(MbW);
    if (S.hood) MG.ink(ctx, MG.ell(cx, shY + 2, 30, 13, 14), Object.assign({ lw: 1 }, pnt('shirt')));
    { const tw = torW, bw2 = torW + 8 + belly * 6, topKey = S.outer ? 'outer' : 'shirt';
      if (S.skirt) MG.ink(ctx, [[cx - bw2 + 4, hipY - 8], [cx + bw2 - 4, hipY - 8], [cx + bw2 + 9, hipY + 30], [cx, hipY + 36], [cx - bw2 - 9, hipY + 30]], Object.assign({ lw: 1 }, pnt('skirt')));
      const tp = MG.ink(ctx, [[cx - tw + 10, shY + 4], [cx, shY - 5], [cx + tw - 10, shY + 4], [cx + tw + 2, shY + 22], [cx + bw2 - 2, hipY - 4], [cx + bw2 - 10, hipY + 14], [cx - bw2 + 10, hipY + 14], [cx - bw2 + 2, hipY - 4], [cx - tw - 2, shY + 22]], Object.assign({ lw: 1.05 }, pnt(topKey)));
      ctx.save(); ctx.clip(tp); const fx = cx + 14 * sn;
      if (S.outer) { const op = S.outer.kind === 'vest' ? 9 : 15; MG.ink(ctx, [[fx - 14, shY - 4], [fx + 14, shY - 4], [fx + op, hipY + 20], [fx - op, hipY + 20]], Object.assign({ lw: .7, smooth: false }, paint(S, 'shirt', o))); }
      if (!S.outer || S.outer.kind === 'vest') { if (!S.skirt) MG.ink(ctx, [[-200, hipY + 2], [200, hipY + 2], [200, hipY + 16], [-200, hipY + 16]], Object.assign({ lw: .6, smooth: false }, paint(S, 'pants', o))); }
      if (S.tie) { const lo = S.tie.loose ? 3 : 0; MG.ink(ctx, [[fx - 5 + lo, shY + 6], [fx + 5 + lo, shY + 6], [fx + 10 + lo, hipY - 10], [fx + 2 + lo, hipY], [fx - 6 + lo, hipY - 10]], Object.assign({ lw: .7, smooth: false }, pnt('tie'))); }
      if (S.lanyard) { for (const sg of [-1, 1]) MG.taper(ctx, [[fx + sg * 14, shY], [fx + sg * 3, shY + 44]], 1.4, 1.2, { col: C.style === 'riso' ? S.pal.lanyard : INK() }); MG.ink(ctx, [[fx - 11, shY + 42], [fx + 11, shY + 42], [fx + 11, shY + 68], [fx - 11, shY + 68]], { fill: PAPERL(), lw: .6, smooth: false }); ctx.fillStyle = C.style === 'riso' ? S.pal.lanyard : INK(); ctx.fillRect(fx - 11, shY + 42, 22, 7); }
      if (S.hood) for (const sg of [-1, 1]) MG.ink(ctx, [[fx + sg * 7, shY + 4], [fx + sg * 8, shY + 30]], { closed: false, lw: .55, single: true });
      ctx.restore(); }
    // head (SD face: rounder, big eyes low on the face)
    setM(MhW.scale(1.06, .95));
    const E = Object.assign({}, EXPR[o.expr || 'neutral'] || EXPR.neutral); if (o.eyes) E.eyes = o.eyes; if (o.brows) E.brows = o.brows; if (o.mouth) E.mouth = o.mouth; if (o.glint != null) E.glint = o.glint;
    if (o.stone) E.eyes = o.eyes || 'blank';
    drawHead(ctx, t, S, Object.assign({}, o, { back: false }), E, th, true);
    setM(Mr);
    if (!far) { drawArm(armSol[0]); drawArm(armSol[1]); } else { if (far.A.front || far.z > 10) drawArm(far); drawArm(armSol[1 - farI]); }
    if (o.stone && o.crack) { setM(MbW); const r = rng(WT.hash(S.name, 'sdcrack')); ctx.save(); ctx.globalAlpha *= clamp(o.crack);
      for (let i = 0; i < 3; i++) { let x = (r() - .5) * torW * 1.4, y = shY + 6; const pts = [[x, y]]; for (let j = 0; j < 4; j++) { x += (r() - .5) * 18; y += 18 + r() * 10; pts.push([x, y]); } MG.ink(ctx, pts, { closed: false, lw: .8, single: true, smooth: false }); } ctx.restore(); }
    if (C.debugBones) debugOverlay(ctx, Mr, base, armSol, legSol, S, t, { shY, hipY, silAt: () => [cx, torW] });
    ctx.restore(); ctx.setTransform(base); MG.figure(oldLW);
    if (o.laugh) MG.laugh(ctx, t, G, o.laugh);
    const tk = o.tears || E.tears && (E.tears === 'stream' ? 'fall' : E.tears);
    if (tk && !o.stone) WT.tears(ctx, t, G.eyes, tk === true ? 'fall' : tk, { r: HU * s * .9, at: o.tearAt, floor: o.tearFloor });
    return G;
  }

  /* ================================================================ public API */
  const withExpr = (who, o) => Object.assign({ expr: SPEC[who].expr }, o);
  C.draw = (ctx, t, who, o = {}) => person(ctx, t, SPEC[who], withExpr(who, o));
  C.geom = (t, who, o = {}) => person(null, t, SPEC[who], withExpr(who, o));
  C.face = function (ctx, t, who, x, y, s, o = {}) {
    const S = SPEC[who], oo = withExpr(who, o), g0 = person(null, t, S, Object.assign({}, oo, { x: 0, y: 0, s })), dx = x - g0.head.x, dy = y - g0.head.y;
    return person(ctx, t, S, Object.assign({}, oo, { x: dx, y: dy, s, only: 'head' }));
  };
  C.sd = (ctx, t, who, o = {}) => chibi(ctx, t, SPEC[who], withExpr(who, o));
  C.sdGeom = (t, who, o = {}) => chibi(null, t, SPEC[who], withExpr(who, o));
  C.stone = (ctx, t, who, o = {}) => chibi(ctx, t, SPEC[who], Object.assign({ expr: 'blank', stone: 1, crack: 0, sway: false, blink: false }, o));
  C.crumble = function (ctx, t, who, o = {}, c = {}) {
    const g = C.sdGeom(t, who, Object.assign({ sway: false }, o)), b = g.box; const box = { x: b.x - 10, y: b.y - 10, w: b.w + 20, h: b.h + 10 };
    WT.crumble(ctx, t, box, x => C.stone(x, t, who, Object.assign({ crack: 1 }, o)), Object.assign({ id: 'crumble-' + who, seed: WT.hash(who), floor: (o.y || 0) + 6 * (o.s || 1), ink: MG.C.ink }, c));
  };
  // a close-up hand with the sleeve this person wears: (x, y) = wrist, ang = hand direction, sz = palm length
  C.hand = function (ctx, who, pose, x, y, ang, sz, o = {}) {
    const S = SPEC[who], flip = o.flip ?? 1, c = Math.cos(ang), s = Math.sin(ang), back = k => [x - c * sz * k, y - s * sz * k], oo = o;
    const old = MG.figure(o.lw ? o.lw * 1.25 : 4 * Math.pow(sz / 33, .55)); MG.boil(o.t ?? 0);
    const sleeveKey = S.outer && S.outer.kind !== 'vest' ? 'outer' : 'shirt', roll = S.shirt.roll && sleeveKey === 'shirt', len = o.len || 3.2;
    const tubeP = (k0, k1, w0, w1) => MG.tube([back(k0), back((k0 + k1) / 2), back(k1)], [sz * w0, sz * (w0 + w1) / 2, sz * w1]);
    const band = (k0, k1, w, key) => { const n = [-s, c]; const a = back(k0), b = back(k1); return MG.ink(ctx, [[a[0] + n[0] * sz * w, a[1] + n[1] * sz * w], [b[0] + n[0] * sz * w, b[1] + n[1] * sz * w], [b[0] - n[0] * sz * w, b[1] - n[1] * sz * w], [a[0] - n[0] * sz * w, a[1] - n[1] * sz * w]], Object.assign({ lw: .9, smooth: false }, paint(S, key, oo, -sz * .05, -sz * .05))); };
    if (o.sleeve !== false) MG.ink(ctx, tubeP(len, -.05, .42, .36), Object.assign({ lw: 1 }, roll ? skinP(S, oo) : paint(S, sleeveKey, oo, sz * .08 * s, -sz * .08 * c)));
    const H = drawHand(ctx, pose, x, y, ang, sz, flip, S, oo);
    if (o.sleeve !== false) {
      if (roll) { const L2 = Math.min(3.4, len); band(L2 + .15, L2 - .55, .5, 'shirt'); }
      else { if (S.outer && S.outer.kind !== 'vest') band(.55, .12, .4, 'shirt');
        band(S.outer && S.outer.kind !== 'vest' ? 1.05 : .75, S.outer && S.outer.kind !== 'vest' ? .55 : .2, .46, sleeveKey);
        if (S.outer && S.outer.kind === 'cardigan') for (let j = 1; j < 4; j++) { const q = back(lerp(1.05, .55, j / 4)); MG.ink(ctx, [[q[0] - s * sz * .38, q[1] + c * sz * .38], [q[0] + s * sz * .38, q[1] - c * sz * .38]], { closed: false, lw: .4, single: true }); } }
      if (S.band) { band(.42, .12, .44, 'band'); }
    }
    MG.figure(old); return H;
  };
  C.laugh = (ctx, t, G, k) => MG.laugh(ctx, t, G, k);

  // ---------------------------------------------------------------- the donut (the ONE accent)
  const SPR = ['#ffd23f', '#4cc9f0', '#7bd389', '#ffffff', '#b28dff', '#ff9f43', '#5a8dee'];
  C.donut = function (ctx, x, y, r, o = {}) {
    const tilt = o.tilt ?? .62, rot = o.rot || 0, lw = o.lw || Math.max(2, r * .045), ink = WT.C.ink, seed = o.seed ?? 7, t = o.t || 0;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.translate(x, y); ctx.rotate(rot);
    if (o.glow) { WT.glow(ctx, 0, 0, r * 2.4, '#fff3c0', .7 * o.glow); }
    const th = r * .2 * Math.sqrt(1 - tilt * tilt) / .79 + r * .06;   // side thickness seen at this tilt
    const outer = new Path2D(); outer.ellipse(0, th * .5, r, r * tilt, 0, 0, Math.PI); outer.lineTo(-r, -th * .5); outer.ellipse(0, -th * .5, r, r * tilt, 0, Math.PI, TAU); outer.closePath();
    const hole = WT.ell(0, -th * .5, r * .3, r * .3 * tilt);
    const body = new Path2D(); body.addPath(outer); body.addPath(hole);
    const bites = (o.bite || 0) > 0 ? [[.82, -.25], [.98, .12], [.7, .5]].slice(0, Math.ceil(o.bite)).map(([a, b]) => [r * a, r * b * tilt - th * .3, r * .34]) : [];
    // shadow
    ctx.fillStyle = 'rgba(60,40,60,.18)'; ctx.beginPath(); ctx.ellipse(0, th * .5 + r * tilt * .25, r * 1.02, r * tilt * .9, 0, 0, TAU); ctx.fill();
    ctx.save();
    if (bites.length) { const bp = new Path2D(); bp.rect(-r * 3, -r * 3, r * 6, r * 6); for (const [bx, by, br] of bites) { bp.moveTo(bx + br, by); bp.ellipse(bx, by, br, br * .9, 0, 0, TAU); } ctx.clip(bp, 'evenodd'); }
    ctx.lineJoin = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = lw * 2; ctx.stroke(outer); ctx.stroke(hole);
    ctx.fillStyle = '#d6914c'; ctx.fill(body, 'evenodd');
    // top face (dough)
    const top = WT.ell(0, -th * .5, r, r * tilt); ctx.save(); ctx.clip(body, 'evenodd'); ctx.fillStyle = '#efb56c'; ctx.fill(top);
    ctx.fillStyle = '#c47e3c'; ctx.beginPath(); ctx.ellipse(0, -th * .5 + r * .05 * tilt, r * .3, r * .3 * tilt, 0, Math.PI, TAU); ctx.fill();   // inner wall of the hole
    // glaze: wavy edge with drips over the side
    const gl = new Path2D(), N = 48, rr = rng(seed);
    const dr = []; for (let i = 0; i < 6; i++) dr.push([rr() * TAU, .08 + rr() * .14]);
    for (let i = 0; i <= N; i++) { const a = i / N * TAU; let k = .86 + .03 * Math.sin(a * 7 + seed) + .02 * Math.sin(a * 13);
      let dy = 0; for (const [da, dl] of dr) { const d = Math.abs(((a - da + 3 * Math.PI) % TAU) - Math.PI); if (d < .22 && Math.sin(a) > 0) dy += dl * r * (1 - d / .22); }
      const px = Math.cos(a) * r * k, py = -th * .5 + Math.sin(a) * r * k * tilt + dy; i ? gl.lineTo(px, py) : gl.moveTo(px, py); }
    gl.closePath(); const gh = WT.ell(0, -th * .5, r * .4, r * .4 * tilt);
    const glaze = new Path2D(); glaze.addPath(gl); glaze.addPath(gh);
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.4; ctx.stroke(gl); ctx.stroke(gh);
    ctx.fillStyle = PINK; ctx.fill(glaze, 'evenodd');
    ctx.save(); ctx.clip(glaze, 'evenodd'); ctx.fillStyle = '#e4508a'; ctx.beginPath(); ctx.ellipse(r * .08, -th * .5 + r * .12 * tilt, r * .95, r * .9 * tilt, 0, 0, TAU); ctx.ellipse(-r * .06, -th * .5 - r * .04 * tilt, r * .86, r * .82 * tilt, 0, 0, TAU); ctx.fill('evenodd');
    ctx.strokeStyle = '#ffc3da'; ctx.lineWidth = r * .07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, -th * .5, r * .66, r * .66 * tilt, 0, Math.PI * 1.08, Math.PI * 1.45); ctx.stroke();
    ctx.lineWidth = r * .045; ctx.beginPath(); ctx.ellipse(0, -th * .5, r * .66, r * .66 * tilt, 0, Math.PI * 1.55, Math.PI * 1.62); ctx.stroke();
    // sprinkles
    const rs = rng(seed + 3); for (let i = 0; i < 30; i++) { const a = rs() * TAU, d = r * (.48 + rs() * .32), sx = Math.cos(a) * d, sy = -th * .5 + Math.sin(a) * d * tilt, an = rs() * Math.PI, L = r * .07;
      ctx.strokeStyle = SPR[i % SPR.length]; ctx.lineWidth = r * .045; ctx.beginPath(); ctx.moveTo(sx - Math.cos(an) * L, sy - Math.sin(an) * L * tilt); ctx.lineTo(sx + Math.cos(an) * L, sy + Math.sin(an) * L * tilt); ctx.stroke(); }
    ctx.restore(); ctx.restore(); ctx.restore();
    // bite marks: crumb band + ink along the bite edges (clipped to what is left)
    if (bites.length) { ctx.save(); ctx.clip(outer); const bp = new Path2D(); bp.rect(-r * 3, -r * 3, r * 6, r * 6); for (const [bx, by, br] of bites) { bp.moveTo(bx + br, by); bp.ellipse(bx, by, br, br * .9, 0, 0, TAU); } ctx.clip(bp, 'evenodd');
      for (const [bx, by, br] of bites) { ctx.strokeStyle = '#f8e2b8'; ctx.lineWidth = r * .16; ctx.beginPath(); ctx.ellipse(bx, by, br, br * .9, 0, 0, TAU); ctx.stroke(); }
      for (const [bx, by, br] of bites) { ctx.strokeStyle = ink; ctx.lineWidth = lw * 2; ctx.beginPath(); ctx.ellipse(bx, by, br, br * .9, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#e8c48e'; const rc = rng(seed + 9); for (const [bx, by, br] of bites) for (let i = 0; i < 6; i++) { const a = Math.PI * .6 + rc() * Math.PI * .8, px = bx + Math.cos(a) * br * 1.05, py = by + Math.sin(a) * br * .95; ctx.beginPath(); ctx.arc(px, py, r * .02, 0, TAU); ctx.fill(); }
      ctx.restore(); }
    if (o.glow) WT.sparkles(ctx, t, { cx: 0, cy: -th, rx: r * 1.8, ry: r * 1.3, n: 8, r: [r * .12, r * .3], seed: seed + 1, alpha: o.glow });
    ctx.restore();
  };
  // ---------------------------------------------------------------- the donut box
  C.box = function (ctx, x, y, w, o = {}) {
    const ink = WT.C.ink, lw = o.lw || Math.max(2.5, w * .008), d = w * .42, h = w * .2, t = o.t || 0, dozen = o.dozen, cols = dozen ? 4 : 3, rows = dozen ? 3 : 2, n = o.n ?? (dozen ? 12 : 6), lid = o.open === false ? 0 : (o.lid ?? 1);
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) { WT.rays(ctx, t, 0, -h - d * .5, { col: '#fff1b8', alpha: .5 * o.glow, n: 14, r0: w * .3, r1: w * 1.6, spin: .05 }); WT.glow(ctx, 0, -h - d * .5, w * 1.1, '#fff5cc', .8 * o.glow); }
    const sk = w * .1;   // the top face skews back
    const topF = [[-w / 2, -h], [w / 2, -h], [w / 2 - sk, -h - d], [-w / 2 + sk, -h - d]];
    // lid (behind, hinged at the back edge)
    const logo = (cx, cy, s) => { ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = PINK; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * .62, 0, TAU); ctx.fill(); ctx.fillStyle = PINK; ctx.beginPath(); ctx.arc(0, 0, s * .45, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * .17, 0, TAU); ctx.fill(); ctx.restore(); };
    if (lid > 0) { const lh = d * 1.05 * lid, lp = WT.poly([[-w / 2 + sk, -h - d], [w / 2 - sk, -h - d], [w / 2 - sk * .4, -h - d - lh], [-w / 2 + sk * .4, -h - d - lh]]);
      WT.inked(ctx, lp, '#fbf7f0', lw, ink); ctx.save(); ctx.clip(lp); ctx.fillStyle = '#efe6da'; ctx.fillRect(-w, -h - d - 6, w * 2, 6 + lh * .08); ctx.restore(); if (lid > .5) logo(0, -h - d - lh * .5, Math.min(w * .1, lh * .3)); }
    // inside tray + donuts
    const tp = WT.poly(topF); WT.inked(ctx, tp, '#f2e7d8', lw, ink);
    if (lid > 0) { ctx.save(); ctx.clip(tp); ctx.fillStyle = '#e6d6c2'; ctx.fillRect(-w, -h - d, w * 2, d * .18); ctx.restore();
      const cell = (i, j) => { const v = (j + .5) / rows, u = (i + .5) / cols, xL = lerp(-w / 2 + sk, -w / 2, v), xR = lerp(w / 2 - sk, w / 2, v); return [lerp(xL, xR, u) * .92, -h - d + v * d * .96]; };
      const cr = Math.min(w / cols, d / rows * 1.6) * .38; let k = 0;
      ctx.strokeStyle = WT.rgba(ink, .25); ctx.lineWidth = lw * .6; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [cx, cy] = cell(i, j); ctx.beginPath(); ctx.ellipse(cx, cy + cr * .1, cr * 1.05, cr * .66, 0, 0, TAU); ctx.stroke(); }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { if (k++ >= n) break; const [cx, cy] = cell(o.last ? cols - 1 - i : i, o.last ? rows - 1 - j : j); C.donut(ctx, cx, cy - cr * .1, cr, { seed: (o.seed || 1) * 31 + k * 7, tilt: .6, lw: lw * .8 }); } }
    else { const cp = WT.poly([[-w / 2, -h], [w / 2, -h], [w / 2 - sk, -h - d], [-w / 2 + sk, -h - d]]); WT.inked(ctx, cp, '#fbf7f0', lw, ink); logo(0, -h - d * .5, d * .28); }
    // front face
    const fp = WT.poly([[-w / 2, -h], [w / 2, -h], [w / 2, 0], [-w / 2, 0]]); WT.inked(ctx, fp, '#fbf7f0', lw, ink);
    ctx.fillStyle = '#ece3d6'; ctx.fillRect(-w / 2 + lw, -h * .25, w - lw * 2, h * .25 - lw);
    ctx.fillStyle = PINK; ctx.fillRect(-w / 2 + lw, -h * .62, w - lw * 2, h * .16);
    logo(-w * .32, -h * .55, h * .28);
    ctx.restore();
  };
  // ---------------------------------------------------------------- props
  C.mug = function (ctx, x, y, s = 1, o = {}) {   // (x, y) = bottom centre; o.ang tilts it (held), o.steam
    const ink = WT.C.ink, lw = 2.6 * s; ctx.save(); ctx.translate(x, y); if (o.ang) ctx.rotate(o.ang); ctx.scale(s, s);
    const hp = new Path2D(); hp.ellipse(24, -30, 14, 16, 0, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = ink; ctx.lineWidth = 11; ctx.stroke(hp); ctx.strokeStyle = '#f2efe8'; ctx.lineWidth = 6; ctx.stroke(hp);
    const body = WT.rr(-24, -62, 48, 62, 7); WT.inked(ctx, body, '#f4f1ea', 2.6, ink); WT.cel(ctx, body, '#f4f1ea', '#d6d3cf', -7, 0);
    ctx.fillStyle = '#7d8ea8'; ctx.fillRect(-24, -44, 48, 7);
    ctx.fillStyle = '#5a3c2e'; ctx.beginPath(); ctx.ellipse(0, -60, 21, 4, 0, 0, TAU); ctx.fill();
    if (o.steam) { const t = o.t || 0; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const u = (t * .7 + i / 3) % 1; ctx.globalAlpha = Math.sin(Math.PI * u) * .8;
      ctx.beginPath(); for (let j = 0; j <= 8; j++) { const yy = -70 - u * 50 - j * 6, xx = (i - 1) * 10 + Math.sin(j * .8 + t * 3 + i) * 5; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } }
    ctx.restore();
  };
  C.fridge = function (ctx, x, y, s = 1, o = {}) {   // (x, y) = bottom-left; 300×760 at s = 1
    const ink = WT.C.ink, w = 300, h = 760; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = WT.rr(0, -h, w, h, 16); WT.inked(ctx, body, '#eef1f4', 3, ink); WT.cel(ctx, body, '#eef1f4', '#cfd6e0', -18, 0);
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -h * .64); ctx.lineTo(w - 4, -h * .64); ctx.stroke();
    for (const [y0, y1] of [[-h * .9, -h * .72], [-h * .58, -h * .3]]) { const hd = WT.rr(w - 34, y0, 14, y1 - y0, 7); WT.inked(ctx, hd, '#9aa3b2', 2.4, ink); }
    // magnets + a memo
    ctx.save(); ctx.translate(70, -h * .5); ctx.rotate(-.06); const memo = WT.rr(0, 0, 86, 100, 3); WT.inked(ctx, memo, '#fff6c9', 2.4, ink); ctx.strokeStyle = WT.rgba(ink, .4); ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12, 24 + i * 18); ctx.lineTo(70 - i * 6, 24 + i * 18); ctx.stroke(); }
    ctx.fillStyle = '#7fb2e5'; ctx.beginPath(); ctx.arc(43, 4, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#9ad1a8'; ctx.beginPath(); ctx.arc(190, -h * .8, 12, 0, TAU); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(16, -h + 20, 10, h * .28); ctx.fillRect(16, -h * .6, 10, h * .5);
    ctx.restore();
  };
  C.counter = function (ctx, x, y, w, s = 1) {   // (x, y) = left end of the worktop top; height 330·s down to the floor
    const ink = WT.C.ink, d = 26 * s, hh = 330 * s; ctx.save(); ctx.translate(x, y);
    const cab = WT.rr(6 * s, d, w - 12 * s, hh - d, 4 * s); WT.inked(ctx, cab, '#f2ece2', 2.6, ink); WT.cel(ctx, cab, '#f2ece2', '#ddd3c4', 0, -14 * s);
    const n = Math.max(1, Math.round(w / (180 * s))); ctx.strokeStyle = WT.rgba(ink, .7); ctx.lineWidth = 2.4;
    for (let i = 1; i < n; i++) { const xx = 6 * s + (w - 12 * s) * i / n; ctx.beginPath(); ctx.moveTo(xx, d + 8 * s); ctx.lineTo(xx, hh - 6 * s); ctx.stroke(); }
    for (let i = 0; i < n; i++) { const xx = 6 * s + (w - 12 * s) * (i + .5) / n; const hd = WT.rr(xx - 22 * s, d + 30 * s, 44 * s, 8 * s, 4 * s); WT.inked(ctx, hd, '#a3a9b4', 2, ink); }
    const top = WT.rr(0, 0, w, d, 5 * s); WT.inked(ctx, top, WT.C.wood, 2.6, ink); ctx.fillStyle = WT.C.woodS; ctx.fillRect(2, d * .6, w - 4, d * .4 - 2);
    ctx.restore();
  };
  C.coffee = function (ctx, x, y, s = 1, o = {}) {   // a drip coffee machine standing on a worktop at (x, y)
    const ink = WT.C.ink; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = WT.rr(-80, -250, 160, 250, 12); WT.inked(ctx, body, '#4a4d57', 3, ink); WT.cel(ctx, body, '#4a4d57', '#383a42', -16, 0);
    const win = WT.rr(-62, -150, 124, 120, 10); WT.inked(ctx, win, '#2e3038', 2.4, ink);
    const pot = new Path2D(); pot.moveTo(-40, -120); pot.lineTo(40, -120); pot.quadraticCurveTo(54, -60, 36, -36); pot.lineTo(-36, -36); pot.quadraticCurveTo(-54, -60, -40, -120); pot.closePath();
    ctx.fillStyle = 'rgba(200,225,240,.35)'; ctx.fill(pot); ctx.strokeStyle = '#cfd8e2'; ctx.lineWidth = 3; ctx.stroke(pot);
    ctx.fillStyle = '#5b3a2c'; ctx.beginPath(); ctx.moveTo(-44, -76); ctx.lineTo(44, -76); ctx.quadraticCurveTo(48, -52, 36, -40); ctx.lineTo(-36, -40); ctx.quadraticCurveTo(-48, -52, -44, -76); ctx.fill();
    ctx.fillStyle = '#9be38f'; ctx.beginPath(); ctx.arc(50, -200, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8e8ea'; ctx.fillRect(-56, -214, 70, 22);
    ctx.restore();
  };
  C.desk = function (ctx, x, y, w, s = 1, o = {}) {   // (x, y) = left end of the desk top; monitor centred at o.mx (fraction, .55)
    const ink = WT.C.ink, t = o.t || 0; ctx.save(); ctx.translate(x, y);
    const legH = 300 * s; for (const lx of [24 * s, w - 40 * s]) { const lg = WT.rr(lx, 20 * s, 16 * s, legH, 4 * s); WT.inked(ctx, lg, '#9aa2b0', 2.4, ink); }
    const mx = w * (o.mx ?? .55);
    // monitor
    const st = WT.rr(mx - 14 * s, -120 * s, 28 * s, 120 * s, 6 * s); WT.inked(ctx, st, '#565a66', 2.4, ink);
    const bs = WT.rr(mx - 70 * s, -14 * s, 140 * s, 14 * s, 6 * s); WT.inked(ctx, bs, '#565a66', 2.4, ink);
    const mon = WT.rr(mx - 200 * s, -380 * s, 400 * s, 260 * s, 12 * s); WT.inked(ctx, mon, '#34363f', 3, ink);
    const scr = WT.rr(mx - 184 * s, -366 * s, 368 * s, 222 * s, 4 * s); ctx.fillStyle = '#dfeaf7'; ctx.fill(scr);
    ctx.save(); ctx.clip(scr); ctx.fillStyle = '#c8d7ea'; for (let i = 0; i < 9; i++) ctx.fillRect(mx - 176 * s, -350 * s + i * 22 * s, 352 * s, 2 * s); for (let i = 0; i < 5; i++) ctx.fillRect(mx - 176 * s + i * 72 * s, -350 * s, 2 * s, 200 * s);
    ctx.fillStyle = '#7fa7d8'; ctx.fillRect(mx - 176 * s, -360 * s, 352 * s, 12 * s); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .4; ctx.beginPath(); ctx.moveTo(mx + 60 * s, -366 * s); ctx.lineTo(mx + 120 * s, -366 * s); ctx.lineTo(mx + 40 * s, -144 * s); ctx.lineTo(mx - 20 * s, -144 * s); ctx.fill(); ctx.restore();
    if (o.glow) WT.glow(ctx, mx, -250 * s, 380 * s, '#d8ebff', .35 * o.glow);
    // desk top
    const top = WT.rr(0, 0, w, 24 * s, 5 * s); WT.inked(ctx, top, WT.C.wood, 2.6, ink); ctx.fillStyle = WT.C.woodS; ctx.fillRect(2, 15 * s, w - 4, 7 * s);
    // keyboard + papers + a small plant
    const kb = WT.poly([[mx - 150 * s, -4 * s], [mx + 150 * s, -4 * s], [mx + 140 * s, -22 * s], [mx - 140 * s, -22 * s]]); WT.inked(ctx, kb, '#e8eaee', 2.2, ink);
    ctx.save(); ctx.translate(w * .14, 0); ctx.rotate(-.05); for (let i = 0; i < 3; i++) { const pp = WT.rr(-60 * s, -12 * s - i * 6 * s, 130 * s, 10 * s, 2 * s); WT.inked(ctx, pp, i === 2 ? '#ffffff' : '#f2f0ea', 2, ink); } ctx.restore();
    if (o.plant !== false) { const px = w * .9; const pot = WT.rr(px - 26 * s, -52 * s, 52 * s, 52 * s, 8 * s); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .42 + Math.sin(t * 1.3 + i) * .03, lp = WT.ell(px + Math.cos(a) * 34 * s, -60 * s + Math.sin(a) * 40 * s, 12 * s, 30 * s, a + Math.PI / 2); WT.inked(ctx, lp, '#86c59a', 2, ink); }
      WT.inked(ctx, pot, '#e9a27c', 2.4, ink); }
    ctx.restore();
  };
  C.chair = function (ctx, x, y, s = 1, f = 1) {
    const ink = WT.C.ink; ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-70, -6); ctx.lineTo(70, -6); ctx.moveTo(0, -6); ctx.lineTo(0, -150); ctx.stroke(); ctx.strokeStyle = '#6b7080'; ctx.lineWidth = 4; ctx.stroke();
    const seat = WT.rr(-90, -175, 180, 32, 14); WT.inked(ctx, seat, '#4d5566', 3, ink);
    const back = WT.rr(-110, -420, 52, 250, 20); WT.inked(ctx, back, '#4d5566', 3, ink); WT.cel(ctx, back, '#4d5566', '#3b4150', -10, 0);
    ctx.restore();
  };
  // ---------------------------------------------------------------- backgrounds
  C.room = function (ctx, t, kind, w, h, o = {}) {
    const ink = WT.C.ink, hz = o.horizon ?? h * .72;
    ctx.fillStyle = WT.C.wall; ctx.fillRect(0, 0, w, hz);
    ctx.fillStyle = WT.C.floor; ctx.fillRect(0, hz, w, h - hz);
    ctx.fillStyle = '#ddd1bf'; ctx.fillRect(0, hz - 14, w, 14);
    ctx.strokeStyle = WT.rgba(ink, .5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, hz); ctx.lineTo(w, hz); ctx.stroke();
    if (kind === 'office') {
      // a window with blinds and soft daylight, a partition, a shelf
      const wx = o.wx ?? w * .56, ww = o.ww ?? w * .36, wy = hz * .12, wh = hz * .52;
      ctx.fillStyle = '#dcebf6'; ctx.fillRect(wx, wy, ww, wh); const g = ctx.createLinearGradient(wx, wy, wx, wy + wh); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(160,180,200,.45)'; for (let i = 0; i < 9; i++) ctx.fillRect(wx, wy + 10 + i * wh / 9, ww, 7);
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
      ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww + ww * .5, hz + 40); ctx.lineTo(wx + ww * .1, hz + 40); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#e1d6c6'; ctx.fillRect(w * .05, hz * .3, w * .3, 14); ctx.strokeStyle = WT.rgba(ink, .6); ctx.strokeRect(w * .05, hz * .3, w * .3, 14);
      const bk = ['#9fb5cf', '#d9a7a0', '#b8c9a8', '#e6cf9c', '#a9a3c9']; for (let i = 0; i < 7; i++) { const bx = w * .07 + i * 26, bh = 70 + (i * 37 % 30); ctx.fillStyle = bk[i % 5]; ctx.fillRect(bx, hz * .3 - bh, 22, bh); ctx.strokeRect(bx, hz * .3 - bh, 22, bh); }
      ctx.fillStyle = '#c9cfd8'; ctx.fillRect(0, hz - 260, w * .03 + (o.partition ? w : 0), 0);
    } else if (kind === 'pantry') {
      // tiled backsplash band, a cabinet row up top, a small window
      const ty = hz * .38, th2 = hz * .3; ctx.fillStyle = '#eef3f2'; ctx.fillRect(0, ty, w, th2);
      ctx.strokeStyle = 'rgba(150,170,175,.55)'; ctx.lineWidth = 2; for (let y = ty; y <= ty + th2; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      for (let r = 0; r * 46 < th2; r++) for (let x = (r % 2) * 46; x < w; x += 92) { ctx.beginPath(); ctx.moveTo(x, ty + r * 46); ctx.lineTo(x, Math.min(ty + th2, ty + r * 46 + 46)); ctx.stroke(); }
      const cab = WT.rr(w * .04, hz * .04, w * .92, hz * .26, 6); WT.inked(ctx, cab, '#f3ede3', 2.6, ink);
      const n = Math.max(2, Math.round(w / 260)); ctx.strokeStyle = WT.rgba(ink, .6); ctx.lineWidth = 2.4; for (let i = 1; i < n; i++) { const xx = w * .04 + w * .92 * i / n; ctx.beginPath(); ctx.moveTo(xx, hz * .05); ctx.lineTo(xx, hz * .29); ctx.stroke(); }
    } else if (kind === 'door' || kind === 'hall') {
      const dx = o.dx ?? w * .3, dw = o.dw ?? w * .4, dh = hz * .86, k = clamp(o.door ?? 0);
      ctx.fillStyle = '#3b3f4b'; ctx.fillRect(dx, hz - dh, dw, dh);
      if (o.light) { ctx.save(); ctx.globalAlpha = o.light; ctx.fillStyle = '#fff3d0'; ctx.fillRect(dx, hz - dh, dw, dh); ctx.beginPath(); ctx.moveTo(dx, hz); ctx.lineTo(dx + dw, hz); ctx.lineTo(dx + dw * 1.5, h); ctx.lineTo(dx - dw * .5, h); ctx.fill(); ctx.restore(); }
      const leaf = WT.poly([[dx, hz - dh], [dx + dw * (1 - k * .75), hz - dh - k * 16], [dx + dw * (1 - k * .75), hz + k * 16], [dx, hz]]);
      WT.inked(ctx, leaf, '#d9c3a2', 2.6, ink); ctx.fillStyle = '#9aa0ab'; ctx.beginPath(); ctx.arc(dx + dw * (1 - k * .75) - 22, hz - dh * .45, 8, 0, TAU); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.strokeRect(dx - 6, hz - dh - 6, dw + 12, dh + 6);
      if (kind === 'door') { const sg = WT.rr(dx + dw * .2, hz - dh - 70, dw * .6, 46, 6); WT.inked(ctx, sg, '#fbfaf6', 2.4, ink); Pilot.text(ctx, '탕비실', dx + dw * .5, hz - dh - 36, { size: 28, font: WT.F.talk, color: '#5a5258' }); }
    }
  };

  window.Cast = C;
})();
