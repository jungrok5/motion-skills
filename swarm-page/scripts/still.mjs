// still.mjs — stills of a swarm page (with the HTML-in-Canvas flag on), stepped by simulated time so they are repeatable.
//   node scripts/still.mjs <page.html> --out <dir> [--at 0,1.5,4] [--act rest|fly|land|type] [--width 1280 --height 800] [--name x] [--jpeg]
//   rest  the formed page (#still)          fly   seconds after the trigger
//   land  seconds after Land (flight of 6 s first)   type  in flight, a line recalled and typed into
import { stills } from './hic-test.mjs';
const a = process.argv.slice(2), file = a[0];
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
if (!file) { console.error('usage: node scripts/still.mjs <page.html> --out <dir> [--at 1,2.5] [--act fly]'); process.exit(2); }
const out = opt('out', 'out'), act = opt('act', 'fly'), at = opt('at', act === 'rest' ? '1' : '2.5').split(',').map(Number);
const W = +opt('width', 1280), H = +opt('height', 800), base = opt('name', file.replace(/.*\//, '').replace(/\.html$/, '') === 'index' ? file.split('/').slice(-2, -1)[0] : 'page');
const jpeg = a.includes('--jpeg'), q = opt('q', '1');
const shots = at.map(t => ({
  name: `${base}-${act}-${t}`, width: W, height: H, type: jpeg ? 'jpeg' : 'png', hash: (act === 'rest' ? `still=${t}` : 'nointro') + `&q=${q}`,
  before: act === 'rest' ? null : async (page) => {
    await page.evaluate(({ act, t }) => {
      const s = window.__swarm; s.manual(); s.advance(0.5);
      if (act === 'fly') { s.fly(); s.advance(t); }
      if (act === 'land') { s.fly(); s.advance(6); s.land(); s.advance(t); }
      if (act === 'type') { s.fly(); s.advance(3); const e = document.querySelector('[data-hic-edit]'); s.recall(e, 9); s.advance(t); }
    }, { act, t });
  }
}));
await stills(file, out, shots);
