// holo-pass · new-pass.mjs — start an invitation project: the deployable pass/ folder plus an invite.json to fill in.
//   node <skill>/scripts/new-pass.mjs my-party                     → template "home-party"
//   node <skill>/scripts/new-pass.mjs my-xmas --theme christmas    → any theme id (christmas, new-year, home-party, date-night, birthday, event)
//   node <skill>/scripts/new-pass.mjs my-party --from home-party   → start from a worked example in examples/
import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dir = args.find(a => !a.startsWith('--') && !['--theme', '--from'].includes(args[args.indexOf(a) - 1]));
if (!dir) { console.error('usage: new-pass.mjs <dir> [--theme christmas | --from home-party]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'invite.json'))) { console.error(`${out}/invite.json exists — not overwriting`); process.exit(1); }
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'pass'), join(out, 'pass'), { recursive: true });
let invite;
const from = opt('from');
if (from) invite = JSON.parse(readFileSync(join(skill, 'examples', from, 'invite.json'), 'utf8'));
else {
  const d = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  invite = { theme: opt('theme', 'home-party'), title: '', subtitle: '', no: String(100000 + Math.floor(Math.random() * 900000)), date: d, time: '18:00', end: '', place: '', address: '', price: '', to: '', from: '', message: '', music: '', rsvp: '', url: '', image: '', lang: 'ko' };
}
writeFileSync(join(out, 'invite.json'), JSON.stringify(invite, null, 2) + '\n');
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}
  invite.json   the invitation (empty fields take the theme's words)
  pass/         deploy this folder (GitHub Pages, Netlify, any static host); maker.html builds links in the browser

next, from ${dir}:
  node ${join(skill, 'scripts/check.mjs')} invite.json
  node ${join(skill, 'scripts/render.mjs')} invite.json --stills 1.3,4.2,6.5,10
  node ${join(skill, 'scripts/link.mjs')} invite.json --base https://<you>.github.io/<repo>/pass/ --qr out/qr.svg
  node ${join(skill, 'scripts/render.mjs')} invite.json            (MP4, 16:9; --size 1080x1920 for 9:16)`);
