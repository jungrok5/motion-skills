// sight-gag-short · castsheet.js — the cast sheet: every person of a film's CAST in the views and poses the body rules
// ask for (CONTRIBUTING.md, "몸이 물리적으로 가능한지"): front, 3/4 and side both ways (right AND left), back, a walk,
// a run, an action pose — each with a different face — plus every hand shape of the gadget. One 1 s shot per person
// and one per row of glove shapes, so `render.mjs cast.html --sheet <shots>` puts one still of each on a contact sheet
// and check.mjs runs the joint-limit rules on all of it. Score the stills before writing any gag: does every view read
// as one body (head, chest, hips, toes the same way; the near shoulder/hip on the far side from the face; coat fronts,
// buttons and toe caps at the front)? "Did the neck turn or the body?" is a fail.
import * as THREE from "three";
import { person, P, walk, run, over } from "./figure.js";
import { gadget, SHAPES } from "./gadget.js";

/** the nine cells of a person's row: [label, yaw°, pose, face] */
export const VIEWS = [
  ["FRONT", 0, P.stand, "neutral"],
  ["3/4 RIGHT", 40, P.hips, "happy"],
  ["SIDE RIGHT", 90, P.point, "shock"],
  ["BACK", 180, P.stand, "neutral"],
  ["SIDE LEFT", -90, over(P.stand, { armL: [80, 8, 0, 4], handL: 0.85 }), "annoyed"],
  ["3/4 LEFT", -40, P.shrug, "sheepish"],
  ["WALK", 90, walk(0.12, { strut: 0.4 }), "deadpan"],
  ["RUN", 90, run(0.12), "scared"],
  ["ACTION", 25, P.flail, "yell"],
];

/**
 * castSheet(F, CAST, { glove, sign }) — build the sheet's set and shots on a Film (call before F.start()).
 *   CAST: { name: person() options }  glove: gadget() options (without from)  → the number of shots
 */
export function castSheet(F, CAST, o = {}) {
  const S = F.S, names = Object.keys(CAST), gap = 1.8, per = 5, gGap = 1.65, gPer = 6;
  const shapes = o.glove ? Object.keys(SHAPES) : [];
  // one "bay" (a stretch of plain wall) per shot: two per person (views 1–5, 6–9), then rows of hand shapes
  const bays = [];
  for (const n of names) for (let k = 0; k < VIEWS.length; k += per) bays.push({ n, cells: VIEWS.slice(k, k + per).map((v, j) => ({ v, j: k + j })) });
  for (let k = 0; k < shapes.length; k += gPer) bays.push({ hands: shapes.slice(k, k + gPer), r: k / gPer });
  const bayW = 12, total = bays.length;
  S.street({ from: -10, to: bayW * total + 10, far: false });
  for (let i = 0; i < total; i++) S.building({ x: i * bayW - 1, w: bayW, floors: 1, ground: 4.6, wall: "plaster", plaster: "#eee6d8", seed: 3 + i, cornice: false, patches: 0 });
  const label = (text, at, w = 1.4, h = 0.32, bg = "#2b3a5c") => S.sign({ at, text, w, h, fg: "#f6f1e6", bg, border: 3 });
  // the camera sees exactly the bay's cells (fov 33, 16:9)
  const cam = (s, cx, width, y = 1.2, ly = 1.3) => { width = Math.max(width, 9.6); const d = (width / 2) / (Math.tan((16.5 * Math.PI) / 180) * (16 / 9)); s.cam([cx, y, 1.7 + d], [cx, ly, 1.4], 33); };
  bays.forEach((b, i) => {
    const x0 = i * bayW + 0.5;
    if (b.n) {
      const n = b.n, cx = x0 + ((b.cells.length - 1) * gap) / 2;
      label(`${n.toUpperCase()} ${b.cells[0].j ? "2/2" : "1/2"}`, [cx, 3.05, 0.02], 2.6, 0.45, "#c8322b");
      const figs = b.cells.map(({ v: [lab], j }, k) => { label(lab, [x0 + k * gap, 2.45, 0.02]); return person(F, { ...CAST[n], name: `${n} · ${lab}`, seed: (CAST[n].seed || 1) + j }); });
      F.shot({ id: `${n}-${b.cells[0].j ? 2 : 1}`, kind: "sheet", dur: 1, fn: (t, s) => {
        cam(s, cx, b.cells.length * gap + 0.6);
        b.cells.forEach(({ v: [, yaw, pose, face] }, k) => figs[k].place([x0 + k * gap, null, 1.7], yaw).pose(pose).face(face, { t: 0.5 }));
      } });
    } else {
      const cx = x0 + ((b.hands.length - 1) * gGap) / 2;
      label(`HAND SHAPES ${b.r + 1}/${Math.ceil(shapes.length / gPer)}`, [cx, 3.05, 0.02], 2.8, 0.45, "#c8322b");
      const gl = b.hands.map((sh, k) => { label(sh.toUpperCase(), [x0 + k * gGap, 0.32, 0.02], 1.3, 0.28); return gadget(F, { ...o.glove, size: (o.glove.size || 1.15) * 0.85 }); });
      F.shot({ id: `hands-${b.r + 1}`, kind: "sheet", dur: 1, fn: (t, s) => {
        cam(s, cx, b.hands.length * gGap + 0.4, 1.3, 1.35);
        // palm three-quarters to camera, fingers up — how most gags first show a shape
        b.hands.forEach((sh, k) => gl[k].set({ at: [x0 + k * gGap, 0.85, 1.4], aim: [0, 1, 0.1], palm: [0.45, 0, 1], shape: sh, from: false }));
      } });
    }
  });
  return total;
}
