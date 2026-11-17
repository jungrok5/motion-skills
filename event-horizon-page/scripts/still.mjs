// still.mjs — stills of an event-horizon-page page, with the feature on.
//   node scripts/still.mjs <page.html> --out <dir> [--at 1,2.5] [--act "<steps>"] [--kind neutron] [--size 1280x800] [--q 1] [--jpeg] [--name x]
// Each still loads the page frozen at #still=<at> (the disk and beams stand at that time) with #nointro, then plays the
// act: steps separated by ';', run in order on the frozen page through window.__hic.eh:
//   move:<fx>,<fy>          put the object at that fraction of the screen
//   mass:<0..1>             set the mass (the slider)
//   feed:<text>             feed a word (it appears in the tray, is drawn, then falls in)
//   sweep:<fx>,<fy>,<fx2>,<fy2>  Hungry on, the object crosses from one point to the other, eating what it touches
//   restore                 give back everything (pieces spiral out)
//   gravity:off | gravity:on
//   run:<seconds>           advance the simulation (pieces fall, flares fade)
//   wait:<ms>               wall-clock wait (lets a paint and upload happen)
// Example: node scripts/still.mjs index.html --out out --act "move:.36,.62;feed:entropy;wait:900;run:.8"
import { stills } from './hic-test.mjs';
import { basename, dirname } from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const flags = new Set(['--jpeg']);
const file = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--') && !flags.has(a[i - 1])));
if (!file) { console.log('usage: node scripts/still.mjs <page.html> --out <dir> [--at 1,2.5] [--act "move:.4,.6;run:1"] [--kind neutron] [--size WxH] [--q 1] [--jpeg] [--name x]'); process.exit(1); }
const out = opt('out', 'out'), act = opt('act', ''), kind = opt('kind', ''), q = opt('q', '1');
const [W, H] = opt('size', '1280x800').split('x').map(Number);
const ats = opt('at', '1').split(',').map(Number);
const base = opt('name', basename(file) === 'index.html' ? basename(dirname(file)) || 'page' : basename(file).replace(/\.html$/, ''));

async function play(page) {
  for (const st of act.split(';').map(s => s.trim()).filter(Boolean)) {
    const [k, v = ''] = [st.slice(0, st.indexOf(':') < 0 ? st.length : st.indexOf(':')), st.indexOf(':') < 0 ? '' : st.slice(st.indexOf(':') + 1)];
    if (k === 'wait') { await page.waitForTimeout(+v || 600); continue; }
    await page.evaluate(async ([k, v]) => {
      const E = window.__hic.eh, W = innerWidth, H = innerHeight, n = v.split(',').map(Number);
      if (k === 'move') E.moveTo(n[0] * W, n[1] * H);
      else if (k === 'mass') E.setMass(n[0]);
      else if (k === 'feed') E.feed(v);
      else if (k === 'gravity') { E.gravity(v !== 'off'); E.run(1); }
      else if (k === 'restore') E.giveBack();
      else if (k === 'run') E.run(n[0]);
      else if (k === 'sweep') {
        E.hungry(true); const steps = 40;
        for (let i = 0; i <= steps; i++) { const t = i / steps; E.moveTo((n[0] + (n[2] - n[0]) * t) * W, (n[1] + (n[3] - n[1]) * t) * H); E.run(.03); }
      }
      E.redraw();
    }, [k, v]);
  }
}
const shots = ats.map(t => ({
  name: `${base}${kind ? '-' + kind : ''}${act ? '-act' : ''}-t${t}`, hash: [`still=${t}`, 'nointro', 'q=' + q].concat(kind ? ['kind=' + kind] : []).join('&'),
  width: W, height: H, settle: 1500, type: a.includes('--jpeg') ? 'jpeg' : 'png', before: act ? play : null, after: 1500
}));
await stills(file, out, shots);
