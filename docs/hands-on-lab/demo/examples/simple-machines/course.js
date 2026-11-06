// Machines 101 — made from BRIEF.md to prove hands-on-lab designs a new course for a new topic (none of these parts,
// models or diagrams exist in the circuits example). 1 bench unit = 0.5 m; g = 10 N/kg; no friction.
import { si, fix } from '../../lib/lab.js';
import { COL, crate, weight, fulcrum, wedge, winch, balance, pulley, gear } from './parts.js';

const D2R = Math.PI / 180;
const N = (v, d = 0) => `${fix(v, d)} N`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const arrowSVG = (len, cls) => `<path d="M0,${-len} V-7" style="stroke:${cls === 'warm' ? '#e2543a' : '#1f8f72'};stroke-width:2.2"/><path d="M0,0 L-5,-9 L5,-9 Z" style="fill:${cls === 'warm' ? '#e2543a' : '#1f8f72'};stroke:none"/>`;

// ---------- 1 · the lever ----------
const PLANK = 3;                       // m
const lever = {
  id: 'lever',
  title: { en: 'The lever', ko: '지레' },
  overview: [
    { en: 'A lever is a stiff bar that turns about a pivot. What makes it turn is a moment: force × distance from the pivot.', ko: '지레는 받침점을 중심으로 도는 단단한 막대입니다. 막대를 돌리는 것은 모멘트, 곧 힘 × 받침점까지의 거리입니다.' },
    { en: 'Move the pivot towards the crate and a small weight far away can lift a heavy load close in.', ko: '받침점을 상자 쪽으로 옮기면, 멀리 놓인 작은 추로 가까이 있는 무거운 짐을 들 수 있습니다.' },
  ],
  try: [
    { text: { en: 'Balance the plank.', ko: '널빤지를 수평으로 맞춰 보세요.' }, when: (i, v) => i.weights > 0 && Math.abs(v.net) < 1 },
    { text: { en: 'Lift the 60 N crate with 3 weights or fewer.', ko: '추 3개 이하로 60 N 상자를 들어 보세요.' }, when: (i, v) => i.load === 60 && i.weights <= 3 && v.net > 0 },
    { text: { en: 'Make the crate side go down again.', ko: '다시 상자 쪽이 내려가게 해 보세요.' }, when: (i, v) => v.net < -1 && i.weights > 0 },
  ],
  parts: [
    { id: 'pivot', name: { en: 'Pivot', ko: '받침점' }, title: (i) => ({ en: `Pivot · ${fix(i.pivot, 2)} m from the end`, ko: `받침점 · 끝에서 ${fix(i.pivot, 2)} m` }), desc: { en: 'The point the plank turns about. Slide it along the 3 m plank.', ko: '널빤지가 도는 점입니다. 3 m 널빤지를 따라 옮길 수 있습니다.' } },
    { id: 'crate', name: { en: 'Load', ko: '짐' }, title: (i) => ({ en: `Load · ${i.load} N crate`, ko: `짐 · ${i.load} N 상자` }), desc: { en: 'Sits 0.25 m from the left end.', ko: '왼쪽 끝에서 0.25 m 떨어져 있습니다.' } },
    { id: 'weights', name: { en: 'Effort', ko: '힘' }, title: (i) => ({ en: `Effort · ${i.weights} × 10 N`, ko: `힘 · 10 N 추 ${i.weights}개` }), desc: { en: 'Brass weights, 10 N each, 0.25 m from the right end.', ko: '하나에 10 N인 놋쇠 추입니다. 오른쪽 끝에서 0.25 m.' } },
  ],
  inputs: { pivot: 1.5, load: 40, weights: 2 },
  controls: [
    { key: 'pivot', type: 'slider', part: 'pivot', label: { en: 'Pivot position', ko: '받침점 위치' }, min: 0.5, max: 2.5, step: 0.025, fmt: (v) => `${fix(v, 2)} m`, ends: ['0.5 m', '2.5 m'] },
    { key: 'load', type: 'choice', part: 'crate', label: { en: 'Load', ko: '짐' }, options: [20, 40, 60], fmt: (v) => `${v} N` },
    { key: 'weights', type: 'slider', part: 'weights', label: { en: 'Weights', ko: '추' }, min: 0, max: 8, step: 1, fmt: (v) => `${v} × 10 N`, ends: ['0', '8'] },
  ],
  rebuild: ['load'],
  view: { az: 14, el: 22, zoom: 0.95 },
  thumb: { az: 20, el: 24 },
  init: () => ({ ang: 0, w: 0 }),
  step(m, dt, i) {
    const v = lever.solve(i, m);
    const target = Math.abs(v.net) < 1 ? 0 : Math.sign(v.net) * 11 * D2R;
    m.w += (38 * (target - m.ang) - 8 * m.w) * dt; m.ang += m.w * dt;
    return m;
  },
  solve(i, m = {}) {
    const dL = i.pivot - 0.25, dE = PLANK - 0.25 - i.pivot, E = i.weights * 10;
    const ML = i.load * dL, ME = E * dE;
    return { dL, dE, E, ML, ME, net: ME - ML, need: (i.load * dL) / dE, ang: m.ang ?? 0 };
  },
  build(k, c) {
    const i = c.inp, T = c.T;
    const fu = fulcrum(k, { h: 1.0 });
    const tilt = k.group({ at: [0, 1.0, 0] });
    const plank = k.group({ parent: tilt });
    k.box(6.0, 0.2, 1.0, { at: [0, 0.1, 0], color: COL.wood, parent: plank, r: 0.04, part: 'plank' });
    for (let x = -3; x <= 3.001; x += 1) k.box(0.03, 0.005, 0.3, { at: [x * 0.98, 0.203, 0.32], color: '#6b4a2a', parent: plank, outline: false });
    const cs = 0.7 + i.load / 200;
    const cr = crate(k, { parent: plank, at: [-2.5, 0.2, 0], size: cs, text: `${i.load} N` });
    const ws = [];
    for (let n = 0; n < 8; n++) ws.push(weight(k, { parent: plank, at: [2.5, 0.2 + n * 0.21, 0] }));
    const wtop = k.group({ parent: plank, at: [2.5, 0.2, 0] });
    k.label('pivot', fu.g, T({ en: 'Pivot', ko: '받침점' }), { offset: [0, 0.45, 0.75] });
    k.label('crate', cr.g, T({ en: 'Load', ko: '짐' }), { offset: [0, cs + 0.35, 0] });
    k.label('weights', wtop, T({ en: 'Effort', ko: '힘' }), { offset: [0, 0.6, 0] });
    const mL = k.label(null, cr.g, '', { kind: 'value', offset: [0, -0.35, 0.75] });
    const mE = k.label(null, wtop, '', { kind: 'value', offset: [0, -0.35, 0.75] });
    return (v, inp) => {
      const px = inp.pivot * 2 - 3;
      fu.g.position.x = px; tilt.position.x = px; plank.position.x = -px; tilt.rotation.z = -v.ang;
      ws.forEach((w, n) => (w.visible = n < inp.weights));
      wtop.position.y = 0.2 + inp.weights * 0.21;
      mL.set(`${fix(v.ML, 1)} N·m`); mE.set(`${fix(v.ME, 1)} N·m`); mE.show(inp.weights > 0);
    };
  },
  schematicSize: [300, 150],
  schematic(s, v, i, c) {
    const X = (m) => 30 + (m / PLANK) * 240, y = 70, px = X(i.pivot), a = clamp(v.ang, -0.3, 0.3);
    const rot = (x) => [px + (x - px) * Math.cos(a), y + (x - px) * Math.sin(a)];
    const [x0, y0] = rot(30), [x1, y1] = rot(270), [lx, ly] = rot(X(0.25)), [ex, ey] = rot(X(PLANK - 0.25));
    s.raw(`<path class="sc-wire" d="M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)}" style="stroke-width:4;stroke-linecap:round"/>`);
    s.part('pivot', px, y + 2, `<polygon points="0,0 -11,20 11,20" style="fill:#fbd2c9"/><line x1="-18" y1="20" x2="18" y2="20"/>`, { hw: 16, hh: 14, label: `${fix(i.pivot, 2)} m`, labelAt: [0, 36] });
    s.part('crate', lx, ly - 2, arrowSVG(30, 'warm'), { hw: 12, hh: 18, label: `${i.load} N`, labelAt: [0, -40] });
    if (i.weights > 0) s.part('weights', ex, ey - 2, arrowSVG(12 + i.weights * 4, 'acc'), { hw: 12, hh: 18, label: `${i.weights * 10} N`, labelAt: [0, -46] });
    else s.part('weights', ex, ey - 2, '<circle r="3" class="soft"/>', { hw: 12, hh: 12, label: '0 N', labelAt: [0, -20] });
    s.raw(`<path class="sc-wire" d="M${X(0.25)},122 H${px - 2} M${px + 2},122 H${X(PLANK - 0.25)}" style="stroke-width:1;stroke-dasharray:2 2"/>`);
    s.text((X(0.25) + px) / 2, 118, `dL ${fix(v.dL, 2)} m`, { cls: 'warm' });
    s.text((px + X(PLANK - 0.25)) / 2, 118, `dE ${fix(v.dE, 2)} m`, { cls: 'acc' });
    s.text(150, 144, Math.abs(v.net) < 1 ? c.T({ en: 'balanced', ko: '평형' }) : v.net > 0 ? c.T({ en: 'effort side goes down', ko: '힘 쪽이 내려감' }) : c.T({ en: 'load side goes down', ko: '짐 쪽이 내려감' }), { cls: 'cap' });
  },
  chart: {
    title: { en: 'Effort needed against pivot position', ko: '받침점 위치에 따라 필요한 힘' },
    sub: (v, i) => `${fix(i.pivot, 2)} m → ${N(v.need, 1)}`,
    x: { key: 'pivot', label: 'm', min: 0.5, max: 2.5, fmt: (x) => x.toFixed(1) },
    y: { label: 'N', min: 0, max: 120, of: (v) => v.need, fmt: (y) => Math.round(y) },
  },
  maths: (v, i) => [
    { h: { en: 'Moments about the pivot', ko: '받침점에 대한 모멘트' } },
    { eq: 'M = F × d' },
    { calc: `M_load = ${i.load} N × ${fix(v.dL, 2)} m = ${fix(v.ML, 1)} N·m` },
    { calc: `M_effort = ${v.E} N × ${fix(v.dE, 2)} m = ${fix(v.ME, 1)} N·m` },
    { res: Math.abs(v.net) < 1 ? { en: 'Equal moments: it balances', ko: '모멘트가 같아 평형입니다' } : v.net > 0 ? { en: 'Effort moment is bigger: the crate goes up', ko: '힘의 모멘트가 커서 상자가 올라갑니다' } : { en: 'Load moment is bigger: the crate goes down', ko: '짐의 모멘트가 커서 상자가 내려갑니다' } },
    { h: { en: 'Effort needed to balance', ko: '평형에 필요한 힘' } },
    { eq: 'F = W × dL ÷ dE' }, { calc: `F = ${i.load} N × ${fix(v.dL, 2)} m ÷ ${fix(v.dE, 2)} m` }, { res: `F = ${N(v.need, 1)}` },
    { note: { en: 'The plank’s own weight is ignored; g = 10 N/kg.', ko: '널빤지 자체의 무게는 무시하고, g = 10 N/kg 으로 둡니다.' } },
  ],
};

// ---------- 2 · the ramp ----------
const W_RAMP = 20, H_RAMP = 0.8;      // N, m
const ramp = {
  id: 'ramp',
  title: { en: 'The ramp', ko: '빗면' },
  overview: [
    { en: 'Pulling a crate up a slope takes less force than lifting it straight up — but you pull it further.', ko: '상자를 빗면으로 끌어 올리면 곧장 들어 올릴 때보다 힘이 덜 듭니다. 대신 더 먼 거리를 끌어야 합니다.' },
    { en: 'Force × distance (the work) comes out the same: 20 N × 0.8 m = 16 J, whatever the slope.', ko: '힘 × 거리, 곧 일은 같습니다. 기울기와 상관없이 20 N × 0.8 m = 16 J 입니다.' },
  ],
  try: [
    { text: { en: 'Winch the crate to the top.', ko: '상자를 꼭대기까지 감아 올려 보세요.' }, when: (i, v) => v.s >= 0.999 },
    { text: { en: 'Get it to the top of a slope under 20°.', ko: '20°보다 낮은 빗면에서 꼭대기까지 올려 보세요.' }, when: (i, v) => v.s >= 0.999 && i.angle < 20 },
    { text: { en: 'Get it to the top of a slope over 40°.', ko: '40°보다 가파른 빗면에서 꼭대기까지 올려 보세요.' }, when: (i, v) => v.s >= 0.999 && i.angle > 40 },
  ],
  parts: [
    { id: 'ramp', name: { en: 'Ramp', ko: '빗면' }, title: (i) => ({ en: `Ramp · ${i.angle}°`, ko: `빗면 · ${i.angle}°` }), desc: { en: 'Always 0.8 m high. A gentler slope is longer.', ko: '높이는 언제나 0.8 m. 완만할수록 길어집니다.' } },
    { id: 'crate', name: { en: 'Crate · 20 N', ko: '상자 · 20 N' }, desc: { en: 'Slides without friction.', ko: '마찰 없이 미끄러집니다.' } },
    { id: 'balance', name: { en: 'Spring balance', ko: '용수철저울' }, desc: { en: 'Reads the pull along the rope.', ko: '줄을 따라 당기는 힘을 읽습니다.' } },
    { id: 'winch', name: { en: 'Winch', ko: '윈치' }, desc: { en: 'Hold to wind the rope in.', ko: '누르고 있으면 줄을 감습니다.' } },
  ],
  inputs: { angle: 30, pull: false },
  controls: [
    { key: 'angle', type: 'slider', part: 'ramp', label: { en: 'Slope', ko: '기울기' }, min: 10, max: 50, step: 1, fmt: (v) => `${v}°`, ends: ['10°', '50°'], reset: true },
    { key: 'pull', type: 'hold', part: 'winch', label: { en: 'Hold to winch', ko: '누르고 있기: 감기' } },
  ],
  view: { az: 24, el: 22, zoom: 1.0, follow: true },   // the wedge grows as the slope gets gentler: keep framing it
  init: () => ({ s: 0, turn: 0 }),
  step(m, dt, i) {
    const L = H_RAMP / Math.sin(i.angle * D2R);
    if (i.pull && m.s < 1) { const ds = (0.45 * dt) / L; m.s = Math.min(1, m.s + ds); m.turn += (0.45 * dt) / 0.11; }
    return m;
  },
  solve(i, m = {}) {
    const th = i.angle * D2R, F = W_RAMP * Math.sin(th), L = H_RAMP / Math.sin(th), s = m.s ?? 0;
    const moving = i.pull && s < 1;
    return { F, L, s, d: s * L, h: s * H_RAMP, turn: m.turn ?? 0, flows: { rope: moving ? 1.6 : 0 } };
  },
  build(k, c) {
    const T = c.T;
    const wd = wedge(k, { at: [0.6, 0, 0], h: 1.6, depth: 1.3 });
    k.box(1.3, 1.6, 1.3, { at: [1.25, 0.8, 0], color: COL.woodDark, r: 0.04, part: 'ramp' });
    const wn = winch(k, { at: [1.45, 1.6, 0], h: 0.75 });
    const cg = k.group({});
    const cr = crate(k, { parent: cg, size: 0.62, text: '20 N', at: [0.31, 0, 0] });
    const bl = balance(k, { parent: cg, at: [0.66, 0.31, 0] });
    const rope = k.rod(0.04, { color: COL.rope, flow: 'rope', reverse: true });
    k.label('ramp', wd.g, T({ en: 'Ramp', ko: '빗면' }), { offset: [-1.6, 0.55, 0.9] });
    k.label('winch', wn.g, T({ en: 'Winch', ko: '윈치' }), { offset: [0, 1.35, 0] });
    k.label('crate', cr.g, T({ en: 'Crate', ko: '상자' }), { offset: [0, 0.95, 0] });
    const tag = k.label('balance', bl.g, '', { kind: 'value', offset: [0.5, 0.5, 0] });
    const V = new k.THREE.Vector3();
    return (v, inp) => {
      const th = inp.angle * D2R;
      wd.set(inp.angle);
      const L = 1.6 / Math.sin(th), u = v.s * Math.max(0.1, L - 1.15), b = wd.base;
      cg.position.set(0.6 - b + Math.cos(th) * u, Math.sin(th) * u, 0); cg.rotation.z = th;
      bl.set(N(inp.pull || v.s > 0 ? v.F : 0, 1));
      cg.updateMatrixWorld(true);
      bl.g.localToWorld(V.set(1.17, 0, 0));
      rope.set([V.x, V.y, V.z], wn.rope(-1));
      wn.set(v.turn);
      tag.set(N(inp.pull || v.s > 0 ? v.F : 0, 1));
    };
  },
  schematicSize: [300, 150],
  schematic(s, v, i, c) {
    const th = i.angle * D2R, h = 90, b = h / Math.tan(th), bx = Math.min(250, b), sc = bx / b;
    const x0 = 270 - bx, y0 = 125, hh = h * sc;
    s.part('ramp', 0, 0, `<polygon points="${x0},${y0} 270,${y0} 270,${y0 - hh}" style="fill:#f3e3c9"/>`, { hw: 0, hh: 0 });
    s.raw(`<path class="sc-arc" d="M${x0 + 26},${y0} A26,26 0 0 0 ${x0 + 26 * Math.cos(th)},${y0 - 26 * Math.sin(th)}" style="fill:none;stroke:#1c2330;stroke-width:1"/>`);
    s.text(x0 + 34, y0 - 5, `${i.angle}°`, { anchor: 'start' });
    s.text(264, y0 - hh / 2 + 3, 'h 0.8 m', { anchor: 'end' });
    const cx = x0 + (bx * (0.15 + 0.7 * v.s)), cy = y0 - (hh * (0.15 + 0.7 * v.s));
    s.part('crate', cx, cy, `<rect x="-9" y="-9" width="18" height="18" transform="rotate(${-i.angle}) translate(0,-9)" style="fill:#fff"/>`, { hw: 13, hh: 13 });
    s.arrow(cx, cy - 9, cx, cy + 26, { cls: 'warm' });
    s.text(cx - 6, cy + 36, `W ${W_RAMP} N`, { anchor: 'end', cls: 'warm' });
    const fx = cx + 40 * Math.cos(th), fy = cy - 40 * Math.sin(th) - 9;
    s.arrow(cx + 4, cy - 12, fx, fy, {});
    s.part('balance', fx, fy, '<circle r="2.5" class="fill"/>', { hw: 10, hh: 10, label: `F ${N(v.F, 1)}`, labelAt: [-8, -12], anchor: 'end' });
    s.part('winch', 270, y0 - hh - 6, '<circle r="6" class="soft"/>', { hw: 10, hh: 10 });
    s.text(x0 + bx / 2 - 20, y0 + 16, `${c.T({ en: 'slope', ko: '빗면' })} ${fix(v.L, 2)} m`);
  },
  chart: {
    title: { en: 'Pull needed against slope', ko: '기울기에 따른 당기는 힘' },
    sub: (v, i) => `${i.angle}° → ${N(v.F, 1)}`,
    x: { key: 'angle', label: '°', min: 10, max: 50, fmt: (x) => Math.round(x) },
    y: { label: 'N', min: 0, max: 20, of: (v) => v.F, fmt: (y) => Math.round(y) },
  },
  maths: (v, i) => [
    { h: { en: 'The pull along the slope', ko: '빗면을 따라 당기는 힘' } },
    { eq: 'F = W × sin θ' }, { calc: `F = ${W_RAMP} N × sin ${i.angle}°` }, { res: `F = ${N(v.F, 1)}` },
    { h: { en: 'The distance along the slope', ko: '빗면을 따라 가는 거리' } },
    { eq: 'd = h ÷ sin θ' }, { calc: `d = 0.8 m ÷ sin ${i.angle}°` }, { res: `d = ${fix(v.L, 2)} m` },
    { h: { en: 'The work is the same', ko: '일은 같습니다' } },
    { eq: 'F × d = W × h' }, { calc: `${N(v.F, 1)} × ${fix(v.L, 2)} m = ${W_RAMP} N × 0.8 m` }, { res: '= 16 J' },
  ],
};

// ---------- 3 · pulleys ----------
const W_PUL = 40, TOP = 4.0, SP = 0.5, R_P = 0.25;
const pulleys = {
  id: 'pulleys',
  title: { en: 'Pulleys', ko: '도르래' },
  overview: [
    { en: 'Every rope segment that holds the load up carries an equal share of its weight.', ko: '짐을 받치는 줄 한 가닥 한 가닥이 무게를 똑같이 나눠 집니다.' },
    { en: 'With 4 segments you pull only a quarter of the weight — but you have to pull 4 times as much rope.', ko: '줄이 4가닥이면 무게의 4분의 1만 당기면 되지만, 줄은 4배 더 당겨야 합니다.' },
  ],
  try: [
    { text: { en: 'Lift the crate with one rope.', ko: '줄 한 가닥으로 상자를 들어 보세요.' }, when: (i, v) => i.n === 1 && v.h > 0.1 },
    { text: { en: 'Lift it with four.', ko: '네 가닥으로 들어 보세요.' }, when: (i, v) => i.n === 4 && v.h > 0.1 },
    { text: { en: 'Raise it to the top.', ko: '꼭대기까지 올려 보세요.' }, when: (i, v) => v.h >= 0.799 },
  ],
  parts: [
    { id: 'block', name: { en: 'Pulley blocks', ko: '도르래 묶음' }, title: (i) => ({ en: `Pulleys · ${i.n} supporting rope${i.n > 1 ? 's' : ''}`, ko: `도르래 · 받치는 줄 ${i.n}가닥` }), desc: { en: 'Fixed wheels on the beam, and (for 2 and 4) wheels that ride up with the crate.', ko: '들보에 고정된 바퀴와, (2·4가닥일 때) 상자와 함께 올라가는 바퀴입니다.' } },
    { id: 'crate', name: { en: 'Crate · 40 N', ko: '상자 · 40 N' }, desc: { en: 'Hangs from the hook.', ko: '고리에 매달려 있습니다.' } },
    { id: 'winch', name: { en: 'Winch', ko: '윈치' }, desc: { en: 'Hold to wind in the free end of the rope.', ko: '누르고 있으면 줄의 끝을 감습니다.' } },
  ],
  inputs: { n: 1, pull: false },
  controls: [
    { key: 'n', type: 'choice', part: 'block', label: { en: 'Supporting ropes', ko: '받치는 줄' }, options: [1, 2, 4], reset: true },
    { key: 'pull', type: 'hold', part: 'winch', label: { en: 'Hold to winch', ko: '누르고 있기: 감기' } },
  ],
  rebuild: ['n'],
  view: { az: 16, el: 14, zoom: 1.0 },
  thumb: { az: 20, el: 16 },
  init: () => ({ pulled: 0 }),
  step(m, dt, i) { if (i.pull && m.pulled < i.n * 0.8) m.pulled = Math.min(i.n * 0.8, m.pulled + 0.5 * dt); return m; },
  solve(i, m = {}) {
    const pulled = m.pulled ?? 0, h = pulled / i.n, moving = i.pull && h < 0.8;
    const flows = {}; for (let s = 0; s <= i.n; s++) flows['r' + s] = moving ? 2.2 * (s + 1) / (i.n + 1) : 0;
    return { F: W_PUL / i.n, pulled, h, flows };
  },
  build(k, c) {
    const n = c.inp.n, T = c.T, x0 = -(n * SP) / 2 - 0.3;
    for (const x of [-2.4, 2.4]) { k.box(0.28, 4.75, 0.28, { at: [x, 2.375, 0], color: COL.wood, r: 0.04, part: 'frame' }); k.box(0.9, 0.16, 1.1, { at: [x, 0.08, 0], color: COL.woodDark, r: 0.03, part: 'frame' }); }
    k.box(5.2, 0.3, 0.4, { at: [0, 4.6, 0], color: COL.wood, r: 0.05, part: 'frame' });
    const sx = (s) => x0 + s * SP;
    const tops = [], bots = [];
    for (let s = 0; s < n; s++) {
      const p = { x: sx(s) + SP / 2, s };
      if ((n - s) % 2 === 1) { tops.push(p); pulley(k, { at: [p.x, TOP, 0], r: R_P, part: 'block' }); }
      else bots.push(p);
    }
    // moving block: crate + hook bar + bottom pulleys
    const xc = n === 1 ? sx(0) : (bots[0].x + bots[bots.length - 1].x) / 2;
    const mov = k.group({ at: [xc, 0, 0] });
    const cr = crate(k, { parent: mov, size: 0.95, text: '40 N' });
    k.cyl(0.04, 0.04, 0.25, { at: [0, 1.07, 0], color: COL.metal, parent: mov, part: 'crate' });
    k.torus(0.1, 0.03, { at: [0, 1.25, 0], color: COL.metal, parent: mov, part: 'crate' });
    const botW = [];
    if (bots.length) {
      k.box(Math.max(0.5, (bots.length - 1) * 2 * SP + 0.5), 0.12, 0.3, { at: [0, 1.38, 0], color: COL.dark, parent: mov, r: 0.03, part: 'block' });
      for (const p of bots) { const pu = pulley(k, { at: [p.x - xc, 1.9, 0], r: R_P, parent: mov, part: 'block' }); pu.g.rotation.z = Math.PI; botW.push(pu.wheel); }
    }
    // rope strands (re-aimed every frame) and the winch
    const wn = winch(k, { at: [sx(n) + 0.22, 0, 0], h: 2.1, part: 'winch' });
    const strands = [];
    for (let s = 0; s <= n; s++) strands.push(k.rod(0.04, { color: COL.rope, flow: 'r' + s, reverse: s % 2 === 0 }));
    k.label('block', [tops[0].x, TOP + 0.55, 0], T({ en: 'Pulleys', ko: '도르래' }));
    k.label('crate', cr.g, T({ en: 'Load · 40 N', ko: '짐 · 40 N' }), { offset: [-0.85, 0.5, 0] });
    k.label('winch', wn.g, T({ en: 'Winch', ko: '윈치' }), { offset: [0.6, 1.0, 0] });
    const tag = k.label(null, wn.g, '', { kind: 'value', offset: [0.6, 2.6, 0] });
    return (v, inp) => {
      const y = v.h * 2;               // m → units
      mov.position.y = y;
      const yb = y + 1.9, hook = y + 1.25;
      for (let s = 0; s <= n; s++) {
        const x = sx(s);
        let lo, hi;
        if (s === n) { lo = wn.rope(-1)[1]; hi = TOP; }
        else { lo = n === 1 ? hook : yb; hi = (n - s) % 2 === 1 || (s > 0 && (n - (s - 1)) % 2 === 1) ? TOP : 4.45; }
        if (s === 0 && n % 2 === 0) hi = 4.45;
        const xx = s === 0 && n === 1 ? xc : x;
        strands[s].set([xx, lo, 0], [xx, hi, 0]);
      }
      for (const w of botW) w.rotation.z = v.pulled / R_P / n;
      wn.set(-v.pulled / 0.22);
      tag.set(`F = ${N(v.F)}`);
    };
  },
  schematicSize: [300, 160],
  schematic(s, v, i, c) {
    const n = i.n, x0 = 150 - (n * 24) / 2, X = (k) => x0 + k * 24, top = 30, by = 92 - v.h * 30, r = 12;
    s.raw(`<path class="sc-wire" d="M60,${top - 14} H240" style="stroke-width:4"/>`);
    const parts = [];
    for (let k = 0; k < n; k++) {
      const cx = (X(k) + X(k + 1)) / 2, isTop = (n - k) % 2 === 1;
      parts.push(`<circle cx="${cx}" cy="${isTop ? top : by}" r="${r}" class="soft"/><circle cx="${cx}" cy="${isTop ? top : by}" r="2" class="fill"/>`);
    }
    for (let k = 0; k <= n; k++) {
      const yLo = k === n ? 140 : n === 1 ? by + 18 : by, yHi = k === 0 && n % 2 === 0 ? top - 14 : top;
      s.wire([[X(k), yLo], [X(k), yHi]], { flow: 'r' + k, reverse: k % 2 === 0 });
    }
    s.part('block', 0, 0, parts.join(''), { hw: 0, hh: 0 });
    const cx = n === 1 ? X(0) : (X(0) + X(n - 1) + 24) / 2;
    s.part('crate', cx, by + 30, `<rect x="-14" y="-12" width="28" height="24" style="fill:#fff"/><text x="0" y="3.5" text-anchor="middle">40 N</text>`, { hw: 18, hh: 16 });
    s.arrow(X(n), 128, X(n), 150, {});
    s.part('winch', X(n), 140, '<circle r="3" class="fill"/>', { hw: 10, hh: 12, label: `F ${N(v.F)}`, labelAt: [10, 4], anchor: 'start' });
    s.text(226, 70, `n = ${n}`, { anchor: 'start', cls: 'acc' });
    s.text(226, 84, `h ${fix(v.h, 2)} m`, { anchor: 'start' });
    s.text(226, 98, `${c.T({ en: 'rope', ko: '줄' })} ${fix(v.pulled, 2)} m`, { anchor: 'start' });
  },
  chart: {
    title: { en: 'Pull needed against ropes', ko: '줄 가닥 수에 따른 당기는 힘' },
    sub: (v, i) => `n = ${i.n} → ${N(v.F)}`,
    x: { key: 'n', label: 'n', min: 1, max: 6, fmt: (x) => Math.round(x) },
    y: { label: 'N', min: 0, max: 45, of: (v) => v.F, fmt: (y) => Math.round(y) },
  },
  maths: (v, i) => [
    { h: { en: 'Sharing the weight', ko: '무게 나누기' } },
    { eq: 'F = W ÷ n' }, { calc: `F = ${W_PUL} N ÷ ${i.n}` }, { res: `F = ${N(v.F)}` },
    { h: { en: 'Paying in rope', ko: '대신 줄을 더 당깁니다' } },
    { eq: 'rope pulled = n × height' }, { calc: `${fix(v.pulled, 2)} m = ${i.n} × ${fix(v.h, 2)} m` },
    { note: { en: 'Pulleys and rope are taken as weightless and frictionless.', ko: '도르래와 줄의 무게와 마찰은 없다고 봅니다.' } },
  ],
};

// ---------- 4 · gears ----------
const MOD = 0.12;
const gears = {
  id: 'gears',
  title: { en: 'Gears', ko: '톱니바퀴' },
  overview: [
    { en: 'Two meshed gears turn opposite ways. The teeth pass the contact point at the same rate, so the gear with more teeth turns more slowly.', ko: '맞물린 톱니바퀴 두 개는 서로 반대로 돕니다. 맞닿는 곳을 지나는 톱니 수가 같아서, 톱니가 많은 쪽이 더 천천히 돕니다.' },
    { en: 'Slower means stronger: the turning force goes up by the same ratio.', ko: '느려지는 만큼 강해집니다. 돌리는 힘은 같은 비율로 커집니다.' },
  ],
  try: [
    { text: { en: 'Make the output faster than the crank.', ko: '출력이 손잡이보다 빨리 돌게 해 보세요.' }, when: (i) => i.zb < i.za && i.rpm > 0 },
    { text: { en: 'Make it exactly 4× slower.', ko: '정확히 4배 느리게 해 보세요.' }, when: (i) => i.zb === 4 * i.za && i.rpm > 0 },
    { text: { en: 'Turn the crank at 60 rpm.', ko: '손잡이를 60 rpm으로 돌려 보세요.' }, when: (i) => i.rpm >= 60 },
  ],
  parts: [
    { id: 'driver', name: { en: 'Driver gear', ko: '구동 톱니바퀴' }, title: (i) => ({ en: `Driver · ${i.za} teeth · ${i.rpm} rpm`, ko: `구동 · 톱니 ${i.za}개 · ${i.rpm} rpm` }), desc: { en: 'You turn this one with the crank.', ko: '손잡이로 이 바퀴를 돌립니다.' } },
    { id: 'driven', name: { en: 'Driven gear', ko: '종동 톱니바퀴' }, title: (i) => ({ en: `Driven · ${i.zb} teeth`, ko: `종동 · 톱니 ${i.zb}개` }), desc: { en: 'Turned by the driver’s teeth.', ko: '구동 바퀴의 톱니가 돌립니다.' } },
  ],
  inputs: { rpm: 20, za: 12, zb: 36 },
  controls: [
    { key: 'rpm', type: 'slider', part: 'driver', label: { en: 'Crank speed', ko: '손잡이 속도' }, min: 0, max: 60, step: 1, fmt: (v) => `${v} rpm`, ends: ['0', '60 rpm'] },
    { key: 'za', type: 'choice', part: 'driver', label: { en: 'Driver teeth', ko: '구동 톱니 수' }, options: [12, 24, 36] },
    { key: 'zb', type: 'choice', part: 'driven', label: { en: 'Driven teeth', ko: '종동 톱니 수' }, options: [12, 24, 36, 48] },
  ],
  rebuild: ['za', 'zb'],
  view: { az: 0, el: 48, zoom: 1.0 },
  thumb: { az: 10, el: 50 },
  init: () => ({ a: 0 }),
  step(m, dt, i) { m.a += (i.rpm / 60) * 2 * Math.PI * dt; return m; },
  solve(i, m = {}) {
    const ratio = i.zb / i.za, out = i.rpm / ratio;
    const pA = (2 * Math.PI) / i.za, aA = m.a ?? 0;
    return { ratio, out, torque: ratio, aA, aB: Math.PI - (aA + 0.5 * pA) * (i.za / i.zb) };
  },
  build(k, c) {
    const i = c.inp, T = c.T, rA = (MOD * i.za) / 2, rB = (MOD * i.zb) / 2, d = rA + rB;
    const xa = -d / 2 - 0.2, xb = xa + d;
    const w = 2 * (rA + rB) + 1.6, dep = 2 * Math.max(rA, rB) + 1.2;
    k.box(w, 0.3, dep, { at: [(xa + xb) / 2, 0.15, 0], color: COL.wood, r: 0.06, part: 'board' });
    const A = gear(k, { z: i.za, m: MOD, color: COL.driver, at: [xa, 0.42, 0], part: 'driver' });
    const B = gear(k, { z: i.zb, m: MOD, color: COL.driven, at: [xb, 0.42, 0], part: 'driven' });
    for (const x of [xa, xb]) k.cyl(0.08, 0.08, 0.34, { at: [x, 0.36, 0], color: COL.metal, outline: false });
    const arm = k.group({ parent: A.spin, at: [0, 0.3, 0] });
    const ra = Math.max(0.5, rA * 0.75);
    k.box(ra, 0.08, 0.14, { at: [ra / 2, 0, 0], color: COL.dark, parent: arm, r: 0.03, part: 'driver' });
    k.cyl(0.08, 0.09, 0.55, { at: [ra, 0.3, 0], color: COL.fulcrum, parent: arm, part: 'driver' });
    k.label('driver', A.g, `${T({ en: 'Driver', ko: '구동' })} · ${i.za}`, { offset: [0, 0.4, -rA - 0.35] });
    k.label('driven', B.g, `${T({ en: 'Driven', ko: '종동' })} · ${i.zb}`, { offset: [0, 0.4, -rB - 0.35] });
    const tA = k.label(null, A.g, '', { kind: 'value', offset: [0, 0.3, rA + 0.45] });
    const tB = k.label(null, B.g, '', { kind: 'value', offset: [0, 0.3, rB + 0.45] });
    return (v, inp) => { A.spin.rotation.y = v.aA; B.spin.rotation.y = v.aB; tA.set(`${fix(inp.rpm, 0)} rpm ↺`); tB.set(`${fix(v.out, 1)} rpm ↻`); };
  },
  schematicSize: [300, 150],
  schematic(s, v, i, c) {
    const rA = i.za, rB = i.zb, sc = Math.min(200 / (2 * rA + 2 * rB), 100 / (2 * Math.max(rA, rB)));
    const RA = rA * sc, RB = rB * sc, xa = 150 - (RA + RB) / 2, xb = xa + RA + RB, y = 72;
    const arc = (x, r, cw, cls) => { const a0 = -2.4, a1 = -0.8, rr = r + 7, p0 = [x + rr * Math.cos(cw ? a0 : a1), y + rr * Math.sin(cw ? a0 : a1)], p1 = [x + rr * Math.cos(cw ? a1 : a0), y + rr * Math.sin(cw ? a1 : a0)];
      return `<path d="M${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${rr},${rr} 0 0 ${cw ? 1 : 0} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}" style="fill:none;stroke:${cls};stroke-width:1.8"/><circle cx="${p1[0].toFixed(1)}" cy="${p1[1].toFixed(1)}" r="2.6" style="fill:${cls};stroke:none"/>`; };
    s.part('driver', xa, y, `<circle r="${RA}" style="fill:#fde3b5;stroke-dasharray:3 2"/><circle r="2.5" class="fill"/>`, { hw: RA, hh: RA, label: `${i.za} · ${i.rpm} rpm`, labelAt: [RA * 0.4, RA + 16], anchor: 'end' });
    s.part('driven', xb, y, `<circle r="${RB}" style="fill:#d4e3fb;stroke-dasharray:3 2"/><circle r="2.5" class="fill"/>`, { hw: RB, hh: RB, label: `${i.zb} · ${fix(v.out, 1)} rpm`, labelAt: [-RB * 0.3, RB + 16], anchor: 'start' });
    s.raw(arc(xa, RA, false, '#1f8f72'));
    s.raw(arc(xb, RB, true, '#e2543a'));
    s.text(150, 146, `${c.T({ en: 'ratio', ko: '비' })} ${fix(v.ratio, 2)} : 1`, { cls: 'acc' });
  },
  chart: {
    title: { en: 'Output speed against driven teeth', ko: '종동 톱니 수에 따른 출력 속도' },
    sub: (v, i) => `${i.za} : ${i.zb} → ${fix(v.out, 1)} rpm`,
    x: { key: 'zb', label: 'z', min: 12, max: 48, fmt: (x) => Math.round(x) },
    y: { label: 'rpm', min: 0, max: 180, of: (v) => v.out, fmt: (y) => Math.round(y) },
  },
  maths: (v, i) => [
    { h: { en: 'Gear ratio', ko: '기어비' } },
    { eq: 'ratio = z_driven ÷ z_driver' }, { calc: `ratio = ${i.zb} ÷ ${i.za}` }, { res: `ratio = ${fix(v.ratio, 2)}` },
    { h: { en: 'Output speed', ko: '출력 속도' } },
    { eq: 'n_out = n_in ÷ ratio' }, { calc: `n_out = ${i.rpm} rpm ÷ ${fix(v.ratio, 2)}` }, { res: { en: `n_out = ${fix(v.out, 1)} rpm, the opposite way`, ko: `n_out = ${fix(v.out, 1)} rpm, 반대 방향` } },
    { h: { en: 'Turning force', ko: '돌리는 힘' } },
    { eq: 'torque_out = torque_in × ratio' }, { res: { en: `${fix(v.ratio, 2)} × as strong`, ko: `${fix(v.ratio, 2)}배 강해짐` } },
  ],
};

export default {
  id: 'machines-101',
  title: { en: 'Machines 101', ko: '기계 101' },
  tagline: { en: 'Push · Lift · Turn', ko: '밀고 · 들고 · 돌리기' },
  experiment: { en: 'Machine', ko: '장치' },
  langs: ['en', 'ko'],
  logo: `<svg viewBox="0 0 40 40"><path d="M20 3l15 8.5v17L20 37 5 28.5v-17z" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="20" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M20 10v4M20 26v4M10 20h4M26 20h4M13 13l3 3M24 24l3 3M27 13l-3 3M16 24l-3 3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  units: [
    { id: 'levers', title: { en: 'Levers and ramps', ko: '지레와 빗면' }, lessons: [lever, ramp] },
    { id: 'wheels', title: { en: 'Wheels', ko: '바퀴' }, lessons: [pulleys, gears] },
  ],
  tour: {
    start: { lesson: 'lever', lang: 'en', tab: 'experiment' },
    duration: 56,
    steps: [
      { at: 1.6, do: 'set', key: 'pivot', from: 1.5, value: 0.9, dur: 1.6 },
      { at: 4.6, do: 'orbit', az: 38, el: 26, dur: 2.2, drag: -1 },
      { at: 7.2, do: 'select', part: 'crate' },
      { at: 8.0, do: 'set', key: 'load', value: 60 },
      { at: 9.4, do: 'select', part: 'weights' },
      { at: 10.2, do: 'set', key: 'weights', from: 2, value: 3, dur: 0.6 },
      { at: 12.0, do: 'tab', id: 'maths' },
      { at: 14.2, do: 'tab', id: 'experiment' },
      { at: 15.2, do: 'lesson', id: 'ramp' },
      { at: 16.0, do: 'select', part: 'winch' },
      { at: 16.8, do: 'hold', key: 'pull', dur: 2.6 },
      { at: 20.0, do: 'select', part: 'ramp' },
      { at: 20.8, do: 'set', key: 'angle', from: 30, value: 15, dur: 1.2 },
      { at: 22.6, do: 'select', part: 'winch' },
      { at: 23.4, do: 'hold', key: 'pull', dur: 3.0 },
      { at: 27.2, do: 'lesson', id: 'pulleys' },
      { at: 28.0, do: 'select', part: 'winch' },
      { at: 28.8, do: 'hold', key: 'pull', dur: 1.8 },
      { at: 31.2, do: 'select', part: 'block' },
      { at: 32.0, do: 'set', key: 'n', value: 4 },
      { at: 33.0, do: 'select', part: 'winch' },
      { at: 33.8, do: 'hold', key: 'pull', dur: 3.0 },
      { at: 37.4, do: 'diagram', open: true },
      { at: 39.4, do: 'diagram', open: false },
      { at: 40.4, do: 'lesson', id: 'gears' },
      { at: 41.4, do: 'set', key: 'rpm', from: 20, value: 40, dur: 1.2 },
      { at: 43.4, do: 'set', key: 'za', value: 24 },
      { at: 44.6, do: 'select', part: 'driven' },
      { at: 45.4, do: 'set', key: 'zb', value: 48 },
      { at: 46.6, do: 'orbit', az: 30, el: 34, dur: 2.0, drag: -1 },
      { at: 49.6, do: 'menu', id: 'lang' },
      { at: 50.6, do: 'lang', code: 'ko' },
      { at: 52.4, do: 'tab', id: 'overview' },
    ],
  },
};
