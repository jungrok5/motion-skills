// 「여름방학 마지막 밤」 starter — the smallest whole piece: three tools, four stages. BRIEF.md says why each thing is here.
// Copy with new-piece.mjs, rewrite BRIEF.md for your story first, then redesign everything below for it.
import { Drawing, R, tool, core } from 'fp/drawing.js';
const { ramp, mix, rng, fbm, clamp, smooth } = core;

export function art() {
  const d = new Drawing({ seed: 815, title: '여름방학 마지막 밤', paper: { color: '#2a3152', grain: 1.3 } }); // night → dark toned paper: what shows through is night, not white
  const W = 1920, H = 1080, r = rng(3);
  const soft = tool('softPastel'), oil = tool('oilPastel', { width: 9 }), pencil = tool('pastelPencil');

  const sky = ramp([[0, '#0f1a3a'], [0.45, '#1b2d5c'], [0.75, '#2c4a7c'], [0.9, '#3e6f8f'], [0.96, '#b98ab0'], [1, '#e9a07a']]);
  const cloudR = ramp(['#1e2850', '#2a3566', '#5a5f99', '#b99ac0', '#f2c7c0']);
  const horizon = (x) => 668 + (fbm(x * 0.004, 2, 3, 5) - 0.5) * 16;
  const hills = (x) => 640 + (fbm(x * 0.003, 4, 4, 6) - 0.5) * 70 - 30 * Math.exp(-(((x - 1500) / 260) ** 2));
  const skyAt = (x, y, rr) => sky(clamp(y / horizon(x) + (rr() - 0.5) * 0.05));

  const skyR = R.above(horizon, 0, W), land = R.below((x) => horizon(x) - 2, 0, W, H);

  d.stage('block-in');
  d.side(skyR, { tool: soft, color: skyAt, angle: -10, pressure: [0.6, 0.8] });
  d.side(land, { tool: soft, color: (x, y, rr) => mix(skyAt(x, 1340 - y, rr), '#1a2a4a', 0.35), angle: 0, angleJitter: 4, pressure: [0.6, 0.8] });

  d.stage('sky and cloud');
  d.hatch(skyR, { tool: oil, color: skyAt, angle: -12, angleJitter: 10, spacing: 11, length: [20, 44], width: [6, 10], pressure: [0.55, 0.85], zigzag: [1, 3] });
  // the tall night cloud: one body, lit faintly from inside and from the last light low on the right
  const lobes = [];
  for (let i = 0; i < 40; i++) { const t = i / 39, wide = 1 - t * 0.55 + smooth(0.8, 1, t) * 0.7; lobes.push([600 + (r() - 0.5) * 460 * wide + t * 80, 570 - t * 480 + (r() - 0.5) * 30, 70 + r() * 60 * (1 - t * 0.4)]); }
  lobes.sort((a, b) => a[1] - b[1]);
  d.form(lobes, { tool: oil, light: [0.7, 0.3, 0.6], lobe: 0.3, around: 0.4, spacing: 8, width: [5, 9], length: [12, 26], pressure: [0.6, 0.9], angle: -20, floor: 600,
    shade: (t, x, y) => mix(cloudR(t * 0.85), '#f2c7c0', smooth(0.82, 1, t) * 0.5) });
  d.scumble(R.below(hills, 0, W, horizon(0) + 30), { tool: oil, color: ['#141d3c', '#1b2648', '#222c52'], size: [4, 9], spacing: 7, width: [4, 7], pressure: [0.7, 1], clip: true });
  d.blend(R.between((x) => horizon(x) - 40, (x) => horizon(x) + 10, 0, W), { angle: 0, spacing: 34 });

  d.stage('paddies');
  // bands narrowing toward the horizon; each band a mirror of the sky above it
  let y = horizon(0) + 4;
  for (let i = 0; y < H + 40; i++) {
    const hgt = 10 + i * i * 3, y0 = y, y1 = y + hgt;
    const band = R.between((x) => y0 + (x - 960) * 0.01 * i * 0.3, (x) => y1 + (x - 960) * 0.01 * i * 0.3, 0, W);
    d.hatch(band, { tool: oil, color: (x, yy, rr) => mix(skyAt(x, clamp(1 - (yy - 668) / 420) * 640, rr), '#ffffff', 0.06), angle: 0, angleJitter: 2, spacing: 5 + i * 0.6, length: [20, 60], width: [3 + i * 0.5, 5 + i * 0.7], pressure: [0.6, 0.9] });
    d.line([[-10, y1 - 0.01 * i * 0.3 * 960], [W + 10, y1 + 0.01 * i * 0.3 * 960]], { tool: oil, color: ['#0b1128', '#111a36'], width: [3, 4 + i * 1.6], pressure: [0.85, 1], wobble: 1.5 });
    d.line([[-10, y1 - 0.01 * i * 0.3 * 960 - 2 - i * 0.6], [W + 10, y1 + 0.01 * i * 0.3 * 960 - 2 - i * 0.6]], { tool: pencil, color: ['#6a7fb0', '#8a8fc0'], width: [1.6, 2.4], pressure: [0.6, 0.85], wobble: 1.2 });
    y = y1;
  }
  // the cloud's glow, broken in the water
  for (let i = 0; i < 120; i++) { const yy = 690 + r() * 300, x = 560 + (r() - 0.5) * (120 + (yy - 680) * 1.2), L = 10 + r() * 30; d.stroke([[x - L / 2, yy], [x + L / 2, yy]], { tool: oil, width: [2.5, 4], color: ['#b99ac0', '#f2c7c0', '#8b84b8'], pressure: [0.7, 1] }); }

  d.stage('grass and fireflies');
  for (const [bx, dir] of [[0, 1], [W, -1]]) for (let i = 0; i < 160; i++) {
    const x0 = bx + dir * Math.pow(r(), 1.6) * 520, hgt = 60 + r() * 220 * (1 - Math.abs(x0 - bx) / 600), lean = (r() - 0.3) * 40 * dir;
    d.line([[x0, H + 5], [x0 + lean * 0.5, H - hgt * 0.5], [x0 + lean, H - hgt]], { tool: i % 3 ? oil : pencil, color: ['#0e1a2e', '#16263a', '#1f3346', '#2d4a52'], width: [2.5, 5], pressure: [0.7, 1], smooth: true });
  }
  const flies = [];
  for (let i = 0; i < 90; i++) flies.push([r() * W, 700 + Math.pow(r(), 0.7) * 360]);
  d.dabs(flies, { tool: soft, color: ['#9fbf6a', '#c9e07a'], length: 0, width: [14, 22], pressure: [0.75, 0.9], opacity: 0.45 }); // the glow
  d.dabs(flies, { tool: pencil, color: ['#f2fbb8', '#fff7c2'], length: [0, 2], width: [4.5, 6.5], pressure: 1.15 });   // the light itself
  return d;
}
