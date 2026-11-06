// Circuits 101 — the style reference for hands-on-lab: five lessons in two units, English and Korean.
// Each lesson: inputs → solve() → values; build() makes the bench and returns update(values); schematic(), chart, maths()
// read the same values, so the bulb, the meter, the diagram, the chart and the maths always agree.
import { si, fix } from '../../lib/lab.js';
import { COL, battery, bulb, resistor, meter, knife, led, capacitor, supply, cable, board, boardResistor, jumper, pack, selector } from './parts.js';
import { SYM } from './symbols.js';

const BULB_R = 10;            // Ω, a torch bulb, treated as constant
const P_FULL = 0.9;           // W — the bulb's "full brightness" (3 V across 10 Ω)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ohm = (v) => si(v, 'Ω', 2);
const volt = (v) => `${fix(v, 2)} V`;

// ---------- 1 · open and closed ----------
const openClosed = {
  id: 'open-closed',
  title: { en: 'Open and closed', ko: '열린 회로, 닫힌 회로' },
  overview: [
    { en: 'Current only flows round a complete loop. A switch is a gap you can open and close.', ko: '전류는 끊어지지 않은 고리를 따라서만 흐릅니다. 스위치는 열고 닫을 수 있는 틈입니다.' },
    { en: 'Close the switch and the loop is complete: the bulb lights. A bigger battery pushes more current through the same bulb.', ko: '스위치를 닫으면 고리가 이어져 전구가 켜집니다. 전압이 더 큰 전지는 같은 전구에 더 많은 전류를 밀어 넣습니다.' },
  ],
  try: [
    { text: { en: 'Close the switch.', ko: '스위치를 닫아 보세요.' }, when: (i) => i.closed },
    { text: { en: 'Make the bulb brighter.', ko: '전구를 더 밝게 해 보세요.' }, when: (i) => i.closed && i.volts > 3 },
    { text: { en: 'Make it dimmer.', ko: '전구를 더 어둡게 해 보세요.' }, when: (i) => i.closed && i.volts < 3 },
  ],
  parts: [
    { id: 'battery', name: { en: 'Battery', ko: '전지' }, desc: { en: 'Pushes current out of its + end, round the loop and back into its − end.', ko: '+ 극에서 전류를 밀어내 고리를 돌아 − 극으로 돌아오게 합니다.' }, title: (i) => ({ en: `${i.volts} V battery`, ko: `${i.volts} V 전지` }) },
    { id: 'switch', name: { en: 'Switch', ko: '스위치' }, desc: { en: 'A metal blade on a hinge. Down, it bridges the gap; up, the loop is broken.', ko: '경첩에 달린 금속 날입니다. 내리면 틈을 잇고, 올리면 고리가 끊깁니다.' } },
    { id: 'bulb', name: { en: 'Bulb', ko: '전구' }, desc: { en: 'A thin wire that glows when enough current squeezes through it (about 10 Ω).', ko: '충분한 전류가 지나가면 빛나는 가는 선입니다 (약 10 Ω).' } },
  ],
  inputs: { closed: false, volts: 3 },
  controls: [
    { key: 'closed', type: 'toggle', part: 'switch', label: { en: 'Switch closed', ko: '스위치 닫기' } },
    { key: 'volts', type: 'choice', part: 'battery', label: { en: 'Battery', ko: '전지 전압' }, options: [1.5, 3, 4.5], fmt: (v) => `${v} V` },
  ],
  rebuild: ['volts'],
  view: { az: 32, el: 34 },
  solve: (i) => {
    const I = i.closed ? i.volts / BULB_R : 0, P = I * I * BULB_R;
    return { I, P, lv: P / P_FULL, flows: { main: I * 6 } };
  },
  build(k, c) {
    const bat = battery(k, { at: [-1.0, 0, 1.25], volts: c.inp.volts });
    const lamp = bulb(k, { at: [1.9, 0, -0.45] });
    const sw = knife(k, { at: [-1.6, 0, -1.35] });
    cable(k, bat.plus, lamp.a, { color: COL.red, flow: 'main', via: [[0.95, 0.95]], outA: 0, outB: 0.3 });
    cable(k, lamp.b, sw.b, { color: COL.green, flow: 'main', via: [[2.75, -1.1], [1.6, -2.15], [-0.3, -2.0]], outB: 0.35 });
    cable(k, sw.a, bat.minus, { color: COL.green, flow: 'main', via: [[-2.95, -0.7], [-2.85, 0.9]], outA: 0.35, outB: 0 });
    k.label('battery', bat.top, c.T({ en: 'Battery', ko: '전지' }), { offset: [0, 0.4, 0] });
    k.label('bulb', lamp.top, c.T({ en: 'Bulb', ko: '전구' }), { offset: [0, 0.35, 0] });
    k.label('switch', sw.top, c.T({ en: 'Switch', ko: '스위치' }), { offset: [0, 0.3, 0] });
    const amp = k.label(null, [0.75, 0.25, 1.25], '', { kind: 'value' });
    return (v, i) => { lamp.set(v.lv); sw.set(i.closed); amp.set(si(v.I, 'A')); amp.show(v.I > 0); };
  },
  schematicSize: [300, 160],
  schematic(s, v, i, c) {
    s.wire([[130, 130], [40, 130], [40, 40], [130, 40]], { flow: 'main' });
    s.wire([[170, 40], [260, 40], [260, 61]], { flow: 'main' });
    s.wire([[260, 99], [260, 130], [170, 130]], { flow: 'main' });
    s.part('battery', 150, 130, SYM.battery, { label: `${i.volts} V`, labelAt: [0, 26] });
    s.part('switch', 150, 40, (ss, po) => SYM.switch(ss, { ...po, closed: i.closed }), { label: c.T(i.closed ? { en: 'closed', ko: '닫힘' } : { en: 'open', ko: '열림' }), labelAt: [0, -18] });
    s.part('bulb', 260, 80, (ss, po) => SYM.lamp(ss, { ...po, lit: v.lv > 0.05 }), { rot: 90, label: '10 Ω', labelAt: [-16, 3], anchor: 'end' });
    s.text(50, 88, si(v.I, 'A'), { anchor: 'start', cls: 'acc' });
  },
  chart: {
    title: { en: 'Current against battery voltage', ko: '전지 전압에 따른 전류' },
    sub: (v, i) => `${i.volts} V → ${si(v.I, 'A')}`,
    x: { key: 'volts', label: 'V', min: 0, max: 4.5, fmt: (x) => x.toFixed(1) },
    y: { label: 'mA', min: 0, max: 450, of: (v) => v.I * 1000, fmt: (y) => Math.round(y) },
  },
  maths: (v, i) => [
    { h: { en: "Ohm's law", ko: '옴의 법칙' } },
    { eq: 'I = V ÷ R' },
    ...(i.closed
      ? [{ calc: `I = ${i.volts} V ÷ ${BULB_R} Ω` }, { res: `I = ${si(v.I, 'A')}` }, { h: { en: 'Power in the bulb', ko: '전구가 쓰는 전력' } }, { eq: 'P = V × I' }, { calc: `P = ${i.volts} V × ${si(v.I, 'A')}` }, { res: `P = ${si(v.P, 'W')}` }]
      : [{ note: { en: 'The switch is open: there is no loop, so I = 0 whatever the battery.', ko: '스위치가 열려 고리가 없으므로 전지와 상관없이 I = 0 입니다.' } }]),
  ],
};

// ---------- 2 · series and parallel ----------
const seriesParallel = {
  id: 'series-parallel',
  title: { en: 'Series and parallel', ko: '직렬과 병렬' },
  overview: [
    { en: 'Two bulbs can share one loop (series) or each have their own path (parallel).', ko: '전구 두 개는 한 고리를 함께 쓰거나(직렬), 각자 자기 길을 가질 수 있습니다(병렬).' },
    { en: 'In series the battery’s 3 V is split between them, so both are dim. In parallel each gets the full 3 V — and the battery works twice as hard.', ko: '직렬에서는 3 V를 둘이 나눠 가져서 둘 다 어둡습니다. 병렬에서는 각자 3 V를 다 받아 밝고, 대신 전지가 두 배로 일합니다.' },
  ],
  try: [
    { text: { en: 'Switch the power on in series.', ko: '직렬로 전원을 켜 보세요.' }, when: (i) => i.power && i.circuit === 'series' },
    { text: { en: 'Change to parallel.', ko: '병렬로 바꿔 보세요.' }, when: (i) => i.power && i.circuit === 'parallel' },
    { text: { en: 'Take one bulb out in each circuit.', ko: '두 회로에서 각각 전구 하나를 빼 보세요.' }, when: (i, v) => i.b2out && i.power && v.lv1 > 0.5 },
  ],
  parts: [
    { id: 'battery', name: { en: 'Battery · 3 V', ko: '전지 · 3 V' }, desc: { en: 'Two cells: 3 V in all.', ko: '셀 두 개, 합쳐서 3 V 입니다.' } },
    { id: 'bulb1', name: { en: 'Bulb A', ko: '전구 A' }, desc: { en: '10 Ω. Stays in its socket.', ko: '10 Ω. 소켓에 그대로 있습니다.' } },
    { id: 'bulb2', name: { en: 'Bulb B', ko: '전구 B' }, desc: { en: '10 Ω. You can unscrew this one.', ko: '10 Ω. 이 전구는 뺄 수 있습니다.' } },
  ],
  inputs: { power: false, circuit: 'series', b2out: false, volts: 3 },
  controls: [
    { key: 'power', type: 'power' },
    { key: 'circuit', type: 'choice', label: { en: 'Circuit', ko: '연결' }, options: [{ value: 'series', label: { en: 'Series', ko: '직렬' } }, { value: 'parallel', label: { en: 'Parallel', ko: '병렬' } }] },
    { key: 'b2out', type: 'toggle', part: 'bulb2', label: { en: 'Unscrew bulb B', ko: '전구 B 빼기' } },
  ],
  rebuild: ['circuit', 'b2out'],
  view: { az: 20, el: 36 },
  solve: (i) => {
    const V = i.power ? i.volts : 0;
    let I1, I2;
    if (i.circuit === 'series') { I1 = I2 = i.b2out ? 0 : V / (2 * BULB_R); }
    else { I1 = V / BULB_R; I2 = i.b2out ? 0 : V / BULB_R; }
    const I = i.circuit === 'series' ? I1 : I1 + I2;
    return { I, I1, I2, V1: I1 * BULB_R, V2: I2 * BULB_R, lv1: (I1 * I1 * BULB_R) / P_FULL, lv2: (I2 * I2 * BULB_R) / P_FULL, flows: { total: I * 5, b1: I1 * 5, b2: I2 * 5 } };
  },
  build(k, c) {
    const i = c.inp;
    const bat = battery(k, { at: [-0.3, 0, 1.45], volts: 3 });
    const A = bulb(k, { at: [-1.5, 0, -0.8], part: 'bulb1' });
    const B = bulb(k, { at: [1.6, 0, -0.8], part: 'bulb2', out: i.b2out });
    if (i.circuit === 'series') {
      cable(k, bat.plus, B.b, { color: COL.red, flow: 'total', via: [[2.9, 1.0], [2.9, -0.1]], outA: 0, outB: 0.35 });
      cable(k, B.a, A.b, { color: COL.green, flow: 'total', via: [[0.05, 0.1]], outA: 0.35, outB: 0.35 });
      cable(k, A.a, bat.minus, { color: COL.green, flow: 'total', via: [[-2.7, 0.0], [-2.4, 1.2]], outA: 0.35, outB: 0 });
    } else {
      cable(k, bat.plus, B.b, { color: COL.red, flow: 'total', via: [[2.9, 1.0], [2.9, -0.1]], outA: 0, outB: 0.35 });
      cable(k, B.b, A.b, { color: COL.red, flow: 'b1', via: [[1.0, -2.0], [-0.6, -2.0]], outA: -0.3, outB: -0.3, floor: 0.1 });
      cable(k, B.a, A.a, { color: COL.green, flow: 'b2', via: [[0.6, 0.2], [-1.6, 0.4]], outA: 0.35, outB: 0.35 });
      cable(k, A.a, bat.minus, { color: COL.green, flow: 'total', via: [[-2.7, 0.0], [-2.4, 1.2]], outA: 0.35, outB: 0 });
    }
    k.label('battery', bat.top, c.T({ en: 'Battery', ko: '전지' }), { offset: [0, 0.4, 0] });
    k.label('bulb1', A.top, c.T({ en: 'Bulb A', ko: '전구 A' }), { offset: [0, 0.35, 0] });
    k.label('bulb2', B.top, c.T({ en: 'Bulb B', ko: '전구 B' }), { offset: [0, 0.35, 0] });
    const amp = k.label(null, [1.2, 0.25, 1.45], '', { kind: 'value' });
    return (v) => { A.set(v.lv1); B.set(v.lv2); amp.set(si(v.I, 'A')); amp.show(v.I > 0); };
  },
  schematicSize: [300, 170],
  schematic(s, v, i, c) {
    const lit1 = v.lv1 > 0.05, lit2 = v.lv2 > 0.05;
    if (i.circuit === 'series') {
      s.wire([[170, 140], [260, 140], [260, 40], [214, 40]], { flow: 'total' });
      s.wire([[176, 40], [124, 40]], { flow: 'total' });
      s.wire([[86, 40], [40, 40], [40, 140], [130, 140]], { flow: 'total' });
      s.part('bulb2', 195, 40, (ss, po) => SYM.lamp(ss, { ...po, lit: lit2 }), { label: i.b2out ? c.T({ en: 'B · out', ko: 'B · 빠짐' }) : `B · ${volt(v.V2)}`, labelAt: [0, -16] });
      s.part('bulb1', 105, 40, (ss, po) => SYM.lamp(ss, { ...po, lit: lit1 }), { label: `A · ${volt(v.V1)}`, labelAt: [0, -16] });
    } else {
      s.wire([[170, 140], [260, 140], [260, 30], [180, 30], [180, 61]], { flow: 'total' });
      s.wire([[180, 99], [180, 120], [100, 120], [100, 140], [40, 140], [40, 30], [100, 30], [100, 61]], { flow: 'b1', dim: false });
      s.wire([[100, 99], [100, 120]], { flow: 'b1' });
      s.wire([[180, 30], [100, 30]], { flow: 'b1' });
      s.part('bulb2', 180, 80, (ss, po) => SYM.lamp(ss, { ...po, lit: lit2 }), { rot: 90, label: i.b2out ? c.T({ en: 'B · out', ko: 'B · 빠짐' }) : `B · ${volt(v.V2)}`, labelAt: [16, 3], anchor: 'start' });
      s.part('bulb1', 100, 80, (ss, po) => SYM.lamp(ss, { ...po, lit: lit1 }), { rot: 90, label: `A · ${volt(v.V1)}`, labelAt: [-16, 3], anchor: 'end' });
      s.dot(180, 30); s.dot(100, 120);
    }
    s.part('battery', 150, 140, SYM.cells, { label: '3 V', labelAt: [0, 24] });
    s.text(268, 92, si(v.I, 'A'), { anchor: 'start', cls: 'acc' });
  },
  chart: {
    title: { en: 'Bulb A brightness against supply', ko: '공급 전압에 따른 전구 A 밝기' },
    sub: (v, i) => { const p = `A ${Math.round(clamp(v.lv1, 0, 9) * 100)} %`; return i.circuit === 'series' ? { en: `series · ${p}`, ko: `직렬 · ${p}` } : { en: `parallel · ${p}`, ko: `병렬 · ${p}` }; },
    x: { key: 'volts', label: 'V', min: 0, max: 4.5, fmt: (x) => x.toFixed(1) },
    y: { label: '%', min: 0, max: 200, of: (v) => v.lv1 * 100, fmt: (y) => Math.round(y) },
    lines: [{ set: { circuit: 'series', power: true }, cls: 'alt' }, { set: { circuit: 'parallel', power: true } }],
  },
  maths: (v, i) => i.circuit === 'series' ? [
    { h: { en: 'Series: one path', ko: '직렬: 길이 하나' } },
    { eq: 'R = R_A + R_B' }, { calc: 'R = 10 Ω + 10 Ω = 20 Ω' },
    { eq: 'I = V ÷ R' }, { calc: `I = ${i.power ? 3 : 0} V ÷ 20 Ω` }, { res: `I = ${si(v.I, 'A')}` },
    { eq: 'V_A = I × R_A' }, { res: `V_A = ${volt(v.V1)}  ·  V_B = ${volt(v.V2)}` },
    { note: { en: 'Each bulb gets half the voltage, so a quarter of the power: dim. Take one out and the only path is broken.', ko: '전구마다 전압이 절반이라 전력은 4분의 1, 그래서 어둡습니다. 하나를 빼면 하나뿐인 길이 끊깁니다.' } },
  ] : [
    { h: { en: 'Parallel: two paths', ko: '병렬: 길이 둘' } },
    { eq: 'V_A = V_B = V' }, { calc: `V_A = ${volt(v.V1)}  ·  V_B = ${volt(v.V2)}` },
    { eq: 'I = I_A + I_B' }, { calc: `I = ${si(v.I1, 'A')} + ${si(v.I2, 'A')}` }, { res: `I = ${si(v.I, 'A')}` },
    { note: { en: 'Each bulb has its own loop to the battery, so taking one out leaves the other lit.', ko: '전구마다 전지로 가는 자기 고리가 있어서, 하나를 빼도 다른 하나는 켜져 있습니다.' } },
  ],
};

// ---------- 3 · voltage divider ----------
const R_OPTS = [1000, 2200, 4700, 10000];
const divider = {
  id: 'divider',
  title: { en: 'Voltage divider', ko: '전압 분배' },
  overview: [
    { en: 'Two resistors in a row share the battery’s voltage between them, in proportion to their resistance.', ko: '나란히 이은 저항 두 개는 전지의 전압을 저항 크기에 비례해 나눠 가집니다.' },
    { en: 'The point in the middle is a new, smaller voltage you can set by choosing the resistors — the start of every sensor circuit.', ko: '가운데 지점은 저항을 골라 정할 수 있는 새로운, 더 작은 전압입니다. 모든 센서 회로가 여기서 시작합니다.' },
  ],
  try: [
    { text: { en: 'Switch the power on.', ko: '전원을 켜 보세요.' }, when: (i) => i.power },
    { text: { en: 'Get more than 2.5 V across R2.', ko: 'R2 양쪽 전압을 2.5 V보다 크게 만들어 보세요.' }, when: (i, v) => v.V2 > 2.5 },
    { text: { en: 'Make the two meters read the same.', ko: '두 계기가 같은 값을 가리키게 해 보세요.' }, when: (i, v) => i.power && Math.abs(v.V1 - v.V2) < 0.04 },
  ],
  parts: [
    { id: 'battery', name: { en: 'Battery · 3 V', ko: '전지 · 3 V' }, desc: { en: 'Two cells, 3 V across the pair of resistors.', ko: '셀 두 개, 저항 두 개 양쪽에 3 V를 겁니다.' } },
    { id: 'r1', name: { en: 'R1 (top)', ko: 'R1 (위)' }, title: (i) => ({ en: `${ohm(i.r1)} resistor · R1`, ko: `${ohm(i.r1)} 저항 · R1` }), desc: { en: 'Resists the flow of current: the higher its value, the less current gets through.', ko: '전류의 흐름을 막습니다. 값이 클수록 전류가 덜 지나갑니다.' } },
    { id: 'r2', name: { en: 'R2 (bottom)', ko: 'R2 (아래)' }, title: (i) => ({ en: `${ohm(i.r2)} resistor · R2`, ko: `${ohm(i.r2)} 저항 · R2` }), desc: { en: 'The bottom resistor. The middle voltage is measured across it.', ko: '아래쪽 저항입니다. 가운데 전압은 이 저항 양쪽에서 잽니다.' } },
    { id: 'v1', name: { en: 'Meter · V1', ko: '계기 · V1' }, desc: { en: 'Reads the voltage across R1.', ko: 'R1 양쪽 전압을 읽습니다.' } },
    { id: 'v2', name: { en: 'Meter · V2', ko: '계기 · V2' }, desc: { en: 'Reads the voltage across R2 — the middle voltage.', ko: 'R2 양쪽 전압, 곧 가운데 전압을 읽습니다.' } },
  ],
  inputs: { power: false, r1: 4700, r2: 10000, volts: 3 },
  controls: [
    { key: 'power', type: 'power' },
    { key: 'r1', type: 'choice', part: 'r1', label: 'R1', options: R_OPTS, fmt: ohm },
    { key: 'r2', type: 'slider', part: 'r2', label: 'R2', min: 100, max: 10000, step: 100, fmt: ohm, ends: ['100 Ω', '10 kΩ'] },
  ],
  builds: [
    { id: 'loose', label: { en: 'Without a breadboard', ko: '브레드보드 없이' }, desc: { en: 'Big parts and thick wires, laid out like the circuit diagram.', ko: '큰 부품과 굵은 전선을 회로도처럼 늘어놓았습니다.' } },
    { id: 'board', label: { en: 'On a breadboard', ko: '브레드보드에' }, desc: { en: 'The same circuit as you would really build it: holes in a column are joined underneath.', ko: '실제로 만드는 모습 그대로입니다. 같은 세로줄 구멍은 밑에서 이어져 있습니다.' } },
  ],
  rebuild: ['r1', 'r2'],
  view: { az: 18, el: 34 },
  solve: (i) => {
    const V = i.power ? i.volts : 0, I = V / (i.r1 + i.r2);
    return { I, V1: I * i.r1, V2: I * i.r2, flows: { main: i.power ? 1.6 : 0 } };
  },
  build(k, c) {
    const i = c.inp, T = c.T;
    let m1, m2, top1, top2, topB;
    if (c.build === 'board') {
      const bd = board(k, { at: [0.2, 0, 0.35], w: 4.6, d: 2.8 });
      const pk = pack(k, { at: [-3.35, 0, 0.7] });
      const R1 = boardResistor(k, bd.hole(3, -2), bd.hole(9, -2), { ohms: i.r1, part: 'r1' });
      const R2 = boardResistor(k, bd.hole(9, -3), bd.hole(15, -3), { ohms: i.r2, part: 'r2' });
      cable(k, pk.plus, bd.rail('+', 1), { color: COL.red, flow: 'main', via: [[-2.7, -0.9, 0.45]], outA: -0.2, outB: -0.15, floor: 0.45 });
      jumper(k, bd.rail('+', 3), bd.hole(3, -5), { color: COL.red, flow: 'main', h: 0.25 });
      jumper(k, bd.hole(15, -5), bd.rail('-', 17), { color: COL.black, flow: 'main', h: 0.25 });
      cable(k, bd.rail('-', 0), pk.minus, { color: COL.black, flow: 'main', via: [[-2.5, -1.3, 0.45]], outA: -0.2, outB: -0.15, floor: 0.45 });
      m1 = meter(k, { at: [-0.75, 0, -2.75], part: 'v1', title: 'V1' }); m2 = meter(k, { at: [1.75, 0, -2.75], part: 'v2', title: 'V2' });
      for (const [m, a, b] of [[m1, bd.hole(3, -4), bd.hole(9, -4)], [m2, bd.hole(9, -5), bd.hole(15, -4)]]) {
        k.tube([m.a, [m.a[0], 0.3, m.a[2] + 0.5], [a[0], 0.85, a[2] - 0.25], a], 0.032, { color: COL.red });
        k.tube([m.b, [m.b[0], 0.3, m.b[2] + 0.5], [b[0], 1.0, b[2] - 0.25], b], 0.032, { color: COL.black });
      }
      top1 = R1.top; top2 = R2.top; topB = pk.top;
    } else {
      const bat = battery(k, { at: [-0.1, 0, 1.75], volts: 3 });
      const R1 = resistor(k, { at: [1.85, 0, -0.05], ohms: i.r1, part: 'r1' });
      const R2 = resistor(k, { at: [-1.85, 0, -0.05], ohms: i.r2, part: 'r2' });
      cable(k, bat.plus, R1.b, { color: COL.red, flow: 'main', via: [[3.1, 1.3], [3.05, 0.4]], outA: 0, outB: 0.35 });
      cable(k, R1.a, R2.b, { color: COL.green, flow: 'main', via: [[0.0, 0.75]], outA: 0.35, outB: 0.35 });
      cable(k, R2.a, bat.minus, { color: COL.green, flow: 'main', via: [[-3.05, 0.4], [-2.8, 1.5]], outA: 0.35, outB: 0 });
      m1 = meter(k, { at: [1.85, 0, -2.3], part: 'v1', title: 'V1' }); m2 = meter(k, { at: [-1.85, 0, -2.3], part: 'v2', title: 'V2' });
      for (const [m, a, b] of [[m1, R1.b, R1.a], [m2, R2.b, R2.a]]) {
        k.tube([m.a, [m.a[0] - 0.1, 0.2, m.a[2] + 0.55], [a[0] + 0.15, 0.55, a[2] - 0.15], a], 0.04, { color: COL.red });
        k.tube([m.b, [m.b[0] + 0.1, 0.2, m.b[2] + 0.55], [b[0] - 0.15, 0.55, b[2] - 0.15], b], 0.04, { color: COL.black });
      }
      top1 = R1.top; top2 = R2.top; topB = bat.top;
    }
    k.label('r1', top1, `R1 (${T({ en: 'top', ko: '위' })})`, { offset: [0, 0.3, 0] });
    k.label('r2', top2, `R2 (${T({ en: 'bottom', ko: '아래' })})`, { offset: [0, 0.3, 0] });
    k.label('battery', topB, T({ en: 'Battery', ko: '전지' }), { offset: [0, 0.35, 0] });
    k.label('v1', m1.top, T({ en: 'Meter · V1', ko: '계기 · V1' }), { offset: [0, 0.25, 0] });
    k.label('v2', m2.top, T({ en: 'Meter · V2', ko: '계기 · V2' }), { offset: [0, 0.25, 0] });
    return (v) => { m1.set(fix(v.V1, 2), 'V'); m2.set(fix(v.V2, 2), 'V'); };
  },
  schematicSize: [300, 176],
  schematic(s, v, i, c) {
    s.wire([[60, 108], [60, 150], [180, 150], [180, 136]], { flow: 'main', reverse: true });
    s.wire([[60, 70], [60, 22], [180, 22], [180, 36]], { flow: 'main' });
    s.wire([[180, 74], [180, 98]], { flow: 'main' });
    s.part('battery', 60, 89, SYM.cells, { rot: -90, label: '3 V', labelAt: [-22, 3], anchor: 'end' });
    s.part('r1', 180, 55, SYM.resistor, { rot: 90, label: `R1 ${ohm(i.r1)}`, labelAt: [-12, 3], anchor: 'end' });
    s.part('r2', 180, 117, SYM.resistor, { rot: 90, label: `R2 ${ohm(i.r2)}`, labelAt: [-12, 3], anchor: 'end' });
    s.dot(180, 86);
    s.raw(`<path class="sc-wire" d="M180,30 H232 M180,86 H232 M180,142 H232" style="stroke-dasharray:3 2.5"/>`);
    s.part('v1', 232, 58, (ss, po) => SYM.meter(ss, { ...po, letter: 'V' }), { rot: 90, hw: 14, label: `${fix(v.V1, 2)} V`, labelAt: [16, 3], anchor: 'start' });
    s.part('v2', 232, 114, (ss, po) => SYM.meter(ss, { ...po, letter: 'V' }), { rot: 90, hw: 14, label: `${fix(v.V2, 2)} V`, labelAt: [16, 3], anchor: 'start' });
    s.text(80, 172, `I = ${si(v.I, 'A')}`, { anchor: 'start', cls: 'acc' });
  },
  chart: {
    title: { en: 'Middle voltage against R2', ko: 'R2에 따른 가운데 전압' },
    sub: (v, i) => `${ohm(i.r2)} → ${fix(v.V2, 2)} V`,
    x: { key: 'r2', label: 'R2 (kΩ)', min: 0, max: 10000, fmt: (x) => (x / 1000).toFixed(0) },
    y: { label: 'V2 (V)', min: 0, max: 3, of: (v) => v.V2, fmt: (y) => y.toFixed(1) },
    power: true,
  },
  maths: (v, i) => [
    { h: { en: 'The current', ko: '전류' } },
    { eq: 'I = V ÷ (R1 + R2)' }, { calc: `I = ${i.power ? 3 : 0} V ÷ (${ohm(i.r1)} + ${ohm(i.r2)})` }, { res: `I = ${si(v.I, 'A')}` },
    { h: { en: 'The middle voltage', ko: '가운데 전압' } },
    { eq: 'V2 = V × R2 ÷ (R1 + R2)' }, { calc: `V2 = ${i.power ? 3 : 0} V × ${ohm(i.r2)} ÷ ${ohm(i.r1 + i.r2)}` }, { res: `V2 = ${fix(v.V2, 2)} V  ·  V1 = ${fix(v.V1, 2)} V` },
    { note: { en: 'V1 + V2 always adds up to the battery’s 3 V.', ko: 'V1 + V2는 언제나 전지의 3 V가 됩니다.' } },
  ],
};

// ---------- 4 · the LED ----------
const VF = { red: 1.9, green: 2.2, blue: 3.0 };
const LED_COL = { red: '#e23b2e', green: '#35b84a', blue: '#3a7bea' };
const R_LED = 220;
const ledLesson = {
  id: 'led',
  title: { en: 'LEDs: one way only', ko: 'LED: 한쪽으로만' },
  overview: [
    { en: 'An LED lets current through in one direction only, and only once the voltage across it passes its forward voltage.', ko: 'LED는 한 방향으로만, 그리고 양쪽 전압이 순방향 전압을 넘어야만 전류를 통과시킵니다.' },
    { en: 'Red needs about 1.9 V, green 2.2 V, blue about 3 V. The resistor in line keeps the current small once it starts to flow.', ko: '빨강은 약 1.9 V, 초록 2.2 V, 파랑은 약 3 V가 필요합니다. 함께 이은 저항은 전류가 흐르기 시작한 뒤 너무 커지지 않게 막아 줍니다.' },
  ],
  try: [
    { text: { en: 'Light the LED.', ko: 'LED를 켜 보세요.' }, when: (i, v) => v.I > 0.002 },
    { text: { en: 'Turn the LED round while the power is on.', ko: '전원이 켜진 채로 LED를 뒤집어 보세요.' }, when: (i) => i.power && i.flipped && i.vs > 2 },
    { text: { en: 'Light the blue one.', ko: '파란 LED를 켜 보세요.' }, when: (i, v) => i.color === 'blue' && v.I > 0.002 },
  ],
  parts: [
    { id: 'supply', name: { en: 'Power supply', ko: '전원 장치' }, title: (i) => ({ en: `Power supply · ${fix(i.vs, 1)} V`, ko: `전원 장치 · ${fix(i.vs, 1)} V` }), desc: { en: 'Turn the knob to set the voltage from 0 to 6 V.', ko: '손잡이를 돌려 0–6 V 사이로 전압을 정합니다.' } },
    { id: 'r', name: { en: '220 Ω resistor', ko: '220 Ω 저항' }, desc: { en: 'Limits the current once the LED starts to conduct.', ko: 'LED가 전류를 통하기 시작하면 전류를 제한합니다.' } },
    { id: 'led', name: { en: 'LED', ko: 'LED' }, title: (i) => ({ en: `${i.color} LED · ${VF[i.color]} V`, ko: `${{ red: '빨간', green: '초록', blue: '파란' }[i.color]} LED · ${VF[i.color]} V` }), desc: { en: 'The longer leg (anode) must face the + side.', ko: '긴 다리(애노드)가 + 쪽을 향해야 합니다.' } },
  ],
  inputs: { power: false, vs: 3, color: 'red', flipped: false },
  controls: [
    { key: 'power', type: 'power' },
    { key: 'vs', type: 'slider', part: 'supply', label: { en: 'Supply voltage', ko: '공급 전압' }, min: 0, max: 6, step: 0.1, fmt: (v) => `${fix(v, 1)} V`, ends: ['0 V', '6 V'] },
    { key: 'color', type: 'choice', part: 'led', label: { en: 'Colour', ko: '색' }, options: [{ value: 'red', label: { en: 'Red', ko: '빨강' } }, { value: 'green', label: { en: 'Green', ko: '초록' } }, { value: 'blue', label: { en: 'Blue', ko: '파랑' } }] },
    { key: 'flipped', type: 'toggle', part: 'led', label: { en: 'Turn it round', ko: '뒤집어 꽂기' } },
  ],
  rebuild: ['color', 'flipped'],
  view: { az: 26, el: 32 },
  solve: (i) => {
    const V = i.power ? i.vs : 0, vf = VF[i.color];
    const I = i.flipped ? 0 : Math.max(0, (V - vf) / R_LED);
    return { V, vf, I, VR: I * R_LED, VL: i.flipped ? V : Math.min(V, vf + 0), lv: Math.min(1, I / 0.012), flows: { main: Math.min(3, I * 220) } };
  },
  build(k, c) {
    const i = c.inp;
    const ps = supply(k, { at: [-2.1, 0, 0.0] });
    const R = resistor(k, { at: [0.75, 0, 1.35], ohms: R_LED, part: 'r' });
    const L = led(k, { at: [2.4, 0, -0.45], color: LED_COL[i.color], flipped: i.flipped });
    cable(k, ps.plus, R.a, { color: COL.red, flow: 'main', via: [[-1.2, 1.6]], outA: 0.3, outB: 0.35 });
    cable(k, R.b, L.a, { color: COL.red, flow: 'main', via: [[2.2, 0.7]], outA: 0.35, outB: 0.35 });
    cable(k, L.b, ps.minus, { color: COL.black, flow: 'main', via: [[3.3, -1.4], [1.0, -1.7], [-0.6, 0.9]], outA: 0.35, outB: 0.3 });
    k.label('supply', ps.top, c.T({ en: 'Power supply', ko: '전원 장치' }), { offset: [0, 0.2, 0] });
    k.label('r', R.top, '220 Ω', { offset: [0, 0.3, 0] });
    k.label('led', L.top, 'LED', { offset: [0, 0.3, 0] });
    const amp = k.label(null, [0.5, 0.25, 2.1], '', { kind: 'value' });
    return (v, inp) => { ps.set(`${fix(v.V, 1)} V`); ps.knob.rotation.z = -(inp.vs / 6) * 4.2 + 2.1; L.set(v.lv); amp.set(si(v.I, 'A')); amp.show(inp.power); };
  },
  schematicSize: [300, 160],
  schematic(s, v, i, c) {
    s.wire([[60, 62], [60, 30], [130, 30]], { flow: 'main' });
    s.wire([[170, 30], [240, 30], [240, 60]], { flow: 'main' });
    s.wire([[240, 100], [240, 135], [60, 135], [60, 98]], { flow: 'main' });
    s.part('supply', 60, 80, SYM.supply, { rot: -90, label: `${fix(i.vs, 1)} V`, labelAt: [-22, 3], anchor: 'end' });
    s.part('r', 150, 30, SYM.resistor, { label: '220 Ω', labelAt: [0, -12] });
    s.part('led', 240, 80, (ss, po) => SYM.led(ss, { ...po, lit: v.lv > 0.05 }), { rot: i.flipped ? -90 : 90, label: `${c.T({ red: { en: 'red', ko: '빨강' }, green: { en: 'green', ko: '초록' }, blue: { en: 'blue', ko: '파랑' } }[i.color])} · ${VF[i.color]} V`, labelAt: [-18, 3], anchor: 'end' });
    s.text(150, 128, `I = ${si(v.I, 'A')}`, { cls: 'acc' });
  },
  chart: {
    title: { en: 'Current against supply voltage', ko: '공급 전압에 따른 전류' },
    sub: (v, i) => `${fix(i.vs, 1)} V → ${si(v.I, 'A')}`,
    x: { key: 'vs', label: 'V', min: 0, max: 6, fmt: (x) => x.toFixed(0) },
    y: { label: 'mA', min: 0, max: 20, of: (v) => v.I * 1000, fmt: (y) => Math.round(y) },
    power: true,
  },
  maths: (v, i) => [
    { h: { en: 'Below the forward voltage', ko: '순방향 전압 아래' } },
    { p: { en: `A ${i.color} LED needs about ${VF[i.color]} V before any current flows.`, ko: `${{ red: '빨간', green: '초록', blue: '파란' }[i.color]} LED는 약 ${VF[i.color]} V가 넘어야 전류가 흐릅니다.` } },
    { h: { en: 'Above it, the resistor sets the current', ko: '그 위에서는 저항이 전류를 정합니다' } },
    { eq: 'I = (V − Vf) ÷ R' },
    { calc: `I = (${fix(v.V, 1)} V − ${VF[i.color]} V) ÷ 220 Ω` },
    { res: i.flipped ? { en: 'I = 0 — the LED is the wrong way round', ko: 'I = 0 — LED가 거꾸로 꽂혀 있습니다' } : `I = ${si(v.I, 'A')}` },
    { note: { en: 'Without the resistor nothing would stop the current shooting up past Vf — and the LED would burn out.', ko: '저항이 없으면 Vf를 넘는 순간 전류가 치솟아 LED가 타 버립니다.' } },
  ],
};

// ---------- 5 · charging a capacitor ----------
const CAP_OPTS = [100e-6, 470e-6, 1000e-6], RC_R = [1000, 4700, 10000];
const rc = {
  id: 'rc',
  title: { en: 'Charge it up', ko: '축전기 충전' },
  overview: [
    { en: 'A capacitor stores charge. Through a resistor it fills quickly at first, then more and more slowly — like a tank filling through a thin pipe.', ko: '축전기는 전하를 담아 둡니다. 저항을 거쳐 채우면 처음엔 빨리, 갈수록 천천히 찹니다. 가는 관으로 채우는 물탱크처럼요.' },
    { en: 'R × C, the time constant, says how slow: after one R × C it is 63 % full.', ko: '시간 상수 R × C가 얼마나 느린지 알려 줍니다. R × C만큼 지나면 63 %가 찹니다.' },
  ],
  try: [
    { text: { en: 'Charge it past 2.8 V (switch to A).', ko: '2.8 V 넘게 충전해 보세요 (A로).' }, when: (i, v) => v.vc > 2.8 },
    { text: { en: 'Empty it again below 0.2 V (switch to B).', ko: '다시 0.2 V 아래로 비워 보세요 (B로).' }, when: (i, v) => i.pos === 'discharge' && v.vc < 0.2 },
    { text: { en: 'Make R × C longer than 4 s.', ko: 'R × C를 4초보다 길게 만들어 보세요.' }, when: (i) => i.r * i.c >= 4 },
  ],
  parts: [
    { id: 'battery', name: { en: 'Battery · 3 V', ko: '전지 · 3 V' }, desc: { en: 'Fills the capacitor when the switch is on A.', ko: '스위치가 A에 있으면 축전기를 채웁니다.' } },
    { id: 'switch', name: { en: 'Selector', ko: '선택 스위치' }, desc: { en: 'A: charge from the battery. B: let the capacitor empty through the resistor.', ko: 'A: 전지로 충전. B: 축전기를 저항으로 비우기.' } },
    { id: 'r', name: { en: 'Resistor', ko: '저항' }, title: (i) => ({ en: `${ohm(i.r)} resistor`, ko: `${ohm(i.r)} 저항` }), desc: { en: 'The thin pipe: more ohms, slower filling.', ko: '가는 관입니다. 옴이 클수록 천천히 찹니다.' } },
    { id: 'cap', name: { en: 'Capacitor', ko: '축전기' }, title: (i) => ({ en: `${si(i.c, 'F')} capacitor`, ko: `${si(i.c, 'F')} 축전기` }), desc: { en: 'Two plates and a thin insulator: the tank.', ko: '금속판 두 장과 얇은 절연체, 물탱크입니다.' } },
    { id: 'vc', name: { en: 'Meter · VC', ko: '계기 · VC' }, desc: { en: 'Reads the voltage across the capacitor.', ko: '축전기 양쪽 전압을 읽습니다.' } },
  ],
  inputs: { pos: 'off', r: 4700, c: 470e-6 },
  controls: [
    { key: 'pos', type: 'choice', part: 'switch', label: { en: 'Selector', ko: '스위치' }, options: [{ value: 'charge', label: { en: 'A · charge', ko: 'A · 충전' } }, { value: 'off', label: { en: 'Off', ko: '끔' } }, { value: 'discharge', label: { en: 'B · empty', ko: 'B · 방전' } }] },
    { key: 'r', type: 'choice', part: 'r', label: 'R', options: RC_R, fmt: ohm },
    { key: 'c', type: 'choice', part: 'cap', label: 'C', options: CAP_OPTS, fmt: (v) => si(v, 'F') },
  ],
  rebuild: ['r', 'c'],
  view: { az: 24, el: 36 },
  init: () => ({ vc: 0 }),
  step(m, dt, i) {
    const tau = i.r * i.c;
    if (i.pos === 'charge') m.vc += ((3 - m.vc) / tau) * dt;
    else if (i.pos === 'discharge') m.vc -= (m.vc / tau) * dt;
    return m;
  },
  solve(i, m) {
    const vc = m.vc ?? 0;
    const I = i.pos === 'charge' ? (3 - vc) / i.r : i.pos === 'discharge' ? -vc / i.r : 0;
    const f = Math.sign(I) * Math.min(2.6, Math.abs(I) * i.r * 0.9);
    return { vc, I, tau: i.r * i.c, flows: { charge: i.pos === 'charge' ? f : 0, rc: f, dis: i.pos === 'discharge' ? -f : 0 } };
  },
  build(k, c) {
    const i = c.inp;
    const bat = battery(k, { at: [-1.7, 0, 1.7], volts: 3 });
    const sel = selector(k, { at: [-2.3, 0, -0.8] });
    const R = resistor(k, { at: [0.2, 0, -0.1], ohms: i.r, part: 'r' });
    const C = capacitor(k, { at: [2.5, 0, 0.3], label: si(i.c, 'F'), size: 0.8 + 0.25 * CAP_OPTS.indexOf(i.c) });
    const M = meter(k, { at: [2.4, 0, -2.3], part: 'vc', title: 'VC' });
    cable(k, bat.plus, sel.a, { color: COL.red, flow: 'charge', via: [[-0.2, 1.7], [-0.3, -1.3], [-1.6, -1.9]], outA: 0, outB: -0.3 });
    cable(k, sel.c, R.a, { color: COL.red, flow: 'rc', via: [[-1.3, 0.6]], outA: 0.3, outB: 0.35 });
    cable(k, R.b, C.a, { color: COL.red, flow: 'rc', via: [[1.5, 0.75]], outA: 0.35, outB: 0.35 });
    cable(k, C.b, bat.minus, { color: COL.black, flow: 'charge', via: [[3.6, 1.3], [1.0, 2.7], [-3.4, 2.4], [-3.4, 1.7]], outA: 0.35, outB: 0 });
    cable(k, sel.b, C.b, { color: COL.black, flow: 'dis', via: [[-1.0, -2.4], [3.7, -1.2], [3.6, 0.7]], outA: -0.3, outB: 0.35 });
    k.tube([M.a, [M.a[0] - 0.1, 0.2, M.a[2] + 0.6], [C.a[0], 0.6, C.a[2] - 0.2], C.a], 0.04, { color: COL.red });
    k.tube([M.b, [M.b[0] + 0.1, 0.2, M.b[2] + 0.6], [C.b[0] + 0.2, 0.6, C.b[2] - 0.2], C.b], 0.04, { color: COL.black });
    k.label('battery', bat.top, c.T({ en: 'Battery', ko: '전지' }), { offset: [0, 0.4, 0] });
    k.label('switch', sel.top, c.T({ en: 'Selector', ko: '선택 스위치' }), { offset: [0, 0.2, 0] });
    k.label('r', R.top, ohm(i.r), { offset: [0, 0.3, 0] });
    k.label('cap', C.top, c.T({ en: 'Capacitor', ko: '축전기' }), { offset: [0, 0.3, 0] });
    k.label('vc', M.top, c.T({ en: 'Meter · VC', ko: '계기 · VC' }), { offset: [0, 0.25, 0] });
    const amp = k.label(null, [0.2, 0.25, 0.9], '', { kind: 'value' });
    return (v, inp) => { sel.set(inp.pos); M.set(fix(v.vc, 2), 'V'); amp.set(si(Math.abs(v.I), 'A')); amp.show(Math.abs(v.I) > 1e-6 && inp.pos !== 'off'); };
  },
  schematicSize: [300, 170],
  schematic(s, v, i, c) {
    s.wire([[55, 98], [55, 140], [235, 140], [235, 104]], { flow: 'charge', reverse: false });
    s.wire([[55, 60], [55, 30], [96, 30]], { flow: 'charge' });
    s.wire([[100, 50], [100, 30]], {});
    s.wire([[120, 40], [130, 40]], { flow: 'rc' });
    s.wire([[170, 40], [235, 40], [235, 66]], { flow: 'rc' });
    s.wire([[110, 60], [110, 118], [235, 118]], { flow: 'dis' });
    s.part('battery', 55, 79, SYM.cells, { rot: -90, label: '3 V', labelAt: [-20, 3], anchor: 'end' });
    s.part('switch', 110, 40, (ss, po) => SYM.switch3(ss, { ...po, pos: i.pos }), { rot: 180, hw: 16, label: 'A · B', labelAt: [0, 34] });
    s.part('r', 150, 40, SYM.resistor, { label: ohm(i.r), labelAt: [0, -12] });
    s.part('cap', 235, 85, SYM.cap, { rot: 90, label: si(i.c, 'F'), labelAt: [-14, 3], anchor: 'end' });
    s.part('vc', 275, 85, (ss, po) => SYM.meter(ss, { ...po, letter: 'V' }), { rot: 90, hw: 14, label: `${fix(v.vc, 2)} V`, labelAt: [0, -30] });
    s.raw(`<path class="sc-wire" d="M235,52 H275 V65 M275,105 V118 H235" style="stroke-dasharray:3 2.5"/>`);
    s.dot(235, 118); s.dot(235, 52);
    s.text(150, 162, `τ = R × C = ${fix(i.r * i.c, 2)} s`, { cls: 'acc' });
  },
  chart: {
    kind: 'time',
    title: { en: 'Capacitor voltage over time', ko: '시간에 따른 축전기 전압' },
    sub: (v, i) => `VC = ${fix(v.vc, 2)} V · τ = ${fix(v.tau, 2)} s`,
    x: { label: 's', window: 10, fmt: (x) => x.toFixed(0) },
    y: { label: 'V', min: 0, max: 3.2, of: (v) => v.vc, fmt: (y) => y.toFixed(1) },
  },
  maths: (v, i) => [
    { h: { en: 'The time constant', ko: '시간 상수' } },
    { eq: 'τ = R × C' }, { calc: `τ = ${ohm(i.r)} × ${si(i.c, 'F')}` }, { res: `τ = ${fix(v.tau, 2)} s` },
    { h: i.pos === 'discharge' ? { en: 'Emptying', ko: '비우는 중' } : { en: 'Filling', ko: '채우는 중' } },
    { eq: i.pos === 'discharge' ? 'VC = V0 × e^(−t/τ)' : 'VC = 3 V × (1 − e^(−t/τ))' },
    { calc: { en: `After 1 τ: ${i.pos === 'discharge' ? '37 % left' : '63 % full'} · after 5 τ (${fix(5 * v.tau, 1)} s): done`, ko: `1τ 뒤: ${i.pos === 'discharge' ? '37 % 남음' : '63 % 참'} · 5τ (${fix(5 * v.tau, 1)} s) 뒤: 거의 끝` } },
    { res: `VC = ${fix(v.vc, 2)} V  ·  I = ${si(Math.abs(v.I), 'A')}` },
  ],
};

export default {
  id: 'circuits-101',
  title: { en: 'Circuits 101', ko: '회로 101' },
  tagline: { en: 'Build · Measure · Explain', ko: '만들고 · 재고 · 설명하기' },
  experiment: { en: 'Circuit', ko: '회로' },
  langs: ['en', 'ko'],
  units: [
    { id: 'basics', title: { en: 'Basics', ko: '기초' }, lessons: [openClosed, seriesParallel] },
    { id: 'components', title: { en: 'Components', ko: '부품' }, lessons: [divider, ledLesson, rc] },
  ],
  tour: {
    start: { lesson: 'open-closed', lang: 'en', tab: 'experiment' },
    duration: 64,
    steps: [
      { at: 1.2, do: 'toggle', key: 'closed' },
      { at: 2.4, do: 'select', part: 'battery' },
      { at: 3.4, do: 'set', key: 'volts', value: 4.5 },
      { at: 4.6, do: 'orbit', az: 62, el: 30, dur: 2.2, drag: -1 },
      { at: 7.0, do: 'select', part: 'switch' },
      { at: 7.8, do: 'toggle', key: 'closed' },
      { at: 8.6, do: 'lesson', id: 'series-parallel' },
      { at: 9.8, do: 'power' },
      { at: 11.4, do: 'set', key: 'circuit', value: 'parallel' },
      { at: 13.2, do: 'toggle', key: 'b2out' },
      { at: 15.0, do: 'toggle', key: 'b2out' },
      { at: 16.4, do: 'tab', id: 'maths' },
      { at: 19.0, do: 'tab', id: 'experiment' },
      { at: 20.0, do: 'lesson', id: 'divider' },
      { at: 21.2, do: 'power' },
      { at: 22.6, do: 'set', key: 'r1', value: 10000 },
      { at: 24.0, do: 'set', key: 'r2', from: 10000, value: 2200, dur: 2.0 },
      { at: 27.2, do: 'build', id: 'board' },
      { at: 28.8, do: 'orbit', az: -18, el: 44, dur: 2.4, drag: 1 },
      { at: 32.2, do: 'diagram', open: true },
      { at: 34.6, do: 'diagram', open: false },
      { at: 35.8, do: 'lesson', id: 'led' },
      { at: 37.0, do: 'power' },
      { at: 38.4, do: 'set', key: 'vs', from: 3, value: 5.2, dur: 1.8 },
      { at: 40.6, do: 'select', part: 'led' },
      { at: 41.4, do: 'set', key: 'color', value: 'blue' },
      { at: 42.4, do: 'select', part: 'supply' },
      { at: 43.0, do: 'set', key: 'vs', from: 5.2, value: 2.6, dur: 1.4 },
      { at: 45.0, do: 'select', part: 'led' },
      { at: 45.8, do: 'toggle', key: 'flipped' },
      { at: 46.8, do: 'lesson', id: 'rc' },
      { at: 48.0, do: 'set', key: 'pos', value: 'charge' },
      { at: 53.4, do: 'set', key: 'pos', value: 'discharge' },
      { at: 57.6, do: 'menu', id: 'lang' },
      { at: 58.6, do: 'lang', code: 'ko' },
      { at: 60.4, do: 'tab', id: 'overview' },
    ],
  },
};
