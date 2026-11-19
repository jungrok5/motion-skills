// sheet.mjs — the cast sheet (every body turned both ways, with its motion) and stills of the level in play.
//
//   node <skill>/scripts/sheet.mjs <project>              → sheets/cast.png, sheets/still-1..5.png (hand-drawn sprites)
//   node <skill>/scripts/sheet.mjs <project> --tessera    → the same with the Tessera sprites, into ref/sheets/ (git-ignored)
//
// Cast sheet rows per moving member, facing right then left:
//   idle (4 moments of a breath) · hop cycle · stop (the top swings past upright and settles) · stepped turn ·
//   jump / pounce: squat (anticipation) → take-off → apex → landing squash → recovery.
// Items and the goal get an idle strip. A ground line runs under every cell: a foot off it while planted is a fail.
// Judge it with the questions in references/BRIEF.md ("Does anything float, skate, or stand dead still? …").
import fs from 'node:fs';
import path from 'node:path';
import { openGame, projectArg, flag } from './_lib.mjs';

const project = projectArg();
const tessera = !!flag('tessera');
const outDir = path.join(project, tessera ? 'ref/sheets' : 'sheets');
fs.mkdirSync(outDir, { recursive: true });
const g = await openGame(project, 'test=1', { width: 1280, height: 800 });
g.page.setDefaultTimeout(0);

const png = await g.page.evaluate(async ({ tessera }) => {
  const G = window.GAME; const E = await import('./lib/engine.js');
  let sprites = G.hand;
  if (tessera) {
    const T = await import('./lib/tessera-link.js'); sprites = {};
    for (const [k, m] of Object.entries(G.data.cast)) sprites[k] = E.makeSprite(await T.spriteFor({ prompt: m.prompt, seed: m.seed ?? 7, pick: m.pick ?? 0 }, { device: navigator.gpu ? 'auto' : 'wasm' }), 'tessera');
  }
  const arena = G.data.kind === 'arena';
  const pal = G.data.palette || {};
  const CELL = 30, CH = arena ? 42 : 30, S = 3, LABEL = 60; // an arena pounce rises higher than a cell is wide
  const strips = []; // { title, cells: [{ label, pose, key, planted }] }
  const keys = Object.keys(G.data.cast);
  for (const k of keys) {
    const m = G.data.cast[k];
    const moving = (m.role === 'player' || m.role === 'enemy') && m.move !== 'still';
    if (!moving) {
      G.yard(k, { sprites }); const cells = [];
      for (let f = 0; f < 160; f++) { G.game.step({}); if (f % 20 === 0) cells.push({ label: `IDLE ${f / 20 + 1}`, pose: G.game.player.body.pose(), key: k, planted: true }); }
      strips.push({ title: `${k.toUpperCase()} · ${m.role.toUpperCase()}`, cells });
      continue;
    }
    for (const d of [1, -1]) {
      G.yard(k, { sprites });
      const P = () => G.game.player, cells = [];
      const grab = (label) => cells.push({ label, pose: P().body.pose(), key: k, planted: P().planted });
      const dirIn = (x) => (x > 0 ? { right: true } : { left: true });
      // face the row's way first (a left row starts with a turn the sheet does not show)
      for (let f = 0; f < 40; f++) G.game.step(d < 0 && f < 20 ? { left: true } : {});
      for (let f = 0; f < 50; f++) G.game.step({});
      for (let f = 0; f < 120; f++) { G.game.step({}); if (f % 30 === 0) grab(`IDLE ${f / 30 + 1}`); }
      // hop cycle: skip the first (gathering) hop, then grab one full cycle
      let n = 0, startF = -1; const T = P().body.T, cyc = T.hop + T.contact;
      if (m.gait === 'glide') for (let f = 0; f < 60; f++) { G.game.step(dirIn(d)); if (f >= 24 && f % 6 === 0) grab(`MOVE ${f / 6 - 3}`); }
      else for (let f = 0; f < 90; f++) { G.game.step(dirIn(d)); if (P().body.hops >= 2 && startF < 0 && P().body.phase === 'contact') startF = f; if (startF >= 0 && n < 6 && (f - startF) % Math.max(1, Math.round(cyc / 6)) === 0) { grab(`HOP ${++n}`); } }
      for (let f = 0; f < 40; f++) { G.game.step({}); if (f % 6 === 0 && f <= 24) grab(`STOP ${f / 6 + 1}`); }
      // stepped turn (to the other way and back)
      let tn = 0; for (let f = 0; f < 30; f++) { G.game.step(f < 14 ? dirIn(-d) : {}); if (P().body.turnT > 0 && tn < 5 && f % 1 === 0) { grab(`TURN ${++tn}`); } }
      for (let f = 0; f < 30; f++) G.game.step(f < 14 ? dirIn(d) : {});
      for (let f = 0; f < 40; f++) G.game.step({});
      // big move (a flyer has none: its sheet ends with the turn)
      if (m.gait === 'glide') { strips.push({ title: `${k.toUpperCase()} · ${d > 0 ? 'RIGHT' : 'LEFT'} · MASS ${m.mass ?? 1} · GLIDE · FACES ${(m.faces || 'front').toUpperCase()}`, cells }); continue; }
      let phase = '', apexY = Infinity, apexPose = null, landF = -1, sq = 0;
      const big = arena ? 'POUNCE' : 'JUMP';
      for (let f = 0; f < 110; f++) {
        G.game.step(f === 0 ? { jump: true, jumpPressed: true, ...(arena ? dirIn(d) : {}) } : f < 40 ? { jump: true } : {});
        const p = P(), ph = p.body.phase;
        if (ph === 'squat') { sq++; if (sq === 1 || sq === p.body.T.squat - 1) grab(`SQUAT ${sq}`); }
        if (ph === 'air' && phase !== 'air') grab('LIFT');
        if (ph === 'air') { const y = arena ? -p.z : p.y; if (y < apexY) { apexY = y; apexPose = { label: 'APEX', pose: p.body.pose(), key: k, planted: false }; } }
        if (ph === 'land' && phase !== 'land') { if (apexPose) cells.push(apexPose); landF = f; }
        if (landF >= 0 && (f - landF === 1 || f - landF === 4)) grab(f - landF === 1 ? 'LAND' : 'SETTLE');
        if (landF >= 0 && f - landF === p.body.T.recover + 6) grab('RECOVER');
        phase = ph;
      }
      strips.push({ title: `${k.toUpperCase()} · ${d > 0 ? 'RIGHT' : 'LEFT'} · MASS ${m.mass ?? 1} · ${(m.gait || 'hop').toUpperCase()} · FACES ${(m.faces || 'front').toUpperCase()}`, cells });
    }
  }
  const cols = Math.max(...strips.map((s) => s.cells.length));
  const W = LABEL + cols * CELL, H = strips.length * (CH + 12) + 14;
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S; const x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.scale(S, S);
  x.fillStyle = '#17161f'; x.fillRect(0, 0, W, H);
  E.text(x, `${(G.data.title && /^[\x20-\x7e]+$/.test(G.data.title) ? G.data.title : 'CAST SHEET')} · ${tessera ? 'TESSERA SPRITES' : 'HAND SPRITES'}`, 4, 4, '#ffcf5a');
  strips.forEach((s, i) => {
    const y0 = 14 + i * (CH + 12);
    E.text(x, s.title, 4, y0, '#d8d2c4');
    s.cells.forEach((cell, j) => {
      const cx = LABEL + j * CELL, cy = y0 + 7;
      x.fillStyle = (i + j) % 2 ? '#22212c' : '#1d1c26'; x.fillRect(cx, cy, CELL - 1, CH - 1);
      x.fillStyle = cell.planted ? '#7d7a8c' : '#3c3a4a'; x.fillRect(cx + 2, cy + CH - 5, CELL - 5, 1);
      E.drawSprite(x, sprites[cell.key], cx + CELL / 2, cy + CH - 5, cell.pose);
      E.text(x, cell.label.replace(/ \d$/, ''), cx + 1, cy + 1, '#8c8798', 1);
    });
  });
  return c.toDataURL('image/png');
}, { tessera });
fs.writeFileSync(path.join(outDir, 'cast.png'), Buffer.from(png.split(',')[1], 'base64'));
console.log(`cast sheet → ${path.relative(process.cwd(), path.join(outDir, 'cast.png'))}`);

// stills: the level played by the autopilot, five moments
const frames = [90, 330, 570, 810, 1050];
const stills = await g.page.evaluate(async ({ frames }) => {
  const G = window.GAME; const E = await import('./lib/engine.js');
  G.newGame({ sprites: G.hand }); const out = []; const cv = document.querySelector('canvas'); const ctx = cv.getContext('2d');
  for (let f = 0; f <= frames.at(-1); f++) { G.game.step(E.autopilot(G.game)); if (frames.includes(f)) { G.game.draw(ctx); const c = document.createElement('canvas'); c.width = cv.width * 3; c.height = cv.height * 3; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, c.width, c.height); out.push(c.toDataURL('image/png')); } }
  return out;
}, { frames });
stills.forEach((d, i) => fs.writeFileSync(path.join(outDir, `still-${i + 1}.png`), Buffer.from(d.split(',')[1], 'base64')));
console.log(`stills → ${path.relative(process.cwd(), outDir)}/still-1..${stills.length}.png (frames ${frames.join(', ')})`);
await g.close();
