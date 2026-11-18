// living-realm · 88_hud — what is on the glass: the place and the hour, buttons for the hour and the weather, an
// automatic round, quality and sound, a name card when you walk into a named place, the thumb stick on touch screens,
// and the governor that keeps the frame rate by changing the internal resolution.
{
  const H = (LR.hud = { els: {}, fps: 60, show: true });
  // strings: a realm overrides any of these with LR.start({ strings: { … } })
  H.t = {
    dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night', clear: 'Clear', rain: 'Rain', snow: 'Winter', auto: 'Auto', walk: 'Tour',
    wx: { clear: 'clear', rain: 'rain', snow: 'snow', winter: 'winter', overcast: 'overcast' },
    hint: 'W A S D or arrow keys to walk · Q E or ← → to turn · drag or click to look · Shift to run',
    hintTouch: 'left thumb walks · right thumb looks',
    help: [['W A S D / ↑ ↓', 'walk'], ['← → / Q E', 'turn'], ['mouse', 'look (click to capture, Esc to release)'], ['Shift', 'run'], ['Space', 'hop'], ['gamepad', 'left stick walks · right stick looks · trigger runs · A hops'], ['1 2 3 4', 'dawn · day · dusk · night'], ['5 6 7', 'clear · rain · winter'], ['T', 'automatic round'], ['C', 'tour walk'], ['G', 'quality'], ['M', 'sound'], ['P', 'numbers'], ['H', 'hide the panels'], ['F', 'full screen']],
    quality: 'Quality', tiers: { auto: 'auto', low: 'low', medium: 'medium', high: 'high', ultra: 'ultra' }, sound: 'Sound', full: 'Full screen', keys: 'Keys', taking: 'You have the walk — press C for the tour',
  };
  const ICON = {
    dawn: '<path d="M3 17h18M6 13a6 6 0 0 1 12 0M12 3v3M4.5 7.5l2 2M19.5 7.5l-2 2"/>', day: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    dusk: '<path d="M3 18h18M7 14a5 5 0 0 1 10 0M12 4v4M9 6l3 3 3-3"/>', night: '<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/>',
    clear: '<circle cx="9" cy="9" r="3.2"/><path d="M9 2.5v1.8M2.5 9h1.8M4.4 4.4l1.3 1.3M13.6 4.4l-1.3 1.3"/><path d="M8 19h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.3 1.5A2.8 2.8 0 0 0 8 19z"/>', rain: '<path d="M7 14h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.4A2.9 2.9 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2"/>', auto: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2-6-2-3 1.5-4.5 3 1.5 2 3 3 1M11 15l3 2 1 4M10.5 7.5 7 9.5l-1 3"/>', sound: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>', mute: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', keys: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  };
  const svg = (n) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
  const CSS = `
#hud{font:13px/1.35 system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#efe8d6;--gold:#dcc88f;--pane:rgba(14,15,18,.56);--line:rgba(220,200,143,.34)}
#hud *{box-sizing:border-box} #hud.off .pane,#hud.off .card{opacity:0;pointer-events:none}
.pane{position:absolute;pointer-events:auto;background:var(--pane);border:1px solid var(--line);border-radius:10px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:opacity .4s}
#lr-place{left:max(14px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));padding:8px 14px 9px;pointer-events:none}
#lr-place b{display:block;font:500 16px/1.2 Georgia,"Noto Serif KR","Nanum Myeongjo",serif;letter-spacing:.14em;color:var(--gold)}
#lr-place span{display:block;margin-top:3px;font-size:12px;letter-spacing:.06em;opacity:.86;font-variant-numeric:tabular-nums}
#lr-bar{left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:4px;padding:5px;max-width:calc(100vw - 20px)}
#lr-top{right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));display:flex;gap:4px;padding:5px}
.pane button{appearance:none;border:0;background:transparent;color:inherit;font:inherit;display:flex;align-items:center;gap:6px;height:36px;min-width:36px;padding:0 10px;border-radius:7px;cursor:pointer;letter-spacing:.04em;white-space:nowrap}
.pane button:hover{background:rgba(255,255,255,.09)} .pane button:focus-visible{outline:2px solid var(--gold);outline-offset:1px}
.pane button[aria-pressed="true"]{background:rgba(220,200,143,.2);color:#fff3cf;box-shadow:inset 0 0 0 1px var(--line)}
.pane .sep{width:1px;margin:6px 3px;background:var(--line)} .pane button.ic{padding:0 9px}
#lr-num{position:absolute;right:max(14px,env(safe-area-inset-right));top:64px;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;text-align:right;opacity:.82;text-shadow:0 1px 2px #000;white-space:pre;pointer-events:none}
#lr-hint{position:absolute;left:50%;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 62px);transform:translateX(-50%);padding:7px 14px;border-radius:99px;background:rgba(10,10,12,.5);font-size:12px;letter-spacing:.04em;opacity:0;transition:opacity .8s;pointer-events:none;text-align:center;max-width:calc(100vw - 24px)}
#lr-hint.on{opacity:.92}
.card{position:absolute;left:50%;top:19%;transform:translateX(-50%);text-align:center;opacity:0;transition:opacity 1.2s;pointer-events:none;text-shadow:0 2px 14px rgba(0,0,0,.75)}
.card.on{opacity:1} .card b{display:block;font:500 clamp(22px,4.4vw,40px)/1.15 Georgia,"Noto Serif KR","Nanum Myeongjo",serif;letter-spacing:.2em;color:#f1e3b4}
.card i{display:block;width:150px;height:1px;margin:10px auto 8px;background:linear-gradient(90deg,transparent,var(--gold),transparent)} .card span{font-size:13px;letter-spacing:.24em;opacity:.9}
#lr-help{left:50%;top:50%;transform:translate(-50%,-50%);padding:16px 20px;display:none;max-width:calc(100vw - 28px);max-height:calc(100vh - 40px);overflow:auto}
#lr-help.on{display:block} #lr-help table{border-collapse:collapse} #lr-help td{padding:3px 10px 3px 0;vertical-align:top} #lr-help td:first-child{color:var(--gold);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:nowrap}
#lr-stick{position:absolute;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;border:1px solid var(--line);background:rgba(14,15,18,.25);display:none;pointer-events:none}
#lr-stick i{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(220,200,143,.4);border:1px solid var(--gold)}
#lr-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;mix-blend-mode:screen}
@media (max-width:720px){.pane button .lb{display:none}.pane button{padding:0 8px;height:40px;min-width:38px}#lr-place b{font-size:14px}#lr-num{top:66px;font-size:10px}#lr-top .wide{display:none}}
@media (max-width:430px){#lr-bar{gap:1px;padding:4px}#lr-bar button{padding:0 5px;min-width:34px;height:38px}#lr-bar .sep{margin:7px 1px}}
@media (prefers-reduced-motion:reduce){.pane,.card,#lr-hint{transition:none}}`;
  const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.innerHTML = html; return e; };
  H.init = () => {
    if (LR.RENDER || LR.q('hud') === '0') return;
    const t = Object.assign(H.t, (LR.cfg && LR.cfg.strings) || {}), root = document.getElementById('hud'), E = H.els, wx = LR.wx, meta = typeof REALM_META !== 'undefined' ? REALM_META : {};
    document.head.appendChild(el('style', {}, CSS));
    E.place = root.appendChild(el('div', { id: 'lr-place', class: 'pane' }, `<b>${meta.title || ''}</b><span></span>`));
    const btn = (id, icon, label, title) => `<button type="button" data-k="${id}" title="${title || label}" aria-label="${title || label}" aria-pressed="false" class="${label ? '' : 'ic'}">${svg(icon)}${label ? `<span class="lb">${label}</span>` : ''}</button>`;
    E.bar = root.appendChild(el('div', { id: 'lr-bar', class: 'pane', role: 'toolbar' }, btn('dawn', 'dawn', t.dawn) + btn('day', 'day', t.day) + btn('dusk', 'dusk', t.dusk) + btn('night', 'night', t.night) + '<span class="sep"></span>' + btn('clear', 'clear', t.clear) + btn('rain', 'rain', t.rain) + btn('snow', 'snow', t.snow) + '<span class="sep"></span>' + btn('auto', 'auto', t.auto) + btn('walk', 'walk', t.walk)));
    E.top = root.appendChild(el('div', { id: 'lr-top', class: 'pane', role: 'toolbar' }, btn('gear', 'gear', '', t.quality) + btn('sound', 'mute', '', t.sound) + `<span class="wide" style="display:flex">${btn('keys', 'keys', '', t.keys)}${btn('full', 'full', '', t.full)}</span>`));
    E.num = root.appendChild(el('div', { id: 'lr-num' })); E.num.style.display = LR.q('stats') ? '' : 'none';
    E.hint = root.appendChild(el('div', { id: 'lr-hint' }, LR.gpu.mobile ? t.hintTouch : t.hint));
    E.card = root.appendChild(el('div', { class: 'card' }, '<b></b><i></i><span></span>'));
    E.help = root.appendChild(el('div', { id: 'lr-help', class: 'pane' }, '<table>' + t.help.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>'));
    E.stick = root.appendChild(el('div', { id: 'lr-stick' }, '<i></i>')); E.flash = root.appendChild(el('div', { id: 'lr-flash' }));
    const TOD = { dawn: 6.2, day: 13.0, dusk: 19.7, night: 23.2 };
    const act = (k) => {
      if (TOD[k] !== undefined) wx.set({ tod: TOD[k], manual: true });
      else if (k === 'clear' || k === 'rain' || k === 'snow') wx.set({ weather: k, manual: true });
      else if (k === 'auto') wx.set({ auto: !wx.auto });
      else if (k === 'walk') { if (LR.player.touring) LR.player.stopTour(); else LR.player.startTour(); }
      else if (k === 'gear') { const order = ['auto', 'low', 'medium', 'high', 'ultra'], cur = LR.gpu.auto ? 'auto' : LR.gpu.tierName, nx = order[(order.indexOf(cur) + 1) % order.length]; H.reload(nx === 'auto' ? null : nx); }
      else if (k === 'sound') { if (LR.audio) { if (!LR.audio.ready) { LR.audio.init(); LR.audio.mute(false); } else LR.audio.mute(!LR.audio.muted); } sync(); }
      else if (k === 'keys') E.help.classList.toggle('on');
      else if (k === 'full') { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {}); }
      sync();
    };
    H.act = act;
    root.addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b) { act(b.dataset.k); b.blur(); document.getElementById('view').focus(); } });
    const KEY = { Digit1: 'dawn', Digit2: 'day', Digit3: 'dusk', Digit4: 'night', Digit5: 'clear', Digit6: 'rain', Digit7: 'snow', KeyT: 'auto', KeyC: 'walk', KeyG: 'gear', KeyM: 'sound', KeyF: 'full' };
    LR.on('key', (code) => { if (KEY[code]) act(KEY[code]); else if (code === 'KeyH') { H.show = !H.show; root.classList.toggle('off', !H.show); } else if (code === 'KeyP') E.num.style.display = E.num.style.display === 'none' ? '' : 'none'; else if (code === 'Slash' || code === 'F1') E.help.classList.toggle('on'); else if (code === 'Escape') E.help.classList.remove('on'); });
    const sync = () => { const q = (k) => E.bar.querySelector(`[data-k="${k}"]`), w = wx.want.weather;
      q('clear').setAttribute('aria-pressed', w === 'clear' || w === 'winter' || w === 'autumn'); q('rain').setAttribute('aria-pressed', w === 'rain'); q('snow').setAttribute('aria-pressed', w === 'snow');
      q('auto').setAttribute('aria-pressed', !!wx.auto); q('walk').setAttribute('aria-pressed', !!LR.player.touring);
      const sb = E.top.querySelector('[data-k="sound"]'), on = LR.audio && LR.audio.ready && !LR.audio.muted; sb.innerHTML = svg(on ? 'sound' : 'mute'); sb.setAttribute('aria-pressed', !!on);
      E.top.querySelector('[data-k="gear"]').title = t.quality + ': ' + (LR.gpu.auto ? t.tiers.auto + ' (' + t.tiers[LR.gpu.tierName] + ')' : t.tiers[LR.gpu.tierName]); };
    H.sync = sync; wx.onChange(sync); LR.on('tour', sync);
    LR.on('tour', (on) => { if (!on) H.hint(t.taking, 4); });
    LR.on('stick', (s) => { E.stick.style.display = s.active ? 'block' : 'none'; if (s.active) { E.stick.style.left = s.ox + 'px'; E.stick.style.top = s.oy + 'px'; E.stick.firstChild.style.transform = `translate(${s.x * 40}px,${s.y * 40}px)`; } });
    // sound starts on the first gesture (browsers require one)
    const first = () => { if (LR.audio && !LR.audio.ready && !LR.off.has('audio') && LR.q('sound') !== '0') { LR.audio.init(); sync(); } window.removeEventListener('pointerdown', first); window.removeEventListener('keydown', first); };
    window.addEventListener('pointerdown', first); window.addEventListener('keydown', first);
    sync(); setTimeout(() => H.hint(null, 9), 1200);
  };
  let hintT = 0; H.hint = (text, sec = 5) => { const e = H.els.hint; if (!e) return; if (text) e.textContent = text; e.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => e.classList.remove('on'), sec * 1000); };
  let cardT = 0; H.card = (title, sub) => { const e = H.els.card; if (!e) return; e.firstChild.textContent = title; e.lastChild.textContent = sub || ''; e.classList.add('on'); clearTimeout(cardT); cardT = setTimeout(() => e.classList.remove('on'), 4200); };
  // reload keeping where we stand, the hour and the weather
  H.reload = (tier) => { const p = LR.player, u = new URL(location.href); if (tier) u.searchParams.set('q', tier); else u.searchParams.delete('q'); u.searchParams.delete('safe');      /* choosing a quality by hand leaves safe mode */ u.searchParams.set('at', [p.x.toFixed(1), p.z.toFixed(1), ((p.yaw * 180) / Math.PI).toFixed(0)].join(',')); u.searchParams.set('tod', LR.wx.tod.toFixed(2)); u.searchParams.set('wx', LR.wx.want.weather); if (!p.touring) u.searchParams.set('tour', '0'); location.href = u.toString(); };

  // ── every frame: the clock line, place cards, numbers, and the resolution governor ───────────────────────────────
  let acc = 0, n = 0, lastPlace = null, slowFor = 0, okFor = 0, wait = 3, capScale = 1, sec = 0;
  LR.on('after', (time, dt) => {
    const E = H.els, R = LR.render, G = LR.gpu, wx = LR.wx, p = LR.player; acc += dt; n++; sec += dt;
    if (acc >= 0.5) {
      const fps = n / acc; H.fps = fps; acc = 0; n = 0;
      if (E.place) { const c = wx.clock(), tl = H.t.wx[wx.label()] || wx.label(); E.place.lastChild.textContent = c.text + ' · ' + tl; }
      if (E.num && E.num.style.display !== 'none') E.num.textContent = `${fps.toFixed(0)} fps\n${R.w}×${R.h} (${R.scale.toFixed(2)}×)\n${G.tierName}${G.auto ? ' · auto' : ''}\n${R.info.allCalls} calls · ${(R.info.tris / 1e6).toFixed(2)} M tris\n${R.info.lights || 0} lights`;
      // governor: hold the display's rate by trading internal resolution; probe upward when there is room
      if (LR.q('scale') === null || LR.q('scale') === undefined) {
        const target = Math.min(H.refresh || 60, LR.qn('fps', G.mobile ? 30 : 60)), lo = G.tier.scaleMin, hi = Math.min(G.tier.scaleMax, capScale);      // a phone holds thirty and spends the rest on pixels: a soft picture at sixty reads as out of focus (?fps=60 asks for sixty)
        if (sec > 2.5) {
          if (fps < target * 0.86) { slowFor += 0.5; okFor = 0; } else if (fps > target * 0.95) { okFor += 0.5; slowFor = 0; } else { slowFor = 0; okFor = 0; }
          if (slowFor >= 1 && R.scale > lo + 0.01) { if (H.probing) { capScale = Math.max(lo, R.scale - 0.1); wait = Math.min(60, wait * 2); H.probing = false; } R.setScale(Math.max(lo, R.scale - (fps < target * 0.6 ? 0.2 : 0.1))); slowFor = 0; }
          else if (okFor >= wait && R.scale < hi - 0.01) { R.setScale(Math.min(hi, R.scale + 0.1)); okFor = 0; H.probing = true; }
          else if (okFor >= 2 && H.probing) { H.probing = false; }
          // a phone that holds full scale with frames to spare has pixels left on its screen: its canvas goes from two a CSS
          // pixel to two and a half, once.  The scale steps down so the same pixels are drawn at first; the governor goes on from there
          if (G.mobile && !G.dprUp && LR.fit && (window.devicePixelRatio || 1) > 2.2 && !LR.q('dpr') && R.scale >= G.tier.scaleMax - 0.01 && fps > target * 1.5) { H.spare = (H.spare || 0) + 0.5; if (H.spare >= 6) { G.dprUp = 1.25; R.scale = R.scale / 1.25; LR.fit(); okFor = 0; } } else H.spare = 0;
          // a device far below the tier it was given: step the whole tier down once
          if (G.auto && R.scale <= lo + 0.01 && fps < 22) { H.slowTier = (H.slowTier || 0) + 0.5; if (H.slowTier > 5 && G.tierName !== 'low' && !LR.q('stepped')) { const order = ['low', 'medium', 'high', 'ultra'], nx = order[Math.max(0, order.indexOf(G.tierName) - 1)]; const u = new URL(location.href); u.searchParams.set('stepped', '1'); history.replaceState(null, '', u); H.reload(nx); } } else H.slowTier = 0;
        }
      }
    }
    // the display's own rate, from the fastest frames seen
    if (dt > 0.001) { H.minDt = Math.min(H.minDt || 1, dt); if (sec > 1.5 && !H.refresh) H.refresh = H.minDt < 0.0075 ? 144 : H.minDt < 0.0095 ? 120 : H.minDt < 0.0125 ? 90 : 60; }
    // named places
    let here = null; for (const pl of LR.world.places) if (Math.hypot(p.x - pl.x, p.z - pl.z) < pl.r) { here = pl; break; }
    if (here !== lastPlace) { if (here && sec > 3) H.card(here.name, here.sub); lastPlace = here; }
    if (E.flash) E.flash.style.opacity = Math.min(0.5, wx.flash * 0.35);
    if (LR.audio && LR.audio.ready) LR.audio.update(dt, { x: p.x, y: p.y + p.eye, z: p.z, yaw: p.yaw, speed: p.speed, moving: p.moving, running: p.running, surface: p.surface, sheltered: 0 });
  });
  LR.on('init', () => H.init(), 90);
}
