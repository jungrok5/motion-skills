// logo-construction · ui.js — the editor cameos, drawn in screen pixels: cursors, a tool strip, an align panel and the
// size tooltip. Generic vector-editor furniture (no product's logo, name or icons): enough to read "a designer's screen".
import { clamp, lerp } from './core.js';

const PANEL = '#2c2c2f', PANEL2 = '#3a3a3e', ICON = '#cfcfd4', HI = '#3d7bff';

// tool strip: 18 tools down the left edge, the shape builder lights up when picked
const TB = { x: 30, y: 470, w: 72, rows: 18, step: 40 };
export const toolbar = { rect: TB, builder: { x: TB.x + TB.w / 2, y: TB.y + 34 + 10 * TB.step } };
const TOOLS = ['arrow', 'white', 'pen', 'type', 'line', 'rect', 'ellipse', 'brush', 'pencil', 'rotate', 'builder', 'scale', 'gradient', 'drop', 'blend', 'board', 'hand', 'zoom'];

export function drawToolbar(ctx, k, picked) {
  const x = TB.x - (1 - k) * 140, y = TB.y, w = TB.w, h = 34 + TB.rows * TB.step + 150;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  rr(ctx, x, y, w, h, 10); ctx.fillStyle = PANEL; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#56565b'; ctx.fillRect(x + 14, y + 12, w - 28, 3);
  TOOLS.forEach((tool, i) => {
    const cx = x + w / 2, cy = y + 34 + i * TB.step;
    if (tool === 'builder' && picked) { rr(ctx, cx - 22, cy - 17, 44, 34, 6); ctx.fillStyle = '#4b4b50'; ctx.fill(); }
    icon(ctx, tool, cx, cy, tool === 'builder' && picked ? '#fff' : ICON);
  });
  // fill / stroke swatches and a primary button
  const by = y + 34 + TB.rows * TB.step + 6;
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 30, by + 22, 30, 30); ctx.strokeStyle = '#d33'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x + 31, by + 51); ctx.lineTo(x + 59, by + 23); ctx.stroke();
  ctx.fillStyle = '#0e0e10'; ctx.fillRect(x + 14, by + 6, 30, 30); ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 14, by + 6, 30, 30);
  rr(ctx, x + 10, by + 92, w - 20, 34, 6); ctx.fillStyle = '#2d6cf0'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2 - 8, by + 115); ctx.lineTo(x + w / 2 + 8, by + 103); ctx.stroke();
  ctx.restore();
}

function icon(ctx, tool, x, y, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const L = (...p) => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.stroke(); };
  switch (tool) {
    case 'arrow': arrowPath(ctx, -5, -9, .62); ctx.fill(); break;
    case 'white': arrowPath(ctx, -5, -9, .62); ctx.stroke(); break;
    case 'pen': L(-6, 8, 0, -9, 6, 8); L(-3, 3, 3, 3); break;
    case 'type': L(-7, -8, 7, -8); L(0, -8, 0, 9); break;
    case 'line': L(-8, 8, 8, -8); break;
    case 'rect': ctx.strokeRect(-8, -7, 16, 14); break;
    case 'ellipse': ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 7, 0, 0, 7); ctx.stroke(); break;
    case 'brush': L(-7, 8, 6, -6); ctx.beginPath(); ctx.arc(-6, 7, 3, 0, 7); ctx.fill(); break;
    case 'pencil': L(-7, 8, 7, -6); L(-7, 8, -4, 4); break;
    case 'rotate': ctx.beginPath(); ctx.arc(0, 0, 7, .6, 5.6); ctx.stroke(); L(6, -7, 6, -2, 1, -3); break;
    case 'builder': ctx.beginPath(); ctx.arc(-3, 2, 6, 0, 7); ctx.stroke(); L(1, -8, 9, 6, -6, 6, 1, -8); L(6, -9, 6, -3); L(3, -6, 9, -6); break;
    case 'scale': ctx.strokeRect(-8, -2, 9, 9); L(-2, -8, 8, -8, 8, 2); break;
    case 'gradient': { const g = ctx.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, col); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(-8, -7, 16, 14); ctx.strokeRect(-8, -7, 16, 14); break; }
    case 'drop': L(-7, 8, -2, 3); L(-3, 2, 5, -6, 7, -4, -1, 4); break;
    case 'blend': ctx.strokeRect(-8, -8, 8, 8); ctx.beginPath(); ctx.arc(4, 4, 4.5, 0, 7); ctx.stroke(); L(-2, -2, 2, 2); break;
    case 'board': ctx.strokeRect(-6, -6, 12, 12); L(-9, -3, -6, -3); L(6, 3, 9, 3); L(-3, -9, -3, -6); L(3, 6, 3, 9); break;
    case 'hand': L(-4, 8, -6, 0, -6, -3); L(-3, -3, -3, -8); L(0, -3, 0, -9); L(3, -3, 3, -8); L(6, -1, 6, -5); L(-4, 8, 5, 8, 6, -1); break;
    case 'zoom': ctx.beginPath(); ctx.arc(-2, -2, 6, 0, 7); ctx.stroke(); L(2.5, 2.5, 8, 8); break;
  }
  ctx.restore();
}

// align panel: three rows of buttons; the cursor presses "distribute horizontal centres"
const AP = { x: 64, y: 1290, w: 560, h: 330 };
export const alignPanel = { rect: AP, button: { x: AP.x + 334, y: AP.y + 168 } };
export function drawAlignPanel(ctx, k, pressed) {
  const { x, y, w, h } = AP, s = lerp(.92, 1, k);
  ctx.save(); ctx.globalAlpha = clamp(k * 1.3);
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-x - w / 2, -y - h / 2);
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  rr(ctx, x, y, w, h, 10); ctx.fillStyle = PANEL; ctx.fill(); ctx.shadowColor = 'transparent';
  rr(ctx, x, y, w, 46, 10); ctx.fillStyle = PANEL2; ctx.fill(); ctx.fillRect(x, y + 30, w, 16);
  ctx.fillStyle = '#e6e6ea'; ctx.font = '600 22px LCSans'; ctx.textBaseline = 'middle'; ctx.fillText('Align', x + 22, y + 24);
  ctx.fillStyle = '#9a9aa0'; ctx.font = '500 19px LCSans';
  const rows = [['Align Objects:', 6, y + 84], ['Distribute Objects:', 6, y + 168], ['Distribute Spacing:', 2, y + 252]];
  for (const [label, n, ry] of rows) {
    ctx.fillStyle = '#9a9aa0'; ctx.fillText(label, x + 22, ry - 32);
    for (let i = 0; i < n; i++) {
      const bx = x + 22 + i * 62 + (i > 2 ? 26 : 0), on = pressed && label.startsWith('Distribute O') && i === 4;
      rr(ctx, bx, ry - 18, 48, 40, 6); ctx.fillStyle = on ? HI : '#38383c'; ctx.fill();
      ctx.fillStyle = on ? '#fff' : ICON;
      // little bar diagrams
      for (let j = 0; j < 3; j++) {
        const vertical = i > 2;
        if (vertical) ctx.fillRect(bx + 10 + j * 11, ry - 8 + (j % 2) * 4, 6, 20 - (j % 2) * 8);
        else ctx.fillRect(bx + 9 + (j % 2) * 5, ry - 10 + j * 9, 26 - (j % 2) * 10, 5);
      }
    }
  }
  ctx.fillStyle = '#9a9aa0'; ctx.fillText('Align To:', x + 330, y + 220);
  for (let i = 0; i < 3; i++) { rr(ctx, x + 330 + i * 62, y + 240, 48, 40, 6); ctx.fillStyle = i === 1 ? '#4b4b50' : '#38383c'; ctx.fill(); ctx.strokeStyle = ICON; ctx.lineWidth = 1.6; ctx.strokeRect(x + 342 + i * 62, y + 250, 24, 20); }
  ctx.restore();
}

export function drawTooltip(ctx, p, size) {
  const x = p[0] + 26, y = p[1] + 30, txt = [`W: ${size} px`, `H: ${size} px`];
  ctx.save(); ctx.font = '500 21px LCSans';
  const w = Math.max(...txt.map(s => ctx.measureText(s).width)) + 22;
  rr(ctx, x, y, w, 58, 6); ctx.fillStyle = 'rgba(240,240,242,.96)'; ctx.fill(); ctx.strokeStyle = '#c4c4c8'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#333'; ctx.textBaseline = 'middle'; ctx.fillText(txt[0], x + 11, y + 17); ctx.fillText(txt[1], x + 11, y + 41);
  ctx.restore();
}

// cursors: arrow (select), copy (alt-drag: a second, hollow arrow), builder (arrow + plus), direct (hollow arrow),
// cross (drawing a line or circle). `down` presses it a little.
export function drawCursor(ctx, p, kind = 'arrow', down = false) {
  ctx.save(); ctx.translate(p[0], p[1]); const s = down ? 1.48 : 1.6; ctx.scale(s, s);
  ctx.lineJoin = 'round';
  if (kind === 'cross') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; xh(ctx); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; xh(ctx);
    ctx.restore(); return;
  }
  if (kind === 'copy') { ctx.save(); ctx.translate(7, 7); arrowPath(ctx, 0, 0, 1); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore(); }
  arrowPath(ctx, 0, 0, 1);
  ctx.fillStyle = kind === 'direct' ? '#fff' : '#111'; ctx.strokeStyle = kind === 'direct' ? '#111' : '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fill(); ctx.stroke();
  if (kind === 'builder') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.4; plus(ctx); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; plus(ctx); }
  ctx.restore();
}
function xh(ctx) { ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-3, 0); ctx.moveTo(3, 0); ctx.lineTo(11, 0); ctx.moveTo(0, -11); ctx.lineTo(0, -3); ctx.moveTo(0, 3); ctx.lineTo(0, 11); ctx.stroke(); }
function plus(ctx) { ctx.beginPath(); ctx.moveTo(14, 17); ctx.lineTo(22, 17); ctx.moveTo(18, 13); ctx.lineTo(18, 21); ctx.stroke(); }
function arrowPath(ctx, x, y, s) {
  ctx.beginPath();
  const P = [[0, 0], [0, 19], [4.6, 14.6], [7.6, 21.4], [10.6, 20.1], [7.7, 13.6], [13.6, 13.6]];
  P.forEach(([a, b], i) => (i ? ctx.lineTo(x + a * s, y + b * s) : ctx.moveTo(x + a * s, y + b * s))); ctx.closePath();
}
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
