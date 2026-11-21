// engraving-collage-film · sheet.js — the cast sheet: every character in every view facing right AND left, the walk
// and run key poses, the jump with its wind-up, the wave, a stepped turn and idle frames — drawn on paper with the
// ground line and the joints marked. Review it (references/BRIEF.md, cast rubric) before writing any shot.
// It also measures what check.mjs fails on: joint ranges, planted-foot drift on the walk and run, idle motion, and
// that every big action winds up the opposite way first.
import { drawCharacter, solve, soles, walkPose, runPose, strideOf, idlePose, blinkAt, actionDelta, ACTIONS, STAND, FRONT_STAND, addPose, audit } from './rig.js';
import { PAPER_CSS } from './engrave.js';

/** measure one character's motion (numbers, not just pass / fail) */
export function motionReport(ch) {
  const out = { name: ch.name };
  for (const gait of ['walk', 'run']) {
    const pose = gait === 'run' ? runPose : walkPose, stride = strideOf(ch, gait), n = 480;
    // simulate a straight walk: hip x = distance, phase = distance / stride; track the planted sole
    // every sole point (heel, toe of each foot) that is on the ground in two samples running must not have moved
    let maxDrift = 0, prev = {};
    for (let i = 0; i <= n; i++) {
      const p = i / n * 2, x = p * stride, a = pose(p, ch);
      const s = soles(ch, { x, ground: 0, angles: a, air: a.air || 0, view: 'side' }), cur = {};
      for (const k of ['footN', 'footF']) s[k].forEach((q, j) => { if (q[1] > -0.6 && a[k === 'footN' ? 'stanceN' : 'stanceF']) { cur[k + j] = q[0]; if (prev[k + j] != null) maxDrift = Math.max(maxDrift, Math.abs(q[0] - prev[k + j]) / ch.px * 400); } });
      prev = cur;
    }
    out[gait] = { stride: +(stride / ch.px).toFixed(3), drift400: +maxDrift.toFixed(2) };
  }
  // idle: something moves within any 1 s window
  let still = 1e9;
  for (let t = 0; t < 6; t += 0.25) { const a = idlePose(ch, t), b = idlePose(ch, t + 1); still = Math.min(still, Math.max(...Object.keys(a).map(k => Math.abs((a[k] || 0) - (b[k] || 0))))); }
  out.idleMinDeg = +still.toFixed(2);
  // anticipation: the wind-up goes the opposite way to the main move
  out.antic = {};
  for (const [name, A] of Object.entries(ACTIONS)) {
    const mid = actionDelta(name, (A.antic[0] + A.antic[1]) / 2 * ch.mass, ch.mass), peakT = A.keys.reduce((m, k) => (Math.abs(sumD(k[1])) > Math.abs(sumD(m[1])) ? k : m))[0];
    const peak = actionDelta(name, peakT * ch.mass * 0.999, ch.mass), frames = Math.round((A.antic[1] - A.antic[0]) * ch.mass * 24);
    const key = name === 'jump' ? 'shinN' : name === 'lookUp' ? 'head' : name === 'turnStep' ? 'shinN' : name === 'wave' ? 'armF' : 'armN';
    const opp = name === 'jump' || name === 'turnStep' ? (mid[key] || 0) > 5 : Math.sign(mid[key] || 0) === -Math.sign(peak[key] || 0) && Math.abs(mid[key] || 0) > 2;
    out.antic[name] = { frames, opposite: opp };
  }
  return out;
}
const sumD = d => Object.values(d).reduce((s, v) => s + Math.abs(v), 0);

/** draw the sheet for a list of characters onto a canvas (it sizes itself); returns { audit, motion } */
export function castSheet(canvas, cast, o = {}) {
  const cols = 8, cw = o.cw ?? 260, rowH = o.rowH ?? 0;
  const list = Object.values(cast);
  const rowsPer = 5, maxPx = Math.max(...list.map(c => c.px));
  const sc = (o.figure ?? 300) / maxPx, rh = rowH || (o.figure ?? 300) * 1.32;
  canvas.width = cols * cw + 40; canvas.height = list.length * (rowsPer * rh + 70) + 30;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER_CSS; ctx.fillRect(0, 0, canvas.width, canvas.height);
  audit.length = 0;
  const motion = [];
  list.forEach((ch, ci) => {
    const y0 = 20 + ci * (rowsPer * rh + 70);
    ctx.fillStyle = '#3a302c'; ctx.font = '600 22px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${ch.name} · ${ch.height} m · ${ch.heads} heads · mass ${ch.mass}`, 24, y0 + 22);
    const cells = [];
    // row 1: views both ways
    for (const [view, f] of [['front', 1], ['threeq', 1], ['side', 1], ['back', 1], ['front', -1], ['threeq', -1], ['side', -1], ['back', -1]])
      cells.push([`${view} ${f > 0 ? '→' : '←'}`, { view, facing: f, angles: view === 'front' || view === 'back' ? FRONT_STAND : STAND }]);
    // row 2: walk keys (right), row 3: walk keys (left) — the 8 key poses
    for (const f of [1, -1]) for (let k = 0; k < 8; k++) cells.push([`walk ${k}/8 ${f > 0 ? '→' : '←'}`, { view: k % 2 ? 'threeq' : 'side', facing: f, angles: walkPose(k / 8, ch) }]);
    // row 4: run keys and the jump (wind-up → air → land)
    for (let k = 0; k < 4; k++) { const a = runPose(k / 4, ch); cells.push([`run ${k}/4 →`, { view: 'side', facing: 1, angles: a, air: a.air || 0 }]); }
    for (const [lbl, s] of [['jump wind-up', 0.3], ['jump take-off', 0.42], ['jump air', 0.62], ['jump land', 1.02]]) {
      const d = actionDelta('jump', s * ch.mass, ch.mass); cells.push([`${lbl} ←`, { view: 'side', facing: -1, angles: addPose(STAND, d), air: (d.rise || 0) * ch.px }]);
    }
    // row 5: wave (wind-up, up), point, look up, the stepped turn side → threeq → front, idle breath
    const act = (n, s, view = 'threeq', f = 1) => { const d = actionDelta(n, s * ch.mass, ch.mass); return { view, facing: f, angles: addPose(view === 'front' ? FRONT_STAND : STAND, d), air: (d.rise || 0) * ch.px }; };
    cells.push(['wave wind-up →', act('wave', 0.18)], ['wave ←', act('wave', 0.62, 'threeq', -1)], ['point →', act('point', 0.8, 'side')], ['look up ←', act('lookUp', 0.8, 'threeq', -1)]);
    cells.push(['turn 1 side', act('turnStep', 0.12, 'side')], ['turn 2 threeq', act('turnStep', 0.28, 'threeq')], ['turn 3 front', { view: 'front', facing: 1, angles: FRONT_STAND }], ['idle (inhale)', { view: 'threeq', facing: 1, angles: idlePose(ch, 0.8), breath: 1 }]);
    cells.forEach(([label, pose], i) => {
      const cx = 20 + (i % cols) * cw + cw / 2, row = Math.floor(i / cols), gl = y0 + 40 + row * rh + rh - 46;
      ctx.fillStyle = 'rgba(60,40,40,.25)'; ctx.fillRect(cx - cw / 2 + 14, gl, cw - 28, 2);
      ctx.save(); ctx.translate(cx, gl); ctx.scale(sc, sc);
      drawCharacter(ctx, ch, { x: 0, ground: 0, blink: 0, expr: 'neutral', ...pose });
      if (o.pins !== false) { const M = solve(ch, { x: 0, ground: 0, ...pose }); ctx.fillStyle = 'rgba(214,74,140,.85)'; for (const k of Object.keys(M)) if (Array.isArray(M[k])) { ctx.beginPath(); ctx.arc(M[k][4], M[k][5], 3.2 / sc, 0, Math.PI * 2); ctx.fill(); } }
      ctx.restore();
      ctx.fillStyle = '#4a3c36'; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, cx, gl + 22);
    });
    motion.push(motionReport(ch));
  });
  return { audit: [...audit], motion };
}
