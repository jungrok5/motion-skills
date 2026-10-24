/* canvas-film harness — shared helpers for every scene.
   Every scene is a pure function of time: draw(ctx, t). The same page plays in a browser (with controls + synced audio),
   is recorded frame by frame by scripts/render.mjs (?render=1), and is driven live by player/index.html.

   Page-level settings (set before this script, all optional):
     window.FILM_SRC   = 'ko'                       source language the scenes are written in (default 'ko')
     window.FILM_FONTS = { serif: "'Noto Serif KR'", sans: "'Noto Sans KR'" }   the scenes' own typefaces, which a
                                                    language file's "_fonts" can swap for its script */
(function () {
  const P = {};
  // orientation: ?o=v → portrait 1080×1920, otherwise landscape 1920×1080. Scenes read P.ori / P.W / P.H.
  P.ori = /[?&]o=v/.test(location.search) || (!/[?&]o=h/.test(location.search) && innerHeight>innerWidth*1.2) ? 'v' : 'h';
  P.W = P.ori === 'v' ? 1080 : 1920; P.H = P.ori === 'v' ? 1920 : 1080;

  // ---------------- languages ----------------
  // Korean is the source: every on-screen string is written in Korean in the scene, and a language file maps it
  // (exact Korean string → translation), per scene: i18n/<lang>.json = { "_dir": "ltr|rtl", "<scene>": { "한국어": "…" } }.
  // ?lang=<code> picks the language (default ko = no lookup at all, so Korean renders exactly as authored).
  P.lang = (location.search.match(/[?&]lang=([\w-]+)/) || [])[1] || (window.FILM_SRC || 'ko');
  P.scene = decodeURIComponent(location.pathname.split('/').pop().replace(/\.html$/, ''));
  P.L = {}; P.dir = 'ltr';
  P.collect = /[?&]collect=1/.test(location.search); P.seen = new Set(); P.miss = new Set();
  P.SRC = window.FILM_SRC || 'ko';
  // "looks like source-language text": what the scan counts as untranslated if it reaches the canvas
  const SRC_RE = { ko: /[\uac00-\ud7a3]/, ja: /[\u3040-\u30ff\u4e00-\u9fff]/, zh: /[\u4e00-\u9fff]/ }[P.SRC.split('-')[0]] || /\p{L}/u;
  const HANGUL = SRC_RE;   // (name kept from the original Korean-source version)
  P.tr = s => {   // translate one on-screen string (pass the WHOLE Korean string, then slice/animate the result)
    if (s == null) return s; s = String(s);
    if (P.collect && HANGUL.test(s)) P.seen.add(s);
    if (P.lang === P.SRC || !HANGUL.test(s)) return s;
    const m = P.L[s]; if (m == null) { P.miss.add(s); return s; } return m;
  };
  // collect mode: also record every Hangul string that reaches the canvas, so untranslated text (a leak) shows up
  P.drawn = new Set();
  // iPhone Safari (iOS 17.4+) ignores globalAlpha for text drawn with a shadow, so every faded-out line showed at once.
  // So text never relies on globalAlpha: fully faded text is skipped, and a partial fade is baked into its colours.
  const RGBA = new Map(), fade = (c, a) => {
    let v = RGBA.get(c); if (!v) { const m = c[0] === '#' ? null : c.match(/[\d.]+/g);
      v = m ? [+m[0], +m[1], +m[2], m[3] == null ? 1 : +m[3]] : [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1]; RGBA.set(c, v); }
    return v.some(isNaN) ? c : `rgba(${v[0]},${v[1]},${v[2]},${v[3] * a})`; };
  for (const k of ['fillText', 'strokeText']) { const f = CanvasRenderingContext2D.prototype[k], sk = k === 'fillText' ? 'fillStyle' : 'strokeStyle';
    CanvasRenderingContext2D.prototype[k] = function (t, ...r) {
      if (P.collect && HANGUL.test(String(t))) P.drawn.add(String(t));   // collect mode: every Hangul string that reaches the canvas (leaks show up)
      const ga = this.globalAlpha; if (ga >= .999) return f.call(this, t, ...r);
      if (ga < .004) return;
      const st = this[sk], sc = this.shadowColor; if (typeof st !== 'string') return f.call(this, t, ...r);   // gradient/pattern: as before
      this[sk] = fade(st, ga); this.shadowColor = fade(sc, ga); this.globalAlpha = 1;
      try { return f.call(this, t, ...r); } finally { this.globalAlpha = ga; this[sk] = st; this.shadowColor = sc; } }; }
  // a counted phrase: Pilot.trn('{n}년', n) — the language file may add plural forms by CLDR category,
  // e.g. "{n}년#one": "{n} año", "{n}년#two": "سنتان", "{n}년#few": "{n} سنوات"; otherwise the plain key is used.
  P.trn = (key, n) => {
    let cat = 'other'; try { cat = new Intl.PluralRules(P.lang).select(n); } catch (e) {}
    const f = P.lang !== P.SRC && P.L[key + '#' + cat];
    return String(f != null && f !== false ? f : P.tr(key)).replace('{n}', n);
  };
  // user-perceived characters (keeps combining marks and syllable clusters together for typewriter effects)
  const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  P.chars = s => SEG ? Array.from(SEG.segment(String(s)), x => x.segment) : Array.from(String(s));
  P.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  P.lerp = (a, b, k) => a + (b - a) * k;
  P.ss = (a, b, x) => { const k = P.clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  P.eo = x => { x = P.clamp(x); return 1 - Math.pow(1 - x, 3); };
  P.eio = x => { x = P.clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  // fade window: 0 before a, ramps to 1 over fi, holds, ramps down to 0 ending at b
  P.win = (t, a, b, fi = .8, fo = .8) => P.ss(a, a + fi, t) * (1 - P.ss(b - fo, b, t));

  P.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let r = Math.imul(seed ^ seed >>> 15, 1 | seed); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; };

  // value noise + fbm (deterministic)
  const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
  P.noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  P.fbm = (x, y, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * P.noise(x * f, y * f); f *= 2; a *= .5; } return s / (1 - Math.pow(.5, o)); };

  P.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  P.hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  P.mix = (a, b, k) => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * k);
  P.rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // colour keyframes [[t, '#hex'], ...] → rgb at t
  P.ramp = (keys, t) => { let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; return P.mix(P.hex(a[1]), P.hex(b[1]), P.ss(a[0], b[0], t)); };

  // a grey speckle texture (tooth / grain), centred on 128
  P.speckle = (w, h, amp, seed, blur = 0) => { const c = P.canvas(w, h), x = c.getContext('2d'), d = x.createImageData(w, h), r = P.rng(seed);
    for (let i = 0; i < w * h; i++) { const v = 128 + (r() - .5) * 2 * amp; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    x.putImageData(d, 0, 0); if (blur) { const c2 = P.canvas(w, h), x2 = c2.getContext('2d'); x2.filter = `blur(${blur}px)`; x2.drawImage(c, 0, 0); return c2; } return c; };

  // multi-line text; lines split on \n.  While P.reframe renders a landscape world, text calls are queued and re-laid for portrait.
  let Q = null;
  P.text = (ctx, s, x, y, o = {}) => {
    if (Q) { Q.push([s, x, y, o]); return; }
    s = P.tr(s);
    let size = o.size || 44; const lines = String(s).split('\n');
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; ctx.font = `${o.weight || 400} ${size}px ${o.font || "'Noto Serif KR',serif"}`;
    if (P.lang !== P.SRC) {   // a translation may run longer than the Korean: shrink to fit the frame (or o.maxW)
      if (P.dir === 'rtl') ctx.direction = 'rtl';
      if (o.ls) ctx.letterSpacing = o.ls + 'px';
      const maxW = o.maxW || (P.W - 120), wd = Math.max(...lines.map(l => ctx.measureText(l).width));
      if (wd > maxW) { size = Math.max(10, size * maxW / wd); ctx.font = `${o.weight || 400} ${size}px ${o.font || "'Noto Serif KR',serif"}`; }
    }
    const lh = size * (o.lh || 1.55);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'alphabetic';
    if (o.ls) ctx.letterSpacing = o.ls + 'px';
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 18; }
    ctx.fillStyle = o.color || '#f3ece0';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    ctx.restore();
  };

  // Portrait from a scene authored at 1920×1080: re-render the world 1.78× larger (crisp vectors) and crop a 1080-wide
  // window centred on world-x `cx`; queued text is re-laid by mapText(s,x,y,o) → {s?,x,y,o?} (return null to drop).
  P.reframe = (ctx, t, drawWorld, cx, mapText, textFade = 1) => {
    const k = 1920 / 1080;
    if (!P._rf) { P._rf = P.canvas(Math.ceil(1920 * k), 1920); P._rx = P._rf.getContext('2d'); }
    const x = P._rx; x.setTransform(k, 0, 0, k, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, 1920, 1080);
    Q = []; let q; try { x.save(); drawWorld(x, t); x.restore(); } finally { q = Q; Q = null; }
    cx = P.clamp(cx, 540 / k, 1920 - 540 / k);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1920); ctx.drawImage(P._rf, Math.round(540 - cx * k), 0);
    for (const [str, tx, ty, o] of q) { const m = mapText(str, tx, ty, o); if (!m) continue;
      P.text(ctx, m.s == null ? str : m.s, m.x, m.y, { ...o, ...(m.o || {}), alpha: (o.alpha == null ? 1 : o.alpha) * textFade }); }
  };


  // Player: the same deterministic draw(t) powers playback, scrub and export.
  P.run=async function(cfg){
    const render=new URLSearchParams(location.search).has('render');
    const cv=P.canvas(cfg.W,cfg.H);cv.id='film';document.body.append(cv);
    const style=document.createElement('style');style.textContent=`
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#070a10;color:#f6eee2;font-family:'Noto Serif KR',sans-serif}
      #film{position:absolute;display:block}button{font:inherit;color:inherit;border:1px solid #ffffff30;background:#161c28c9;border-radius:30px;padding:10px 17px;cursor:pointer;white-space:nowrap}button:hover,button[aria-pressed=true]{background:#f6eee2;color:#152033}button:focus-visible,input:focus-visible{outline:2px solid #f9d393;outline-offset:3px}
      .top{position:fixed;top:0;left:0;right:0;padding:24px 28px;background:linear-gradient(#06101b9c,transparent);display:flex;align-items:center;justify-content:space-between;gap:15px;transition:opacity .3s}.title{letter-spacing:.16em;font-size:21px}.title small{display:block;font:10px/2.2 system-ui;letter-spacing:.19em;color:#ddd8ce}.topnav{display:flex;gap:8px;font-size:12px}
      .controls{position:fixed;bottom:0;left:0;right:0;padding:40px 28px 22px;background:linear-gradient(transparent,#060b14e8);transition:opacity .3s}.row{display:flex;align-items:center;gap:12px}.timeline{display:flex;gap:4px;margin-bottom:13px}.timeline button{padding:5px 0;border:0;border-radius:0;background:transparent;flex:1;font:10px "Noto Serif KR",sans-serif;text-align:left;color:#cbc9c6;border-top:2px solid #ffffff3b}.timeline button.current{color:#ffe0ad;border-top-color:#ffe0ad}.time{font:12px system-ui;font-variant-numeric:tabular-nums;white-space:nowrap;color:#deded9}input[type=range]{accent-color:#e8c28d;flex:1;min-width:30px}.quiet .top,.quiet .controls{opacity:0;pointer-events:none}.status{position:fixed;inset:0;display:grid;place-items:center;background:#070a10;font:14px system-ui;letter-spacing:.12em}.status[hidden]{display:none}
      @media(max-width:600px){.top{padding:18px 16px}.title{font-size:18px}.topnav{gap:5px}.topnav button{padding:8px 10px;font-size:11px}.controls{padding:36px 16px max(18px,env(safe-area-inset-bottom))}.row{gap:7px}.row button{padding:9px 12px;font-size:12px}.time{font-size:10px}.timeline button{font-size:9px}}
    `;document.head.append(style);
    const status=document.createElement('div');status.className='status';status.textContent='여름을 불러오는 중';document.body.append(status);
    const fit=()=>{const s=render?1:Math.min(innerWidth/cfg.W,innerHeight/cfg.H);Object.assign(cv.style,{width:cfg.W*s+'px',height:cfg.H*s+'px',left:(render?0:(innerWidth-cfg.W*s)/2)+'px',top:(render?0:(innerHeight-cfg.H*s)/2)+'px'});};fit();addEventListener('resize',fit);
    try{await document.fonts.load('600 40px "Noto Serif KR"');await cfg.init();}catch(e){status.textContent='불러오지 못했습니다. 새로고침해 주세요.';console.error(e);throw e;}
    const ctx=cv.getContext('2d');const draw=t=>{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cfg.W,cfg.H);ctx.fillStyle='#080c16';ctx.fillRect(0,0,cfg.W,cfg.H);cfg.draw(ctx,Math.max(0,Math.min(cfg.dur-.001,t)));ctx.restore();};
    window.seek=draw;window.DURATION=cfg.dur;window.__ready=true;window.__motionBackend=MotionMesh?'webgl':'canvas';status.hidden=true;
    if(render){draw(0);return;}
    const top=document.createElement('header');top.className='top';top.innerHTML='<div class="title">건널목<small>SUMMER CROSSING</small></div><nav class="topnav"><button id="study" aria-pressed="false">캐릭터 보기</button><button id="aspect" aria-label="가로 세로 전환">'+(P.ori==='v'?'가로':'세로')+'</button><button id="full" aria-label="전체 화면">전체</button></nav>';document.body.append(top);
    const ui=document.createElement('footer');ui.className='controls';ui.innerHTML='<div class="timeline">'+FILM_SPEC.shots.map(sh=>'<button data-start="'+sh.start+'">'+sh.label+'</button>').join('')+'</div><div class="row"><button id="play" aria-label="영상 재생">▶ 재생</button><button id="restart" aria-label="처음부터">↺</button><input id="scrub" aria-label="재생 위치" type="range" min="0" max="32.4" step="0.01" value="0"><span class="time" id="time"></span><button id="sound" aria-pressed="false">소리 끔</button></div>';document.body.append(ui);
    const $=id=>document.getElementById(id);let cur=0,playing=false,study=false,last=performance.now(),dirty=true,hideTimer,sound=false;
    const audio=window.MotionSound?MotionSound(cfg.dur):null;
    const poke=()=>{document.body.classList.remove('quiet');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(playing)document.body.classList.add('quiet')},2800);};
    const sync=()=>{if(audio){audio.stop();if(sound&&playing&&!study)audio.play(cur);}};
    function play(v){playing=v;last=performance.now();$('play').textContent=v?'Ⅱ 일시정지':'▶ 재생';$('play').setAttribute('aria-label',v?'일시정지':'영상 재생');sync();poke();}
    function jump(t){cur=Math.max(0,Math.min(cfg.dur,t));dirty=true;last=performance.now();sync();poke();}
    $('play').onclick=()=>{if(cur>=cfg.dur)jump(0);play(!playing);};cv.onclick=()=>{poke();play(!playing)};
    $('restart').onclick=()=>{study=false;$('study').setAttribute('aria-pressed',false);jump(0);play(true)};
    $('scrub').oninput=e=>jump(+e.target.value);
    $('sound').onclick=async()=>{sound=!sound;if(sound&&audio)await audio.unlock();$('sound').textContent=sound?'소리 켬':'소리 끔';$('sound').setAttribute('aria-pressed',sound);sync();poke();};
    $('study').onclick=()=>{study=!study;$('study').setAttribute('aria-pressed',study);jump(study?20.6:0);play(true);};
    $('aspect').onclick=()=>{const u=new URL(location.href);u.searchParams.set('o',P.ori==='v'?'h':'v');location.href=u;};
    $('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{});};
    ui.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{study=false;$('study').setAttribute('aria-pressed',false);jump(+b.dataset.start);play(true)});
    addEventListener('pointermove',poke);addEventListener('pointerdown',poke);addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();play(!playing);}if(e.code==='ArrowRight')jump(cur+1);if(e.code==='ArrowLeft')jump(cur-1);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)play(false);});
    window.motionPlayer={jump,play,get time(){return cur},get playing(){return playing}};
    const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
    // Start with a living close-up. Main play starts the story at 0.
    draw(21.6);
    function tick(now){if(playing){cur+=(now-last)/1000;if(study&&cur>=26)cur=20.6;if(cur>=cfg.dur){cur=cfg.dur;play(false);}dirty=true;}last=now;
      if(dirty){if(study&&window.inspectPuppet)inspectPuppet(cur);else draw(cur);dirty=false;}$('scrub').value=cur;$('time').textContent=fmt(cur)+' / 0:32';ui.querySelectorAll('[data-start]').forEach((b,i)=>b.classList.toggle('current',cur>=FILM_SPEC.shots[i].start&&cur<FILM_SPEC.shots[i].end));requestAnimationFrame(tick);}
    dirty=false;requestAnimationFrame(tick);poke();
  };
  window.Pilot=P;
})();
