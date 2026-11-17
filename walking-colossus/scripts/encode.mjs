// Frames + soundtrack -> MP4 (H.264 high, yuv420p, AAC 256k).
// Run from the project folder:  node <skill>/scripts/encode.mjs [--frames out/frames] [--audio out/audio.wav] [--out out/film.mp4] [--fps 30] [--every 1]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './_browser.mjs';

const a = parseArgs();
const dir = path.resolve(a._[0] || '.');
const fr = path.resolve(dir, a.frames || 'out/frames'), au = path.resolve(dir, a.audio || 'out/audio.wav'), out = path.resolve(dir, a.out || 'out/film.mp4');
const fps = +(a.fps || 30) / +(a.every || 1);
if (!fs.existsSync(fr)) { console.error('no frames in ' + fr); process.exit(1); }
const files = fs.readdirSync(fr).filter((f) => /^f_\d{6}\.png$/.test(f)).sort();
if (!files.length) { console.error('no frames in ' + fr); process.exit(1); }
// concat list so --every N previews (gaps in numbering) still encode
const list = path.join(fr, 'list.txt');
fs.writeFileSync(list, files.map((f) => `file '${f}'\nduration ${(1 / fps).toFixed(6)}`).join('\n') + `\nfile '${files[files.length - 1]}'\n`);
const args = ['-hide_banner', '-loglevel', 'warning', '-y', '-f', 'concat', '-safe', '0', '-i', list];
if (fs.existsSync(au)) args.push('-i', au);
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(fps),
  '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', '-tune', 'film');
if (fs.existsSync(au)) args.push('-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest');
args.push('-movflags', '+faststart', out);
fs.mkdirSync(path.dirname(out), { recursive: true });
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);
spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate', '-of', 'default=nw=1', out], { stdio: 'inherit' });
console.log('wrote ' + path.relative(dir, out) + (fs.existsSync(au) ? '' : '  (no audio: run audio.mjs first)'));
