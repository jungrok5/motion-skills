// live.js — play a piece in the browser: the same strokes, the same paper, laid down one by one on a <canvas>.
//   import { play } from 'fp/live.js'; import { art } from './art.js';
//   play(document.querySelector('canvas'), art, { seconds: 30 });
// The page shows the drawing being made in the order art() recorded it. Contract for scripts: window.__fp = { done, stage, progress }.
// piece.html: ?s=30 seconds to draw · ?done draw it all at once · ?stage=3 show the sheet at the end of stage 3
import { Surface } from './surface.js';

export function play(canvas, art, o = {}) {
  const d = art();
  const fitW = o.width || Math.min(1920 * (o.maxScale ?? 1), Math.max(640, (canvas.clientWidth || 960) * Math.min(2, window.devicePixelRatio || 1)));
  const scale = o.scale || fitW / d.W;
  const surf = new Surface(d.W, d.H, scale, d.paper);
  canvas.width = surf.w; canvas.height = surf.h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(surf.w, surf.h);
  surf.toRGBA(img.data); ctx.putImageData(img, 0, 0);
  // time shared by how much drawing each stroke is
  const cost = d.ops.map((op) => Math.max(1, op.width) * Math.max(4, op.pts.length * 3));
  const total = cost.reduce((a, b) => a + b, 0);
  const secs = o.seconds ?? 30;
  const state = (window.__fp = { done: false, stage: d.stages[0]?.name || '', progress: 0, strokes: d.ops.length, title: d.title });
  let k = 0, acc = 0, t0 = null, stopped = false;
  const stageAt = (i) => { let s = ''; for (const st of d.stages) if (st.start <= i) s = st.name; return s; };
  function flush() {
    const r = surf.dirty; if (!r) return;
    const [x0, y0, x1, y1] = r, rw = x1 - x0 + 1, rh = y1 - y0 + 1;
    const part = ctx.createImageData(rw, rh);
    surf.toRGBA(part.data, r); ctx.putImageData(part, x0, y0);
    surf.dirty = null;
  }
  function step(now) {
    if (stopped) return;
    if (t0 == null) t0 = now;
    const target = Math.min(total, (total * (now - t0)) / (secs * 1000));
    const budget = performance.now() + 14;           // keep the page responsive; if the machine is slow the drawing just takes longer
    while (k < d.ops.length && acc + cost[k] <= target + 1e-6 && performance.now() < budget) { surf.apply(d.ops[k]); acc += cost[k]; k++; }
    flush();
    state.progress = k / d.ops.length; state.stage = stageAt(k);
    o.onProgress?.(state);
    if (k >= d.ops.length) { state.done = true; o.onDone?.(state); return; }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  return {
    drawing: d, surface: surf,
    // finish(): draw the rest now. finish(stageNumber): draw to the end of that stage (1-based) and stop there.
    finish(stageNo) {
      stopped = !!stageNo;
      const end = stageNo ? (d.stages[stageNo]?.start ?? d.ops.length) : d.ops.length;
      while (k < end) { surf.apply(d.ops[k]); acc += cost[k++]; }
      flush(); state.progress = k / d.ops.length; state.stage = stageAt(Math.max(0, k - 1)); state.done = k >= d.ops.length;
      o.onProgress?.(state); if (state.done) o.onDone?.(state);
    },
    stop() { stopped = true; },
  };
}
