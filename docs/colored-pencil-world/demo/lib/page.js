// colored-pencil-world · page.js — what turns the drawn scene into a drawing on a sheet of a sketchbook.
//
// Adapted from "Coloured pencil" (src/page.js, MIT © 2026 Patch — LICENSE-coloured-pencil). Added here: the paper's
// colour, how wide the unfinished margin is and how hard the outline is pressed are options; a handwritten caption is
// written on the sheet in graphite; `raw` shows the drawing with nothing laid over it (for check.mjs).
//
// The scene is drawn as what each thing's pencils leave of the paper's white, with its depth. Then:
//   1. the outline: wherever one thing ends against another, or a surface turns a sharp corner, a soft dark line, as
//      from a pencil held lightly — found from depth alone, by asking of each point whether its neighbours lie on one
//      flat with it; pressed unevenly and fainter far off;
//   2. the page: a warm white sheet with a tooth that shows through the colour as flecks of white; toward the edges
//      the drawing is not finished and gives way to bare paper, along a torn, uneven line;
//   3. the caption, in pencil handwriting, in a corner.
import * as THREE from 'three';

const QUAD = /* glsl */ `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** o: { samples, paper: '#f9f3e9', margin: 1 (how far the unfinished edge reaches in), line: 1 (outline pressure), flecks: 1,
 *  caption: { text, font, size (px at 1080), at: 'right' | 'left', colour } } */
export function createPage(renderer, o = {}) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const scene = new THREE.WebGLRenderTarget(size.x, size.y, { samples: o.samples ?? 4, type: THREE.HalfFloatType, depthBuffer: true, generateMipmaps: false });
  scene.depthTexture = new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType);
  const paper = new THREE.Color(o.paper || '#f9f3e9').convertLinearToSRGB(); // the sheet is laid on after the drawing is turned to screen colour
  const cap = document.createElement('canvas'), capTex = new THREE.CanvasTexture(cap);
  cap.width = cap.height = 4; capTex.minFilter = capTex.magFilter = THREE.LinearFilter; capTex.generateMipmaps = false;
  const print = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    uniforms: {
      tDrawn: { value: scene.texture }, tDepth: { value: scene.depthTexture }, tCap: { value: capTex }, uSize: { value: size.clone() }, uInverse: { value: new THREE.Matrix4() },
      uPixel: { value: 1 }, uScale: { value: 1 }, uNear: { value: 0.3 }, uPaper: { value: new THREE.Vector3(paper.r, paper.g, paper.b) },
      uMargin: { value: o.margin ?? 1 }, uLine: { value: o.line ?? 1 }, uFlecks: { value: o.flecks ?? 1 }, uRaw: { value: 0 }, uCapOn: { value: 0 },
    },
    vertexShader: QUAD,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tDrawn; uniform sampler2D tDepth; uniform sampler2D tCap; uniform vec2 uSize; uniform mat4 uInverse;
      uniform float uPixel; uniform float uScale; uniform float uNear; uniform vec3 uPaper; uniform float uMargin; uniform float uLine; uniform float uFlecks; uniform float uRaw; uniform float uCapOn;
      in vec2 vUv;
      layout(location = 0) out vec4 outC;
      vec3 seen(vec2 uv) { vec4 p = uInverse * vec4(uv * 2.0 - 1.0, texture(tDepth, uv).r * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float soft(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        if (uRaw > 0.5) { outC = vec4(texture(tDrawn, vUv).rgb, 1.0); return; }
        vec2 px = gl_FragCoord.xy, t = 1.0 / uSize;
        float tooth = soft(px * 0.55 / uScale) * 0.6 + soft(px * 1.3 / uScale + 9.0) * 0.4;
        // --- the outline
        float w = uScale * 0.85;
        vec3 P = seen(vUv), L = seen(vUv - vec2(t.x * w, 0.0)), R = seen(vUv + vec2(t.x * w, 0.0)), D = seen(vUv - vec2(0.0, t.y * w)), U = seen(vUv + vec2(0.0, t.y * w));
        vec3 ax = abs(R.z - P.z) < abs(P.z - L.z) ? R - P : P - L, ay = abs(U.z - P.z) < abs(P.z - D.z) ? U - P : P - D;
        vec3 N = normalize(cross(ax, ay));
        float off = max(max(abs(dot(N, L - P)), abs(dot(N, R - P))), max(abs(dot(N, D - P)), abs(dot(N, U - P)))) / (min(min(-L.z, -R.z), min(-D.z, min(-U.z, -P.z))) * uPixel * w);
        float rough = 5.0 * -P.z / (uNear * 16777216.0 * uPixel);
        float line = smoothstep(0.34 + rough, 0.7 + rough * 1.5, off) * (0.45 + 0.55 * soft(px * 0.035 / uScale + 4.0)) * (0.6 + 0.5 * tooth) * mix(1.0, 0.45, smoothstep(40.0, 400.0, -P.z));
        vec3 left = texture(tDrawn, vUv).rgb * mix(vec3(1.0), vec3(0.2, 0.17, 0.22), clamp(line * 0.8 * uLine, 0.0, 1.0));
        // --- the page
        vec3 col = pow(clamp(left, 0.0, 1.0), vec3(1.0 / 2.2));
        float bare = smoothstep(0.62, 0.9, 1.0 - tooth) * (0.25 + 0.5 * dot(col, vec3(0.333))) * uFlecks;
        col = mix(col, vec3(1.0), bare);
        vec2 q = min(vUv, 1.0 - vUv) * vec2(uSize.x / uSize.y, 1.0);
        float edge = min(q.x, q.y) + 0.035 * (soft(px * 0.012 / uScale) - 0.5) + 0.02 * (soft(px * 0.05 / uScale) - 0.5);
        col = mix(vec3(1.0), col, smoothstep(0.012 * uMargin, 0.075 * uMargin, edge));
        // --- the caption, in graphite, broken by the tooth like any pencil
        if (uCapOn > 0.5) { float a = texture(tCap, vUv).a * (0.55 + 0.6 * tooth); col = mix(col, vec3(0.28, 0.26, 0.3), clamp(a, 0.0, 0.85)); }
        vec3 sheet = uPaper * (0.97 + 0.045 * soft(px * 0.3 / uScale)) * (1.0 - 0.035 * soft(px * 0.006 / uScale + 3.0));
        outC = vec4(col * sheet, 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), print);
  quad.frustumCulled = false;
  const stage = new THREE.Scene(); stage.add(quad);
  const flat = new THREE.Camera();
  let caption = o.caption || null;
  const writeCaption = () => {
    if (!caption || !caption.text) { print.uniforms.uCapOn.value = 0; return; }
    cap.width = size.x; cap.height = size.y;
    const g = cap.getContext('2d'), k = size.y / 1080, fs = (caption.size || 34) * k;
    g.clearRect(0, 0, cap.width, cap.height);
    g.font = `${fs}px ${caption.font || '"PencilHand", "Caveat", cursive'}`;
    g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
    const m = 0.045 * size.y + 0.035 * size.y, y = size.y - m * 0.62;
    if (caption.at === 'left') { g.textAlign = 'left'; g.fillText(caption.text, m * 1.15, y); } else { g.textAlign = 'right'; g.fillText(caption.text, size.x - m * 1.15, y); }
    capTex.needsUpdate = true; print.uniforms.uCapOn.value = 1;
  };
  writeCaption();
  return {
    depth: scene.depthTexture, uniforms: print.uniforms,
    setCaption(c) { caption = c; writeCaption(); },
    resize() {
      renderer.getDrawingBufferSize(size);
      scene.setSize(size.x, size.y);
      print.uniforms.uSize.value.copy(size);
      writeCaption();
    },
    render(world, camera) {
      print.uniforms.uInverse.value.copy(camera.projectionMatrixInverse);
      print.uniforms.uPixel.value = 2 / (camera.projectionMatrix.elements[5] * size.y);
      print.uniforms.uScale.value = size.y / 1080;
      print.uniforms.uNear.value = camera.near;
      renderer.setRenderTarget(scene);
      renderer.clear();
      renderer.render(world, camera);
      renderer.setRenderTarget(null);
      renderer.render(stage, flat);
    },
  };
}
