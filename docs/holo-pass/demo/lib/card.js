// holo-pass · card.js — the ticket. Front and back are painted on canvases (1200 × 560 design px); the holographic
// foil, glitter and glare are CSS layers on top that follow the tilt. One card = one DOM element:
//   const card = HP.card(host, data, { dpr: 2 });  await card.ready;
//   card.draw(t)                       repaint the animated picture (front) — call every frame
//   card.pose({ rx, ry, flip, z })     tilt in degrees, flip 0 → 180 shows the back, z = lift
//   card.frontCanvas / card.backCanvas · card.setData(d)
(function () {
  const HP = (window.HP = window.HP || {});
  const CW = 1200, CH = 560, DX = 880, NR = 20, RAD = 18;
  const A = { x: 44, y: 76, w: 480, h: 380 };                 // stamp window = HP.ART_SIZE
  HP.CARD = { W: CW, H: CH, DX, ART: A };

  const MONO = '"JetBrains Mono", ui-monospace, monospace', SANS = 'Pretendard, "Apple SD Gothic Neo", "Hiragino Sans", "Noto Sans CJK KR", system-ui, sans-serif';
  const DISP = '"Barlow Condensed", ' + SANS, HAND = 'Caveat, ' + SANS;
  HP.FONTS = { MONO, SANS, DISP, HAND };
  HP.fontsReady = () => document.fonts ? Promise.all([`700 40px ${DISP}`, `500 20px ${MONO}`, `600 20px ${SANS}`, `500 30px ${HAND}`].map(f => document.fonts.load(f, 'AZaz09가나다あア漢'))).then(() => document.fonts.ready) : Promise.resolve();

  const cjk = s => /[぀-ヿ㐀-鿿가-힯]/.test(s);
  function fit(c, text, font, size, maxW) { c.font = font.replace('$', size); let w = c.measureText(text).width; if (w > maxW) { size = Math.max(6, size * maxW / w); c.font = font.replace('$', size); } return size; }
  const warn = m => { if (!HP.warnings.includes(m)) HP.warnings.push(m); };
  HP.warnings = [];
  function ellipsis(c, text, maxW) { if (c.measureText(text).width <= maxW) return text; if (text !== '—' && text.length > 1) warn(`"${text.slice(0, 24)}" is cut with … on the card`); let s = text; while (s && c.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }
  function wrap(c, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      const tokens = cjk(para) ? para.match(/\S+\s*|\s+/g) || [] : para.split(/(\s+)/);
      for (const tok of tokens) {
        if (c.measureText(line + tok).width <= maxW) { line += tok; continue; }
        if (line.trim()) out.push(line.trimEnd());
        line = '';
        if (c.measureText(tok).width > maxW) { for (const ch of tok) { if (c.measureText(line + ch).width > maxW) { out.push(line); line = ''; } line += ch; } }
        else line = tok.trimStart();
      }
      out.push(line.trimEnd());
    }
    return out;
  }
  const spaced = (c, text, x, y, sp, align = 'left') => {       // letter-spaced mono text
    const w = [...text].reduce((s, ch) => s + c.measureText(ch).width + sp, -sp); let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    for (const ch of text) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp; }
  };

  function shape(c, nx) {               // ticket outline with two half-circle notches at x = nx
    c.beginPath(); c.moveTo(RAD, 0); c.lineTo(nx - NR, 0); c.arc(nx, 0, NR, Math.PI, 0, true); c.lineTo(CW - RAD, 0); c.arcTo(CW, 0, CW, RAD, RAD);
    c.lineTo(CW, CH - RAD); c.arcTo(CW, CH, CW - RAD, CH, RAD); c.lineTo(nx + NR, CH); c.arc(nx, CH, NR, 0, Math.PI, true); c.lineTo(RAD, CH); c.arcTo(0, CH, 0, CH - RAD, RAD);
    c.lineTo(0, RAD); c.arcTo(0, 0, RAD, 0, RAD); c.closePath();
  }
  function paper(c, pal, nx, seed) {
    shape(c, nx); c.save(); c.clip();
    c.fillStyle = pal.paper; c.fillRect(0, 0, CW, CH);
    const r = HP.rng(seed);
    for (let i = 0; i < 7; i++) {          // pastel iridescence printed into the paper; the moving foil sits on top
      const x = r() * CW, y = r() * CH, rad = 220 + r() * 320, hue = (i * 57 + 300) % 360;
      const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `hsla(${hue},95%,78%,.30)`); g.addColorStop(1, `hsla(${hue},95%,78%,0)`);
      c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    }
    for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.18)'; c.fillRect(r() * CW, r() * CH, 1.2, 1.2); }
    c.strokeStyle = 'rgba(0,0,0,.10)'; c.lineWidth = 1.2; c.beginPath(); c.roundRect(12, 12, CW - 24, CH - 24, 10); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 34; y < CH - 26; y += 13) { c.beginPath(); c.arc(nx, y, 2.2, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  function stampFrame(c, x, y, w, h, b = 14, col = '#fff') {     // a postage-stamp border with a perforated edge
    c.save(); c.shadowColor = 'rgba(40,20,10,.22)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
    c.beginPath(); c.rect(x - b, y - b, w + b * 2, h + b * 2); c.fillStyle = col; c.fill(); c.restore();
    c.save(); c.globalCompositeOperation = 'destination-out'; const step = 13, r = 4.2;
    for (let px = x - b + step / 2; px < x + w + b; px += step) for (const py of [y - b, y + h + b]) { c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill(); }
    for (let py = y - b + step / 2; py < y + h + b; py += step) for (const px of [x - b, x + w + b]) { c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  function postmark(c, pal, x, y, r, top, bottom, rot = -0.2) {
    c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = 0.55; c.strokeStyle = pal.accent; c.fillStyle = pal.accent; c.lineWidth = 2.4;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.66, 0, Math.PI * 2); c.stroke();
    c.font = `600 ${r * 0.2}px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const arcText = (s, rr, start, dir) => { const chars = [...s], step = 0.24 * dir; chars.forEach((ch, i) => { const a = start + (i - (chars.length - 1) / 2) * step; c.save(); c.rotate(a); c.translate(0, -rr * dir); c.fillText(ch, 0, 0); c.restore(); }); };
    arcText(top, r * 0.83, 0, 1); arcText(bottom, r * 0.83, Math.PI, -1);
    c.font = `700 ${r * 0.3}px ${MONO}`; c.fillText('★', 0, 0);
    c.restore();
  }
  function qr(c, text, x, y, size, col) {
    if (!window.qrcode || !text) return;
    const q = qrcode(0, 'L'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = size / n; c.fillStyle = col;
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(x + k * cell, y + r * cell, cell + 0.35, cell + 0.35);
  }
  HP.drawQR = qr;
  function barcode(c, x, y, w, h, seed, col) { const r = HP.rng(seed); c.fillStyle = col; let px = x; while (px < x + w) { const bw = [1.5, 2.5, 4][Math.floor(r() * 3)]; if (r() > 0.35) c.fillRect(px, y, bw, h); px += bw + 1.5 + r() * 2; } }
  const shortDate = d => { const p = HP.parseDate(d.date); if (!p) return d.date || '—'; const w = HP.l(d, 'dow')[HP.dow(d)]; return `${p.y}.${String(p.m).padStart(2, '0')}.${String(p.d).padStart(2, '0')} ${d.lang === 'en' ? w.toUpperCase() : '(' + w + ')'}`; };
  const greet = d => d.lang === 'en' ? (d.to ? `Dear ${d.to},` : 'Hello,') : d.lang === 'ja' ? (d.to ? `${d.to}さんへ` : 'こんにちは') : (d.to ? `${d.to}에게` : '안녕하세요');

  // ---------- front ----------
  function paintFront(c, d, th, link) {
    const pal = th.pal; paper(c, pal, DX, HP.hash(d.no) + 1);
    c.textBaseline = 'alphabetic'; c.fillStyle = pal.sub; c.font = `500 15px ${MONO}`;
    spaced(c, HP.dots(d) || 'HOLO · PASS', 44, 48, 1.5); spaced(c, 'No. ' + d.no, DX - 30, 48, 1.5, 'right');
    c.fillStyle = pal.accent; c.font = `700 16px ${MONO}`; c.fillText('+', DX - 190, 49);
    stampFrame(c, A.x, A.y, A.w, A.h);
    // vertical title — first line on the right, letters' tops facing right
    // rotated +90°, glyphs grow to the right of their baseline by ~0.72 × size; the block spans x 552 … 812
    const lines = d.title.split('\n').filter(Boolean).slice(0, 3), L = A.h + 28;
    c.font = `700 100px ${DISP}`; const mw = Math.max(...lines.map(s => c.measureText(s).width), 1);
    const size = Math.min(L * 100 / mw, 260 / ((lines.length - 1) * 0.9 + 0.74), 150), colR = 812 - size * 0.74;
    if (size < 56) warn(`title is long: drawn at ${Math.round(size)} px (keep each line ≤ ~12 characters, at most 3 lines)`);
    c.fillStyle = pal.ink; c.font = `700 ${size}px ${DISP}`; c.textBaseline = 'alphabetic';
    lines.forEach((s, i) => { c.save(); c.translate(colR - i * size * 0.9, A.y - 14); c.rotate(Math.PI / 2); c.fillText(s, 0, 0); c.restore(); });
    // subtitle column: CJK stacked upright, Latin rotated
    const sub = d.subtitle; c.fillStyle = pal.ink;
    if (sub) {
      if (cjk(sub)) { const chars = [...sub]; let fs = Math.min(23, L / chars.length / 1.08); if (fs < 16) warn(`subtitle is long: ${chars.length} characters stacked at ${Math.round(fs)} px (keep it ≤ ~18)`); c.font = `600 ${fs}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'top'; chars.forEach((ch, i) => { if (/[a-z0-9ー〜～…‥\-—()（）「」『』]/i.test(ch)) { c.save(); c.translate(842, A.y - 14 + i * fs * 1.08 + fs * 0.5); c.rotate(Math.PI / 2); c.textBaseline = 'middle'; c.fillText(ch, 0, 0); c.restore(); c.textBaseline = 'top'; } else c.fillText(ch, 842, A.y - 14 + i * fs * 1.08); }); c.textAlign = 'left'; }
      else { c.save(); c.translate(834, A.y - 14); c.rotate(Math.PI / 2); fit(c, sub, `600 $px ${SANS}`, 21, L); c.textBaseline = 'middle'; c.fillText(sub, 0, 0); c.restore(); }
    }
    c.textBaseline = 'alphabetic'; c.fillStyle = pal.sub; c.font = `500 11px ${MONO}`;
    spaced(c, `ADMIT ONE · ${th.id.toUpperCase()} · KEEP THIS PASS`, 44, 524, 2);
    // stub
    const x0 = DX + 28, sw = CW - DX - 56;
    c.fillStyle = pal.ink; let y = 76;
    for (const s of lines) { const fs = fit(c, s, `700 $px ${DISP}`, 36, sw); c.fillText(s, x0, y); y += fs * 0.9; }
    c.fillStyle = pal.accent; fit(c, 'No.' + d.no, `700 $px ${DISP}`, 40, sw); c.fillText('No.' + d.no, x0, y + 30); y += 64;
    const field = (label, value, x, yy, w) => { c.fillStyle = pal.sub; c.font = `500 10.5px ${MONO}`; spaced(c, label, x, yy, 1.6); c.fillStyle = pal.ink; c.font = `650 17px ${SANS}`; c.fillText(ellipsis(c, value || '—', w), x, yy + 22); };
    field('DATE', shortDate(d), x0, y, 170); field('TIME', d.time || '—', x0 + 184, y, sw - 184);
    field('PLACE', d.place, x0, y + 52, sw); field('ENTRY', d.price, x0, y + 104, sw);
    const qs = 112, qy = CH - 52 - qs; c.fillStyle = '#fff'; c.fillRect(x0 - 6, qy - 6, qs + 12, qs + 12); qr(c, link, x0, qy, qs, pal.ink);
    c.fillStyle = pal.sub; c.font = `500 9.5px ${MONO}`; spaced(c, 'SCAN TO OPEN', x0, CH - 26, 1.2);
    const tx = x0 + qs + 18, tw = CW - 28 - tx;
    c.fillStyle = pal.sub; c.font = `500 10.5px ${MONO}`; spaced(c, 'TO', tx, qy + 12, 1.6); spaced(c, 'FROM', tx, qy + 66, 1.6);
    c.fillStyle = pal.ink; c.font = `700 18px ${SANS}`; c.fillText(ellipsis(c, d.to || '—', tw), tx, qy + 36); c.fillText(ellipsis(c, d.from || '—', tw), tx, qy + 90);
    c.fillStyle = pal.ink; c.beginPath(); const sx = CW - 40, sy = CH - 34; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 4.5 : 10; c.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } c.fill();
  }
  function paintFrontOver(c, d, th) {
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1.5; c.strokeRect(A.x, A.y, A.w, A.h);
    const p = HP.parseDate(d.date);
    postmark(c, th.pal, A.x + A.w - 26, A.y + A.h - 10, 54, 'HOLO PASS', p ? `${p.y}.${String(p.m).padStart(2, '0')}.${String(p.d).padStart(2, '0')}` : 'INVITE');
  }

  // ---------- back (a postcard) ----------
  function paintBack(c, d, th, artSnap) {
    const pal = th.pal, BX = CW - DX; paper(c, pal, BX, HP.hash(d.no) + 2);
    c.save(); c.translate(52 + 108, 64 + 128); c.rotate(-0.045); c.translate(-108, -128);
    stampFrame(c, 0, 0, 216, 256, 12);
    const s = Math.max(216 / A.w, 256 / A.h), w = A.w * s, h = A.h * s; c.save(); c.beginPath(); c.rect(0, 0, 216, 256); c.clip(); c.drawImage(artSnap, (216 - w) / 2, (256 - h) / 2, w, h); c.restore();
    c.restore();
    const p = HP.parseDate(d.date);
    postmark(c, pal, 248, 300, 50, 'HOLO PASS', p ? `${p.y}.${String(p.m).padStart(2, '0')}.${String(p.d).padStart(2, '0')}` : 'INVITE', 0.25);
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = pal.accent; c.lineWidth = 2.4; for (let k = 0; k < 4; k++) { c.beginPath(); for (let x = 150; x <= 300; x += 4) { const yy = 372 + k * 10 + Math.sin(x / 11) * 3; x === 150 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); } c.restore();
    barcode(c, 40, 420, 236, 40, HP.hash(d.no), pal.ink);
    c.fillStyle = pal.sub; c.font = `500 12px ${MONO}`; spaced(c, d.no.split('').join(' '), 40, 482, 1);
    c.font = `500 10.5px ${MONO}`; spaced(c, 'ADMIT ONE', 40, 524, 2);
    // the letter side
    const x0 = BX + 52, x1 = CW - 52, lw = x1 - x0;
    c.fillStyle = pal.sub; c.font = `500 12px ${MONO}`; spaced(c, 'POST CARD · ' + (HP.THEMES[d.theme].name.en || '').toUpperCase(), x0, 50, 2.5); spaced(c, 'No. ' + d.no, x1, 50, 1.5, 'right');
    c.fillStyle = pal.ink; fit(c, greet(d), `500 $px ${HAND}`, 46, lw); c.fillText(greet(d), x0, 118);
    const lh = 50, top = 176; c.strokeStyle = 'rgba(0,0,0,.13)'; c.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x0, top + i * lh + 12); c.lineTo(x1, top + i * lh + 12); c.stroke(); }
    c.font = `500 30px ${HAND}`; let msg = wrap(c, d.message, lw);
    if (msg.length > 5) { warn(`message is cut: ${msg.length} lines on the back, 5 fit`); msg = msg.slice(0, 5); msg[4] = ellipsis(c, msg[4] + '…', lw); }
    if (cjk(d.message)) c.font = `500 26px ${HAND}`;
    c.fillStyle = pal.ink; msg.forEach((s, i) => c.fillText(s, x0, top + i * lh));
    if (d.from) { c.font = `500 36px ${HAND}`; c.textAlign = 'right'; c.fillText('— ' + d.from, x1, top + 5 * lh + 2); c.textAlign = 'left'; }
    c.fillStyle = pal.sub; c.font = `500 13px ${MONO}`;
    c.fillText(ellipsis(c, [shortDate(d), d.time && d.time + (d.end ? '–' + d.end : ''), d.place, d.price].filter(Boolean).join('  ·  '), lw), x0, 526);
  }

  // ---------- masks, glitter ----------
  function maskURL(nx, dimArt) {
    const m = document.createElement('canvas'); m.width = CW / 2; m.height = CH / 2; const c = m.getContext('2d'); c.scale(0.5, 0.5);
    shape(c, nx); c.fillStyle = '#000'; c.fill();
    if (dimArt) { c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.6; c.fillRect(A.x, A.y, A.w, A.h); }
    return m.toDataURL();
  }
  let glitterURL = null;
  function glitter() {
    if (glitterURL) return glitterURL;
    const g = document.createElement('canvas'); g.width = g.height = 220; const c = g.getContext('2d'), r = HP.rng(77);
    for (let i = 0; i < 140; i++) { const x = r() * 220, y = r() * 220, s = 0.6 + r() * 1.6; c.fillStyle = `hsla(${r() * 360},100%,${75 + r() * 20}%,${0.5 + r() * 0.5})`; c.fillRect(x, y, s, s); if (r() > 0.88) { c.fillRect(x - 3, y + s / 2 - 0.4, 6 + s, 0.8); c.fillRect(x + s / 2 - 0.4, y - 3, 0.8, 6 + s); } }
    return (glitterURL = g.toDataURL());
  }

  // ---------- the card component ----------
  HP.card = (host, data, opt = {}) => {
    const dpr = opt.dpr || 2;
    const el = document.createElement('div'); el.className = 'hp-card';
    el.innerHTML = `<div class="hp-shadow"></div><div class="hp-flip">
      <div class="hp-face hp-front"><canvas></canvas><div class="hp-foil"></div><div class="hp-shine"></div><div class="hp-glitter"></div><div class="hp-glare"></div></div>
      <div class="hp-face hp-back"><canvas></canvas><div class="hp-foil"></div><div class="hp-shine"></div><div class="hp-glitter"></div><div class="hp-glare"></div></div></div>`;
    host.appendChild(el);
    const [fc, bc] = el.querySelectorAll('canvas');
    for (const cv of [fc, bc]) { cv.width = CW * dpr; cv.height = CH * dpr; }
    const base = document.createElement('canvas'), over = document.createElement('canvas'), snap = document.createElement('canvas');
    base.width = over.width = CW * dpr; base.height = over.height = CH * dpr; snap.width = A.w; snap.height = A.h;
    const art = document.createElement('canvas'); art.width = A.w * dpr; art.height = A.h * dpr;
    const flip = el.querySelector('.hp-flip');
    const set = (sel, prop, v) => el.querySelectorAll(sel).forEach(n => n.style.setProperty(prop, v));
    set('.hp-front .hp-foil, .hp-front .hp-shine, .hp-front .hp-glitter', '--mask', `url(${maskURL(DX, true)})`);
    set('.hp-front .hp-glare', '--mask', `url(${maskURL(DX, false)})`);
    set('.hp-back .hp-foil, .hp-back .hp-shine, .hp-back .hp-glitter, .hp-back .hp-glare', '--mask', `url(${maskURL(CW - DX, false)})`);
    set('.hp-glitter', 'background-image', `url(${glitter()})`);
    const api = { el, frontCanvas: fc, backCanvas: bc, d: null, th: null, img: null, t: 0 };
    let token = 0;
    api.setData = async d => {
      const my = ++token; d = HP.normalize(d); HP.warnings.length = 0; api.d = d; api.th = HP.THEMES[d.theme];
      el.style.setProperty('--accent', api.th.pal.accent);
      await HP.fontsReady();
      api.img = null;
      if (d.image) api.img = await new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = d.image; });
      if (my !== token) return;
      const link = opt.link ? opt.link(d) : location.href;
      const sc = snap.getContext('2d'); sc.clearRect(0, 0, A.w, A.h); if (api.img) HP.drawImageArt(sc, api.img, 1.3); else HP.ART[api.th.art](sc, 1.3, api.th.pal);
      for (const [cv, fn] of [[base, c => paintFront(c, d, api.th, link)], [over, c => paintFrontOver(c, d, api.th)], [bc, c => paintBack(c, d, api.th, snap)]]) {
        const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, CW, CH); fn(c);
      }
      api.draw(api.t);
    };
    api.draw = t => {
      api.t = t; if (!api.th) return;
      const ac = art.getContext('2d'); ac.setTransform(dpr, 0, 0, dpr, 0, 0); ac.clearRect(0, 0, A.w, A.h);
      if (api.img) HP.drawImageArt(ac, api.img, t); else HP.ART[api.th.art](ac, t, api.th.pal);
      const c = fc.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fc.width, fc.height);
      c.drawImage(base, 0, 0); c.drawImage(art, A.x * dpr, A.y * dpr); c.drawImage(over, 0, 0);
    };
    // rx/ry: tilt in degrees; flip: 0 front … 180 back; z: lift in px; light: 0–1 extra foil (sweeps)
    api.pose = ({ rx = 0, ry = 0, flip: f = 0, z = 0, light = 0 } = {}) => {
      flip.style.transform = `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry + f}deg)`;
      const yy = ((ry + f) % 360 + 360) % 360, back = yy > 90 && yy < 270, ery = back ? -(yy - 180) : (yy > 180 ? yy - 360 : yy);
      const mx = HP.clamp(50 + ery * 2.2, -20, 120), my = HP.clamp(50 - rx * 2.6, -20, 120), k = HP.clamp((Math.abs(rx) + Math.abs(ery)) / 22);
      el.style.setProperty('--mx', mx + '%'); el.style.setProperty('--my', my + '%');
      el.style.setProperty('--foil', (0.28 + 0.5 * k + 0.4 * light).toFixed(3)); el.style.setProperty('--glit', (0.25 + 0.6 * k + 0.3 * light).toFixed(3));
      el.style.setProperty('--sx', (-ery * 1.4) + 'px'); el.style.setProperty('--sy', (18 + rx * 0.8 + z * 0.15) + 'px');
    };
    api.ready = api.setData(data);
    api.pose({});
    return api;
  };
})();
