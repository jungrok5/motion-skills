// trail-texture-world · lib/kit.js — terrains that read the trail texture, and decorations (window.TK).
// A terrain is a plain object; these factories are examples of the vocabulary, every field can be overridden or written
// from scratch (see references/TRAIL.md "writing a terrain"):
//   base(x, y, n, e) → colour       the ground as baked once (e.d = 1–4 px from another terrain, e.other = its name)
//   px(c, S) → colour | undefined    every frame, for texels the trail touched (always: true → every texel, e.g. water)
//        S.foot  seconds since a foot pressed here (1e9 = never)   S.fs  1 = a step, 2 = a landing
//        S.body  seconds since the body covered it                 S.px, S.py  which way it was pushed
//        S.wave  ripple height here now                            S.footAt(dx, dy), S.bodyAt(dx, dy), S.waveAt(dx, dy)
//        S.x, S.y world pixel · S.t time · S.dither(v) ordered-dither test · set S.glow = 1 (unlit at night), S.emit = k (lights the ground)
//   rim: true                        also run px one texel above / below a print (for lit rims)
//   blades { … }                     tall blades scattered on it that bend away from the body and spring back
//   litter { … }                     loose bits (leaves) that the body pushes aside and that stay pushed
//   stepLight { c, r, life, k }       each step lights the ground round it (night)
//   step { sound, puff | splash, wake, sink, slow, line }   what a foot does here
//   life                             how long a print lasts here (s) — the texture keeps presses for the longest life
(function () {
'use strict';
const TT = window.TT, TK = {}, hex = TT.hex, mix = TT.mix, tone = TT.tone, clamp = TT.clamp;
const T = a => a.map(hex);

// ---------- terrains ----------
// snow: dents that keep their shape, a dark top wall and a bright lip below, filled back in by drift over `life` seconds
TK.snow = (o = {}) => { const tn = T(o.tones || ['#f4f8fd', '#e6eef8', '#d8e3f2']), dent = hex(o.dent || '#aec2e2'), deep = hex(o.deep || '#8ea7d0'), lip = hex(o.lip || '#ffffff'), edge = hex(o.edge || '#c3d2e8'), life = o.life || 40;
  return Object.assign({ kind: 'snow', life, rim: true, reads: ['foot'],
    base(x, y, n, e) { if (e.d === 1) return edge; let v = n.fbm(x, y, 70, 3) * .9; const dr = ((x * .45 + y + n.value(x, y, 24) * 14) % 31); if (dr < 1.3 && n.value(x, y, 40, 3) > .5) v += .5; if (n.rnd(x, y, 2) > .996) return lip; return tone(tn, v, x, y); },
    px(c, S) { const a = S.foot; if (a < life) { const k = a / life; if (!S.dither(1 - k * k * .9)) return; return S.footAt(0, -1) < life ? (S.fs > 1 ? deep : dent) : deep; }
      if (S.footAt(0, -1) < life * .8 && S.dither(1 - S.footAt(0, -1) / life)) return lip; },
    step: { sound: 'crunch', puff: { c: '#ffffff', c2: '#d9e5f5', n: 3, v: 9, up: 9, life: .4 }, sink: 1, slow: .88 } }, o.extra); };

// sand: shallow prints with a lit lip, ripples baked in, filled by wind over `life`
TK.sand = (o = {}) => { const tn = T(o.tones || ['#f0d39a', '#e6c385', '#d8b072']), dent = hex(o.dent || '#c99a5c'), deep = hex(o.deep || '#b08046'), lip = hex(o.lip || '#fbe6b8'), life = o.life || 45, rip = o.ripple ?? 1;
  return Object.assign({ kind: 'sand', life, rim: true, reads: ['foot'],
    base(x, y, n, e) { let v = n.fbm(x, y, 90, 3); const r = Math.sin((y + n.fbm(x, y, 60, 2, .5, 4) * 26) * .55); if (rip && r > .82) v += .45; else if (rip && r < -.9) v -= .2; if (n.rnd(x, y, 5) > .993) v += .6; return tone(tn, v, x, y); },
    px(c, S) { const a = S.foot; if (a < life) { if (!S.dither(1 - (a / life) ** 1.5)) return; return S.footAt(0, -1) < life ? dent : deep; }
      if (S.footAt(0, -1) < life && S.dither(.8 - S.footAt(0, -1) / life)) return lip; },
    step: { sound: 'hiss', puff: { c: o.puff || '#f3dba8', c2: '#d6b67e', n: 3, v: 11, up: 6, life: .45 }, slow: .9 } }, o.extra); };

// mud: deep dark prints that hold water (a shine pixel), almost never fill back in
TK.mud = (o = {}) => { const tn = T(o.tones || ['#5b4331', '#4e3929', '#433022']), dent = hex(o.dent || '#2b1d14'), wet = hex(o.wet || '#7d8f96'), lip = hex(o.lip || '#6e533d'), life = o.life || 90;
  return Object.assign({ kind: 'mud', life, rim: true, reads: ['foot'],
    base(x, y, n, e) { let v = n.fbm(x, y, 40, 3); if (n.rnd(x, y, 3) > .985) v += .7; return tone(tn, v, x, y); },
    px(c, S) { const a = S.foot; if (a < life) { if (!S.dither(1 - (a / life) ** 2)) return; if (a > .4 && S.footAt(-1, -1) < life && S.footAt(1, 0) >= life && (S.x + S.y) % 3 === 0) return wet; return dent; }
      if (S.footAt(0, -1) < life) return lip; },
    step: { sound: 'squelch', puff: { c: o.puff || '#3a281b', n: 2, v: 6, up: 5, life: .3 }, sink: 1, slow: .8 } }, o.extra); };

// tall grass / reeds: blades bend away from the body, overshoot and spring back; the ground under them darkens a while
TK.grass = (o = {}) => { const tn = T(o.tones || ['#5f8b2b', '#557f26', '#4a7221']), edge = hex(o.edge || '#2f4c17'), trod = hex(o.trod || '#3f6119');
  return Object.assign({ kind: 'grass', reads: ['body'], life: 0,
    base(x, y, n, e) { if (e.d === 1) return edge; if (e.d === 2 && e.other) return mix(edge, tn[1], .5); return tone(tn, n.fbm(x, y, 30, 3), x, y); },
    px(c, S) { if (S.body < 5 && S.dither((1 - S.body / 5) * .55)) return trod; },
    blades: Object.assign({ density: .5, h: [7, 12], colors: ['#2c5016', '#3d6a1c', '#558c26', '#7fb437', '#a9d556'], spring: 1.3, give: 1, wind: .7, life: 6 }, o.blades || {}),
    step: { sound: 'swish' } }, o.extra); };
TK.reeds = (o = {}) => TK.grass(Object.assign({ tones: ['#a99a5e', '#9b8c52', '#8c7e48'], edge: '#6b5d31', trod: '#7a6b3c' }, o,
  { blades: Object.assign({ density: .38, h: [10, 16], colors: ['#6e5c2c', '#8c7840', '#b19c58', '#d2bd76', '#ead8a0'], spring: 1.6, give: .9, wind: 1 }, o.blades || {}) }));

// water: always moving (a slow shimmer), every splash rings out from where it landed; the body wades (sinks) and slows
TK.water = (o = {}) => { const tn = T(o.tones || ['#5fb7c4', '#53a8b8', '#4796aa']), shallow = hex(o.shallow || '#7cccd2'), lightc = hex(o.light || '#a9e6ea'), ring = hex(o.ring || '#e6fbff'), ring2 = hex(o.ring2 || '#b4ecf2'), foam = hex(o.foam || '#d6f6f8'), bank = hex(o.bank || '#2f5e5a');
  return Object.assign({ kind: 'water', reads: ['wave', 'body'], always: true, life: 0,
    base(x, y, n, e) { if (e.d === 1) return bank; if (e.d && e.d <= 3) return shallow; let v = n.fbm(x, y, 80, 3); if (n.rnd(x, y, 7) > .997) v += .6; return tone(tn, v, x, y); },
    px(c, S) { const sh = Math.sin(S.x * .19 + S.y * .55 - S.t * 1.6) + Math.sin(S.x * .061 - S.y * .29 + S.t * .9);
      if (S.wave > .34) return ring; if (S.wave > .17) return ring2; if (S.body < .35 && S.dither(.5)) return foam; if (sh > 1.8 && S.dither(.55)) return lightc; },
    step: { sound: 'splash', wake: true, sink: 5, slow: .62, line: o.line || '#e3fbff', splash: { c: '#effdff', c2: '#a4dfe8', n: 5, v: 15, up: 16, life: .5, g: 90 } } }, o.extra); };

// glowing moss (night): each step lights up and fades; the print itself glows (unlit by the dark)
TK.moss = (o = {}) => { const tn = T(o.tones || ['#24433a', '#1f3a33', '#19312b']), spore = hex(o.spore || '#3f7d68'), glow = hex(o.glow || '#7dffd6'), glow2 = hex(o.glow2 || '#36c9a0'), life = o.life || 5;
  return Object.assign({ kind: 'moss', life, reads: ['foot', 'body'], emitColor: o.glow || '#7dffd6',
    base(x, y, n, e) { if (n.rnd(x, y, 9) > .985) return spore; return tone(tn, n.fbm(x, y, 26, 3), x, y); },
    px(c, S) { const a = S.foot; if (a < life) { const k = Math.exp(-a / (life * .3)); S.glow = 1; S.emit = k * .25; return mix(c, k > .4 ? glow : glow2, clamp(k * 1.6, .25, 1)); }
      if (S.body < 1.6 && S.dither((1 - S.body / 1.6) * .3)) { S.glow = 1; return glow2; } },
    stepLight: Object.assign({ c: o.glow || '#7dffd6', life: life * .8, k: .5 }, o.stepLight || {}),
    step: { sound: 'soft', puff: { c: o.glow || '#7dffd6', c2: '#2a8f74', n: 3, v: 7, up: 9, life: .7, g: 20 } } }, o.extra); };

// leaf litter: the body pushes leaves aside and they stay pushed (until the memory runs out); bare soil shows where it walked
TK.leaves = (o = {}) => { const tn = T(o.tones || ['#4a3526', '#41301f', '#38281b']), bare = hex(o.bare || '#2c2016'), life = o.life || 40;
  return Object.assign({ kind: 'leaves', life, reads: ['body'],
    base(x, y, n, e) { return tone(tn, n.fbm(x, y, 30, 3), x, y); },
    px(c, S) { if (S.body < life && S.dither(.35 * (1 - S.body / life))) return bare; },
    litter: Object.assign({ density: .16, colors: ['#b5532a', '#d1802c', '#8f3b1f', '#e2b34a', '#6e3a20'], push: 4.5, life }, o.litter || {}),
    step: { sound: 'crackle' } }, o.extra); };

// hard ground (paths, rock, boards): ignores the trail on purpose — the contrast that shows the others remember
TK.ground = (o = {}) => { const tn = T(o.tones || ['#a49a86', '#968c78', '#88806d']), edge = o.edge ? hex(o.edge) : null;
  return Object.assign({ kind: 'ground', reads: [], life: 0,
    base(x, y, n, e) { if (edge && e.d === 1) return edge; let v = n.fbm(x, y, o.cell || 24, 3); if (o.cracks && (n.value(x, y, 9) > .78 && n.value(x, y, 9) < .8)) v -= .6; if (n.rnd(x, y, 4) > .99) v += .5; return tone(tn, v, x, y); },
    step: { sound: o.sound || 'tap' } }, o.extra); };

// ---------- decorations ----------
// every decoration is pre-drawn once into a small pixel list; tall ones are y-sorted with the walker
function bake(w, h, fn) { const buf = new Uint32Array(w * h), P = TT.painter(buf, w, h); fn(P); const px = []; for (let i = 0; i < buf.length; i++) if (buf[i]) px.push(i % w, Math.floor(i / w), buf[i]); return px; }
const blit = (P, px, x, y) => { for (let i = 0; i < px.length; i += 3) P.px(x + px[i], y + px[i + 1], px[i + 2]); };
// a lit blob: tones dark → light, light from the top-left, outlined
function blob(P, cx, cy, rx, ry, tones, outline, n, seed = 0) {
  for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) {
    const q = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (q > 1) continue;
    const edgeQ = ((Math.abs(x) + 1) ** 2) / (rx * rx) + (y * y) / (ry * ry) > 1 || (x * x) / (rx * rx) + ((Math.abs(y) + 1) ** 2) / (ry * ry) > 1;
    if (outline != null && edgeQ) { P.px(cx + x, cy + y, outline); continue; }
    const l = clamp(.55 - x / rx * .32 - y / ry * .42 + (TT.hash(x, y, seed) - .5) * .18, 0, .999);
    P.px(cx + x, cy + y, tone(tones, l, cx + x, cy + y));
  }
}
TK.blob = blob;
// a boulder (cap: a colour on top, e.g. snow or moss)
TK.rock = (D, x, y, o = {}) => { const r = o.r || 6, ry = r * .72, tn = T(o.tones || ['#4f525a', '#6c707a', '#8d929c', '#b0b5be']), ol = hex(o.outline || '#2a2b31'), cap = o.cap ? hex(o.cap) : null, s = (x * 7 + y) | 0;
  const px = bake(r * 2 + 3, Math.ceil(ry * 2) + 4, P => { blob(P, r + 1, Math.ceil(ry) + 1, r, ry, tn, ol, null, s); if (cap) for (let yy = 0; yy < ry * .8; yy++) for (let xx = -r; xx <= r; xx++) { const q = (xx * xx) / (r * r) + ((yy - ry * .25) ** 2) / ((ry * .6) ** 2); if (q < .7 - TT.hash(xx, yy, s) * .25) P.px(r + 1 + xx, yy + 1, cap); } });
  D.tall(x, y, (P, sx, sy) => blit(P, px, sx - r - 1, sy - Math.ceil(ry * 2) - 1), { solid: o.solid ?? r * .9, name: 'rock' }); };
// a bush: lumpy, a few lit lumps
TK.bush = (D, x, y, o = {}) => { const r = o.r || 7, tn = T(o.tones || ['#284d1c', '#356526', '#4a8031', '#6aa040']), ol = hex(o.outline || '#16290f'), s = (x * 13 + y * 3) | 0, rnd = TT.rng(s + 1), dots = o.dots ? hex(o.dots) : null;
  const px = bake(r * 2 + 6, r * 2 + 4, P => { const lumps = 4 + Math.floor(rnd() * 3); for (let k = 0; k < lumps; k++) { const a = k / lumps * TT.TAU + rnd(), d = r * .45; blob(P, r + 3 + Math.round(Math.cos(a) * d), r + 1 + Math.round(Math.sin(a) * d * .6), r * .62, r * .5, tn, ol, null, s + k); }
    blob(P, r + 3, r + 1, r * .7, r * .55, tn, null, null, s + 9); if (dots) for (let k = 0; k < 5; k++) P.px(r + 3 + Math.round((rnd() - .5) * r * 1.2), r + Math.round((rnd() - .5) * r * .8), dots); });
  D.tall(x, y, (P, sx, sy) => blit(P, px, sx - r - 3, sy - r * 2 - 1), { solid: o.solid ?? r * .8, name: 'bush' }); };
// a tree seen from above at a slant: trunk at the base, a canopy above it (canopy does not block, trunk does)
TK.tree = (D, x, y, o = {}) => { const r = o.r || 16, tn = T(o.tones || ['#1d3b1b', '#2a5226', '#3b6e31', '#56903f']), ol = hex(o.outline || '#0f1f0e'), trunk = T(o.trunk || ['#3b2a1d', '#5a4029']), s = (x * 5 + y * 11) | 0, rnd = TT.rng(s + 3);
  const px = bake(r * 2 + 8, r * 2 + 18, P => { P.rect(r + 2, r + 6, 4, 12, trunk[0]); P.rect(r + 3, r + 6, 2, 12, trunk[1]); P.rect(r + 1, r + 16, 6, 2, trunk[0]);
    const lumps = 6 + Math.floor(rnd() * 3); for (let k = 0; k < lumps; k++) { const a = k / lumps * TT.TAU + rnd() * .5, d = r * .55; blob(P, r + 4 + Math.round(Math.cos(a) * d), r + 2 + Math.round(Math.sin(a) * d * .75), r * .5, r * .42, tn, ol, null, s + k); }
    blob(P, r + 4, r + 1, r * .62, r * .5, tn, null, null, s + 20); });
  D.tall(x, y, (P, sx, sy) => blit(P, px, sx - r - 4, sy - r * 2 - 17), { solid: o.solid ?? 3, name: 'tree' }); };
// a palm: a bent trunk and fronds
TK.palm = (D, x, y, o = {}) => { const h = o.h || 26, lean = o.lean ?? 5, tr = T(o.trunk || ['#6b4a2b', '#8c6538', '#a8814a']), fr = T(o.fronds || ['#2d5a1e', '#3f7a27', '#5c9e34', '#86c24a']), ol = hex(o.outline || '#1a2a10');
  const px = bake(48, h + 22, P => { const bx = 24, by = h + 20; for (let k = 0; k < h; k++) { const u = k / h, x2 = Math.round(bx + lean * u * u), y2 = by - k; P.px(x2 - 1, y2, ol); P.px(x2, y2, tr[k % 4 === 0 ? 0 : 1]); P.px(x2 + 1, y2, tr[2]); P.px(x2 + 2, y2, ol); }
    const tx = bx + lean, ty = by - h; for (let f = 0; f < 7; f++) { const a = f / 7 * TT.TAU + .3, len = 13 + (f % 2) * 4; for (let k = 0; k <= len; k++) { const u = k / len, x2 = Math.round(tx + Math.cos(a) * k), y2 = Math.round(ty + Math.sin(a) * k * .55 + u * u * 6); P.px(x2, y2 + 1, ol); P.px(x2, y2, fr[Math.min(3, Math.floor((1 - u) * 3 + (Math.sin(a) < 0 ? 1 : 0)))]); if (k % 3 === 1) P.px(x2, y2 + 1, fr[0]); } }
    blob(P, tx, ty, 3, 2, fr, ol, null, 3); });
  D.tall(x, y, (P, sx, sy) => blit(P, px, sx - 24, sy - h - 20), { solid: o.solid ?? 3, name: 'palm' }); };
// a fallen log (horizontal), blocks
TK.log = (D, x, y, o = {}) => { const len = o.len || 22, tn = T(o.tones || ['#3d2b1c', '#5a4029', '#76563a']), ol = hex(o.outline || '#22170e'), end = hex(o.end || '#a58660'), moss = o.moss ? hex(o.moss) : null;
  const px = bake(len + 2, 9, P => { P.rect(1, 1, len, 7, ol); P.rect(1, 2, len, 5, tn[1]); P.rect(1, 2, len, 1, tn[2]); P.rect(1, 6, len, 1, tn[0]); for (let k = 3; k < len - 2; k += 5) P.px(k, 4, tn[0]); P.rect(len - 2, 2, 2, 5, end); P.px(len - 1, 4, tn[0]); if (moss) for (let k = 2; k < len - 3; k++) if (TT.hash(k, 1, len) > .45) P.px(k, 1, moss); });
  D.tall(x, y, (P, sx, sy) => blit(P, px, sx - (len >> 1) - 1, sy - 8), { solid: o.solid ?? 0, name: 'log' }); };
// flat things painted into the ground once
TK.lily = (D, x, y, o = {}) => { const r = o.r || 3, tn = T(o.tones || ['#3f7f3a', '#56a04a', '#79c060']), fl = o.flower ? hex(o.flower) : null; D.flat(P => { blob(P, x, y, r, r * .7, tn, hex(o.outline || '#2a5a2a'), null, x); P.px(x + 1, y, hex(o.notch || '#4796aa')); P.px(x + 2, y, hex(o.notch || '#4796aa')); if (fl) { P.px(x - 1, y - 1, fl); P.px(x, y - 1, hex('#ffffff')); } }); };
TK.tuft = (D, x, y, o = {}) => { const c = T(o.tones || ['#3e6b22', '#5f9530', '#8cc04a']); D.flat(P => { P.px(x, y, c[0]); P.px(x - 1, y - 1, c[1]); P.px(x + 1, y - 1, c[1]); P.px(x, y - 2, c[2]); if (o.big) { P.px(x - 2, y - 2, c[1]); P.px(x + 2, y - 2, c[2]); } }); };
TK.pebble = (D, x, y, o = {}) => { const c = T(o.tones || ['#6f6a62', '#9c968b', '#c4beb2']); D.flat(P => { P.px(x, y, c[1]); P.px(x + 1, y, c[0]); P.px(x, y - 1, c[2]); }); };
TK.flower = (D, x, y, o = {}) => { const c = hex(o.c || '#f2c94c'), m = hex(o.mid || '#ffffff'); D.flat(P => { P.px(x, y + 1, hex(o.stem || '#3e6b22')); P.px(x - 1, y, c); P.px(x + 1, y, c); P.px(x, y - 1, c); P.px(x, y, m); }); };
// glowing mushrooms (night): a little light of their own
TK.shroom = (D, x, y, o = {}) => { const cap = hex(o.cap || '#9ff5ff'), st = hex(o.stem || '#d9e8e0'), ol = hex(o.outline || '#14302c');
  D.tall(x, y, (P, sx, sy) => { P.rect(sx - 1, sy - 3, 2, 3, st); P.rect(sx - 2, sy - 5, 4, 2, cap); P.px(sx - 3, sy - 4, ol); P.px(sx + 2, sy - 4, ol); P.rect(sx - 2, sy - 6, 4, 1, ol); if (P.glow) { for (let yy = sy - 6; yy < sy; yy++) for (let xx = sx - 3; xx <= sx + 2; xx++) if (xx >= 0 && yy >= 0 && xx < P.W && yy < P.H) P.glow[yy * P.W + xx] = 1; } }, { solid: 0 });
  D.light(x, y - 4, { r: o.r || 22, c: o.c || '#7ff0ff', k: o.k || .45, flicker: .05 }); };
// a lamp post (night)
TK.lamp = (D, x, y, o = {}) => { const post = hex(o.post || '#2a2622'), glass = hex(o.glass || '#ffe7a3'); const h = o.h || 16;
  D.tall(x, y, (P, sx, sy) => { P.rect(sx - 1, sy - h, 2, h, post); P.rect(sx - 2, sy - h - 4, 4, 4, post); P.rect(sx - 1, sy - h - 3, 2, 2, glass); if (P.glow) { P.glow[(sy - h - 3) * P.W + sx - 1] = 1; P.glow[(sy - h - 3) * P.W + sx] = 1; P.glow[(sy - h - 2) * P.W + sx - 1] = 1; P.glow[(sy - h - 2) * P.W + sx] = 1; } }, { solid: 2 });
  D.light(x, y - h - 2, { r: o.r || 60, c: o.c || '#ffd890', k: o.k || .9, flicker: .03 }); };
// scatter: call fn(x, y, rnd) at about `count` places on terrain `on` (name or list), at least `gap` px apart and away from `avoid`
TK.scatter = (D, o, fn) => { const rnd = TT.rng(o.seed || 7), pts = [], on = [].concat(o.on), box = o.box || [8, 8, D.w - 8, D.h - 8];
  for (let k = 0; k < (o.count || 20) * 40 && pts.length < (o.count || 20); k++) { const x = Math.round(box[0] + rnd() * (box[2] - box[0])), y = Math.round(box[1] + rnd() * (box[3] - box[1]));
    if (!on.includes(D.matAt(x, y))) continue; if (o.inset && [[-o.inset, 0], [o.inset, 0], [0, -o.inset], [0, o.inset]].some(([dx, dy]) => !on.includes(D.matAt(x + dx, y + dy)))) continue;
    if (pts.some(p => Math.hypot(p[0] - x, p[1] - y) < (o.gap || 20))) continue; if (o.avoid && o.avoid(x, y)) continue; pts.push([x, y]); fn(x, y, rnd); }
  return pts; };
// keep a decoration off the route: a helper for avoid() — distance from (x, y) to a polyline of points
TK.nearPath = (pts, d) => (x, y) => { for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy || 1, u = clamp(((x - ax) * vx + (y - ay) * vy) / L, 0, 1); if (Math.hypot(ax + vx * u - x, ay + vy * u - y) < d) return true; } return false; };

window.TK = TK;
})();
