// dragon-realm · 35_water — still water that mirrors the world, and falling water.
//   DR.water({ level, bounds, height(x,z), palette })   a lake: planar mirror (a second small view with its own clouds),
//       depth colour from the bed, three layers of one baked ripple map, shoreline foam, sun glitter, rain pocks,
//       and ring / wake events as closed forms of (t − t0)
//   water.ring(t0, x, z, strength, life)                 an expanding ring packet;  water.wake(pathFn, t0, t1, step, strength)
//   DR.falls({ lip: [x,y,z], dir: [dx,dz], width, drop, speed })   a waterfall sheet laid out in fall time
{
  const u = (v) => ({ value: v });
  DR.water = (spec) => {
    const S = { level: 0, bounds: [-200, -200, 200, 200], palette: {}, mirror: true, ...spec }, pal = { shallow: '#3f6f62', deep: '#0b2a30', foam: '#e9f1f0', scatter: '#2f6a5c', ...S.palette };
    // ripple map: RG = slope, B = height.  Integer wave vectors make it tile.
    const N = 256, hgt = new Float32Array(N * N), r = DR.rng(4242), waves = [];
    for (let i = 0; i < 36; i++) { const a = r() * DR.TAU, k = Math.round(r.range(2, 15)), kx = Math.round(Math.cos(a) * k), ky = Math.round(Math.sin(a) * k); if (kx || ky) waves.push([kx, ky, r() * DR.TAU, 1 / Math.pow(Math.hypot(kx, ky), 1.25)]); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let h = 0; for (const w of waves) { const ph = ((w[0] * x + w[1] * y) / N) * DR.TAU + w[2]; h += (1 - Math.abs(Math.sin(ph))) * w[3]; } hgt[y * N + x] = h; }
    const rd = new Uint8Array(N * N * 4), at = (x, y) => hgt[DR.mod(y, N) * N + DR.mod(x, N)]; let mx = 0; for (const v of hgt) mx = Math.max(mx, v);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const o = (y * N + x) * 4; rd[o] = 255 * DR.sat(0.5 + (at(x + 1, y) - at(x - 1, y)) * 2.2); rd[o + 1] = 255 * DR.sat(0.5 + (at(x, y + 1) - at(x, y - 1)) * 2.2); rd[o + 2] = 255 * (at(x, y) / mx); rd[o + 3] = 255; }
    const ripple = new THREE.DataTexture(rd, N, N, THREE.RGBAFormat); ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping; ripple.minFilter = THREE.LinearMipmapLinearFilter; ripple.magFilter = THREE.LinearFilter; ripple.generateMipmaps = true; ripple.anisotropy = 4; ripple.needsUpdate = true;
    // bed map: depth of the water over the bounds (R, 0..1 = 0..12 m)
    const B = S.bounds, M = 256, bd = new Uint8Array(M * M * 4);
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) { const x = DR.lerp(B[0], B[2], (i + 0.5) / M), z = DR.lerp(B[1], B[3], (j + 0.5) / M), d = S.level - S.height(x, z), o = (j * M + i) * 4; bd[o] = 255 * DR.sat(d / 12); bd[o + 1] = 255 * DR.sat(0.5 + d / 3); bd[o + 3] = 255; }
    const bed = new THREE.DataTexture(bd, M, M, THREE.RGBAFormat); bed.minFilter = bed.magFilter = THREE.LinearFilter; bed.needsUpdate = true;
    const EV = 40, ev = [], evA = new Array(EV).fill(0).map(() => new THREE.Vector4(0, 0, -1e3, 0)), evB = new Array(EV).fill(0).map(() => new THREE.Vector4());
    const U = { tMirror: u(null), uMirrorM: u(new THREE.Matrix4()), uRipple: u(ripple), uBed: u(bed), uBounds: u(new THREE.Vector4(B[0], B[1], B[2] - B[0], B[3] - B[1])), uLevel: u(S.level),
      uEvA: u(evA), uEvB: u(evB), uEvN: u(0), uRain: u(0), uCalm: u(1), uMirrorK: u(1) };
    const c = (k) => `vec3(${DR.rgb(pal[k]).map((v) => v.toFixed(4)).join(',')})`;
    const mat = DR.shader({ uniforms: U,
      vertex: `void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragment: /* glsl */`
        uniform sampler2D tMirror, uRipple, uBed; uniform mat4 uMirrorM; uniform vec4 uBounds; uniform float uLevel, uRain, uCalm, uMirrorK;
        uniform vec4 uEvA[${EV}], uEvB[${EV}]; uniform int uEvN;
        ${DR.GLSL.sky}
        void main(){
          vec3 V = cameraPosition - vWPos; float dist = length(V); V /= dist;
          vec2 p = vWPos.xz; vec2 buv = (p - uBounds.xy) / uBounds.zw; vec4 bd = texture2D(uBed, buv);
          float depth = bd.r * 12.0; if (buv.x < 0.0 || buv.x > 1.0 || buv.y < 0.0 || buv.y > 1.0) depth = 12.0;
          float shoreD = (bd.g - 0.5) * 3.0;                    // metres of water over the bed, signed, fine near the edge
          if (shoreD < -0.25) discard;
          // ripples: three layers drifting with the wind; calmer in the lee, rougher in gusts and rain
          vec2 wd = uWind.xy; float ph = uWind.w, gust = drN4((p - wd * ph * 6.0) / 140.0).r;
          float amp = uCalm * (0.25 + 0.9 * smoothstep(0.35, 0.8, gust) * (0.3 + uWind.z)) + uRain * 0.5;
          vec2 s1 = texture2D(uRipple, p / 13.0 + wd * ph * 0.10).rg - 0.5, s2 = texture2D(uRipple, p.yx / 4.6 - wd.yx * ph * 0.19 + 0.37).rg - 0.5, s3 = texture2D(uRipple, p / 1.55 + wd * ph * 0.42 + 0.11).rg - 0.5;
          float foot = dist * uPx;
          vec2 slope = (s1 * 0.55 + s2.yx * 0.42 * (1.0 - smoothstep(0.02, 0.2, foot)) + s3 * 0.34 * (1.0 - smoothstep(0.006, 0.06, foot))) * amp;
          // events: rings that widen and fade
          float foam = 0.0;
          for (int i = 0; i < ${EV}; i++) { if (i >= uEvN) break; vec4 a = uEvA[i], b = uEvB[i]; float age = uTime - a.z; if (age <= 0.0 || age > b.x) continue;
            vec2 d = p - a.xy; float rr = length(d), front = b.y * age + b.w, wdt = 1.2 + age * 1.6; float x = (rr - front) / wdt; if (abs(x) > 3.0) continue;
            float env = exp(-x * x) * a.w * (1.0 - age / b.x) / (1.0 + age * b.z);
            slope += (d / max(rr, 0.01)) * cos(x * 3.2) * env; foam += env * smoothstep(0.5, 1.0, cos(x * 3.2)) * 0.6; }
          if (uRain > 0.0) { vec2 g = p * 1.7; vec2 id = floor(g); float h = drHash(id + floor(uTime * 3.0 + drHash(id) * 3.0)); vec2 q = fract(g) - 0.5 - (vec2(drHash(id + h), drHash(id - h)) - 0.5) * 0.6; float rr = length(q), tt = fract(uTime * 3.0 + drHash(id) * 3.0);
            slope += normalize(q + 1e-4) * sin((rr - tt * 0.5) * 40.0) * smoothstep(0.08, 0.0, abs(rr - tt * 0.5)) * (1.0 - tt) * uRain * step(h, 0.6) * (1.0 - smoothstep(0.004, 0.03, foot)) * 1.2; }
          vec3 Nw = normalize(vec3(-slope.x, 1.0, -slope.y));
          float nv = max(dot(Nw, V), 0.0), fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
          // the mirror: bend by the wave slope, more for things reflected from far away
          vec4 mc = uMirrorM * vec4(vWPos, 1.0); vec2 muv = mc.xy / mc.w + slope * (0.035 + 0.5 / (4.0 + dist)) * vec2(1.0, 2.2);
          vec3 refl = texture2D(tMirror, clamp(muv, 0.001, 0.999)).rgb * uMirrorK;
          vec3 R = reflect(-V, Nw); R.y = abs(R.y);
          if (uMirrorK < 0.5) refl = drSkyBase(R);
          float sg = max(dot(R, uKeyDir), 0.0); refl += uKeyCol * (pow(sg, 900.0) * 30.0 + pow(sg, 90.0) * 0.5) * drCloudSun(vWPos) * 0.3;
          // the body of the water: the bed through a column that absorbs red first
          vec3 skyL = mix(uSkyHor, uSkyZen, 0.5) * uAmb, sunL = uKeyCol * max(uKeyDir.y, 0.0) * drCloudSun(vWPos);
          float col = 1.0 - exp(-max(depth, 0.0) * 0.55);
          vec3 body = mix(${c('shallow')} * (0.5 + 0.7 * drN4(p * 0.11).b), ${c('deep')}, col) * (skyL + sunL * 0.35);
          body += ${c('scatter')} * sunL * 0.06 * pow(max(dot(V, -uKeyDir) * 0.5 + 0.5, 0.0), 3.0);
          vec3 colr = mix(body, refl, fres);
          // foam: the lap at the shore, and whatever the events churn up
          float lap = smoothstep(0.38, 0.0, shoreD + 0.10 * sin(ph * 2.2 + p.x * 0.3 + p.y * 0.21)) * smoothstep(-0.25, -0.05, shoreD);
          float lace = smoothstep(0.45, 0.75, texture2D(uRipple, p / 2.3 + wd * ph * 0.05).b * 0.6 + drN4(p * 0.35 - wd * ph * 0.1).a * 0.6);
          float fm = clamp(lap * (0.35 + 0.65 * lace) + foam * lace, 0.0, 1.0);
          colr = mix(colr, ${c('foam')} * (skyL * 1.1 + sunL * 0.5), fm * 0.85);
          colr = drAerial(colr, vWPos);
          gl_FragColor = vec4(colr, 1.0);
        }`,
    });
    const g = new THREE.PlaneGeometry(B[2] - B[0], B[3] - B[1], 1, 1).rotateX(-Math.PI / 2); g.translate((B[0] + B[2]) / 2, S.level, (B[1] + B[3]) / 2);
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'water'; mesh.renderOrder = 5;
    // ── events ──
    const W = { mesh, U, events: ev, level: S.level,
      ring: (t0, x, z, strength = 1, life = 9, speed = 3.2, r0 = 0) => { ev.push({ t0, x, z, strength, life, speed, r0, damp: 0.25 }); return W; },
      // a body moving along the surface drops small rings behind it; together they draw its wake
      wake: (posAt, t0, t1, step = 0.3, strength = 0.35, life = 6) => { for (let t = t0; t < t1; t += step) { const p = posAt(t); if (p && Math.abs(p[1] - S.level) < (p[3] || 3)) W.ring(t, p[0], p[2], strength, life, 2.2, 0.5); } return W; } };
    DR.onFrame((t) => { // the strongest live events go to the shader
      const live = []; for (const e of ev) { const age = t - e.t0; if (age > 0 && age < e.life) live.push(e); }
      if (live.length > EV) live.sort((a, b) => b.strength * (1 - (t - b.t0) / b.life) - a.strength * (1 - (t - a.t0) / a.life));
      const n = Math.min(EV, live.length); for (let i = 0; i < n; i++) { const e = live[i]; evA[i].set(e.x, e.z, e.t0, e.strength); evB[i].set(e.life, e.speed, e.damp, e.r0); }
      U.uEvN.value = n; U.uRain.value = DR.look.rain || 0; }, 60);
    // ── the mirror view ──
    if (S.mirror) {
      const vcam = new THREE.PerspectiveCamera(), n = new THREE.Vector3(0, 1, 0), P0 = new THREE.Vector3(0, S.level, 0), view = new THREE.Vector3(), tgt = new THREE.Vector3(), rot = new THREE.Matrix4(), look = new THREE.Vector3(), plane = new THREE.Plane(), cp = new THREE.Vector4(), q = new THREE.Vector4();
      let mv = null;
      DR.mirrorPass = (renderer, scene, cam) => {
        const on = DR.on('mirror') && (DR.shot?.mirror ?? true) && cam.position.y > S.level + 0.05; U.uMirrorK.value = on ? 1 : 0; if (!on) return;
        const w = Math.round(DR.view.w * DR.Q.mirror), h = Math.round(DR.view.h * DR.Q.mirror); if (!mv) mv = new DR.View(w, h, { airDiv: 2, steps: 20, samples: 0 }); else mv.size(w, h);
        view.subVectors(P0, cam.position).reflect(n).negate().add(P0); rot.extractRotation(cam.matrixWorld); look.set(0, 0, -1).applyMatrix4(rot).add(cam.position); tgt.subVectors(P0, look).reflect(n).negate().add(P0);
        vcam.position.copy(view); vcam.up.set(0, 1, 0).applyMatrix4(rot).reflect(n); vcam.lookAt(tgt); vcam.near = cam.near; vcam.far = cam.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(cam.projectionMatrix); vcam.layers.mask = cam.layers.mask;
        U.uMirrorM.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
        // oblique near plane (Lengyel): clip everything under the water out of the mirror
        plane.setFromNormalAndCoplanarPoint(n, P0).applyMatrix4(vcam.matrixWorldInverse); cp.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant + 0.04);
        const pm = vcam.projectionMatrix, e = pm.elements; q.x = (Math.sign(cp.x) + e[8]) / e[0]; q.y = (Math.sign(cp.y) + e[9]) / e[5]; q.z = -1; q.w = (1 + e[10]) / e[14]; cp.multiplyScalar(2 / cp.dot(q)); e[2] = cp.x; e[6] = cp.y; e[10] = cp.z + 1; e[14] = cp.w; vcam.projectionMatrixInverse.copy(pm).invert();
        mesh.visible = false; DR.U.uMirror.value = 1; const hide = []; scene.traverse((o) => { if (o.userData.noMirror && o.visible) { o.visible = false; hide.push(o); } });
        const out = mv.render(renderer, scene, vcam, DR.on('mirrorAir'));
        for (const o of hide) o.visible = true; mesh.visible = true; DR.U.uMirror.value = 0; U.tMirror.value = out.texture;
      };
    }
    return W;
  };

  // ── a waterfall: sheets parametrised by fall time τ (x = v0·τ along dir, y = −g/2·τ²), streaks keyed to departure time ──
  DR.falls = (spec) => {
    const S = { lip: [0, 40, 0], dir: [0, 1], width: 6, drop: 40, speed: 2.4, sheets: 3, seed: 1, ...spec }, T = Math.sqrt((2 * S.drop) / 9.8), nx = 10, ny = 26, P = [], UV = [], A = [], I = [], r = DR.rng(S.seed * 91);
    const dl = Math.hypot(S.dir[0], S.dir[1]) || 1, dx = S.dir[0] / dl, dz = S.dir[1] / dl, sx = -dz, sz = dx;
    for (let s = 0; s < S.sheets; s++) { const off = (s - (S.sheets - 1) / 2) * 0.5, w = S.width * (1 - s * 0.16), v0 = S.speed * (1 + s * 0.22), base = P.length / 3, sd = r() * 10;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const uu = i / nx, tau = (j / ny) * T, side = (uu - 0.5) * w * (1 + 0.25 * (j / ny)), fwd = v0 * tau + off;
        P.push(S.lip[0] + sx * side + dx * fwd, S.lip[1] - 4.9 * tau * tau, S.lip[2] + sz * side + dz * fwd); UV.push(uu, tau); A.push(sd, w, s, T); }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; I.push(a, c, b, b, c, d); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('aF', new THREE.Float32BufferAttribute(A, 4)); g.setIndex(I); g.computeVertexNormals();
    const cut = /* glsl */`
      float tau = vUv0.y, dep = uTime - tau;
      float st = drN4(vec2(vUv0.x * vF.y * 0.22 + vF.x, dep * 0.33)).r * 0.6 + drN4(vec2(vUv0.x * vF.y * 0.71 + vF.x * 2.0, dep * 0.9 + tau * 0.6)).g * 0.4;
      float edge = smoothstep(0.0, 0.16, vUv0.x) * smoothstep(1.0, 0.84, vUv0.x);
      float cover = smoothstep(0.34 + 0.2 * vF.z * 0.3, 0.62, st + 0.22 * edge - 0.18 + 0.25 * smoothstep(vF.w * 0.6, vF.w, tau)) * edge;
      if (cover < 0.05) discard;`;
    const mat = DR.mat({ base: 'lambert', color: '#ffffff', side: THREE.DoubleSide, alphaToCoverage: true, depth: true, vHead: 'attribute vec4 aF; varying vec4 vF;', vBody: 'vF = aF;', fHead: 'varying vec4 vF;', alpha: cut,
      fBody: `diffuseColor.rgb = vec3(0.86, 0.92, 0.95) * (0.72 + 0.4 * st); diffuseColor.a = cover; N = normalize(mix(N, vec3(0.0, 1.0, 0.0), 0.6)); drThrough = vec3(0.5, 0.56, 0.6);` });
    const mesh = DR.shadowed(new THREE.Mesh(g, mat), false, false); mesh.name = 'falls';
    const foot = [S.lip[0] + dx * S.speed * T, S.lip[1] - S.drop, S.lip[2] + dz * S.speed * T];
    return { mesh, foot, T, spec: S };
  };
}
