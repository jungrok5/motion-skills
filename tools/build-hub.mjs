// Prerender the hub's skill cards from docs/skills.json into docs/index.html (between <!-- skills:start --> and <!-- skills:end -->).
// Usage: node tools/build-hub.mjs           rewrite docs/index.html
//        node tools/build-hub.mjs --check   exit 1 if docs/index.html is out of date (nothing written)
// The card markup comes from docs/assets/hub.js, which also renders the same cards in the browser.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const { renderCards } = createRequire(import.meta.url)(path.join(docs, 'assets', 'hub.js'));

const reg = JSON.parse(fs.readFileSync(path.join(docs, 'skills.json'), 'utf8'));
const problems = [];
const required = ['id', 'name', 'tagline', 'poster', 'tags', 'stats', 'page', 'source', 'absorbedFrom', 'workedExample'];
// skills registered before "sources" became required (2026-11): checked only if they have the field
const LEGACY = new Set(['canvas-film', 'tech-motion-explainer', 'promo-video', 'motion-webtoon', 'specimen-tour', 'cinematic-3d', 'machine-sim',
  'pixel-diorama', 'paper-road', 'pop-up-textbook', 'knit-diorama', 'painted-anime-short', 'ink-summoning', 'holo-pass', 'crayon-statechart']);
for (const s of reg.skills) {
  for (const k of required) if (s[k] == null) problems.push(`${s.id || '?'}: missing "${k}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id || '')) problems.push(`${s.id}: id must be kebab-case`);
  for (const f of [s.poster, path.join(s.page || '', 'index.html')]) if (f && !fs.existsSync(path.join(docs, f))) problems.push(`${s.id}: docs/${f} not found`);
  if (s.source && !fs.existsSync(path.join(root, s.source, 'SKILL.md'))) problems.push(`${s.id}: ${s.source}SKILL.md not found`);
  if (s.poster && fs.existsSync(path.join(docs, s.poster)) && fs.statSync(path.join(docs, s.poster)).size > 220_000) problems.push(`${s.id}: poster over 200 KB`);
  // sources: every link the user gave for this skill (repo, post, video, article), each written in SKILL.md and on the page
  if (s.sources == null) { if (!LEGACY.has(s.id)) problems.push(`${s.id}: missing "sources" (every link the user gave — CONTRIBUTING.md, 출처 남기기)`); }
  else if (!Array.isArray(s.sources) || !s.sources.length) problems.push(`${s.id}: "sources" must be a non-empty list of { title, url }`);
  else for (const x of s.sources) {
    if (!x || !x.title || !/^https?:\/\/\S+$/.test(x.url || '')) { problems.push(`${s.id}: bad source ${JSON.stringify(x)}`); continue; }
    const u = x.url.replace(/\/$/, '');
    const skillMd = s.source && fs.existsSync(path.join(root, s.source, 'SKILL.md')) ? fs.readFileSync(path.join(root, s.source, 'SKILL.md'), 'utf8') : '';
    const page = s.page && fs.existsSync(path.join(docs, s.page, 'index.html')) ? fs.readFileSync(path.join(docs, s.page, 'index.html'), 'utf8') : '';
    if (!skillMd.includes(u)) problems.push(`${s.id}: source ${x.url} is not written in ${s.source}SKILL.md`);
    if (!page.includes(u)) problems.push(`${s.id}: source ${x.url} is not linked on docs/${s.page}index.html`);
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const file = path.join(docs, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const re = /(<!-- skills:start[^>]*-->)[\s\S]*?(<!-- skills:end -->)/;
if (!re.test(html)) { console.error('markers <!-- skills:start --> / <!-- skills:end --> not found in docs/index.html'); process.exit(1); }
const next = html.replace(re, (_, a, b) => a + '\n' + renderCards(reg) + '\n' + b);
if (process.argv.includes('--check')) {
  if (next !== html) { console.error('docs/index.html is out of date: run node tools/build-hub.mjs'); process.exit(1); }
  console.log(`ok: ${reg.skills.length} skills, hub in sync`);
} else {
  fs.writeFileSync(file, next);
  console.log(`docs/index.html: ${reg.skills.length} skill cards ${next === html ? '(unchanged)' : 'written'}`);
}
