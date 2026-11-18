// mods/body.js — THE STRUCTURE (designed per topic; this file is only a skeleton that runs).
// Walker-local frame: origin = centre of the BASE of the structure, +X = the way it walks, +Y up.
// The box CFG.BODY_LEN × BODY_DEPTH × BODY_H is what the engine frames shots, fog glows and checks against;
// the legs' hips sit at (LEG_X[k], HIP_Y, ±HIP_Z) — give them something to bolt onto (a belly, a belt, a frame).
// Rules (references/MODULES.md): update(t) is a pure function of t; no lights except <= 6 warm PointLights;
// noise in mesh-local space (the shared weathering does this); warm windows are amber, never white.
import * as THREE from 'three';
import { Kit, windowColour, lagSwing } from '../engine/kit.js';

export async function create(ctx) {
  const { walker, CFG, gait } = ctx;
  const K = new Kit(ctx, 0xb0d7);
  const L2 = CFG.BODY_LEN / 2, D2 = CFG.BODY_DEPTH / 2, H = CFG.BODY_H;
  const shell = K.batch(), steel = K.batch(), emis = K.batch();

  // 1. the mass: replace with the topic's own form (a hull, a nave, a tank farm, a tower...)
  shell.box(-L2, L2, 0, H, -D2, D2, K.lin(0x8d8f92), K.lin(0x5d5f62));
  // 2. what makes it read at its size: openings, floors, ribs, railings, pipes — repeated with variation
  for (let y = 2; y < H - 1; y += 3) for (let x = -L2 + 2; x < L2 - 1; x += 3.2) for (const s of [1, -1]) {
    const c = windowColour(K.R, 0.5), z = s * (D2 + 0.02);
    emis.quad([x - 0.6, y, z], [x + 0.6, y, z], [x + 0.6, y + 1.3, z], [x - 0.6, y + 1.3, z], [0, 0, s], c);
  }
  // 3. the belly + where the hips bolt on
  steel.box(-L2 + 1, L2 - 1, CFG.HIP_Y - 2, 0, -D2 + 0.5, D2 - 0.5, K.lin(0x3c4046));
  for (const hx of CFG.LEG_X) for (const s of [1, -1]) steel.box(hx - 3, hx + 3, CFG.HIP_Y - 2.6, CFG.HIP_Y + 2.6, s > 0 ? D2 - 0.5 : -CFG.HIP_Z + 0.6, s > 0 ? CFG.HIP_Z - 0.6 : -D2 + 0.5, K.lin(0x4a3a2c));

  K.mesh(shell, K.mat('concrete'), { name: 'body:shell' });
  K.mesh(steel, K.mat('steel'), { name: 'body:steel' });
  K.mesh(emis, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }), { shadow: false, name: 'body:lights' });

  // 4. something loose that follows through (a cable, a flag, a chain): hangs on a pivot, swings late
  const piv = new THREE.Group(); piv.position.set(L2 - 2, 0, D2 + 0.3); walker.add(piv);
  const cable = K.batch(); cable.catenary([0, 0, 0], [0.5, -0.2, 0.2], 4, 0.06, K.lin(0x111111), 10);
  K.mesh(cable, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), { parent: piv, shadow: false, name: 'body:cable' });

  const pose = {};
  return {
    update(t) {
      gait.bodyPose(t, pose);
      piv.rotation.x = -pose.roll + lagSwing(gait, t, { T: 2.2, zeta: 0.15, gain: 1.2 });
    },
  };
}
