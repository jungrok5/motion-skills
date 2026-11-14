// ink-water-emergence · refs.mjs — the reference's own technique, as files: for every shot, a TRANSLUCENT PRE-FORM still
// (the creature frozen at the moment just before it takes shape) and a FORMED still, plus a prompt sheet. Hand these to an
// image-to-video model (first frame / reference image + prompt) when you want an AI-rendered take of the same shots: the
// pre-form keeps the water fluid, the formed still and the shared cast keep the shape consistent from cut to cut.
// The code film itself does not need any of this.
//   node <skill>/scripts/refs.mjs film.html                 → refs/<n>-<shot>-pre.png, -form.png, refs/PROMPTS.md
//   node <skill>/scripts/refs.mjs film.html --pre .3 --at .5 --scale .75 --out refs
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { args, openFilm, pageOf, rootOf, serve, browser, png } from './_lib.mjs';

const { a, opt } = args(process.argv);
const target = a.find(x => !x.startsWith('--'));
if (!target) { console.error('usage: refs.mjs <film.html | project dir> [--pre .3] [--at .5] [--scale 1] [--out refs]'); process.exit(1); }
const page$ = resolve(pageOf(target)), out = resolve(opt('out', 'refs')); mkdirSync(out, { recursive: true });
const pre = +opt('pre', .3), at = +opt('at', .5), scale = opt('scale', '1');
const server = serve(rootOf(page$)), br = await browser();
const shot = async (query, t) => { const f = await openFilm(page$, query, { b: br, server }); const d = await f.page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, t); await f.close(); return d; };
const base = await openFilm(page$, `render=1&scale=${scale}`, { b: br, server });
const shots = await base.page.evaluate(() => window.film.shots.map(s => ({ name: s.name, t0: s.t0, t1: s.t1, cam: s.cam })));
const cast = await base.page.evaluate(() => Object.entries(window.film.spec.cast).map(([k, c]) => `${k} (${c.body.kind}${c.body.spec.name ? ', ' + c.body.spec.name : ''})`));
await base.close();
const brief$ = join(dirname(page$), 'BRIEF.md'), brief = existsSync(brief$) ? readFileSync(brief$, 'utf8') : '';
const subject = (brief.match(/^SUBJECT:\s*(.+)$/m) || [])[1] || cast.join(', ');
const lines = [`# Reference frames and prompts — ${subject}`, '',
  'For an image-to-video model. Per shot: give `-pre.png` as the first frame / image reference (the translucent state just',
  'before the form appears — it keeps the whole picture fluid), `-form.png` as the end frame or a second reference when the',
  'model takes one (it keeps the shape consistent), and the prompt below. Keep the same STYLE line on every shot.', '',
  '**STYLE (every shot):** sumi ink drifting in still, clear water, seen through the glass of a seamless pale-grey studio tank;',
  'monochrome with warm grey midtones and deep blacks; ink billows, curls and stretches into fine filaments; the subject is',
  'made of the same ink — translucent washes, darker pooled patches, wet edges — and keeps shedding thin smoke from its',
  'edges even when fully formed; soft floor shadow; no colour, no text, no particles of light, no CG plastic surfaces.', ''];
for (const [i, s] of shots.entries()) {
  const t = +(s.t0 + (s.t1 - s.t0) * at).toFixed(3), n = String(i + 1).padStart(2, '0'), slug = s.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  writeFileSync(join(out, `${n}-${slug}-pre.png`), png(await shot(`render=1&scale=${scale}&e=${pre}&fluid=1`, t)));
  writeFileSync(join(out, `${n}-${slug}-form.png`), png(await shot(`render=1&scale=${scale}&e=1&fluid=.3`, t)));
  const c = s.cam[0] || {}, size = (c.dist || 4) < 2.6 ? 'close-up' : (c.dist || 4) < 4.5 ? 'medium shot' : 'wide shot';
  const angle = (c.pitch || 0) < -8 ? 'low angle looking up' : (c.pitch || 0) > 10 ? 'high angle' : 'eye level';
  lines.push(`## ${n} · ${s.name} · ${(s.t1 - s.t0).toFixed(1)} s`, '',
    `- frames: \`${n}-${slug}-pre.png\` → \`${n}-${slug}-form.png\``,
    `- camera: ${size}, ${angle}, ${c.on ? 'framed on the ' + c.on.split('.')[1] : 'framed as in the code film'}, slow continuous drift`,
    `- prompt: "${subject} — ${s.name}. The ink in the water gathers into the form: it starts as the translucent pre-form in the`,
    `  first frame and condenses, staying fluid at the edges. ${size}, ${angle}. [describe the action of this shot from BRIEF.md]"`, '');
  process.stdout.write(`  ${n} ${s.name}\r`);
}
writeFileSync(join(out, 'PROMPTS.md'), lines.join('\n'));
await br.close(); server.server.close();
console.log(`\n${out}/PROMPTS.md  (${shots.length} shots × pre/form stills)`);
