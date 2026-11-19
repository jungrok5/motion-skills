// ten-second-scene · check.mjs — the gates a scene must pass before it is done. Run from the project root:
//   node <skill>/scripts/check.mjs my-scene/scene.html [--min-rounds 5] [--duration 10] [--no-audit]
// Fails on: more than one file (besides three.module.min.js) · images / video / fetch / network · Math.random, Date,
// timers in the scene · a broken contract · non-determinism · a blank or frozen frame · measured density / light /
// colour floors · people out of proportion, out of joint range, sliding while planted, frozen at rest, or a big move
// with no anticipation · a cast sheet with joints out of range · an AUDIT.md whose last round is not all ✓ on this file.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { opt, flag, scenePath, sha, launch, open, measureInPage, parseAudit } from './_lib.mjs';

const file = scenePath('usage: check.mjs <scene.html> [--min-rounds 5] [--duration 10] [--no-audit]');
const dir = dirname(file), html = readFileSync(file, 'utf8');
const fails = [], warns = [], notes = [];
const fail = m => fails.push(m), warn = m => warns.push(m), note = m => notes.push(m);

// ---------- static: one file, code only, pure ----------
const noKit = html.replace(/<script data-kit="[\w.-]+">[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
const code = (noKit.match(/<script[^>]*id="scene-code"[^>]*>([\s\S]*?)<\/script>/) || [])[1];
if (!code) fail('no <script id="scene-code"> block — the scene code must live in it');
const refs = [...noKit.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)].map(m => m[1]).concat([...noKit.matchAll(/"imports"\s*:\s*\{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(/:\s*"([^"]+)"/g)].map(x => x[1])));
for (const r of refs) if (!/^\.?\/?three\.module\.min\.js$/.test(r) && !r.startsWith('#')) fail(`external file ${r} — a scene is ONE html file (three.module.min.js is the only file allowed beside it)`);
const banned = [[/<img\b|new\s+Image\s*\(|createImageBitmap|data:image\//, 'an image'], [/<video\b|<audio\b|\.mp4\b|\.webm\b|\.gif\b|\.png\b|\.jpe?g\b|\.webp\b/i, 'a media file'], [/\bfetch\s*\(|XMLHttpRequest|WebSocket|import\s*\(\s*['"]https?:/, 'a network call'], [/https?:\/\//, 'a URL']];
for (const [re, what] of banned) { const m = noKit.replace(/<!--[\s\S]*?-->/g, '').match(re); if (m) fail(`${what} in the page (${m[0]}) — everything is drawn in code`); }
if (code) for (const [re, what] of [[/Math\.random/, 'Math.random (use TSS.rng(seed))'], [/Date\.now|new Date|performance\.now/, 'a clock (the only time is t)'], [/setTimeout|setInterval|requestAnimationFrame/, 'a timer (frames come from seek(t))']]) if (re.test(code.replace(/\/\/.*$/gm, ''))) fail(`scene uses ${what}`);
if (/from ['"]three['"]/.test(html) && !existsSync(join(dir, 'three.module.min.js'))) fail('imports three but three.module.min.js is not beside the scene (new-scene.mjs --refresh copies it)');

// ---------- runtime ----------
const browser = await launch();
let page, errors, requests;
try { ({ page, errors, requests } = await open(browser, file)); } catch (e) { fail('scene did not load: ' + e.message.slice(0, 400)); }
if (page) {
  const info = await page.evaluate(() => ({ D: window.DURATION, FPS: window.FPS, S: window.SIZE, info: window.sceneInfo ? window.sceneInfo() : null, probe: !!window.probe }));
  const want = +opt('duration', 10);
  if (!(Math.abs(info.D - want) <= .5)) fail(`DURATION ${info.D} s — this skill makes ${want} s scenes (--duration to change)`);
  if (!info.FPS || !info.S) fail('missing FPS / SIZE in the contract');
  note(`${info.info?.renderer} · ${info.S.W}×${info.S.H} · ${info.D} s @ ${info.FPS} fps` + Object.entries(info.info || {}).filter(([k]) => !['title', 'renderer', 'W', 'H', 'duration', 'fps'].includes(k)).map(([k, v]) => ` · ${k} ${typeof v === 'number' ? v.toLocaleString('en') : v}`).join(''));
  const hash = async t => { const d = await page.evaluate(t => { window.seek(t); return document.getElementById('scene').toDataURL('image/png'); }, t); return createHash('md5').update(d).digest('hex'); };
  // determinism: the same t gives the same pixels, whatever was drawn before
  for (const t of [3.37, 7.9]) { const a = await hash(t); await hash(1.1); await hash(9.5); const b = await hash(t); if (a !== b) fail(`not deterministic at t=${t}: the frame differs after seeking elsewhere`); }
  // alive: pictures everywhere, something changes every frame, the shot changes over ten seconds
  const D = info.D, F = info.FPS, samples = [0, .4, 1.7, 3, 4.2, 5.5, 6.8, 8.1, 9.3, D - 1 / F];
  const ms = [];
  for (const t of samples) { await page.evaluate(t => window.seek(t), t); ms.push({ t, ...(await page.evaluate(measureInPage)) }); }
  for (const m of ms) if (m.p99 - m.p1 < .08) fail(`t=${m.t.toFixed(2)}: frame is nearly blank (luminance spread ${(m.p99 - m.p1).toFixed(2)})`);
  const still = [];
  for (const t of [.5, 2.5, 5, 7.5, 9.5]) {
    const diff = await page.evaluate(([t, F]) => {
      const c = document.getElementById('scene'), get = u => { window.seek(u); const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; const x = k.getContext('2d'); x.drawImage(c, 0, 0); return x.getImageData(0, 0, k.width, k.height).data; };
      const a = get(t), b = get(t + 1 / F); let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) n++; return n / (a.length / 4);
    }, [t, F]);
    if (diff < .0005) still.push(t);
  }
  if (still.length) fail(`frozen frames: nothing changes between consecutive frames at t=${still.join(', ')} s (every moment breathes)`);
  // measured floors (the eye decides in audit rounds; these catch the obvious code-demo tells)
  const avg = k => ms.reduce((a, m) => a + m[k], 0) / ms.length, worst = (k, f) => ms.reduce((a, m) => f(a, m[k]), ms[0][k]);
  const flatW = worst('flat', Math.max), spread = avg('p99') - avg('p1'), clipW = worst('clip', Math.max), lit = avg('litPlace'), hue = avg('hueEntropy');
  note(`measured: flat ≤ ${(flatW * 100).toFixed(1)}% · luminance ${avg('p1').toFixed(2)}–${avg('p99').toFixed(2)} · lit place ${lit.toFixed(1)}× · hue spread ${hue.toFixed(2)} · warm/cool ${avg('warmCool').toFixed(2)} · clip ≤ ${(clipW * 100).toFixed(2)}%`);
  if (flatW > .30) fail(`density: ${(flatW * 100).toFixed(0)}% of 24 px tiles are one flat value in some frame (limit 30%) — flat fills read as a code demo`);
  else if (flatW > .15) warn(`density: up to ${(flatW * 100).toFixed(0)}% flat tiles — look at the flattest crop in the audit`);
  if (spread < .5) fail(`light: luminance spans only ${spread.toFixed(2)} (p1–p99) — no real darks and lights (need ≥ 0.50)`);
  if (lit < 1.6) warn(`light: the brightest place is only ${lit.toFixed(1)}× the median — is anything actually lit?`);
  if (clipW > .03) fail(`colour: ${(clipW * 100).toFixed(1)}% of pixels are fully saturated and bright (limit 3%) — pure hues read as a demo`);
  // people
  if (info.probe) {
    const r = await page.evaluate(([D, F]) => {
      const out = { figures: 0, heads: [], viol: new Set(), slide: 0, slideAt: null, frozen: [], anticip: [] };
      const byId = {};
      for (let i = 0; i < Math.round(D * F); i++) { const t = i / F, P = window.probe(t); for (const f of (P && P.figures) || []) (byId[f.id] = byId[f.id] || []).push([t, f]); }
      for (const id in byId) {
        const seq = byId[id]; out.figures++;
        const f0 = seq[0][1]; if (f0.headPx) out.heads.push([id, f0.heightPx / f0.headPx, f0.child]);
        for (const [, f] of seq) for (const v of f.viol || []) out.viol.add(v);
        for (let i = 1; i < seq.length; i++) for (let k = 0; k < 2; k++) { const a = seq[i - 1][1].feet[k], b = seq[i][1].feet[k]; if (a && b && a.planted && b.planted) { const d = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]) * seq[i][1].pxPerM; if (d > out.slide) { out.slide = d; out.slideAt = `${id} t=${seq[i][0].toFixed(2)}`; } } }
        // idle: every 2 s window, some joint moves ≥ 0.6 px (or 0.4 % of the figure's height for small, far figures)
        for (let i = 0; i + 2 * F < seq.length; i += F) { const a = seq[i][1]; let mv = 0; for (let j = i + 1; j <= i + 2 * F; j++) { const b = seq[j][1]; for (const k in a.joints) mv = Math.max(mv, Math.hypot(b.joints[k][0] - a.joints[k][0], b.joints[k][1] - a.joints[k][1], b.joints[k][2] - a.joints[k][2]) * a.pxPerM); } const need = Math.min(.6, .004 * (a.heightPx || 150)); if (mv < need) { out.frozen.push(`${id} ${seq[i][0].toFixed(1)}–${seq[i + 2 * F][0].toFixed(1)} s (${mv.toFixed(2)} px)`); break; } }
        // anticipation: the declared channel first moves AGAINST the action
        for (const a of f0.actions || []) {
          const ch = u => { const best = seq.reduce((p, q) => Math.abs(q[0] - u) < Math.abs(p[0] - u) ? q : p); return best[1].channels[a.channel] * best[1].pxPerM; };
          const base = ch(a.t0 - a.antic - .1), dip = Math.min(...[.25, .5, .75, 1].map(k => (ch(a.t0 - a.antic * (1 - k)) - base) * (a.dir || 1)));
          out.anticip.push([id, a.name, -dip]);
        }
      }
      out.viol = [...out.viol]; return out;
    }, [info.D, info.FPS]);
    note(`people: ${r.figures} probed · heads tall ${r.heads.length ? Math.min(...r.heads.map(h => h[1])).toFixed(1) + '–' + Math.max(...r.heads.map(h => h[1])).toFixed(1) : '–'} · planted-foot slide ≤ ${r.slide.toFixed(2)} px · ${r.anticip.length} big move(s)`);
    for (const [id, h, child] of r.heads) { const [lo, hi] = child ? [4.2, 7.6] : [6.4, 8.4]; if (h < lo || h > hi) fail(`proportion: ${id} is ${h.toFixed(1)} heads tall (${child ? 'child' : 'adult'} ${lo}–${hi})`); }
    if (r.viol.length) fail(`joints out of range (${r.viol.length}): ${r.viol.slice(0, 4).join(' · ')}`);
    if (r.slide > 1.5) fail(`a planted foot slides ${r.slide.toFixed(2)} px between frames (${r.slideAt}) — limit 1.5 px`);
    if (r.frozen.length) fail(`frozen at rest: ${r.frozen.slice(0, 4).join(' · ')} — every idle breathes`);
    for (const [id, name, d] of r.anticip) if (d < .8) fail(`big move "${name}" (${id}) has no anticipation: the channel moves against the action by only ${d.toFixed(2)} px first`);
  } else note('people: none probed (a scene with people must expose probe(t) → { figures })');
  // the cast sheet
  if (/cast\s*\(\s*\)\s*\{/.test(code || '')) {
    const { page: cp } = await open(browser, file, '&sheet=cast');
    const rep = await cp.evaluate(() => window.castReport ? window.castReport() : null);
    if (!rep) fail('cast() exists but the cast sheet did not draw');
    else if (rep.violations.length) fail(`cast sheet: ${rep.violations.length} joint(s) out of range — ${rep.violations[0]}`);
    else note('cast sheet: 8 turns + motion rows both ways, joints in range');
  }
  for (const r of requests) if (!r.startsWith('file:') || !(r.includes(basename(file)) || /three\.module\.min\.js$/.test(r))) fail('network / file request: ' + r.slice(0, 120));
  for (const e of errors) fail(e);
}
await browser.close();

// ---------- the loop: AUDIT.md ----------
if (!flag('no-audit')) {
  const auditMd = join(dir, 'AUDIT.md'), min = +opt('min-rounds', 5);
  const rounds = existsSync(auditMd) ? parseAudit(readFileSync(auditMd, 'utf8')) : [], last = rounds[rounds.length - 1];
  if (!last) fail('AUDIT.md has no rounds — run audit.mjs (render → five random moments at 100% → five criteria → fix → again)');
  else {
    note(`audit: ${rounds.length} round(s), fails per round ${rounds.map(r => r.fails).join(' → ')}`);
    if (rounds.length < min) fail(`audit: ${rounds.length} round(s) — at least ${min}; one render is never the end (the source took 20–34)`);
    if (last.rows !== 5 || last.unjudged) fail(`audit: round ${last.n} is not fully judged`);
    if (last.fails) fail(`audit: round ${last.n} still has ${last.fails} ✗`);
    if (last.scene !== sha(file)) fail(`audit: scene.html changed after round ${last.n} — the passing round must be on the current file`);
    rounds.slice(0, -1).forEach(r => { if (r.fails && !r.fixes.length) fail(`audit: round ${r.n} failed with no Fixes written`); });
  }
}

for (const n of notes) console.log('  · ' + n);
for (const w of warns) console.log('  ! ' + w);
for (const f of fails) console.log('  ✗ ' + f);
console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
