// pencil-live-action · sheet.js — the cast sheet, on plain paper (no scans needed): the hero turned through eight views
// (front, 3/4 and profile BOTH ways, back), then the motion row — the idle (three moments of a breath), a turn on the
// spot made of steps, and one big move (a hop: gather → air → land and settle), each facing right and facing left —
// and the faces. Render it and score it before any shot is written (references/BRIEF.md → cast review).
//   castSheet({ hero: SPEC, paper, lead, tone })  → sets the page contract; window.castSheet() reports for check.mjs
import { Painter } from './draw.js';
import { hero } from './hero.js';
import { gait } from './gait.js';
import { toothTile } from './pencil.js';

export function castSheet(o) {
  const W = 1920, H = 1080, q = new URLSearchParams(location.search), sc = +(q.get('scale') || 1);
  const c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc; c.style.width = '100%'; document.body.style.margin = 0; document.body.style.background = '#222'; document.body.appendChild(c);
  const paper = o.paper || '#f3f0e9', ctx = c.getContext('2d'), pt = new Painter(ctx, { paper, spot: o.tone || '#55555a', lead: o.lead || '#2f2f33' }); pt.weight = 1;
  const spec = o.hero, Hh = spec.H || 240, LEG = .37 * Hh, ANK = .025 * Hh, audit = new Set(), motion = [];
  const zoom = 1080 / (Hh * 5.4);
  const put = (sx, sy, pose) => { const h = hero(spec, { x: sx / zoom, y: sy / zoom, ...pose }); h.audit.forEach(a => audit.add(a)); pt.parts(h.parts); return h; };
  const label = (s, x, y, size = 19) => { ctx.font = `${size}px Georgia, serif`; ctx.fillStyle = 'rgba(40,40,44,.72)'; ctx.textAlign = 'center'; ctx.fillText(s, x, y); };
  const ground = (x0, x1, y) => { ctx.strokeStyle = 'rgba(40,40,44,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); };
  // a pose from a gait sample (gait works y-up in hero units; the drawing is y-down)
  const fromGait = (g, t, sx, sy, extra = {}) => { const a = g.at(t), X = p => sx / zoom + p[0], Y = p => sy / zoom - p[1];
    return { x: X(a.root), y: sy / zoom, yaw: a.face, hip: sy / zoom - a.hipY, legs: { L: { to: [X(a.L), Y(a.L) - ANK] }, R: { to: [X(a.R), Y(a.R) - ANK] } }, ...extra, _a: a }; };
  const draw = () => {
    ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(toothTile(3), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    pt.view({ x: 960 / zoom, y: 540 / zoom, w: 1920 / zoom }, W, H, zoom); pt.wz = 1.15;
    label(`${spec.name || 'hero'} — cast sheet`, 960, 34, 24);
    // row 1: the turn — 8 views
    const yaws = [0, 45, 90, 135, 180, -135, -90, -45], y1 = 268;
    yaws.forEach((yw, i) => { const x = 140 + i * 235; put(x, y1, { yaw: yw, mouth: 'smile', blink: 0 }); label(`yaw ${yw}°`, x, y1 + 30); });
    ground(40, 1880, y1);
    // row 2: motion, facing right then facing left
    for (const [k, dir] of [[0, 1], [1, -1]]) {
      const y2 = 525 + k * 255, ox = 80, face = 90 * dir; label(`motion, facing ${dir > 0 ? 'right' : 'left'} — idle breath · turn on the spot (steps) · hop: gather → air → land`, 960, y2 - 205, 17);
      // idle: three moments of a breath (the chest and head move; nothing is frozen)
      const heads = [];
      [0, .9, 1.8].forEach((bt, i) => { const h = put(ox + 60 + i * 110, y2, { yaw: face * .7, breathe: bt, flow: bt, mouth: 'smile', blink: i === 1 ? .9 : 0, head: { pitch: [0, 3, -2][i] } }); heads.push(h.at.head[1]); });
      if (Math.max(...heads) - Math.min(...heads) < Hh * .002) motion.push(`idle facing ${dir > 0 ? 'right' : 'left'}: the head does not move over a breath`);
      label('idle', ox + 170, y2 + 28);
      // a turn on the spot: two steps (feet re-planted, never skating)
      const g = gait({ start: { L: [dir * -6, 0, 0], R: [dir * 6, 0, 0] }, legLen: LEG, ankle: ANK, face0: 0 }); g.turnInPlace(face, 0, .7);
      const prevF = {}; [0, .25, .5, .75].forEach((t, i) => { const p = fromGait(g, t, ox + 470 + i * 115, y2, { mouth: 'flat' }); put(p.x * zoom, y2, p);
        for (const s of ['L', 'R']) { if (prevF[s] && p._a.planted[s] && prevF[s].pl) { const d = Math.hypot(p._a[s][0] - prevF[s].p[0], p._a[s][2] - prevF[s].p[2]); if (d > .5) motion.push(`turn: a planted ${s} foot moved ${d.toFixed(1)}`); } prevF[s] = { p: p._a[s], pl: p._a.planted[s] }; } });
      label('turn: steps', ox + 640, y2 + 28);
      // the hop: gather (crouch, arms back) → air → land (deep knees) → settle
      const hg = gait({ start: { L: [dir * 3, 0, 4], R: [dir * -3, 0, -4] }, legLen: LEG, ankle: ANK, face0: face }); hg.hop(.3, .35, Hh * .14, [dir * Hh * .25, 0, 0]);
      const hop = [[0.1, 0, 10, 'flat'], [.25, -Hh * .07, -40, 'flat'], [.47, 0, 150, 'open'], [.66, -Hh * .08, 60, 'o'], [.95, -Hh * .015, 15, 'smile']];
      hop.forEach(([t, drop, arm, m], i) => { const p = fromGait(hg, t, ox + 1000 + i * 150 - dir * (hg.at(t).root[0] - dir * 0) * zoom, y2, { mouth: m, arms: { L: { a: arm, b: 25 }, R: { a: arm, b: 25 } } }); p.hip -= drop; put(p.x * zoom, y2, p); });
      if (!(hop[1][1] < 0 && hop[3][1] < 0)) motion.push('hop: no gather or no landing');
      label('hop: gather · air · land · settle', ox + 1300, y2 + 28);
      ground(ox - 40, ox + 1780, y2);
    }
    // row 3: faces
    const y3 = 1040, faces = [['smile', 'flat'], ['grin', 'up'], ['o', 'up'], ['open', 'up'], ['flat', 'knit'], ['sad', 'soft']];
    faces.forEach(([m, b], i) => { const x = 360 + i * 240; put(x, y3 + 0, { yaw: i % 2 ? 25 : -25, mouth: m, brows: b, look: [i % 2 ? .6 : -.6, 0], blink: 0 }); label(m, x + 70, y3 - 40); });
  };
  window.DURATION = 1; window.FPS = 1; window.seek = () => draw(); window.runChecks = () => [...audit]; window.shotAt = () => ({ name: 'cast', i: 0, lt: 0 });
  window.castSheet = () => ({ audit: [...audit], views: 8, motion });
  window.film = { cast: true, plate: { notes: [] } };
  draw(); window.__ready = true;
}
