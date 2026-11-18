// scanned-realm · 25_weather — the hour, the season and the weather as one state that eases toward what was asked:
// clouds gather before rain falls, stone darkens before puddles fill, leaves turn before snow lies.  Every system
// (sky, air, surfaces, plants, particles, sound, the grade) reads this state; nothing switches.
{
  const U = LR.U;
  const W = (LR.wx = {
    key: 0.15, punch: 1.2, colour: 1.27, fill: 0.85, bounce: 1.3, shafts: 1.0,          // the picture's key, contrast, colour, and how much sky fills the shade
    tod: 16.4, season: 0, cloud: 0.35, rain: 0, snowfall: 0, wet: 0, puddle: 0, snow: 0, wind: 0.25, flash: 0,
    want: { tod: null, weather: 'clear', todSpeed: 0 }, flow: 0.012, auto: false, autoT: 0, time: 0, frame: 0,
    lampsOn: 0, exposure: 0.25, baseY: 0, listeners: [],
  });
  // the looks a project can override: W.looks.rain.fog = …
  W.looks = {
    clear: { cloud: 0.34, dark: 0.0, rain: 0, snowfall: 0, season: 0, wind: 0.24, fog: 0.0011, fogH: 0.050, turb: 1.0 },
    rain:  { cloud: 1.0,  dark: 0.85, rain: 1, snowfall: 0, season: 0, wind: 0.8,  fog: 0.0085, fogH: 0.012, turb: 2.4 },
    snow:  { cloud: 0.96, dark: 0.25, rain: 0, snowfall: 1, season: 1, wind: 0.38, fog: 0.0105, fogH: 0.010, turb: 2.0 },
    winter:{ cloud: 0.30, dark: 0.0, rain: 0, snowfall: 0, season: 1, wind: 0.2,  fog: 0.0026, fogH: 0.040, turb: 1.2 },
    autumn:{ cloud: 0.42, dark: 0.0, rain: 0, snowfall: 0, season: 0.45, wind: 0.34, fog: 0.0032, fogH: 0.042, turb: 1.4 },
    // mist: low cloud lying in the valleys — the air itself is what you see; lamps cut cones in it and far things are shapes
    mist:  { cloud: 0.92, dark: 0.45, rain: 0, snowfall: 0, season: 0, wind: 0.1, fog: 0.0125, fogH: 0.034, turb: 1.8 },
  };
  W.cur = Object.assign({}, W.looks.clear);
  W.set = (o) => {
    if (o.weather && W.looks[o.weather]) W.want.weather = o.weather;
    if (o.tod !== undefined) { W.want.tod = ((o.tod % 24) + 24) % 24; }
    if (o.auto !== undefined) { W.auto = o.auto; W.autoT = 0; }
    if (o.manual) W.auto = false;
    W.emit();
  };
  W.onChange = (fn) => W.listeners.push(fn);
  W.emit = () => { for (const f of W.listeners) f(W); };
  // jump there now (stills, checks)
  W.snap = (o = {}) => {
    if (o.weather && W.looks[o.weather]) { W.want.weather = o.weather; Object.assign(W.cur, W.looks[o.weather]); const k = W.cur; W.cloud = k.cloud; W.rain = k.rain; W.snowfall = k.snowfall; W.season = k.season; W.wind = k.wind; W.wet = k.rain; W.puddle = k.rain; W.snow = k.season > 0.5 ? 1 : 0; }
    for (const k of ['tod', 'season', 'wet', 'puddle', 'snow', 'cloud', 'rain', 'snowfall', 'flash']) if (o[k] !== undefined) W[k] = o[k];
    if (o.tod !== undefined) W.want.tod = null;
  };
  // the automatic round: one loop through everything the realm can do, about three minutes
  W.round = [
    { t: 0, weather: 'clear' }, { t: 14, tod: 19.9 }, { t: 30, tod: 23.0 }, { t: 48, tod: 6.1 }, { t: 62, tod: 11.0 },
    { t: 70, weather: 'rain' }, { t: 104, weather: 'clear', tod: 15.0 }, { t: 122, weather: 'snow', tod: 16.0 }, { t: 160, tod: 17.4 }, { t: 172, tod: 21.5 }, { t: 186, weather: 'winter', tod: 9.5 }, { t: 200, weather: 'clear', tod: 15.5 }, { t: 222, end: true },
  ];
  const ease = (cur, tgt, up, down, dt) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : down)));
  let nextBolt = 6, boltT = -9;
  W.update = (dt, time) => {
    W.time = time; W.frame++;
    if (W.auto) { const a = W.autoT, b = (W.autoT += dt); for (const k of W.round) if (k.t >= a && k.t < b || (a === 0 && k.t === 0)) { if (k.end) { W.autoT = 0; break; } if (k.weather) W.want.weather = k.weather; if (k.tod !== undefined) W.want.tod = k.tod; W.emit(); } }
    const L = W.looks[W.want.weather], c = W.cur;
    // the hour: flows on its own, or races (forward) to the hour asked for
    if (W.want.tod !== null) { let d = (W.want.tod - W.tod + 24) % 24; if (d < 0.02) { W.tod = W.want.tod; W.want.tod = null; } else { const sp = Math.max(0.5, Math.min(3.2, d * 0.9)); W.tod = (W.tod + Math.min(d, sp * dt)) % 24; } }
    else W.tod = (W.tod + W.flow * dt) % 24;
    // clouds first, then what falls from them; season turns slowly
    c.cloud = ease(c.cloud, L.cloud, 5, 7, dt); c.dark = ease(c.dark, L.dark, 6, 6, dt); c.wind = ease(c.wind, L.wind, 4, 6, dt); c.fog = ease(c.fog, L.fog, 7, 8, dt); c.fogH = ease(c.fogH, L.fogH, 7, 8, dt); c.turb = ease(c.turb, L.turb, 6, 6, dt);
    const ready = LR.sm(0.72, 0.92, c.cloud);
    W.rain = ease(W.rain, L.rain * ready * (1 - LR.sm(0.25, 0.6, W.season)), 4, 5, dt);
    W.season = ease(W.season, L.season, 9, 7, dt);
    W.snowfall = ease(W.snowfall, L.snowfall * ready * LR.sm(0.45, 0.8, W.season), 5, 6, dt);
    W.cloud = c.cloud; W.wind = c.wind;
    W.wet = ease(W.wet, Math.max(W.rain, W.snow * 0.0), 5, 22, dt);
    W.puddle = ease(W.puddle, W.rain > 0.3 ? 1 : 0, 16, 38, dt);
    const cold = LR.sm(0.5, 0.85, W.season);
    W.snow = ease(W.snow, cold * (W.snowfall > 0.25 || (L.season > 0.5 && W.snow > 0.3) ? 1 : W.snow > 0.02 && L.season > 0.5 ? 1 : 0), 15, 9, dt);
    if (L.season < 0.5) W.snow = ease(W.snow, 0, 9, 9, dt);
    // lightning in heavy rain
    if (W.rain > 0.75 && !LR.RENDER) { nextBolt -= dt; if (nextBolt <= 0) { nextBolt = 5 + Math.abs(Math.sin(time * 12.9898) * 43758.5453 % 1) * 11; boltT = time; LR.emit('thunder', 0.4 + Math.abs(Math.sin(time * 3.7) * 1000 % 1) * 2.4); } }
    const bt = time - boltT; W.flash = LR.RENDER ? W.flash : bt >= 0 && bt < 0.7 ? Math.max(0, Math.exp(-bt * 9) * (0.6 + 0.4 * Math.sin(bt * 70)) + (bt > 0.18 ? Math.exp(-(bt - 0.18) * 12) * 0.7 : 0)) : 0;
    W.apply();
  };
  // state → uniforms
  W.apply = () => {
    const c = W.cur, S = LR.sky;
    U.uWind.value.set(0.83, 0.56, W.wind, 0);
    S.update({ tod: W.tod, season: W.season, cloud: W.cloud, dark: c.dark, turb: c.turb, time: W.time, frame: W.frame }, W.frame < 3);
    const sunY = S.U.uSunDirT.value.y, night = S.night, day = LR.sm(-0.05, 0.25, sunY);
    W.lampsOn = Math.max(LR.sm(0.10, -0.04, sunY), c.dark * LR.sm(0.75, 1.0, W.cloud) * 0.35 * LR.sm(0.5, 1, W.rain));
    U.uWx.value.set(W.wet, W.puddle, W.snow, W.season); U.uWx2.value.set(W.rain, W.snowfall, W.lampsOn, W.flash);
    // air: mist at dawn and dusk and after dark, thick in rain and snow
    // morning mist lies thick and burns off by nine; an evening only goes a little golden
    const low = LR.sm(0.42, 0.02, Math.abs(sunY)) * (1 - LR.sat(W.rain + W.snowfall)), dawn = LR.sm(4.2, 5.4, W.tod) * LR.sm(9.2, 7.4, W.tod);
    const fog = c.fog * (1 + low * (0.6 + 4.6 * dawn)) + night * 0.0012;
    U.uFog.value.set(fog, LR.lerp(c.fogH, 0.02, low * 0.5), W.baseY, 0);
    // woods hold damp air: thick at dawn and toward evening, so the sun shows as shafts between the trunks
    if (LR.canopy) { const lowS = LR.sm(0.66, 0.14, sunY) * day; LR.render.U.uCanopy.value.set(LR.canopy.shade, LR.canopy.mist * (0.004 + 0.017 * lowS) * (1 - 0.75 * LR.sat(W.rain + W.snowfall)), 0, 0); }
    // exposure: what a camera would need for this light
    const ev = LR.lerp(LR.lerp(1.9, 1.2, LR.sm(-0.24, 0.0, sunY)), 0.36, Math.pow(LR.sm(0.0, 0.36, sunY), 0.6));       // night is dark: lamps and windows carry it
    W.exposure = ev * (1 + 0.55 * LR.sat(W.cloud * 1.3 - 0.4) * day * (1 - 0.6 * W.snow)) * (1 - 0.32 * W.snow * day) * (1 + 0.6 * night * LR.sat(W.cloud * 1.5 - 0.6));
    const P = LR.render.U; P.uExposure.value = W.exposure; P.uKey.value = LR.lerp(W.key, 0.036, night) * (1 + 0.45 * W.snow * day);
    const golden = LR.sm(0.36, 0.05, sunY) * LR.sm(-0.12, 0.02, sunY) * (1 - LR.sat(W.cloud * 1.4 - 0.5));
    // the look: W.punch = contrast (AgX power), W.colour = saturation; rain and snow take colour out, night a little
    const sat = W.colour * (1 - 0.13 * W.rain - 0.09 * W.snow * (1 - golden) - 0.05 * night), con = W.punch + 0.03 * golden - 0.05 * LR.sat(W.rain + W.snowfall);
    P.uFill.value = W.fill * (1 + 0.5 * LR.sat(W.cloud * 1.4 - 0.5)); P.uBounce.value = W.bounce; P.uShaft.value = W.shafts;
    P.uGrade.value.set(con, sat, 0.26, 0.022);
    P.uTintG.value.set(1 + 0.05 * golden - 0.05 * night - 0.03 * W.rain, 1 + 0.01 * golden - 0.005 * night, 1 - 0.07 * golden + 0.1 * night + 0.03 * W.rain + 0.03 * W.snow);
    P.uLiftG.value.set(0.004 + 0.004 * night, 0.006 + 0.008 * night, 0.012 + 0.022 * night);
    P.uBloomMix.value = 0.055 + 0.04 * LR.sat(W.rain + W.snowfall) + 0.03 * night + 0.02 * low;
  };
  W.clock = () => { const h = Math.floor(W.tod), m = Math.floor((W.tod - h) * 60); return { h, m, text: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') }; };
  W.label = () => (W.snowfall > 0.3 ? 'snow' : W.rain > 0.3 ? 'rain' : W.season > 0.6 ? 'winter' : W.cur.fog > 0.008 ? 'mist' : W.cloud > 0.7 ? 'overcast' : 'clear');
}
