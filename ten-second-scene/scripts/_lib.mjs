// ten-second-scene · shared helpers for the scripts: open a scene page in headless Chromium, grab frames, measure them.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

export const args = process.argv.slice(2);
export const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
export const flag = k => args.includes('--' + k);
export function scenePath(usage) {
  const p = args.find(a => a.endsWith('.html'));
  if (!p || !existsSync(resolve(p))) { console.error(usage); process.exit(1); }
  return resolve(p);
}
export const sceneName = p => basename(p) === 'scene.html' || basename(p) === 'index.html' ? basename(dirname(p)) : basename(p).replace(/\.html$/, '');
export const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12);

export async function launch() {
  return chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
}
// open(browser, file, '&sheet=cast') → { page, errors, requests }
export async function open(browser, file, extra = '', o = {}) {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|swiftshader|WebGL/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('request', r => requests.push(r.url()));
  await page.goto(pathToFileURL(file).href + '?render=1' + (o.scale ? '&scale=' + o.scale : '') + extra, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true).catch(() => false));) {
    if (errors.length) throw new Error(errors.join('\n'));
    if (Date.now() - t0 > (o.timeout || 180000)) throw new Error('scene never set window.__ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return { page, errors, requests };
}
export const grab = (page, t, type = 'image/png', q = .95) => page.evaluate(([t, type, q]) => { if (t !== null) window.seek(t); return document.getElementById('scene').toDataURL(type, q); }, [t, type, q]);
export const buf = d => Buffer.from(d.split(',')[1], 'base64');

// In-page measurement of the current frame (runs inside the browser). Returns numbers the rubric hints at:
// density (flat tiles), light (luminance spread, highlights, shadows, a lit place), colour (hue spread, clipping).
export function measureInPage(opts = {}) {
  const src = document.getElementById('scene'), W = src.width, H = src.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, W, H).data;
  const T = opts.tile || 24, tw = Math.floor(W / T), th = Math.floor(H / T);
  const Lum = new Float32Array(W * H); const hist = new Float64Array(12); let clip = 0, satSum = 0, warm = 0, cool = 0, hi = 0, lo = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = .2126 * r + .7152 * g + .0722 * b;
    Lum[p] = l; if (l > .92) hi++; if (l < .06) lo++;
    const s = mx ? (mx - mn) / mx : 0; satSum += s; if (s > .92 && mx > .92) clip++;
    if (s > .18 && mx > .12) { let h = mx === mn ? 0 : mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h = (h * 60 + 360) % 360; hist[Math.floor(h / 30) % 12] += s; if (h < 70 || h > 330) warm += s; else if (h > 160 && h < 280) cool += s; }
  }
  const N = W * H, tiles = [];
  let flat = 0;
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    let s = 0, s2 = 0, e = 0;
    for (let y = ty * T; y < ty * T + T; y++) for (let xx = tx * T; xx < tx * T + T; xx++) { const v = Lum[y * W + xx] * 255; s += v; s2 += v * v; if (xx + 1 < W) e += Math.abs(v - Lum[y * W + xx + 1] * 255); }
    const n = T * T, m = s / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m));
    tiles.push({ m, sd, e: e / n }); if (sd < 1.5) flat++;
  }
  const lums = Array.from(Lum.filter((_, i) => i % 7 === 0)).sort((a, b) => a - b), pct = q => lums[Math.floor(q * (lums.length - 1))];
  const tm = tiles.map(t => t.m).sort((a, b) => a - b), medT = tm[Math.floor(tm.length / 2)], maxT = tm[tm.length - 1];
  const hs = hist.reduce((a, b) => a + b, 0) || 1; let ent = 0; for (const h of hist) if (h > 0) { const p = h / hs; ent -= p * Math.log(p); }
  return {
    flat: flat / tiles.length, p1: pct(.01), p50: pct(.5), p99: pct(.99), highlights: hi / N, shadows: lo / N,
    litPlace: maxT / Math.max(1, medT), hueEntropy: ent / Math.log(12), clip: clip / N, sat: satSum / N,
    warmCool: (warm + cool) ? Math.min(warm, cool) / Math.max(warm, cool) : 0, tw, th, tile: T,
    tileSd: tiles.map(t => +t.sd.toFixed(2)), tileM: tiles.map(t => +t.m.toFixed(1)),
  };
}

// ---------- AUDIT.md: the rounds ----------
// Each round: "## Round N · seed S · scene <sha> · date", a 5×5 table of ✓ / ✗ note / ?, then Findings and Fixes.
export function parseAudit(text) {
  const rounds = [];
  const parts = text.split(/^## Round /m).slice(1);
  for (const p of parts) {
    const head = p.split('\n')[0], n = parseInt(head), seed = (head.match(/seed (\d+)/) || [])[1], scene = (head.match(/scene ([0-9a-f]{12})/) || [])[1];
    const tbl = p.split('\n').filter(l => /^\|\s*[\d.]+\s*\|/.test(l) && !/measured/i.test(l));
    const verdict = tbl.slice(0, 5).map(l => l.split('|').slice(2, 7).map(c => c.trim()));
    const cells = verdict.flat();
    const sec = name => { const m = p.match(new RegExp('^' + name + '[^\\n]*\\n([\\s\\S]*?)(?=^(?!-|\\s)\\S|$(?![\\s\\S]))', 'm')); return m ? m[1].split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean) : []; };
    rounds.push({
      n, seed, scene, cells, rows: verdict.length,
      unjudged: cells.filter(c => c === '?' || c === '').length,
      fails: cells.filter(c => c.startsWith('✗')).length,
      failsWithoutNote: cells.filter(c => /^✗\s*$/.test(c)).length,
      passes: cells.filter(c => c.startsWith('✓')).length,
      findings: sec('Findings'), fixes: sec('Fixes'),
    });
  }
  return rounds;
}
