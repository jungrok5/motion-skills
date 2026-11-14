// ink-water-emergence · cast.js — the cast sheet: every creature from the front, 3/4 and side, turned BOTH ways, from
// behind, and in its key poses (walk, crouch, roar …), fully formed and in calm water, each tile labelled with any joint
// that is out of range. Render it (scripts/render.mjs cast.html --stills 0) and score it before writing shots.
//
// CastSheet({ cast: { lion: { body, look } }, poses: [{ name, st: { s, speed, roar, crouch, look … } }], cols, tile })
import { createWater } from './water.js';
import { camera, paintForm } from './paint.js';
import { checkPose } from './body.js';

export const VIEWS = [
  { name: 'front', yaw: 90 }, { name: '3/4 right', yaw: 40 }, { name: 'side right', yaw: 0 }, { name: 'back 3/4', yaw: -130 },
  { name: 'side left', yaw: 180 }, { name: '3/4 left', yaw: 140 }, { name: 'back', yaw: -90 },
];

export function CastSheet({ cast, poses = [{ name: 'stand', st: {} }], views = VIEWS, cols = 4, tile = [640, 400], water = {} }) {
  const [TW, TH] = tile, M = .12;
  const gl = document.createElement('canvas'); gl.width = TW; gl.height = TH;
  const form = document.createElement('canvas'); form.width = Math.round(TW * (1 + 2 * M)); form.height = Math.round(TH * (1 + 2 * M));
  const fctx = form.getContext('2d');
  const W = createWater(gl, { W: TW, H: TH, margin: M });
  const tiles = [];
  for (const [name, c] of Object.entries(cast)) {
    for (const v of views) tiles.push({ name, c, view: v, pose: poses[0] });
    for (const p of poses.slice(1)) tiles.push({ name, c, view: { name: p.view || '3/4 right', yaw: p.yaw ?? 35, pitch: p.pitch ?? 6 }, pose: p });
  }
  const rows = Math.ceil(tiles.length / cols);
  const sheet = document.createElement('canvas'); sheet.width = cols * TW; sheet.height = rows * TH;
  const sx = sheet.getContext('2d'); sx.fillStyle = '#e8e8e8'; sx.fillRect(0, 0, sheet.width, sheet.height);
  const problems = [];
  tiles.forEach((tl, i) => {
    const st = { t: 1, ...tl.pose.st }; for (const k of ['pitch', 'roll']) if (st[k]) st[k] *= Math.PI / 180;   // degrees, as in film tracks
    const pose = tl.c.body.pose(st);
    const kind = tl.c.body.kind, h = pose.height || 1, L = pose.length || 1;
    const at = kind === 'quadruped' ? [pose.root[0] * .45 + pose.withers[0] * .55, h * .55, 0] : [pose.root[0], pose.root[1], pose.root[2]];
    const dist = kind === 'quadruped' ? Math.max(L, h * 1.6) * 2.3 : L * 1.45;
    const cam = camera({ at, yaw: tl.view.yaw, pitch: tl.view.pitch ?? 8, dist, fov: 30 }, TW, TH, M);
    paintForm(fctx, { cam, creatures: [{ pose, look: tl.c.look, e: 1, seed: tl.c.seed || 1 }] });
    const hz = .5 + Math.tan((tl.view.pitch ?? 8) * Math.PI / 180) / Math.tan(15 * Math.PI / 180) * .5;
    W.render(form, { t: 1, cam: cam.uni, len: .12, warp: .002, smoke: .25, body: 1, rise: .1, horizon: hz, grain: 0, ...water });
    const x = (i % cols) * TW, y = Math.floor(i / cols) * TH;
    sx.drawImage(gl, x, y);
    const bad = checkPose(tl.c.body, pose);
    sx.font = '600 20px system-ui, sans-serif'; sx.fillStyle = '#222'; sx.fillText(`${tl.name} · ${tl.pose.name} · ${tl.view.name}`, x + 14, y + 30);
    if (bad.length) { sx.fillStyle = '#b00'; sx.font = '15px system-ui'; bad.slice(0, 4).forEach((b, k) => sx.fillText(b, x + 14, y + 54 + k * 18)); problems.push(...bad.map(b => `${tl.name}/${tl.pose.name}/${tl.view.name}: ${b}`)); }
    sx.strokeStyle = 'rgba(0,0,0,.25)'; sx.strokeRect(x + .5, y + .5, TW - 1, TH - 1);
  });
  document.body.style.cssText = 'margin:0;background:#ddd';
  sheet.style.cssText = 'display:block;max-width:100%';
  document.body.appendChild(sheet);
  Object.assign(window, { castProblems: problems, seek: () => { }, DURATION: 1, FPS: 1, SIZE: { W: sheet.width, H: sheet.height } });
  window.__ready = true;
  return { sheet, problems };
}
