// Start a new pop-up quest book: a project folder with its own copy of the kit, an index.html, a BRIEF.md to fill
// first, and a book.js whose chapters are placeholders that already pass scripts/check.mjs — every one of them is
// meant to be redesigned for the topic (landmark, prop, guide, ground, task), not kept.
// Usage: node <skill>/scripts/new-book.mjs <dir> --title "The Seed Post" --chapters "Frost Gate,Root Cellar,Sun Ledge"
//        [--hero fox] [--subtitle "HOW A SEED BECOMES A TREE"] [--kit-link]   (--kit-link: point at the skill's kit
//        instead of copying it, for books that live inside the skill folder)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const bool = n => { const i = args.indexOf(n); if (i >= 0) args.splice(i, 1); return i >= 0; };
const title = flag('--title', 'A New Quest'), subtitle = flag('--subtitle', 'A POP-UP QUEST');
const names = flag('--chapters', 'First Stop,Second Stop,Third Stop').split(',').map(s => s.trim()).filter(Boolean);
const species = flag('--hero', 'fox'), link = bool('--kit-link');
const dir = args[0];
if (!dir) { console.error('usage: new-book.mjs <dir> --title "…" --chapters "A,B,C" [--hero fox] [--subtitle "…"] [--kit-link]'); process.exit(1); }
if (fs.existsSync(path.join(dir, 'book.js'))) { console.error(`${dir}/book.js exists — not overwriting`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
let kit = './kit';
if (link) kit = path.relative(path.resolve(dir), path.join(skill, 'kit')).split(path.sep).join('/');
else fs.cpSync(path.join(skill, 'kit'), path.join(dir, 'kit'), { recursive: true });

const id = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const skies = ['morning', 'day', 'day', 'dusk', 'night'];
const guides = ['owl', 'bear', 'mouse', 'frog', 'cat', 'rabbit', 'penguin'];
const chapters = names.map((n, i) => {
  const words = n.split(' '), half = Math.ceil(words.length / 2), g = guides[i % guides.length];
  const sky = skies[Math.min(skies.length - 1, Math.round(i / Math.max(1, names.length - 1) * (skies.length - 1)))];
  return `    {
      id: '${id(n)}', title: ${JSON.stringify([words.slice(0, half).join(' '), words.slice(half).join(' ') || ''].filter(Boolean))}, region: 'TODO region', feature: 'TODO idea', stamp: 'TODO stamp', coords: 'N ${10 + i * 5}° · E ${4 + i * 6}°', sky: '${sky}',
      line: 'TODO one sentence the reader sees under the book (≤ 110 characters).',
      story: 'TODO two or three sentences of story for “Read this page”.',
      lesson: 'TODO the idea this chapter teaches, in plain words.',
      hint: 'TODO what to poke.', prop: { label: 'TODO verb the prop', hint: 'TODO a nudge shown in the task card' },
      task: { type: 'choice', prompt: 'TODO the question', options: ['TODO right answer', 'TODO tempting wrong answer', 'TODO another wrong answer'], answer: 0, hint: 'TODO hint after a wrong pick', solved: 'TODO what happens when it is solved.' },
      ground: { land: '#a9c47c', path: [[-4.6, 2.2], [-2.6, 1.6], [-.8, 1.2]] },
      set(S) {
        const { P, C } = S;   // redesign this set for the topic: its landmark, its prop, its ground, its guide
        S.ridge(-5.4, 5.4, -2.9, [[-4.4, 1.0], [-2.6, .7], [-1.0, 1.1], [.8, .8], [2.6, 1.15], [4.4, .8]], '#8fb070');
        S.${sky === 'night' ? 'moon' : 'sun'}(3.4, -2.4, 3.1, .5); S.cloud(-.6, -2.3, 2.8, 1.1);
        for (const [x, z, h] of [[-5.0, -1.4, 1.2], [-4.2, -2.0, 1.0], [5.0, -1.2, 1.2]]) S.pine(x, z, h);
        S.house(1.8, -1.0, { w: 1.6, h: 1.3, d: 1.0, roofC: C.red });          // TODO the landmark of this place
        const prop = S.prop('chest', .8, .8, g => { P.box(g, 0, .16, 0, .5, .32, .34, C.wood); const lid = P.group(g, 0, .32, -.17); lid.name = 'lid'; P.box(lid, 0, .04, .17, .52, .08, .36, C.honey); }, { label: 'TODO verb the prop' });
        const lid = prop.item.content.getObjectByName('lid');
        prop.on(c => { lid.rotation.x = -c.solved * 1.4 - (c.poke != null ? Math.exp(-3 * c.poke) * Math.sin(c.poke * 18) * .2 : 0); });
        S.sign(-1.2, 2.5, '${n.slice(0, 12)}', 1);
        S.hero(-1.8, 1.25);
        S.guide('guide${i + 1}', 2.8, 1.25, { facing: -1 });
      },
    }`;
});
const guideCast = names.map((n, i) => `    guide${i + 1}: { name: 'TODO name', species: '${guides[i % guides.length]}', mass: '${['medium', 'heavy', 'light'][i % 3]}', height: 1.05, fur: '#9a7756', belly: '#ead6aa', coat: '#56688c' },`).join('\n');
fs.writeFileSync(path.join(dir, 'book.js'), `// ${title} — a pop-up quest. Fill BRIEF.md first; then redesign every chapter below for the topic.
// Data and builder reference: <skill>/references/BOOK.md · cast: <skill>/references/CAST.md
export default {
  title: ${JSON.stringify(title)},
  subtitle: ${JSON.stringify(subtitle)},
  mark: 'book',
  theme: { cover: '#8a3b2f', cloth: '#4b6a5f', accent: '#e7b14a' },
  hero: 'hero',
  cast: {
    hero: { name: 'TODO hero name', species: '${species}', mass: 'light', height: 1.08, fur: '#e08a3c', belly: '#f4e6c8', coat: '#3f6f5a', bag: '#b8763b' },
${guideCast}
  },
  chapters: [
${chapters.join(',\n')}
  ],
};
`);
fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} · a pop-up quest</title>
<link rel="stylesheet" href="${kit}/quest.css">
<script type="importmap">{ "imports": { "three": "${kit}/vendor/three/build/three.module.min.js" } }</script>
</head>
<body>
<script type="module">
import { createQuest } from '${kit}/quest.js';
import book from './book.js';
createQuest(book);
</script>
</body>
</html>
`);
fs.copyFileSync(path.join(skill, 'references', 'BRIEF.md'), path.join(dir, 'BRIEF.md'));
console.log(`made ${dir}/ (book.js with ${names.length} placeholder chapters, index.html, BRIEF.md${link ? '' : ', kit/'})
next: fill BRIEF.md, redesign each chapter in book.js, then
  python3 -m http.server 8000   →  http://localhost:8000/${dir.replace(/\\/g, '/')}/
  node ${(r => r.startsWith('../../') ? path.join(skill, 'scripts/check.mjs') : r)(path.relative(process.cwd(), path.join(skill, 'scripts/check.mjs')))} ${dir}/index.html`);
