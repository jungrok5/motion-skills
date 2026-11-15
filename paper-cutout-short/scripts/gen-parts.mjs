// paper-cutout-short · gen-parts.mjs — ask an image model for a parts sheet (every piece of one puppet, or a set of props / set
// pieces, laid out apart on a transparent or flat background), ready for cut-parts.mjs. This is the source clip's method: the
// image model draws the paper pieces once, cheaply; the code moves them, so the film stays controllable and repeatable.
//   OPENAI_API_KEY=… node <skill>/scripts/gen-parts.mjs --prompt prompts/ember.txt --out sheets/ember.png
//   … --ref sheets/ember-look.png          (keep a character / style consistent: the prompt edits from reference images)
//   … --style references-style.txt         (a style preamble prepended to the prompt; default: the one in references/PARTS.md)
// Options: --model gpt-image-1 (or OPENAI_IMAGE_MODEL) · --size 1536x1024 · --quality high · --background transparent|opaque
//          --n 1 (several takes → <out>-1.png, -2.png …) · --dry (print the request, send nothing)
// Env: OPENAI_API_KEY (required unless --dry), OPENAI_BASE_URL (default https://api.openai.com/v1).
// Written against OpenAI's Images API (POST /images/generations, multipart POST /images/edits with image[] references, b64_json
// responses). No other image service is wired in: with another tool (a chat UI, an MCP image tool), save its PNG and go straight to
// cut-parts.mjs — the prompts in references/PARTS.md work the same way.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; }, all = k => args.flatMap((a, i) => a === '--' + k ? [args[i + 1]] : []);
const promptArg = opt('prompt');
if (!promptArg) { console.error('usage: gen-parts.mjs --prompt <file or text> --out sheets/x.png [--ref img.png]… [--style file] [--model …] [--size 1536x1024] [--n 1] [--dry]'); process.exit(1); }
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => existsSync(p) ? readFileSync(p, 'utf8').trim() : p;
// the default style preamble lives in references/PARTS.md between the STYLE markers, so the doc and the script never drift
let style = opt('style') ? read(opt('style')) : '';
if (!opt('style')) { const md = readFileSync(join(skill, 'references', 'PARTS.md'), 'utf8'); const m = md.match(/<!-- STYLE -->\s*```text\n([\s\S]*?)```/); style = m ? m[1].trim() : ''; }
const prompt = (style ? style + '\n\n' : '') + read(promptArg);
const model = opt('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'), size = opt('size', '1536x1024'), quality = opt('quality', 'high');
const background = opt('background', 'transparent'), n = +opt('n', 1), refs = all('ref'), out = resolve(opt('out', 'sheets/sheet.png'));
const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const endpoint = refs.length ? `${base}/images/edits` : `${base}/images/generations`;

if (args.includes('--dry')) {
  console.log(JSON.stringify({ endpoint, model, size, quality, background, n, refs, prompt }, null, 2));
  process.exit(0);
}
if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY is not set (or use --dry to see the request, or make the sheet with another image tool and run cut-parts.mjs on it)'); process.exit(1); }
let body, headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
if (refs.length) {
  body = new FormData();
  body.append('model', model); body.append('prompt', prompt); body.append('size', size); body.append('quality', quality); body.append('n', String(n)); body.append('background', background);
  for (const r of refs) body.append('image[]', new Blob([readFileSync(r)], { type: 'image/png' }), basename(r));
} else {
  headers['Content-Type'] = 'application/json';
  body = JSON.stringify({ model, prompt, size, quality, n, background, output_format: 'png' });
}
const t0 = Date.now();
const res = await fetch(endpoint, { method: 'POST', headers, body });
const text = await res.text();
if (!res.ok) { console.error(`${res.status} ${res.statusText}: ${text.slice(0, 800)}`); process.exit(1); }
const json = JSON.parse(text), data = json.data || [];
if (!data.length) { console.error('no images in the response: ' + text.slice(0, 400)); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });
let i = 0;
for (const d of data) {
  const f = data.length > 1 ? out.replace(/\.png$/i, `-${++i}.png`) : out;
  const buf = d.b64_json ? Buffer.from(d.b64_json, 'base64') : Buffer.from(await (await fetch(d.url)).arrayBuffer());
  writeFileSync(f, buf); console.log(`${f}  (${(buf.length / 1024).toFixed(0)} KB)`);
}
writeFileSync(out.replace(/\.png$/i, '.prompt.txt'), `model: ${model}\nsize: ${size}\nrefs: ${refs.join(', ') || '-'}\n\n${prompt}\n`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s · next: node ${join(skill, 'scripts/cut-parts.mjs')} ${opt('out', 'sheets/sheet.png')} --names …`);
