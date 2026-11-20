// check.mjs — the gates a prompt-sprite-game project must pass. Reports numbers, not only pass / fail.
//
//   node <skill>/scripts/check.mjs <project> [--tessera]
//
//   files     index.html, game.json, lib/ present; lib/ is the skill's current lib (else: new-game.mjs --refresh)
//   data      kind, one player, roles, prompts, faces, mass, gait, legend and tile characters all defined
//   sprites   every hand grid is 16×16 with defined colours and enough opaque pixels to read
//   reach     platform: every item and the goal can be reached with the real jump; arena: nothing walled off
//   run       the level runs 20 s of seeded random input without an error, twice, to the same hash
//   motion    per moving cast member on a test yard, both ways: planted body drift, idle alive, stepped turn,
//             movement = facing, jump / pounce anticipation and landing squash, stop overshoot
//   page      no console errors or failed requests on load
//   --tessera also paint every prompt with Tessera in headless Chromium (CPU, ~25 s each) and check the sprite reads
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGame, projectArg, flag } from './_lib.mjs';

const project = projectArg();
const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = []; let failed = 0;
const gate = (name, ok, detail) => { rows.push([ok ? 'ok  ' : 'FAIL', name, detail]); if (!ok) failed++; };

// ---------------------------------------------------------------- files
for (const f of ['index.html', 'game.json', 'lib/engine.js', 'lib/tessera-link.js', 'lib/game.css']) gate(`files: ${f}`, fs.existsSync(path.join(project, f)), fs.existsSync(path.join(project, f)) ? 'present' : 'missing');
if (path.resolve(project, 'lib') !== path.join(skill, 'lib')) {
  const stale = ['engine.js', 'tessera-link.js', 'game.css'].filter((f) => fs.existsSync(path.join(project, 'lib', f)) && fs.readFileSync(path.join(project, 'lib', f), 'utf8') !== fs.readFileSync(path.join(skill, 'lib', f), 'utf8'));
  gate('files: lib/ is current', !stale.length, stale.length ? `differs from the skill: ${stale.join(', ')} (node ${path.relative(process.cwd(), skill)}/scripts/new-game.mjs ${path.relative(process.cwd(), project)} --refresh)` : 'same as the skill');
}
if (fs.existsSync(path.join(project, 'ref'))) {
  const gi = ['.gitignore', '../.gitignore', '../../.gitignore', '../../../.gitignore'].map((g) => path.join(project, g)).filter((g) => fs.existsSync(g)).map((g) => fs.readFileSync(g, 'utf8')).join('\n');
  gate('files: ref/ ignored', /(^|\n)\/?ref\/?(\n|$)/.test(gi), /(^|\n)\/?ref\/?(\n|$)/.test(gi) ? 'ref/ is git-ignored' : 'ref/ holds generated sprites: add "ref/" to .gitignore');
}

// ---------------------------------------------------------------- data
const data = JSON.parse(fs.readFileSync(path.join(project, 'game.json'), 'utf8'));
const problems = [];
const kind = data.kind || 'platform';
if (!['platform', 'arena'].includes(kind)) problems.push(`kind "${kind}" (platform | arena)`);
if (!data.title) problems.push('no title');
const cast = data.cast || {};
const byRole = (r) => Object.keys(cast).filter((k) => cast[k].role === r);
if (byRole('player').length !== 1) problems.push(`${byRole('player').length} players (needs exactly 1)`);
if (!byRole('item').length) problems.push('no item');
if (kind === 'platform' && (data.rules?.win || 'goal') === 'goal' && byRole('goal').length !== 1) problems.push('platform with win "goal" needs one goal');
for (const [k, m] of Object.entries(cast)) {
  if (!['player', 'item', 'enemy', 'goal'].includes(m.role)) problems.push(`${k}: role "${m.role}"`);
  if (!m.prompt || typeof m.prompt !== 'string') problems.push(`${k}: no prompt (Tessera paints from it)`);
  else if (/^REPLACE/.test(m.prompt) || /^REPLACE/.test(data.text?.intro || '')) problems.push(`${k}: still the starter's placeholder — design it from the brief`);
  else if (m.prompt.length > 60) problems.push(`${k}: prompt longer than 60 characters (CLIP reads 24 tokens)`);
  else if (/[^\x20-\x7e]/.test(m.prompt)) problems.push(`${k}: prompt is not plain English ("${m.prompt}") — the CLIP text encoder reads English`);
  if (!['right', 'left', 'front'].includes(m.faces || 'front')) problems.push(`${k}: faces "${m.faces}"`);
  if (!['hop', 'glide', 'still'].includes(m.gait || 'hop')) problems.push(`${k}: gait "${m.gait}"`);
  if (m.mass != null && !(m.mass >= 0.4 && m.mass <= 4)) problems.push(`${k}: mass ${m.mass} (0.4–4)`);
  if ((m.role === 'player' || m.role === 'enemy') && m.gait === 'still' && m.move !== 'still') problems.push(`${k}: a moving ${m.role} cannot have gait "still"`);
}
const legend = data.legend || {}, tiles = data.tiles || {};
for (const [ch, k] of Object.entries(legend)) if (!cast[k]) problems.push(`legend '${ch}' → "${k}" is not in cast`);
const used = new Set((data.level || []).join(''));
for (const ch of used) if (ch !== '.' && ch !== ' ' && !legend[ch] && !tiles[ch]) problems.push(`level character '${ch}' is neither a tile nor in the legend`);
if (!(data.level || []).length) problems.push('no level');
if (kind === 'arena' && !data.floor) problems.push('arena needs a floor');
// a themed painter (train/): its vocabulary must know every word of the prompts it paints
if (data.painter) {
  const P = data.painter, pp = [];
  if (!P.src) pp.push('painter.src missing');
  for (const k of P.for || []) if (!cast[k]) pp.push(`painter.for "${k}" is not in cast`);
  if (P.src && /^https?:/.test(P.src)) {
    try {
      const meta = await (await fetch(P.src + '.json')).json(); const known = new Set(meta.vocab);
      for (const k of P.for || []) { const pr = (cast[k]?.painterPrompt || cast[k]?.prompt || '').toLowerCase(); const unk = (pr.match(/[a-z]+(?:-[a-z]+)*/g) || []).filter((w) => !known.has(w)); if (unk.length) pp.push(`${k}: the "${meta.name}" painter does not know ${unk.join(', ')}`); }
      gate('painter', !pp.length, pp.length ? pp.join('; ') : `"${meta.name}" painter (${meta.vocab.length} words) paints ${(P.for || []).join(', ')}`);
    } catch (e) { gate('painter', false, `cannot read ${P.src}.json: ${e.message}`); }
  } else gate('painter', !pp.length, pp.length ? pp.join('; ') : `painter at ${P.src} (vocabulary not checked: not a URL)`);
}
gate('data', !problems.length, problems.length ? problems.join('; ') : `${kind}, ${Object.keys(cast).length} cast (${['player', 'item', 'enemy', 'goal'].map((r) => `${byRole(r).length} ${r}`).join(', ')}), level ${data.level.length}×${Math.max(...data.level.map((r) => r.length))}`);

// ---------------------------------------------------------------- in the browser
const g = await openGame(project, 'test=1');
const res = await g.page.evaluate(async ({ tessera }) => {
  const G = window.GAME; const E = await import('./lib/engine.js');
  const out = { sprites: {}, motion: {} };
  // sprites
  for (const [k, m] of Object.entries(G.data.cast)) {
    const { problems } = E.handRGBA(m, G.data.colors);
    const s = G.hand[k];
    out.sprites[k] = { problems, opaque: s.opaque, w: s.w, h: s.h };
  }
  out.reach = G.reach();
  // seeded random run, twice
  const run = (seed) => {
    G.newGame({ seed: 11, sprites: G.hand }); const r = E.rng(seed); let held = {}; let errs = 0;
    for (let i = 0; i < 1200; i++) {
      if (i % 15 === 0) held = { left: r() < 0.3, right: r() < 0.6, up: r() < 0.3, down: r() < 0.2, jump: r() < 0.4 };
      try { G.game.step({ ...held, jumpPressed: held.jump && i % 15 === 0 }); G.game.draw(document.querySelector('canvas').getContext('2d')); } catch (e) { errs++; out.err = String(e.stack || e); break; }
    }
    return { hash: G.game.hash(), errs, state: G.game.state, got: G.game.got, lives: G.game.lives };
  };
  out.run = [run(5), run(5)];
  // motion on the yard
  const arena = G.data.kind === 'arena';
  for (const [k, m] of Object.entries(G.data.cast)) {
    if (m.role !== 'player' && m.role !== 'enemy') continue;
    if (m.move === 'still') continue;
    G.yard(k, { sprites: G.hand });
    const sprH = G.hand[k].h;
    const plan = (f) => f < 240 ? {} : f < 360 ? { right: true } : f < 480 ? {} : f < 600 ? { left: true } : f < 720 ? {} : f === 720 ? { jump: true, jumpPressed: true } : f < 780 ? { jump: true } : f < 900 ? {} : f < 960 ? { down: arena, right: !arena } : {};
    let prev = null, drift = 0, driftAt = -1, idleH = new Set(), idleLean = new Set(), idleLift = new Set(), facingBad = 0, movingTurn = 0, squat = 0, leftGround = -1, landSy = 1, overshoot = 0, turnFrames = 0, turnMoved = 0;
    for (let f = 0; f < 1000; f++) {
      const s = G.step(plan(f)).player;
      const B = G.game.player.body;
      if (prev) {
        const dx = s.x - prev.x, dy = arena ? s.y - prev.y : 0;
        if (s.planted && prev.planted && (s.grounded || arena) && m.gait !== 'glide') { const d = Math.hypot(dx, dy); if (d > drift) { drift = d; driftAt = f; } }
        if (B.turnT > 0) { turnFrames++; turnMoved = Math.max(turnMoved, Math.abs(dx)); }
        if (Math.abs(dx) > 0.05 && Math.sign(dx) !== s.facing && f > 240) facingBad++;
        if (Math.abs(dx) > 0.05 && B.turnT > 0 && m.gait !== 'glide') movingTurn++;
      }
      if (f < 240 && f > 30) { idleH.add(Math.round(s.pose.sy * sprH)); idleLean.add(Math.round(s.pose.lean)); idleLift.add(s.pose.lift); }
      if (f >= 360 && f < 480 && m.gait !== 'glide') overshoot = Math.max(overshoot, s.pose.lean); // stopped after running right: the top swings forward (+)
      if (f >= 720 && f < 800) { if (s.phase === 'squat') squat++; if (leftGround < 0 && (arena ? s.phase === 'air' : !s.grounded)) leftGround = f; }
      if (f >= 740 && f < 900 && leftGround > 0 && (s.phase === 'land' || s.phase === 'rest')) landSy = Math.min(landSy, s.pose.sy);
      prev = s;
    }
    out.motion[k] = { gait: m.gait || 'hop', faces: m.faces || 'front', mass: m.mass ?? 1, drift: +drift.toFixed(3), driftAt, idleHeights: idleH.size, idleLeans: idleLean.size, idleLifts: idleLift.size, facingBad, movingTurn, turnFrames, turnMoved: +turnMoved.toFixed(3), squat, leftGround, landSy: +landSy.toFixed(3), overshoot: +overshoot.toFixed(2), timing: E.timing(m.mass ?? 1) };
  }
  if (tessera) {
    const T = await import('./lib/tessera-link.js'); out.tessera = {};
    for (const [k, m] of Object.entries(G.data.cast)) {
      const rgba = await T.spriteFor({ prompt: m.prompt, seed: m.seed ?? 7, pick: m.pick ?? 0 }, { device: navigator.gpu ? 'auto' : 'wasm' });
      const s = E.makeSprite(rgba, 'tessera');
      out.tessera[k] = { opaque: s.opaque, w: s.w, h: s.h, edge: s.x0 === 0 || s.x1 === 15 || s.y0 === 0 };
    }
  }
  return out;
}, { tessera: !!flag('tessera') });

for (const [k, s] of Object.entries(res.sprites)) {
  const p = [...s.problems];
  if (s.opaque < 30) p.push(`only ${s.opaque} opaque pixels`);
  if (s.w < 6 || s.h < 5) p.push(`${s.w}×${s.h} px is too small to read`);
  gate(`sprite: ${k}`, !p.length, p.length ? p.join('; ') : `${s.w}×${s.h} px, ${s.opaque} opaque`);
}
gate('reach', res.reach.ok, res.reach.ok ? `${res.reach.targets.length} targets reachable${res.reach.apexPx ? `, jump apex ${res.reach.apexPx} px (${res.reach.apexTiles} tiles)` : ''}` : res.reach.problems.join('; '));
const [r1, r2] = res.run;
gate('run: no error', !r1.errs && !r2.errs, r1.errs ? res.err : `20 s random input: state ${r1.state}, ${r1.got} picked, ${r1.lives} lives`);
gate('run: deterministic', r1.hash === r2.hash, `${r1.hash} / ${r2.hash}`);
for (const [k, m] of Object.entries(res.motion)) {
  const T = m.timing, glide = m.gait === 'glide';
  if (!glide) gate(`motion ${k}: planted body does not slide`, m.drift <= 1, `max ${m.drift} px while planted${m.drift > 1 ? ` (frame ${m.driftAt})` : ''}`);
  gate(`motion ${k}: idle breathes`, m.idleHeights >= 2 || m.idleLeans >= 2 || m.idleLifts >= 2, `${m.idleHeights} drawn heights, ${m.idleLeans} lean offsets, ${m.idleLifts} lifts over 3.5 s of idle`);
  gate(`motion ${k}: moves the way it faces`, m.facingBad === 0, `${m.facingBad} frames moving against its facing`);
  if (!glide && m.faces !== 'front') gate(`motion ${k}: stepped turn`, m.turnFrames >= 3 && m.movingTurn === 0, `${m.turnFrames} turn frames, ${m.movingTurn} of them travelling (max ${m.turnMoved} px)`);
  if (!glide) gate(`motion ${k}: anticipation before the jump`, m.squat >= 2 && m.leftGround > 0, `${m.squat} squat frames (timing ${T.squat}), left the ground at frame ${m.leftGround}`);
  if (!glide) gate(`motion ${k}: landing squash`, m.landSy <= 0.95, `lowest height ${Math.round(m.landSy * 100)} % on landing (mass ${m.mass})`);
  if (!glide) gate(`motion ${k}: stop overshoot`, m.overshoot >= 0.5, `top swings ${m.overshoot} px past upright after stopping`);
}
if (res.tessera) for (const [k, t] of Object.entries(res.tessera)) gate(`tessera: ${k}`, t.opaque >= 30 && t.opaque <= 250, `${t.w}×${t.h} px, ${t.opaque} opaque${t.edge ? ', touches the edge' : ''}`);
const pageErrs = g.errors.filter((e) => !/favicon/.test(e));
gate('page: no errors', !pageErrs.length, pageErrs.length ? pageErrs.slice(0, 3).join(' | ') : 'clean');
await g.close();

const w = Math.max(...rows.map((r) => r[1].length));
for (const [s, n, d] of rows) console.log(`${s}  ${n.padEnd(w)}  ${d}`);
console.log(failed ? `\n${failed} gate(s) failed` : `\nall ${rows.length} gates passed`);
process.exit(failed ? 1 : 0);
