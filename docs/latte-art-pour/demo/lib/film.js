// latte-art-pour · film.js — a top-down latte-art pour as a short film: the cup on its saucer on a table, the pitcher
// coming in, the milk drawing a figure in the crema while a step label and the pour score run, then the finished cup held
// with its title. One canvas, Canvas 2D; the surface is the fluid in latte.js, driven by the score in pour.js.
//
//   film({ title, kicker, caption, lang, size, fps, seed, drink, cup, table, accent, pour: [moves], timing, sim })
//
// Page contract: window.seek(t), DURATION, FPS, SIZE, filmInfo(), __film (measurements for check.mjs), __ready.
// Query: ?render=1 (no player) · ?t=7.5 (open paused) · ?scale=.5 · ?debug=1 · ?play=1 (pour it yourself).
import { Surface, clamp, smooth, fbm, hash2 } from './latte.js';
import { compile } from './pour.js';
import { E } from './principles.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
export const SIM_HZ = 60;
export const FONTS = {
  serif: "LAPSerif, LAPSerifKR, Georgia, serif",
  sans: "LAPSans, LAPKR, system-ui, sans-serif",
};
// text roles: px at 1080 wide (the short side) — check.mjs reads these
export const TYPE = {
  kicker: { size: 30, weight: 500, family: 'sans', spacing: 4 },
  title: { size: 74, weight: 600, family: 'serif' },
  step: { size: 52, weight: 600, family: 'serif' },
  label: { size: 28, weight: 500, family: 'sans', spacing: 2 },
  caption: { size: 34, weight: 500, family: 'sans' },
};
export const TIMING = { intro: 1.8, outro: 3.6, settle: .6 };

// ── the drinks: crema (dark, light) and foam. A topic may name a preset or give its own colours. ──
export const DRINKS = {
  espresso: { crema: ['#4a220d', '#b06a31'], foam: '#f7eedf', name: 'espresso' },
  ristretto: { crema: ['#2f1508', '#8a4a1f'], foam: '#f6ecdc', name: 'ristretto' },
  mocha: { crema: ['#2b1309', '#6e3a1e'], foam: '#f3e7d6', name: 'mocha' },
  matcha: { crema: ['#4f6b1f', '#9fbb4b'], foam: '#f6f4e6', name: 'matcha' },
  hojicha: { crema: ['#5a3418', '#a9774a'], foam: '#f6eee2', name: 'hojicha' },
  chai: { crema: ['#7a4a26', '#c58f5c'], foam: '#faf2e6', name: 'chai' },
  ube: { crema: ['#4b2a5e', '#9a76b8'], foam: '#f7f1f6', name: 'ube' },
  beet: { crema: ['#7a1f3d', '#d0607e'], foam: '#fbf0f2', name: 'beet' },
  golden: { crema: ['#a8661a', '#e6ad3c'], foam: '#fdf6e6', name: 'golden' },
};
export const TABLES = ['wood', 'marble', 'linen', 'slate', 'terrazzo', 'solid'];

const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const lum = c => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;
const shade = (c, k) => k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k);

async function loadFonts() {
  const base = new URL('./fonts/', import.meta.url);
  const faces = [
    ['LAPSerif', 'SourceSerif4-Variable.woff2', '200 900', 'normal'],
    ['LAPSerifKR', 'NanumMyeongjo-800-ksx1001.woff2', '100 900', 'normal'],
    ['LAPSans', 'Inter-500.woff2', '500', 'normal'], ['LAPSans', 'Inter-700.woff2', '700', 'normal'],
    ['LAPKR', 'NotoSansKR-500.woff2', '100 900', 'normal'],
  ];
  let ok = true;
  await Promise.all(faces.map(async ([fam, file, w, st]) => {
    try { const f = new FontFace(fam, `url(${new URL(file, base)})`, { weight: w, style: st }); await f.load(); document.fonts.add(f); }
    catch { ok = false; }
  }));
  return ok;
}

// ── the table: painted once into an offscreen canvas (deterministic from the seed) ──
function paintTable(W, H, tb, seed, light) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const kind = tb.kind || 'wood', base = hex(tb.color || ({ wood: '#8a5a36', marble: '#e9e6e1', linen: '#d9d0c1', slate: '#3a3d40', terrazzo: '#e7e1d8', solid: '#d8d2c8' })[kind]);
  const acc = hex(tb.accent || ({ wood: '#5b3a22', marble: '#8f8a86', linen: '#b8ac98', slate: '#24272a', terrazzo: '#b0563a', solid: '#c5bdb0' })[kind]);
  const s = 3, w = Math.ceil(W / s), h = Math.ceil(H / s), img = x.createImageData(w, h), d = img.data, U = 1080 / Math.min(W, H);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = i * s * U, py = j * s * U; let c = base;
    if (kind === 'wood') {
      const plank = Math.floor(py / 300), off = hash2(plank, 3, seed) * 900;
      const g = fbm((px + off) / 900, py / 38 + plank * 7, seed, 4), ring = .5 + .5 * Math.sin((py / 9 + g * 14 + hash2(plank, 1, seed) * 6));
      c = mix(base, acc, .25 + .45 * ring * g);
      c = shade(c, (hash2(plank, 9, seed) - .5) * .12);
      const seam = Math.abs(py - (plank + 1) * 300); if (seam < 3) c = shade(c, -.35 * (1 - seam / 3));
    } else if (kind === 'marble') {
      const g = fbm(px / 420, py / 420, seed, 5), v = Math.abs(Math.sin((px * .6 + py) / 260 + g * 7));
      c = mix(base, acc, .55 * Math.pow(1 - v, 9) + .08 * g);
      const v2 = Math.abs(Math.sin((px - py * .4) / 140 + fbm(px / 200, py / 200, seed + 3, 4) * 9)); c = mix(c, acc, .25 * Math.pow(1 - v2, 14));
    } else if (kind === 'linen') {
      const n = hash2(Math.floor(px / 2.2), Math.floor(py / 2.2), seed), wx = .5 + .5 * Math.sin(px * 1.9), wy = .5 + .5 * Math.sin(py * 1.9);
      c = mix(base, acc, .18 * n + .12 * wx * wy + .18 * fbm(px / 300, py / 300, seed, 3));
    } else if (kind === 'slate') {
      c = mix(base, acc, .5 * fbm(px / 260, py / 180, seed, 5)); c = shade(c, (hash2(i, j, seed) - .5) * .05);
    } else if (kind === 'terrazzo') {
      c = shade(base, (fbm(px / 200, py / 200, seed, 3) - .5) * .06);
      const cell = 46, ci = Math.floor(px / cell), cj = Math.floor(py / cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const ii = ci + a, jj = cj + b, r = hash2(ii, jj, seed + 1);
        if (r < .55) { const cx = (ii + hash2(ii, jj, seed + 2)) * cell, cy = (jj + hash2(ii, jj, seed + 3)) * cell, rr = 4 + 12 * hash2(ii, jj, seed + 4);
          if ((px - cx) ** 2 + (py - cy) ** 2 < rr * rr) { const k = hash2(ii, jj, seed + 5); c = k < .45 ? acc : k < .75 ? shade(acc, .35) : shade(base, -.25); } }
      }
    } else c = shade(base, (fbm(px / 500, py / 500, seed, 3) - .5) * .05);
    const o = (j * w + i) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  const t = document.createElement('canvas'); t.width = w; t.height = h; t.getContext('2d').putImageData(img, 0, 0);
  x.imageSmoothingEnabled = true; x.drawImage(t, 0, 0, W, H);
  // window light from the light side + vignette
  const lx = W / 2 - Math.cos(light) * W * .7, ly = H / 2 - Math.sin(light) * H * .5;
  let g = x.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 1.1);
  g.addColorStop(0, 'rgba(255,250,240,.16)'); g.addColorStop(.6, 'rgba(255,250,240,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return { canvas: cv, base, luma: lum(base) };
}

export async function film(cfg) {
  const T = { ...TIMING, ...(cfg.timing || {}) };
  const [SW, SH] = cfg.size || [1080, 1920];
  const scale = +(Q.get('scale') || 1), CW = Math.round(SW * scale), CH = Math.round(SH * scale);
  const U = Math.min(CW, CH) / 1080, FPS = cfg.fps || 30, seed = cfg.seed ?? 7, lang = cfg.lang || 'en';
  const canvas = document.getElementById('film'); canvas.width = CW; canvas.height = CH;
  const c = canvas.getContext('2d', { alpha: false });
  const fontsOk = await loadFonts();
  const light = ((cfg.light ?? 225) * Math.PI) / 180, Lx = Math.cos(light), Ly = Math.sin(light);   // where light comes FROM

  // drink, cup, table
  const drink = typeof cfg.drink === 'string' ? DRINKS[cfg.drink] : { ...DRINKS.espresso, ...(cfg.drink || {}) };
  if (!drink) throw new Error(`unknown drink "${cfg.drink}" (presets: ${Object.keys(DRINKS).join(', ')})`);
  const CREMA0 = hex(drink.crema[0]), CREMA1 = hex(drink.crema[1]), FOAM = hex(drink.foam);
  const cup = { color: '#f4f1ec', inner: null, saucer: '#efebe5', handle: 90, size: 1, rim: null, ...(cfg.cup || {}) };
  const CUPC = hex(cup.color), CUPIN = hex(cup.inner || cup.color), SAUC = cup.saucer ? hex(cup.saucer) : null, RIM = hex(cup.rim || cup.color);
  const table = paintTable(CW, CH, cfg.table || {}, seed, light);
  const dark = table.luma < .45, INK = hex(cfg.ink || (dark ? '#f3ede4' : '#2b2420')), DIM = mix(INK, table.base, .45), ACC = hex(cfg.accent || (dark ? '#e8b77a' : '#9a5a2c'));

  // layout: tall (portrait) or wide
  const tall = CH >= CW * 1.15;
  const L = tall
    ? { cx: CW / 2, cy: CH * .5, saucer: CW * .465, top: CH * .07, textX: CW / 2, align: 'center', textW: CW * .86, strip: CH * .8, caption: CH * .865 }
    : { cx: CW * .66, cy: CH * .5, saucer: CH * .445, top: CH * .14, textX: CW * .07, align: 'left', textW: CW * .3, strip: CH * .74, caption: CH * .6 };
  const cupR = L.saucer * .79 * cup.size, rimIn = cupR * .9, liqMax = rimIn * .985;

  // the score
  const pour = compile(cfg.pour || [], { t0: T.intro - .9, dir: cfg.dir ?? 180 });
  const DURATION = +(Math.max(pour.t1, pour.pourEnd) + T.settle + T.outro).toFixed(3);
  const outro0 = DURATION - T.outro;
  // fill level: from start to 1 with the poured volume (high and low pours both add milk)
  const NSTEP = Math.ceil(DURATION * SIM_HZ) + 2, vol = new Float32Array(NSTEP);
  for (let k = 1; k < NSTEP; k++) { const p = pour.at(k / SIM_HZ); vol[k] = vol[k - 1] + p.q * (p.enter > .5 ? 1 : 0) / SIM_HZ; }
  const level0 = cfg.level ?? .5, levelAt = t => level0 + (1 - level0) * (vol[clamp(Math.floor(t * SIM_HZ), 0, NSTEP - 1)] / (vol[NSTEP - 1] || 1));
  const liqR = t => liqMax * (.8 + .2 * levelAt(t));

  // ── the surface + checkpoints (seek(t) restores the nearest and steps on, so every frame is the same on every run) ──
  const N = +(Q.get('grid') || cfg.sim?.n || 320);
  const surf = new Surface({ n: N, seed, phys: cfg.sim?.phys || {} });
  const CK = 60, checkpoints = new Map([[0, surf.snapshot()]]);
  let simStep = 0;
  const pourState = k => {
    const t = k / SIM_HZ, p = pour.at(t), pp = pour.at(t - 1 / SIM_HZ);
    const on = p.enter > .98 && p.q > .001;
    return {
      pour: on ? { x: p.x, y: p.y, q: p.q, h: clamp(p.h), dx: p.dx, dy: p.dy, vx: (p.x - pp.x) * SIM_HZ, vy: (p.y - pp.y) * SIM_HZ } : null,
      pin: p.pin && p.pin.on && pp.pin ? { x: p.pin.x, y: p.pin.y, ink: p.pin.ink, width: p.pin.width, vx: (p.pin.x - pp.pin.x) * SIM_HZ, vy: (p.pin.y - pp.pin.y) * SIM_HZ, on: true } : null,
    };
  };
  const simTo = t => {
    const target = clamp(Math.floor(t * SIM_HZ + 1e-6), 0, NSTEP - 1);
    if (target < simStep || target - simStep > CK * 2) {
      let best = 0; for (const k of checkpoints.keys()) if (k <= target && k > best) best = k;
      if (target < simStep || best > simStep) { surf.restore(checkpoints.get(best)); simStep = best; }
    }
    while (simStep < target) {
      const k = simStep + 1, s = pourState(k);
      if (s.pour || s.pin) surf.step(1 / SIM_HZ, s.pour, s.pin); else { surf.t += 1 / SIM_HZ; surf.steps++; }
      simStep = k;
      if (k % CK === 0 && !checkpoints.has(k)) checkpoints.set(k, surf.snapshot());
    }
  };

  // ── the liquid: per-pixel from the surface fields ──
  const liq = document.createElement('canvas'), lx = liq.getContext('2d');
  let GX = null, GY = null;
  function drawLiquid(ctx, cx, cy, R, S = surf) {
    const n = S.n, F = S.foam, Tn = S.tone;
    if (!GX || GX.length !== n * n) { GX = new Float32Array(n * n); GY = new Float32Array(n * n); }
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const k = j * n + i; GX[k] = F[k + 1] - F[k - 1]; GY[k] = F[k + n] - F[k - n]; }
    const D = Math.ceil(R * 2) + 2; if (liq.width !== D) { liq.width = D; liq.height = D; }
    const img = lx.createImageData(D, D), d = img.data, inv = 1 / R, gs = n / 2, n2 = n - 2, aaw = 1.2 / R;
    const fw = .085 * Math.max(1, 320 / n);     // foam edge softness in field units
    for (let py = 0; py < D; py++) {
      const y = (py + .5 - D / 2) * inv;
      for (let px = 0; px < D; px++) {
        const x = (px + .5 - D / 2) * inv, r2 = x * x + y * y; if (r2 > 1.0) continue;
        const r = Math.sqrt(r2);
        let gx = (x + 1) * gs - .5, gy = (y + 1) * gs - .5, i0 = gx | 0, j0 = gy | 0; if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i0 > n2) i0 = n2; if (j0 > n2) j0 = n2;
        const fx = gx - i0, fy = gy - j0, k = j0 * n + i0;
        const bl = A => A[k] + (A[k + 1] - A[k]) * fx + (A[k + n] - A[k]) * fy + (A[k] - A[k + 1] - A[k + n] + A[k + n + 1]) * fx * fy;
        const f = bl(F), tn = bl(Tn), ggx = bl(GX), ggy = bl(GY);
        const a = smooth(.5 - fw, .5 + fw, f);
        // crema: marbled between the two browns, darker toward the wall, a bright meniscus line at the very edge
        const tt = clamp(tn * 1.15 - .08), wall = smooth(.8, 1, r);
        let cr = CREMA0[0] + (CREMA1[0] - CREMA0[0]) * tt, cg = CREMA0[1] + (CREMA1[1] - CREMA0[1]) * tt, cb = CREMA0[2] + (CREMA1[2] - CREMA0[2]) * tt;
        const dk = 1 - .28 * wall; cr *= dk; cg *= dk; cb *= dk;
        // foam: off-white, a warm tint where it thins into the crema, a little relief lit from the light side
        const edge = 4 * a * (1 - a), micro = (hash2(px, py, 11) - .5) * .035;
        let fr = FOAM[0] * (1 + micro), fg = FOAM[1] * (1 + micro), fb = FOAM[2] * (1 + micro);
        const warm = .22 * edge; fr += (CREMA1[0] - fr) * warm; fg += (CREMA1[1] - fg) * warm; fb += (CREMA1[2] - fb) * warm;
        const relief = 1 + clamp((ggx * Lx + ggy * Ly) * 1.6, -.12, .12) * (.4 + a);
        let R0 = (cr + (fr - cr) * a) * relief, G0 = (cg + (fg - cg) * a) * relief, B0 = (cb + (fb - cb) * a) * relief;
        // window glare on the glossy crema (less on foam) + meniscus
        const gxp = x + Lx * .42, gyp = y + Ly * .42, glare = Math.exp(-(gxp * gxp) / .09 - (gyp * gyp) / .035) * .16 * (1 - .7 * a);
        const men = smooth(.975, .995, r) * (1 - smooth(.995, 1, r)) * .18;
        R0 += (255 - R0) * (glare + men); G0 += (255 - G0) * (glare + men); B0 += (255 - B0) * (glare + men);
        const o = (py * D + px) * 4; d[o] = R0; d[o + 1] = G0; d[o + 2] = B0; d[o + 3] = 255 * clamp((1 - r) / aaw);
      }
    }
    lx.putImageData(img, 0, 0);
    ctx.drawImage(liq, cx - D / 2, cy - D / 2);
  }

  // ── cup, saucer, shadows ──
  const sh = (o, blur) => ({ x: -Lx * o, y: -Ly * o, blur });
  function drawCup(ctx, cx, cy, Rl) {
    const sOff = sh(cupR * .07, cupR * .09);
    if (SAUC) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.32)'; ctx.shadowBlur = L.saucer * .09; ctx.shadowOffsetX = -Lx * L.saucer * .05; ctx.shadowOffsetY = -Ly * L.saucer * .05;
      ctx.fillStyle = rgb(SAUC); ctx.beginPath(); ctx.arc(cx, cy, L.saucer, 0, 7); ctx.fill(); ctx.restore();
      let g = ctx.createRadialGradient(cx + Lx * L.saucer * .3, cy + Ly * L.saucer * .3, L.saucer * .1, cx, cy, L.saucer);
      g.addColorStop(0, rgb(shade(SAUC, .12))); g.addColorStop(.8, rgb(SAUC)); g.addColorStop(1, rgb(shade(SAUC, -.12)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, L.saucer, 0, 7); ctx.fill();
      ctx.strokeStyle = rgb(shade(SAUC, -.08), .8); ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(cx, cy, L.saucer * .86, 0, 7); ctx.stroke();
      ctx.strokeStyle = rgb([255, 255, 255], .5); ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.arc(cx, cy, L.saucer * .985, light - .9, light + .9); ctx.stroke();
    }
    // handle (behind the body)
    const ha = cup.handle * Math.PI / 180, hx = Math.cos(ha), hy = Math.sin(ha);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ha);
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = sOff.blur * .6; ctx.shadowOffsetX = sOff.x * .6; ctx.shadowOffsetY = sOff.y * .6;
    const hl = cupR * 1.36, hw = cupR * .2;
    ctx.fillStyle = rgb(CUPC); ctx.beginPath(); ctx.roundRect(cupR * .8, -hw / 2, hl - cupR * .8, hw, hw / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    let g = ctx.createLinearGradient(0, -hw / 2, 0, hw / 2); g.addColorStop(0, rgb(shade(CUPC, .12))); g.addColorStop(1, rgb(shade(CUPC, -.14)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(cupR * .8, -hw / 2, hl - cupR * .8, hw, hw / 2); ctx.fill();
    ctx.restore();
    // body shadow + body
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = sOff.blur; ctx.shadowOffsetX = sOff.x; ctx.shadowOffsetY = sOff.y;
    ctx.fillStyle = rgb(CUPC); ctx.beginPath(); ctx.arc(cx, cy, cupR, 0, 7); ctx.fill(); ctx.restore();
    g = ctx.createLinearGradient(cx + Lx * cupR, cy + Ly * cupR, cx - Lx * cupR, cy - Ly * cupR);
    g.addColorStop(0, rgb(shade(RIM, .1))); g.addColorStop(1, rgb(shade(RIM, -.1)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, cupR, 0, 7); ctx.fill();
    // inner wall: from the rim down to the liquid, in shadow on the light side, lit on the far side
    g = ctx.createRadialGradient(cx, cy, Rl * .98, cx, cy, rimIn);
    g.addColorStop(0, rgb(shade(CUPIN, -.42))); g.addColorStop(.35, rgb(shade(CUPIN, -.18))); g.addColorStop(1, rgb(shade(CUPIN, -.02)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimIn, 0, 7); ctx.fill();
    g = ctx.createLinearGradient(cx + Lx * rimIn, cy + Ly * rimIn, cx - Lx * rimIn, cy - Ly * rimIn);
    g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,255,255,.12)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimIn, 0, 7); ctx.fill();
    // rim lip
    ctx.strokeStyle = rgb([255, 255, 255], .55); ctx.lineWidth = 2.5 * U; ctx.beginPath(); ctx.arc(cx, cy, (cupR + rimIn) / 2, light - 1.1, light + 1.1); ctx.stroke();
    ctx.strokeStyle = rgb(shade(RIM, -.25), .5); ctx.lineWidth = 1.5 * U; ctx.beginPath(); ctx.arc(cx, cy, rimIn, 0, 7); ctx.stroke();
    return { hx, hy };
  }

  // ── the pitcher (stainless, top-down) and the pin ──
  const STEEL = [[118, 124, 130], [226, 230, 233], [150, 156, 162], [92, 98, 104]];
  function drawPitcher(ctx, cx, cy, Rl, p, milkLeft) {
    if (p.enter <= 0) return;
    const sc = 1 + .17 * clamp(p.h, 0, 1.15), pr = Rl * .4 * sc, e = E.inOut(p.enter);
    // impact point on screen; the spout (nearer the camera when high) shows a little parallax
    const ix = cx + p.x * Rl, iy = cy + p.y * Rl;
    let tx = ix + (ix - cx) * .05 * p.h - p.dx * 4 * U, ty = iy + (iy - cy) * .05 * p.h - p.dy * 4 * U;
    // entrance / exit: from beyond the frame behind the pour direction, on an arc
    const away = (1 - e) * Math.max(CW, CH) * .7, arcOff = Math.sin(Math.PI * (1 - e)) * pr * .6;
    tx += -p.dx * away - p.dy * arcOff; ty += -p.dy * away + p.dx * arcOff;
    const bx = tx - p.dx * pr * 1.12, by = ty - p.dy * pr * 1.12, ang = Math.atan2(p.dy, p.dx);
    const body = (g, fill = true) => {
      g.save(); g.translate(bx, by); g.rotate(ang);
      g.beginPath(); g.arc(0, 0, pr, .5, Math.PI * 2 - .5); g.lineTo(pr * 1.12, 0); g.closePath();
      g.moveTo(-pr * .92, -pr * .13); g.roundRect(-pr * 1.75, -pr * .13, pr * .9, pr * .26, pr * .13);
      if (fill) g.fill(); g.restore();
    };
    // shadow on the cup / table: further and softer when high
    const so = (16 + 70 * clamp(p.h, 0, 1.15)) * U;
    ctx.save(); ctx.filter = `blur(${(6 + 14 * p.h) * U}px)`; ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.translate(-Lx * so, -Ly * so); body(ctx); ctx.restore();
    // body: brushed steel
    ctx.save();
    // lit from the light side, a bright band and a dark band across the polished rim
    // (the gradient lives in the pitcher's own rotated frame, where body() fills)
    const ca = Math.cos(-ang), sa = Math.sin(-ang), llx = Lx * ca - Ly * sa, lly = Lx * sa + Ly * ca;
    let g = ctx.createLinearGradient(llx * pr * 1.1, lly * pr * 1.1, -llx * pr * 1.1, -lly * pr * 1.1);
    g.addColorStop(0, '#e6e9eb'); g.addColorStop(.16, '#9ba2a8'); g.addColorStop(.38, '#596066'); g.addColorStop(.58, '#bfc5c9'); g.addColorStop(.8, '#656c72'); g.addColorStop(1, '#353a3e');
    ctx.fillStyle = g; body(ctx);
    ctx.save(); ctx.translate(bx, by); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.4 * U; ctx.beginPath(); ctx.arc(0, 0, pr * .985, light - .7, light + .5); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,34,38,.55)'; ctx.lineWidth = 1.6 * U; ctx.beginPath(); ctx.arc(0, 0, pr * .875, 0, 7); ctx.stroke();
    ctx.restore();
    // the milk inside, lower and darker as it is poured
    const mr = pr * (.86 - .1 * (1 - milkLeft));
    ctx.translate(bx, by); ctx.rotate(ang);
    g = ctx.createRadialGradient(-Lx * mr * .3, -Ly * mr * .3, mr * .1, 0, 0, mr);
    g.addColorStop(0, rgb(shade(FOAM, -.01 - .08 * (1 - milkLeft)))); g.addColorStop(1, rgb(shade(FOAM, -.14 - .1 * (1 - milkLeft))));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, mr, 0, 7); ctx.fill();
    ctx.fillStyle = rgb(shade(FOAM, -.08)); ctx.beginPath(); ctx.moveTo(mr * .92, -mr * .12); ctx.lineTo(pr * 1.06, 0); ctx.lineTo(mr * .92, mr * .12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(0, 0, pr * .97, 2.2, 3.6); ctx.stroke();
    ctx.restore();
    // the stream: a short glossy column from the spout lip down to the surface, and where it lands
    if (p.q > .02 && p.enter > .95) {
      const w = (5 + 9 * p.q) * (1 - .4 * clamp(p.h)) * U;
      ctx.strokeStyle = rgb(shade(FOAM, -.05), .95); ctx.lineCap = 'round'; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ix, iy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = w * .3; ctx.beginPath(); ctx.moveTo(tx - p.dy * w * .2, ty + p.dx * w * .2); ctx.lineTo(ix, iy); ctx.stroke();
      if (p.h > .4) { // ripples where a high stream dives
        for (let i = 0; i < 3; i++) { const ph = ((p.t * 1.6 + i / 3) % 1), rr = (8 + 40 * ph) * U * (.5 + p.q);
          ctx.strokeStyle = `rgba(255,240,220,${.18 * (1 - ph) * p.h})`; ctx.lineWidth = 1.5 * U; ctx.beginPath(); ctx.arc(ix, iy, rr, 0, 7); ctx.stroke(); }
      }
    }
  }
  function drawPin(ctx, cx, cy, Rl, pin) {
    if (!pin || pin.enter <= 0) return;
    const e = E.inOut(pin.enter), px = cx + pin.x * Rl, py = cy + pin.y * Rl - (1 - e) * 60 * U;
    const ex = px + CW * .9, ey = py - CW * .55, so = (pin.on ? 8 : 22) * U;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 7 * U; ctx.filter = `blur(${3 * U}px)`; ctx.beginPath(); ctx.moveTo(px - Lx * so, py - Ly * so); ctx.lineTo(ex - Lx * so * 4, ey - Ly * so * 4); ctx.stroke();
    ctx.filter = 'none'; ctx.globalAlpha = e;
    ctx.strokeStyle = rgb(STEEL[2]); ctx.lineWidth = 6 * U; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6 * U; ctx.beginPath(); ctx.moveTo(px + 1, py - 2); ctx.lineTo(ex, ey - 2); ctx.stroke();
    ctx.fillStyle = rgb(STEEL[3]); ctx.beginPath(); ctx.arc(px, py, 3 * U, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ── text, with recorded boxes for check.mjs ──
  let texts = [];
  const fontOf = (role, size) => { const r = TYPE[role]; return `${r.weight} ${Math.round(size)}px ${FONTS[r.family]}`; };
  function text(ctx, role, str, x, y, o = {}) {
    if (!str || (o.alpha ?? 1) <= .01) return null;
    const r = TYPE[role], size = (o.size || r.size) * U; ctx.save();
    ctx.font = fontOf(role, size); ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = rgb(o.color || INK);
    if ('letterSpacing' in ctx && r.spacing) ctx.letterSpacing = `${r.spacing * U}px`;
    const lines = o.maxW ? wrap(ctx, str, o.maxW) : [str], lh = size * (o.lh || 1.25);
    let top = y - size * .8, maxw = 0;
    lines.forEach((ln, i) => {
      const w = ctx.measureText(ln).width; maxw = Math.max(maxw, w);
      const ax = (o.align || L.align) === 'center' ? x - w / 2 : (o.align || L.align) === 'right' ? x - w : x;
      ctx.fillText(ln, ax, y + i * lh);
    });
    ctx.restore();
    const al = o.align || L.align, bx = al === 'center' ? x - maxw / 2 : al === 'right' ? x - maxw : x;
    const box = { role, text: str, size: size / U, x: bx, y: top, w: maxw, h: lh * (lines.length - 1) + size, lines: lines.length };
    texts.push(box); return box;
  }
  function wrap(ctx, str, maxW) {
    const words = str.split(/(\s+)/), out = []; let cur = '';
    for (const w of words) { const t = cur + w; if (ctx.measureText(t.trim()).width > maxW && cur.trim()) { out.push(cur.trim()); cur = w.trimStart(); } else cur = t; }
    if (cur.trim()) out.push(cur.trim()); return out;
  }
  const fade = (t, a, b, r = .45) => Math.min(E.inOut((t - a) / r), E.inOut((b - t) / r));

  const stepNames = pour.steps.map(s => s.label);
  const sAll0 = pour.steps[0]?.t0 ?? T.intro, sAll1 = pour.steps.length ? pour.steps[pour.steps.length - 1].t1 : pour.pourEnd;
  function drawUI(ctx, t, p) {
    const showSteps = cfg.steps !== false && pour.steps.length;
    // intro / outro titles
    const aTitle = Math.max(fade(t, .15, sAll0 + .3, .5), E.inOut((t - outro0 - .2) / .7));
    const yK = L.top + 30 * U, yT = yK + 96 * U;
    text(ctx, 'kicker', (cfg.kicker || '').toUpperCase(), L.textX, yK, { alpha: aTitle, color: ACC });
    text(ctx, 'title', cfg.title, L.textX, yT, { alpha: aTitle, maxW: L.textW });
    // the running step: number + label (between the intro title and the outro title)
    if (showSteps && p.step >= 0) {
      const s = pour.steps[p.step], a = fade(t, s.t0, s.t1 + (p.step === pour.steps.length - 1 ? .4 : .02), .3) * (1 - aTitle);
      const num = `${String(p.step + 1).padStart(2, '0')} / ${String(pour.steps.length).padStart(2, '0')}`;
      text(ctx, 'kicker', num, L.textX, yK, { alpha: a, color: ACC });
      text(ctx, 'step', s.label, L.textX, yK + 86 * U, { alpha: a, maxW: L.textW });
    }
    // the score strip + height / flow meters
    if (showSteps && cfg.strip !== false) {
      const a = fade(t, sAll0 - .3, outro0 + .1, .5); if (a > .01) {
        const x0 = tall ? CW * .12 : L.textX, x1 = tall ? CW * .88 : L.textX + L.textW, y = L.strip, span = sAll1 - sAll0;
        ctx.save(); ctx.globalAlpha = a;
        pour.steps.forEach((s, i) => {
          const a0 = x0 + (x1 - x0) * (s.t0 - sAll0) / span + 3 * U, a1 = x0 + (x1 - x0) * (s.t1 - sAll0) / span - 3 * U;
          const fill = clamp((t - s.t0) / (s.t1 - s.t0));
          ctx.fillStyle = rgb(DIM, .45); ctx.beginPath(); ctx.roundRect(a0, y, a1 - a0, 8 * U, 4 * U); ctx.fill();
          if (fill > 0) { ctx.fillStyle = rgb(i === p.step ? ACC : INK, i === p.step ? 1 : .75); ctx.beginPath(); ctx.roundRect(a0, y, (a1 - a0) * fill, 8 * U, 4 * U); ctx.fill(); }
        });
        ctx.restore();
        // meters: how high the spout is, how fast the milk runs
        const my = y + 64 * U, mw = (x1 - x0) * .3, labels = lang === 'ko' ? ['높이', '흐름'] : ['HEIGHT', 'FLOW'];
        [[labels[0], clamp(p.enter > .5 ? p.h : 1)], [labels[1], p.enter > .5 ? p.q : 0]].forEach(([lb, v], i) => {
          const mx = i === 0 ? x0 : x0 + (x1 - x0) * .54;
          const lbBox = text(ctx, 'label', lb, mx, my, { alpha: a, color: DIM, align: 'left' });
          const bx = mx + (lbBox ? lbBox.w : 0) + 18 * U; ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = rgb(DIM, .35); ctx.beginPath(); ctx.roundRect(bx, my - 14 * U, mw, 6 * U, 3 * U); ctx.fill();
          ctx.fillStyle = rgb(INK, .9); ctx.beginPath(); ctx.roundRect(bx, my - 14 * U, Math.max(6 * U, mw * v), 6 * U, 3 * U); ctx.fill(); ctx.restore();
        });
      }
    }
    // caption at the end
    const aCap = E.inOut((t - outro0 - .6) / .7);
    text(ctx, 'caption', cfg.caption, L.textX, tall ? L.caption : yT + 150 * U, { alpha: aCap, maxW: L.textW, color: mix(INK, table.base, .15), lh: 1.4 });
  }

  // ── one frame ──
  const camAt = t => 1 + .07 * E.inOut((t - outro0) / T.outro);
  function frame(t, S = surf, p = null, milkLeft = null, ui = true) {
    texts = [];
    p = p || pour.at(t); p.t = t;
    const k = camAt(t), cx = L.cx, cy = L.cy;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
    c.drawImage(table.canvas, 0, 0);
    const Rl = p.liqR ?? liqR(t);
    drawCup(c, cx, cy, Rl);
    // the liquid is drawn at the camera's scale so it stays sharp when the camera pushes in
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); drawLiquid(c, cx, cy, Rl * k, S); c.restore();
    drawPin(c, cx, cy, Rl, p.pin);
    drawPitcher(c, cx, cy, Rl, p, milkLeft ?? 1 - (vol[clamp(Math.floor(t * SIM_HZ), 0, NSTEP - 1)] / (vol[NSTEP - 1] || 1)));
    c.restore();
    if (ui) drawUI(c, t, p);
    if (Q.get('debug')) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 0, 520 * U, 44 * U); c.fillStyle = '#fff'; c.font = `${22 * U}px monospace`;
      c.fillText(`t ${t.toFixed(2)}  ${p.move || '-'}  h ${p.h.toFixed(2)}  q ${p.q.toFixed(2)}`, 12 * U, 30 * U); }
  }
  function seek(t) { t = clamp(t, 0, DURATION); simTo(t); frame(t); }

  // ── measurements for check.mjs ──
  const pitcherScreen = t => { const p = pour.at(t), Rl = liqR(t); return [L.cx + p.x * Rl, L.cy + p.y * Rl]; };
  function foamStats(t) {
    simTo(t); const n = surf.n, F = surf.foam; let inside = 0, white = 0, edges = 0, wx = 0, wy = 0;
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const k = j * n + i; if (!surf.inside[k]) continue; inside++;
      const w = F[k] > .5; if (w) { white++; wx += i; wy += j; } if (w !== (F[k + 1] > .5)) edges++; if (w !== (F[k + n] > .5)) edges++; }
    return { coverage: white / inside, edges: edges / n, cx: white ? (wx / white) / n * 2 - 1 : 0, cy: white ? (wy / white) / n * 2 - 1 : 0, step: simStep };
  }
  const foamGrid = (t, m = 64) => { simTo(t); const out = []; for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const x = (i + .5) / m * 2 - 1, y = (j + .5) / m * 2 - 1; out.push(x * x + y * y < 1 ? Math.round(surf.foamAt(x, y) * 100) / 100 : -1); } return out; };
  const audio = fps => { const out = []; for (let f = 0; f < Math.ceil(DURATION * fps); f++) { const t = f / fps, p = pour.at(t), pp = pour.at(t - 1 / fps);
    out.push({ q: p.enter > .95 ? p.q : 0, h: clamp(p.h), v: Math.hypot(p.x - pp.x, p.y - pp.y) * fps, pin: p.pin?.on ? 1 : 0, enter: p.enter }); } return out; };

  Object.assign(window, {
    seek, DURATION, FPS, SIZE: [CW, CH],
    filmInfo: () => ({
      title: cfg.title, kicker: cfg.kicker, caption: cfg.caption, lang, duration: DURATION, intro: T.intro, outro0, pourEnd: pour.pourEnd,
      steps: pour.steps.map(s => ({ ...s })), spans: pour.spans.map(s => ({ ...s })), moves: (cfg.pour || []).map(m => ({ ...m })),
      drink: drink.name || 'custom', table: (cfg.table || {}).kind || 'wood', layout: tall ? 'tall' : 'wide', grid: N,
    }),
    __film: {
      fontsOk, texts: () => texts.slice(), at: t => { const p = pour.at(t); return { ...p, pin: p.pin ? { ...p.pin } : null }; }, pitcherScreen,
      foamStats, foamGrid, audio, camAt, levelAt, liqR, U,
      layout: { ...L, cupR, rimIn, liqMax, W: CW, H: CH, tall },
      colors: { crema: [CREMA0, CREMA1], foam: FOAM, ink: INK, table: table.base },
    },
  });

  if (Q.get('play')) return playMode();
  const t0 = Q.get('t');
  seek(t0 != null ? +t0 : 0);
  window.__ready = true;
  if (Q.get('render')) return;
  // live player: click / space pauses, ← → jump a second
  let playing = t0 == null, clock = t0 != null ? +t0 : 0, last = performance.now();
  const tick = now => { if (playing) { clock += (now - last) / 1000; if (clock > DURATION + 1.2) clock = 0; seek(Math.min(clock, DURATION)); } last = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const toggle = () => { playing = !playing; };
  canvas.addEventListener('click', toggle);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { clock = clamp(clock + (e.code === 'ArrowRight' ? 1 : -1), 0, DURATION - .001); seek(clock); }
  });

  // ── ?play=1: pour it yourself. Hold to pour (low = white), Shift / the button = high, drag to move, R = a new cup ──
  function playMode() {
    const S = new Surface({ n: +(Q.get('grid') || 224), seed, phys: cfg.sim?.phys || {} });
    let down = false, high = true, px = .3, py = 0, vx = 0, vy = 0, q = 0, h = 1, poured = 0, last = performance.now(), simT = 0;
    const ko = lang === 'ko';
    const btn = document.createElement('div');
    btn.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;font:600 14px system-ui,sans-serif;z-index:2';
    const mk = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'padding:10px 14px;border-radius:999px;border:0;background:rgba(20,16,12,.78);color:#f3ede4;cursor:pointer'; b.onclick = e => { e.stopPropagation(); fn(b); }; btn.appendChild(b); return b; };
    const hb = mk(ko ? '높이: 높게' : 'Height: high', b => { high = !high; b.textContent = ko ? `높이: ${high ? '높게' : '낮게'}` : `Height: ${high ? 'high' : 'low'}`; });
    mk(ko ? '새 잔' : 'New cup', () => reset());
    document.body.appendChild(btn);
    const reset = () => { const fresh = new Surface({ n: S.n, seed: seed + Math.floor(simT), phys: cfg.sim?.phys || {} }); S.foam.set(fresh.foam); S.tone.set(fresh.tone); poured = 0; };
    const toCup = e => { const r = canvas.getBoundingClientRect(), k = CW / r.width, x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k, Rl = liqMax * (.8 + .2 * Math.min(1, .5 + poured / 14)); return [(x - L.cx) / Rl, (y - L.cy) / Rl]; };
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', e => { down = true; [px, py] = toCup(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { const [x, y] = toCup(e); px = x; py = y; });
    addEventListener('pointerup', () => { down = false; });
    addEventListener('keydown', e => { if (e.key === 'Shift') { high = !high; hb.textContent = ko ? `높이: ${high ? '높게' : '낮게'}` : `Height: ${high ? 'high' : 'low'}`; } if (e.key === 'r' || e.key === 'R') reset(); });
    let sx = px, sy = py;
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const steps = Math.max(1, Math.round(dt * SIM_HZ));
      for (let i = 0; i < steps; i++) {
        q += ((down ? 1 : 0) - q) * .25; h += ((high ? 1 : 0) - h) * .12;
        const rr = Math.hypot(px, py), lim = .9, tx = rr > lim ? px / rr * lim : px, ty = rr > lim ? py / rr * lim : py;
        const nx = sx + (tx - sx) * .35, ny = sy + (ty - sy) * .35; vx = (nx - sx) * SIM_HZ; vy = (ny - sy) * SIM_HZ; sx = nx; sy = ny;
        if (q > .01) { S.step(1 / SIM_HZ, { x: sx, y: sy, q, h, dx: -1, dy: 0, vx, vy }, null); poured += q / SIM_HZ; }
        simT += 1 / SIM_HZ;
      }
      const Rl = liqMax * (.8 + .2 * Math.min(1, .5 + poured / 14));
      frame(outro0 - 2, S, { x: sx, y: sy, h, q, dx: -1, dy: 0, dir: 180, enter: 1, pin: null, step: -1, liqR: Rl, t: simT }, Math.max(.1, 1 - poured / 16), false);
      c.fillStyle = rgb(INK, .85); c.font = `500 ${28 * U}px ${FONTS.sans}`; c.textAlign = 'center';
      c.fillText(ko ? '누르고 있으면 붓기 · 끌어서 움직이기 · Shift 높이 · R 새 잔' : 'hold to pour · drag to move · Shift height · R new cup', CW / 2, CH * .93);
      c.textAlign = 'start';
      requestAnimationFrame(loop);
    };
    window.__ready = true;
    requestAnimationFrame(loop);
  }
}
