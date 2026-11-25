// __TITLE__ — a nested-world-loop film. This skeleton shows the CONTRACT, not a look: every world, portal, key, light
// and colour below is a placeholder to be replaced with what BRIEF.md designs (references/PORTALS.md, references/LOOK.md).
import { film, THREE } from 'nwl/nwl.js';
import * as M from 'nwl/make.js';

// world A — the outermost room the loop starts in (units: say what they are, e.g. cm)
function worldA(ctx) {
  const { root, renderer } = ctx;
  ctx.scene.environment = M.envMap(renderer, { base: '#141110', panels: [{ color: '#ffd2a0', intensity: 5, pos: [0, 4.9, 0], size: [3, 3] }] });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(380, 4, 380), M.mat.paint('#5a4a3a')); floor.position.y = -2; root.add(floor);
  // the object that holds world B (a jar, a frame, a window, a box, a book …) — here a glass jar at (0, 20, 0)
  const jar = new THREE.Mesh(M.lathe([[0, 0], [10, 0], [10, 30], [6, 34], [6, 38]], 48), M.mat.glass()); root.add(jar);
  M.lamp(root, { pos: [60, 120, 40], intensity: 6000, shadow: 1024, near: 5, far: 600 });
  root.add(new THREE.HemisphereLight('#8090b0', '#302418', .4));
  M.shadows(root); jar.castShadow = false;
}
// world B — what is inside (units: e.g. m). Its own light, its own weather; its last view holds world A again.
function worldB(ctx) {
  const { root } = ctx;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 64), M.mat.paint('#33402a')); ground.rotation.x = -Math.PI / 2; root.add(ground);
  const house = new THREE.Mesh(M.rbox(6, 4, 5, .2), M.mat.paint('#d8ccb8')); house.position.y = 2; root.add(house);
  const sun = new THREE.DirectionalLight('#ffd0a0', 2); sun.position.set(-20, 30, 10); root.add(sun, sun.target);
  root.add(new THREE.HemisphereLight('#8aa0d0', '#2a2418', .5));
  ctx.tick(t => { house.rotation.y = .05 * Math.sin(ctx.angle(t, 1)); });   // anything that moves makes whole cycles per loop
}

film({
  title: '__TITLE__', size: [1920, 1080], fps: 30, duration: 20, outer: 2,   // outer: how many enclosing worlds to draw (2 when you can see out past the first one)
  look: { exposure: .4 },
  worlds: [
    { id: 'a', background: '#0b0a09', build: worldA,
      // world B's origin on the jar's floor (y 1), 1 m of B = 0.5 cm of A; B fits the jar: ground r 18 m = 9 cm
      portal: { at: [0, 1, 0], scale: .005, bounds: [-13, 0, -13, 13, 58, 13] },   // inside the jar's hollow (r 10 cm = 20 m)
      keys: [
        { pos: [0, 120, 160], look: [0, 20, 0], fov: 40, bokeh: 4 },
        { pos: [8, 44, 30], look: [0, 6, 0], fov: 38, bokeh: 6 },
        { pos: [0, 22, 4], look: [0, 2, 0], fov: 38, bokeh: 6 },
      ] },
    { id: 'b', background: '#0b0a09', build: worldB,
      // world A again, through the house's door (front face z 2.5): A (cm) at 1:1 inside the house, origin at its centre
      portal: { at: [0, 0, 0], scale: .01, aperture: { center: [0, 1.2, 2.5], normal: [0, 0, 1], w: 1, h: 2.2 }, bounds: [-200, -2, -200, 200, 300, 200] },
      keys: [
        { pos: [0, 10, 12], look: [0, 2, 0], fov: 38, bokeh: 4 },
        { pos: [3, 2, 8], look: [0, 1.4, 2.6], fov: 40, bokeh: 5 },
      ] },
  ],
});
