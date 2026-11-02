// pixel-diorama · extend.mjs — repeat the one-loop MP4 into a long video (10 hours for a lofi stream), optionally with audio.
//   node <skill>/scripts/extend.mjs out/scene.mp4 --hours 10                         → out/scene-10h.mp4 (video only)
//   node <skill>/scripts/extend.mjs out/scene.mp4 --hours 1 --audio music/mix.mp3     → audio looped under it (AAC 192k)
//   node <skill>/scripts/extend.mjs out/scene.mp4 --minutes 3 --out out/preview.mp4
// The video is never re-encoded: the loop file is listed N times for ffmpeg's concat demuxer and copied, so 10 hours take
// seconds and look exactly like the loop. Only the audio is encoded (it is looped with -stream_loop and cut to length).
// The audio track loops on its own length, which need not match the video loop; make the audio seamless itself.
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const src = resolve(args.find(a => a.endsWith('.mp4')) || '');
if (!existsSync(src)) { console.error('usage: extend.mjs <loop.mp4> [--hours 10 | --minutes 30] [--audio file] [--out file]'); process.exit(1); }
const total = opt('minutes') ? +opt('minutes') * 60 : +opt('hours', 10) * 3600;
const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString().trim();
const n = Math.ceil(total / dur);
const label = total % 3600 === 0 ? `${total / 3600}h` : `${Math.round(total / 60)}m`;
const out = resolve(opt('out', join(dirname(src), basename(src, '.mp4') + `-${label}.mp4`)));
const list = out + '.list.txt';
writeFileSync(list, Array.from({ length: n }, () => `file '${src.replace(/'/g, "'\\''")}'`).join('\n'));
console.log(`${basename(src)}: ${dur.toFixed(2)} s × ${n} → ${(total / 3600).toFixed(2)} h`);
const audio = opt('audio');
const a = ['-y', '-loglevel', 'error', '-stats', '-f', 'concat', '-safe', '0', '-i', list];
if (audio) a.push('-stream_loop', '-1', '-i', resolve(audio), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', opt('abitrate', '192k'));
a.push('-c:v', 'copy', '-t', String(total), '-movflags', '+faststart', out);
execFileSync('ffmpeg', a, { stdio: 'inherit' });
rmSync(list);
console.log(`${out}  (${(statSync(out).size / 1e9).toFixed(2)} GB)`);
