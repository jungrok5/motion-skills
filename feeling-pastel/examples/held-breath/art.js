// 「참았던 숨」 Held Breath — worked example. Read BRIEF.md first: every choice below comes from a feeling in it.
// Nothing from the story is drawn (no bus, phone, person, stairs, food, door). The feelings become weather and light:
// months of waiting → a low ceiling of cloud; the burst → one tear where gold pours through; can't hold it in →
// a murmuration lifting off the river; running in cold air → mist and frost; being cared for → far windows, low gold.
import { Drawing, R, tool, core } from 'fp/drawing.js';
const { ramp, mix, rng, fbm, clamp, smooth, catmull } = core;

export const meta = { title: '참았던 숨 · Held Breath', width: 1920, height: 1080 };

export function art() {
  const d = new Drawing({ seed: 2026, title: meta.title, paper: { color: '#e7ddcc', grain: 1.35, tooth: 1.05 } });
  const W = 1920, H = 1080, r = rng(11);

  // ---- the hand's 5 tools (BRIEF → Tools) ----
  const soft = tool('softPastel', { width: 16 });          // block-in, mist, the light itself
  const oil = tool('oilPastel', { width: 9 });              // cloud masses, snow, ice: waxy, light over dark
  const pencil = tool('colouredPencil', { width: 2.2 });    // the flock, reeds, far windows
  const conte = tool('conte', { width: 5 });                // darkest accents: tree line, reed stems
  const lift = tool('eraser', { width: 26, opacity: 0.35 }); // kneaded eraser: rays pulled out of the sky

  // ---- palette (90s cel-era dusk: slate violet, cobalt, rose, apricot, cream-gold) ----
  const T = [1250, 238];                                    // the tear in the cloud
  const skyR = ramp([[0, '#fff3d6'], [0.07, '#ffe2a0'], [0.16, '#f8b487'], [0.28, '#ea8f9c'], [0.42, '#a77fbf'], [0.6, '#6a64ad'], [0.8, '#434a8f'], [1, '#2c356f']]);
  const lightRamp = ramp(['#4b4f97', '#8b78b8', '#e795a2', '#f9c08e', '#fff0cf']);
  const farRamp = ramp(['#2f3570', '#4a4e93', '#7a6cab', '#b48fbe', '#e2b6c4']);
  const snowR = ramp(['#4e5aa0', '#7f84c4', '#b9a6d6', '#f0c5c6', '#fde8d6']);
  const dist = (x, y) => Math.hypot((x - T[0]) / 1.55, (y - T[1]) * 1.05) / 700; // elliptical falloff from the tear
  const skyAt = (x, y, rr) => skyR(clamp(dist(x, y) + (fbm(x * 0.004, y * 0.006, 3, 4) - 0.5) * 0.25 + (rr() - 0.5) * 0.06));

  // ---- the land's lines ----
  const farTop = (x) => 598 + (fbm(x * 0.006, 1, 3, 8) - 0.5) * 34 - smooth(1500, 1920, x) * 22;
  const waterTop = (x) => 650 + x * 0.006;
  const snowTop = (x) => 830 + Math.sin(x * 0.0042 + 0.6) * 34 + (fbm(x * 0.01, 3, 3, 9) - 0.5) * 30 - smooth(900, 0, x) * 70;
  const sky = R.above((x) => waterTop(x) + 6, 0, W);
  const bank = R.between(farTop, (x) => waterTop(x) + 4, 0, W);
  const river = R.between((x) => waterTop(x) - 2, (x) => snowTop(x) + 30, 0, W);
  const snow = R.below(snowTop, 0, W, H);

  // ---- the sky's shapes: a low ceiling (the waiting) torn open right of centre (the burst) ----
  // bankEdge: the underside of the ceiling; it lifts away round the tear
  const bankEdge = (x) => 300 + 140 * smooth(700, 0, x) - 230 * Math.exp(-(((x - T[0]) / 330) ** 2)) + 70 * smooth(1500, 1920, x) + (fbm(x * 0.008, 5, 3, 12) - 0.5) * 60;
  const bankR = R.above(bankEdge, 0, W);
  const lowTop = (x) => 470 + (fbm(x * 0.005, 7, 3, 13) - 0.5) * 40 - 40 * smooth(1300, 1900, x);

  // =========================================================== 1. block-in: the whole sheet, side of the stick
  d.stage('block-in');
  d.side(sky, { tool: soft, color: skyAt, angle: -18, spacing: 18, pressure: [0.6, 0.8] });
  d.side(bankR, { tool: soft, color: (x, y, rr) => mix(farRamp(clamp(0.15 + (rr() - 0.5) * 0.2)), skyAt(x, y, rr), 0.25 * clamp(1 - dist(x, y))), angle: -22, spacing: 18, pressure: [0.65, 0.85] });
  d.side(bank, { tool: soft, color: ['#3a3f80', '#4b4a8c', '#2f3a72'], angle: 0, spacing: 16, pressure: [0.6, 0.8] });
  d.side(river, { tool: soft, color: (x, y, rr) => mix(lightRamp(clamp(1 - Math.abs(x - T[0]) / 900 - (y - 650) / 600)), '#5a6aa8', 0.45), angle: 0, angleJitter: 4, spacing: 15, pressure: [0.6, 0.8] });
  d.side(snow, { tool: soft, color: (x, y, rr) => snowR(clamp(0.35 + (rr() - 0.5) * 0.3 + (x / W) * 0.25)), angle: -8, spacing: 18, pressure: [0.6, 0.8] });
  d.blend(sky, { angle: -18, spacing: 34, where: (x, y) => !bankR.inside(x, y) });

  // =========================================================== 2. sky and the ceiling of cloud
  d.stage('cloud ceiling');
  // the open sky: broken colour in its own gradient, strokes laid along the glow
  d.hatch(R.minus(sky, bankR), { tool: oil, color: skyAt, angleAt: (x, y) => -20 + (x - T[0]) * 0.01, angleJitter: 10, spacing: 10, length: [22, 46], width: [6, 10], pressure: [0.6, 0.9], zigzag: [1, 3] });
  // the ceiling's body: big, slow, dark strokes; a little warmer toward the tear
  d.hatch(bankR, { tool: oil, color: (x, y, rr) => mix(farRamp(clamp(0.08 + fbm(x * 0.003, y * 0.004, 3, 14) * 0.35 + (rr() - 0.5) * 0.1)), lightRamp(0.35), clamp(1.1 - dist(x, y) * 1.4) * 0.6), angle: -24, angleJitter: 9, spacing: 12, length: [30, 64], width: [8, 13], pressure: [0.65, 0.95], zigzag: [1, 4] });
  d.hatch(bankR, { tool: oil, color: (x, y, rr) => farRamp(clamp(0.1 + fbm(x * 0.004, y * 0.005, 3, 15) * 0.4 + (rr() - 0.5) * 0.1)), angle: -30, angleJitter: 9, spacing: 14, length: [24, 50], width: [7, 11], pressure: [0.75, 1], coverage: 0.55, where: (x, y) => dist(x, y) > 0.55 });
  // the underside of the ceiling: a row of heavy rolls, lit from below by the tear
  // clusters of rolls along the edge: each cluster is one body of cloud, lit as a whole from the opening
  let x = -60;
  const clusters = [];
  while (x < W + 60) {
    const lobes = [], n = 4 + Math.floor(r() * 4), near0 = clamp(1 - Math.abs(x - T[0]) / 700);
    for (let i = 0; i < n; i++) {
      const sz = 34 + r() * 40 + 34 * near0, e = bankEdge(x);
      lobes.push([x, e - sz * (0.3 + r() * 0.5), sz]);
      if (r() < 0.6) lobes.push([x + (r() - 0.5) * sz, e - sz * (1.1 + r() * 0.9), sz * (0.8 + r() * 0.5)]);
      x += sz * (0.7 + r() * 0.5);
    }
    clusters.push(lobes);
  }
  for (const lobes of clusters) {
    const cx = lobes.reduce((a, l) => a + l[0], 0) / lobes.length, cy = Math.max(...lobes.map((l) => l[1]));
    const lx = T[0] - cx, ly = T[1] + 160 - cy, ln = Math.hypot(lx, ly) || 1, near = clamp(1.15 - dist(cx, cy) * 1.25);
    d.form(lobes, {
      tool: oil, light: [lx / ln, ly / ln + 0.5, 0.3], spacing: 6.5, width: [5, 9], length: [12, 28], pressure: [0.7, 1], around: 0.35, lobe: 0.3, angle: -24, wrap: 0.05,
      shadeAt: (t, x, y, gy) => clamp(t * (0.3 + 0.8 * near) + Math.max(0, gy) * 0.3 * near),
      shade: (t) => mix(farRamp(t * 0.8), lightRamp(t), near),
    });
  }
  // a lower deck of small clouds near the horizon, in perspective, their bellies pink where the light reaches
  const deck = [];
  for (let row = 0; row < 6; row++) {
    const v = row / 5, y = 470 + v * 120, size = 54 * (1 - v * 0.6);
    for (let x = -40; x < W + 40; x += size * (1.5 + r() * 1.6)) { if (r() < 0.25) continue; deck.push([x + (r() - 0.5) * size, y + (r() - 0.5) * 12, size]); }
  }
  deck.sort((p, q) => p[1] - q[1]);
  for (const [cx, cy, sz] of deck) {
    const near = clamp(1.2 - dist(cx, cy) * 1.2);
    const lobes = []; const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) lobes.push([cx + (i - n / 2) * sz * 0.5, cy + (r() - 0.5) * sz * 0.12 - Math.sin((i / (n - 1 || 1)) * Math.PI) * sz * 0.18, sz * (0.32 + r() * 0.16)]);
    d.form(lobes, { tool: oil, light: [(T[0] - cx) / 900, -0.6, 0.4], spacing: 5, width: [3.5, 6], length: [sz * 0.25, sz * 0.5], pressure: [0.7, 1], around: 0.25, lobe: 0.2, floor: cy + sz * 0.12, angle: -6, angleJitter: 8, wrap: 0.2,
      shade: (t) => mix(farRamp(0.25 + t * 0.6), lightRamp(0.25 + t * 0.75), near) });
  }

  // =========================================================== 3. the light: the tear, its rim, the rays
  d.stage('light');
  // the brightest sky sits in an irregular opening, not a disc: a few overlapping soft shapes, heaviest pressure in the sheet
  const tear = R.poly([[T[0] - 260, T[1] + 60], [T[0] - 140, T[1] - 30], [T[0] - 10, T[1] - 70], [T[0] + 150, T[1] - 40], [T[0] + 280, T[1] + 20], [T[0] + 180, T[1] + 90], [T[0] + 20, T[1] + 110], [T[0] - 150, T[1] + 120]], { smooth: true });
  d.hatch(tear, { tool: oil, color: (x, y, rr) => skyR(clamp(dist(x, y) * 1.1 + (rr() - 0.5) * 0.05)), angle: -14, angleJitter: 8, spacing: 7, length: [18, 36], width: [7, 10], pressure: [0.85, 1.1], zigzag: [2, 4], feather: 18, rag: 0.7 });
  // wisps crossing the light: thin rose and lavender strokes, so the opening has depth
  for (let i = 0; i < 26; i++) {
    const y = T[1] - 60 + r() * 170, x = T[0] - 250 + r() * 480, L = 60 + r() * 160, a = (-8 + r() * 6) * Math.PI / 180;
    d.stroke([[x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2], [x, y + (r() - 0.5) * 6], [x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2]], { tool: oil, width: [3, 7], color: ['#e8a0aa', '#c995bd', '#f2b2a0', '#b88bbf'], pressure: [0.6, 0.85], smooth: true });
  }
  // rays: wedges fanning down from the tear to the river, pulled out with the eraser, then dusted with light
  const rays = [];
  for (let i = 0; i < 5; i++) {
    const a = (100 + i * 8 + (r() - 0.5) * 3) * Math.PI / 180, wdt = (2 + r() * 2) * Math.PI / 180, L = 560;
    const p = [T, [T[0] + Math.cos(a - wdt) * L, T[1] + Math.sin(a - wdt) * L], [T[0] + Math.cos(a + wdt) * L, T[1] + Math.sin(a + wdt) * L]];
    const ray = R.minus(R.poly(p), R.circle(T[0], T[1] + 30, 120));
    ray.angle = a * 180 / Math.PI;
    rays.push(ray);
  }
  for (const ray of rays) {
    d.hatch(ray, { tool: lift, angle: ray.angle, angleJitter: 1.5, spacing: 30, length: [120, 220], width: [26, 40], pressure: [0.3, 0.45], feather: 22, rag: 0.4, coverage: 0.9 });
    d.hatch(ray, { tool: soft, color: ['#ffe9c2', '#ffd9b0', '#fff1dc'], angle: ray.angle, angleJitter: 1.5, spacing: 28, length: [120, 220], width: [22, 36], pressure: [0.3, 0.42], feather: 22, rag: 0.5 });
  }

  for (const ray of rays) d.blend(ray, { angle: ray.angle, angleJitter: 1.5, spacing: 30, length: [120, 200], width: [24, 34], feather: 20 });

  // =========================================================== 4. far bank: tree line, roofs in snow, windows, steam
  d.stage('far bank');
  d.scumble(bank, { tool: conte, color: ['#232a5c', '#2d2f66', '#1f2a52', '#3a3474'], size: [3, 8], spacing: 6, pressure: [0.6, 0.9], width: [2.5, 4], clip: true, feather: 2, rag: 0.6 });
  d.hatch(bank, { tool: oil, color: ['#3c4a8c', '#5a4f96', '#2d3c78'], angle: -80, angleJitter: 12, spacing: 7, length: [8, 20], width: [3, 5], pressure: [0.55, 0.85], where: (x, y, rr) => rr() < 0.6 });
  // tops of the trees catch the light where the rays fall
  d.hatch(R.between(farTop, (x) => farTop(x) + 12, 0, W), { tool: oil, color: (x) => (Math.abs(x - 980) < 380 ? ['#f2a28f', '#ffc79a', '#d98aa6'][Math.floor(r() * 3)] : ['#8a76b6', '#a585bd'][Math.floor(r() * 2)]), angle: -75, spacing: 6, length: [5, 10], width: [2.5, 4], pressure: [0.6, 0.9], coverage: 0.7 });
  // the village: roofs low on the bank, snow on them, windows lit; no single house is "the" house
  const village = [];
  for (let x = 120; x < W - 80; x += 20 + r() * 34) {
    const dens = smooth(0, 1, 1 - Math.abs(x - 860) / 700) * 0.85 + (x > 1500 && x < 1760 ? 0.5 : 0);
    if (r() > dens) continue;
    village.push([x, waterTop(x) - 12 - r() * 30, 18 + r() * 22, 12 + r() * 10]);
  }
  village.sort((a, b) => a[1] - b[1]);
  for (const [x, y, w, h] of village) {
    const wall = R.rect(x, y, w, h);
    d.hatch(wall, { tool: oil, color: ['#3e3f7a', '#4a4683', '#544b88'], angle: 90, spacing: 3.5, length: [h * 0.6, h], width: [2.5, 3.5], pressure: [0.7, 0.9], angleJitter: 4, feather: 0.6, rag: 0.2 });
    const roof = R.poly([[x - 1.5, y + 1], [x + w * 0.5, y - h * 0.75], [x + w + 1.5, y + 1]]);
    d.hatch(roof, { tool: oil, color: ['#b9a2cf', '#c9a9c9', '#a993c6', '#d8b4c4'], angle: -15, spacing: 3, length: [w * 0.4, w * 0.8], width: [2.5, 3.5], pressure: [0.75, 1], feather: 0.5, rag: 0.2 });
    const nWin = 1 + Math.floor(r() * 3);
    for (let k = 0; k < nWin; k++) d.dabs([[x + 3 + r() * (w - 6), y + 3 + r() * (h - 6)]], { tool: oil, color: ['#ffd56e', '#ffc861', '#ffe39a'], length: [1.5, 3.5], width: [3, 4.2], pressure: 1.1, angle: 0, angleJitter: 5 });
  }
  // steam from chimneys, bending away in the cold wind
  for (let i = 0; i < 26; i++) {
    const [x, y] = village[Math.floor(r() * village.length)];
    const pts = []; let px = x + 4, py = y - 10;
    for (let k = 0; k < 14; k++) { pts.push([px, py]); px += 2 + k * 0.9 + (r() - 0.5) * 3; py -= 7 - k * 0.25; }
    d.stroke(catmull(pts, 3), { tool: soft, width: [5, 9], color: ['#d9c6dd', '#efd2d0', '#b9b2d8'], pressure: [0.35, 0.5], wobble: 2 });
  }

  // =========================================================== 5. the river: ice, one open channel of gold, mist
  d.stage('river');
  d.hatch(river, { tool: oil, color: (x, y, rr) => mix(['#6f7fc0', '#8e95cf', '#5967ab', '#a9a5d6'][Math.floor(rr() * 4)], '#3a4688', clamp((y - 660) / 280) * 0.5), angle: 0, angleJitter: 3, spacing: 5.5, length: [16, 46], width: [3.5, 6.5], pressure: [0.7, 0.95], curve: 0.02 });
  // open water where the rays land: reflections of the tear, broken by the current
  const chan = R.fn([600, 652, 1800, 900], (x, y) => { const c = 1230 - (y - 650) * 0.4, half = 150 + (y - 650) * 1.6 + (fbm(y * 0.03, x * 0.002, 2, 30) - 0.5) * 120; return Math.abs(x - c) < half && y > waterTop(x) + 2 && y < snowTop(x) + 10; });
  d.hatch(chan, { tool: oil, color: (x, y, rr) => lightRamp(clamp(1 - Math.abs(x - (1240 - (y - 650) * 0.5)) / 420 - (rr() - 0.5) * 0.3)), angle: 0, angleJitter: 2, spacing: 5, length: [10, 34], width: [2.5, 5], pressure: [0.7, 1], coverage: 0.85, feather: 16, rag: 0.8 });
  // the tear's reflection: a column of bright dashes under it
  for (let i = 0; i < 160; i++) {
    const y = 660 + Math.pow(r(), 1.4) * 200, sp = 30 + (y - 660) * 0.9, x = 1240 - (y - 650) * 0.45 + r() * 2 * sp - sp;
    const L = 8 + r() * 26;
    d.stroke([[x - L / 2, y], [x + L / 2, y + (r() - 0.5)]], { tool: oil, width: [2.5, 4.5], color: ['#fff3d8', '#ffe2a8', '#ffd2a0'], pressure: [0.85, 1.1], wobble: 0.4 });
  }
  // mist lying on the ice: side strokes, then a finger to soften
  const mist = R.between((x) => waterTop(x) - 14, (x) => waterTop(x) + 60, 0, W);
  d.side(mist, { tool: soft, color: ['#f3d6d2', '#e4cde0', '#ffe6cf'], angle: 0, angleJitter: 3, spacing: 26, width: [20, 34], length: [70, 160], pressure: [0.28, 0.4], feather: 12, rag: 0.6 });
  d.blend(mist, { angle: 0, angleJitter: 3, spacing: 40, feather: 14 });

  // =========================================================== 6. the flock: a ribbon of birds lifting from the river toward the light
  d.stage('flock');
  // the murmuration: one twisting body of birds inside the opening, dark against the gold (the feeling that will not stay down)
  const body = catmull([[860, 400], [930, 350], [1000, 330], [1050, 300], [1075, 255], [1120, 225], [1190, 230], [1240, 210], [1300, 190]], 18);
  const flock = [];
  for (let i = 0; i < body.length - 1; i++) {
    const t = i / (body.length - 1), [x0, y0] = body[i], [x1, y1] = body[i + 1];
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
    // thick and thin like a ribbon turning in the air
    const width = 5 + 46 * Math.pow(Math.sin(t * Math.PI), 0.8) * (0.45 + 0.55 * Math.abs(Math.sin(t * Math.PI * 1.6 + 0.9))), count = Math.round(4 + width * 1.5);
    for (let k = 0; k < count; k++) {
      const off = ((r() + r() + r()) / 1.5 - 1) * width, along = r();
      flock.push([x0 + (x1 - x0) * along + (nx / nl) * off, y0 + (y1 - y0) * along + (ny / nl) * off]);
    }
  }
  d.dabs(flock, { tool: pencil, color: ['#4b3d78', '#3d3470', '#5a4682', '#6a4c80'], length: [1.5, 4], width: [2.2, 3], pressure: [0.9, 1.1], angle: -15, angleJitter: 40 });
  // a few stragglers, nearer and bigger, peeling off toward the river and catching the light on dark cloud
  const strays = [];
  for (let i = 0; i < 70; i++) { const t = r(); strays.push([860 - t * 420 + (r() - 0.5) * 140, 400 + t * 280 + (r() - 0.5) * 110, t]); }
  for (const [x, y, t] of strays) {
    const size = 6 + t * 11 + r() * 3, flap = (r() - 0.35) * size * 0.9;
    const col = bankR.inside(x, y) || x < 700 ? ['#fff0c8', '#ffd59a', '#ffe4bd'][Math.floor(r() * 3)] : ['#4b3d78', '#5a4682'][Math.floor(r() * 2)];
    d.stroke([[x - size, y - flap], [x - size * 0.45, y - size * 0.22], [x, y]], { tool: pencil, color: col, width: [2.4, 3.2], pressure: [1, 1.15], wobble: 0 });
    d.stroke([[x, y], [x + size * 0.45, y - size * 0.25], [x + size * 1.05, y - flap * 0.85]], { tool: pencil, color: col, width: [2.4, 3.2], pressure: [1, 1.15], wobble: 0 });
  }

  // =========================================================== 7. foreground: snow drifts, reeds catching the last gold
  d.stage('foreground');
  // drifts as ridges, back to front: each ridge lit along its crest, sinking into blue shadow below
  const ridges = [];
  for (let i = 0; i < 5; i++) {
    const base = i === 0 ? null : 860 + i * 48, ph = r() * 6, amp = 14 + i * 6;
    ridges.push(i === 0 ? snowTop : (x) => base + Math.sin(x * (0.004 + i * 0.0007) + ph) * amp + (fbm(x * 0.006, i * 3, 3, 40 + i) - 0.5) * 40);
  }
  ridges.forEach((top, i) => {
    const band = R.below(top, 0, W, H);
    const crest = (x, y) => clamp(1 - (y - top(x)) / (60 + i * 18));
    const slope = (x) => Math.atan2(top(x + 6) - top(x - 6), 12) * 180 / Math.PI;
    d.hatch(band, { tool: oil, color: (x, y, rr) => snowR(clamp(0.18 + crest(x, y) * 0.75 + (x - 400) / W * 0.12 + (rr() - 0.5) * 0.12)), angleAt: (x) => slope(x), angleJitter: 7, spacing: 8 + i, length: [20 + i * 4, 44 + i * 8], width: [5, 9 + i], pressure: [0.7, 1], curve: 0.06, where: (x, y) => y < top(x) + 150 + i * 30, feather: 2, rag: 0.4 });
    // the crest itself: one decisive light stroke run along the top, broken where the hand lifts
    const crestPts = []; for (let x = -20; x <= W + 20; x += 24) crestPts.push([x, top(x) + 2]);
    d.line(crestPts, { tool: oil, color: ['#fff0e2', '#ffe2cf', '#fbd6cb'], width: [4, 7], pressure: [0.8, 1], maxLen: 140, wobble: 1.5 });
  });
  // shadow pockets: cool pencil hatching tucked under the crests
  d.hatch(snow, { tool: pencil, color: ['#4a4f98', '#5b5aa6', '#6d63b0'], angle: 20, angleJitter: 8, spacing: 5, length: [10, 22], width: [2, 3], pressure: [0.7, 1], where: (x, y) => ridges.some((top) => y > top(x) + 18 && y < top(x) + 48) && fbm(x * 0.01, y * 0.02, 2, 21) > 0.5 });
  // reeds: clumps of stems rising from the snow, bowed by the wind, plumes lit on the side of the light
  const clumps = [[60, 1080], [210, 1090], [330, 1070], [1580, 1085], [1720, 1075], [1860, 1090], [1450, 1095]];
  for (const [bx, by] of clumps) {
    const n = 14 + Math.floor(r() * 12);
    for (let i = 0; i < n; i++) {
      const x0 = bx + (r() - 0.5) * 90, hgt = 220 + r() * 260, lean = (bx < 900 ? 1 : -0.4) * (30 + r() * 90);
      const stem = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; stem.push([x0 + lean * t * t, by - hgt * t]); }
      d.line(stem, { tool: conte, color: ['#2a2756', '#3a2f62', '#4a3a6a'], width: [2, 3.4], pressure: [0.7, 0.95], smooth: true, wobble: 1.2 });
      d.line(stem.slice(3), { tool: pencil, color: ['#f2b38f', '#e99a9a', '#ffd8a0'], width: [1.6, 2.2], pressure: [0.6, 0.85], smooth: true, wobble: 1 });
      const [tx, ty] = stem.at(-1), plume = [];
      for (let k = 0; k < 18; k++) plume.push([tx + (r() - 0.3) * 16 + lean * 0.06 * k * 0.3, ty + k * 2.2 + (r() - 0.5) * 6]);
      d.dabs(plume, { tool: oil, color: ['#ffe6b3', '#ffcf9a', '#f8b29c', '#fff3dc'], length: [5, 12], width: [2.5, 4], angle: bx < 900 ? -60 : -110, angleJitter: 20, pressure: [0.75, 1] });
    }
  }

  // =========================================================== 8. accents: frost, dust in the light, a few decisive darks
  d.stage('accents');
  const sparkle = [];
  for (let i = 0; i < 700; i++) { const x = r() * W, y = snowTop(x) + 10 + r() * 240; sparkle.push([x, y]); }
  d.dabs(sparkle, { tool: oil, color: ['#fffaf0', '#fff2d8', '#ffe3c8'], length: [0.5, 2.5], width: [1.8, 3.2], pressure: [0.8, 1.1] });
  const motes = [];
  for (let i = 0; i < 260; i++) { const a = (100 + r() * 80) * Math.PI / 180, L = 140 + r() * 520; motes.push([T[0] + Math.cos(a) * L, T[1] + Math.sin(a) * L]); }
  d.dabs(motes, { tool: pencil, color: ['#fff2cf', '#ffe0a6'], length: [0.5, 1.5], width: [2, 2.8], pressure: 1 });
  // the darkest darks go in last, sparingly: under the bank, the near edge of the ice
  d.line([[0, waterTop(0) + 3], [W, waterTop(W) + 3]], { tool: conte, color: '#1f2450', width: [3, 5], pressure: [0.6, 0.85], wobble: 2, maxLen: 200 });
  return d;
}
