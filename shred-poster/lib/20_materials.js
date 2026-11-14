// shred-poster · 20_materials — paper, steel, plastic, concrete and the light around them.
//   SP.paperMat(texture, {paper, rough, inkRough, trans, back, bump})   uncoated stock: matte paper, satin ink,
//       a fibre normal, light glowing through from behind (thin paper), the print showing faintly on the back
//   SP.floorMat({lo, hi, scale, relief})   concrete / board under the sheet      SP.steelMat() · SP.plasticMat()
//   SP.envMap(renderer, {top, horizon, ground, boxes})   a soft studio around everything (reflections in the steel)
//   SP.grid(nx, ny)  a strip mesh whose vertices a shot rewrites every (sub)frame
{
  const canvasTex = (cv, srgb = true, repeat = null) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = SP.soft ? 4 : 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.needsUpdate = true; return t;
  };
  SP.canvasTex = canvasTex;

  // fibre: a tiling normal map of short random fibres plus fine tooth
  let fibreTex = null;
  SP.fibreNormal = () => {
    if (fibreTex) return fibreTex;
    const n = 256, h = new Float32Array(n * n), r = SP.rng(41);
    for (let i = 0; i < h.length; i++) h[i] = r() * 0.35;
    for (let f = 0; f < 900; f++) { // fibres: short soft lines, wrapped so the tile repeats without a seam
      const x0 = r() * n, y0 = r() * n, a = r() * Math.PI, len = 6 + r() * 22, s = r() * 0.8 + 0.2;
      for (let t = 0; t < len; t++) { const x = (Math.floor(x0 + Math.cos(a) * t) % n + n) % n, y = (Math.floor(y0 + Math.sin(a) * t) % n + n) % n; h[y * n + x] += s; }
    }
    const cv = document.createElement('canvas'); cv.width = cv.height = n; const ctx = cv.getContext('2d'), img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = h[y * n + (x + 1) % n] - h[y * n + (x + n - 1) % n], dy = h[((y + 1) % n) * n + x] - h[((y + n - 1) % n) * n + x];
      const v = new THREE.Vector3(-dx, -dy, 2.2).normalize(), i = (y * n + x) * 4;
      img.data[i] = (v.x * 0.5 + 0.5) * 255; img.data[i + 1] = (v.y * 0.5 + 0.5) * 255; img.data[i + 2] = (v.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return (fibreTex = canvasTex(cv, false, [1, 1]));
  };

  SP.paperMat = (map, o = {}) => {
    const fib = SP.fibreNormal().clone(); fib.needsUpdate = true; fib.repeat.set(o.fibreRepeat?.[0] ?? 9, o.fibreRepeat?.[1] ?? 13.5);
    const m = new THREE.MeshStandardMaterial({ map, roughness: o.rough ?? 0.62, metalness: 0, side: THREE.DoubleSide, normalMap: fib, normalScale: new THREE.Vector2(o.bump ?? 0.18, o.bump ?? 0.18) });
    const U = { uPaper: { value: SP.color(o.paper || '#eeece7') }, uTrans: { value: o.trans ?? 0.24 }, uBack: { value: o.back ?? 0.16 }, uInkRough: { value: o.inkRough ?? 0.44 }, uPaperRough: { value: o.rough ?? 0.62 }, uDark: { value: o.dark ? 1 : 0 } };
    m.userData.U = U;
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, U);
      s.fragmentShader = 'uniform vec3 uPaper; uniform float uTrans, uBack, uInkRough, uPaperRough, uDark;\nfloat spInk = 0.0;\n' + s.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
          spInk = clamp(length(diffuseColor.rgb - uPaper) * 2.5, 0.0, 1.0);
          if (!gl_FrontFacing) diffuseColor.rgb = mix(uPaper * 0.97, diffuseColor.rgb, uBack);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(uPaperRough, uInkRough, spInk * (1.0 - uDark * 0.6));`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          #if NUM_DIR_LIGHTS > 0
          for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            float bl = max(0.0, -dot(normal, directionalLights[i].direction));
            reflectedLight.directDiffuse += uTrans * bl * directionalLights[i].color * BRDF_Lambert(material.diffuseColor);
          }
          #endif`);
    };
    m.customProgramCacheKey = () => 'sp-paper';
    return m;
  };

  SP.floorMat = (o = {}) => {
    const n = 512, cv = document.createElement('canvas'); cv.width = cv.height = n; const ctx = cv.getContext('2d'), img = ctx.createImageData(n, n), r = SP.rng(o.seed || 9);
    const lo = o.lo ?? 0.2, hi = o.hi ?? 0.36, tint = o.tint ? SP.hex(o.tint) : [1, 1, 1];
    const g1 = SP.field(r, n, n, 20, 20, true), g2 = SP.field(r, n, n, 3, 3, true), g3 = SP.field(r, n, n, 0, 0, true);   // wrapped: the tile repeats without a seam
    for (let i = 0; i < n * n; i++) {
      let v = SP.lerp(lo, hi, SP.sat(0.5 + 0.2 * g1[i] + 0.08 * g2[i] * (o.relief ?? 0.5) + 0.04 * g3[i] * (o.relief ?? 0.5)));
      if (r() < 0.0015 * (o.relief ?? 0.5)) v *= 0.7;   // pits
      const c = Math.pow(v, 1 / 2.2) * 255; img.data[i * 4] = c * tint[0]; img.data[i * 4 + 1] = c * tint[1]; img.data[i * 4 + 2] = c * tint[2]; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const map = canvasTex(cv, true, [o.scale ?? 4, o.scale ?? 4]);
    return new THREE.MeshStandardMaterial({ map, roughness: o.rough ?? 0.92, metalness: 0 });
  };
  SP.steelMat = (o = {}) => new THREE.MeshStandardMaterial({ color: SP.color(o.color || '#9a9ca0'), metalness: 1, roughness: o.rough ?? 0.26, envMapIntensity: o.env ?? 1 });
  SP.plasticMat = (o = {}) => new THREE.MeshStandardMaterial({ color: SP.color(o.color || '#1a1a1c'), metalness: 0, roughness: o.rough ?? 0.42 });

  // a soft studio: a vertical gradient with a few soft boxes, prefiltered for image-based light
  SP.envMap = (renderer, o = {}) => {
    const w = 512, h = 256, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.top || '#f4f1ea'); g.addColorStop(0.48, o.horizon || '#a9a7a2'); g.addColorStop(0.52, o.horizon || '#a9a7a2'); g.addColorStop(1, o.ground || '#3a3936');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (const b of o.boxes || [[0.15, 0.18, 0.12, 0.1, 1], [0.62, 0.25, 0.2, 0.06, 0.8], [0.9, 0.4, 0.05, 0.08, 0.5]]) {
      const [x, y, bw, bh, a] = b; const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, Math.max(bw * w, bh * h));
      rg.addColorStop(0, `rgba(255,253,248,${a})`); rg.addColorStop(1, 'rgba(255,253,248,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    }
    const tex = new THREE.CanvasTexture(cv); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(tex); pm.dispose(); tex.dispose();
    return rt.texture;
  };

  // a strip mesh: (nx+1)×(ny+1) vertices, x along the strip (columns), y across it (rows)
  SP.grid = (nx, ny) => {
    const geo = new THREE.BufferGeometry(), N = (nx + 1) * (ny + 1);
    const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
    return { geo, pos, uv, nx, ny, N, commit() { geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); } };
  };
}
