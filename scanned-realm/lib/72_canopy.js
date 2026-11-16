// scanned-realm · 72_canopy — how much of the sky a place on the ground can see through the trees.  A woodland floor
// is lit by a fraction of the sky; without this every forest is as bright as a lawn and sun shafts have nothing dark
// to stand against.  Built once from the planted trees: a 1 m map of crown cover, blurred.
{
  const T = THREE;
  const C = (LR.canopy = { size: 512, half: 256, shade: 0.56, mist: 1 });
  C.build = () => {
    const n = C.size, half = C.half, d = new Float32Array(n * n), F = LR.flora, s = n / (2 * half);
    if (F && F.inst) for (const i of F.inst) {
      const def = F.defs[i.sp]; if (!def || def.kind === 'bush') continue;
      const H = ((def.height[0] + def.height[1]) / 2) * i.scale, r = Math.max(1.6, (def.crown && def.crown.r ? def.crown.r : 0.3) * H * 1.25), w = def.kind === 'conifer' ? 0.8 : 1;
      const cx = (i.x + half) * s, cz = (i.z + half) * s, rp = r * s, x0 = Math.max(0, Math.floor(cx - rp)), x1 = Math.min(n - 1, Math.ceil(cx + rp)), z0 = Math.max(0, Math.floor(cz - rp)), z1 = Math.min(n - 1, Math.ceil(cz + rp));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const k = LR.sm(rp, rp * 0.35, Math.hypot(x - cx, z - cz)) * w; if (k > 0) { const j = z * n + x; d[j] = 1 - (1 - d[j]) * (1 - k * 0.85); } }
    }
    // soften: two box passes
    const t = new Float32Array(n * n); for (let pass = 0; pass < 2; pass++) { for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) { let a = 0, c = 0; for (let k = -2; k <= 2; k++) { const xx = x + k; if (xx >= 0 && xx < n) { a += d[z * n + xx]; c++; } } t[z * n + x] = a / c; } for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) { let a = 0, c = 0; for (let k = -2; k <= 2; k++) { const zz = z + k; if (zz >= 0 && zz < n) { a += t[zz * n + x]; c++; } } d[z * n + x] = a / c; } }
    const u8 = new Uint8Array(n * n); for (let i = 0; i < n * n; i++) u8[i] = Math.round(LR.sat(d[i]) * 255);
    const tex = new T.DataTexture(u8, n, n, T.RedFormat, T.UnsignedByteType); tex.minFilter = tex.magFilter = T.LinearFilter; tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.needsUpdate = true;
    const P = LR.render.U; P.tCanopy.value = tex; P.uCanopyRect.value.set(-half, -half, 1 / (2 * half), 1 / (2 * half)); P.uCanopy.value.set(C.shade, C.mist * 0.008, 0, 0); C.data = d;
  };
  // crown cover at a place, 0..1 (for sounds, planting, checks)
  C.at = (x, z) => { if (!C.data) return 0; const n = C.size, i = LR.clamp(Math.round((x + C.half) * n / (2 * C.half)), 0, n - 1), j = LR.clamp(Math.round((z + C.half) * n / (2 * C.half)), 0, n - 1); return C.data[j * n + i]; };
  LR.on('init', () => C.build(), 20);
}
