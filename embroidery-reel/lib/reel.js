// embroidery-reel · reel.js — the engine. reel(config) builds a sewing table in three.js and plays one film on it:
// a needle stitches each item's patch and its title into the linen, a paper tag drops beside them, the camera glides to
// the next item; at the end the camera rises, a gold cord is couched through every item, and it lands on the end card.
// Everything is a pure function of t (seek(t)); the page contract is at the bottom.
import * as THREE from 'three';
import { embroider, FONT, rng, rgb, css, shade, contrast } from './stitch.js';
import * as PR from './props.js';

const FONT_FILES = [['EmbTitle', 'ArchivoBlack-400.woff2'], ['EmbTitleKR', 'BlackHanSans-ksx1001.woff2'], ['EmbSans', 'Inter-500.woff2'], ['EmbBold', 'Inter-700.woff2'],
  ['EmbSansKR', 'NotoSansKR-500.woff2'], ['EmbMono', 'JetBrainsMono.woff2', '100 800'], ['EmbSerif', 'SourceSerif4-Variable.woff2', '200 900'], ['EmbItalic', 'SourceSerif4-Italic-Variable.woff2', '200 900']];
async function loadFonts() {
  await Promise.all(FONT_FILES.map(async ([fam, file, weight]) => {
    const f = new FontFace(fam, `url(${new URL('./fonts/' + file, import.meta.url).href})`, weight ? { weight } : {});
    await f.load(); document.fonts.add(f);
  }));
}

const DEF = {
  title: 'embroidery reel', size: [1080, 1350], fps: 30, seed: 7,
  cloth: '#cfbe9c', thread: '#202748', paper: '#f5eedd', ink: '#2a2622', accent: '#b5332b', cord: '#e2bd45', bg: '#2a1d12',
  beat: 2.2, stitch: 1.2, travel: .7, intro: .9, punch: 4.5,
  camera: { fov: 30, elev: 52, swing: 11, roll: 2.2, margin: 1.22 },
  look: { exposure: .92, warmth: .5, bokeh: 1, grain: .03, vignette: .38, leaves: 1, sun: [-.5, .78, .36], leafSeed: 11 },
  outro: null, props: {},
};
const merge = (a, b) => { const o = { ...a }; for (const k in b || {}) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? merge(a[k], b[k]) : b[k]; return o; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const smoother = u => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// world constants (1 unit = one patch width ≈ 5 cm)
const THREAD = .0065, STLEN = .034, SATIN = .07, TITLE_W = 1.3, TAG_W = .86, GAP = .1;

export async function reel(userCfg) {
  const cfg = merge(DEF, userCfg);
  const Q = new URLSearchParams(location.search), RENDER = Q.has('render'), SCALE = +(Q.get('scale') || 1), SS = +(Q.get('ss') || 1);
  const [W0, H0] = cfg.size, OW = Math.round(W0 * SCALE), OH = Math.round(H0 * SCALE), RW = Math.round(OW * SS), RH = Math.round(OH * SS), ASPECT = W0 / H0;
  await loadFonts();
  const R = rng(cfg.seed);

  // ── renderer ──
  const canvas = document.getElementById('film') || Object.assign(document.body.appendChild(document.createElement('canvas')), { id: 'film' });
  canvas.width = OW; canvas.height = OH;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(OW, OH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(cfg.bg); scene.fog = new THREE.Fog(cfg.bg, 26, 60);
  scene.environment = PR.studioEnv(renderer); scene.environmentIntensity = .45;
  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, ASPECT, .05, 200);

  // ── items → embroidered elements ──
  const items = cfg.items.map((it, i) => ({ ...it, i }));
  const elements = [];
  function element(design, worldW, kind, extra = {}) {
    const pxu = (extra.px || 1100) / design.w, worldPerDesign = worldW / design.w;
    const emb = embroider(design, { px: pxu, thread: THREAD / worldPerDesign, len: STLEN / worldPerDesign, satinMax: SATIN / worldPerDesign, guide: extra.guide });
    const worldH = worldW * design.h / design.w;
    const color = new THREE.CanvasTexture(emb.color); color.colorSpace = THREE.SRGBColorSpace; color.anisotropy = 8;
    const normal = new THREE.DataTexture(emb.normal, emb.W, emb.H, THREE.RGBAFormat); normal.generateMipmaps = true; normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter; normal.anisotropy = 8; normal.needsUpdate = true;
    const guide = new THREE.CanvasTexture(emb.guide); guide.colorSpace = THREE.SRGBColorSpace;
    const uP = { value: 0 }, geo = new THREE.PlaneGeometry(worldW, worldH);
    const mat = new THREE.MeshStandardMaterial({ map: color, normalMap: normal, normalScale: new THREE.Vector2(1.1, 1.1), roughness: .5, metalness: 0, alphaTest: .4 });
    mat.onBeforeCompile = sh => { sh.uniforms.uProgress = uP; sh.fragmentShader = 'uniform float uProgress;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n\tif (texture2D(normalMap, vNormalMapUv).a > uProgress + 0.002) discard;'); };
    const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true;
    const smat = new THREE.MeshBasicMaterial({ map: color, color: '#1c1208', transparent: true, opacity: kind === 'patch' ? .5 : .32, depthWrite: false });
    smat.onBeforeCompile = sh => { sh.uniforms.uProgress = uP; sh.uniforms.uOrder = { value: normal }; sh.fragmentShader = 'uniform float uProgress;\nuniform sampler2D uOrder;\n' + sh.fragmentShader.replace('#include <map_fragment>', 'float a_ = texture2D(map, vMapUv, 3.0).a; float o_ = texture2D(uOrder, vMapUv, 1.5).a;\n\tdiffuseColor.a *= a_ * (1.0 - smoothstep(uProgress, uProgress + 0.03, o_));'); };
    const shadow = new THREE.Mesh(geo, smat); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1;
    const gmat = new THREE.MeshStandardMaterial({ map: guide, transparent: true, depthWrite: false, roughness: 1, opacity: .75 });
    const gmesh = new THREE.Mesh(geo, gmat); gmesh.rotation.x = -Math.PI / 2; gmesh.renderOrder = 0; gmesh.receiveShadow = true;
    const e = { kind, design, emb, worldW, worldH, mesh, shadow, gmesh, uP, gmat, lift: extra.lift ?? (kind === 'patch' ? .014 : .004), s0: 0, s1: 0, ...extra };
    elements.push(e); return e;
  }
  const titleDesign = (text, color, fontKey = 'title') => {
    const mx = document.createElement('canvas').getContext('2d'); mx.font = `400 100px ${FONT[fontKey]}`;
    const m = mx.measureText(text), wpx = m.width, size = Math.min(17.5, 100 * 118 / Math.max(1, wpx));
    return { w: 130, h: 26, seed: 3, textW: wpx * size / 100, shapes: [{ text, at: [65, 13 + size * .36], size, font: fontKey, fill: color, angle: 76 }] };
  };

  // tag canvas (printed paper with a sewn dashed border)
  function tagCanvas(lines, w = TAG_W, o = {}) {
    const ppu = 1000, pad = 46, c = document.createElement('canvas'), x = c.getContext('2d'), cw = Math.round(w * ppu);
    const [desc = '', small = ''] = lines || [];
    const bodyPx = o.bodyPx || 64, smallPx = o.smallPx || 36;
    x.font = `700 ${bodyPx}px ${FONT.bold}`;
    const words = String(desc).split(/\s+/), out = []; let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (x.measureText(t).width > cw - pad * 2.4 && cur) { out.push(cur); cur = wd; } else cur = t; }
    if (cur) out.push(cur);
    const ch = Math.round(pad * 1.7 + out.length * bodyPx * 1.12 + (small ? smallPx * 2.1 : 0));
    c.width = cw; c.height = ch;
    const P = rgb(cfg.paper); x.fillStyle = css(P); x.fillRect(0, 0, cw, ch);
    const RR = rng(lines.join('').length + 5);
    for (let i = 0; i < 2600; i++) { x.fillStyle = css(shade(P, (RR() - .5) * .12), .35); x.fillRect(RR() * cw, RR() * ch, 1 + RR() * 2, 1); }
    const g = x.createLinearGradient(0, 0, cw, ch); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(120,90,50,.12)'); x.fillStyle = g; x.fillRect(0, 0, cw, ch);
    x.strokeStyle = css(rgb(cfg.accent), .85); x.lineWidth = 3.2; x.setLineDash([11, 8]); x.strokeRect(20, 20, cw - 40, ch - 40); x.setLineDash([]);
    x.fillStyle = cfg.ink; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = `700 ${bodyPx}px ${FONT.bold}`;
    out.forEach((l, k) => x.fillText(l, cw / 2, pad * .95 + bodyPx * (.86 + k * 1.12)));
    if (small) { x.font = `700 ${smallPx}px ${FONT.mono}`; x.fillStyle = css(shade(rgb(cfg.accent), -.15)); x.fillText(small, cw / 2, ch - pad * .95); }
    return { c, h: ch / ppu, bodyPx, lines: out.length, texH: ch };
  }
  function paperMesh(cv, w, h, curl = .008) {
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const geo = new THREE.PlaneGeometry(w, h, 10, 6), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2); p.setZ(i, curl * (u * u * .6 + v * v * .3 + Math.max(0, u * v) * .8)); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: .88 })); m.rotation.x = -Math.PI / 2; m.castShadow = true; m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m); return g;
  }

  // ── layout: a serpentine grid sized to the frame; the last slot is the end card ──
  const n = items.length, slots = n + (cfg.outro ? 1 : 0);
  const DX = 2.35, DZ = 3.25;
  const cols = clamp(Math.round(Math.sqrt(slots * ASPECT * DZ / DX)), 2, 7), rows = Math.ceil(slots / cols);
  const slotPos = k => { const r = Math.floor(k / cols), c0 = k % cols, c = r % 2 ? cols - 1 - c0 : c0; return { r, c, x: (c - (cols - 1) / 2) * DX, z: (r - (rows - 1) / 2) * DZ }; };
  const table = new THREE.Group(); scene.add(table);
  for (const it of items) {
    const s = slotPos(it.i);
    it.slot = s; it.pos = V(s.x + (R() - .5) * .22, 0, s.z + (R() - .5) * .16); it.yaw = (R() - .5) * .14;
    const pd = it.patch || { w: 100, h: 80, shapes: [{ rect: [4, 4, 92, 72], r: 10, fill: '#3a4a7a', outline: '#f1e6cf' }, { text: String(it.title || '?')[0], at: [50, 56], size: 46, fill: '#f1e6cf' }] };
    const pw = (it.patch && it.patch.scale) || 1;
    it.patchEl = element(pd, pw, 'patch', { item: it.i, px: 1100 });
    it.titleEl = element(titleDesign(it.title, it.threadColor || cfg.thread), TITLE_W, 'title', { item: it.i, px: 1500 });
    it.tag = tagCanvas(it.lines || [], it.tagWidth || TAG_W);
    it.tagMesh = paperMesh(it.tag.c, it.tagWidth || TAG_W, it.tag.h);
    // stack: patch, title, tag (or tag on top) along local z, centred
    const order = it.tagAt === 'above' ? ['tag', 'patch', 'title'] : ['patch', 'title', 'tag'];
    const hOf = k => k === 'patch' ? it.patchEl.worldH : k === 'title' ? .2 : it.tag.h;
    const gapOf = (a, b) => (a === 'patch' && b === 'title') || (a === 'title' && b === 'patch') ? .02 : GAP;
    let total = 0; order.forEach((k, j) => { total += hOf(k) + (j ? gapOf(order[j - 1], k) : 0); });
    let z = -total / 2; const local = {};
    order.forEach((k, j) => { if (j) z += gapOf(order[j - 1], k); local[k] = z + hOf(k) / 2; z += hOf(k); });
    const titleZ = local.title - .2 / 2 + it.titleEl.worldH / 2 - .02;
    const grp = new THREE.Group(); grp.position.copy(it.pos); grp.rotation.y = it.yaw; table.add(grp);
    const put = (e, lz) => { e.mesh.position.set(0, e.lift, lz); e.gmesh.position.set(0, .0012, lz); e.shadow.position.set(0, .0022, lz); grp.add(e.gmesh, e.shadow, e.mesh); };
    put(it.patchEl, local.patch); put(it.titleEl, titleZ);
    it.tagHome = V(0, .003, local.tag); it.tagMesh.position.copy(it.tagHome); it.tagMesh.rotation.y = (R() - .5) * .1; it.tagYaw = it.tagMesh.rotation.y; grp.add(it.tagMesh);
    it.group = grp; it.stackH = total; it.stackW = Math.max(pw, TITLE_W * .9, it.tagWidth || TAG_W);
  }
  // end card
  let card = null;
  if (cfg.outro) {
    const o = cfg.outro, s = slotPos(n), cw = 2.05, ch = 2.62, ppu = 520, c = document.createElement('canvas'); c.width = Math.round(cw * ppu); c.height = Math.round(ch * ppu);
    const x = c.getContext('2d'), P = rgb(cfg.paper), Rr = rng(99);
    x.fillStyle = css(P); x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 9000; i++) { x.fillStyle = css(shade(P, (Rr() - .5) * .1), .3); x.fillRect(Rr() * c.width, Rr() * c.height, 1 + Rr() * 2, 1); }
    x.strokeStyle = css(rgb(cfg.accent), .8); x.lineWidth = 3; x.setLineDash([12, 9]); x.strokeRect(22, 22, c.width - 44, c.height - 44); x.setLineDash([]);
    x.textAlign = 'center'; x.fillStyle = cfg.ink;
    let tSize = 118; x.font = `500 ${tSize}px ${FONT.serif}`; while (x.measureText(o.title || '').width > c.width * .84) { tSize -= 4; x.font = `500 ${tSize}px ${FONT.serif}`; }
    x.fillText(o.title || '', c.width / 2, 190);
    x.font = `italic 400 66px ${FONT.italic}`; x.fillStyle = cfg.accent; x.fillText(o.sub || '', c.width / 2, 290);
    const list = o.list === false ? [] : (o.list || items.map(it => it.title)), two = list.length > 7, half = two ? Math.ceil(list.length / 2) : list.length;
    const top = 400, bottom = c.height - (o.footer ? 170 : 90), lp = Math.min(62, (bottom - top) / Math.max(1, half) / 1.62), y0 = top + Math.max(0, (bottom - top - half * lp * 1.62) / 2) + lp;
    x.textAlign = 'left';
    const colW = two ? c.width * .38 : c.width * .62, names = list.map(String);
    x.font = `700 ${lp}px ${FONT.bold}`; const widest = Math.min(colW, Math.max(...names.map(nm => x.measureText(nm).width), 1));
    list.forEach((name, k) => {
      const col = two && k >= half ? 1 : 0, row = col ? k - half : k, lx = two ? (col ? c.width * .53 : c.width * .1) : (c.width - widest - lp * 1.2) / 2, ly = y0 + row * lp * 1.62;
      x.font = `700 ${lp * .6}px ${FONT.mono}`; x.fillStyle = cfg.accent; x.fillText(String(k + 1).padStart(2, '0'), lx, ly);
      x.font = `700 ${lp}px ${FONT.bold}`; x.fillStyle = cfg.ink; let nm = names[k]; while (x.measureText(nm).width > colW && nm.length > 3) nm = nm.slice(0, -2) + '…'; x.fillText(nm, lx + lp * 1.2, ly);
    });
    if (o.footer) { x.textAlign = 'center'; x.font = `500 30px ${FONT.sans}`; x.fillStyle = '#6b6258'; x.fillText(o.footer, c.width / 2, c.height - 70); }
    const mesh = paperMesh(c, cw, ch, .012), grp = new THREE.Group(); grp.position.set(s.x, 0, s.z); grp.add(mesh); mesh.position.y = .003; table.add(grp);
    const ul = { w: 120, h: 14, seed: 5, shapes: [{ line: Array.from({ length: 40 }, (_, k) => [6 + k * 108 / 39, 7 + Math.sin(k / 39 * Math.PI * 4) * 3.2]), width: 2.4, fill: o.thread || cfg.cord }] };
    const ue = element(ul, 1.25, 'line', { px: 1200, lift: .016 });
    const uz = -ch / 2 + 348 / ppu;
    ue.mesh.position.set(0, .016, uz); ue.shadow.position.set(0, .0065, uz); ue.gmesh.position.set(0, .0062, uz); ue.gmat.opacity = .0;
    grp.add(ue.gmesh, ue.shadow, ue.mesh);
    card = { grp, mesh, w: cw, h: ch, pos: grp.position.clone(), ul: ue, ppu, listPx: lp };
  }

  // ── layout bounds, cord path, props ──
  const lb = new THREE.Box3(); for (const it of items) lb.expandByPoint(it.pos.clone().add(V(-1.1, 0, -it.stackH / 2 - .1))).expandByPoint(it.pos.clone().add(V(1.1, 0, it.stackH / 2 + .1)));
  if (card) lb.expandByPoint(card.pos.clone().add(V(-card.w / 2, 0, -card.h / 2))).expandByPoint(card.pos.clone().add(V(card.w / 2, 0, card.h / 2)));
  const center = lb.getCenter(V()), lsize = lb.getSize(V());
  // cord: along the gap above each row, down the outer margin at each turn, into the card
  const cordPts = [];
  for (let r = 0; r < rows; r++) {
    const inRow = []; for (let k = 0; k < slots; k++) if (slotPos(k).r === r) inRow.push(k);
    const dir = r % 2 ? -1 : 1, zg = (r - (rows - 1) / 2) * DZ - DZ / 2 + .02, x0 = slotPos(inRow[0]).x - dir * DX * .55, x1 = slotPos(inRow[inRow.length - 1]).x + (r === rows - 1 ? 0 : dir * DX * .55);
    const steps = Math.max(8, Math.round(Math.abs(x1 - x0) / .25));
    for (let s = 0; s <= steps; s++) { const xx = x0 + (x1 - x0) * s / steps; cordPts.push(V(xx, .009, zg + Math.sin(xx * 2.1 + r) * .11)); }
    if (r === rows - 1 && card) { cordPts.push(V(card.pos.x, .009, zg + .25), V(card.pos.x, .009, card.pos.z - card.h / 2 - .05)); }
  }
  const cordCurve = new THREE.CatmullRomCurve3(cordPts, false, 'centripetal', .5);
  const cordSeg = Math.max(400, cordPts.length * 12), cordRad = 8;
  const cordTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#777'; x.fillRect(0, 0, 64, 32); for (let i = -2; i < 6; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 16, 32); g.addColorStop(0, '#222'); g.addColorStop(.5, '#fff'); g.addColorStop(1, '#222'); x.fillStyle = g; x.beginPath(); x.moveTo(i * 16, 32); x.lineTo(i * 16 + 10, 0); x.lineTo(i * 16 + 20, 0); x.lineTo(i * 16 + 10, 32); x.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  cordTex.repeat.set(cordCurve.getLength() / .07, 1);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, cordSeg, .022, cordRad, false), new THREE.MeshStandardMaterial({ color: cfg.cord, roughness: .38, metalness: .35, bumpMap: cordTex, bumpScale: 2 }));
  cord.castShadow = true; cord.receiveShadow = true; cord.geometry.setDrawRange(0, 0); scene.add(cord);

  const blocked = (x, z, r) => {
    for (const it of items) { const dx = x - it.pos.x, dz = z - it.pos.z; if (Math.abs(dx) < it.stackW / 2 + r + .18 && Math.abs(dz) < it.stackH / 2 + r + .15) return true; }
    if (card && Math.abs(x - card.pos.x) < card.w / 2 + r + .2 && Math.abs(z - card.pos.z) < card.h / 2 + r + .2) return true;
    for (let k = 0; k < cordPts.length; k++) if (Math.hypot(x - cordPts[k].x, z - cordPts[k].z) < r + .1) return true;
    return false;
  };
  const RP = rng(cfg.props.seed || cfg.seed * 3 + 1), placed = [], propCount = cfg.props.count ?? Math.round(n * 1.6 + 4);
  const threadColors = cfg.props.threads || [...new Set(items.flatMap(it => (it.patchEl.emb.palette || [])))].slice(0, 10).concat(['#c0392b', '#2d6cdf', '#e2a72e', '#2f9e6a']);
  const kinds = cfg.props.kinds || ['spool', 'spool', 'spool', 'spool', 'button', 'button', 'thimble', 'pincushion', 'scissors', 'spoolLying'];
  for (let tries = 0; placed.length < propCount && tries < propCount * 60; tries++) {
    const kind = kinds[Math.floor(RP() * kinds.length)];
    const obj = kind === 'spool' ? PR.spool(threadColors[Math.floor(RP() * threadColors.length)], placed.length + 1)
      : kind === 'spoolLying' ? PR.spool(threadColors[Math.floor(RP() * threadColors.length)], placed.length + 1, true)
      : kind === 'button' ? PR.button(['#e07a2f', '#2f6fdf', '#f2efe6', '#c23b3b', '#3a3a3a'][Math.floor(RP() * 5)], placed.length)
      : kind === 'thimble' ? PR.thimble(placed.length) : kind === 'pincushion' ? PR.pincushion('#b3202a', placed.length) : PR.scissors(placed.length);
    // most props sit just beside an item (so they are in its shots), some anywhere on the cloth
    const r = obj.userData.r, near = RP() < .75, it = items[Math.floor(RP() * n)], side = RP() < .5 ? -1 : 1;
    const x = near ? it.pos.x + side * (it.stackW / 2 + r + .12 + RP() * .7) : center.x + (RP() - .5) * (lsize.x + 3.2);
    const z = near ? it.pos.z + (RP() - .5) * it.stackH * 1.15 : center.z + (RP() - .5) * (lsize.z + 3.2);
    if (blocked(x, z, r) || placed.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r + .12)) continue;
    obj.position.set(x, 0, z); obj.rotation.y = RP() * Math.PI * 2; scene.add(obj); placed.push({ x, z, r, kind });
  }

  // ── cloth: linen over the whole table, soft folds only outside the layout ──
  const lin = PR.linen(cfg.cloth, cfg.seed);
  const CS = 64, cgeo = new THREE.PlaneGeometry(CS, CS, 200, 200), cp = cgeo.attributes.position, colors = new Float32Array(cp.count * 3);
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i) + center.x, z = -cp.getY(i) + center.z;
    const ox = Math.max(0, Math.abs(x - center.x) - lsize.x / 2 - 1.2), oz = Math.max(0, Math.abs(z - center.z) - lsize.z / 2 - 1.2), out = smooth(Math.hypot(ox, oz) / 3);
    cp.setZ(i, out * (Math.sin(x * .9 + Math.sin(z * .5) * 2) * .12 + Math.sin(z * 1.3 + x * .3) * .07));
    const m = 1 + (Math.sin(x * .37 + z * .21) * .5 + Math.sin(x * 1.1 - z * .7 + 1.7) * .3 + Math.sin(z * 2.3 + x * .2) * .2) * .045;
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = m;
  }
  cgeo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); cgeo.computeVertexNormals();
  lin.map.repeat.set(CS / .9, CS / .9); lin.normal.repeat.set(CS / .9, CS / .9);
  const cloth = new THREE.Mesh(cgeo, new THREE.MeshStandardMaterial({ map: lin.map, normalMap: lin.normal, normalScale: new THREE.Vector2(.7, .7), roughness: .92, vertexColors: true }));
  cloth.rotation.x = -Math.PI / 2; cloth.position.set(center.x, 0, center.z); cloth.receiveShadow = true; scene.add(cloth);

  // ── light: a low sun through leaves (spot with a gobo map), sky fill, warm bounce ──
  const L = cfg.look, sunDir = V(...L.sun).normalize(), span = Math.max(lsize.x, lsize.z) + 8, sunDist = 60;
  const sun = new THREE.SpotLight('#ffe3bd', 2.0 * Math.PI, 0, Math.atan(span / 2 / sunDist) * 1.15, .25, 0);
  sun.position.copy(center).addScaledVector(sunDir, sunDist); sun.target.position.copy(center); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.camera.near = sunDist - 12; sun.shadow.camera.far = sunDist + 12; sun.shadow.bias = -.00012; sun.shadow.normalBias = .004;
  if (L.leaves) sun.map = PR.leaves(L.leafSeed, 2048, L.leaves, span * 1.15 / (L.leafScale || 5));
  const sunHome = sun.position.clone(), sunAim = sun.target.position.clone(), sunU = V(-sunDir.z, 0, sunDir.x).normalize();
  scene.add(new THREE.HemisphereLight('#fff1dc', '#7c5f40', .4));
  const bounce = new THREE.DirectionalLight('#ffd6a8', .35); bounce.position.set(-sunDir.x, .3, -sunDir.z); scene.add(bounce);
  const sunXZ = V(sunDir.x, 0, sunDir.z).normalize(), sunTan = Math.max(.25, sunDir.y / Math.hypot(sunDir.x, sunDir.z));
  for (const e of elements) { const off = sunXZ.clone().multiplyScalar(-(e.lift + .006) / sunTan); const inv = e.shadow.parent ? e.shadow.parent.rotation.y : 0; off.applyAxisAngle(V(0, 1, 0), -inv); e.shadow.position.x += off.x; e.shadow.position.z += off.z; }

  // ── needle + thread ──
  const needle = PR.needle(); scene.add(needle);
  const threadMat = new THREE.MeshStandardMaterial({ color: '#333', roughness: .6 });
  const thread = new THREE.Mesh(new THREE.BufferGeometry(), threadMat); thread.castShadow = true; scene.add(thread);

  // ── timeline ──
  const T = { beat: cfg.beat, st: cfg.stitch, tr: cfg.travel, intro: cfg.intro };
  items.forEach(it => {
    it.A = T.intro + it.i * T.beat; it.S = it.A - .35; it.E = it.S + T.st;
    it.patchEl.s0 = it.S; it.patchEl.s1 = it.S + T.st * .7; it.titleEl.s0 = it.patchEl.s1; it.titleEl.s1 = it.E;
    it.D = it.E - .15; it.Dl = it.D + .32; it.leave = it.A + T.beat - T.tr;
  });
  const O = cfg.outro ? { rise: clamp(1.2 + rows * .25, 1.5, 2.6), cord: clamp(1.6 + n * .14, 2.2, 4), land: 1.5, hold: 2.8, ...cfg.outro } : null;
  const tEnd = items.length ? items[n - 1].leave : 0;
  let DURATION;
  if (O) {
    O.t0 = tEnd; O.c0 = O.t0 + O.rise * .55; O.c1 = O.c0 + O.cord; O.drop = O.c1 - .35; O.l0 = O.c1 - .1; O.l1 = O.l0 + O.land;
    card.ul.s0 = O.l1 - .45; card.ul.s1 = card.ul.s0 + 1.0; DURATION = O.l1 + O.hold;
  } else DURATION = tEnd + 1.2;
  DURATION = Math.round(DURATION * cfg.fps) / cfg.fps;

  // ── camera keys ──
  const tan = Math.tan(cfg.camera.fov * Math.PI / 360), deg = Math.PI / 180;
  function pose(tgt, dist, elev, az, roll = 0, fov = cfg.camera.fov) {
    const e = elev * deg, a = az * deg; return { pos: V(tgt.x + Math.sin(a) * Math.cos(e) * dist, tgt.y + Math.sin(e) * dist, tgt.z + Math.cos(a) * Math.cos(e) * dist), tgt: tgt.clone(), roll, fov };
  }
  const fitDist = (w, h, elev) => Math.max(h * Math.sin(elev * deg) * cfg.camera.margin / (2 * tan), w * cfg.camera.margin / (2 * tan * ASPECT)) + .25;
  const keys = [];
  items.forEach(it => {
    const sgn = it.i % 2 ? 1 : -1, el = cfg.camera.elev + (R() - .5) * 8, az = sgn * cfg.camera.swing * (.6 + R() * .5) + it.yaw / deg * .5;
    const tgt = it.pos.clone().add(V(0, 0, 0)), d = fitDist(it.stackW, it.stackH, el);
    // the hold drifts a little in, and toward where the camera goes next, so the move grows out of the drift (no reversal)
    const nextT = it.i < n - 1 ? items[it.i + 1].pos : (cfg.outro ? center : it.pos), lead = nextT.clone().sub(it.pos).setY(0); if (lead.length() > 1e-6) lead.setLength(.07);
    const a = pose(tgt, d * 1.04, el, az, sgn * cfg.camera.roll), b = pose(tgt.clone().add(lead), d * .985, el + 1, az, sgn * cfg.camera.roll * .7);
    b.pos.add(lead.clone().multiplyScalar(1.4));
    if (it.i === 0) keys.push({ t: 0, ...pose(tgt.clone().add(V(-.25, 0, .5)), d * 1.35, el + 10, az - 8, 0), seg: 'move' });
    keys.push({ t: it.A, ...a, seg: 'hold' }, { t: it.leave, ...b, seg: 'move' });
  });
  let overview = null;
  if (O) {
    const el = 64, d = fitDist(lsize.x, lsize.z, el) * 1.02;
    overview = { a: pose(center, d, el, -7, 0), b: pose(center, d * .97, el + 2, 5, 0) };
    const cd = fitDist(card.w * 1.04, card.h * 1.04, 76) * .96;
    keys.push({ t: O.t0 + O.rise, ...overview.a, seg: 'hold' }, { t: O.l0, ...overview.b, seg: 'move' });
    keys.push({ t: O.l1, ...pose(card.pos.clone(), cd, 76, 0, 0), seg: 'hold' }, { t: DURATION, ...pose(card.pos.clone().add(V(0, 0, -.02)), cd * .975, 77, 1.5, 0), seg: 'end' });
  } else keys.push({ t: DURATION, ...keys[keys.length - 1], seg: 'end' });
  // tangents: hold segments are linear drift; a move uses the neighbouring drift as its end tangents (C1 everywhere)
  const vel = (k, f) => { const a = keys[k], b = keys[k + 1]; if (!b) return V(); return b[f].clone().sub(a[f]).divideScalar(Math.max(1e-6, b.t - a.t)); };
  function keyTan(k, f) {
    const prevHold = k > 0 && keys[k - 1].seg === 'hold', nextHold = keys[k].seg === 'hold';
    if (nextHold) return vel(k, f); if (prevHold) return vel(k - 1, f); return V();
  }
  // quintic Hermite: position and velocity match the neighbours, acceleration is zero at both ends (C2 into a linear drift)
  const hermite = (p0, p1, m0, m1, u, dt) => { const u3 = u * u * u, u4 = u3 * u, u5 = u4 * u; return p0.clone().multiplyScalar(1 - 10 * u3 + 15 * u4 - 6 * u5).addScaledVector(m0, (u - 6 * u3 + 8 * u4 - 3 * u5) * dt).addScaledVector(m1, (-4 * u3 + 7 * u4 - 3 * u5) * dt).addScaledVector(p1, 10 * u3 - 15 * u4 + 6 * u5); };
  function camAt(t) {
    t = clamp(t, 0, DURATION); let k = 0; while (k < keys.length - 2 && t >= keys[k + 1].t) k++;
    const a = keys[k], b = keys[k + 1], dt = b.t - a.t, u = clamp((t - a.t) / dt);
    let pos, tgt; const roll = a.roll + (b.roll - a.roll) * (a.seg === 'hold' ? u : smoother(u)), fov = a.fov + (b.fov - a.fov) * (a.seg === 'hold' ? u : smoother(u));
    if (a.seg === 'hold') { pos = a.pos.clone().lerp(b.pos, u); tgt = a.tgt.clone().lerp(b.tgt, u); }
    else {
      pos = hermite(a.pos, b.pos, keyTan(k, 'pos'), keyTan(k + 1, 'pos'), u, dt); tgt = hermite(a.tgt, b.tgt, keyTan(k, 'tgt'), keyTan(k + 1, 'tgt'), u, dt);
      const lift = Math.min(.9, a.pos.distanceTo(b.pos) * .12); pos.y += lift * Math.sin(Math.PI * u) ** 4;
    }
    return { pos, tgt, roll, fov };
  }

  // ── needle ──
  const elFront = (e, p) => { const f = e.emb.front, s = clamp(p) * 256, i = Math.floor(s), k = s - i, j = Math.min(256, i + 1); return [f[i * 2] + (f[j * 2] - f[i * 2]) * k, f[i * 2 + 1] + (f[j * 2 + 1] - f[i * 2 + 1]) * k]; };
  const uvWorld = (e, u, v) => { e.mesh.updateWorldMatrix(true, false); return V((u - .5) * e.worldW, (v - .5) * e.worldH, 0).applyMatrix4(e.mesh.matrixWorld); };
  const elColor = (e, p) => e.emb.palette[e.emb.colAt[Math.round(clamp(p) * 256)]] || '#333';
  const progress = (e, t) => { const u = clamp((t - e.s0) / Math.max(1e-6, e.s1 - e.s0)); return u <= 0 ? 0 : u >= 1 ? 1 : (u + smooth(u)) / 2; };
  const RATE = cfg.punch, SPANS = [];
  for (const it of items) SPANS.push(it.patchEl, it.titleEl); if (card) SPANS.push(card.ul);
  for (const e of SPANS) e.rate = Math.max(1, Math.round((e.s1 - e.s0) * RATE)) / (e.s1 - e.s0); // whole punches per element
  function contactAt(e, tk) { const p = progress(e, tk), [u, v] = elFront(e, p); const w = uvWorld(e, u, v); w.y = 0; return w; }
  function hoverBefore(e) { const c = contactAt(e, e.s0 + .2 / e.rate); return V(c.x + .12, .3, c.z + .08); }
  // one punch cycle: travel (0–.45) with the anticipation rise (.3–.45), plunge (.45–.6), planted under the cloth
  // (.6–.75), pull out (.75–1). y(0) = y(1), so cycles and contiguous elements join without a step.
  const punchY = f => f < .3 ? .02 + .12 * smooth(f / .3) : f < .45 ? .14 + .015 * Math.sin((f - .3) / .15 * Math.PI * .5) : f < .6 ? .155 - .19 * ((f - .45) / .15) ** 2 : f < .75 ? -.035 : -.035 + .055 * (1 - (1 - (f - .75) / .25) ** 2);
  // the needle's track: segments (stitching an element, riding the cord) joined by gaps (rise, idle, travel)
  const segs = SPANS.map(e => ({ s0: e.s0, s1: e.s1, e }));
  if (O) segs.push({ s0: O.c0, s1: O.c1, cord: true });
  segs.sort((a, b) => a.s0 - b.s0);
  segs.forEach((g, i) => { g.prev = segs[i - 1] || null; g.contig = !!g.prev && !g.prev.cord && !g.cord && Math.abs(g.prev.s1 - g.s0) < 1e-6; });
  // where each punch goes in: toward the stitch front, but never more than HOP from the last one (on a wide title the
  // stitches may run a little ahead of the needle; the needle never jumps)
  const HOP = .2;
  function contactsOf(g) {
    if (g.C) return g.C;
    const e = g.e, r = e.rate, nC = Math.round((e.s1 - e.s0) * r), C = [];
    let p = g.contig ? (() => { const pc = contactsOf(g.prev); return pc[pc.length - 1].clone(); })() : (() => { const h = hoverBefore(e); return V(h.x, 0, h.z); })();
    if (!g.contig) p = contactAt(e, e.s0 + .6 / r);
    for (let k = 0; k < nC; k++) { const tg = contactAt(e, e.s0 + (k + .6) / r), d = tg.clone().sub(p); if (d.length() > HOP) d.setLength(HOP); p = p.clone().add(d); C.push(p); }
    return (g.C = C);
  }
  function segAt(g, t) {
    if (g.cord) {
      const p = clamp((t - O.c0) / O.cord), P = cordCurve.getPointAt(smooth(p));
      return { tip: V(P.x, .06 + .02 * Math.sin((t - O.c0) * 9), P.z), contact: V(P.x, .01, P.z), color: cfg.cord, planted: false, phase: -1 };
    }
    const e = g.e, r = e.rate, nC = Math.round((e.s1 - e.s0) * r);
    let k = Math.floor((t - e.s0) * r); if (k >= nC) k = nC - 1; if (k < 0) k = 0;
    const f = clamp((t - e.s0) * r - k), C = contactsOf(g), Pk = C[k], lift = e.lift || 0;
    let Pp, from = null;
    if (k > 0) Pp = C[k - 1];
    else if (g.contig) { const ps = segAt(g.prev, g.prev.s1); Pp = V(ps.tip.x, 0, ps.tip.z); from = ps.tip; }
    else Pp = hoverBefore(e);
    const xz = f < .45 ? Pp.clone().lerp(Pk, smooth(f / .45)) : Pk.clone();
    let y = punchY(f) + lift;
    if (k === 0 && from) y += (from.y - (.02 + lift)) * (1 - smooth(f / .3));
    if (k === 0 && !g.contig) y = .3 * (1 - smooth(f / .3)) + y * smooth(f / .3);
    const c = f < .45 ? (k > 0 || g.contig ? Pp : null) : Pk;
    return { tip: V(xz.x, y, xz.z), contact: c ? V(c.x, lift, c.z) : null, color: elColor(e, progress(e, t)), planted: f >= .5 && f < .75, phase: f, el: e };
  }
  function needleAt(t) {
    let a = null, b = null;
    for (const g of segs) { if (t >= g.s0 && t < g.s1) return segAt(g, t); if (g.s1 <= t) a = g; if (g.s0 > t && !b) b = g; }
    const t0 = a ? a.s1 : 0, t1 = b ? b.s0 : DURATION, to = b ? segAt(b, b.s0).tip : null;
    if (!a) { const start = to.clone().add(V(.35, .45, .3)), u = smoother(t / Math.max(1e-6, t1)); const tip = start.lerp(to, u); return { tip, contact: null, color: segAt(b, b.s0).color, planted: false, phase: -1 }; }
    const end = segAt(a, a.s1), from = end.tip, idle = from.clone().add(V(.42, .3, -.06)), color = end.color; // parked to the right of the work, not over it
    const rise = Math.min(.3, (t1 - t0) * .3), travelStart = b ? Math.max(t0 + rise, t1 - Math.max(.7, (t1 - t0) * .62)) : Infinity;
    const bob = tt => .018 * Math.sin(Math.max(0, tt - t0 - rise) * 2 * Math.PI * .7);
    let tip;
    if (t < t0 + rise) tip = from.clone().lerp(idle, smoother((t - t0) / rise));
    else if (t < travelStart) tip = idle.clone().add(V(0, bob(t), 0));
    else { const u = smooth((t - travelStart) / Math.max(1e-6, t1 - travelStart)), s = idle.clone().add(V(0, bob(travelStart), 0)); tip = s.clone().lerp(to, u); tip.y += Math.sin(Math.PI * u) ** 2 * Math.min(.25, s.distanceTo(to) * .06); }
    return { tip, contact: end.contact, color, planted: false, phase: -1 };
  }

  // ── post: half-res depth-of-field gather, then grade (ACES, warmth, vignette, grain) ──
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(RW, RH), samples: +(Q.get('msaa') ?? 4) });
  const rtHalf = new THREE.WebGLRenderTarget(Math.round(RW / 2), Math.round(RH / 2), { type: THREE.HalfFloatType });
  const fsGeo = new THREE.BufferGeometry(); fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const vs = 'varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }';
  const common = `uniform sampler2D tColor; uniform sampler2D tDepth; uniform float near, far, focus, range, aperture, maxCoc; uniform vec2 res; varying vec2 vUv;
    float linZ(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
    float coc(float z){ return clamp(aperture * max(0., abs(z - focus) - range) / z, 0., maxCoc); }`;
  const dofMat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, near: { value: .05 }, far: { value: 200 }, focus: { value: 3 }, range: { value: .6 }, aperture: { value: 30 }, maxCoc: { value: 14 }, res: { value: new THREE.Vector2(RW, RH) } },
    vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: common + `
      void main(){
        float zc = linZ(texture2D(tDepth, vUv).x), cc = coc(zc);
        vec3 acc = texture2D(tColor, vUv).rgb; float ws = 1., fg = 0.;
        for (int i = 0; i < 36; i++) {
          float r = sqrt((float(i) + .5) / 36.) * maxCoc, a = float(i) * 2.39996;
          vec2 o = vec2(cos(a), sin(a)) * r / res;
          float zs = linZ(texture2D(tDepth, vUv + o).x), cs = coc(zs);
          float ce = zs > zc ? min(cs, cc) : cs;
          float w = smoothstep(r - 1.5, r + 1.5, ce);
          acc += texture2D(tColor, vUv + o).rgb * w; ws += w;
          if (zs < zc - .05) fg = max(fg, w * smoothstep(1., 4., cs));
        }
        gl_FragColor = vec4(acc / ws, clamp(max(cc / 3., fg), 0., 1.));
      }` });
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: rt.texture }, tBlur: { value: rtHalf.texture }, exposure: { value: L.exposure }, warmth: { value: L.warmth }, vignette: { value: L.vignette }, grain: { value: L.grain }, seed: { value: 0 }, res: { value: new THREE.Vector2(OW, OH) } },
    vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D tColor, tBlur; uniform float exposure, warmth, vignette, grain, seed; uniform vec2 res; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
      vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
      void main(){
        vec4 b = texture2D(tBlur, vUv); vec3 s = texture2D(tColor, vUv).rgb;
        vec3 c = mix(s, b.rgb, smoothstep(0., 1., b.a));
        c *= exposure; c *= vec3(1. + warmth * .07, 1. + warmth * .015, 1. - warmth * .09);
        c = aces(c * .9);
        vec2 q = vUv - .5; c *= 1. - vignette * smoothstep(.25, .85, length(q * vec2(res.x / res.y, 1.) * 1.1));
        c = srgb(c);
        c += (h(vUv * res) - .5) * grain;
        gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
      }` });
  const fsScene = new THREE.Scene(), fsMesh = new THREE.Mesh(fsGeo, dofMat); fsMesh.frustumCulled = false; fsScene.add(fsMesh); const fsCam = new THREE.Camera();

  // ── one frame ──
  const tmp = V();
  function setThread(st) {
    const eye = needle.localToWorld(V(0, .87, 0)), up = needle.localToWorld(V(0, 1.6, 0)).sub(eye).normalize();
    const camR = V(1, 0, 0).applyQuaternion(camera.quaternion), tailA = eye.clone().addScaledVector(up, .35).addScaledVector(camR, .12), tailB = eye.clone().addScaledVector(up, 1.1).addScaledVector(camR, .45).add(V(0, .2, 0));
    const pts = []; if (st.contact) { const c = st.contact.clone(); c.y += .002; const mid = c.clone().lerp(eye, .5); mid.y -= Math.min(.08, c.distanceTo(eye) * .25); pts.push(c, mid); }
    pts.push(eye, tailA, tailB);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    thread.geometry.dispose(); thread.geometry = new THREE.TubeGeometry(curve, 64, .0055, 5, false); threadMat.color.set(st.color);
  }
  function apply(t) {
    // stitches
    for (const e of elements) { const p = progress(e, t); e.uP.value = p; e.gmat.opacity = (e.kind === 'line' ? 0 : .7) * (1 - smooth((p - .82) / .18)); }
    // tags drop
    for (const it of items) {
      const m = it.tagMesh; if (t < it.D) { m.visible = false; continue; } m.visible = true;
      const u = clamp((t - it.D) / (it.Dl - it.D)), v = clamp((t - it.Dl) / .22);
      const y = u < 1 ? .55 * (1 - u * u) : .012 * Math.sin(Math.PI * v) * (1 - v);
      m.position.set(it.tagHome.x + (1 - smooth(u)) * .06, it.tagHome.y + y, it.tagHome.z - (1 - smooth(u)) * .05);
      m.rotation.set((1 - smooth(u)) * .45 - (u >= 1 ? .03 * Math.sin(Math.PI * v) * (1 - v) : 0), it.tagYaw + (1 - smooth(u)) * .25, (1 - smooth(u)) * -.12);
    }
    if (card) {
      const u = clamp((t - O.drop) / .4), v = clamp((t - O.drop - .4) / .25); card.mesh.visible = t >= O.drop;
      card.mesh.position.y = .003 + (u < 1 ? .9 * (1 - u * u) : .015 * Math.sin(Math.PI * v) * (1 - v)); card.mesh.rotation.y = (1 - smooth(u)) * .3; card.mesh.rotation.x = (1 - smooth(u)) * .3;
      card.ul.mesh.visible = card.ul.shadow.visible = card.mesh.visible && u >= 1;
    }
    // cord
    if (O) { const p = clamp((t - O.c0) / O.cord); cord.geometry.setDrawRange(0, Math.floor(smooth(p) * cordSeg) * cordRad * 6); }
    // leaves sway (two periods, never repeating within a film)
    { const a = Math.sin(t * .53) * .045 + Math.sin(t * 1.21 + 1) * .02, b = Math.cos(t * .41) * .035 + Math.sin(t * 1.7) * .01; sun.target.position.copy(sunAim).addScaledVector(sunU, a).add(V(0, 0, b)); sun.position.copy(sunHome).addScaledVector(sunU, a * .4); sun.target.updateMatrixWorld(); }
    // camera
    const c = camAt(t); camera.position.copy(c.pos); camera.up.set(0, 1, 0); camera.lookAt(c.tgt); camera.rotateZ(c.roll * deg); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // needle
    const st = needleAt(t), lean = V(.34, 1, -.3).applyAxisAngle(V(0, 1, 0), Math.atan2(camera.position.x - c.tgt.x, camera.position.z - c.tgt.z)).normalize();
    needle.position.copy(st.tip); needle.quaternion.setFromUnitVectors(V(0, 1, 0), lean); needle.updateMatrixWorld();
    setThread(st);
    return { cam: c, needle: st };
  }
  let frame = 0;
  function renderAt(t) {
    const s = apply(t);
    const focus = s.cam.pos.distanceTo(s.cam.tgt);
    dofMat.uniforms.focus.value = focus; dofMat.uniforms.range.value = focus * .16; dofMat.uniforms.aperture.value = 30 * L.bokeh * (RW / 1080) * (3.4 / focus); dofMat.uniforms.maxCoc.value = Math.round(15 * (RW / 1080) / 2) * 2;
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    fsMesh.material = dofMat; dofMat.uniforms.res.value.set(RW / 2, RH / 2); renderer.setRenderTarget(rtHalf); renderer.render(fsScene, fsCam);
    fsMesh.material = outMat; outMat.uniforms.seed.value = (Math.round(t * cfg.fps) % 97) * .731; renderer.setRenderTarget(null); renderer.setViewport(0, 0, OW, OH); renderer.render(fsScene, fsCam);
    frame++; return s;
  }

  // ── measurement for check.mjs ──
  const project = p => { const v = p.clone().project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2, v.z]; };
  function boxOf(obj, w, h) { const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => obj.localToWorld(V(a * w / 2, b * h / 2, 0))); return pts.map(project); }
  function frameOf(i, t) {
    apply(t); scene.updateMatrixWorld(true);
    const it = items[i], pBox = boxOf(it.patchEl.mesh, it.patchEl.worldW, it.patchEl.worldH), tBox = boxOf(it.titleEl.mesh, it.titleEl.worldW, it.titleEl.worldH);
    const tm = it.tagMesh.children[0], gBox = boxOf(tm, it.tagWidth || TAG_W, it.tag.h);
    const bb = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
    const k = it.titleEl.worldW / it.titleEl.design.w, em = it.titleEl.design.shapes[0], capW = em.size * .72 * k;
    const tb = bb(boxOf(it.titleEl.mesh, it.titleEl.design.textW * k, capW * 1.3));
    const px = (obj, h) => { const a = project(obj.localToWorld(V(0, h / 2, 0))), b = project(obj.localToWorld(V(0, -h / 2, 0))); return Math.hypot((a[0] - b[0]) * OW, (a[1] - b[1]) * OH) / SCALE; };
    const tagCap = it.tag.bodyPx * .72 / 1000;
    void tBox;
    return { patch: bb(pBox), title: tb, tag: bb(gBox), patchW: (bb(pBox)[2] - bb(pBox)[0]), tagTextPx: px(tm, tagCap), titleCapPx: px(it.titleEl.mesh, capW) };
  }
  function cardFrame(t) { apply(t); scene.updateMatrixWorld(true); const b = boxOf(card.mesh.children[0], card.w, card.h), xs = b.map(p => p[0]), ys = b.map(p => p[1]); const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; return { box, listPx: (box[3] - box[1]) * OH / SCALE * card.listPx * .72 / (card.h * card.ppu) }; }
  const info = () => ({
    title: cfg.title, duration: DURATION, fps: cfg.fps, size: cfg.size, n, cols, rows,
    items: items.map(it => ({ title: it.title, A: it.A, S: it.S, E: it.E, leave: it.leave, D: it.D, Dl: it.Dl, stitches: it.patchEl.emb.N + it.titleEl.emb.N, palette: it.patchEl.emb.palette, layers: it.patchEl.emb.layers.length, thread: it.threadColor || cfg.thread })),
    outro: O ? { t0: O.t0, c0: O.c0, c1: O.c1, l1: O.l1, ul: [card.ul.s0, card.ul.s1] } : null,
    cloth: cfg.cloth, props: placed.map(p => p.kind), keys: keys.map(k => k.t), punch: RATE,
  });

  // ── page contract + live player ──
  window.DURATION = DURATION; window.FPS = cfg.fps; window.SIZE = cfg.size;
  window.seek = t => { renderAt(t); };
  window.filmInfo = info;
  window.__reel = { info, camAt: t => { const c = camAt(t); return { pos: c.pos.toArray(), tgt: c.tgt.toArray(), roll: c.roll }; }, needleAt: t => { const s = needleAt(t); return { tip: s.tip.toArray(), planted: s.planted, phase: s.phase, contact: s.contact ? s.contact.toArray() : null }; }, progress: t => elements.map(e => ({ kind: e.kind, item: e.item, p: progress(e, t), s0: e.s0, s1: e.s1, rate: e.rate })), frameOf, cardFrame, apply, renderAt, fontsOk: () => FONT_FILES.every(([f]) => document.fonts.check(`20px "${f}"`)) };
  const t0q = Q.get('t');
  renderAt(t0q != null ? +t0q : 0);
  window.__ready = true;
  if (!RENDER) {
    let playing = t0q == null, t = t0q != null ? +t0q : 0, last = performance.now();
    const hud = Q.has('debug') ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:8px;top:8px;color:#fff;font:12px monospace;background:#0008;padding:4px 6px' }) : null;
    const loop = now => { if (playing) { t += (now - last) / 1000; if (t > DURATION) t = 0; renderAt(t); } last = now; if (hud) hud.textContent = `${t.toFixed(2)} / ${DURATION.toFixed(2)} s`; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const toggle = () => { playing = !playing; };
    canvas.addEventListener('click', toggle);
    addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); toggle(); } if (e.key === 'ArrowRight') { t = Math.min(DURATION, t + 1); renderAt(t); } if (e.key === 'ArrowLeft') { t = Math.max(0, t - 1); renderAt(t); } });
  }
  return { info, renderAt };
}
