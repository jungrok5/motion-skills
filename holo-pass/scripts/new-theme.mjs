// holo-pass · new-theme.mjs — scaffold a theme designed for one topic: a picture, a palette, words, and slots for a
// background and a music track of its own. Appends a block to a themes file that the pages load.
//   node <skill>/scripts/new-theme.mjs graduation                        → pass/themes/custom.js (a project)
//   node <skill>/scripts/new-theme.mjs graduation --into themes.js       → a themes.js next to an invite.json
//   node <skill>/scripts/new-theme.mjs graduation --like birthday        → start from that theme's palette
// Then fill it from BRIEF.md (references/BRIEF.md), set "theme": "<id>" in invite.json, and run check.mjs.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const id = args.find(a => !a.startsWith('--') && !['--into', '--like'].includes(args[args.indexOf(a) - 1]));
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) { console.error('usage: new-theme.mjs <id: lowercase-with-dashes> [--into pass/themes/custom.js] [--like home-party]'); process.exit(1); }
const into = resolve(opt('into', 'pass/themes/custom.js'));
const like = opt('like', 'home-party');
// read the palette of the --like theme out of the skill's themes.js
const src = readFileSync(join(here, '../pass/lib/themes.js'), 'utf8');
const m = new RegExp(`'${like}':[\\s\\S]*?(pal: \\{[\\s\\S]*?\\}),\\n    \\}`).exec(src);
if (!m) { console.error(`no theme "${like}" in the skill's themes.js`); process.exit(1); }
const pal = m[1].replace(/\n\s+/g, '\n      ');
if (existsSync(into) && readFileSync(into, 'utf8').includes(`id: '${id}'`)) { console.error(`${into} already has a theme "${id}"`); process.exit(1); }
mkdirSync(dirname(into), { recursive: true });
const block = `
// ---- ${id} — designed from BRIEF.md: <one line: the subject and its motion> ----
(() => {
  const { W, H, TAU, ol, fill, rr, circle, frac, face, star, rays, sky, glow, confetti, twinkles, cloud } = HP.KIT;

  HP.addTheme({
    id: '${id}',
    name: { ko: '…', en: '…', ja: '…' },                 // shown in the maker
    title: 'TITLE\\nHERE',                                 // 1–3 short lines, capitals
    subtitle: { ko: '…', en: '…', ja: '…' },             // ≤ ~18 characters
    message: { ko: '…', en: '…', ja: '…' },              // ≤ 4 lines on the back
    bg: 'warm',            // night | rays | warm | dusk | confetti — or HP.BG.${id.replace(/-/g, '_')} below
    music: 'party',        // bells | koto | cafe | party — or HP.addTrack('${id}', …) below
    ${pal},
  }, (c, t, pal) => {       // the picture: 480 × 380, a pure function of t
    const [a0, a1, a2, a3, a4] = pal.a;
    // 1. a full background (nothing may show through)
    rays(c, 240, 200, 16, t * 0.1, pal.sky[0], pal.sky[1]);
    // 2. the subject from the brief: big, centred, outlined, with a face
    const bob = Math.sin(t * Math.PI) * 6;
    circle(c, 240, 210 - bob, 92); fill(c, a0); ol(c, pal); face(c, pal, 240, 210 - bob, 84, t, 1);
    // 3. its 2–4 s loop of motion (the brief's "beat"), plus something small and constant
    confetti(c, t, 24, pal.a, 3);
  });

  // optional: a stage background of its own (1600 × 900 or 900 × 1600)
  // HP.BG.${id.replace(/-/g, '_')} = (c, W, H, t, pal) => { const { radial, bokeh, stars, flakes, confetti, vignette } = HP.BGKIT; radial(c, W, H, pal.bg[0], pal.bg[1]); vignette(c, W, H); };

  // optional: a track composed for the topic (events in beats; see references/THEMES.md)
  // HP.addTrack('${id}', { name: '…', bpm: 100, bars: 8, build({ line, midi, chords }) {
  //   const ev = line(['D5 - F#5 A5 …', …8 bars of eighths…], 'bell', 0.45);
  //   chords(['D3 F#3 A3', …]).forEach((ch, b) => ch.forEach(m => ev.push({ t: b * 4, dur: 4, inst: 'pad', m, vel: 0.22 })));
  //   return ev; } });
})();
`;
writeFileSync(into, (existsSync(into) ? readFileSync(into, 'utf8') : '// holo-pass · themes designed for this project\n') + block);
console.log(`${into}: added "${id}" (palette from ${like})
next: fill it from BRIEF.md, set "theme": "${id}" in invite.json, then
  node ${join(here, 'check.mjs')} invite.json
  node ${join(here, 'render.mjs')} invite.json --stills 1.3,4.2,6.5,10`);
