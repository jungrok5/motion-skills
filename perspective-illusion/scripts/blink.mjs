// perspective-illusion · blink.mjs — the final-render check: finds pixels that blink (flip brighter / darker / brighter on
// consecutive frames) in frames where the camera is nearly still, so real motion does not count; and reports freezes
// (runs of identical frames). Writes a heat map over a still frame and prints the worst moments.
//   node <skill>/scripts/blink.mjs out/scene.mp4 [out/blink.png]
// Compare the count before and after a change. Judge blinking on the final only: previews shimmer by design.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const [vid, out = 'out/blink.png'] = process.argv.slice(2);
if (!vid || !existsSync(vid)) { console.error('usage: blink.mjs <video.mp4> [heat.png]'); process.exit(1); }
const W = 640, H = 360, N = W * H;
const fps = (() => { const r = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', vid]).toString().trim().split('/'); return +r[0] / (+r[1] || 1); })();
const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', vid, '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 2 ** 32 });
const n = Math.floor(raw.length / N), fr = (i) => raw.subarray(i * N, (i + 1) * N);
const glob = []; for (let i = 1; i < n; i++) { const a = fr(i), b = fr(i - 1); let s = 0; for (let p = 0; p < N; p++) s += Math.abs(a[p] - b[p]); glob.push(s / N); }
const heat = new Float32Array(N), per = new Array(n).fill(0); let stills = 0;
for (let i = 1; i < n - 1; i++) {
  const still = glob[i - 1] < 2.5 && glob[i] < 2.5; const A = fr(i - 1), B = fr(i), C = fr(i + 1); let k = 0;
  for (let p = 0; p < N; p++) { const x = C[p] - B[p], y = B[p] - A[p]; if (Math.sign(x) !== Math.sign(y) && Math.min(Math.abs(x), Math.abs(y)) > 18) { k++; if (still) heat[p]++; } }
  per[i] = (k / N) * 100; if (still) stills++;
}
let blinking = 0; for (let p = 0; p < N; p++) { heat[p] /= Math.max(1, stills); if (heat[p] > 0.05) blinking++; }
let freeze = 0, run = 0, at = 0; for (let i = 0; i < glob.length; i++) { if (glob[i] < 0.02) { run++; if (run > freeze) { freeze = run; at = i - run + 1; } } else run = 0; }
console.log(`${n} frames @ ${fps} fps · nearly still frames: ${stills} · pixels blinking in > 5% of them: ${blinking}`);
const worst = per.map((v, i) => [v, i]).filter(([, i]) => glob[i - 1] < 2.5).sort((a, b) => b[0] - a[0]).slice(0, 6);
for (const [v, i] of worst) console.log(`  t = ${(i / fps).toFixed(2)} s  blink ${v.toFixed(2)}% of pixels`);
console.log(freeze > 1 ? `longest freeze: ${freeze + 1} identical frames from ${(at / fps).toFixed(2)} s${freeze + 1 > fps * 0.7 ? '  ← add a drift shot' : ''}` : 'no freezes');
// heat map: red over a darkened still frame
const base = fr(worst.length ? worst[0][1] : 0), rgb = Buffer.alloc(N * 3);   // drawn over the worst moment
for (let p = 0; p < N; p++) { const h = Math.min(1, heat[p] / 0.1), g = base[p] * 0.6; rgb[p * 3] = Math.max(g, h * 255); rgb[p * 3 + 1] = g * (1 - h * 0.7); rgb[p * 3 + 2] = g * (1 - h * 0.7); }
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-i', '-', '-frames:v', '1', out], { input: rgb });
console.log(out);
