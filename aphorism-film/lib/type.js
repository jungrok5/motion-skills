// aphorism-film · type.js — the editorial quote: one line of thought set as a stack of mixed type, white over the picture.
//
//   await loadFonts()                       the bundled OFL faces (Playfair Display, Anton, Inter) → FontFace, before layout
//   addFont(family, url, descriptors)       a project font (e.g. a Korean serif) — call before loadFonts()
//   drawQuote(ctx, Q, t)                    draws quote Q at film time t (its build-in, hold and exit are pure functions of t)
//   quoteBox(Q, t)                          the stage rect the quote covers at t (null when not on screen) — check.mjs uses it
//
// Q = { t0, t1, x, y, size, align, col, shadow, scrim, by, src, byAt: 'below'|'side', out: 'smear'|'fade'|'drop'|'none',
//       lines: ['k:THE ONLY', 'd:true', 'D:wisdom', 'i:is knowing you know', 'D:nothing.'] }
// A line is one or more segments joined by ' | '. A segment is 'role:text'; 'role:a / b' stacks a and b small, top-aligned
// beside the previous big word (as in 'D:why | i:to live / can bear'). Roles (size is a fraction of Q.size):
//   k kicker (tracked caps, .11)   s small serif (.26)   i italic (.32)   I big italic (.72)   d serif (.55)
//   D display serif (1)            B black display (1)   g grotesk extra-bold (.6)   P condensed poster caps (.84, slanted)
import { clamp, ease, lerp, rgba, hash } from './core.js';

const FILES = [
  ['AF Didone', 'playfair-display-latin-400-normal.woff2', { weight: '400' }],
  ['AF Didone', 'playfair-display-latin-700-normal.woff2', { weight: '700' }],
  ['AF Didone', 'playfair-display-latin-900-normal.woff2', { weight: '900' }],
  ['AF Didone', 'playfair-display-latin-400-italic.woff2', { weight: '400', style: 'italic' }],
  ['AF Didone', 'playfair-display-latin-700-italic.woff2', { weight: '700', style: 'italic' }],
  ['AF Poster', 'anton-latin-400-normal.woff2', { weight: '400' }],
  ['AF Grotesk', 'inter-latin-400-normal.woff2', { weight: '400' }],
  ['AF Grotesk', 'inter-latin-800-normal.woff2', { weight: '800' }],
];
const EXTRA = [];
// a project font, e.g. addFont('AF Didone KR', './fonts/NotoSerifKR-subset.woff2') and FALLBACK.serif = '"AF Didone KR"'
export const FALLBACK = { serif: 'serif', sans: 'sans-serif' };
export function addFont(family, url, desc = {}) { EXTRA.push([family, url, desc, true]); }
let loaded = null;
export function loadFonts() {
  if (loaded) return loaded;
  const inline = (typeof window !== 'undefined' && window.__AF_FONTS) || {};
  loaded = Promise.all(FILES.concat(EXTRA).map(([fam, file, desc, abs]) => {
    const src = inline[file] || (abs ? new URL(file, document.baseURI).href : new URL('./fonts/' + file, import.meta.url).href);
    const f = new FontFace(fam, `url(${src})`, desc); document.fonts.add(f); return f.load();
  }));
  return loaded;
}

const ROLE = {
  k: { f: s => `400 ${s}px "AF Grotesk", ${FALLBACK.sans}`, k: .11, lead: 1.9, track: .38, caps: true, build: 'type' },
  s: { f: s => `400 ${s}px "AF Didone", ${FALLBACK.serif}`, k: .26, lead: 1.25, build: 'fade' },
  i: { f: s => `italic 400 ${s}px "AF Didone", ${FALLBACK.serif}`, k: .32, lead: 1.2, build: 'fade' },
  I: { f: s => `italic 400 ${s}px "AF Didone", ${FALLBACK.serif}`, k: .72, lead: 1.0, build: 'rise' },
  d: { f: s => `400 ${s}px "AF Didone", ${FALLBACK.serif}`, k: .55, lead: 1.0, build: 'rise' },
  D: { f: s => `400 ${s}px "AF Didone", ${FALLBACK.serif}`, k: 1, lead: .9, track: -.015, build: 'rise' },
  B: { f: s => `900 ${s}px "AF Didone", ${FALLBACK.serif}`, k: 1, lead: .9, track: -.02, build: 'rise' },
  g: { f: s => `800 ${s}px "AF Grotesk", ${FALLBACK.sans}`, k: .6, lead: .95, track: -.04, build: 'smear' },
  P: { f: s => `400 ${s}px "AF Poster", ${FALLBACK.sans}`, k: .84, lead: .98, caps: true, skew: -.18, build: 'slam' },
};
export const ROLES = Object.keys(ROLE);

let mctx = null;
const measure = (font, text, track) => { mctx = mctx || document.createElement('canvas').getContext('2d'); mctx.font = font; mctx.letterSpacing = track ? track + 'px' : '0px'; const m = mctx.measureText(text); return { w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent }; };

// layout once per quote (after fonts load): every run gets x, baseline y, font, size
function layout(Q) {
  if (Q._L) return Q._L;
  const S = Q.size || 140, runs = [], align = Q.align || 'left'; let y = 0, W = 0, li = 0;
  for (const raw of Q.lines) {
    const segs = raw.split(' | ').map(s => { const m = s.match(/^([a-zA-Z]):(.*)$/); if (!m || !ROLE[m[1]]) throw new Error(`type: bad segment "${s}" — use role:text with role one of ${ROLES.join(' ')}`); return { role: m[1], texts: m[2].split(' / ').map(x => x.trim()) }; });
    // line height = the tallest single segment; stacked segments sit beside it, top-aligned to its cap height
    let lineH = 0, cap = 0;
    for (const sg of segs) { const r = ROLE[sg.role], sz = S * r.k; if (sg.texts.length === 1) { lineH = Math.max(lineH, sz * r.lead); cap = Math.max(cap, sz * .72); } }
    if (!lineH) { const sg = segs[0], r = ROLE[sg.role], sz = S * r.k; lineH = sz * r.lead * sg.texts.length; cap = sz * .72; }
    y += lineH; let x = 0; const line = [];
    for (const sg of segs) {
      const r = ROLE[sg.role], sz = S * r.k, font = r.f(sz), track = (r.track || 0) * sz;
      if (sg.texts.length === 1) {
        const tx = r.caps ? sg.texts[0].toUpperCase() : sg.texts[0], m = measure(font, tx, track);
        line.push({ text: tx, role: sg.role, font, sz, track, x, y, w: m.w, asc: Math.max(m.asc, sz * .7), desc: m.desc, skew: r.skew || 0, li });
        x += m.w + sz * .22;
      } else {
        let yy = y - cap + sz * .95, ww = 0;
        for (const t0 of sg.texts) { const tx = r.caps ? t0.toUpperCase() : t0, m = measure(font, tx, track); line.push({ text: tx, role: sg.role, font, sz, track, x: x + sz * .05, y: yy, w: m.w, asc: Math.max(m.asc, sz * .7), desc: m.desc, skew: r.skew || 0, li }); ww = Math.max(ww, m.w); yy += sz * r.lead; }
        x += ww + sz * .3;
      }
    }
    const lw = x - (line.length ? line[line.length - 1].sz * .22 : 0); W = Math.max(W, lw);
    for (const r of line) r.lineW = lw;
    runs.push(...line); li++;
  }
  if (align !== 'left') for (const r of runs) r.x += align === 'right' ? W - r.lineW : (W - r.lineW) / 2;
  // attribution
  const by = [];
  if (Q.by) {
    const sz = S * .1, f1 = `400 ${sz}px "AF Grotesk", ${FALLBACK.sans}`, f2 = `italic 400 ${sz * 1.15}px "AF Didone", ${FALLBACK.serif}`;
    if ((Q.byAt || 'below') === 'below') {
      const y0 = y + S * .32; by.push({ rule: true, x: align === 'right' ? W - S * .5 : 0, y: y0 - sz * 1.4, w: S * .5 });
      by.push({ text: Q.by.toUpperCase(), font: f1, track: sz * .3, x: 0, y: y0, sz, align }); if (Q.src) by.push({ text: Q.src, font: f2, track: 0, x: 0, y: y0 + sz * 1.7, sz, align });
      y = y0 + (Q.src ? sz * 2.2 : sz * .5);
    } else {
      const x0 = W + S * .25, y0 = S * .5; by.push({ rule: true, x: x0, y: y0 - sz * 1.4, w: S * .35 });
      by.push({ text: Q.by.toUpperCase(), font: f1, track: sz * .3, x: x0, y: y0, sz, align: 'left' }); if (Q.src) for (const [j, ln] of wrap(Q.src, f2, S * 1.3).entries()) by.push({ text: ln, font: f2, track: 0, x: x0, y: y0 + sz * 1.7 + j * sz * 1.4, sz, align: 'left' });
      W = Math.max(W, x0 + S * 1.3);
    }
    for (const b of by) if (b.text && b.align === 'right') b.x = W - measure(b.font, b.text, b.track).w;
  }
  return Q._L = { runs, by, W, H: y, S, lines: li };
}
function wrap(text, font, maxW) { const out = []; let cur = ''; for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && measure(font, t, 0).w > maxW) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }

// timing of each line: build-in staggered from t0, exit before t1
const IN = .2, STAG = .2, OUT = .5;
export function quoteBox(Q, t) {
  if (t < Q.t0 || t > Q.t1) return null;
  const L = layout(Q), S = L.S;
  return { x: Q.x - S * .05, y: Q.y - S * .1, w: L.W + S * .1, h: L.H + S * .2, name: (Q.lines.find(l => /^[DBPgI]:/.test(l)) || Q.lines[0]).slice(2) };
}
export function drawQuote(ctx, Q, t) {
  if (t < Q.t0 || t > Q.t1) return;
  const L = layout(Q), S = L.S, col = Q.col || '#fbf7ee', lt = t - Q.t0, rem = Q.t1 - t, out = Q.out || 'smear';
  ctx.save(); ctx.translate(Q.x, Q.y);
  if (Q.scrim) { const g = ctx.createRadialGradient(L.W * .45, L.H * .5, S * .2, L.W * .45, L.H * .5, Math.max(L.W, L.H) * .85); g.addColorStop(0, rgba('#0b0810', Q.scrim * Math.min(1, lt / .6) * clamp(rem / .5))); g.addColorStop(1, rgba('#0b0810', 0)); ctx.fillStyle = g; ctx.fillRect(-S, -S, L.W + 2 * S, L.H + 2 * S); }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const sh = Q.shadow ?? .45;
  const shadow = a => { ctx.shadowColor = rgba('#0b0810', sh * a); ctx.shadowBlur = S * .05; ctx.shadowOffsetY = S * .012; };
  const nLines = L.lines;
  for (const r of L.runs) {
    const st = IN + r.li * STAG + (r.role === 'k' ? -.1 : 0), k = lt - st, role = ROLE[r.role];
    if (k <= 0) continue;
    const outK = out === 'none' ? 0 : clamp(1 - (rem - (nLines - 1 - r.li) * .06) / OUT);
    let a = 1, dx = 0, dy = 0, sc = 1, track = r.track, text = r.text, smear = 0;
    const build = Q.build || role.build;
    if (build === 'rise') { const e = ease.out(k / .75); dy = (1 - e) * r.sz * .45; a = clamp(k / .35); }
    else if (build === 'fade') { const e = ease.out(k / 1); a = clamp(k / .6); track = r.track + (1 - e) * r.sz * .25; }
    else if (build === 'type') { const n = Math.floor(k / .028); text = r.text.slice(0, n); a = 1; }
    else if (build === 'smear') { const e = ease.out(k / .5); dx = -(1 - e) * r.sz * 1.4; smear = 1 - e; a = clamp(k / .2); }
    else if (build === 'slam') { const e = clamp(k / .28); sc = e < 1 ? lerp(1.5, .97, ease.in(e)) : 1 - .03 * Math.exp(-(k - .28) * 18) * Math.cos((k - .28) * 40); a = clamp(k / .1); }
    if (outK > 0) {
      if (out === 'smear') { const e = ease.in(outK); dx += e * r.sz * 1.2; smear = Math.max(smear, e); a *= 1 - e; }
      else if (out === 'drop') { dy += ease.in(outK) * r.sz * .8; a *= 1 - ease.in(outK); }
      else a *= 1 - ease.sine(outK);
    }
    if (a <= .002 || !text) continue;
    ctx.save(); ctx.font = r.font; ctx.letterSpacing = track + 'px'; ctx.fillStyle = col;
    ctx.translate(r.x + dx, r.y + dy);
    if (r.skew) ctx.transform(1, 0, r.skew, 1, 0, 0);
    if (sc !== 1) { ctx.translate(r.w / 2, -r.asc / 2); ctx.scale(sc, sc); ctx.translate(-r.w / 2, r.asc / 2); }
    if (build === 'rise' && dy > .5 && outK === 0) { ctx.beginPath(); ctx.rect(-r.sz, -r.asc - r.sz * .2 - dy, r.w + r.sz * 2, r.asc + r.sz * .2 + r.desc + r.sz * .05); ctx.clip(); }
    if (smear > .02) {  // motion streaks: offset ghosts and speed lines, the 'whip' look of a word arriving or leaving
      ctx.globalAlpha = a * .22 * smear; for (let j = 1; j <= 5; j++) ctx.fillText(text, -j * r.sz * .09 * smear, 0);   // ghosts trail to the left: words always travel rightward
      ctx.fillStyle = col; for (let j = 0; j < 7; j++) { const yy = -r.asc * hash(j, r.li, 3), ln = r.sz * (.6 + hash(j, r.li, 4) * 1.6) * smear; ctx.globalAlpha = a * .5 * smear; ctx.fillRect(-ln * .8, yy, ln, Math.max(1, r.sz * .012)); }
    }
    ctx.globalAlpha = a; shadow(a); ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  // attribution: fades in after the last line, leaves with the quote
  const kb = clamp((lt - IN - nLines * STAG - .2) / .6) * (out === 'none' ? 1 : clamp(rem / OUT));
  if (kb > 0) for (const b of L.by) {
    ctx.save(); ctx.globalAlpha = kb; ctx.fillStyle = col; shadow(kb);
    if (b.rule) ctx.fillRect(b.x, b.y, b.w * ease.out(kb), Math.max(1.5, S * .008));
    else { ctx.font = b.font; ctx.letterSpacing = b.track + 'px'; ctx.fillText(b.text, b.x, b.y); }
    ctx.restore();
  }
  ctx.restore();
}
