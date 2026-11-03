// holo-pass · link.mjs — the link to send, and a QR code for it, from an invite file.
//   node <skill>/scripts/link.mjs invite.json --base https://you.github.io/party/            → prints the link
//   node <skill>/scripts/link.mjs invite.json --base https://you.github.io/party/ --qr out/qr.svg
// --base is where you deployed the pass/ folder (the link points at its invite.html). Without --base the link points
// at the local file, which is only useful for a look on this machine.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const file = args.find(a => a.endsWith('.json'));
if (!file) { console.error('usage: link.mjs <invite.json> [--base https://…/] [--qr out/qr.svg]'); process.exit(1); }
const FIELDS = ['theme', 'title', 'subtitle', 'no', 'date', 'time', 'end', 'place', 'address', 'price', 'to', 'from', 'message', 'music', 'rsvp', 'url', 'image', 'lang'];
const src = JSON.parse(readFileSync(file, 'utf8')), o = {};
for (const k of FIELDS) if (src[k] !== undefined && src[k] !== '') o[k] = src[k];
const enc = Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let base = opt('base');
if (base) { if (!/\.html$/.test(base)) base = base.replace(/\/?$/, '/') + 'invite.html'; }
else base = pathToFileURL(resolve(existsSync('pass/invite.html') ? 'pass/invite.html' : join(here, '../pass/invite.html'))).href;
const link = base + '#p=' + enc;
console.log(link);
const qrOut = opt('qr');
if (qrOut) {
  const require = createRequire(import.meta.url), qrcode = require(join(here, '../pass/lib/qrcode.js'));
  const q = qrcode(0, 'M'); q.addData(link); q.make();
  const n = q.getModuleCount(), m = 4; let rects = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) rects += `M${c + m} ${r + m}h1v1h-1z`;
  mkdirSync(dirname(resolve(qrOut)), { recursive: true });
  writeFileSync(qrOut, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + m * 2} ${n + m * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${rects}" fill="#111"/></svg>\n`);
  console.error(`${qrOut}  (${n}×${n} modules)`);
}
