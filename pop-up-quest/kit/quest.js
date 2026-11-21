// pop-up-quest — the engine. A storybook open on a tablecloth; each spread is one chapter of a journey, carried by a
// pop-up set of cardstock pieces that stand up as the spread opens and fold flat as its leaf turns. A paper-cut hero
// walks in, a guide points at one prop, and the reader pokes the prop to solve the chapter's small task (a choice, an
// order, a count) and earn its stamp on the fold-out map. Drag the paper, the rail or the arrows to turn pages.
// The same page plays a scripted tour, deterministically, through renderAt(t), so it also bakes to an MP4.
//
//   import { createQuest } from '../../kit/quest.js'; import book from './book.js'; createQuest(book);
//
// Book data: see references/BOOK.md. The set of each chapter is code: chapter.set(S) with the builder S below.
import * as T from 'three';
import * as P from './paper.js';
import { makePuppet, pose, walkPlan, LIMITS, bootX, MASS } from './puppet.js';
import { drawPrint, blob } from './print.js';
import { createUI } from './ui.js';
import { createSound } from './sound.js';

export const W = 5.9, D = 6.88, Y = .42;            // page width (spine → edge), depth, page height above the cloth
const PI = Math.PI, NX = 40, NZ = 6, FOLD_FLAT = .025;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = x => smooth(0, 1, x);
const cam = r => .085 * Math.exp(-r / .32);           // the pages rise a little toward the gutter
const lerp = (a, b, u) => a + (b - a) * u;
export const SKY = {   // light per time of day; chapters pick one, the book blends between them while turning
  morning: { room: '#24443c', hemi: ['#fff1d6', '#3f5a4f', 1.55], key: ['#ffe2b5', 2.3], keyPos: [-6, 12, 8], fill: .35 },
  day:     { room: '#22423b', hemi: ['#fff6e2', '#46594f', 1.7], key: ['#fff0cf', 2.4], keyPos: [-5, 13, 7], fill: .4 },
  dusk:    { room: '#2a3340', hemi: ['#ffd9b0', '#3c3f52', 1.25], key: ['#ffb877', 2.1], keyPos: [7, 7, 6], fill: .3 },
  night:   { room: '#16222f', hemi: ['#a8b8e0', '#1d2633', .75], key: ['#c7d4ff', .95], keyPos: [4, 12, 5], fill: .18 },
};

export function createQuest(book, opts = {}) {
  const q = new URLSearchParams(location.search);
  const TOUR = q.has('tour'), RENDER = q.has('render') || TOUR || opts.render, LIVE = !RENDER && (q.has('live') || opts.live);   // ?tour plays the film live
  const mount = opts.mount || document.body;
  const N = book.chapters.length;
  const el = document.createElement('main'); el.className = 'pq' + (RENDER ? ' pq-render' : ''); el.setAttribute('aria-label', `${book.title}, an interactive pop-up book`); mount.appendChild(el);
  const canvas = document.createElement('canvas'); canvas.className = 'pq-world'; canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A three-dimensional open book on a table. Drag the paper to turn the page, or use the page rail.');
  el.appendChild(canvas);
  if (book.theme?.accent) el.style.setProperty('--accent', book.theme.accent);

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER }); }
  catch (e) { return printedEdition(el, book); }
  renderer.setPixelRatio(RENDER && !TOUR ? 1 : Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, .1, 200);
  const hemi = new T.HemisphereLight('#fff', '#444', 1.5), key = new T.DirectionalLight('#fff', 2.3), fill = new T.DirectionalLight('#ffe9cf', .4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0006; key.shadow.normalBias = .02;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  fill.position.set(6, 5, 9); scene.add(hemi, key, key.target, fill);

  // ── table, cover, page blocks ────────────────────────────────────────────────────────────────────────────
  const theme = book.theme || {};
  const cloth = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshLambertMaterial({ map: clothTexture(theme.cloth || '#4b6a5f') }));
  cloth.rotation.x = -PI / 2; cloth.receiveShadow = true; scene.add(cloth);
  const coverM = P.mat(theme.cover || '#8a3b2f');
  const cover = new T.Mesh(new T.BoxGeometry(2 * W + .55, .07, D + .42), coverM); cover.position.y = .035; cover.receiveShadow = cover.castShadow = true; scene.add(cover);
  const spineM = new T.Mesh(new T.CylinderGeometry(.22, .22, D + .42, 12, 1, false, PI, PI), coverM); spineM.rotation.x = PI / 2; spineM.position.set(0, .06, 0); scene.add(spineM);
  const edgeTex = pageEdgeTexture(), blockM = [P.mat('#efe3c6', { map: edgeTex }), P.mat('#efe3c6', { map: edgeTex }), P.mat('#f0e4c8'), P.mat('#f0e4c8'), P.mat('#efe3c6', { map: edgeTex }), P.mat('#efe3c6', { map: edgeTex })];
  for (const s of [-1, 1]) { const b = new T.Mesh(new T.BoxGeometry(W - .06, Y - .075, D), blockM); b.position.set(s * (W / 2 + .03), .07 + (Y - .075) / 2 - .004, 0); b.castShadow = b.receiveShadow = true; scene.add(b); }

  // ── prints and pages ─────────────────────────────────────────────────────────────────────────────────────
  const prints = book.chapters.map((ch, i) => drawPrint(ch, i, book, W, D));
  const pageMat = side => new T.MeshLambertMaterial({ map: prints[0].texture, side });
  function pageGeo(sign) {           // a page as a bendable grid; uv picks its half of the spread print
    const geo = new T.BufferGeometry(), pos = [], uv = [], idx = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const r = i / NX * W, z = -D / 2 + j / NZ * D; pos.push(sign * r, Y + cam(r), z);
      uv.push(sign > 0 ? (r + W) / (2 * W) : (W - r) / (2 * W), 1 - j / NZ);
      if (i < NX && j < NZ) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(...(sign > 0 ? [a, c, b, b, c, d] : [a, b, c, b, d, c])); }
    }
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const leftPage = new T.Mesh(pageGeo(-1), pageMat(T.FrontSide)), rightPage = new T.Mesh(pageGeo(1), pageMat(T.FrontSide));
  for (const p of [leftPage, rightPage]) { p.receiveShadow = true; scene.add(p); }
  // the turning leaf: one position buffer, two faces (front = right half of spread i, back = left half of spread i+1)
  const leafPos = new T.BufferAttribute(new Float32Array((NX + 1) * (NZ + 1) * 3), 3); leafPos.setUsage(T.DynamicDrawUsage);
  const leafIdx = [], uvF = [], uvB = [];
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const r = i / NX * W; uvF.push((r + W) / (2 * W), 1 - j / NZ); uvB.push((W - r) / (2 * W), 1 - j / NZ);
    if (i < NX && j < NZ) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; leafIdx.push(a, c, b, b, c, d); } }
  const leafGeoF = new T.BufferGeometry(), leafGeoB = new T.BufferGeometry();
  for (const [g, uv] of [[leafGeoF, uvF], [leafGeoB, uvB]]) { g.setAttribute('position', leafPos); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(leafIdx); }
  const leafF = new T.Mesh(leafGeoF, pageMat(T.FrontSide)), leafB = new T.Mesh(leafGeoB, pageMat(T.BackSide));
  for (const m of [leafF, leafB]) { m.castShadow = m.receiveShadow = true; m.visible = false; scene.add(m); }
  const leafS = { x: new Float32Array(NX + 1), y: new Float32Array(NX + 1), phi: new Float32Array(NX + 1) };
  function bendLeaf(p) {   // p: 0 lying right → 1 lying left. The free edge leads, so the sheet bows as it turns.
    const th = PI * ease(p), k = .62 * Math.sin(th); let x = 0, y = 0;
    for (let i = 0; i <= NX; i++) {
      const r = i / NX * W, phi = th + k * Math.pow(r / W, 1.3) * (th < PI / 2 ? 1 : 1);
      if (i) { const dr = W / NX, pm = (leafS.phi[i - 1] + phi) / 2; x += Math.cos(pm) * dr; y += Math.sin(pm) * dr; }
      leafS.x[i] = x; leafS.y[i] = Y + .012 + y + cam(r); leafS.phi[i] = phi;
    }
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) leafPos.setXYZ(j * (NX + 1) + i, leafS.x[i], leafS.y[i], -D / 2 + j / NZ * D);
    leafPos.needsUpdate = true; leafGeoF.computeVertexNormals(); leafGeoB.computeVertexNormals();
  }
  function leafAt(r) { const f = clamp(r / W) * NX, i = Math.min(NX - 1, Math.floor(f)), u = f - i;
    return { x: lerp(leafS.x[i], leafS.x[i + 1], u), y: lerp(leafS.y[i], leafS.y[i + 1], u), phi: lerp(leafS.phi[i], leafS.phi[i + 1], u) }; }

  // ── cast ─────────────────────────────────────────────────────────────────────────────────────────────────
  const castSpecs = book.cast || {};
  const heroId = book.hero;
  const lights = [];

  // ── sets: build every chapter's pop-up up front, as standees split by page half ───────────────────────────
  const chapters = book.chapters.map((ch, ci) => buildChapter(ch, ci));
  function buildChapter(ch, ci) {
    const halves = { L: [], R: [] }, motions = [], props = [], actors = [];
    const S = {
      P, C: P.C, T, W, D, chapter: ch, index: ci,
      add(x, z, build, o = {}) {
        const side = o.side || (x < 0 ? 'L' : 'R'), sgn = side === 'L' ? -1 : 1;
        const carrier = new T.Group(), fold = new T.Group(), squash = new T.Group(), content = new T.Group();
        carrier.add(fold); fold.add(squash); squash.add(content); scene.add(carrier); carrier.visible = false;
        build(content, P);
        const it = { x, z, side, sgn, r: Math.abs(x), carrier, fold, squash, content, name: o.name || '', prop: null, o, chapter: ci };
        measure(it); chooseFold(it, o.fold);
        halves[side].push(it); return it;
      },
      prop(name, x, z, build, o = {}) {
        const it = S.add(x, z, build, { ...o, name });
        const tag = tagCard(); tag.position.set(0, it.box.max.y + .38, 0); it.content.add(tag);
        const p = { name, item: it, tag, label: o.label || name, poke: null }; it.prop = p; props.push(p);
        it.content.traverse(m => { if (m.isMesh) m.userData.prop = p; });
        return { item: it, on: fn => motions.push(c => fn(c, it.content, it)) };
      },
      on(fn) { motions.push(fn); },
      actor(id, x, z, o = {}) {
        const spec = castSpecs[id]; if (!spec) throw new Error(`cast member "${id}" is not in book.cast`);
        const a = makePuppet(spec, (spec.height || 1.05) * (book.puppetScale || 1.25));
        const it = S.add(x, z, g => g.add(a.root), { name: id, fold: o.fold, side: o.side });
        a.item = it; a.id = id; a.isHero = id === heroId; a.o = o; a.seed = ci * 1.7 + actors.length * 2.3; actors.push(a);
        it.box.max.y = a.height; it.box.min.x = -.3; it.box.max.x = .3; chooseFold(it, o.fold);
        return a;
      },
      hero(x, z, o = {}) { return S.actor(heroId, x, z, { from: -.9, ...o }); },
      guide(id, x, z, o = {}) { return S.actor(id, x, z, o); },
      // shortcuts — each makes one standee at (x, z)
      pine: (x, z, h, c) => S.add(x, z, g => P.pine(g, 0, 0, h, c), { name: 'pine' }),
      tree: (x, z, h, c) => S.add(x, z, g => P.tree(g, 0, 0, h, c), { name: 'tree' }),
      bush: (x, z, r, c) => S.add(x, z, g => P.bush(g, 0, 0, r, c), { name: 'bush' }),
      rock: (x, z, r, c) => S.add(x, z, g => P.rock(g, 0, 0, r, c), { name: 'rock' }),
      grass: (x, z, h, c) => S.add(x, z, g => P.grass(g, 0, 0, h, c), { name: 'grass' }),
      flower: (x, z, c) => S.add(x, z, g => P.flower(g, 0, 0, c), { name: 'flower' }),
      sun: (x, z, y = 3.2, r = .55) => S.add(x, z, g => P.sun(g, 0, y, 0, r), { name: 'sun' }),
      moon: (x, z, y = 3.2, r = .5) => S.add(x, z, g => P.moon(g, 0, y, 0, r), { name: 'moon' }),
      cloud: (x, z, y = 2.8, w = 1.1) => S.add(x, z, g => P.cloud(g, 0, y, 0, w), { name: 'cloud' }),
      star: (x, z, y) => S.add(x, z, g => { P.beam(g, [0, 0, 0], [0, y, 0], .008, P.C.wood, 3); P.star(g, 0, y, 0); }, { name: 'star' }),
      sign: (x, z, text, dir = 1) => S.add(x, z, g => P.sign(g, 0, 0, text, dir), { name: 'sign' }),
      house: (x, z, o) => S.add(x, z, g => P.house(g, 0, 0, o), { name: 'house' }),
      boat: (x, z, s, sail, hull) => S.add(x, z, g => P.boat(g, 0, 0, s, sail, hull), { name: 'boat' }),
      fence: (x0, x1, z) => S.add((x0 + x1) / 2, z, g => P.fence(g, x0 - (x0 + x1) / 2, x1 - (x0 + x1) / 2, 0), { name: 'fence' }),
      ripple: (x, z, w = .8, d = .4) => S.add(x, z, g => P.water(g, 0, 0, w, d), { name: 'ripple' }),
      ridge(x0, x1, z, peaks, c = P.C.moss) {    // a folded strip of hills; split at the gutter automatically
        const out = [];
        for (const [a, b] of (x0 < 0 && x1 > 0 ? [[x0, -.06], [.06, x1]] : [[x0, x1]])) {
          const pk = clipPeaks(peaks, a, b), mid = (a + b) / 2;
          out.push(S.add(mid, z, g => P.ridge(g, a - mid, b - mid, 0, pk.map(([px, ph]) => [px - mid, ph]), c), { name: 'ridge' }));
        }
        return out;
      },
      mountains(x0, x1, z, peaks, c) {
        const out = [];
        for (const [a, b] of (x0 < 0 && x1 > 0 ? [[x0, -.06], [.06, x1]] : [[x0, x1]])) {
          const pk = clipPeaks(peaks, a, b), mid = (a + b) / 2;
          out.push(S.add(mid, z, g => P.mountains(g, a - mid, b - mid, 0, pk.map(([px, ph]) => [px - mid, ph]), c), { name: 'mountains' }));
        }
        return out;
      },
      glow(x, y, z, color = '#ffc46b', power = 4) {   // a warm point light for night spreads (lamps, windows)
        const l = new T.PointLight(color, 0, 4, 1.6); l.position.set(x, Y + y, z); scene.add(l); l.userData.power = power; lights.push({ light: l, chapter: ci }); return l;
      },
    };
    ch.set(S);
    if (!props.length) console.warn(`chapter ${ci} (${ch.id}) has no prop — the reader has nothing to poke`);
    return { ch, halves, motions, props, actors };
  }
  function clipPeaks(peaks, a, b) { const pts = [[a, interp(peaks, a)], ...peaks.filter(([x]) => x > a && x < b), [b, interp(peaks, b)]]; return pts.filter(p => p[1] > 0 || true); }
  function interp(peaks, x) { const all = [[peaks[0][0] - 1e-3, 0], ...peaks, [peaks[peaks.length - 1][0] + 1e-3, 0]]; for (let i = 0; i < all.length - 1; i++) { const [x0, y0] = all[i], [x1, y1] = all[i + 1]; if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1); } return 0; }
  function measure(it) { it.content.updateMatrixWorld(true); const b = new T.Box3().setFromObject(it.content); if (b.isEmpty()) b.set(new T.Vector3(), new T.Vector3()); it.box = b; }
  // fold direction: the piece must lie flat inside its own page when the book closes. Try outward, toward the
  // reader, toward the gutter, away — the first that fits wins; none fitting is a check failure.
  function chooseFold(it, forced) {
    const h = it.box.max.y, m = .08, r = it.r, z = it.z;
    const reach = { out: r + it.sgn * (it.sgn > 0 ? it.box.max.x : it.box.min.x) * 0 + h + m, in: r - h - m, fwd: z + h + m, back: z - h - m };
    const fits = { out: r + h + m <= W, in: r - h - m >= .1, fwd: z + h + m <= D / 2, back: z - h - m >= -D / 2 };
    const order = ['out', 'fwd', 'in', 'back'];
    it.dir = forced || order.find(k => fits[k]) || 'fwd'; it.foldFits = !!fits[it.dir]; it.foldReach = reach[it.dir];
  }
  function tagCard() {   // a paper tag with a dot that bobs over the chapter's prop until the task is solved
    const g = new T.Group(), c = P.mat(theme.accent || '#e7b14a');
    const plate = P.slab(g, [[-.13, 0], [.13, 0], [.13, .22], [0, .3], [-.13, .22]], .03, c); plate.position.y = -.04;
    P.ball(g, 0, .1, .03, .045, '#3a2f22'); P.beam(g, [0, -.04, 0], [0, -.28, 0], .008, P.C.ink, 3);
    g.traverse(m => { if (m.isMesh) m.castShadow = false; }); return g;
  }
  // ── state ────────────────────────────────────────────────────────────────────────────────────────────────
  const st = { s: 0, rise: 1, open: null, picks: [], wrong: null, solved: {}, arrive: [0], map: false, read: false, cursor: null, hover: null, t: 0 };
  const startHash = location.hash.slice(1); const hashIdx = book.chapters.findIndex(c => c.id === startHash);
  if (hashIdx > 0 && !RENDER) { st.s = hashIdx; st.arrive[hashIdx] = 0; }

  // ── per-frame pose of the whole book ─────────────────────────────────────────────────────────────────────
  const tmp = new T.Vector3();
  function place(t) {
    const i = Math.min(N - 1, Math.floor(st.s + 1e-6)), p = clamp(st.s - i), turning = p > 1e-4 && i < N - 1;
    leftPage.material.map = prints[i].texture; rightPage.material.map = prints[turning ? i + 1 : i].texture;
    leafF.visible = leafB.visible = turning;
    if (turning) { bendLeaf(p); leafF.material.map = prints[i].texture; leafB.material.map = prints[i + 1].texture; }
    const rise = st.rise;
    for (const [ci, c] of chapters.entries()) {
      let L = null, R = null;   // [carrier kind, stand]
      if (ci === i) { L = ['base', turning ? 1 - smooth(.55, .98, p) : 1]; R = [turning ? 'leafF' : 'base', turning ? 1 - smooth(0, .42, p) : 1]; }
      else if (turning && ci === i + 1) { L = ['leafB', smooth(.58, 1, p)]; R = ['base', smooth(.02, .45, p)]; }
      for (const [side, a] of [['L', L], ['R', R]]) for (const it of c.halves[side]) {
        if (!a) { it.carrier.visible = false; continue; }
        const stand = a[1] * (ci === 0 ? rise : 1); it.stand = stand; it.carrier.visible = stand > .002 || a[0] !== 'base' || true;
        poseItem(it, a[0], stand);
      }
      for (const l of lights) if (l.chapter === ci) l.light.intensity = (ci === i ? (turning ? 1 - p : 1) : ci === i + 1 && turning ? p : 0) * l.light.userData.power * rise;
    }
    // light and room blend between the two spreads in play
    const a = SKY[book.chapters[i].sky || 'day'], b = SKY[book.chapters[Math.min(N - 1, i + 1)].sky || 'day'], u = turning ? smooth(.2, .8, p) : 0;
    const col = (x, y) => new T.Color(x).lerp(new T.Color(y), u);
    scene.background = col(a.room, b.room); hemi.color = col(a.hemi[0], b.hemi[0]); hemi.groundColor = col(a.hemi[1], b.hemi[1]); hemi.intensity = lerp(a.hemi[2], b.hemi[2], u);
    key.color = col(a.key[0], b.key[0]); key.intensity = lerp(a.key[1], b.key[1], u); key.position.set(...a.keyPos.map((v, k) => lerp(v, b.keyPos[k], u))); fill.intensity = lerp(a.fill, b.fill, u);
    el.style.setProperty('--room', '#' + scene.background.getHexString());
    return { i, p, turning };
  }
  function poseItem(it, kind, stand) {
    const c = it.carrier;
    if (kind === 'base') { c.position.set(it.x, Y + cam(it.r) + .002, it.z); c.rotation.set(0, 0, 0); }
    else { const L = leafAt(it.r), n = kind === 'leafF' ? 1 : -1; c.position.set(L.x - Math.sin(L.phi) * .006 * n, L.y + Math.cos(L.phi) * .006 * n, it.z); c.rotation.set(0, 0, kind === 'leafF' ? L.phi : L.phi + PI); }
    const f = 1 - clamp(stand), a = ease(f) * PI / 2, sq = 1 - (1 - FOLD_FLAT) * ease(f);
    it.fold.rotation.set(0, 0, 0); it.squash.scale.set(1, 1, 1);
    if (it.dir === 'out' || it.dir === 'in') { it.fold.rotation.z = (it.dir === 'out' ? -1 : 1) * it.sgn * a; it.squash.scale.x = sq; }
    else { it.fold.rotation.x = (it.dir === 'fwd' ? 1 : -1) * a; it.squash.scale.z = sq; }
    c.visible = stand > .004 || kind !== 'base';
  }

  // ── actors: who walks where, when ────────────────────────────────────────────────────────────────────────
  function actorPlan(a, ci, t) {
    const c = chapters[ci], arrive = st.arrive[ci] ?? Infinity, solved = st.solved[ci], open = st.open === ci ? st.openAt : null;
    const prop = c.props[0]?.item, toProp = prop ? Math.sign(prop.x - a.item.x) || 1 : 1;
    const plan = { x: 0, facing: a.o.facing || toProp, seed: a.seed, look: 0 };
    if (a.isHero && a.o.from) {
      const dir = Math.sign(-a.o.from), w = walkPlan(a, arrive + .35, a.o.from, 0);
      plan.walk = w; plan.facing = dir;
      if (toProp !== dir && !a.o.facing) plan.turn = { t0: w.t0 + w.dur + .05, to: toProp };
    }
    if (!a.isHero && open != null) plan.point = { t0: open + .1, t1: (solved ?? open + 99) + .2 };
    if (a.isHero && open != null && solved == null) plan.look = 1;
    if (solved != null) plan.cheer = solved + (a.isHero ? .05 : .22);
    return plan;
  }
  function poseActors(t, i, turning) {
    for (const ci of turning ? [i, i + 1] : [i]) for (const a of chapters[ci].actors) pose(a, actorPlan(a, ci, t), t);
  }

  // ── frame ────────────────────────────────────────────────────────────────────────────────────────────────
  function frame(t) {
    st.t = t;
    const { i, p, turning } = place(t);
    poseActors(t, i, turning);
    for (const ci of turning ? [i, i + 1] : [i]) {
      const c = chapters[ci], solvedAt = st.solved[ci];
      const ctx = { t, local: t - (st.arrive[ci] ?? 0), solved: solvedAt == null ? 0 : smooth(0, 1.4, t - solvedAt), solvedAt, open: st.open === ci, poke: c.props[0]?.poke != null ? t - c.props[0].poke : null, stand: c.halves.R[0]?.stand ?? 1 };
      for (const m of c.motions) m(ctx);
      for (const pr of c.props) { const solved = solvedAt != null; pr.tag.visible = !solved; pr.tag.position.y = pr.item.box.max.y + .36 + Math.sin(t * 2.4) * .05; pr.tag.rotation.y = Math.sin(t * 1.3) * .5;
        const hov = st.hover === pr ? 1 : 0, pk = ctx.poke != null ? Math.exp(-4 * ctx.poke) * Math.sin(ctx.poke * 22) * .06 : 0; pr.item.content.scale.setScalar(1 + hov * .04 + pk); }
    }
    cameraPose(t);
    renderer.render(scene, camera);
    ui.sync(st, t, i, p);
  }

  // ── camera: the reader's seat; drag the cloth to look around, wheel to lean in ────────────────────────────
  const view = { az: 0, el: 34, dist: 1, zoom: 1, target: new T.Vector3(0, 1.05, .35) };
  const home = { az: 0, el: 34, zoom: 1 };
  function fitDist() {
    const asp = canvas.clientWidth / Math.max(1, canvas.clientHeight), vf = camera.fov * PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * asp);
    return Math.max((asp < 1 ? 6.35 : 6.7) / Math.tan(hf / 2), 4.7 / Math.tan(vf / 2));
  }
  function cameraPose(t) {
    const drift = RENDER ? Math.sin(t * .21) * 3 : 0;
    const az = (view.az + drift) * PI / 180, el = view.el * PI / 180, d = view.dist * view.zoom;
    camera.position.set(view.target.x + Math.sin(az) * Math.cos(el) * d, view.target.y + Math.sin(el) * d, view.target.z + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(view.target);
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h; const portrait = w < h; camera.fov = portrait ? 38 : 30; camera.updateProjectionMatrix();
    view.dist = fitDist(); view.target.set(0, portrait ? .6 : 1.05, portrait ? .6 : .35);
  }

  // ── turning ──────────────────────────────────────────────────────────────────────────────────────────────
  const sound = createSound();
  let anim = null;
  function goTo(target, dur) {
    target = clamp(Math.round(target), 0, N - 1); if (!LIVE_OK()) return;
    const from = st.s; if (Math.abs(target - from) < 1e-3) return;
    anim = { from, to: target, t0: now(), dur: dur ?? 1.15 * Math.max(1, Math.abs(target - from) ** .6) }; st.open = null; sound.turn();
  }
  function setScrub(s) { anim = null; const prev = st.s; st.s = clamp(s, 0, N - 1); if (Math.floor(prev) !== Math.floor(st.s) || (prev % 1 === 0) !== (st.s % 1 === 0)) st.open = null; }
  function settle() { const i = Math.round(st.s); if (Math.abs(st.s - i) < 1e-3) { if (st.s !== i) st.s = i; if (st.current !== i) { st.current = i; st.arrive = []; st.arrive[i] = now(); sound.pop(); ui.arrived(i); if (!RENDER) history.replaceState(null, '', '#' + book.chapters[i].id); } } }
  const LIVE_OK = () => !RENDER;

  // ── quest ────────────────────────────────────────────────────────────────────────────────────────────────
  function openTask(ci) {
    if (ci !== Math.round(st.s) || Math.abs(st.s - ci) > 1e-3) return;
    const pr = chapters[ci].props[0]; if (pr) pr.poke = now();
    st.open = ci; st.openAt = now(); st.picks = []; st.wrong = null; sound.pop(); ui.announce(book.chapters[ci].task?.prompt || '');
  }
  function answer(ci, pick) {    // ui calls this with the reader's pick; returns 'right' | 'wrong' | 'more'
    const task = book.chapters[ci].task; if (!task || st.solved[ci] != null) return;
    const res = judge(task, pick);
    if (res === 'right') { st.solved[ci] = now(); sound.solve(); ui.announce(task.solved || 'Solved.'); }
    else if (res === 'wrong') { st.wrong = now(); sound.wrong(); }
    return res;
  }
  function judge(task, pick) {
    if (task.type === 'choice') return pick === task.answer ? 'right' : 'wrong';
    if (task.type === 'count') return Number(pick) === task.answer ? 'right' : 'wrong';
    if (task.type === 'order') { for (let k = 0; k < pick.length; k++) if (pick[k] !== k) return 'wrong'; return pick.length === task.items.length ? 'right' : 'more'; }
    return 'wrong';
  }

  // ── the tour: one timeline the renderer can seek ─────────────────────────────────────────────────────────
  const SEG = book.tour?.segment || 8.6, INTRO = 1.4, OUTRO = 3.2, TURN = 1.3;
  const tour = buildTour();
  const DURATION = INTRO + (N - 1) * SEG + (SEG - TURN) + OUTRO;
  function buildTour() {
    const ev = [];   // {t, kind, ci, ...}
    for (let ci = 0; ci < N; ci++) {
      const t0 = INTRO + ci * SEG, task = book.chapters[ci].task;
      ev.push({ t: t0 + 2.4, kind: 'aim', target: 'prop', ci }, { t: t0 + 3.05, kind: 'open', ci });
      let tt = t0 + 3.9;
      const steps = task.type === 'choice' ? [task.answer] : task.type === 'order' ? task.items.map((_, k) => k) : [...Array(Math.max(0, task.answer - (task.min ?? 0))).fill('+'), 'check'];
      const gap = task.type === 'choice' ? 0 : task.type === 'order' ? .48 : .2;
      for (const [k, s] of steps.entries()) { ev.push({ t: tt, kind: 'aim', target: 'pick', ci, k: s }); tt += gap ? gap : .7; ev.push({ t: tt - .05, kind: 'pick', ci, k: s, n: k + 1 }); if (!gap) tt += .1; }
      const done = Math.max(tt, t0 + 4.8); ev.push({ t: done, kind: 'solved', ci });
      if (ci < N - 1) ev.push({ t: t0 + SEG - TURN - .55, kind: 'aim', target: 'next', ci }, { t: t0 + SEG - TURN, kind: 'turn', ci });
    }
    ev.push({ t: DURATION_EST() - OUTRO + 1.0, kind: 'aim', target: 'map' }, { t: DURATION_EST() - OUTRO + 1.5, kind: 'map' });
    return ev.sort((a, b) => a.t - b.t);
  }
  function DURATION_EST() { return INTRO + (N - 1) * SEG + (SEG - TURN) + OUTRO; }
  function tourState(t) {     // rebuild st from the timeline at time t — pure, so any frame can be rendered alone
    st.rise = smooth(.1, 1.3, t); st.open = null; st.picks = []; st.solved = {}; st.map = false; st.wrong = null;
    st.s = 0; st.arrive = [INTRO - .9]; let aim = null, prev = null, aimT = 0, down = -9;
    for (let ci = 1; ci < N; ci++) st.arrive[ci] = INTRO + ci * SEG;
    for (const e of tour) {
      if (e.t > t) break;
      if (e.kind === 'aim') { prev = aim; aim = e; aimT = e.t; }
      if (e.kind === 'open') { st.open = e.ci; st.openAt = e.t; chapters[e.ci].props[0] && (chapters[e.ci].props[0].poke = e.t); down = e.t; }
      if (e.kind === 'pick') { const task = book.chapters[e.ci].task; down = e.t;
        if (task.type === 'choice') st.picks = [e.k]; else if (task.type === 'order') st.picks = [...st.picks, e.k]; else st.picks = [e.k === '+' ? (st.picks[0] ?? task.min ?? 0) + 1 : (st.picks[0] ?? task.min ?? 0)]; }
      if (e.kind === 'solved') st.solved[e.ci] = e.t;
      if (e.kind === 'turn') { st.open = null; down = e.t; }
      if (e.kind === 'map') { st.map = true; down = e.t; }
    }
    for (const e of tour) if (e.kind === 'turn' && t >= e.t) st.s = Math.max(st.s, e.ci + smooth(e.t, e.t + TURN, t));
    for (const e of tour) if (e.kind === 'turn' && t >= e.t + TURN) st.s = e.ci + 1;
    st.cursor = { aim, prev, aimT, down, t };
  }

  // ── ui ───────────────────────────────────────────────────────────────────────────────────────────────────
  const ui = createUI(el, book, {
    goTo: d => goTo(Math.round(st.s) + d), goToIndex: i => goTo(i), scrub: s => setScrub(s), release: () => { const t = Math.round(st.s); goTo(t, .5); },
    openTask: () => openTask(Math.round(st.s)), answer: pick => answer(Math.round(st.s), pick), closeTask: () => { st.open = null; },
    reset: () => { Object.assign(view, { az: home.az, el: home.el, zoom: home.zoom }); }, sound: on => sound.enable(on),
    project: (what, ci, k) => project(what, ci, k), render: RENDER,
  });
  function project(what, ci) {     // screen position (px) of a 3D thing, for the tour cursor
    if (what === 'prop') { const pr = chapters[ci]?.props[0]; if (!pr) return null; const b = pr.item.box; tmp.set((b.min.x + b.max.x) / 2, b.max.y * .6, (b.min.z + b.max.z) / 2); pr.item.content.updateMatrixWorld(true); pr.item.content.localToWorld(tmp); }
    else return null;
    tmp.project(camera); const r = canvas.getBoundingClientRect();
    return { x: r.left + (tmp.x + 1) / 2 * r.width, y: r.top + (1 - tmp.y) / 2 * r.height };
  }

  // ── pointer: drag paper to turn, drag the cloth to orbit, click the prop ──────────────────────────────────
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function hit(e) { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const i = Math.round(st.s), targets = [];
    if (Math.abs(st.s - i) < 1e-3) for (const pr of chapters[i].props) targets.push(pr.item.content);
    const hp = ray.intersectObjects(targets, true)[0]; if (hp) return { prop: hp.object.userData.prop };
    const hpg = ray.intersectObjects([leftPage, rightPage, leafF, leafB], false)[0]; if (hpg) return { page: true };
    return {};
  }
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (RENDER) return; const h = hit(e); drag = { x: e.clientX, y: e.clientY, s: st.s, h, moved: false, az: view.az, el: view.el }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (RENDER) return;
    if (!drag) { const h = hit(e); st.hover = h.prop || null; canvas.style.cursor = h.prop ? 'pointer' : h.page ? 'grab' : 'move'; return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (drag.h.page || drag.h.prop) { if (drag.moved) { setScrub(drag.s - dx / (canvas.clientWidth * .42)); canvas.style.cursor = 'grabbing'; } }
    else { view.az = clamp(drag.az - dx * .12, -38, 38); view.el = clamp(drag.el + dy * .1, 16, 62); }
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.moved && d.h.prop) openTask(Math.round(st.s));
    else if (d.moved && (d.h.page || d.h.prop)) { const delta = st.s - d.s; goTo(Math.abs(delta) < .12 ? Math.round(d.s) : delta > 0 ? Math.ceil(st.s) : Math.floor(st.s), .6); }
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); view.zoom = clamp(view.zoom * (1 + e.deltaY * .0008), .62, 1.25); }, { passive: false });
  addEventListener('keydown', e => { if (e.target.closest?.('input,textarea,dialog')) return; if (e.key === 'ArrowRight') goTo(Math.round(st.s) + 1); if (e.key === 'ArrowLeft') goTo(Math.round(st.s) - 1); });
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(Math.round(st.s)); } });
  addEventListener('resize', resize);

  // ── clocks ───────────────────────────────────────────────────────────────────────────────────────────────
  const t0 = performance.now() / 1000; const now = () => RENDER ? st.t : performance.now() / 1000 - t0;
  resize();
  function loop() {
    const t = now();
    if (anim) { const u = clamp((t - anim.t0) / anim.dur); st.s = lerp(anim.from, anim.to, ease(u)); if (u >= 1) { st.s = anim.to; anim = null; } }
    st.rise = RENDER ? st.rise : smooth(.15, 1.4, t);
    if (!drag) settle();
    frame(t); requestAnimationFrame(loop);
  }
  function renderAt(t) { st.t = t; tourState(t); const i = Math.round(st.s); if (Math.abs(st.s - i) < 1e-3) st.current = i; frame(t); }
  const ready = (document.fonts?.ready || Promise.resolve()).then(() => { prints.forEach((p, i) => { const fresh = drawPrint(book.chapters[i], i, book, W, D); p.canvas.getContext('2d').drawImage(fresh.canvas, 0, 0); p.texture.needsUpdate = true; }); });
  if (TOUR) ready.then(() => { const s0 = performance.now(); const tick = () => { renderAt((performance.now() - s0) / 1000 % DURATION); requestAnimationFrame(tick); }; tick(); });
  else if (RENDER) ready.then(() => renderAt(0));
  else { st.current = -1; ready.then(() => requestAnimationFrame(loop)); }

  // ── audit: numbers for scripts/check.mjs ─────────────────────────────────────────────────────────────────
  function audit() {
    const out = { chapters: [], actors: [], tour: { duration: DURATION } };
    for (const [ci, c] of chapters.entries()) {
      const items = [...c.halves.L, ...c.halves.R], bad = [];
      for (const it of items) {
        const b = it.box, gx0 = it.x + b.min.x, gx1 = it.x + b.max.x, gz0 = it.z + b.min.z, gz1 = it.z + b.max.z;
        if (!it.foldFits) bad.push(`${it.name || 'piece'} at (${it.x.toFixed(2)}, ${it.z.toFixed(2)}) is ${b.max.y.toFixed(2)} tall and cannot fold flat inside its page (tried ${it.dir}, reach ${it.foldReach.toFixed(2)})`);
        if (it.side === 'R' && gx0 < .04 || it.side === 'L' && gx1 > -.04) bad.push(`${it.name || 'piece'} at x ${it.x.toFixed(2)} crosses the gutter (${gx0.toFixed(2)} … ${gx1.toFixed(2)}) — split it into two halves`);
        if (Math.abs(it.side === 'R' ? gx1 : gx0) > W - .02 || gz0 < -D / 2 + .02 || gz1 > D / 2 - .02) bad.push(`${it.name || 'piece'} at (${it.x.toFixed(2)}, ${it.z.toFixed(2)}) hangs off the page`);
        if (b.min.y < -.03) bad.push(`${it.name || 'piece'} sinks ${(-b.min.y).toFixed(2)} below the page`);
      }
      const task = c.ch.task, tb = [];
      if (!task) tb.push('no task'); else {
        if (task.type === 'choice' && !(task.options?.length >= 2 && task.answer >= 0 && task.answer < task.options.length)) tb.push('choice needs ≥ 2 options and a valid answer index');
        if (task.type === 'order' && !(task.items?.length >= 3)) tb.push('order needs ≥ 3 items (listed in the right order)');
        if (task.type === 'count' && !(task.answer >= (task.min ?? 0) && task.answer <= (task.max ?? 9))) tb.push('count answer outside min…max');
        if (!task.solved) tb.push('no solved line');
      }
      out.chapters.push({ id: c.ch.id, pieces: items.length, props: c.props.length, actors: c.actors.length, bad, task: tb, folds: items.reduce((a, it) => (a[it.dir] = (a[it.dir] || 0) + 1, a), {}) });
    }
    // motion: run each actor through its chapter (walk in, turn, point, cheer) at 120 Hz and measure
    const saved = JSON.parse(JSON.stringify({ arrive: st.arrive, solved: st.solved, open: st.open, openAt: st.openAt }));
    for (const [ci, c] of chapters.entries()) for (const a of c.actors) {
      st.arrive[ci] = 0; st.open = ci; st.openAt = 4; st.solved = { [ci]: 6 };
      const lim = {}, worst = {}, dt = 1 / 120; let slide = 0, prev = null, idleMove = 0, idleRef = null, gather = 0, hopStart = null, minSquashBeforeHop = 0;
      for (let t = 0; t < 8.5; t += dt) {
        const rep = pose(a, actorPlan(a, ci, t), t);
        for (const [k, v] of Object.entries(rep.ang)) { const L = LIMITS[k]; if (!L) continue; worst[k] = Math.max(worst[k] ?? -1e9, Math.abs(v)); if (v < L[0] - .01 || v > L[1] + .01) lim[k] = Math.max(lim[k] || 0, Math.abs(v)); }
        const bx = bootX(a, rep);
        if (prev) for (const s of ['near', 'far']) if (!rep.lifted[s] && !prev.lifted[s] && rep.facing === prev.facing && !rep.ang.turn) slide = Math.max(slide, Math.abs(bx[s] - prev.bx[s]));
        prev = { bx, lifted: rep.lifted, facing: rep.facing };
        if (t > 2.6 && t < 3.9) { const sig = a.body.scale.y + a.joints.head.rotation.z + (a.joints.tail?.rotation.z || 0) + a.joints.eyes.scale.y; if (idleRef == null) idleRef = sig; idleMove = Math.max(idleMove, Math.abs(sig - idleRef)); }
        if (t >= 6 + (a.isHero ? .05 : .22) && hopStart == null) { if (a.root.position.y > .002) hopStart = t; else minSquashBeforeHop = Math.min(minSquashBeforeHop, a.body.scale.y - 1); }
      }
      out.actors.push({ chapter: c.ch.id, id: a.id, limits: lim, worst, slideWorld: slide, slidePx: slide * pxPerUnit(), idleMove, anticipation: -minSquashBeforeHop, hop: hopStart != null });
    }
    Object.assign(st, saved);
    return out;
  }
  function pxPerUnit() { const a = new T.Vector3(0, Y, 0).project(camera), b = new T.Vector3(1, Y, 0).project(camera); return Math.abs(b.x - a.x) / 2 * canvas.clientWidth; }

  function propCheck(ci) {   // after renderAt at a settled frame of chapter ci: is its prop on screen and unhidden?
    const pr = chapters[ci].props[0]; if (!pr) return { ok: false, why: 'no prop' };
    const b = pr.item.box, p = new T.Vector3((b.min.x + b.max.x) / 2, b.max.y * .6, (b.min.z + b.max.z) / 2); pr.item.content.localToWorld(p);
    const sp = p.clone().project(camera), on = Math.abs(sp.x) < .92 && Math.abs(sp.y) < .92;
    const meshes = []; pr.item.content.traverse(o => { if (o.isMesh && !isTag(o, pr)) meshes.push(o); });
    let seen = 0; const blockers = {};
    for (const m of meshes) {
      const c = new T.Box3().setFromObject(m).getCenter(new T.Vector3());
      ray.set(camera.position, c.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(c) + .05;
      const first = ray.intersectObjects(scene.children, true).find(h => { for (let o = h.object; o; o = o.parent) if (!o.visible) return false; return true; });
      let mine = false; for (let o = first?.object; o; o = o.parent) if (o === pr.item.content) mine = true;
      if (mine || !first) seen++; else { const n = blockerName(first.object); blockers[n] = (blockers[n] || 0) + 1; }
    }
    ray.far = Infinity;
    const frac = seen / Math.max(1, meshes.length);
    return { ok: on && frac >= .5, onScreen: on, unhidden: frac >= .5, seen: frac, blocker: Object.entries(blockers).sort((a, b) => b[1] - a[1])[0]?.[0] || null, screen: [(sp.x + 1) / 2, (1 - sp.y) / 2] };
  }
  function isTag(o, pr) { for (; o; o = o.parent) if (o === pr.tag) return true; return false; }
  function blockerName(o) { while (o && !o.userData.name) o = o.parent; return o?.userData.name || 'the page'; }
  for (const c of chapters) for (const side of ['L', 'R']) for (const it of c.halves[side]) it.carrier.userData.name = it.name;
  function screenRects(ci) {   // projected screen rectangle (px) of every piece of chapter ci, at the current frame
    const r = canvas.getBoundingClientRect(), out = [], v = new T.Vector3();
    for (const side of ['L', 'R']) for (const it of chapters[ci].halves[side]) {
      if (!it.carrier.visible || (it.stand ?? 0) < .9) continue;
      const b = it.box; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) {
        v.set(cx, cy, cz); it.content.localToWorld(v); v.project(camera);
        const px = r.left + (v.x + 1) / 2 * r.width, py = r.top + (1 - v.y) / 2 * r.height; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      out.push({ name: it.name || 'piece', x: it.x, z: it.z, rect: [x0, y0, x1, y1] });
    }
    return out;
  }
  const api = { screenRects, propCheck, renderAt, DURATION, ready, audit, state: st, goTo, openTask, answer, chapters, scene, camera, renderer, book, project };
  window.quest = api; window.renderAt = renderAt; window.DURATION = DURATION; window.ready = ready;
  return api;
}

// ── fallbacks and textures ─────────────────────────────────────────────────────────────────────────────────
function printedEdition(el, book) {
  el.classList.add('pq-printed');
  el.innerHTML = `<div class="pq-print-label">PRINTED EDITION · 3D GRAPHICS UNAVAILABLE</div>` + book.chapters.map((c, i) =>
    `<article class="pq-print-page"><div class="pq-eyebrow">CHAPTER ${String(i + 1).padStart(2, '0')} · ${c.feature || ''}</div><h2>${(c.title || []).join(' ')}</h2><p><i>${c.region || ''}</i></p><p>${c.story || ''}</p><p><b>${c.lesson || ''}</b></p></article>`).join('');
  return { printed: true };
}
function clothTexture(base) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) { x.fillStyle = 'rgba(255,255,230,.045)'; x.fillRect(i, 0, 2, 256); x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(0, i, 256, 2); }
  let s = 7; const r = () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296);
  for (let i = 0; i < 1600; i++) { x.fillStyle = i % 2 ? 'rgba(255,250,210,.06)' : 'rgba(0,10,8,.08)'; x.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(26, 26); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
function pageEdgeTexture() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f2e7cc'; x.fillRect(0, 0, 8, 128); for (let i = 0; i < 128; i += 3) { x.fillStyle = `rgba(120,95,60,${.12 + (i * 7 % 5) * .03})`; x.fillRect(0, i, 8, 1); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 1); t.colorSpace = T.SRGBColorSpace; return t;
}
