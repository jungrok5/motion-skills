// principle-pass · audit.mjs — the principles meter for ANY skill's motion (see references/ANIMATION-PRINCIPLES.md).
//   node principle-pass/scripts/audit.mjs track.json                    one track → a table of numbers
//   node principle-pass/scripts/audit.mjs before.json after.json        two tracks → what the pass changed
//   node principle-pass/scripts/audit.mjs --page path/index.html        a page that exposes window.__principles
//        [--side after]  [--json out.json]  [--strict] (exit 1 when a principle fails)
// A track is plain JSON: { fps, scale, points: { name: [[x, y], …] }, squash?, beats, chains, planted, rest, impacts }.
// A page exposes it as window.__principles = { fps, sides?: ['before', 'after'], track(side) } once window.__ready is
// true; points are sampled by the page itself (seek is not needed), so the meter reads exactly what is drawn.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { audit, compare, table } from '../lib/principles.js';

const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i > -1 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const files = args.filter((a, i) => !a.startsWith('--') && !['--side', '--json', '--page'].includes(args[i - 1]) && a.endsWith('.json'));
let tracks = files.map(f => JSON.parse(readFileSync(f, 'utf8')));
const page = opt('page');
if (page) {
  const require = createRequire(import.meta.url); let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
  const p$ = resolve(page); if (!existsSync(p$)) { console.error('no such page: ' + page); process.exit(1); }
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }), pg = await b.newPage();
  pg.on('pageerror', e => console.error('page error:', e.message));
  await pg.goto(pathToFileURL(p$).href + '?render=1'); await pg.waitForFunction(() => window.__ready === true && window.__principles, null, { timeout: 120000 });
  const side = opt('side');
  tracks = await pg.evaluate(side => { const P = window.__principles; return side ? [P.track(side)] : P.sides?.length ? P.sides.map(s => P.track(s)) : [P.track()]; }, side === true ? null : side);
  await b.close();
}
if (!tracks.length) { console.error('usage: audit.mjs <track.json> [after.json] | --page <index.html> [--side after] [--json out] [--strict]'); process.exit(1); }

let pass, out;
if (tracks.length === 2) {
  const c = compare(tracks[0], tracks[1]); out = c; pass = c.after.pass;
  console.log('  principle                            before         after');
  for (const r of c.rows) console.log(`  ${r.name.padEnd(34)} ${String(r.before ?? '—').padStart(8)} ${r.beforePass ? 'ok' : '--'}   ${String(r.after).padStart(8)} ${r.afterPass ? 'ok' : 'XX'}   ${r.unit}`);
  console.log(`\n  after: ${c.after.passed}/${c.after.of} pass · before: ${c.before.passed}/${c.before.of}`);
} else {
  const r = audit(tracks[0]); out = r; pass = r.pass;
  console.log(table(r)); console.log(`\n  ${r.passed}/${r.of} pass`);
}
console.log('  not measured — judge on stills: staging, solid drawing, appeal, exaggeration (references/ANIMATION-PRINCIPLES.md)');
if (opt('json')) writeFileSync(opt('json'), JSON.stringify(out, null, 1));
process.exit(opt('strict') && !pass ? 1 : 0);
