// landmark-map-3d · serve.mjs — a tiny static server for the scripts: pages are ES modules that fetch place.json and
// fonts, so they need http. It serves the nearest folder (the page's own, or up to 3 levels up) holding lib/film.js.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.txt': 'text/plain', '.wav': 'audio/wav' };
export async function serve(page$, query = '', rootOpt) {
  page$ = resolve(page$);
  let root = rootOpt;
  if (!root) { let d = dirname(page$); root = d; for (let i = 0; i < 4; i++) { if (existsSync(join(d, 'lib', 'film.js'))) { root = d; break; } d = dirname(d); } }
  const srv = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.includes('..')) { res.writeHead(403); res.end(); return; }
    try { const b = await readFile(join(root, p)); res.writeHead(200, { 'Content-Type': TYPES[(p.match(/\.[a-z0-9]+$/i) || [''])[0]] || 'application/octet-stream' }); res.end(b); }
    catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const rel = page$.slice(root.length).split('/').map(encodeURIComponent).join('/');
  return { srv, root, url: `http://127.0.0.1:${srv.address().port}${rel}${query}` };
}
export const CHROME_ARGS = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-gl=angle', '--use-angle=swiftshader'];
