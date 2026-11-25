// fold-out-map · mapart.js — paints the printed map (front) and the leaflet's back panels, in map units, the look of a
// printed city travel map: cream stock, tan street network, blue-green water with coastline bands, contour-lined hills,
// pale parks, serif names, a big title, a compass and a scale bar.
//
//   S.front(paint(m => { m.paper(); m.sea(seaPoly, { coast }); m.streets({ districts, mask }); m.text('Busan', x, z, …); }));
//   S.backs(paintBack((m, info) => { if (info.cover) … }));
//
// Every method takes map units (x east, z south; on the front the sheet's centre is 0,0, on a back panel 0,0 is its
// top-left). Sizes are map units too: a 0.05 text size is a cap height of 0.05 (≈ 70 px on a 1400 px/unit texture).
import { rng, noise, fbm, clamp, lerp, spline, inside, distToLine, SERIF, ITALIC } from './foldmap.js';

export const INK = { ink: '#24302b', soft: '#5d655c', red: '#b0302a', street: '#d5c3a0', street2: '#c9a979', water: '#a9cfc9', waterEdge: '#7fb1ab', park: '#d6e2b8', hill: '#c8c7a6', paper: '#f1e9d6' };

export function paint(fn) { return (g, info) => fn(new MapPainter(g, info)); }
export function paintBack(fn) { return (g, info) => fn(new MapPainter(g, { x0: 0, z0: 0, ppu: info.ppu, W: info.pw * info.ppu, H: info.ph * info.ppu, sheet: info.sheet, back: info }), info); }

export class MapPainter {
  constructor(g, { x0, z0, ppu, W, H, sheet, back }) {
    Object.assign(this, { g, x0, z0, k: ppu, Wpx: W, Hpx: H, sheet, back });
    this.texts = sheet ? sheet.texts : [];
    this.x1 = x0 + W / ppu; this.z1 = z0 + H / ppu;
  }
  X(x) { return (x - this.x0) * this.k; }
  Y(z) { return (z - this.z0) * this.k; }
  trace(pts, closed = true) { const g = this.g; g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(this.X(x), this.Y(z)) : g.moveTo(this.X(x), this.Y(z))); if (closed) g.closePath(); }
  fill(pts, color, alpha = 1) { const g = this.g; g.save(); g.globalAlpha = alpha; g.fillStyle = color; this.trace(pts); g.fill(); g.restore(); return this; }
  stroke(pts, color, w, { dash, cap = 'round', join = 'round', alpha = 1, closed = false } = {}) {
    const g = this.g; g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = Math.max(.6, w * this.k); g.lineCap = cap; g.lineJoin = join;
    if (dash) g.setLineDash(dash.map(d => d * this.k)); this.trace(pts, closed); g.stroke(); g.restore(); return this;
  }
  clip(pts) { this.g.save(); this.trace(pts); this.g.clip(); return this; }
  unclip() { this.g.restore(); return this; }
  rect(x, z, w, h, color, alpha = 1) { return this.fill([[x, z], [x + w, z], [x + w, z + h], [x, z + h]], color, alpha); }
  dot(x, z, r, color) { const g = this.g; g.fillStyle = color; g.beginPath(); g.arc(this.X(x), this.Y(z), r * this.k, 0, Math.PI * 2); g.fill(); return this; }

  // the stock: an even cream with fibres, faint mottling and a darker rim (printed paper, not a screen)
  paper({ color = INK.paper, seed = 3, rim = .05 } = {}) {
    const g = this.g, R = rng(seed), W = this.Wpx, H = this.Hpx;
    g.fillStyle = color; g.fillRect(0, 0, W, H);
    // mottling: big soft blotches
    for (let i = 0; i < 40; i++) {
      const x = R() * W, y = R() * H, r = (.15 + R() * .4) * this.k, gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = R() < .5 ? '120,90,40' : '255,250,235'; gr.addColorStop(0, `rgba(${c},${.035 + R() * .03})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // fibres
    const n = Math.round(W * H / 2600);
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = R() * H, a = R() * Math.PI, l = (2 + R() * 9) * this.k / 1000;
      g.strokeStyle = R() < .5 ? `rgba(110,85,50,${.05 + R() * .07})` : `rgba(255,255,250,${.12 + R() * .1})`; g.lineWidth = .7;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    if (rim) {
      for (const [x0, y0, x1, y1, w] of [[0, 0, 0, H, W], [0, 0, W, 0, H]]) {
        const d = rim * this.k;
        for (const [a, b] of [[0, d], [w, w - d]]) {
          const gr = x1 === 0 ? g.createLinearGradient(0, a, 0, b) : g.createLinearGradient(a, 0, b, 0);
          gr.addColorStop(0, 'rgba(120,90,50,.12)'); gr.addColorStop(1, 'rgba(120,90,50,0)'); g.fillStyle = gr;
          if (x1 === 0) g.fillRect(0, Math.min(a, b), W, d); else g.fillRect(Math.min(a, b), 0, d, H);
        }
      }
    }
    return this;
  }
  // water: fill, then coastline bands (lines that follow the coast out to sea), then a darker edge on the coast
  sea(poly, { coast = [], islands = [], fill = INK.water, edge = INK.waterEdge, bands = 5, spacing = .022, band = '#93c0ba' } = {}) {
    const g = this.g; this.fill(poly, fill);
    this.clip(poly);
    const lines = [coast, ...islands.map(p => [...p, p[0]])].filter(l => l.length > 1);
    for (let i = bands; i >= 1; i--) {
      const w = 2 * i * spacing;
      for (const l of lines) this.stroke(l, band, w, { alpha: .55 - i * .07 });
      for (const l of lines) this.stroke(l, fill, w - .0035);
    }
    for (const l of lines) this.stroke(l, edge, .006);
    this.unclip();
    for (const p of islands) this.land(p);
    return this;
  }
  // an island or a pier: paper again, with the water edge
  land(poly, { fill = INK.paper, edge = INK.waterEdge } = {}) { this.fill(poly, fill); this.stroke([...poly, poly[0]], edge, .005); return this; }
  // a river: a smooth band that widens toward its mouth (w0 → w1), edge lines on both banks
  river(pts, { w0 = .012, w1 = .03, fill = INK.water, edge = INK.waterEdge, step = .004 } = {}) {
    const line = spline(pts, step), n = line.length, g = this.g;
    for (const [col, extra] of [[edge, .005], [fill, 0]]) {
      g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 0; i < n - 1; i++) {
        g.lineWidth = (lerp(w0, w1, i / (n - 1)) + extra) * this.k; g.beginPath();
        g.moveTo(this.X(line[i][0]), this.Y(line[i][1])); g.lineTo(this.X(line[i + 1][0]), this.Y(line[i + 1][1])); g.stroke();
      }
    }
    return this;
  }
  park(poly, { fill = INK.park, dots = true, seed = 5 } = {}) {
    this.fill(poly, fill, .9);
    if (dots) {
      const R = rng(seed), xs = poly.map(p => p[0]), zs = poly.map(p => p[1]), [a, b, c, d] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
      for (let i = 0; i < (b - a) * (d - c) * 2200; i++) { const x = lerp(a, b, R()), z = lerp(c, d, R()); if (inside([x, z], poly)) this.dot(x, z, .0035 + R() * .002, 'rgba(120,150,90,.45)'); }
    }
    return this;
  }
  // hills: a height field from peaks ([x, z, height, radius]) roughened with noise, drawn as wobbly contour lines over a
  // soft relief tint, kept inside `clip` (land). Engraved-map look: many thin lines, darker toward the summits.
  hills(peaks, { clip, levels = 14, color = '#8d8a6c', tint = INK.hill, step = .008, seed = 9, rough = .35 } = {}) {
    const H = (x, z) => {
      let h = 0; for (const [px, pz, ph, pr] of peaks) { const d = Math.hypot(x - px, z - pz) / pr; h = Math.max(h, ph * Math.exp(-d * d * 1.6)); }
      return h * (1 - rough + rough * 2 * fbm(x * 9, z * 9, 3, seed));
    };
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (const [px, pz, , pr] of peaks) { a = Math.min(a, px - pr * 1.6); b = Math.max(b, px + pr * 1.6); c = Math.min(c, pz - pr * 1.6); d = Math.max(d, pz + pr * 1.6); }
    const nx = Math.ceil((b - a) / step), nz = Math.ceil((d - c) / step), F = new Float32Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) F[j * (nx + 1) + i] = H(a + i * step, c + j * step);
    const max = Math.max(...peaks.map(p => p[2]));
    const g = this.g; if (clip) this.clip(clip);
    // relief tint: lighter on the north-west faces, deeper on the south-east (light from the top-left)
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const h = F[j * (nx + 1) + i]; if (h < max * .05) continue;
      const sx = F[j * (nx + 1) + i + 1] - h, sz = F[(j + 1) * (nx + 1) + i] - h, lit = clamp(.5 - (sx + sz) / step * .35);
      g.fillStyle = `rgba(${Math.round(lerp(150, 252, lit))},${Math.round(lerp(150, 246, lit))},${Math.round(lerp(108, 224, lit))},${clamp(h / max * .42)})`;
      g.fillRect(this.X(a + i * step), this.Y(c + j * step), step * this.k + 1, step * this.k + 1);
    }
    // contour lines (marching squares)
    for (let L = 1; L <= levels; L++) {
      const lv = max * L / (levels + 1); g.strokeStyle = color; g.globalAlpha = .35 + .45 * L / levels; g.lineWidth = Math.max(.7, (L % 5 === 0 ? .0024 : .0013) * this.k);
      g.beginPath();
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const v = [F[j * (nx + 1) + i], F[j * (nx + 1) + i + 1], F[(j + 1) * (nx + 1) + i + 1], F[(j + 1) * (nx + 1) + i]];
        const idx = (v[0] > lv) | (v[1] > lv) << 1 | (v[2] > lv) << 2 | (v[3] > lv) << 3; if (idx === 0 || idx === 15) continue;
        const x0 = a + i * step, z0 = c + j * step, e = [];
        const cut = (p, q, P, Q) => { const f = (lv - p) / (q - p); return [lerp(P[0], Q[0], f), lerp(P[1], Q[1], f)]; };
        const C = [[x0, z0], [x0 + step, z0], [x0 + step, z0 + step], [x0, z0 + step]];
        for (let s = 0; s < 4; s++) { const p = v[s], q = v[(s + 1) % 4]; if ((p > lv) !== (q > lv)) e.push(cut(p, q, C[s], C[(s + 1) % 4])); }
        for (let s = 0; s + 1 < e.length; s += 2) { g.moveTo(this.X(e[s][0]), this.Y(e[s][1])); g.lineTo(this.X(e[s + 1][0]), this.Y(e[s + 1][1])); }
      }
      g.stroke();
    }
    g.globalAlpha = 1; if (clip) this.unclip();
    this.height = H; return this;
  }
  // a street network: each district is a grid (spacing, angle) warped by noise, faded out at its edge; streets are drawn
  // only where mask(x, z) is true (land, not hills, not water). Every `major`-th line is an avenue (wider, darker).
  streets({ districts, mask = () => true, color = INK.street, avenue = INK.street2, w = .0028, wAvenue = .0058, major = 4, seed = 11, step = .006 } = {}) {
    const g = this.g; g.lineCap = 'round';
    const draws = [[], []];
    districts.forEach((D, di) => {
      const { at, r, angle = 0, spacing = .045, warp = .012, fade = .3 } = D, ca = Math.cos(angle * Math.PI / 180), sa = Math.sin(angle * Math.PI / 180);
      const n = Math.ceil(r / spacing);
      for (const dir of [0, 1]) for (let i = -n; i <= n; i++) {
        const big = (i % major) === 0, pts = [];
        for (let s = -r; s <= r; s += step) {
          const u = dir ? s : i * spacing, v = dir ? i * spacing : s;
          let x = at[0] + u * ca - v * sa, z = at[1] + u * sa + v * ca;
          x += (noise(x * 6, z * 6, seed + di) - .5) * warp * 2; z += (noise(x * 6 + 7, z * 6, seed + di + 3) - .5) * warp * 2;
          const edge = Math.hypot(x - at[0], z - at[1]) / r + (noise(x * 4, z * 4, seed + 40 + di) - .5) * fade;
          pts.push(edge < 1 && mask(x, z) ? [x, z] : null);
        }
        // a few minor streets stop short — real blocks are not all through-streets
        let run = [];
        const R = rng(seed * 101 + di * 7 + i * 13 + dir);
        for (const p of pts) { if (p && !(R() < .012 && !big)) run.push(p); else { if (run.length > 1) draws[big ? 1 : 0].push(run); run = []; } }
        if (run.length > 1) draws[big ? 1 : 0].push(run);
      }
    });
    for (const [set, col, lw] of [[draws[0], color, w], [draws[1], avenue, wAvenue]]) {
      g.strokeStyle = col; g.lineWidth = Math.max(.7, lw * this.k); g.lineJoin = 'round'; g.beginPath();
      for (const run of set) run.forEach(([x, z], i) => i ? g.lineTo(this.X(x), this.Y(z)) : g.moveTo(this.X(x), this.Y(z)));
      g.stroke();
    }
    return this;
  }
  // a main road / expressway: a darker casing and a pale core, smoothed
  road(pts, { w = .009, color = '#f7efd9', casing = '#c29a63', dash } = {}) {
    const l = spline(pts, .006); this.stroke(l, casing, w + .004); this.stroke(l, color, w, { dash }); return this;
  }
  rail(pts, { w = .006 } = {}) { const l = spline(pts, .006); this.stroke(l, '#5a5a55', w); this.stroke(l, '#f4efe2', w * .55, { dash: [.02, .02], cap: 'butt' }); return this; }
  // text: size = cap height in map units. spacing = letter spacing in em. halo = a paper-coloured outline behind it.
  text(str, x, z, { size = .04, weight = 600, font = SERIF, italic = false, color = INK.ink, align = 'center', spacing = 0, rotate = 0, halo = INK.paper, haloW = .3, alpha = 1, upper = false } = {}) {
    if (upper) str = str.toUpperCase();
    this.texts.push(str);
    const g = this.g, px = size * this.k / .72;
    g.save(); g.translate(this.X(x), this.Y(z)); g.rotate(rotate * Math.PI / 180); g.globalAlpha = alpha;
    g.font = `${italic ? 'italic ' : ''}${weight} ${px}px ${italic ? ITALIC : font}`; g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = `${spacing * px}px`;
    const w = g.measureText(str).width, x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    g.textAlign = 'left';
    if (halo) { g.strokeStyle = halo; g.lineWidth = haloW * px; g.lineJoin = 'round'; g.strokeText(str, x0, size * this.k / 2); }
    g.fillStyle = color; g.fillText(str, x0, size * this.k / 2);
    g.restore(); return w / this.k;
  }
  // a framed hairline border inset from the edge (front: around the map; back: around a panel)
  border(inset = .06, { color = INK.ink, w = .003, double = true } = {}) {
    const a = this.x0 + inset, b = this.x1 - inset, c = this.z0 + inset, d = this.z1 - inset;
    this.stroke([[a, c], [b, c], [b, d], [a, d]], color, w, { closed: true, cap: 'butt', join: 'miter' });
    if (double) this.stroke([[a + .014, c + .014], [b - .014, c + .014], [b - .014, d - .014], [a + .014, d - .014]], color, w * .45, { closed: true, cap: 'butt', join: 'miter' });
    return this;
  }
  compass(x, z, r = .09, { color = INK.ink, red = INK.red } = {}) {
    this.stroke(spline([...Array(33)].map((_, i) => [x + Math.cos(i / 32 * Math.PI * 2) * r, z + Math.sin(i / 32 * Math.PI * 2) * r]), .004, true), color, .002);
    this.fill([[x, z - r * 1.25], [x + r * .2, z], [x, z + r * .2], [x - r * .2, z]], red);
    this.fill([[x, z + r * 1.05], [x + r * .2, z], [x - r * .2, z]], color);
    this.text('N', x, z - r * 1.55, { size: r * .42, weight: 700 }); return this;
  }
  scalebar(x, z, km, kmPerUnit, { label = `${km} km`, color = INK.ink } = {}) {
    const L = km / kmPerUnit, h = .012;
    for (let i = 0; i < 4; i++) this.rect(x + L / 4 * i, z, L / 4, h, i % 2 ? '#fbf7ec' : color);
    this.stroke([[x, z], [x + L, z], [x + L, z + h], [x, z + h]], color, .0015, { closed: true, cap: 'butt' });
    this.text('0', x, z + h + .04, { size: .022 }); this.text(label, x + L, z + h + .04, { size: .022 });
    return this;
  }
}
// helpers for masks
export const maskOf = ({ land = [], not = [] }) => (x, z) => land.some(p => inside([x, z], p)) && !not.some(f => f(x, z));
export const awayFrom = (pts, d) => (x, z) => distToLine([x, z], pts) < d;
