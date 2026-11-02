// cinematic-3d · film.mjs — join the shots of film.json into one film: dissolves between shots, a fade from and to black,
// the soundtrack if there is one. Shots without an MP4 in out/ are rendered first (render.mjs).
//   node <skill>/scripts/film.mjs                 → out/film.mp4 (master, CRF 17 ≤ 40 Mbps, tune grain) + out/film-share.mp4 (≤ 12 Mbps)
//   node <skill>/scripts/film.mjs --rerender rain → render that shot again first
// film.json: { title, fps, dissolve (s), fade (s), shots: [{ id, page }], audio: "audio/mix.wav" (optional) }
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const film = JSON.parse(readFileSync('film.json', 'utf8'));
const X = film.dissolve ?? .8, F = film.fade ?? .6, workers = opt('workers', '2');
const rer = (opt('rerender', '') || '').split(',');
const dur = f => +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString();
const files = [];
for (const s of film.shots) {
  const f = join('out', s.id + '.mp4');
  if (!existsSync(f) || rer.includes(s.id)) {
    console.log(`rendering ${s.id} …`);
    const r = spawnSync('node', [join(here, 'render.mjs'), s.page, '--name', s.id, '--workers', workers], { stdio: 'inherit' });
    if (r.status) process.exit(r.status);
  }
  files.push(f);
}
// xfade chain: each dissolve starts X seconds before the end of what has been joined so far
let chain = '', last = '[0:v]', t = 0;
files.forEach((f, i) => { if (!i) { t = dur(f); return; }
  const off = (t - X).toFixed(3); chain += `${last}[${i}:v]xfade=transition=fade:duration=${X}:offset=${off}[v${i}];`; last = `[v${i}]`; t = t - X + dur(f); });
const total = t;
chain += `${last}fade=t=in:st=0:d=${F},fade=t=out:st=${(total - F).toFixed(3)}:d=${F},format=yuv420p[v]`;
const audio = film.audio && existsSync(film.audio) ? film.audio : null;
const inputs = files.map(f => `-i "${f}"`).join(' ') + (audio ? ` -i "${audio}"` : '');
const amap = audio ? `-map ${files.length}:a -c:a aac -b:a 256k -af "afade=t=in:d=${F},afade=t=out:st=${(total - F).toFixed(3)}:d=${F}" -t ${total.toFixed(3)}` : '';
const common = `-filter_complex "${chain}" -map "[v]" ${amap} -r ${film.fps || 30} -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart`;
execSync(`ffmpeg -y -loglevel error ${inputs} ${common} -c:v libx264 -preset slow -crf 17 -maxrate 40M -bufsize 80M -tune grain out/film.mp4`, { stdio: 'inherit' });
execSync(`ffmpeg -y -loglevel error -i out/film.mp4 -map 0 -c:v libx264 -preset slow -crf 20 -maxrate 12M -bufsize 24M -tune grain -c:a copy -movflags +faststart out/film-share.mp4`, { stdio: 'inherit' });
console.log(`out/film.mp4  out/film-share.mp4  (${total.toFixed(2)} s${audio ? ', with sound' : ', silent'})`);
