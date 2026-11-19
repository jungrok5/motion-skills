// ten-second-scene · audit.mjs — one round of the source's loop: render, pick FIVE RANDOM moments, look at them at 100%,
// mark each against the five criteria (density · light · people/proportion · weight of motion · colour), fix, repeat.
//   node <skill>/scripts/audit.mjs my-scene/scene.html            → a new round: audit/round-NN/ + a block in AUDIT.md
//   node <skill>/scripts/audit.mjs my-scene/scene.html --status   → where the rounds stand (exit 0 = last round passed)
// Options: --seed N (replay a round's moments) · --n 5 · --gap .8 (min seconds between moments) · --crop 480
// A new round is refused while the last one has unjudged cells, or failed with no fixes written, or failed and the
// scene file is unchanged since — the loop only counts if each round is looked at and acted on.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { opt, flag, scenePath, sha, launch, open, buf, measureInPage, parseAudit } from './_lib.mjs';

const file = scenePath('usage: audit.mjs <scene.html> [--status] [--seed N]');
const dir = dirname(file), auditMd = join(dir, 'AUDIT.md'), cur = sha(file);
if (!existsSync(auditMd)) writeFileSync(auditMd, '# AUDIT\n');
const rounds = parseAudit(readFileSync(auditMd, 'utf8')), last = rounds[rounds.length - 1];

if (flag('status')) {
  if (!last) { console.log('no rounds yet — run audit.mjs to start round 1'); process.exit(1); }
  const ok = last.unjudged === 0 && last.fails === 0 && last.rows === 5 && last.scene === cur;
  console.log(`${rounds.length} round(s). Round ${last.n}: ${last.passes} ✓ · ${last.fails} ✗ · ${last.unjudged} unjudged · scene ${last.scene === cur ? 'unchanged since' : 'CHANGED since (audit again)'}`);
  console.log('fails per round: ' + rounds.map(r => `${r.n}:${r.fails}${r.unjudged ? '?' : ''}`).join(' '));
  console.log(ok ? 'PASS — the last round passed all 25 cells on the current file' : 'not passed yet');
  process.exit(ok ? 0 : 1);
}
if (last) {   // also with --seed: replaying moments never skips judging and fixing
  const why = last.unjudged ? `round ${last.n} has ${last.unjudged} unjudged cell(s) — mark every cell ✓ or ✗ <what is wrong> first`
    : last.failsWithoutNote ? `round ${last.n} has ✗ cells without a note — say what is wrong`
    : last.fails && !last.fixes.length ? `round ${last.n} failed ${last.fails} cell(s) — write what you changed under "Fixes" first`
    : last.fails && last.scene === cur ? `round ${last.n} failed and scene.html is unchanged — fix it before the next round` : null;
  if (why) { console.error('refused: ' + why); process.exit(1); }
}

const n = (last?.n || 0) + 1, N = +opt('n', 5), gap = +opt('gap', .8), CROP = +opt('crop', 480);
const seed = +(opt('seed') || (Date.now() % 1000003));
const browser = await launch();
const { page } = await open(browser, file);
const { D, FPS, W, H } = await page.evaluate(() => ({ D: window.DURATION, FPS: window.FPS, W: window.SIZE.W, H: window.SIZE.H }));
// five random moments, at least `gap` apart, snapped to frames
let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
let ts = [];
for (let tries = 0; ts.length < N && tries < 5000; tries++) { const t = Math.round(rnd() * (D - 1 / FPS) * FPS) / FPS; if (ts.every(u => Math.abs(u - t) >= gap)) ts.push(t); }
ts.sort((a, b) => a - b);
const out = join(dir, 'audit', `round-${String(n).padStart(2, '0')}`); mkdirSync(out, { recursive: true });
const rows = [];
for (const t of ts) {
  await page.evaluate(t => window.seek(t), t);
  const full = await page.evaluate(() => document.getElementById('scene').toDataURL('image/png'));
  const tag = 't' + t.toFixed(2).replace('.', '_');
  writeFileSync(join(out, tag + '.png'), buf(full));
  const m = await page.evaluate(measureInPage);
  // figures: proportion, sliding feet and idle motion around t (world metres → screen px)
  const fig = await page.evaluate(([t, D, FPS]) => {
    if (!window.probe) return null;
    const P = window.probe(t); const figs = (P && P.figures) || []; if (!figs.length) return { count: 0 };
    const heads = figs.filter(f => f.headPx > 0).map(f => f.heightPx / f.headPx).sort((a, b) => a - b);
    let slide = 0, idleMin = Infinity, viol = [];
    const t0 = Math.max(0, t - .5), t1 = Math.min(D - 1e-3, t + .5), frames = [];
    for (let u = t0; u <= t1; u += 1 / FPS) frames.push(window.probe(u).figures);
    const byId = {}; frames.forEach(fr => fr.forEach(f => (byId[f.id] = byId[f.id] || []).push(f)));
    for (const id in byId) {
      const seq = byId[id];
      for (let i = 1; i < seq.length; i++) for (let k = 0; k < 2; k++) { const a = seq[i - 1].feet[k], b = seq[i].feet[k]; if (a && b && a.planted && b.planted) slide = Math.max(slide, Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]) * seq[i].pxPerM); }
      let mv = 0; const j0 = seq[0].joints;
      for (const f of seq) for (const k in j0) mv = Math.max(mv, Math.hypot(f.joints[k][0] - j0[k][0], f.joints[k][1] - j0[k][1], f.joints[k][2] - j0[k][2]) * seq[0].pxPerM);
      idleMin = Math.min(idleMin, mv); viol.push(...(seq[0].viol || []));
    }
    const big = figs.slice().sort((a, b) => (b.heightPx || 0) - (a.heightPx || 0))[0];
    return { count: figs.length, heads: heads.length ? heads[Math.floor(heads.length / 2)] : null, slide, idleMin, viol: viol.length, big: big && big.screen ? { x: big.screen.x, y: big.screen.y - big.heightPx / 2, h: big.heightPx } : null };
  }, [t, D, FPS]);
  // three 100% crops: the flattest place (density), the brightest place (light), the biggest person (or busiest place)
  const win = Math.round(CROP / m.tile), best = (score, cmp) => { let bi = 0, bv = cmp > 0 ? -Infinity : Infinity; for (let y = 0; y + win <= m.th; y += 2) for (let x = 0; x + win <= m.tw; x += 2) { let v = 0; for (let yy = y; yy < y + win; yy++) for (let xx = x; xx < x + win; xx++) v += score(yy * m.tw + xx); if (cmp > 0 ? v > bv : v < bv) { bv = v; bi = [x, y]; } } return { x: bi[0] * m.tile, y: bi[1] * m.tile }; };
  const scale = await page.evaluate(() => document.getElementById('scene').width / window.SIZE.W);
  const cFlat = best(i => m.tileSd[i], -1), cLit = best(i => m.tileM[i], 1);
  const cFig = fig && fig.big ? { x: Math.round(fig.big.x * scale - CROP / 2), y: Math.round(fig.big.y * scale - CROP / 2) } : best(i => m.tileSd[i], 1);
  const strip = await page.evaluate(([crops, C]) => {
    const src = document.getElementById('scene'), c = document.createElement('canvas'); c.width = C * crops.length + 8 * (crops.length - 1); c.height = C + 26;
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    crops.forEach(([lab, p], i) => { const sx = Math.max(0, Math.min(src.width - C, p.x)), sy = Math.max(0, Math.min(src.height - C, p.y)); x.drawImage(src, sx, sy, C, C, i * (C + 8), 26, C, C); x.fillStyle = '#ddd'; x.font = '15px sans-serif'; x.fillText(`${lab} · 100% · (${sx}, ${sy})`, i * (C + 8) + 6, 18); });
    return c.toDataURL('image/png');
  }, [[['flattest place', cFlat], ['brightest place', cLit], [fig && fig.big ? 'largest person' : 'busiest place', cFig]], CROP]);
  writeFileSync(join(out, tag + '-crops.png'), buf(strip));
  const { tileSd, tileM, ...keep } = m;
  rows.push({ t, tag, m: keep, fig });
}
await browser.close();
writeFileSync(join(out, 'metrics.json'), JSON.stringify({ round: n, seed, scene: cur, moments: rows }, null, 1));
const f2 = x => x.toFixed(2), pc = x => (x * 100).toFixed(1) + '%';
const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
let md = `\n## Round ${n} · seed ${seed} · scene ${cur} · ${date}\nMoments (s): ${ts.map(f2).join(' · ')} — frames and 100% crops in \`${relative(dir, out)}/\`\n\n`;
md += '| t (s) | density | light | proportion | weight | colour |\n|---|---|---|---|---|---|\n';
for (const r of rows) md += `| ${f2(r.t)} | ? | ? | ? | ? | ? |\n`;
md += '\nMeasured (hints for where to look, not verdicts):\n\n| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
for (const r of rows) { const m = r.m, g = r.fig || {}; md += `| ${f2(r.t)} | ${pc(m.flat)} | ${f2(m.p1)}–${f2(m.p99)} | ${m.litPlace.toFixed(1)}× | ${f2(m.hueEntropy)} | ${f2(m.warmCool)} | ${pc(m.clip)} | ${g.count ?? '–'} | ${g.heads ? g.heads.toFixed(1) : '–'} | ${g.count ? g.slide.toFixed(2) : '–'} | ${g.count ? g.idleMin.toFixed(1) : '–'} |\n`; }
md += '\nFindings:\n- \n\nFixes:\n- \n';
appendFileSync(auditMd, md);
console.log(`round ${n} (seed ${seed}) → ${out}`);
for (const r of rows) console.log(`  ${f2(r.t)} s  ${join(out, r.tag + '.png')}  +  ${r.tag}-crops.png`);
console.log(`Now look at every frame and crop at 100%, then in ${auditMd}: mark each cell ✓ or ✗ <what is wrong>, write Findings,\nfix scene.html, write Fixes, and run the next round. Done = one round with all 25 ✓ on the current file.`);
