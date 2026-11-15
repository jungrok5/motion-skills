// pencil-dream-short · sheet.js — the cast sheet: the hero turned through eight views (front, 3/4 and profile BOTH ways,
// back), the drawing pose reaching both ways, the catch, and the faces. Render it and score it before any shot is written
// (references/BRIEF.md → cast review). Also draws extra characters (the giant) passed as draw functions.
//   castSheet({ hero: HERO, paper, spot, extra: [(pt, x, y) => parts …] })  → sets the page contract (seek, __ready)
import { Painter } from './draw.js';
import { hero, blinkAt } from './hero.js';
import { toothTile } from './pencil.js';

export function castSheet(o) {
  const W = 1920, H = 1080, q = new URLSearchParams(location.search), sc = +(q.get('scale') || 1);
  const c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc; c.style.width = '100%'; document.body.style.margin = 0; document.body.style.background = '#222'; document.body.appendChild(c);
  const ctx = c.getContext('2d'), pt = new Painter(ctx, { paper: o.paper, spot: o.spot, lead: o.lead }), spec = o.hero, Hh = spec.H || 240;
  const audit = new Set();
  const draw = () => {
    ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.fillStyle = o.paper; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(toothTile(3), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    // world = stage at zoom (H*3.3 world fits 1080)
    const zoom = 1080 / (Hh * 3.25); pt.view({ x: 960 / zoom, y: 540 / zoom, w: 1920 / zoom }, W, H, zoom * .55);
    const put = (wx, wy, pose) => { const h = hero(spec, { x: wx / zoom, y: wy / zoom, ...pose }); h.audit.forEach(a => audit.add(a)); pt.parts(h.parts); return h; };
    const label = (s, x, y) => { ctx.font = '22px Georgia, serif'; ctx.fillStyle = 'rgba(40,40,44,.7)'; ctx.textAlign = 'center'; ctx.fillText(s, x, y); };
    // row 1: the turn — 8 views
    const yaws = [0, 45, 90, 135, 180, -135, -90, -45];
    yaws.forEach((yw, i) => { const x = 130 + i * 237; put(x, 470, { yaw: yw, mouth: 'smile', blink: 0, hold: null }); label(`yaw ${yw}°`, x, 505); });
    // row 2: drawing both ways, the catch, a head turn on a front body, faces
    const fy = 1000;
    // the drawing reach, both ways: a target in front of the chest, ~.3 H out from the shoulder
    const hd = spec.hand || 'R', reach = (sx, yw, dx) => { const sh = hero(spec, { x: sx / zoom, y: fy / zoom, yaw: yw }).at.shoulder[hd]; return [sh[0] + dx * Hh * .28, sh[1] + Hh * .13]; };
    put(150, fy, { yaw: 35, hold: hd, arms: { [hd]: { to: reach(150, 35, 1) } }, mouth: 'smile', look: [.8, .6] }); label('draws → right', 150, fy + 35);
    put(420, fy, { yaw: -35, hold: hd, arms: { [hd]: { to: reach(420, -35, -1) } }, mouth: 'smile', look: [-.8, .6] }); label('draws ← left', 420, fy + 35);
    put(690, fy, { yaw: 10, open: 'R', arms: { R: { a: 150, b: 20 } }, head: { pitch: 25 }, look: [0, -1], mouth: 'o', brows: 'up' }); label('catch, looks up', 690, fy + 35);
    put(930, fy, { yaw: 0, head: { yaw: 60, roll: 8 }, look: [1, 0], mouth: 'smirk' }); label('head 60° on a front body', 930, fy + 35);
    // faces (bust scale)
    const faces = [['smile', 'flat'], ['grin', 'up'], ['o', 'up'], ['flat', 'knit'], ['open', 'soft']];
    faces.forEach(([m, b], i) => { const x = 1160 + i * 155; put(x, fy, { yaw: i % 2 ? 20 : -20, mouth: m, brows: b, look: [i % 2 ? .6 : -.6, 0], blink: 0 }); label(m, x, fy + 35); });
    if (o.extra) o.extra.forEach(fn => fn(pt, ctx, zoom));
    window.__audit = [...audit];
  };
  window.DURATION = 1; window.FPS = 1; window.seek = () => draw(); window.runChecks = () => [...audit]; window.shotAt = () => ({ name: 'cast', i: 0, lt: 0 });
  window.film = { cast: true, shots: [{ name: 'cast', start: 0, dur: 1 }], fadeIn: 0, fadeOut: 0, boilFps: 1 };
  draw(); window.__ready = true;
}
