// torn-page-journey · sheet.js — the cast sheet: the rider in every medium facing RIGHT and LEFT, the pedal stroke, the idle
// breathing, and every gesture at its key poses (start · end of the anticipation · the action's peak · settled), so a body
// that cannot exist, a foot that leaves its pedal, a mirrored detail or a move that does not gather shows before it is in a film.
//   import { castSheet } from 'tpj/sheet.js'; castSheet(HANA, { gestures: ['wave', 'look'] });
import { MEDIA } from './media.js';
import * as Rider from './rider.js';
import { canvas, clamp } from './core.js';

export function castSheet(spec, o = {}) {
  const q = new URLSearchParams(location.search), S = +(q.get('scale') || 1), R = spec.R || 70;
  const media = o.media || Object.keys(MEDIA), gest = o.gestures || Object.keys({ ...Rider.GESTURES, ...(spec.gestures || {}) });
  const cw = 640, ch = 520, cols = 4, mediaRows = Math.ceil(media.length * 2 / cols), gRows = gest.length + 2;
  const W = cw * cols, H = 90 + ch * mediaRows + 70 + gRows * (ch * .7 + 20);
  const cv = canvas(W * S, H * S), ctx = cv.getContext('2d'); document.body.style.margin = '0'; document.body.style.background = '#2a2622'; cv.style.width = '100%'; document.body.appendChild(cv);
  const ground = () => 0, problems = [];
  const label = (txt, x, y, size = 22, col = '#f3ecdc') => { ctx.fillStyle = col; ctx.font = `${size}px system-ui, sans-serif`; ctx.fillText(txt, x, y); };
  const cell = (x, y, w, h, M, st, cap, k = 1) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); M.page(ctx, w, h, 3);
    ctx.save(); const sc = k * Math.min(w / (5.8 * R), h / (6.3 * R)); ctx.translate(w / 2, h * .9); ctx.scale(sc, sc); ctx.translate(-1.5 * R * (st.f || 1), 0);
    ctx.strokeStyle = 'rgba(80,60,40,.35)'; ctx.lineWidth = 2 / sc; ctx.beginPath(); ctx.moveTo(-4 * R, 0); ctx.lineTo(5 * R, 0); ctx.stroke();
    Rider.audit.length = 0; const J = Rider.draw(ctx, M, spec, { x: 0, ground, ...st }); for (const a of Rider.audit) problems.push(`${cap}: ${a}`);
    ctx.restore(); M.post(ctx, w, h, 5); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, w, 30); label(cap, x + 10, y + 21, 17);
    return J;
  };
  const draw = () => {
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.fillStyle = '#2a2622'; ctx.fillRect(0, 0, W, H);
    label(`${spec.name || 'rider'} — cast sheet: every medium, facing right and left · pedal stroke · breathing · gestures (start · anticipation · action · settled)`, 20, 52, 28);
    const base = { t: 1.2, crank: .9, wheel: .5, vs: 1, acc: 0, boil: 1, mood: 'calm' };
    media.forEach((m, i) => { for (const f of [1, -1]) { const k = i * 2 + (f > 0 ? 0 : 1); cell((k % cols) * cw, 90 + Math.floor(k / cols) * ch, cw - 6, ch - 6, MEDIA[m], { ...base, f }, `${m} · facing ${f > 0 ? 'right' : 'left'}`); } });
    let y = 90 + mediaRows * ch + 50; const gw = W / 8, gh = ch * .7;
    label('pedal stroke (feet stay on the pedals, knees forward)', 10, y - 12, 20);
    for (let k = 0; k < 8; k++) cell(k * gw, y, gw - 4, gh, MEDIA[media[0]], { ...base, crank: k / 8 * Math.PI * 2, wheel: k * .3 }, `crank ${k * 45}°`, 1.25);
    y += gh + 20; label('idle (coasting): the chest breathes, the eye blinks — compare the outlines', 10, y - 12, 20);
    for (let k = 0; k < 8; k++) cell(k * gw, y, gw - 4, gh, MEDIA[media[1] || media[0]], { ...base, t: k * .4, coast: true, crank: .9, vs: .6 }, `t ${(k * .4).toFixed(1)} s`, 1.25);
    for (const name of gest) {
      y += gh + 20; const G = (spec.gestures || {})[name] || Rider.GESTURES[name], issue = Rider.gestureProblem(G, name); if (issue) problems.push(issue);
      label(`${name} (${G.dur} s)${issue ? '  ✗ ' + issue : ''}`, 10, y - 12, 20, issue ? '#ff9a8a' : '#f3ecdc');
      const peakU = (() => { const ch0 = G.ch[G.main].map(k => ({ ...k, t: k.u })); let best = G.antic[1], bm = 0; for (let u = G.antic[1]; u <= G.act[1]; u += .01) { const v = Math.hypot(...['x', 'y', 'v'].map(p => { let prev = null; for (const k of ch0) { if (k[p] === undefined) continue; if (u < k.t) return prev ? prev[p] + (k[p] - prev[p]) * (u - prev.t) / (k.t - prev.t) : k[p]; prev = k; } return prev ? prev[p] : 0; })); if (v > bm) { bm = v; best = u; } } return best; })();
      const us = [[0, 'start'], [G.antic[1], 'anticipation'], [peakU, 'action'], [1, 'settled']];
      us.forEach(([u, cap], k) => { for (const f of [1, -1]) cell((k * 2 + (f > 0 ? 0 : 1)) * gw, y, gw - 4, gh, MEDIA[media[(k + 2) % media.length]], { ...base, f, coast: !!G.feetOff, gesture: { kind: name, u } }, `${cap} ${f > 0 ? '→' : '←'}`, 1.25); });
    }
    window.__problems = problems;
  };
  window.DURATION = 1; window.FPS = 1; window.SIZE = { W, H };
  window.seek = () => draw(); window.runChecks = () => [...new Set(problems)]; window.film = { shots: [{ name: 'cast', start: 0, dur: 1 }], dur: 1, fadeIn: 0, fadeOut: 0, boilFps: 1 };
  draw(); window.__ready = true;
}
