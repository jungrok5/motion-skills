// Page typesetter for pop-up-textbook: draws a lesson's left and right pages onto 2D canvases (they become the page
// textures) and returns the clickable regions in canvas pixels. Layout is fixed so every lesson reads the same way:
//   left  = running head · kicker · title · lead · formula box · key words · predict + options · challenge stamp · flap
//   right = running head · (diorama area) · numbered legend · figure caption · action line · speed choice
// Everything that does not fit is reported in `overflow` (the verify step prints it), never silently clipped.

export const CW = 1400, CH = 1848;                 // page canvas size (page aspect 1 : 1.32)
const SERIF = 'BookSerif, Georgia, serif', HAND = 'BookHand, cursive';
export const LAYOUT = {
  marginX: 96, marginW: 270,                       // margin column (handwritten notes, challenge stamp)
  mainX: 410, mainR: 1300,                         // main text column on the left page
  flapY: CH - 330, flapH: 150,                     // the WHY? flap
  dioramaY0: 150, dioramaY1: 1150,                 // right page area kept free for the pop-up
  rightX: 110, rightR: 1290,
};

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function caps(ctx, text, x, y, size, color, align = 'left', spacing = 3) {
  ctx.save(); ctx.font = `600 ${size}px ${SERIF}`; ctx.fillStyle = color; ctx.textAlign = align;
  ctx.letterSpacing = spacing + 'px'; ctx.fillText(String(text).toUpperCase(), x, y); ctx.restore();
}
function paper(ctx, th, side) {
  ctx.fillStyle = th.paper; ctx.fillRect(0, 0, CW, CH);
  // fibre speckle (seeded, so every draw is identical) and a darker gutter / outer edge
  let s = side === 'L' ? 7 : 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  ctx.globalAlpha = 0.05; ctx.fillStyle = '#7a6a4a';
  for (let i = 0; i < 1600; i++) ctx.fillRect(r() * CW, r() * CH, 1 + r() * 2, 1);
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(side === 'L' ? CW : 0, 0, side === 'L' ? CW - 160 : 160, 0);
  g.addColorStop(0, 'rgba(90,60,20,0.22)'); g.addColorStop(1, 'rgba(90,60,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
  const e = ctx.createLinearGradient(side === 'L' ? 0 : CW, 0, side === 'L' ? 40 : CW - 40, 0);
  e.addColorStop(0, 'rgba(90,60,20,0.12)'); e.addColorStop(1, 'rgba(90,60,20,0)');
  ctx.fillStyle = e; ctx.fillRect(0, 0, CW, CH);
}
function box(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// The flap front (also used as the 3D flap's texture so the printed and lifted flap look identical).
export function drawFlap(ctx, w, h, th, flap = {}) {
  ctx.fillStyle = th.flap; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(60,40,20,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([10, 7]); ctx.strokeRect(6, 6, w - 12, h - 12); ctx.setLineDash([]);
  caps(ctx, flap.kicker || 'Why?', 28, 42, 20, th.accent);
  ctx.fillStyle = th.ink; ctx.font = `italic 600 38px ${SERIF}`; ctx.fillText(flap.title || 'Lift the flap to see the answer', 28, 88);
  ctx.font = `italic 400 24px ${SERIF}`; ctx.fillStyle = th.soft; ctx.fillText(flap.sub || '…after you have made your prediction.', 28, 124);
  ctx.save(); ctx.font = `500 34px ${HAND}`; ctx.fillStyle = th.pencil; ctx.textAlign = 'right'; ctx.fillText('lift here', w - 40, 46);
  ctx.strokeStyle = th.pencil; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(w - 120, 64); ctx.quadraticCurveTo(w - 80, 90, w - 46, h - 30);
  ctx.moveTo(w - 46, h - 30); ctx.lineTo(w - 64, h - 40); ctx.moveTo(w - 46, h - 30); ctx.lineTo(w - 46, h - 52); ctx.stroke(); ctx.restore();
}

// st: { choice, flapOpen } — the parts of the lesson state that are printed on the left page.
export function drawLeft(ctx, L, book, st, th) {
  const { marginX, marginW, mainX, mainR, flapY, flapH } = LAYOUT, W = mainR - mainX;
  const regions = [], overflow = [];
  paper(ctx, th, 'L'); ctx.textBaseline = 'alphabetic';
  caps(ctx, L.head || `Lesson ${L.no} · ${L.title}`, marginX, 96, 18, th.soft, 'left', 4);
  let y = 200;
  caps(ctx, `${book.lessonWord || 'Lesson'} ${L.no}`, mainX, y, 22, th.accent); y += 68;
  ctx.fillStyle = th.ink; ctx.font = `700 64px ${SERIF}`;
  for (const ln of wrap(ctx, L.title, W)) { ctx.fillText(ln, mainX, y); y += 72; }
  regions.push({ id: 'title', side: 'L', x: mainX, y: 150, w: W, h: y - 170 });
  y -= 18;
  ctx.font = `400 30px ${SERIF}`; ctx.fillStyle = th.ink;
  for (const ln of wrap(ctx, L.lead || '', W)) { ctx.fillText(ln, mainX, y); y += 41; }
  y += 22;
  // formula box (+ handwritten working in the margin, level with it)
  const marginTop = y;
  if (L.formula) {
    const fh = L.formula.caption ? 176 : 140;
    box(ctx, mainX, y, W, fh, 10); ctx.fillStyle = th.tint; ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,20,0.18)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = th.ink; ctx.font = `italic 500 78px ${SERIF}`; ctx.textAlign = 'center';
    ctx.fillText(L.formula.text, mainX + W / 2, y + 96);
    if (L.formula.caption) { ctx.font = `italic 400 23px ${SERIF}`; ctx.fillStyle = th.soft; ctx.fillText(L.formula.caption, mainX + W / 2, y + 146); }
    ctx.textAlign = 'left';
    regions.push({ id: 'card:formula', side: 'L', x: mainX, y, w: W, h: fh });
    y += fh + 40;
  }
  if (L.margin?.length) {
    ctx.save(); ctx.font = `500 33px ${HAND}`; ctx.fillStyle = th.pencil;
    let my = marginTop + 30;
    for (const ln of L.margin) { ctx.save(); ctx.translate(marginX + 6, my); ctx.rotate(-0.025); ctx.fillText(ln, 0, 0); ctx.restore(); my += 40; }
    if (marginTop + 30 + L.margin.length * 40 > flapY - 230) overflow.push('margin notes run into the challenge stamp');
    for (const ln of L.margin) if (ctx.measureText(ln).width > marginW + 10) overflow.push(`margin note too wide: "${ln}"`);
    ctx.restore();
  }
  // key words
  if (L.terms?.length) {
    const y0 = y - 28;
    caps(ctx, book.termsWord || 'Key words', mainX, y, 19, th.accent); y += 42;
    const tx = mainX + 236, dx = tx + 20;
    for (const [term, def] of L.terms) {
      ctx.font = `700 26px ${SERIF}`; ctx.fillStyle = th.ink; ctx.textAlign = 'right';
      const tl = wrap(ctx, term, 226);
      tl.forEach((ln, i) => ctx.fillText(ln, tx, y + i * 32));
      ctx.textAlign = 'left'; ctx.font = `400 26px ${SERIF}`;
      const dl = wrap(ctx, def, mainR - dx);
      dl.forEach((ln, i) => ctx.fillText(ln, dx, y + i * 32));
      y += Math.max(tl.length, dl.length) * 32 + 12;
    }
    regions.push({ id: 'card:terms', side: 'L', x: mainX, y: y0, w: W, h: y - y0 - 6 });
    y += 26;
  }
  // predict
  if (L.predict) {
    const y0 = y - 28;
    caps(ctx, book.predictWord || 'Predict', mainX, y, 19, th.accent); y += 44;
    ctx.font = `600 30px ${SERIF}`; ctx.fillStyle = th.ink;
    for (const ln of wrap(ctx, L.predict.q, W)) { ctx.fillText(ln, mainX, y); y += 40; }
    regions.push({ id: 'card:predict', side: 'L', x: mainX, y: y0, w: W, h: y - y0 - 20 });
    y += 6;
    L.predict.options.forEach((opt, i) => {
      ctx.strokeStyle = th.ink; ctx.lineWidth = 2.2; ctx.strokeRect(mainX + 6, y - 24, 26, 26);
      if (st.choice === i) {           // a pencil tick
        ctx.save(); ctx.strokeStyle = th.pencil; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(mainX + 4, y - 12); ctx.lineTo(mainX + 17, y + 2); ctx.lineTo(mainX + 44, y - 38); ctx.stroke(); ctx.restore();
      }
      ctx.font = `400 28px ${SERIF}`; ctx.fillStyle = th.ink; ctx.fillText(opt, mainX + 50, y);
      regions.push({ id: 'opt:' + i, side: 'L', x: mainX, y: y - 34, w: Math.min(W, ctx.measureText(opt).width + 70), h: 46 });
      y += 46;
    });
  }
  if (y > flapY - 16) overflow.push(`left page text runs ${Math.round(y - flapY + 16)} px into the flap`);
  // challenge stamp
  if (L.challenge) {
    const cx = marginX + 112, cy = flapY - 120;
    ctx.save(); ctx.strokeStyle = th.accent; ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, 64, 0, 7); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, 54, 0, 7); ctx.stroke();
    ctx.fillStyle = th.accent; ctx.textAlign = 'center'; ctx.font = `700 48px ${SERIF}`; ctx.fillText(L.no, cx, cy + 17);
    ctx.restore();
    caps(ctx, book.challengeWord || 'Challenge', marginX, cy + 108, 17, th.accent);
    ctx.font = `italic 400 25px ${SERIF}`; ctx.fillStyle = th.ink; let cyy = cy + 142;
    for (const ln of wrap(ctx, L.challenge, marginW)) { ctx.fillText(ln, marginX, cyy); cyy += 31; }
    if (cyy > CH - 110) overflow.push('challenge text too long');
    regions.push({ id: 'challenge', side: 'L', x: marginX, y: cy - 70, w: marginW, h: 230 });
  }
  // flap (closed: the printed flap; open: the answer printed underneath)
  if (L.predict) {
    if (st.flapOpen) {
      ctx.fillStyle = 'rgba(120,90,40,0.06)'; ctx.fillRect(mainX, flapY, W, flapH);
      caps(ctx, 'Why?', mainX + 24, flapY + 34, 18, th.accent);
      ctx.font = `400 21px ${SERIF}`; ctx.fillStyle = th.ink; let ay = flapY + 64;
      const lines = wrap(ctx, L.predict.why, W - 48);
      for (const ln of lines.slice(0, 4)) { ctx.fillText(ln, mainX + 24, ay); ay += 26; }
      if (lines.length > 4) { ctx.fillStyle = th.soft; ctx.fillText('…', mainX + 24, ay); }
    } else {
      ctx.save(); ctx.shadowColor = 'rgba(60,40,10,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
      ctx.fillStyle = th.flap; ctx.fillRect(mainX, flapY, W, flapH); ctx.restore();
      ctx.save(); ctx.translate(mainX, flapY); drawFlap(ctx, W, flapH, th, L.flap); ctx.restore();
    }
    regions.push({ id: 'flap', side: 'L', x: mainX, y: flapY, w: W, h: flapH });
  }
  ctx.font = `400 24px ${SERIF}`; ctx.fillStyle = th.soft; ctx.fillText(String(L.page ?? L.no * 2 + 2), marginX, CH - 72);
  return { regions, overflow };
}

// st: { speed } — the chosen speed option is circled in pencil.
export function drawRight(ctx, L, book, st, th) {
  const { rightX, rightR, dioramaY1 } = LAYOUT, W = rightR - rightX;
  const regions = [], overflow = [];
  paper(ctx, th, 'R');
  caps(ctx, L.head || `${book.title}`, rightR, 96, 18, th.soft, 'right', 4);
  regions.push({ id: 'diorama', side: 'R', x: rightX, y: LAYOUT.dioramaY0, w: W, h: dioramaY1 - LAYOUT.dioramaY0 });
  let y = dioramaY1 + 46;
  if (L.legend?.length) {
    const cols = L.legendCols || 2, colW = W / cols, rows = Math.ceil(L.legend.length / cols);
    ctx.font = `400 25px ${SERIF}`;
    L.legend.forEach(([n, text], i) => {
      const c = Math.floor(i / rows), r = i % rows, x = rightX + c * colW, yy = y + r * 34;
      ctx.font = `700 25px ${SERIF}`; ctx.fillStyle = th.ink; ctx.fillText(n, x, yy);
      ctx.font = `400 25px ${SERIF}`; ctx.fillText(text, x + 30, yy);
      if (ctx.measureText(text).width + 40 > colW) overflow.push(`legend item too wide: "${text}"`);
      regions.push({ id: 'legend:' + n, side: 'R', x, y: yy - 26, w: colW - 10, h: 34 });
    });
    y += rows * 34 + 18;
  }
  if (L.fig) {
    ctx.font = `italic 400 24px ${SERIF}`; ctx.fillStyle = th.soft;
    for (const ln of wrap(ctx, L.fig, W)) { ctx.fillText(ln, rightX, y); y += 31; }
    y += 14;
  }
  if (L.action) {
    ctx.font = `italic 600 30px ${SERIF}`; ctx.fillStyle = th.ink;
    for (const ln of wrap(ctx, L.action, W)) { ctx.fillText(ln, rightX, y); y += 39; }
    y += 14;
  }
  if (L.speed) {
    ctx.font = `italic 400 25px ${SERIF}`; ctx.fillStyle = th.soft; ctx.fillText(book.speedWord || 'Speed', rightX, y);
    let x = rightX + 96;
    L.speed.options.forEach((opt, i) => {
      ctx.font = `${st.speed === i ? 600 : 400} 26px ${SERIF}`; ctx.fillStyle = th.ink;
      const w = ctx.measureText(opt).width; ctx.fillText(opt, x, y);
      if (st.speed === i) {           // pencil ellipse, drawn twice slightly off like a hand would
        ctx.save(); ctx.strokeStyle = th.ink; ctx.lineWidth = 2;
        for (const d of [0, 1]) { ctx.beginPath(); ctx.ellipse(x + w / 2 + d, y - 9 - d, w / 2 + 16 + d * 2, 22 - d, -0.03 + d * 0.04, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
      }
      regions.push({ id: 'speed:' + i, side: 'R', x: x - 14, y: y - 34, w: w + 28, h: 48 });
      x += w + 56;
    });
    y += 30;
  }
  if (y > CH - 110) overflow.push(`right page text runs ${Math.round(y - CH + 110)} px into the footer`);
  ctx.font = `400 24px ${SERIF}`; ctx.fillStyle = th.soft; ctx.textAlign = 'right';
  ctx.fillText(String((L.page ?? L.no * 2 + 2) + 1), rightR, CH - 72); ctx.textAlign = 'left';
  return { regions, overflow };
}
