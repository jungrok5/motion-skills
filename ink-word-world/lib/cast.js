// The cast sheet: every creature of a world posed the same eight ways — facing right and left, climbing and diving,
// straight up and down, turning each way — plus any poses of its own, with an arrow showing where it is supposed to be
// heading. Render it (scripts/stills.mjs --cast) and look before any scene is trusted: a head that points against its
// arrow, a back that points down, fins on the wrong side, a spine folded sharper than it could bend are all visible
// here in one picture. A world exports `cast`; cast.html calls castSheet(world, cast).
import { Chain } from './life.js';
import { INK, rgba } from './brush.js';

const POSES = [['→ 오른쪽', 0, 0], ['← 왼쪽', Math.PI, 0], ['↗ 오르기', -.6, 0], ['↙ 내려가기', Math.PI - .6, 0], ['↑ 위로', -Math.PI / 2, 0], ['↓ 아래로', Math.PI / 2, 0], ['오른쪽으로 돌기', 0, 1], ['왼쪽으로 돌기', Math.PI, -1]];

/**
 * cast: [{ word, about, view: 'side' | 'above', chain: { n, len, limit } (for a body on a spine) or nothing (a single
 *   agent { x, y, h, ph }), draw(ink, body, t), scale, poses: [{ label, draw(ink, x, y, t) }] (its own poses),
 *   standard: false to show only its own poses (a boat, a cart: things with a front but no body to bend) }]
 */
export async function castSheet(world, cast, el = document.body) {
  const o = world.o; try { const ff = new FontFace(o.font.family, `url(${o.font.url})`); document.fonts.add(await ff.load()); } catch (e) { console.error('ink-word-world: the brush font did not load'); }
  const cols = 4, cw = 420, chh = 300, head = 86, std = c => c.standard === false ? [] : POSES, rowsOf = c => Math.ceil((std(c).length + (c.poses ? c.poses.length : 0)) / cols);
  const W = cols * cw + 80, H = cast.reduce((s, c) => s + head + rowsOf(c) * chh, 0) + 120;
  const cv = document.createElement('canvas'), pr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * pr; cv.height = H * pr; cv.style.cssText = `width:min(100%,${W}px);display:block;margin:0 auto`;
  document.body.style.cssText = 'margin:0;background:#e9e4d4;overflow:auto;height:auto'; document.documentElement.style.cssText = 'height:auto;overflow:auto'; el.appendChild(cv);
  const x = cv.getContext('2d'); x.scale(pr, pr); x.fillStyle = '#e9e4d4'; x.fillRect(0, 0, W, H);
  x.fillStyle = INK.black; x.font = `44px "${o.font.family}", serif`; x.textBaseline = 'middle'; x.fillText(`${o.title} · 캐스트 시트`, 40, 50);
  x.font = '14px sans-serif'; x.fillStyle = rgba(INK.black, .6); x.fillText('화살표 = 가야 하는 방향. 머리가 화살표를 보고, 옆모습은 등이 위에 있고, 척추가 한계 안에서 굽는지 봅니다.', 40, 88);
  let y = 110; const report = {};
  for (const c of cast) {
    x.fillStyle = INK.black; x.font = `40px "${o.font.family}", serif`; x.fillText(c.word, 40, y + 44);
    x.font = '14px sans-serif'; x.fillStyle = rgba(INK.black, .65); x.fillText(`${c.view === 'above' ? '위에서 본 모습' : '옆모습'} · ${c.about || ''}`, 60 + x.measureText(c.word).width * 2.9, y + 48);
    const cells = std(c).map(p => ({ label: p[0], h: p[1], turn: p[2] })).concat((c.poses || []).map(p => ({ label: p.label, custom: p.draw })));
    cells.forEach((cell, i) => {
      const cx = 40 + (i % cols) * cw + cw / 2, cy = y + head + Math.floor(i / cols) * chh + chh / 2 - 6, s = c.scale || 1;
      x.strokeStyle = rgba(INK.black, .12); x.lineWidth = 1; x.strokeRect(40 + (i % cols) * cw + 6, y + head + Math.floor(i / cols) * chh + 6, cw - 12, chh - 12);
      x.fillStyle = rgba(INK.black, .6); x.font = '13px sans-serif'; x.fillText(cell.label, 40 + (i % cols) * cw + 18, y + head + Math.floor(i / cols) * chh + 26);
      x.save(); x.translate(cx, cy); x.scale(s, s);
      if (cell.custom) cell.custom(x, 0, 0, 1.3);
      else {
        const len = c.chain ? c.chain.n * c.chain.len : 60, hx = Math.cos(cell.h), hy = Math.sin(cell.h);
        let body;
        if (c.chain) { const bend = cell.turn * c.chain.limit * .85; body = new Chain(0, 0, cell.h, c.chain).pose(hx * len * .42, hy * len * .42, cell.h, bend); if (c.view !== 'above') body.sideView = true; report[c.word] = Math.max(report[c.word] || 0, Math.abs(bend)); }
        else body = { x: 0, y: 0, h: cell.h + cell.turn * .5, vx: hx, vy: hy, ph: 1.1, k: 1, i: i, scare: 0 };
        c.draw(x, body, 1.3);
        x.restore(); x.save(); x.translate(cx, cy);                                   // the heading arrow, beside the body
        const ax = -hy * (chh * .36), ay = hx * (chh * .36) * (Math.abs(hx) > .5 ? 1 : 1), ox = Math.abs(hx) > .5 ? 0 : ax, oy = Math.abs(hx) > .5 ? chh * .36 : 0;
        x.strokeStyle = x.fillStyle = INK.red; x.lineWidth = 2; x.beginPath(); x.moveTo(ox - hx * 34, oy - hy * 34); x.lineTo(ox + hx * 34, oy + hy * 34); x.stroke();
        x.beginPath(); x.moveTo(ox + hx * 44, oy + hy * 44); x.lineTo(ox + hx * 30 - hy * 7, oy + hy * 30 + hx * 7); x.lineTo(ox + hx * 30 + hy * 7, oy + hy * 30 - hx * 7); x.fill(); void ay;
      }
      x.restore();
    });
    y += head + rowsOf(c) * chh;
  }
  window.__cast = { ready: true, width: W, height: H, creatures: cast.map(c => c.word), bends: report };
}
