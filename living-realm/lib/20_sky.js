// living-realm · 20_sky — the sky is computed, not painted: sun and moon positions from the hour and the season,
// single scattering through a Rayleigh + Mie + ozone atmosphere into a small sky-view table, clouds as a lit noise
// shell that also throws its shadow on the land, stars, and an environment map the world is lit and mirrored by.
{
  const T = THREE, U = LR.U;
  // skyGain: the sky's own brightness against the sun's.  A clear zenith is darker than a sunlit grey card; the stand-in for
  // multiple scattering overshoots it, and a darker sky is what gives the land its contrast.
  const S = (LR.sky = { lat: 47, E_SUN: 22, moonBoost: 1, skyGain: 0.62 });
  const v = (value) => ({ value });
  const SU = (S.U = {
    uSkyLUT: v(null), uEnv: v(null),
    uSunDirT: v(new T.Vector3(0, 1, 0)), uMoonDir: v(new T.Vector3(0, -1, 0)),
    uSunE: v(new T.Vector3()), uMoonE: v(new T.Vector3()), uTurb: v(1),
    uSunDisc: v(new T.Vector3()), uCloudSun: v(new T.Vector3()), uCloudDir: v(new T.Vector3(0, 1, 0)),
    uStarRot: v(new T.Matrix3()), uNight: v(0), uCloudDark: v(0),
  });

  // ── where the sun and the moon are ──────────────────────────────────────────────────────────────────────────────
  // world: +x east, +y up, +z south.  tod in hours, season 0 (midsummer) … 1 (midwinter)
  const rad = Math.PI / 180;
  S.sunDir = (tod, season, out = new T.Vector3()) => {
    const lat = S.lat * rad, dec = LR.lerp(21, -20, season) * rad, H = (tod - 12) * 15 * rad;
    const e = -Math.cos(dec) * Math.sin(H), n = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(H), u = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
    return out.set(e, u, -n).normalize();
  };
  S.moonDir = (tod, season, out = new T.Vector3()) => {
    const lat = S.lat * rad, dec = (LR.lerp(-12, 16, season) + 6) * rad, H = (tod - 12 + 12.6) * 15 * rad;
    const e = -Math.cos(dec) * Math.sin(H), n = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(H), u = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
    return out.set(e, u, -n).normalize();
  };

  // ── transmittance toward a light from altitude h (CPU twin of the table's optical depth) ────────────────────────
  const RP = 6360e3, RA = 6460e3, bR = [5.8e-6, 13.5e-6, 33.1e-6], bM = 21e-6, bO = [0.65e-6, 1.881e-6, 0.085e-6];
  S.transmit = (dirY, h = 200, turb = 1) => {
    // ray from (0, RP+h, 0) in a direction with elevation sine dirY
    const y0 = RP + h, dx = Math.sqrt(Math.max(0, 1 - dirY * dirY)), dy = dirY;
    const b = y0 * dy, cP = y0 * y0 - RP * RP, dP = b * b - cP;
    if (dP > 0 && -b - Math.sqrt(dP) > 0) return [0, 0, 0];             // the planet is in the way
    const cA = y0 * y0 - RA * RA, tA = -b + Math.sqrt(b * b - cA);
    let oR = 0, oM = 0, oO = 0; const N = 40;
    for (let i = 0; i < N; i++) { const t0 = tA * Math.pow(i / N, 2), t1 = tA * Math.pow((i + 1) / N, 2), t = (t0 + t1) / 2, ds = t1 - t0; const px = dx * t, py = y0 + dy * t, hh = Math.sqrt(px * px + py * py) - RP; oR += Math.exp(-hh / 8000) * ds; oM += Math.exp(-hh / 1200) * ds; oO += Math.max(0, 1 - Math.abs(hh - 25000) / 15000) * ds; }
    return [0, 1, 2].map((k) => Math.exp(-(bR[k] * oR + bM * 1.1 * turb * oM + bO[k] * oO)));
  };

  // ── the sky-view table: azimuth × elevation, both lights ────────────────────────────────────────────────────────
  const lutFrag = `//#include head
in vec2 vUv; out vec4 o;
uniform vec3 uSunDirT, uMoonDir, uSunE, uMoonE; uniform float uTurb;
const float RP = 6360e3, RA = 6460e3; const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6), BO = vec3(0.65e-6, 1.881e-6, 0.085e-6); const float BM = 21e-6;
vec2 rs(vec3 ro, vec3 rd, float r){ float b = dot(ro, rd), c = dot(ro, ro) - r * r, d = b * b - c; if (d < 0.) return vec2(1e12, -1e12); d = sqrt(d); return vec2(-b - d, -b + d); }
vec3 dens(float h){ return vec3(exp(-h / 8000.), exp(-h / 1200.), max(0., 1. - abs(h - 25000.) / 15000.)); }
vec3 odTo(vec3 p, vec3 l){ vec2 tp = rs(p, l, RP); if (tp.x > 0. && tp.y > 0.) return vec3(1e9); float tA = rs(p, l, RA).y, ds = tA / 6.; vec3 od = vec3(0.); for (int i = 0; i < 6; i++) od += dens(length(p + l * (float(i) + .5) * ds) - RP) * ds; return od; }
void main(){
  float az = vUv.x * TAU, x = vUv.y * 2. - 1., el = sign(x) * x * x * PI * .5;
  vec3 rd = vec3(cos(el) * cos(az), sin(el), cos(el) * sin(az)), ro = vec3(0., RP + 200., 0.);
  float tmax = rs(ro, rd, RA).y; vec2 tp = rs(ro, rd, RP); bool ground = tp.x > 0.; if (ground) tmax = tp.x;
  float bm = BM * uTurb; vec3 odv = vec3(0.), sR[2], sM[2]; sR[0] = sR[1] = sM[0] = sM[1] = vec3(0.);
  vec3 Ld[2]; Ld[0] = uSunDirT; Ld[1] = uMoonDir;
  const int N = 20;
  for (int i = 0; i < N; i++) {
    float a = float(i) / float(N), b = float(i + 1) / float(N), t0 = tmax * a * a, t1 = tmax * b * b, ds = t1 - t0; vec3 p = ro + rd * (t0 + t1) * .5;
    vec3 d = dens(length(p) - RP); odv += d * ds * .5;
    for (int j = 0; j < 2; j++) { vec3 odl = odTo(p, Ld[j]); if (odl.x < 1e8) { vec3 tau = BR * (odv.x + odl.x) + bm * 1.1 * (odv.y + odl.y) + BO * (odv.z + odl.z); vec3 att = exp(-tau); sR[j] += d.x * att * ds; sM[j] += d.y * att * ds; } }
    odv += d * ds * .5;
  }
  vec3 col = vec3(0.); vec3 E[2]; E[0] = uSunE; E[1] = uMoonE;
  for (int j = 0; j < 2; j++) { float mu = dot(rd, Ld[j]), g = 0.76;
    float pR = 3. / (16. * PI) * (1. + mu * mu), pM = 3. / (8. * PI) * ((1. - g * g) * (1. + mu * mu)) / ((2. + g * g) * pow(1. + g * g - 2. * g * min(mu, 0.9985), 1.5));
    col += E[j] * (sR[j] * BR * pR + sM[j] * bm * pM);
    col += E[j] * (sR[j] * BR + sM[j] * bm) * (0.55 / (4. * PI));                     // a stand-in for light scattered more than once
    if (ground) { vec3 gp = ro + rd * tmax, gn = normalize(gp); vec3 odl = odTo(gp, Ld[j]); if (odl.x < 1e8) { vec3 tv = exp(-(BR * odv.x + bm * 1.1 * odv.y + BO * odv.z)), tl = exp(-(BR * odl.x + bm * 1.1 * odl.y + BO * odl.z)); col += E[j] * tl * max(dot(gn, Ld[j]), 0.) / PI * vec3(0.10, 0.12, 0.07) * tv; } }
  }
  o = vec4(col * 1.6 + vec3(0.0006, 0.0009, 0.0018), 1.);
}`;

  // ── what a direction of sky looks like (shared by the picture and the environment map) ───────────────────────────
  LR.chunk.sky = `
uniform sampler2D uSkyLUT; uniform sampler2D uEnv;
uniform vec3 uSunDirT, uMoonDir, uSunDisc, uMoonE, uCloudSun, uCloudDir; uniform mat3 uStarRot; uniform float uNight, uCloudDark;
vec3 skyLUT(vec3 rd){ float el = asin(clamp(rd.y, -1., 1.)), x = sign(el) * sqrt(abs(el) / (PI * .5)); return textureLod(uSkyLUT, vec2(atan(rd.z, rd.x) / TAU, x * .5 + .5), 0.).rgb; }
vec3 envAt(vec3 d, float lod){ return textureLod(uEnv, octEnc(d) * (1.0 - 2.0 / 64.0) + 1.0 / 64.0, lod).rgb; }
vec4 cloudsAt(vec3 rd, vec3 skyc, bool fine){
  if (rd.y < 0.012) return vec4(0.);
  const float R = 6360e3, Hc = 1500.;
  float t = sqrt(R * R * rd.y * rd.y + 2. * R * Hc + Hc * Hc) - R * rd.y;
  vec2 p = uCamPos.xz + rd.xz * t;
  float d = cloudField(p);
  if (d < 0.003) return vec4(0.);
  float det = textureLod(uNoise, p * 0.0011 + uCloudOff.xy * 4.0, 0.).a, det2 = fine ? textureLod(uNoise, p * 0.0041 + uCloudOff.zw * 9.0, 0.).r : 0.5;
  d = sat(d - (1. - d) * (det * 0.5 + det2 * 0.22));
  float dens_ = smoothstep(0., 0.55, d) * uCloud.y;
  vec3 L = uCloudDir;
  float ds = cloudField(p + L.xz * (260. / max(L.y, 0.22))) , ds2 = cloudField(p + L.xz * (700. / max(L.y, 0.22)));
  float shade = exp(-(ds * 1.5 + ds2 * 1.1 + dens_ * 0.9) * (0.9 + uCloudDark * 1.6));
  float mu = dot(rd, L), silver = pow(sat(mu * .5 + .5), 10.) * (1. - dens_ * 0.6);
  vec3 amb = (skyLUT(vec3(0., 1., 0.)) * 1.5 + skyLUT(normalize(vec3(rd.x, 0.25, rd.z))) * 0.9) ;
  vec3 col = uCloudSun * (0.10 + 0.95 * shade + 2.6 * silver * shade) + amb * mix(1.0, 0.42, dens_ * (0.5 + 0.5 * uCloudDark));
  col *= mix(1.0, 0.34, uCloudDark * smoothstep(0.2, 0.9, dens_));
  float alpha = sat(dens_ * 1.9);
  float haze = 1. - exp(-t / 42000.);
  col = mix(col, skyc * 1.15 + uCloudSun * 0.06, haze);
  return vec4(col, alpha * (1. - haze * haze * 0.5));
}
vec3 starsAt(vec3 rd){
  vec3 d = uStarRot * rd; vec3 col = vec3(0.);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 190. : 90.; vec3 p = d * sc, c = floor(p), f = fract(p) - .5; vec3 h = hash33(c + float(k) * 17.);
    vec3 o = (h - .5) * .7; float dd = length(f - o);
    float mag = pow(h.x, k == 0 ? 18. : 34.) * (k == 0 ? 0.5 : 2.6);
    float tw = 0.75 + 0.25 * sin(uTime * (2. + h.y * 5.) + h.z * 40.);
    vec3 tint = mix(vec3(1., .82, .65), vec3(.72, .84, 1.), h.z);
    col += tint * mag * tw * smoothstep(k == 0 ? 0.06 : 0.10, 0.0, dd) * 0.5;
  }
  // the Milky Way: a band of unresolved stars with bright clouds and dark lanes of dust, and more faint stars along it
  float gl = dot(d, normalize(vec3(0.35, 0.2, 0.9))), band = exp(-gl * gl * 11.0), core = exp(-gl * gl * 60.0);
  float m1 = textureLod(uNoise, d.xy * 1.7 + d.z * 0.6, 0.).r, m2 = textureLod(uNoise, d.zy * 5.1 + 0.3, 0.).g, m3 = textureLod(uNoise, d.xz * 11.0 + d.y * 3.0, 0.).b;
  float cloud = m1 * (0.45 + 0.9 * m2), dust = smoothstep(0.42, 0.72, m3 * 0.6 + m2 * 0.4) * core;
  col += mix(vec3(0.50, 0.58, 0.86), vec3(0.95, 0.80, 0.62), core * m1) * band * (0.004 + cloud * cloud * 0.085) * (1.0 - 0.75 * dust);
  { vec3 p = d * 320., c = floor(p), f = fract(p) - .5; vec3 h = hash33(c + 51.); col += vec3(0.85, 0.9, 1.0) * pow(h.x, 9.) * 0.55 * band * smoothstep(0.09, 0.0, length(f - (h - .5) * .7)); }
  return col;
}
vec3 moonAt(vec3 rd, out float disc){
  float mu = dot(rd, uMoonDir); const float R = 0.0135; float a = acos(clamp(mu, -1., 1.)); disc = smoothstep(R, R * 0.93, a);
  if (disc <= 0.) return vec3(0.);
  vec3 up = abs(uMoonDir.y) > 0.95 ? vec3(1., 0., 0.) : vec3(0., 1., 0.), tx = normalize(cross(up, uMoonDir)), ty = cross(uMoonDir, tx);
  vec2 q = vec2(dot(rd, tx), dot(rd, ty)) / R; float z = sqrt(max(0., 1. - dot(q, q))); vec3 n = normalize(tx * q.x + ty * q.y - uMoonDir * z);
  float lit = sat(dot(n, uSunDirT) * 1.3 + 0.08);
  float maria = textureLod(uNoise, q * 0.21 + 0.3, 0.).r * 0.6 + textureLod(uNoise, q * 0.8, 0.).g * 0.4;
  vec3 alb = mix(vec3(0.42, 0.42, 0.44), vec3(0.95, 0.93, 0.88), smoothstep(0.35, 0.65, maria));
  return alb * (lit * 9.0 + 0.05) * uMoonE * 18. * disc;
}
// full: stars, discs.  for the environment map pass false.
vec3 skyAt(vec3 rd, bool full){
  vec3 c = skyLUT(rd);
  float below = smoothstep(0.0, -0.06, rd.y);
  if (full) {
    float md; vec3 moon = moonAt(rd, md);
    if (uNight > 0.01 && rd.y > -0.02) c += starsAt(rd) * uNight * (1. - md) * smoothstep(-0.02, 0.12, rd.y);
    c += moon * (1. - below);
    float mu = dot(rd, uSunDirT);
    c += uSunDisc * smoothstep(0.999958, 0.999982, mu) * (1. - below);
    c += uSunDisc * 2.2e-5 * pow(sat(mu), 900.) * (1. - below);
  }
  vec4 cl = cloudsAt(rd, c, full);
  return mix(c, cl.rgb, cl.a);
}
`;

  const envFrag = `//#include head
//#include hash
//#include pack
//#include frame
//#include air
//#include sky
in vec2 vUv; out vec4 o; uniform vec3 uGround;
void main(){
  vec3 d = octDec(vUv);
  vec3 c = skyAt(normalize(vec3(d.x, max(d.y, 0.0), d.z)), false);
  // below the horizon the world is land: what it throws back up
  vec3 hz = skyLUT(normalize(vec3(d.x, 0.03, d.z)));
  vec3 land = uGround * (uSunCol * max(uSunDir.y, 0.0) * (1.0 - uCloud.x * uCloud.w) + skyLUT(vec3(0., 1., 0.)) * 2.2);
  c = mix(c, mix(hz, land, smoothstep(0.0, -0.35, d.y)), smoothstep(0.02, -0.04, d.y));
  o = vec4(c, 1.);
}`;

  S.init = () => {
    const G = LR.gpu, ft = G.hdrType;
    S.lut = LR.rt(256, 128, { type: ft, wrap: T.RepeatWrapping }); S.lut.texture.wrapT = T.ClampToEdgeWrapping;
    SU.uSkyLUT.value = S.lut.texture;
    S.lutMat = LR.pass(lutFrag, { uSunDirT: SU.uSunDirT, uMoonDir: SU.uMoonDir, uSunE: SU.uSunE, uMoonE: SU.uMoonE, uTurb: SU.uTurb });
    const es = G.tier.env;
    S.env = LR.rt(es, es, { type: ft, mips: true, min: T.LinearMipmapLinearFilter, filter: T.LinearFilter });
    SU.uEnv.value = S.env.texture; S.envMips = Math.log2(es);
    S.envMat = LR.pass(envFrag, Object.assign(LR.uni('uTime uFrame uRes uCamPos uNearFar uViewProj uInvViewProj uPrevViewProj uView uProj uInvProj uWx uWx2 uWind uNoise uFogCol uFog uSunDir uSunCol uSkyAmb uGroundAmb uCloud uCloudOff'), SU, { uGround: { value: new T.Vector3(0.09, 0.11, 0.06) } }));
    S.last = { sun: new T.Vector3(9, 9, 9), moon: new T.Vector3(), turb: -1, env: -1e9, key: '' };
  };

  // state → uniforms.  w: { tod, season, cloud (coverage 0..1), dark (0..1), turb, time, lightning }
  const tmpS = new T.Vector3(), tmpM = new T.Vector3();
  S.update = (w, force) => {
    const sun = S.sunDir(w.tod, w.season, tmpS), moon = S.moonDir(w.tod, w.season, tmpM);
    SU.uSunDirT.value.copy(sun); SU.uMoonDir.value.copy(moon);
    const E = S.E_SUN, EM = E * 0.0085 * S.moonBoost;
    const Es = E * S.skyGain;
    SU.uSunE.value.set(Es, Es, Es); SU.uMoonE.value.set(EM * 0.72, EM * 0.86, EM * 1.12); SU.uTurb.value = w.turb;
    const ts = S.transmit(sun.y, 200, w.turb), tm = S.transmit(moon.y, 200, w.turb), tc = S.transmit(sun.y, 1800, w.turb), tcm = S.transmit(moon.y, 1800, w.turb);
    const sunVis = LR.sm(-0.045, 0.06, sun.y), moonFade = LR.sm(-0.03, -0.16, sun.y) * LR.sm(-0.02, 0.1, moon.y);
    const night = (S.night = LR.sm(-0.02, -0.2, sun.y)); SU.uNight.value = night * (1 - 0.92 * LR.sat(w.cloud * 1.3 - 0.15));
    const useSun = sunVis > 0.004; S.keyIsSun = useSun;
    const through = 1 - LR.sat(w.cloud * 1.25 - 0.2) * (0.55 + 0.4 * w.dark);          // what an overcast lets through as a beam
    const warm = [1.0, 0.955, 0.87];                                                       // the sun as a film sees it: a touch warmer than the sky's blue fill
    // a low sun through real air is redder than clean-air extinction makes it: deepen its colour as it sinks
    { const mx = Math.max(ts[0], ts[1], ts[2], 1e-6), deep = 1 + 0.7 * LR.sm(0.5, 0.05, sun.y); for (let k = 0; k < 3; k++) ts[k] = mx * Math.pow(ts[k] / mx, deep); }
    const key = useSun ? ts.map((t, k) => (E * t / Math.PI) * sunVis * through * warm[k]) : [EM * 0.72 * tm[0], EM * 0.86 * tm[1], EM * 1.12 * tm[2]].map((t) => (t / Math.PI) * moonFade * through * 3.2);
    U.uSunDir.value.copy(useSun ? sun : moon); if (U.uSunDir.value.y < 0.03) { U.uSunDir.value.y = 0.03; U.uSunDir.value.normalize(); }
    U.uSunCol.value.set(key[0], key[1], key[2]);
    S.keyPower = Math.max(key[0], key[1], key[2]);
    SU.uSunDisc.value.set(ts[0], ts[1], ts[2]).multiplyScalar(E * 900 * LR.sm(-0.02, 0.01, sun.y));
    // clouds are lit from where they are (higher: they keep the sun after the ground loses it)
    const cs = LR.sm(-0.075, 0.02, sun.y), cl = cs > 0.01 ? tc.map((t) => (E * t / Math.PI) * cs) : [EM * 0.72 * tcm[0], EM * 0.86 * tcm[1], EM * 1.12 * tcm[2]].map((t) => (t / Math.PI) * moonFade * 3.2);
    SU.uCloudSun.value.set(cl[0], cl[1], cl[2]); SU.uCloudDir.value.copy(cs > 0.01 ? sun : moon); if (SU.uCloudDir.value.y < 0.06) { SU.uCloudDir.value.y = 0.06; SU.uCloudDir.value.normalize(); }
    SU.uCloudDark.value = w.dark;
    U.uCloud.value.set(w.cloud, 0.55 + 0.45 * w.cloud, 0, LR.sat(w.cloud * 1.25 - 0.2) * (useSun ? 0.9 : 0.75));       // fair-weather clouds dim the sun only a little
    const wt = w.time * 0.0016; U.uCloudOff.value.set(wt * U.uWind.value.x, wt * U.uWind.value.y, wt * 1.7 * U.uWind.value.x + 0.31, wt * 1.7 * U.uWind.value.y + 0.57);
    // stars turn with the hour
    const a = (w.tod / 24) * LR.TAU, lat = S.lat * rad, cl_ = Math.cos(lat), sl = Math.sin(lat), ca = Math.cos(a), sa = Math.sin(a);
    SU.uStarRot.value.set(ca, sa * sl, -sa * cl_, -sa * sl, ca * sl * sl + cl_ * cl_, cl_ * sl * (1 - ca), sa * cl_, cl_ * sl * (1 - ca), ca * cl_ * cl_ + sl * sl);
    // the table: only when a light has moved or the air changed
    const L = S.last;
    if (force || L.sun.distanceTo(sun) > 0.0015 || L.moon.distanceTo(moon) > 0.004 || Math.abs(L.turb - w.turb) > 0.01) { LR.blit(S.lutMat, S.lut); L.sun.copy(sun); L.moon.copy(moon); L.turb = w.turb; L.env = -1e9; }
    // the environment map: a few times a second is plenty
    const now = w.frame;
    if (force || now - L.env >= (LR.RENDER ? 1 : 12)) { LR.blit(S.envMat, S.env); L.env = now; }
  };
}
