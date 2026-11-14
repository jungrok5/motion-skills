// shred-poster · 10_poster — the printed poster, drawn in code on a 2D canvas. Every letter is real type, so the
// shreds really are this poster. A film designs its own poster with SP.poster({ … draw(P) { … } }): P is a small
// layout kit in poster units (1000 wide × 1500 tall, y down from the top edge).
//
//   P.text(str, {x, y, size, role, weight, align, color, tracking, maxW})   one line on a baseline
//   P.fit(str, {x, y, w, cap, role, weight, tracking})                         biggest size that spans w, capitals ≤ cap
//   P.crop(str, {x, y, size, clip:[x,y,w,h], …})                               giant letters cut by a frame (texture)
//   P.columns(text, {x, y, w, h, cols, gap, size, lead, role, seed})           running text that repeats to fill
//   P.halftone(picture, {x, y, w, h, cell, mode:'object'|'photo'})             round-dot halftone of a picture
//   P.rule(x1, y1, x2, y2, width) · P.rect(x, y, w, h, color) · P.band(x, y, w, h)  (the accent band; skipped on the plain copy)
//   P.mark('hero', {y0, y1})  the rows the hero ribbon is cut from, the camera lunges at and the shredder bites
//   P.ctx (raw 2D context in poster units) · P.issue(msg) · P.paper / P.ink / P.accent / P.dark / P.plain
//
// SP.poster draws it twice: `hero` (with the accent band) and `plain` (without), so the accent rides on the hero
// ribbon alone in the cascade. Text that overflows its box or the sheet is reported in poster.issues (check.mjs fails).
{
  SP.FONT_DATA = typeof FONT_DATA !== 'undefined' ? FONT_DATA : [];
  SP.loadFonts = async () => {
    const faces = [];
    for (const f of SP.FONT_DATA) {
      const bin = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
      const face = new FontFace(f.family, bin.buffer, { weight: String(f.weight), style: f.style || 'normal', ...(f.range ? { unicodeRange: f.range } : {}) });
      document.fonts.add(face); faces.push(face.load().catch((e) => console.warn('font failed', f.family, e)));
    }
    await Promise.all(faces);
  };

  const UW = 1000, UH = 1500;
  SP.poster = async (spec) => {
    const px = spec.size || (SP.soft ? 1600 : 2048), k = px / UW;
    const fonts = { display: { family: 'serif', weight: 500 }, text: { family: 'serif', weight: 400 }, ...(spec.fonts || {}) };
    const issues = [], marks = {};
    const dark = SP.lum(spec.paper) < SP.lum(spec.ink);
    for (const role of Object.keys(fonts)) {
      const f = fonts[role];
      if (!document.fonts.check(`${f.weight} 40px "${f.family}"`)) issues.push(`font "${f.family}" ${f.weight} (${role}) is not loaded — add it with scripts/font.mjs`);
    }
    if (SP.contrast(spec.ink, spec.paper) < 4.5) issues.push(`ink on paper contrast ${SP.contrast(spec.ink, spec.paper).toFixed(2)} < 4.5`);
    const draw = (plain) => {
      const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * 1.5);
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = spec.paper; ctx.fillRect(0, 0, UW, UH);
      const font = (o) => { const f = fonts[o.role || 'display'] || { family: o.role, weight: 400 }; return `${o.weight || f.weight} ${o.size}px "${f.family}", sans-serif`; };
      const width = (str, o) => { ctx.font = font(o); const tr = (o.tracking || 0) * o.size; let w = 0; for (const ch of str) w += ctx.measureText(ch).width + tr; return w - tr; };
      const metr = (str, o) => { ctx.font = font(o); const m = ctx.measureText(str); return { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent }; };
      const capOf = (o) => { ctx.font = font(o); const m = ctx.measureText('H'); const kk = ctx.measureText('한'); return Math.max(m.actualBoundingBoxAscent, (kk.actualBoundingBoxAscent || 0) * 0.92); };
      const put = (str, x, y, o) => {
        ctx.font = font(o); ctx.fillStyle = o.color || spec.ink;
        const tr = (o.tracking || 0) * o.size;
        if (!tr) { ctx.textAlign = 'left'; ctx.fillText(str, x, y); return; }
        for (const ch of str) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + tr; }
      };
      const P = {
        W: UW, H: UH, ctx, plain, dark, paper: spec.paper, ink: spec.ink, accent: spec.accent, k,
        issue: (m) => { if (!plain) issues.push(m); },
        mark: (name, r) => { if (!plain) marks[name] = { x0: 0, x1: UW, ...r }; },
        measure: (str, o) => ({ w: width(str, o), cap: capOf(o), ...metr(str, o) }),
        rect: (x, y, w, h, color) => { ctx.fillStyle = color || spec.ink; ctx.fillRect(x, y, w, h); },
        band: (x, y, w, h, color) => { if (!plain) { ctx.fillStyle = color || spec.accent; ctx.fillRect(x, y, w, h); } if (!plain) marks.band = { x0: x, x1: x + w, y0: y, y1: y + h }; },
        rule: (x1, y1, x2, y2, wd = 2, color) => { ctx.strokeStyle = color || spec.ink; ctx.lineWidth = wd; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); },
        text: (str, o) => {
          const w = width(str, o); let x = o.x;
          if (o.align === 'right') x -= w; else if (o.align === 'center') x -= w / 2;
          if (o.maxW && w > o.maxW + 0.5) P.issue(`"${str}" is ${w.toFixed(0)} wide, its box is ${o.maxW}`);
          if (x < -0.5 || x + w > UW + 0.5) P.issue(`"${str}" runs off the sheet (${x.toFixed(0)}..${(x + w).toFixed(0)})`);
          put(str, x, o.y, o); return { x, w };
        },
        fit: (str, o) => {
          let lo = 4, hi = 2000;
          while (hi - lo > 0.5) { const mid = (lo + hi) / 2, oo = { ...o, size: mid }; if (width(str, oo) > o.w || (o.cap && capOf(oo) > o.cap)) hi = mid; else lo = mid; }
          const oo = { ...o, size: lo }, w = width(str, oo), m = metr(str, oo);
          put(str, o.x - (o.optical ?? 0.02) * lo, o.y, oo);
          return { size: lo, w, cap: capOf(oo), top: o.y - m.asc, bottom: o.y + m.desc };
        },
        crop: (str, o) => {
          const [cx, cy, cw, ch] = o.clip; ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, cw, ch); ctx.clip(); put(str, o.x, o.y, o); ctx.restore();
        },
        columns: (text, o) => {
          const cols = o.cols || 2, gap = o.gap ?? 18, cw = (o.w - gap * (cols - 1)) / cols, size = o.size || 20, lead = o.lead || size * 1.25;
          const of = { role: o.role || 'text', weight: o.weight, size };
          ctx.font = font(of); ctx.fillStyle = o.color || spec.ink;
          const words = text.split(/\s+/).filter(Boolean); if (!words.length) return;
          let i = ((o.seed || 0) * 37) % words.length, carry = '';
          const meas = (t) => ctx.measureText(t).width;
          for (let c = 0; c < cols; c++) {
            const x = o.x + c * (cw + gap);
            for (let y = o.y + size; y <= o.y + o.h + 0.01; y += lead) {
              let line = '';
              for (let guard = 0; guard < 200; guard++) {
                const wd = carry || words[i % words.length], t = line ? line + ' ' + wd : wd;
                if (meas(t) > cw) {
                  if (!line) {   // one word wider than the column (or CJK without spaces): break it by characters
                    let cut = ''; for (const ch of wd) { if (meas(cut + ch) > cw) break; cut += ch; }
                    line = cut || [...wd][0]; carry = wd.slice(line.length); if (!carry) i++;
                  }
                  break;
                }
                line = t; carry = ''; i++;
              }
              ctx.fillText(line, x, y);
            }
          }
        },
        halftone: (pic, o) => SP.halftone(ctx, pic, { ...o, k, paper: spec.paper, ink: spec.ink, dark }),
      };
      spec.draw(P);
      SP.paperGrain(ctx, cv, spec, dark);
      return cv;
    };
    const hero = draw(false), plain = draw(true);
    if (!marks.hero) issues.push('the poster marks no hero rows: call P.mark("hero", {y0, y1}) on the line the film is about');
    if (marks.band && spec.accent && SP.contrast(spec.ink, spec.accent) < 2) issues.push(`ink on the accent band contrast ${SP.contrast(spec.ink, spec.accent).toFixed(2)} < 2`);
    return { hero, plain, marks, issues, W: UW, H: UH, spec, dark };
  };

  // round-dot halftone. pic: (ctx, w, h) => draws a grey picture (white = paper) in pixels, or an image/canvas.
  // mode 'object': the backdrop turns into bare paper and the object is pushed dark, so it survives the shredder.
  SP.halftone = (ctx, pic, o) => {
    const k = o.k, w = Math.round(o.w * k), h = Math.round(o.h * k), cell = (o.cell || 10) * k;
    const src = document.createElement('canvas'); src.width = w; src.height = h;
    const sc = src.getContext('2d', { willReadFrequently: true }); sc.fillStyle = '#fff'; sc.fillRect(0, 0, w, h);
    if (typeof pic === 'function') pic(sc, w, h);
    else { const s = Math.max(w / pic.width, h / pic.height); sc.drawImage(pic, (w - pic.width * s) / 2, (h - pic.height * s) / 2, pic.width * s, pic.height * s); }
    const d = sc.getImageData(0, 0, w, h).data, L = (x, y) => { x = SP.clamp(x | 0, 0, w - 1); y = SP.clamp(y | 0, 0, h - 1); const i = (y * w + x) * 4; return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; };
    let bg = 1;
    if ((o.mode || 'object') === 'object') { const b = []; for (let x = 0; x < w; x += 4) b.push(L(x, 1), L(x, h - 2)); for (let y = 0; y < h; y += 4) b.push(L(1, y), L(w - 2, y)); b.sort((a, c) => a - c); bg = b[b.length >> 1]; }
    const nx = Math.ceil(w / cell), ny = Math.ceil(h / cell);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, o.x * k, o.y * k); ctx.fillStyle = o.color || o.ink;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = (i + 0.5 + (o.stagger && j % 2 ? 0.5 : 0)) * cell, cy = (j + 0.5) * cell;
      let s = 0, n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { s += L(cx + a * cell * 0.3, cy + b * cell * 0.3); n++; }
      let v = s / n;   // 1 = paper
      if ((o.mode || 'object') === 'object') { const obj = SP.sat((Math.abs(v - bg) - 0.025) / 0.05); v = obj > 0 ? SP.lerp(1, 0.06 + 0.92 * SP.sat((v - 0.2) / 0.7) ** 1.4, obj) : 1; }
      const r = Math.sqrt(Math.max(0, 1 - v)) * cell * 0.74;
      if (r > 0.45 * k) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, SP.TAU); ctx.fill(); }
    }
    ctx.restore();
  };

  // faint fibre and print unevenness, weaker on ink, so the sheet is paper and not a screen
  SP.paperGrain = (ctx, cv, spec, dark) => {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = cv.width, h = cv.height, img = ctx.getImageData(0, 0, w, h), d = img.data, pr = SP.hex(spec.paper).map((c) => c * 255);
    const lowW = Math.ceil(w / 48) + 2, lowH = Math.ceil(h / 48) + 2, low = new Float32Array(lowW * lowH);
    for (let i = 0; i < low.length; i++) low[i] = SP.hash(i, 17) * 2 - 1;
    const amp = dark ? 0.5 : 1;
    for (let y = 0; y < h; y++) {
      const gy = y / 48, iy = gy | 0, fy = gy - iy;
      for (let x = 0; x < w; x++) {
        const gx = x / 48, ix = gx | 0, fx = gx - ix;
        const a = low[iy * lowW + ix], b = low[iy * lowW + ix + 1], c = low[(iy + 1) * lowW + ix], e = low[(iy + 1) * lowW + ix + 1];
        const lf = (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
        const i = (y * w + x) * 4, ink = Math.abs(d[i] - pr[0]) + Math.abs(d[i + 1] - pr[1]) + Math.abs(d[i + 2] - pr[2]) > 150 ? 0.6 : 1;
        const n = ((SP.hash(x, y, 5) - 0.5) * 7 + lf * 6) * amp * ink;
        d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.96;
      }
    }
    ctx.putImageData(img, 0, 0); ctx.restore();
  };
}
