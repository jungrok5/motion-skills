// holo-pass · stage.js — the reveal: an envelope arrives, the seal pops, the flap opens, the pass rises out and flies
// to the centre, tilts so the foil catches the light, flips to the postcard back and back again. Everything is a pure
// function of t, so the same stage plays live and renders to MP4 frame by frame.
//   const st = HP.stage(host, data, { W: 1600, H: 900, q: 1.2, link, caption: false });  await st.ready;
//   st.seek(t)                 the timeline (0 … st.DURATION)
//   st.frame(clock, pose)      after the reveal: background and picture keep moving, the card takes `pose`
(function () {
  const HP = (window.HP = window.HP || {});
  const { seg, ease, lerp, wave, clamp } = HP;
  const TAU = Math.PI * 2;
  const T = { enter: [0, 0.9], seal: [1.55, 1.95], flap: [1.8, 2.5], rise: [2.45, 3.5], fly: [3.45, 4.6], drop: [3.6, 4.5],
    sway: 4.6, flip1: [8.2, 9.1], flip2: [11.5, 12.4], end: 14 };
  HP.TIMELINE = T;

  // ---------- backgrounds ----------
  const BG = {};
  const radial = (c, W, H, a, b, cy = 0.45) => { const g = c.createRadialGradient(W / 2, H * cy, 0, W / 2, H * cy, Math.hypot(W, H) * 0.62); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  const bokeh = (c, W, H, t, n, cols, seed, size = 60, alpha = 0.35) => {
    const r = HP.rng(seed); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x = (r() * W + t * (r() - 0.5) * 30 + W) % W, y = (r() * H - t * (6 + r() * 14) + H * 10) % H, s = size * (0.4 + r()), a = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.5 + i)));
      const g = c.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, cols[i % cols.length]); g.addColorStop(0.55, cols[i % cols.length]); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = a * 0.5; c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };
  const stars = (c, W, H, t, n, seed, top = 1) => { const r = HP.rng(seed); c.fillStyle = '#fff'; for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H * top, s = 0.6 + r() * 1.8; c.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * (0.5 + r()) + i)); c.fillRect(x, y, s, s); } c.globalAlpha = 1; };
  const flakes = (c, W, H, t, n, seed, col = '#fff', speed = 40) => { const r = HP.rng(seed); c.fillStyle = col; for (let i = 0; i < n; i++) { const x0 = r() * W, y0 = r() * H, sp = speed * (0.5 + r()), s = 1 + r() * 3; c.globalAlpha = 0.4 + r() * 0.5; c.beginPath(); c.arc((x0 + Math.sin(t * 0.7 + i) * 20 + W) % W, (y0 + t * sp) % H, s, 0, TAU); c.fill(); } c.globalAlpha = 1; };
  const confetti = (c, W, H, t, n, cols, seed, speed = 70) => { const r = HP.rng(seed); for (let i = 0; i < n; i++) { const x0 = r() * W, y0 = r() * H, sp = speed * (0.5 + r()), w = 6 + r() * 8, ph = r() * TAU; const x = x0 + Math.sin(t * 1.3 + ph) * 26, y = (y0 + t * sp) % (H + 40) - 20; c.save(); c.translate(x, y); c.rotate(t * 2 + ph); c.scale(1, 0.25 + 0.75 * Math.abs(Math.cos(t * 3 + ph))); c.globalAlpha = 0.85; c.fillStyle = cols[i % cols.length]; c.fillRect(-w / 2, -w / 4, w, w / 2); c.restore(); } c.globalAlpha = 1; };
  const vignette = (c, W, H, k = 0.55) => { const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  BG.night = (c, W, H, t, pal) => {
    radial(c, W, H, pal.bg[0], pal.bg[1], 0.3); stars(c, W, H, t, 160, 3, 0.8);
    for (const [k, sag, seed] of [[0, 0.12, 1], [1, 0.2, 2]]) {        // two strings of bulbs
      const y0 = H * (0.02 + k * 0.05), pts = 18; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i <= 40; i++) { const u = i / 40; c.lineTo(u * W, y0 + Math.sin(u * Math.PI) * H * sag); } c.stroke();
      const cols = ['#ffd34d', '#ff6b6b', '#7fd1ff', '#8dffa8'];
      for (let i = 0; i < pts; i++) { const u = (i + 0.5 + k * 0.5) / pts, x = u * W, y = y0 + Math.sin(u * Math.PI) * H * sag + 8, on = 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.2 + i * 1.7 + seed)), col = cols[(i + k) % 4];
        const g = c.createRadialGradient(x, y, 0, x, y, 34); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = on * 0.55; c.fillStyle = g; c.fillRect(x - 34, y - 34, 68, 68); c.globalAlpha = 1; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 5, 7, 0, 0, TAU); c.fill(); }
    }
    flakes(c, W, H, t, 90, 9); vignette(c, W, H, 0.6);
  };
  BG.rays = (c, W, H, t, pal) => {
    radial(c, W, H, pal.bg[0], pal.bg[1], 0.4);
    c.save(); c.translate(W / 2, H * 0.42); c.rotate(t * 0.05); c.fillStyle = 'rgba(255,220,180,.07)'; for (let i = 0; i < 24; i++) { c.rotate(TAU / 24); c.beginPath(); c.moveTo(0, 0); c.lineTo(-Math.hypot(W, H) * 0.08, -Math.hypot(W, H)); c.lineTo(Math.hypot(W, H) * 0.08, -Math.hypot(W, H)); c.closePath(); c.fill(); } c.restore();
    c.strokeStyle = 'rgba(255,190,120,.55)'; c.lineWidth = 3;
    for (let k = 0; k < 9; k++) { const y = H * 0.8 + k * H * 0.028; c.beginPath(); for (let x = 0; x <= W; x += 10) c.lineTo(x, y + Math.sin(x / 38 + t * 1.2 + k) * 8); c.stroke(); }
    flakes(c, W, H, t, 50, 4, '#ffd9a0', 25); vignette(c, W, H, 0.45);
  };
  BG.warm = (c, W, H, t, pal) => { radial(c, W, H, pal.bg[0], pal.bg[1], 0.45); bokeh(c, W, H, t, 26, [pal.glow, pal.accent, '#ffffff'], 6, Math.min(W, H) * 0.08); confetti(c, W, H, t, 40, [pal.accent, pal.glow, '#fff', pal.a[3]], 8, 50); vignette(c, W, H, 0.55); };
  BG.dusk = (c, W, H, t, pal) => { radial(c, W, H, pal.bg[0], pal.bg[1], 0.4); stars(c, W, H, t, 120, 7); bokeh(c, W, H, t, 22, [pal.glow, pal.a[4], '#ffffff'], 12, Math.min(W, H) * 0.09, 0.4); vignette(c, W, H, 0.55); };
  BG.confetti = (c, W, H, t, pal) => { radial(c, W, H, pal.bg[0], pal.bg[1], 0.4); bokeh(c, W, H, t, 16, [pal.a[3], pal.a[0], pal.glow], 5, Math.min(W, H) * 0.07); confetti(c, W, H, t, 110, pal.a, 3, 80); vignette(c, W, H, 0.5); };
  HP.BG = BG;
  HP.BGKIT = { radial, bokeh, stars, flakes, confetti, vignette };

  function sparkle(c, x, y, r, a, col = '#fff') { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); } c.closePath(); c.fill(); c.globalAlpha = 1; }

  HP.stage = (host, data, o = {}) => {
    const W = o.W || 1600, H = o.H || 900, q = o.q || 1, portrait = H > W;
    const st = { W, H, DURATION: T.end, portrait };
    const el = document.createElement('div'); el.className = 'hp-stage'; el.style.width = W + 'px'; el.style.height = H + 'px';
    el.innerHTML = `<canvas class="hp-bg"></canvas>
      <div class="hp-env hp-env-b"><div class="hp-env-back"></div></div>
      <div class="hp-env hp-env-flapwrap"><div class="hp-env-flap"></div></div>
      <div class="hp-cardslot"></div>
      <div class="hp-env hp-env-f"><div class="hp-env-front"></div><div class="hp-env-label"><small>TO</small><b></b></div><div class="hp-env-stamp"><canvas width="200" height="240"></canvas></div></div>
      <div class="hp-seal">★</div>
      <canvas class="hp-fx"></canvas>
      <div class="hp-kicker"><small></small><b></b></div>
      <div class="hp-caption"><div class="t"></div><div class="w"></div><div class="p"></div></div>`;
    host.appendChild(el); st.el = el;
    const $ = s => el.querySelector(s);
    const bg = $('.hp-bg'), fx = $('.hp-fx');
    for (const cv of [bg, fx]) { cv.width = Math.round(W * q); cv.height = Math.round(H * q); }
    const envB = $('.hp-env-b'), envF = $('.hp-env-f'), flapW = $('.hp-env-flapwrap'), flap = $('.hp-env-flap'), seal = $('.hp-seal'), kick = $('.hp-kicker'), cap = $('.hp-caption');
    const slot = $('.hp-cardslot'); slot.style.cssText = 'left:0;top:0;width:0;height:0';
    const card = HP.card(slot, data, { dpr: o.dpr || 2, link: o.link });
    st.card = card;

    // layout: envelope and card scale with the stage
    const K = portrait ? W / 1600 * 1.55 : 1;              // portrait stages are 900 wide → ~0.87
    const envS = 0.8 * K, cardFinal = portrait ? (W * 0.92) / 1200 : 1.0;
    const envCY = portrait ? H * 0.56 : H * 0.6, cardCY = portrait ? H * (o.caption ? 0.36 : 0.42) : H * 0.5;
    const inS = 0.7 * envS;
    const envTop = cy => cy - 320 * envS;
    const cardIn = cy => cy + 26 * envS, cardOut = cy => envTop(cy) - 130 * envS;
    st.cardFinal = { x: W / 2, y: cardCY, s: cardFinal };

    const placeEnv = (n, cx, cy, s, extra = '') => { n.style.transformOrigin = '0 0'; n.style.transform = `translate(${cx - 520 * s}px, ${cy - 320 * s}px) scale(${s})${extra}`; };
    const placeCard = (x, y, s, rot) => { card.el.style.transform = `translate(${x - 600}px, ${y - 280}px) rotate(${rot}deg) scale(${s})`; };

    st.setData = async d => {
      const n = HP.normalize(d); st.d = n; const th = HP.THEMES[n.theme], pal = th.pal; st.th = th;
      el.style.setProperty('--env', pal.accent); el.style.setProperty('--env2', `color-mix(in srgb, ${pal.accent} 78%, #000)`);
      el.style.setProperty('--liner', pal.paper); el.style.setProperty('--liner2', `color-mix(in srgb, ${pal.accent} 30%, ${pal.paper})`);
      el.style.setProperty('--accent', pal.accent); el.style.setProperty('--glow', pal.glow);
      $('.hp-env-label b').textContent = n.to ? (n.lang === 'en' ? n.to : n.lang === 'ja' ? n.to + ' さま' : n.to + ' 님') : HP.l(n, 'invited');
      kick.querySelector('small').textContent = HP.l(n, 'invited');
      kick.querySelector('b').textContent = n.to ? (n.lang === 'en' ? n.to + HP.l(n, 'toYou') : n.to + HP.l(n, 'toYou')) : HP.l(n, 'anon');
      cap.querySelector('.t').textContent = n.title; cap.querySelector('.w').textContent = HP.when(n); cap.querySelector('.p').textContent = [n.place, n.price].filter(Boolean).join(' · ');
      cap.style.display = o.caption ? '' : 'none';
      await card.setData(d);
      const sc = $('.hp-env-stamp canvas').getContext('2d'), A = HP.CARD.ART; sc.clearRect(0, 0, 200, 240);
      const s = Math.max(200 / A.w, 240 / A.h); sc.save(); sc.translate(100, 120); sc.scale(s, s); sc.translate(-A.w / 2, -A.h / 2); if (card.img) HP.drawImageArt(sc, card.img, 1.3); else HP.ART[th.art](sc, 1.3, pal); sc.restore();
    };
    st.ready = st.setData(data);

    function paintBg(t, fade = 1) {
      const c = bg.getContext('2d'); c.setTransform(q, 0, 0, q, 0, 0); BG[st.th.bg](c, W, H, t, st.th.pal);
      if (fade < 1) { c.fillStyle = `rgba(0,0,0,${1 - fade})`; c.fillRect(0, 0, W, H); }
    }
    function paintFx(t, burst, glints) {
      const c = fx.getContext('2d'); c.setTransform(q, 0, 0, q, 0, 0); c.clearRect(0, 0, W, H);
      const { x, y, s } = st.cardFinal, r = HP.rng(31);
      if (burst > 0 && burst < 1) for (let i = 0; i < 46; i++) { const a = r() * TAU, sp = 300 + r() * 520, d = ease.out(burst) * sp * s, life = 1 - burst; sparkle(c, burst0.x + Math.cos(a) * d, burst0.y + Math.sin(a) * d * 0.7 + burst * burst * 120, (6 + r() * 12) * life, life, i % 3 ? '#fff' : st.th.pal.glow); }
      if (glints > 0) { const r2 = HP.rng(53); for (let i = 0; i < 14; i++) { const gx = x + (r2() - 0.5) * 1300 * s, gy = y + (r2() - 0.5) * 760 * s, ph = r2() * TAU, a = Math.max(0, Math.sin(t * 1.6 + ph)); sparkle(c, gx, gy, (8 + r2() * 14) * a, a * glints * 0.9, i % 2 ? '#fff' : st.th.pal.glow); } }
    }
    let burst0 = { x: W / 2, y: H / 2 };

    // the timeline
    st.seek = (t, idle = t) => {
      const fadeIn = seg(t, 0, 0.6); paintBg(idle, fadeIn);
      const ent = ease.back(seg(t, ...T.enter)), bob = Math.sin(idle * 2.4) * 6 * K * seg(idle, 0.6, 1.2) * (1 - seg(t, 1.5, 1.8));
      const drop = ease.in(seg(t, ...T.drop));
      const ecy = lerp(H + 420 * envS, envCY, ent) + bob + drop * (H * 0.9);
      const flapA = 180 * ease.inOut(seg(t, ...T.flap));
      const envVis = t < T.drop[1] + 0.01;
      for (const n of [envB, envF, flapW]) n.style.visibility = envVis ? 'visible' : 'hidden';
      for (const n of [envB, envF]) { placeEnv(n, W / 2, ecy, envS); n.style.opacity = 1 - seg(t, T.drop[0] + 0.4, T.drop[1]); }
      placeEnv(flapW, W / 2, ecy, envS, ` translateX(520px) perspective(2200px) rotateX(${flapA}deg) translateX(-520px)`);
      flapW.style.opacity = envF.style.opacity; flapW.style.zIndex = flapA > 90 ? 1 : 6; flap.classList.toggle('inside', flapA > 90);
      envB.style.zIndex = 0; envF.style.zIndex = 4;
      const sk = seg(t, ...T.seal); seal.style.visibility = sk < 1 ? 'visible' : 'hidden'; seal.style.zIndex = 7;
      seal.style.transform = `translate(${W / 2 - 60}px, ${envTop(ecy) + 640 * 0.6 * envS - 60 - sk * 90}px) scale(${envS * (1 + sk * 0.5)}) rotate(${sk * 40}deg)`; seal.style.opacity = 1 - ease.in(sk);
      // card: inside → out of the pocket → to the centre
      const rise = ease.inOut(seg(t, ...T.rise)), fly = ease.inOut(seg(t, ...T.fly));
      const inY = cardIn(ecy), outY = cardOut(envCY);
      let cx = W / 2, cy = lerp(inY, outY, rise), cs = inS, rot = 0;
      if (fly > 0) { cy = lerp(outY, st.cardFinal.y, fly); cs = lerp(inS, st.cardFinal.s, fly); rot = -5 * Math.sin(fly * Math.PI); }
      slot.style.zIndex = t >= T.fly[0] ? 5 : 2;
      card.el.style.visibility = t >= T.flap[0] ? 'visible' : 'hidden';
      placeCard(cx, cy, cs, rot);
      burst0 = { x: cx, y: cy };
      const sw = t - T.sway, sway = seg(t, T.fly[0] + 0.5, T.sway + 0.6);
      let rx = (Math.sin(sw * TAU / 3.4) * 9 + Math.sin(sw * 1.3) * 3) * sway, ry = (Math.sin(sw * TAU / 4.2 + 0.4) * 16) * sway;
      rx += (1 - fly) * 14 * rise;                        // leaning back as it leaves the envelope
      const f1 = ease.inOut(seg(t, ...T.flip1)), f2 = ease.inOut(seg(t, ...T.flip2)), flipA = 180 * f1 + 180 * f2;
      const lift = Math.sin(seg(t, ...T.flip1) * Math.PI) + Math.sin(seg(t, ...T.flip2) * Math.PI);
      const light = Math.max(Math.exp(-((t - 5.3) ** 2) / 0.12), Math.exp(-((t - 7.2) ** 2) / 0.12), Math.exp(-((t - 13.1) ** 2) / 0.12));
      card.pose({ rx: rx * (1 - lift * 0.6), ry: ry * (1 - lift * 0.6) + light * 10, flip: flipA, z: lift * 160, light });
      card.draw(idle);
      paintFx(idle, seg(t, T.fly[0] - 0.05, T.fly[0] + 1.0), seg(t, T.sway, T.sway + 1));
      const kv = seg(t, 0.35, 0.85) * (1 - seg(t, 1.7, 2.1)), kv2 = o.caption ? seg(t, T.fly[1] - 0.2, T.fly[1] + 0.6) : 0;   // 9:16 video: back above the card
      kick.style.opacity = Math.max(kv, kv2);
      kick.style.transform = `translateY(${kv2 > 0 ? st.cardFinal.y - 280 * st.cardFinal.s - 190 + (1 - kv2) * 16 : (portrait ? H * 0.2 : H * 0.11) + (1 - kv) * 16}px)`;
      const cv = o.caption ? seg(t, T.fly[1] - 0.2, T.fly[1] + 0.6) : 0;
      cap.style.opacity = cv; cap.style.transform = `translateY(${st.cardFinal.y + 300 * st.cardFinal.s + 70 + (1 - cv) * 20}px)`;
    };
    // after the reveal (live): the card is placed by the caller's pose
    st.frame = (clock, pose) => {
      paintBg(clock); placeCard(st.cardFinal.x, st.cardFinal.y, st.cardFinal.s, 0); slot.style.zIndex = 5; card.el.style.visibility = 'visible';
      for (const n of [envB, envF, flapW, seal]) n.style.visibility = 'hidden'; kick.style.opacity = 0;
      card.pose(pose); card.draw(clock); paintFx(clock, 0, 1);
    };
    return st;
  };
})();
