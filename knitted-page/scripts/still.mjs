// still.mjs — stills of a knitted page (HTML-in-Canvas flag on). Frozen poses, or real flows stepped by simulated time.
//   node scripts/still.mjs <page.html> --out <dir> [--act idle|pull|bare|knit|unravel|knitback|type|intro] [--at 1,2.5] [--u 0.4]
//                          [--width 1280 --height 800] [--q 1] [--name x] [--jpeg] [--hash 'extra&flags']
//   idle      the knitted page at rest (#still=<at>)
//   pull      frozen mid-pull, u of it unravelled (#pose=pull&u=)      bare   all unravelled: the heap and the reveal
//   knit      frozen while the needles knit it back (#pose=knit&u=)
//   unravel   the Unravel control pressed, <at> seconds later (simulated time)
//   knitback  unravelled, then knitting back, <at> seconds in          type   text typed into the headline, <at> s later
//   intro     the page knitting itself up on load, <at> s in
import { stills } from './hic-test.mjs';
const a = process.argv.slice(2), file = a.find(x => x.endsWith('.html'));
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
if (!file) { console.error('usage: node scripts/still.mjs <page.html> --out <dir> [--act idle] [--at 1]'); process.exit(2); }
const act = opt('act', 'idle'), at = opt('at', act === 'type' ? '0.3' : '1').split(',').map(Number), u = opt('u', '0.4');
const W = +opt('width', 1280), H = +opt('height', 800), q = opt('q', '1'), extra = opt('hash', '');
const dir = file.split('/').slice(-2, -1)[0] || 'page', base = opt('name', dir);
const frozen = { idle: '', pull: `&pose=pull&u=${u}`, bare: '&pose=bare', knit: `&pose=knit&u=${u}` };
const shots = at.map(t => ({
  name: `${base}-${act}${act in frozen && act !== 'idle' && act !== 'bare' ? '-' + u : ''}-${t}`, width: W, height: H, type: a.includes('--jpeg') ? 'jpeg' : 'png',
  hash: (act in frozen ? `still=${t}${frozen[act]}` : act === 'intro' ? 'intro' : 'nointro') + `&q=${q}` + (extra ? '&' + extra : ''),
  before: act in frozen ? null : async (page) => {
    await page.evaluate((act) => { window.__knit.manual(); if (act !== 'intro') window.__knit.advance(0.2); }, act);
    if (act === 'type') {
      const p = await page.evaluate(() => { const e = document.querySelector('[data-hic-edit]'); const r = e.getBoundingClientRect(); return [r.left + r.width * 0.5, r.top + r.height * 0.75]; });
      await page.mouse.click(p[0], p[1]); await page.keyboard.press('End');
      await page.keyboard.type(opt('text', ' & co'), { delay: 30 }); await page.waitForTimeout(500);
    }
    await page.evaluate(({ act, t }) => {
      const k = window.__knit;
      if (act === 'unravel') { k.unravel(); k.advance(t); }
      if (act === 'knitback') { k.unravel(); k.advance(6); k.knitBack(); k.advance(t); }
      if (act === 'type' || act === 'intro') k.advance(t);
    }, { act, t });
  }
}));
await stills(file, opt('out', 'out'), shots);
