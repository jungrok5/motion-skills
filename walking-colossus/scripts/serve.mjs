// Static server for a colossus project. Serves the project folder; if the project has no engine/ of its own
// (the skill's bundled examples), /engine/* is served from the skill's engine.
// Usage: node <skill>/scripts/serve.mjs [projectDir=.] [--port 5177]    (also imported by shot / render / check)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.md': 'text/plain; charset=utf-8' };

export function startServer(projectDir = '.', port = 0) {
  const root = path.resolve(projectDir);
  const ownEngine = fs.existsSync(path.join(root, 'engine', 'main.js'));
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    let base = root, rel = p;
    if (!ownEngine && p.startsWith('/engine/')) base = SKILL;
    const file = path.join(base, rel);
    if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, port: server.address().port, root })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--port');
  const port = pi >= 0 ? +args[pi + 1] : 5177;
  const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port') || '.';
  const { port: p, root } = await startServer(dir, port);
  console.log(`serving ${root} at http://127.0.0.1:${p}/   (/?shot=hero, /?free, /?t=12, &scale=0.5 on slow GPUs)`);
}
