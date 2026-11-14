// 「퇴고」 · 10_poster — a poster for a Saturday writing circle that revises its drafts together (토요 퇴고 모임).
// Designed for this topic (see BRIEF.md): the paper is 원고지 (Korean manuscript paper) — cream stock, a grid of square
// cells in vermilion with a narrow gap between rows, one character per cell — and the editor's red pen marks it:
// a transposition mark (자리바꿈) loops through the headline, a word is struck out with a delete tail, another is
// inserted with a caret. The giant cropped letters are 初稿 (first draft); the picture is a worn pencil.
const PAPER = '#F3EEDF', INK = '#1E1B18', RED = '#D9482B';
const BODY = '처음 쓴 문장은 늘 너무 길다. 고쳐 쓰는 동안 문장은 잘리고, 흩어지고, 다시 줄을 선다. 버린 줄 알았던 말이 다른 자리에서 제 뜻을 찾기도 한다. ' +
  '토요일 오후마다 우리는 각자의 초고를 들고 와 소리 내어 읽고, 빨간 펜을 건네고, 한 줄씩 다시 쓴다. 완성은 없다. 다만 어제보다 조금 더 맞는 문장이 있을 뿐이다.';

// 원고지: square cells, one character each, a blank first cell, the gap row above each line of cells
const manuscript = (P, o) => {
  const c = P.ctx, { x, y, cols, rows, cell, gap } = o, pitch = cell + gap, W = cols * cell, H = rows * pitch - gap;
  c.save(); c.strokeStyle = RED; c.lineWidth = 1.3;
  c.lineWidth = 3; c.strokeRect(x - 6, y - gap - 6, W + 12, H + gap + 12); c.lineWidth = 1.2;
  for (let r = 0; r < rows; r++) { const yy = y + r * pitch; c.strokeRect(x, yy, W, cell); for (let k = 1; k < cols; k++) { c.beginPath(); c.moveTo(x + k * cell, yy); c.lineTo(x + k * cell, yy + cell); c.stroke(); } }
  c.restore();
  // lay the text into cells
  const chars = [...('　' + o.text)], pos = [];   // 　: the blank first cell of a paragraph
  let r = 0, k = 0;
  for (const ch of chars) { if (r >= rows) break; if (ch === ' ' && k === 0) continue; pos.push({ ch, x: x + k * cell + cell / 2, y: y + r * pitch + cell / 2 }); if (++k >= cols) { k = 0; r++; } }
  c.save(); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `400 ${cell * 0.66}px "Noto Serif KR"`;
  for (const p of pos) if (p.ch.trim()) c.fillText(p.ch, p.x, p.y + cell * 0.04);
  c.restore();
  const seq = pos.map((p) => p.ch).join('');
  return { find: (s) => { const i = seq.indexOf(s); return i < 0 ? null : pos.slice(i, i + [...s].length); }, cell, gap };
};

// the editor's pen: strokes with a slightly uneven width
const pen = (c, pts, w, color) => { c.save(); c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke(); c.restore(); };

const POSTER = () => SP.poster({
  paper: PAPER, ink: INK, accent: RED,
  fonts: { display: { family: 'Noto Serif KR', weight: 900 }, text: { family: 'Noto Serif KR', weight: 400 } },
  draw(P) {
    const M = 50, IW = P.W - 2 * M, c = P.ctx;
    const nameLine = (y, right) => {
      P.text('토요 퇴고 모임', { x: M, y, size: 27, role: 'text' });
      P.text(right, { x: P.W - M, y, size: 27, role: 'text', align: 'right' });
      P.rule(M, y + 14, P.W - M, y + 14, 2.5);
    };
    nameLine(66, '매주 토요일 오후 세 시');
    // the hero: 퇴고 on the vermilion band, its dictionary gloss and the hanja beside it
    P.band(0, 104, P.W, 332);
    const h = P.fit('퇴고', { x: M, y: 392, w: 600, cap: 262 });
    P.mark('hero', { y0: 104, y1: 436 });
    P.text('推', { x: 870, y: 214, size: 92, role: 'display' });
    P.text('敲', { x: 870, y: 318, size: 92, role: 'display' });
    P.text('글을 여러 번', { x: 712, y: 372, size: 19, role: 'text' });
    P.text('고치고 다듬음', { x: 712, y: 398, size: 19, role: 'text' });
    // the transposition mark (자리바꿈) loops through the two syllables, in the paper's colour
    // over the first syllable and under the second, crossing between them
    { const x0 = M + 8, x1 = M + h.w - 4, xm = (x0 + x1) / 2, top = 392 - h.cap - 22, bot = 392 + 26, mid = 392 - h.cap / 2;
      c.save(); c.strokeStyle = PAPER; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, mid);
      c.bezierCurveTo(x0, top, xm - 30, top, xm, mid); c.bezierCurveTo(xm + 30, bot, x1, bot, x1, mid); c.stroke(); c.restore(); }
    P.fit('고쳐 쓰는 동안', { x: M, y: 590, w: IW, cap: 112 });
    P.crop('初稿', { x: -30, y: 1060, size: 560, clip: [0, 640, P.W, 118] });
    P.rule(M, 770, P.W - M, 770, 6);
    // the manuscript block, then the editor's marks on it
    const ms = manuscript(P, { x: M, y: 800, cols: 14, rows: 6, cell: 40, gap: 8, text: BODY });
    const strike = ms.find('너무');
    if (strike) { const a = strike[0], b = strike[strike.length - 1]; pen(c, [[a.x - 16, a.y + 2], [b.x + 16, b.y - 2], [b.x + 24, b.y - 14], [b.x + 14, b.y - 18], [b.x + 20, b.y - 4], [b.x + 34, b.y + 8]], 3.2, RED); }
    const ins = ms.find('줄을');
    if (ins) { const a = ins[0], x0 = a.x - 20, y0 = a.y + 20; pen(c, [[x0 - 8, y0 + 4], [x0, y0 - 10], [x0 + 8, y0 + 4]], 3, RED); c.save(); c.fillStyle = RED; c.font = '400 15px "Noto Serif KR"'; c.textAlign = 'center'; c.fillText('나란히', x0, a.y - 23); c.restore(); }
    const circ = ms.find('완성은');
    if (circ) { const a = circ[0], b = circ[circ.length - 1]; c.save(); c.strokeStyle = RED; c.lineWidth = 2.6; c.beginPath(); c.ellipse((a.x + b.x) / 2, a.y, (b.x - a.x) / 2 + 26, 24, -0.04, 0, Math.PI * 2); c.stroke(); c.restore(); }
    // the picture: a worn pencil and eraser crumbs, drawn in grey and set as a halftone
    P.halftone((g, w, hh) => {
      g.save(); g.translate(w * 0.52, hh * 0.5); g.rotate(-0.62);
      const L = w * 0.92, R = hh * 0.1;
      const body = g.createLinearGradient(0, -R, 0, R); body.addColorStop(0, '#b4b4b4'); body.addColorStop(0.35, '#e6e6e6'); body.addColorStop(0.65, '#9c9c9c'); body.addColorStop(1, '#5a5a5a');
      g.fillStyle = body; g.fillRect(-L * 0.42, -R, L * 0.62, 2 * R);
      g.fillStyle = '#c8c8c8'; g.beginPath(); g.moveTo(L * 0.2, -R); g.lineTo(L * 0.36, -R * 0.18); g.lineTo(L * 0.36, R * 0.18); g.lineTo(L * 0.2, R); g.fill();   // sharpened wood
      g.fillStyle = '#202020'; g.beginPath(); g.moveTo(L * 0.33, -R * 0.26); g.lineTo(L * 0.4, 0); g.lineTo(L * 0.33, R * 0.26); g.fill();   // graphite
      const fer = g.createLinearGradient(0, -R, 0, R); fer.addColorStop(0, '#6a6a6a'); fer.addColorStop(0.4, '#f0f0f0'); fer.addColorStop(1, '#4a4a4a');
      g.fillStyle = fer; g.fillRect(-L * 0.52, -R * 1.04, L * 0.1, R * 2.08);
      g.fillStyle = '#5c5c5c'; g.beginPath(); g.roundRect(-L * 0.62, -R, L * 0.11, 2 * R, R * 0.5); g.fill();   // worn eraser
      g.restore();
      g.fillStyle = '#6e6e6e'; const rr = SP.rng(5); for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(w * rr.uni(0.08, 0.4), hh * rr.uni(0.72, 0.95), w * rr.uni(0.012, 0.03), w * rr.uni(0.008, 0.018), rr.uni(0, 3), 0, Math.PI * 2); g.fill(); }
    }, { x: 640, y: 792, w: 310, h: 292, cell: 8, mode: 'object' });
    P.columns(BODY, { x: M, y: 1100, w: IW, h: 64, cols: 3, size: 15, lead: 21, seed: 3, gap: 24 });
    nameLine(1222, '합평 · 낭독 · 고쳐 쓰기');
    P.fit('다시 쓰기', { x: M, y: 1452, w: IW, cap: 192 });
  },
});
