// holo-pass · check.mjs — proves an invite before you send or render it. Prints `ok` lines, warnings, or FAIL.
//   node <skill>/scripts/check.mjs invite.json [--page pass/invite.html]
//   node <skill>/scripts/check.mjs --all [--themes pass/themes/custom.js]   every theme with its default words
// 1. the page loads (render mode) with no page errors, console errors or failed requests (fonts, scripts)
// 2. every moment of the timeline draws; the background and the card are never blank
// 3. deterministic: the same t gives the same pixels after seeking elsewhere (no Math.random / Date in art)
// 4. the link round-trips (encode → decode = the invite) and fits in a QR code; prints its length
// 5. the calendar event (.ics + Google link) builds when there is a date
// 6. the music renders: not silent, no NaN, peak ≤ 1
// 7. the words fit the card (title size, subtitle length, message lines, cut fields) — warnings, not failures
// 8. the picture: fills its window (no see-through pixels), moves (t and t + 0.4 s differ), every second of a 4 s loop draws
// A theme designed for the invite (themes.js next to invite.json, or --themes) is loaded first; --all also covers it.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(opt('page', existsSync('pass/invite.html') ? 'pass/invite.html' : join(here, '../pass/invite.html')));
const file = args.find(a => a.endsWith('.json'));
const themes$ = opt('themes') || (file && existsSync(join(dirname(resolve(file)), 'themes.js')) ? join(dirname(resolve(file)), 'themes.js') : '');
const themesQ = themes$ ? '&themes=' + encodeURIComponent(pathToFileURL(resolve(themes$)).href) : '';
if (!file && !args.includes('--all')) { console.error('usage: check.mjs <invite.json> | --all'); process.exit(1); }

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function check(invite, label) {
  console.log(`\n${label}`);
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
  page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
  await page.goto(pathToFileURL(page$).href + '?render=1&size=960x540' + themesQ + '#p=' + b64u(invite), { waitUntil: 'load' });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (errors.length || Date.now() - t0 > 60000) { fail(errors.join('\n') || 'never ready'); await page.close(); return; }
    await new Promise(r => setTimeout(r, 100));
  }
  if (errors.length) fail('loading: ' + errors.join(' | ')); else console.log('ok   loads with no errors');
  const DUR = await page.evaluate(() => window.DURATION);
  const probe = t => page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const range = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let mn = 765, mx = 0; for (let i = 0; i < d.length; i += 4 * 211) { if (d[i + 3] < 200) continue; const v = d[i] + d[i + 1] + d[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); } return mx - mn; };
    const [bg] = document.querySelectorAll('.hp-bg'), fc = document.querySelector('.hp-front canvas');
    return { bg: range(bg), card: range(fc) };
  }, t);
  const thrown = [], blank = [];
  for (let t = 0; t < DUR; t += 0.5) { const r = await probe(+t.toFixed(2)); if (r.err) thrown.push(`${t}: ${r.err}`); else if ((t > 0.7 && r.bg < 10) || r.card < 40) blank.push(t); }
  if (thrown.length) fail('throws at ' + thrown.slice(0, 3).join(' · ')); else console.log(`ok   every moment draws (0 … ${DUR} s, every 0.5 s)`);
  if (blank.length) fail('blank background or card at t = ' + blank.slice(0, 6).join(', ')); else console.log('ok   no blank frames');
  const pix = t => page.evaluate(t => { window.seek(t); return [...document.querySelectorAll('.hp-bg, .hp-front canvas')].map(cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h; }).join(','); }, t);
  const ts = [2.2, 6.1, 10.3], a = []; for (const t of ts) a.push(await pix(t));
  let det = true; for (let i = ts.length - 1; i >= 0; i--) if (a[i] !== await pix(ts[i])) { det = false; fail(`t=${ts[i]} draws differently the second time — Math.random, Date or state between frames?`); }
  if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);
  const r = await page.evaluate(async src => {
    const d = HP.normalize(src), enc = HP.encode(src), back = HP.decode(enc), same = JSON.stringify(HP.normalize(back)) === JSON.stringify(d);
    let qrType = 0; try { const q = qrcode(0, 'L'); q.addData('https://example.github.io/invite/invite.html#p=' + enc); q.make(); qrType = q.getModuleCount(); } catch (e) { qrType = -1; }
    const ics = HP.ics(d), gcal = HP.gcal(d), buf = await HP.music.render(d.music === 'none' ? 'bells' : d.music, 4, 22050);
    let peak = 0, nan = 0, rms = 0; for (let c = 0; c < 2; c++) { const x = buf.getChannelData(c); for (let i = 0; i < x.length; i++) { const v = x[i]; if (!Number.isFinite(v)) nan++; else { peak = Math.max(peak, Math.abs(v)); rms += v * v; } } }
    return { same, len: enc.length, qrType, hasDate: !!d.date, ics: !!ics && /BEGIN:VEVENT[\s\S]*DTSTART[\s\S]*END:VEVENT/.test(ics), gcal: !!gcal, music: d.music, peak, nan, rms: Math.sqrt(rms / buf.length / 2), warnings: HP.warnings.slice(), theme: d.theme };
  }, invite);
  if (!r.same) fail('the link does not round-trip'); else console.log(`ok   link round-trips (${r.len} characters after #p=)`);
  if (r.qrType < 0) fail('the link is too long for a QR code — shorten the message'); else console.log(`ok   QR code ${r.qrType}×${r.qrType} modules${r.qrType > 85 ? ' (dense: shorten the message for an easier scan)' : ''}`);
  if (!r.hasDate) console.log('warn no date: no calendar buttons on the guest page');
  else if (!r.ics || !r.gcal) fail('calendar event did not build'); else console.log('ok   calendar event builds (.ics + Google)');
  const art = await page.evaluate(() => {
    const th = HP.THEMES[window.invite.theme], A = HP.ART_SIZE, cv = document.createElement('canvas'); cv.width = A.W; cv.height = A.H; const c = cv.getContext('2d');
    const at = t => { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, A.W, A.H); HP.ART[th.art](c, t, th.pal); return c.getImageData(0, 0, A.W, A.H).data; };
    let holes = 0, diff = 0, err = null; const a = at(1.0), b = at(1.4);
    for (let i = 3; i < a.length; i += 4) if (a[i] < 250) holes++;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) diff++;
    try { for (let t = 0; t <= 4; t += 0.25) at(t); } catch (e) { err = e.message; }
    return { theme: th.id, art: th.art, holes: holes / (a.length / 4), moving: diff / (a.length / 4), err, custom: !['tree', 'sunrise', 'house', 'coffee', 'cake', 'tent'].includes(th.art) };
  });
  if (art.err) fail(`picture "${art.art}" throws: ${art.err}`);
  else if (art.holes > 0.002) fail(`picture "${art.art}" leaves ${(art.holes * 100).toFixed(1)} % of its window see-through — start with a full background`);
  else if (art.moving < 0.004) fail(`picture "${art.art}" barely moves (${(art.moving * 100).toFixed(2)} % of pixels change in 0.4 s)`);
  else console.log(`ok   picture "${art.art}"${art.custom ? ' (designed for this invite)' : ''} fills its window and moves (${(art.moving * 100).toFixed(1)} % changes in 0.4 s)`);
  if (r.nan || r.peak > 1.001 || r.rms < 0.005) fail(`music ${r.music}: peak ${r.peak.toFixed(3)}, rms ${r.rms.toFixed(4)}, ${r.nan} NaN`); else console.log(`ok   music "${r.music}" renders (peak ${r.peak.toFixed(2)}, rms ${r.rms.toFixed(3)})`);
  for (const w of r.warnings) console.log('warn ' + w);
  await page.close();
}

if (file) await check(JSON.parse(readFileSync(file, 'utf8')), file);
else {
  const probe = await browser.newPage(); await probe.goto(pathToFileURL(page$).href + '?render=1&size=320x180' + themesQ); await probe.waitForFunction(() => window.__ready);
  const ids = await probe.evaluate(() => HP.THEME_ORDER.slice()); await probe.close();
  for (const theme of ids) for (const lang of ['ko', 'en', 'ja']) await check({ theme, lang, no: '123456', date: '2026-12-24', time: '19:00', place: 'Somewhere', to: 'Alex', from: 'Sam', price: '—' }, `${theme} · ${lang}`);
}
await browser.close();
console.log(bad ? `\n${bad} problem(s)` : '\nall ok');
process.exit(bad ? 1 : 0);
