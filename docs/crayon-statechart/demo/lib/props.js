// crayon-statechart · props.js — the illustration kit drawn beside the chart: people, weather, fire and steam, vessels,
// produce, furniture, buildings, machines. Every prop is crayon-hatched with an ink outline and animates with t.
// Local coordinates: the origin is the prop's bottom-centre (where it stands), y grows downward, sizes are at s = 1.
// A prop = { box(o) → [x0, y0, x1, y1] (local, for layout checks and the reveal wipe), draw(P, o, t) }.
// Add your own with defineProp(name, { box, draw }) — P has the same helpers the kit uses.
import { C, rng, n1, hash, clamp, lerp, ink, hatch, shape, text, ellipsePts, rectPts, roundRectPts, cloudPts, limbPts } from './sketch.js';

export const PROPS = {};
export function defineProp(name, def) { PROPS[name] = def; return def; }

/** helpers handed to every prop: seeded so each prop instance keeps its own hand */
export function pen(g, seed) {
  let s = seed;
  const P = {
    g, C,
    shape: (pts, o = {}) => shape(g, pts, { seed: s += 13, ...o }),
    ink: (pts, o = {}) => ink(g, pts, { seed: s += 13, ...o }),
    hatch: (pts, o = {}) => hatch(g, pts, { seed: s += 13, ...o }),
    ell: (cx, cy, rx, ry, o = {}) => shape(g, ellipsePts(cx, cy, rx, ry, o.n || Math.max(14, Math.round((rx + ry) / 2.2))), { seed: s += 13, ...o }),
    rect: (x, y, w, h, o = {}) => shape(g, rectPts(x, y, w, h), { seed: s += 13, ...o }),
    rrect: (x, y, w, h, r, o = {}) => shape(g, roundRectPts(x, y, w, h, r), { seed: s += 13, ...o }),
    text: (str, x, y, o = {}) => text(g, str, x, y, o),
    rnd: rng(seed + 99), seed,
    prop: (name, o, t) => drawProp(g, { s: 1, ...o, name }, t, s += 101, false),
  };
  return P;
}
export function drawProp(g, o, t, seed, place = true) {
  const def = PROPS[o.name]; if (!def) throw new Error(`unknown prop "${o.name}" (defineProp it, or see references/KIT.md)`);
  g.save();
  if (place) { g.translate(o.x, o.y); }
  else if (o.x || o.y) g.translate(o.x || 0, o.y || 0);
  if (o.s && o.s !== 1) g.scale(o.s, o.s);
  if (o.flip) g.scale(-1, 1);
  if (o.rot) g.rotate(o.rot);
  def.draw(pen(g, seed), o, t);
  g.restore();
}
export function propBox(o) {
  const def = PROPS[o.name]; if (!def) throw new Error(`unknown prop "${o.name}"`);
  let [x0, y0, x1, y1] = def.box(o); const s = o.s || 1;
  if (o.flip) [x0, x1] = [-x1, -x0];
  return [o.x + x0 * s, o.y + y0 * s, o.x + x1 * s, o.y + y1 * s];
}

const TAU = Math.PI * 2;
const pt = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// ── people ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// person({ pose, act, hat, shirt, pattern, pants, apron, gloves, hair, item, hands, speed })
//   pose: stand · walk · squat · kneel · bend · sit      act: none · stir · rub · sprinkle · carry · reach · wave · hold
//   hat: cone · scarf · cap · bun · long · none          pattern: flowers · dots · stripes · plain
const POSE = {
  stand: { H: [0, -96], N: [0, -158], k: [[-5, -48], [6, -48]], f: [[-8, 0], [10, 0]] },
  walk: { H: [0, -94], N: [3, -156], k: [[-5, -48], [6, -48]], f: [[-8, 0], [10, 0]] },
  squat: { H: [-20, -26], N: [4, -88], k: [[22, -46], [27, -43]], f: [[2, 0], [9, 0]] },
  kneel: { H: [0, -58], N: [8, -120], k: [[16, -7], [22, -7]], f: [[-26, -2], [-20, -2]] },
  bend: { H: [-6, -96], N: [36, -144], k: [[-8, -48], [4, -48]], f: [[-10, 0], [8, 0]] },
  sit: { H: [0, -58], N: [2, -120], k: [[32, -62], [37, -60]], f: [[32, 0], [38, 0]] },
};
function ik(S, T, a, b, down = 1) {
  let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  if (d > a + b - .5) { const u = (a + b - .5) / d; dx *= u; dy *= u; d = a + b - .5; }
  const ang = Math.atan2(dy, dx), c = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), e = Math.acos(c);
  const E1 = [S[0] + Math.cos(ang + e) * a, S[1] + Math.sin(ang + e) * a], E2 = [S[0] + Math.cos(ang - e) * a, S[1] + Math.sin(ang - e) * a];
  return { E: (E1[1] - E2[1]) * down > 0 ? E1 : E2, T: [S[0] + dx, S[1] + dy] };
}
defineProp('person', {
  box: o => o.pose === 'squat' || o.pose === 'kneel' ? [-42, -160, 70, 4] : o.pose === 'sit' ? [-34, -186, 72, 4] : [-36, -222, 74, 4],
  draw(P, o, t) {
    const g = P.g, ph = t * (o.speed || 4) + (o.phase || 0), base = POSE[o.pose || 'stand'] || POSE.stand;
    const H = [...base.H], N = [...base.N], K = base.k.map(p => [...p]), F = base.f.map(p => [...p]);
    if (o.pose === 'walk') {
      const sw = Math.sin(ph); H[1] += Math.abs(Math.cos(ph)) * -3; N[1] = H[1] - 62;
      F[0] = [-16 * sw, -Math.max(0, Math.cos(ph)) * 6]; F[1] = [16 * sw, -Math.max(0, -Math.cos(ph)) * 6];
      K[0] = [-8 * sw + 6, -48]; K[1] = [8 * sw + 6, -48];
    }
    N[1] += Math.sin(ph * .5) * 1.2; // breathing
    const shirt = o.shirt || C.white, pants = o.pants || C.ink, skin = o.skin || C.skin;
    const u = [N[0] - H[0], N[1] - H[1]], ul = Math.hypot(...u), ud = [u[0] / ul, u[1] / ul], pd = [-ud[1], ud[0]];
    const Hd = [H[0] - ud[0] * 8, H[1] - ud[1] * 8];
    const head = [N[0] + ud[0] * 21, N[1] + ud[1] * 21];
    // hands
    const w = ph, A = o.act || 'none';
    let hb = [N[0] - 6, N[1] + 62], hf = [N[0] + 9, N[1] + 62];
    if (A === 'stir') { hf = [N[0] + 46 + Math.cos(w) * 9, N[1] + 44 + Math.sin(w) * 4]; hb = [N[0] + 30, N[1] + 48]; }
    else if (A === 'rub') { hf = [N[0] + 46 + Math.sin(w) * 9, N[1] + 58]; hb = [N[0] + 34 - Math.sin(w) * 9, N[1] + 62]; }
    else if (A === 'sprinkle') { hf = [N[0] + 44, N[1] + 26 + Math.sin(w * 2) * 6]; hb = [N[0] + 26, N[1] + 44]; }
    else if (A === 'carry') { hf = [N[0] + 34, N[1] + 36]; hb = [N[0] + 26, N[1] + 40]; }
    else if (A === 'reach') { hf = [N[0] + 58, N[1] + 26]; hb = [N[0] + 18, N[1] + 56]; }
    else if (A === 'wave') { hf = [N[0] + 24 + Math.sin(w * 1.5) * 8, N[1] - 34]; hb = [N[0] - 4, N[1] + 60]; }
    else if (A === 'hold' && o.hands) { hb = [...o.hands[0]]; hf = [...o.hands[1]]; }
    if (o.pose === 'squat' || o.pose === 'kneel') { if (A === 'none') { hb = [N[0] + 22, N[1] + 46]; hf = [N[0] + 30, N[1] + 44]; } }
    const SB = [N[0] - 3, N[1] + 4], SF = [N[0] + 4, N[1] + 5];
    const armB = ik(SB, hb, 31, 30), armF = ik(SF, hf, 31, 30);
    const leg = (i) => P.shape(limbPts([Hd.map((v, j) => v + (i ? 3 : -3) * (j ? 0 : 1)), K[i], F[i]], 17, 10), { fill: pants, base: pants, baseA: .55, gap: 2.8, a: .7, w: 2 });
    const foot = (i) => P.shape(ellipsePts(F[i][0] + 6, F[i][1] - 3, 10, 4.5, 14), { fill: C.navy, base: C.navy, baseA: .8, gap: 2, w: 1.6 });
    const arm = (a, S, front) => {
      // rolled-up sleeves (default): the shirt to the elbow, bare forearms; sleeves: 'long' keeps the shirt to the wrist
      const long = o.sleeves === 'long', sh = shirt === C.white ? C.skyHatch : shirt;
      if (!long) P.shape(limbPts([pt(S, a.E, .9), a.E, a.T], 8.5, 7.5), { fill: skin, base: skin, baseA: .95, hatchColor: C.skinHatch, a: .45, gap: 2.8, w: 1.7 });
      P.shape(limbPts(long ? [S, a.E, a.T] : [S, pt(S, a.E, .55), pt(S, a.E, 1.05)], 12, long ? 8.5 : 11), { fill: shirt, base: shirt, baseA: .9, hatchColor: sh, a: .6, gap: 2.6, w: 1.9 });
      if (o.gloves) P.shape(limbPts([pt(a.E, a.T, .35), a.T], 9.5, 9), { fill: o.gloves, base: o.gloves, baseA: .85, gap: 2.4, a: .7, w: 1.7 });
      P.ell(a.T[0], a.T[1], 5, 5, { fill: o.gloves || skin, base: o.gloves || skin, baseA: .9, hatchColor: o.gloves || C.skinHatch, gap: 2.4, w: 1.5 });
    };
    // back limbs
    leg(0); foot(0); arm(armB, SB, false);
    // torso
    // torso: a tapered spine strip (hips → waist → chest → rounded shoulders), a little wider than the limbs
    const at = (u, o = 0) => [lerp(Hd[0], N[0], u) + pd[0] * o, lerp(Hd[1], N[1], u) + pd[1] * o];
    const tw = [[0, 15, 15], [.45, 13, 13], [.8, 16, 15], [.97, 15, 13], [1.06, 9, 7]];
    const tor = [...tw.map(([u, a]) => at(u, a)), ...tw.slice().reverse().map(([u, , b]) => at(u, -b))];
    P.shape(tor, { fill: shirt, base: shirt, baseA: .92, hatchColor: shirt === C.white ? C.skyHatch : shirt, a: .4, gap: 3.2, w: 2.1 });
    if (o.pattern !== 'plain') {
      g.save(); g.beginPath(); tor.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.clip();
      const r = rng(P.seed + 5), mark = o.pattern || 'flowers';
      if (mark === 'stripes') for (let i = -3; i <= 3; i++) P.ink([[N[0] + pd[0] * i * 4.5, N[1] + pd[1] * i * 4.5], [Hd[0] + pd[0] * i * 4.5, Hd[1] + pd[1] * i * 4.5]], { w: 1.6, color: o.patternColor || C.ink, amp: .4 });
      else for (let i = 0; i < 14; i++) {
        const a = r(), b = r() - .5, x = lerp(N[0], Hd[0], a) + pd[0] * b * 28, y = lerp(N[1], Hd[1], a) + pd[1] * b * 28;
        g.fillStyle = o.patternColor || C.ink;
        if (mark === 'dots') { g.beginPath(); g.arc(x, y, 1.9, 0, TAU); g.fill(); }
        else for (let k = 0; k < 4; k++) { const q = k * TAU / 4 + i; g.beginPath(); g.ellipse(x + Math.cos(q) * 2.4, y + Math.sin(q) * 2.4, 1.7, 1.2, q, 0, TAU); g.fill(); }
      }
      g.restore();
    }
    if (o.apron) { // a bib apron on the front of the body, from the chest to just past the hips
      const ext = o.pose === 'squat' || o.pose === 'kneel' || o.pose === 'sit' ? 6 : 22;
      P.shape([at(.72, 9), at(.72, -4), at(.4, -2), [Hd[0] - ud[0] * ext - pd[0] * 2, Hd[1] - ud[1] * ext - pd[1] * 2], [Hd[0] - ud[0] * ext + pd[0] * 17, Hd[1] - ud[1] * ext + pd[1] * 17], at(.4, 16)], { fill: o.apron, base: o.apron, baseA: .85, gap: 2.8, a: .6, w: 1.9 });
    }
    // front leg
    leg(1); foot(1);
    // head
    P.shape(limbPts([N, pt(N, head, .6)], 8, 8), { fill: skin, base: skin, baseA: .9, hatchColor: C.skinHatch, w: 1.6, outline: null });
    P.ell(head[0], head[1], 13, 13.5, { fill: skin, base: skin, baseA: .95, hatchColor: C.skinHatch, a: .45, gap: 3, w: 2 });
    const hat = o.hat || 'none', hair = o.hair || C.navy, [hx, hy] = head;
    if (hat !== 'cone' && hat !== 'scarf' && hat !== 'cap') {
      const pts = []; for (let i = 0; i <= 16; i++) { const a = lerp(2.15, 5.05, i / 16); pts.push([hx + Math.cos(a) * 14.5, hy + Math.sin(a) * 14.5]); }
      pts.push([hx + 11, hy - 7], [hx + 3, hy - 8], [hx - 5, hy - 4], [hx - 9, hy + 5]); // fringe, then back along the hairline
      if (hat === 'long') pts.splice(0, 0, [hx - 6, hy + 40], [hx - 14, hy + 36]);
      P.shape(pts, { fill: hair, base: hair, baseA: .85, gap: 2.2, a: .7, w: 1.8 });
      if (hat === 'bun') P.ell(hx - 13, hy - 10, 7, 7, { fill: hair, base: hair, baseA: .85, gap: 2, w: 1.7 });
    }
    // face (closed eye, blush)
    P.ink([[hx + 4, hy - 1], [hx + 7, hy + .6], [hx + 10, hy - 1]], { w: 1.4, amp: .2 });
    g.save(); g.globalAlpha *= .45; g.fillStyle = C.redSoft; g.beginPath(); g.ellipse(hx + 7, hy + 5.5, 3.5, 2.2, 0, 0, TAU); g.fill(); g.restore();
    if (hat === 'cone') P.shape([[hx - 34, hy - 3], [hx + 2, hy - 34], [hx + 36, hy - 3], [hx + 1, hy + 1]], { fill: o.hatColor || C.yellow, base: o.hatColor || C.yellow, baseA: .85, hatchColor: C.orange, gap: 2.6, a: .55, w: 2 });
    else if (hat === 'scarf') {
      const sc = o.hatColor || C.white;
      P.shape([[hx + 13, hy - 4], [hx + 9, hy - 13], [hx - 2, hy - 17], [hx - 13, hy - 12], [hx - 16, hy - 1], [hx - 14, hy + 6], [hx - 6, hy + 2], [hx + 4, hy - 4]], { fill: sc, base: sc, baseA: .95, hatchColor: sc === C.white ? C.skyHatch : sc, a: .45, gap: 2.8, w: 1.9 });
      P.shape([[hx - 15, hy + 2], [hx - 26, hy + 8], [hx - 22, hy + 14], [hx - 12, hy + 6]], { fill: sc, base: sc, baseA: .95, hatchColor: sc === C.white ? C.skyHatch : sc, a: .45, w: 1.6 });
      if (sc === C.white) { g.fillStyle = C.ink; for (const [dx, dy] of [[-6, -10], [2, -11], [-11, -3], [-4, -3]]) { g.beginPath(); g.arc(hx + dx, hy + dy, 1.4, 0, TAU); g.fill(); } }
    } else if (hat === 'cap') {
      P.shape([[hx - 14, hy - 3], [hx - 12, hy - 13], [hx, hy - 17], [hx + 12, hy - 12], [hx + 14, hy - 4]], { fill: o.hatColor || C.red, base: o.hatColor || C.red, baseA: .85, gap: 2.4, w: 1.8 });
      P.shape([[hx + 10, hy - 5], [hx + 26, hy - 3], [hx + 24, hy + 1], [hx + 10, hy - 1]], { fill: o.hatColor || C.red, base: o.hatColor || C.red, baseA: .85, gap: 2.2, w: 1.6 });
    }
    // front arm on top; an item in the front hand
    arm(armF, SF, true);
    if (o.item) P.prop(o.item.name, { ...o.item, x: armF.T[0] + (o.item.dx || 0), y: armF.T[1] + (o.item.dy || 0) }, t);
  },
});

// ── sky and weather ───────────────────────────────────────────────────────────────────────────────────────────────
defineProp('sun', {
  box: o => { const r = o.r || 32; return [-r - 20, -2 * r - 40, r + 20, 0]; },
  draw(P, o, t) {
    const r = o.r || 32, cy = -r - 20, sp = t * .35;
    for (let i = 0; i < 12; i++) { const a = sp + i * TAU / 12; P.ink([[Math.cos(a) * (r + 7), cy + Math.sin(a) * (r + 7)], [Math.cos(a) * (r + 16), cy + Math.sin(a) * (r + 16)]], { w: 2.2, color: i % 2 ? C.red : C.orange, amp: .3 }); }
    P.ell(0, cy, r, r, { fill: C.yellow, base: C.yellow, baseA: .9, hatchColor: C.orange, a: .4, gap: 3, outline: C.orange, w: 1.8 });
  },
});
defineProp('cloud', {
  box: o => [-(o.w || 150) / 2 - 10, -(o.h || 70) - 6, (o.w || 150) / 2 + 10, 0],
  draw(P, o, t) {
    const w = o.w || 150, h = o.h || 70, dx = Math.sin(t * .4 + (o.phase || 0)) * (o.drift ?? 6);
    const pts = cloudPts(dx, -h / 2, w, h, P.seed, o.bumps || 7);
    P.shape(pts, { fill: o.color || C.white, base: o.color || C.white, baseA: o.color ? .7 : .6, hatchColor: o.color || C.skyHatch, a: .3, w: 2, amp: 1.4 });
    if (o.scribble !== false) for (let i = 0; i < 3; i++) P.ink([[dx - w * .25 + i * w * .18, -h * .35], [dx - w * .18 + i * w * .18, -h * .52]], { w: 1.4, alpha: .6, amp: .5 });
  },
});
defineProp('rain', {
  box: o => [-(o.w || 160) / 2, -(o.h || 140), (o.w || 160) / 2, 0],
  draw(P, o, t) {
    const w = o.w || 160, h = o.h || 140, n = o.n || 18, r = rng(P.seed);
    for (let i = 0; i < n; i++) {
      const x = (r() - .5) * w, ph = r(), y = -h + ((t * (o.speed || 1.6) + ph) % 1) * h, l = 10 + r() * 6;
      P.ink([[x, y], [x - 3, y + l]], { w: 1.8, color: o.color || C.ink, amp: .2, alpha: clamp((y + h) / 20) * clamp(-y / 20) });
    }
  },
});
defineProp('snow', {
  box: o => [-(o.w || 160) / 2, -(o.h || 140), (o.w || 160) / 2, 0],
  draw(P, o, t) {
    const w = o.w || 160, h = o.h || 140, n = o.n || 22, r = rng(P.seed), g = P.g;
    for (let i = 0; i < n; i++) {
      const ph = r(), y = -h + ((t * (o.speed || .25) + ph) % 1) * h, x = (r() - .5) * w + Math.sin(t * 1.3 + i) * 6, a = clamp((y + h) / 20) * clamp(-y / 20);
      g.save(); g.globalAlpha *= a; for (let k = 0; k < 3; k++) { const q = k * Math.PI / 3 + i; P.ink([[x - Math.cos(q) * 3.5, y - Math.sin(q) * 3.5], [x + Math.cos(q) * 3.5, y + Math.sin(q) * 3.5]], { w: 1.3, amp: 0, color: o.color || C.ink }); } g.restore();
    }
  },
});
defineProp('steam', {
  box: o => [-26, -(o.h || 80), 26, 0],
  draw(P, o, t) {
    const h = o.h || 80, n = o.n || 3, g = P.g;
    for (let i = 0; i < n; i++) {
      const x0 = (i - (n - 1) / 2) * 13, ph = (t * .6 + i * .33) % 1, pts = [];
      for (let y = 0; y > -h; y -= 4) pts.push([x0 + Math.sin(y * .09 + t * 2.2 + i * 2) * 5 * (1 - y / h * .3), y - ph * 10]);
      g.save(); g.globalAlpha *= .75 * (o.alpha ?? 1); P.ink(pts, { w: 1.7, color: o.color || C.ink, amp: .3 }); g.restore();
    }
  },
});
defineProp('fire', {
  box: o => [-(o.w || 90) / 2 - 4, -(o.h || 56), (o.w || 90) / 2 + 4, 0],
  draw(P, o, t) {
    const w = o.w || 90, h = o.h || 56, n = Math.max(3, Math.round(w / 16));
    const flames = (col, sc, ph) => { for (let i = 0; i < n; i++) {
      const x = (i / (n - 1) - .5) * w * .9, fh = h * sc * (.65 + .35 * (n1(t * 5 + i * 3.1 + ph, P.seed) * .5 + .5)), fw = w / n * .9;
      P.shape([[x - fw, -4], [x - fw * .4, -fh * .55], [x + n1(t * 7 + i, 3) * 4, -fh], [x + fw * .5, -fh * .45], [x + fw, -4]], { fill: col, base: col, baseA: .85, gap: 2.4, a: .55, outline: col === C.red ? C.red : null, w: 1.6 });
    } };
    flames(C.yellow, 1, 0); flames(C.orange, .78, 7); flames(C.red, .52, 13);
    if (o.logs !== false) for (const d of [-1, 1]) P.shape(limbPts([[-w / 2 * d, -2], [w / 2 * d * .3, -9]], 8, 8), { fill: C.brown, base: C.brown, baseA: .8, gap: 2.4, w: 1.6 });
  },
});

// ── vessels ───────────────────────────────────────────────────────────────────────────────────────────────────────
function rimmed(P, w, h, top, bot, col, fill, o = {}) {
  // a vessel: a body from a wide top to a rounded bottom, an elliptic rim, contents inside the rim
  const body = [[-top / 2, -h], [top / 2, -h], [bot / 2 + (top - bot) * .08, -h * .25], [bot / 2, -2], [-bot / 2, -2], [-bot / 2 - (top - bot) * .08, -h * .25]];
  P.shape(body, { fill: col, base: col, baseA: .75, gap: o.gap || 3, a: .6, w: 2.1 });
  P.ell(0, -h, top / 2, Math.max(5, top * .1), { fill: fill || C.white, base: fill || C.white, baseA: .9, hatchColor: fill || C.skyHatch, a: .5, gap: 2.6, w: 1.9 });
}
defineProp('pot', {
  box: o => [-(o.w || 110) / 2 - 14, -(o.h || 70) - 14, (o.w || 110) / 2 + 14, 0],
  draw(P, o, t) {
    const w = o.w || 110, h = o.h || 70, col = o.color || C.ink;
    for (const d of [-1, 1]) P.ink([[d * w * .48, -h * .82], [d * (w / 2 + 12), -h * .86], [d * (w / 2 + 12), -h * .7], [d * w * .48, -h * .7]], { w: 2.4 });
    rimmed(P, w, h, w, w * .78, col, o.fill || C.red);
    if (o.lid) P.shape([[-w * .52, -h], [-w * .3, -h - 12], [w * .3, -h - 12], [w * .52, -h]], { fill: col, base: col, baseA: .7, w: 2 });
    if (o.steam) P.prop('steam', { x: 0, y: -h - 6, h: o.steam === true ? 70 : o.steam }, t);
  },
});
defineProp('tub', { // a wide basin (a Korean red rubber tub by default)
  box: o => [-(o.w || 170) / 2 - 4, -(o.h || 48) - 12, (o.w || 170) / 2 + 4, 0],
  draw(P, o, t) {
    const w = o.w || 170, h = o.h || 48, col = o.color || C.red;
    rimmed(P, w, h, w, w * .82, col, o.fill === 'water' ? C.sky : o.fill || C.sky);
    P.ink([[-w / 2, -h + 4], [w / 2, -h + 4]], { w: 1.4, alpha: .5 });
    if (o.items) for (let i = 0; i < o.items.n; i++) P.prop(o.items.name, { ...o.items, x: (i - (o.items.n - 1) / 2) * (w * .7 / o.items.n), y: -h + 4 + (i % 2) * 4, s: o.items.s || .55 }, t);
  },
});
defineProp('bowl', {
  box: o => [-(o.w || 70) / 2 - 2, -(o.h || 30) - (o.heap ? 16 : 6), (o.w || 70) / 2 + 2, 0],
  draw(P, o) {
    const w = o.w || 70, h = o.h || 30, col = o.color || C.white;
    if (o.heap) P.shape([[-w * .42, -h], [-w * .2, -h - 15], [w * .15, -h - 17], [w * .42, -h]], { fill: o.heap, base: o.heap, baseA: .85, gap: 2.4, a: .7, w: 1.8 });
    P.shape([[-w / 2, -h], [w / 2, -h], [w * .32, -3], [-w * .32, -3]], { fill: col, base: col, baseA: .9, hatchColor: col === C.white ? C.skyHatch : col, a: .5, w: 2 });
    if (o.band !== false) P.ink([[-w * .44, -h * .6], [w * .44, -h * .6]], { w: 1.5, color: C.ink, alpha: .8 });
  },
});
defineProp('jar', { // an earthenware jar (onggi): bulbous body, shallow lid
  box: o => [-(o.w || 90) / 2 - 6, -(o.h || 110) - 14, (o.w || 90) / 2 + 6, 0],
  draw(P, o) {
    const w = o.w || 90, h = o.h || 110, col = o.color || C.brown, pts = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20, y = -u * h, bul = Math.sin(Math.PI * Math.pow(u, .85)) * .5 + .32; pts.push([w * bul, y]); }
    const body = [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
    P.shape(body, { fill: col, base: col, baseA: .8, hatchColor: col, gap: 2.8, a: .65, w: 2.2 });
    P.ink(pts.slice(5, 14).map(([x, y]) => [x * .55 - w * .12, y]), { w: 2.6, color: C.white, alpha: .7, amp: .3 });
    if (o.lid !== false) P.shape([[-w * .4, -h], [-w * .25, -h - 12], [w * .25, -h - 12], [w * .4, -h]], { fill: col, base: col, baseA: .9, gap: 2.5, w: 2 });
    if (o.snow) P.shape([[-w * .42, -h - 2], [-w * .2, -h - 18], [w * .22, -h - 17], [w * .42, -h - 2]], { fill: C.white, base: C.white, baseA: 1, hatchColor: C.skyHatch, a: .4, w: 1.6 });
  },
});
defineProp('cup', {
  box: o => [-(o.w || 40) / 2 - 2, -(o.h || 46) - 4, (o.w || 40) / 2 + 14, 0],
  draw(P, o, t) {
    const w = o.w || 40, h = o.h || 46, col = o.color || C.ink;
    P.ink([[w * .42, -h * .75], [w / 2 + 11, -h * .7], [w / 2 + 9, -h * .3], [w * .36, -h * .3]], { w: 2.4 });
    P.shape([[-w / 2, -h], [w / 2, -h], [w * .4, -2], [-w * .4, -2]], { fill: col, base: col, baseA: .7, gap: 2.8, w: 2 });
    if (o.straw) P.ink([[w * .1, -h], [w * .25, -h - 22]], { w: 3, color: C.red });
    if (o.steam) P.prop('steam', { x: 0, y: -h - 4, h: 40, n: 2 }, t);
  },
});
defineProp('sack', {
  box: o => [-(o.w || 80) / 2 - 4, -(o.h || 90) - 12, (o.w || 80) / 2 + 4, 0],
  draw(P, o) {
    const w = o.w || 80, h = o.h || 90, col = o.color || C.cream;
    P.shape([[-w * .32, -h], [-w * .5, -h * .45], [-w * .46, -2], [w * .46, -2], [w * .5, -h * .45], [w * .32, -h]], { fill: col, base: col, baseA: .95, hatchColor: C.creamHatch, a: .6, w: 2.1 });
    P.shape([[-w * .2, -h - 10], [w * .2, -h - 10], [w * .12, -h + 2], [-w * .12, -h + 2]], { fill: col, base: col, baseA: .95, hatchColor: C.creamHatch, w: 1.8 });
    P.ink([[-w * .24, -h + 2], [w * .24, -h + 2]], { w: 2.4, color: C.red });
    if (o.label) P.text(o.label, 0, -h * .55, { size: o.labelSize || 18, bold: true, color: C.ink, align: 'center' });
  },
});
defineProp('basket', {
  box: o => [-(o.w || 90) / 2 - 2, -(o.h || 60) - (o.heap ? 20 : 4), (o.w || 90) / 2 + 2, 0],
  draw(P, o) {
    const w = o.w || 90, h = o.h || 60, col = o.color || C.brownLight;
    if (o.heap) P.shape([[-w * .45, -h], [-w * .25, -h - 18], [w * .2, -h - 20], [w * .45, -h]], { fill: o.heap, base: o.heap, baseA: .85, w: 1.8 });
    P.shape([[-w / 2, -h], [w / 2, -h], [w * .4, -2], [-w * .4, -2]], { fill: col, base: col, baseA: .7, hatchColor: C.brown, cross: .8, gap: 3.4, a: .6, w: 2.1 });
    P.ink([[-w / 2 - 2, -h], [w / 2 + 2, -h]], { w: 3.2, color: C.brown });
  },
});
defineProp('crate', {
  box: o => [-(o.w || 100) / 2 - 2, -(o.h || 60) - 2, (o.w || 100) / 2 + 2, 0],
  draw(P, o) {
    const w = o.w || 100, h = o.h || 60, col = o.color || C.brownLight;
    P.rect(-w / 2, -h, w, h, { fill: col, base: col, baseA: .75, hatchColor: C.brown, gap: 3.2, a: .5, w: 2.1 });
    if (o.tape) P.rect(-w * .08, -h, w * .16, h, { fill: C.cream, base: C.cream, baseA: .9, hatchColor: C.creamHatch, w: 1.4 });
    else for (let i = 1; i < 3; i++) P.ink([[-w / 2, -h + i * h / 3], [w / 2, -h + i * h / 3]], { w: 1.6 });
    if (o.label) P.text(o.label, 0, -h * .62, { size: 15, bold: true, color: C.ink, align: 'center' });
  },
});

// ── furniture and ground ──────────────────────────────────────────────────────────────────────────────────────────
defineProp('table', {
  box: o => [-(o.w || 200) / 2 - 2, -(o.h || 60) - 8, (o.w || 200) / 2 + 2, 0],
  draw(P, o) {
    const w = o.w || 200, h = o.h || 60, col = o.color || C.brownLight;
    for (const d of [-1, 1]) P.shape(rectPts(d * w * .4 - 5, -h, 10, h), { fill: C.brown, base: C.brown, baseA: .8, w: 1.8 });
    P.shape([[-w / 2, -h - 8], [w / 2, -h - 8], [w / 2 - 4, -h + 4], [-w / 2 + 4, -h + 4]], { fill: col, base: col, baseA: .85, hatchColor: C.brown, gap: 3, a: .5, w: 2.1 });
  },
});
defineProp('stool', {
  box: o => [-(o.w || 50) / 2 - 2, -(o.h || 46) - 4, (o.w || 50) / 2 + 2, 0],
  draw(P, o) {
    const w = o.w || 50, h = o.h || 46, col = o.color || C.red;
    P.shape([[-w / 2, -h], [w / 2, -h], [w * .45, -2], [w * .28, -2], [w * .25, -h * .5], [-w * .25, -h * .5], [-w * .28, -2], [-w * .45, -2]], { fill: col, base: col, baseA: .85, gap: 2.4, a: .65, w: 2 });
    P.rect(-w / 2 - 3, -h - 4, w + 6, 6, { fill: col, base: col, baseA: .9, w: 1.8 });
  },
});
defineProp('mat', {
  box: o => [-(o.w || 260) / 2 - 2, -(o.h || 26) - 2, (o.w || 260) / 2 + 2, 2],
  draw(P, o) {
    const w = o.w || 260, h = o.h || 26, col = o.color || C.yellow, pts = [[-w / 2 + 20, -h], [w / 2, -h], [w / 2 - 20, 0], [-w / 2, 0]];
    P.shape(pts, { fill: col, base: col, baseA: .7, hatchColor: C.orange, gap: 3, a: .4, w: 2 });
    for (let i = 1; i < 6; i++) { const u = i / 6; P.ink([[-w / 2 + 20 - 20 * 0 + u * (w - 20), -h], [-w / 2 + u * (w - 20), 0]], { w: 1.2, color: C.red, alpha: .7 }); }
  },
});
defineProp('shelf', {
  box: o => [-(o.w || 180) / 2 - 2, -(o.h || 200) - 2, (o.w || 180) / 2 + 2, 0],
  draw(P, o) {
    const w = o.w || 180, h = o.h || 200, rows = o.rows || 3, r = rng(P.seed);
    P.rect(-w / 2, -h, w, h, { fill: C.brownLight, base: C.brownLight, baseA: .6, hatchColor: C.brown, a: .4, w: 2.2 });
    const cols = [C.red, C.ink, C.yellow, C.green, C.pink, C.violet, C.orange];
    for (let i = 0; i < rows; i++) {
      const y = -h + (i + 1) * h / rows; P.ink([[-w / 2, y], [w / 2, y]], { w: 2.4 });
      if (o.books !== false) for (let x = -w / 2 + 8; x < w / 2 - 14;) { const bw = 9 + r() * 8, bh = h / rows * (.55 + r() * .3); P.rect(x, y - bh - 2, bw, bh, { fill: cols[(r() * cols.length) | 0], baseA: .7, gap: 2.6, a: .6, w: 1.5 }); x += bw + 2 + (r() < .15 ? 10 : 0); }
    }
  },
});
defineProp('books', {
  box: o => [-(o.w || 70) / 2 - 4, -(o.n || 5) * 14 - 4, (o.w || 70) / 2 + 4, 0],
  draw(P, o) {
    const w = o.w || 70, n = o.n || 5, r = rng(P.seed), cols = [C.red, C.ink, C.yellow, C.green, C.pink, C.violet];
    for (let i = 0; i < n; i++) { const dx = (r() - .5) * 10, bw = w * (.8 + r() * .2); P.rect(dx - bw / 2, -(i + 1) * 13, bw, 12, { fill: cols[(i + (P.seed % 5)) % cols.length], baseA: .7, gap: 2.6, a: .6, w: 1.6 }); }
  },
});
defineProp('panel', { // a hatched backdrop (a yard, a room): set it behind the figures with bg: true
  box: o => [-(o.w || 400) / 2, -(o.h || 160), (o.w || 400) / 2, 0],
  draw(P, o) {
    const w = o.w || 400, h = o.h || 160, col = o.color || C.yellow;
    P.rect(-w / 2, -h, w, h, { fill: col, base: col, baseA: .25, hatchColor: col === C.yellow ? C.orange : col, gap: 3.4, a: .35, outline: o.outline ? C.ink : null, w: 1.6 });
    if (o.ground) P.rect(-w / 2, -(o.ground === true ? 40 : o.ground), w, o.ground === true ? 40 : o.ground, { fill: o.groundColor || C.violet, base: o.groundColor || C.violet, baseA: .15, gap: 3, a: .3, outline: null });
  },
});
defineProp('ground', {
  box: o => [-(o.w || 300) / 2, -6, (o.w || 300) / 2, 6],
  draw(P, o) { const w = o.w || 300; P.ink([[-w / 2, 0], [w / 2, 0]], { w: 2, alpha: .8, amp: 1.4 }); },
});

// ── nature, buildings, machines ───────────────────────────────────────────────────────────────────────────────────
defineProp('tree', {
  box: o => { const h = o.h || 180; return [-h * .36, -h, h * .36, 0]; },
  draw(P, o, t) {
    const h = o.h || 180, col = o.color || C.green, sway = Math.sin(t * .8 + P.seed) * 2;
    P.shape(limbPts([[0, 0], [sway * .3, -h * .55]], 16, 10), { fill: C.brown, base: C.brown, baseA: .8, gap: 2.6, w: 2 });
    P.shape(cloudPts(sway, -h * .66, h * .66, h * .62, P.seed, 6), { fill: col, base: col, baseA: .8, hatchColor: C.greenDark, a: .5, gap: 3, w: 2.1 });
  },
});
defineProp('plant', {
  box: o => [-(o.h || 60) * .5, -(o.h || 60), (o.h || 60) * .5, 0],
  draw(P, o, t) {
    const h = o.h || 60, n = o.n || 5, col = o.color || C.green;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / (n - 1) - .5) * 1.6 + Math.sin(t + i) * .04; P.shape(limbPts([[0, 0], [Math.cos(a) * h * .5, Math.sin(a) * h * .55], [Math.cos(a) * h * .8, Math.sin(a) * h * .95]], 3, 12).slice(0), { fill: col, base: col, baseA: .8, hatchColor: C.greenDark, gap: 2.4, w: 1.6 }); }
  },
});
defineProp('house', {
  box: o => [-(o.w || 180) / 2 - 14, -(o.h || 150) - (o.chimney ? 60 : 4), (o.w || 180) / 2 + 14, 0],
  draw(P, o, t) {
    const w = o.w || 180, h = o.h || 150, wall = o.color || C.cream, roof = o.roof || C.red, rh = h * .38;
    P.rect(-w / 2, -(h - rh), w, h - rh, { fill: wall, base: wall, baseA: .9, hatchColor: wall === C.cream ? C.creamHatch : wall, a: .5, w: 2.2 });
    if (o.chimney) { P.rect(w * .2, -h - 10, 22, 40, { fill: C.brownLight, base: C.brownLight, baseA: .8, w: 1.8 }); P.prop('steam', { x: w * .2 + 11, y: -h - 12, h: 50, n: 2 }, t); }
    P.shape([[-w / 2 - 14, -(h - rh)], [0, -h], [w / 2 + 14, -(h - rh)]], { fill: roof, base: roof, baseA: .85, gap: 2.8, a: .6, w: 2.2 });
    P.rect(-w * .12, -h * .36, w * .24, h * .36, { fill: C.brown, base: C.brown, baseA: .7, w: 1.9 });
    for (const d of [-1, 1]) P.rect(d * w * .32 - 14, -(h - rh) + 16, 28, 24, { fill: C.sky, base: C.sky, baseA: .9, hatchColor: C.skyHatch, w: 1.7 });
    if (o.sign) P.text(o.sign, 0, -(h - rh) - 2 + 4, { size: 15, bold: true, color: C.ink, align: 'center' });
  },
});
defineProp('sign', {
  box: o => [-(o.w || 140) / 2 - 4, -(o.h || 46) - (o.post ? 60 : 4), (o.w || 140) / 2 + 4, 0],
  draw(P, o) {
    const w = o.w || 140, h = o.h || 46, post = o.post ? 60 : 0, col = o.color || C.cream;
    if (post) P.shape(rectPts(-4, -post, 8, post), { fill: C.brown, base: C.brown, baseA: .8, w: 1.6 });
    P.rrect(-w / 2, -post - h, w, h, 6, { fill: col, base: col, baseA: .95, hatchColor: col === C.cream ? C.creamHatch : col, a: .5, w: 2.1 });
    P.text(o.text || '', 0, -post - h / 2 - (o.size || 18) * .55, { size: o.size || 18, bold: true, color: o.textColor || C.ink, align: 'center' });
  },
});
defineProp('umbrella', {
  box: o => [-(o.r || 90) - 4, -(o.h || 170) - (o.r || 90) * .42 - 6, (o.r || 90) + 4, 0],
  draw(P, o) {
    const r = o.r || 90, h = o.h || 170, col = o.color || C.ink, top = -h - r * .42, pts = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; pts.push([Math.cos(a) * r, -h + Math.sin(a) * r * .42]); }
    for (let i = 0; i < 8; i++) { const a = i / 8, x0 = lerp(r, -r, a), x1 = lerp(r, -r, a + 1 / 8); pts.push([(x0 + x1) / 2, -h + 6]); pts.push([x1, -h]); }
    P.ink([[0, top], [3, 0]], { w: 2.6, color: C.brown });
    P.shape(pts, { fill: col, base: col, baseA: .6, gap: 2.8, a: .55, w: 2.1 });
    for (let i = 1; i < 6; i++) { const x = lerp(-r, r, i / 6); P.ink([[0, top], [x, -h]], { w: 1.3, alpha: .7 }); }
  },
});
defineProp('machine', {
  box: o => [-(o.w || 120) / 2 - 20, -(o.h || 90) - (o.w || 120) * .28 - 10, (o.w || 120) / 2 + 30, 0],
  draw(P, o, t) {
    const w = o.w || 120, h = o.h || 90, col = o.color || C.violet, R = w * .22, cx = w * .18, cy = -h - R * .6, a0 = t * (o.spin ?? 2.5);
    P.rect(-w / 2, -h, w, h - 8, { fill: col, base: col, baseA: .45, hatchColor: col, gap: 3.4, a: .45, w: 2.2 });
    for (const d of [-.36, .36]) P.rect(d * w - 5, -8, 10, 8, { fill: C.ink, base: C.ink, baseA: .7, w: 1.4 });
    P.ell(cx, cy, R, R, { fill: C.sky, base: C.sky, baseA: .9, hatchColor: C.skyHatch, w: 2 });
    for (let i = 0; i < 5; i++) { const a = a0 + i * TAU / 5; P.ink([[cx, cy], [cx + Math.cos(a) * R * .9, cy + Math.sin(a) * R * .9]], { w: 1.8, amp: .2 }); }
    P.shape([[-w / 2, -h + 6], [-w / 2 - 18, -h - 16], [-w / 2 - 8, -h - 22], [-w / 2 + 12, -h]], { fill: C.yellow, base: C.yellow, baseA: .8, hatchColor: C.orange, w: 1.8 });
    P.ell(-w * .2, -h * .55, 4, 4, { fill: C.red, base: C.red, baseA: .9, w: 1.4 }); P.ell(-w * .05, -h * .55, 4, 4, { fill: C.ink, base: C.ink, baseA: .9, w: 1.4 });
    P.shape([[w / 2, -h * .35], [w / 2 + 26, -h * .2], [w / 2 + 26, -h * .1], [w / 2, -h * .2]], { fill: col, base: col, baseA: .5, w: 1.6 });
  },
});
defineProp('truck', {
  box: o => [-(o.w || 200) / 2 - 4, -(o.h || 90) - 4, (o.w || 200) / 2 + 4, 2],
  draw(P, o, t) {
    const w = o.w || 200, h = o.h || 90, col = o.color || C.yellow, rr = h * .17, spin = t * (o.spin ?? 0);
    P.rect(-w / 2, -h, w * .66, h - rr, { fill: col, base: col, baseA: .7, hatchColor: col === C.yellow ? C.orange : col, gap: 3, a: .5, w: 2.2 });
    P.shape([[w * .18, -h * .68], [w * .38, -h * .68], [w / 2, -h * .4], [w / 2, -rr], [w * .18, -rr]], { fill: o.cab || C.ink, base: o.cab || C.ink, baseA: .55, gap: 2.8, w: 2.1 });
    P.shape([[w * .24, -h * .6], [w * .36, -h * .6], [w * .44, -h * .42], [w * .24, -h * .42]], { fill: C.sky, base: C.sky, baseA: .9, hatchColor: C.skyHatch, w: 1.6 });
    for (const x of [-w * .32, w * .32]) { P.ell(x, -rr, rr, rr, { fill: C.navy, base: C.navy, baseA: .8, gap: 2.2, w: 1.8 }); P.ink([[x - Math.cos(spin) * rr * .6, -rr - Math.sin(spin) * rr * .6], [x + Math.cos(spin) * rr * .6, -rr + Math.sin(spin) * rr * .6]], { w: 1.6, color: C.white }); }
    if (o.label) P.text(o.label, -w * .17, -h * .66, { size: 17, bold: true, color: C.ink, align: 'center' });
  },
});
defineProp('screen', { // type: laptop · phone · monitor, with sketched lines of content
  box: o => { const k = o.type || 'laptop', w = o.w || (k === 'phone' ? 54 : 130), h = o.h || (k === 'phone' ? 96 : 84); return [-w / 2 - (k === 'laptop' ? 16 : 4), -h - 6 - (k === 'monitor' ? 26 : 0), w / 2 + (k === 'laptop' ? 16 : 4), 0]; },
  draw(P, o, t) {
    const k = o.type || 'laptop', w = o.w || (k === 'phone' ? 54 : 130), h = o.h || (k === 'phone' ? 96 : 84), lift = k === 'monitor' ? 26 : k === 'laptop' ? 8 : 0;
    if (k === 'laptop') P.shape([[-w / 2 - 16, 0], [w / 2 + 16, 0], [w / 2 + 4, -8], [-w / 2 - 4, -8]], { fill: C.grey, base: C.grey, baseA: .7, w: 2 });
    if (k === 'monitor') { P.rect(-6, -lift, 12, lift, { fill: C.grey, base: C.grey, baseA: .7, w: 1.6 }); P.rect(-30, -4, 60, 4, { fill: C.grey, base: C.grey, baseA: .7, w: 1.6 }); }
    P.rrect(-w / 2, -h - lift, w, h, k === 'phone' ? 9 : 5, { fill: C.navy, base: C.navy, baseA: .7, gap: 2.4, w: 2.1 });
    const ix = -w / 2 + 7, iy = -h - lift + 8, iw = w - 14, ih = h - 16;
    P.rect(ix, iy, iw, ih, { fill: C.white, base: C.white, baseA: .95, hatchColor: C.skyHatch, a: .35, w: 1.4 });
    const r = rng(P.seed), rows = Math.floor(ih / 12), on = Math.floor((t * 2) % (rows + 3));
    for (let i = 0; i < Math.min(rows, on); i++) P.ink([[ix + 6, iy + 9 + i * 11], [ix + 6 + (iw - 12) * (.4 + r() * .6), iy + 9 + i * 11]], { w: 2.2, color: i === 0 ? C.red : C.ink, alpha: .8, amp: .3 });
  },
});

// ── small goods ───────────────────────────────────────────────────────────────────────────────────────────────────
defineProp('coins', {
  box: o => [-24, -(o.n || 5) * 6 - 10, 24, 0],
  draw(P, o) { const n = o.n || 5; for (let i = 0; i < n; i++) P.ell((i % 2) * 2 - 1, -6 - i * 6, 20, 6, { fill: C.yellow, base: C.yellow, baseA: .9, hatchColor: C.orange, w: 1.6 }); },
});
defineProp('bundle', { // sticks tied in a bundle, standing
  box: o => [-(o.n || 9) * 3 - 8, -(o.len || 120) - 6, (o.n || 9) * 3 + 8, 0],
  draw(P, o) {
    const n = o.n || 9, L = o.len || 120, col = o.color || C.yellow;
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 5.5, lean = (i - (n - 1) / 2) * 1.2; P.ink([[x, 0], [x + lean, -L]], { w: 3.2, color: col }); if (o.tip) P.ink([[x, 0], [x + lean * .15, -L * .15]], { w: 3.4, color: o.tip }); }
    P.ink([[-n * 3 - 2, -L * .45], [n * 3 + 2, -L * .45]], { w: 3, color: C.red });
  },
});
defineProp('fan', { // sticks spread in a ring (drying), feet coloured
  box: o => [-(o.r || 40) - 4, -(o.r || 40) - 4, (o.r || 40) + 4, 4],
  draw(P, o) {
    const r = o.r || 40, n = o.n || 14, col = o.color || C.red;
    for (let i = 0; i < n; i++) { const a = Math.PI + (i + .5) / n * Math.PI; P.ink([[Math.cos(a) * r * .12, Math.sin(a) * r * .12], [Math.cos(a) * r, Math.sin(a) * r]], { w: 2.6, color: o.stick || C.ink }); P.ink([[Math.cos(a) * r * .72, Math.sin(a) * r * .72], [Math.cos(a) * r, Math.sin(a) * r]], { w: 4.2, color: col }); }
  },
});
defineProp('veg', { // type: cabbage · radish · garlic · chili · scallion · onion · apple · leaf
  box: o => ({ cabbage: [-42, -40, 44, 2], radish: [-18, -96, 18, 2], garlic: [-17, -34, 17, 2], chili: [-30, -14, 30, 2], scallion: [-8, -110, 8, 2], onion: [-20, -44, 20, 2], apple: [-20, -44, 20, 2], leaf: [-22, -60, 22, 2] }[o.type || 'cabbage']),
  draw(P, o) {
    const k = o.type || 'cabbage', g = P.g;
    if (k === 'cabbage') { // napa cabbage lying on its side: pale ribs at the root end (left), frilly green leaf tops (right)
      const L = 80, H = 34, half = o.half, r = rng(P.seed), body = [];
      for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; body.push([Math.cos(a) * L / 2, -H / 2 + Math.sin(a) * H / 2 * (i > 8 ? 1.05 : .9)]); }
      for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; body.push([Math.cos(a) * L / 2 * .96, -H / 2 + Math.sin(a) * H / 2 * .95]); }
      P.shape(body, { fill: C.green, base: C.green, baseA: .9, hatchColor: C.greenDark, gap: 2.8, a: .55, w: 2 });
      // the pale rib end, its right edge a frilly line where the green starts
      const rib = [[-L / 2 + 1, -H * .62], [-L * .36, -H * .92], [-L * .12, -H * .97]];
      for (let i = 0; i <= 6; i++) { const u = i / 6; rib.push([-L * .04 + (i % 2 ? 7 : -1) + Math.sin(u * 3) * 3, lerp(-H * .97, -H * .04, u)]); }
      rib.push([-L * .36, -H * .08], [-L / 2 + 1, -H * .38]);
      P.shape(rib, { fill: half ? C.cream : C.white, base: half ? C.cream : C.white, baseA: .97, hatchColor: half ? C.yellow : C.skyHatch, a: .4, w: 1.6, outline: null });
      for (let i = 0; i < 3; i++) P.ink([[-L / 2 + 5, -H * (.3 + i * .2)], [-L * .06, -H * (.25 + i * .24) + (r() - .5) * 3]], { w: 1.3, color: half ? C.yellow : C.green, alpha: .9 });
      for (let i = 0; i < 2; i++) P.ink([[L * .08, -H * (.35 + i * .3)], [L * .4, -H * (.4 + i * .2)]], { w: 1.2, color: C.greenDark, alpha: .6 });
      P.ink(body, { closed: true, w: 2, amp: .8 });
    } else if (k === 'radish') {
      P.shape([[-15, -58], [15, -58], [12, -20], [0, 0], [-12, -20]], { fill: C.white, base: C.white, baseA: .95, hatchColor: C.skyHatch, a: .4, w: 2 });
      P.shape([[-15, -58], [15, -58], [14, -44], [-14, -44]], { fill: '#c9e8a6', base: '#c9e8a6', baseA: .9, hatchColor: C.green, w: 1.6 });
      for (const d of [-1, 0, 1]) P.shape(limbPts([[d * 5, -58], [d * 12, -80], [d * 16, -94]], 3, 10), { fill: C.green, base: C.green, baseA: .85, hatchColor: C.greenDark, w: 1.5 });
    } else if (k === 'garlic') {
      P.shape([[0, -32], [8, -22], [16, -12], [12, -2], [-12, -2], [-16, -12], [-8, -22]], { fill: C.white, base: C.white, baseA: .95, hatchColor: C.violet, a: .3, w: 1.9 });
      for (const d of [-1, 1]) P.ink([[0, -30], [d * 7, -14], [d * 5, -3]], { w: 1.2, alpha: .7 });
    } else if (k === 'chili') {
      P.shape(limbPts([[-26, -6], [-8, -10], [12, -8], [26, -2]], 10, 2), { fill: C.red, base: C.red, baseA: .9, gap: 2.2, a: .7, w: 1.7 });
      P.ink([[-26, -6], [-31, -11]], { w: 2.6, color: C.greenDark });
    } else if (k === 'scallion') {
      P.shape(limbPts([[0, 0], [0, -50]], 9, 9), { fill: C.white, base: C.white, baseA: .95, hatchColor: C.skyHatch, w: 1.6 });
      for (const d of [-1, 1]) P.shape(limbPts([[d * 2, -48], [d * 5, -80], [d * 7, -108]], 6, 3), { fill: C.green, base: C.green, baseA: .85, hatchColor: C.greenDark, w: 1.5 });
    } else if (k === 'onion' || k === 'apple') {
      const col = o.color || (k === 'onion' ? C.brownLight : C.red);
      P.shape([[0, -38], [14, -30], [19, -16], [12, -2], [-12, -2], [-19, -16], [-14, -30]], { fill: col, base: col, baseA: .85, gap: 2.6, w: 1.9 });
      P.ink([[0, -36], [2, -44]], { w: 2.2, color: k === 'onion' ? C.brown : C.greenDark });
    } else {
      P.shape(limbPts([[0, 0], [-6, -30], [0, -58]], 4, 30).slice(0), { fill: o.color || C.green, base: o.color || C.green, baseA: .85, hatchColor: C.greenDark, w: 1.7 });
      P.ink([[0, 0], [-3, -30], [0, -56]], { w: 1.2, color: C.greenDark });
    }
  },
});
defineProp('pile', { // n copies of a prop heaped in rows: pile({ of: 'veg', type: 'cabbage', n: 7, w: 180 })
  box: o => { const w = o.w || 160, d = PROPS[o.of || 'veg'].box({ ...o, name: o.of }), s = o.each || .8, rows = Math.ceil(Math.sqrt(o.n || 6) / 1.2); return [-w / 2 + d[0] * s, d[1] * s - (rows - 1) * (d[3] - d[1]) * s * .45, w / 2 + d[2] * s, 2]; },
  draw(P, o, t) {
    const n = o.n || 6, w = o.w || 160, s = o.each || .8, of = o.of || 'veg', d = PROPS[of].box({ ...o, name: of }), ih = (d[3] - d[1]) * s, r = rng(P.seed);
    let left = n, row = 0, per = Math.max(1, Math.ceil(n / 2.2));
    const slots = [];
    while (left > 0) { const m = Math.min(left, Math.max(1, per - row)); for (let i = 0; i < m; i++) slots.push([(i - (m - 1) / 2) * (w / Math.max(per, 1)) + (r() - .5) * 6, -row * ih * .45]); left -= m; row++; }
    for (const [x, y] of slots) P.prop(of, { ...o, name: of, x, y, s: s * (.9 + r() * .2), flip: r() < .5 }, t);
  },
});
defineProp('blob', { // any shape: blob({ pts: [[x, y] …] }) or blob({ rx, ry }); fill, hatch, outline as in sketch.shape
  box: o => { if (o.pts) { const xs = o.pts.map(p => p[0]), ys = o.pts.map(p => p[1]); return [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3]; } return [-(o.rx || 30) - 3, -(o.ry || 20) * 2 - 3, (o.rx || 30) + 3, 3]; },
  draw(P, o) {
    const pts = o.pts || ellipsePts(0, -(o.ry || 20), o.rx || 30, o.ry || 20, 26), col = o.fill || C.yellow;
    P.shape(pts, { fill: col, base: col, baseA: o.baseA ?? .8, hatchColor: o.hatch || col, gap: o.gap || 3, a: o.a ?? .55, outline: o.outline === false ? null : o.outline || C.ink, w: o.w || 2 });
  },
});
