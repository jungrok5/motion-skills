// Cheomseongdae, Gyeongju: a structural study from a published survey drawing and reports.
// Units: metres. +X east, +Y north, Z up from the platform's ground line. See evidence.json for
// the status of every value. The separated state is an explanatory diagram, not a mechanism.
// The JSON between the two markers is the single parameter source: make-inset.mjs reads it to
// draw the corner elevation, so the model and the diagram cannot drift apart.
// @params-start
const P = {
  "platform": {"lowerSide": 5.35, "lowerH": 0.22, "upperSide": 5.15, "upperH": 0.24},
  "body": {
    "courses": 27, "height": 7.69, "wall": 0.30,
    "profile": [[0, 2.49], [0.85, 2.43], [1.82, 2.30], [2.78, 2.12], [3.75, 1.86], [4.72, 1.63], [5.69, 1.50], [6.66, 1.44], [7.69, 1.44]],
    "fillTopCourse": 12, "stones": 362
  },
  "window": {"fromCourse": 13, "toCourse": 15, "width": 0.95},
  "cross": {"levels": [[19, 20], [25, 26]], "offset": 0.55, "width": 0.28, "protrude": 0.06},
  "frame": {"span": 3.07, "beam": 0.26, "tiers": 2, "tierH": 0.29, "rotateDeg": 4.5}
};
// @params-end

const H = P.body.height / P.body.courses;            // one course
const Z0 = P.platform.lowerH + P.platform.upperH;     // body starts on the platform
const zc = k => Z0 + k * H;                           // top of course k (k = 0: platform top)
const prof = smoothProfile(P.body.profile, 10).map(([z, r, s]) => [z + Z0, r, s]);
const R = z => profileRadius(prof, z);
const slope = z => (R(z + .01) - R(z - .01)) / .02;
// Profile slice with exact end points, so each section's silhouette stops at its own joints.
function slice(z0, z1) {
  const inner = prof.filter(p => p[0] > z0 + 1e-6 && p[0] < z1 - 1e-6);
  return [[z0, R(z0), slope(z0)], ...inner, [z1, R(z1), slope(z1)]];
}
const surface = (z, r, a) => [r * Math.cos(a), r * Math.sin(a), z];

// Hollow (or filled) course band. The south window is a real gap with straight jambs at
// x = ±width/2, an inner face and a wall thickness; it is never painted on.
function band(n, k0, k1, {fill = false, window = null} = {}) {
  const z0 = zc(k0), z1 = zc(k1), t = P.body.wall, rows = [];
  const steps = Math.max(2, (k1 - k0) * 2);
  for (let i = 0; i <= steps; i++) rows.push(z0 + (z1 - z0) * i / steps);
  const half = window ? window.width / 2 : 0;
  // Angle measured from due south (-Y), so the gap is centred on phi = 0.
  const at = (phi, z, r) => [r * Math.sin(phi), -r * Math.cos(phi), z];
  const gap = (z, r) => window ? Math.asin(Math.min(1, half / r)) : 0;
  const N = 96;
  for (const inner of [false, true]) for (let i = 1; i < rows.length; i++) {
    const za = rows[i - 1], zb = rows[i], ra = R(za) - (inner ? t : 0), rb = R(zb) - (inner ? t : 0);
    const ga = gap(za, ra), gb = gap(zb, rb);
    for (let j = 0; j < N; j++) {
      const u = j / N, v = (j + 1) / N;
      const pa = ga + (2 * Math.PI - 2 * ga) * u, pb = ga + (2 * Math.PI - 2 * ga) * v;
      const qa = gb + (2 * Math.PI - 2 * gb) * u, qb = gb + (2 * Math.PI - 2 * gb) * v;
      poly(n, [at(pa, za, ra), at(pb, za, ra), at(qb, zb, rb), at(qa, zb, rb)], inner ? C.interior : shade(C.stone, pa), false);
    }
  }
  // Course joints: real boundaries, drawn on the outer and inner faces.
  for (let k = k0; k <= k1; k++) {
    const z = zc(k), ro = R(z), ri = ro - t, go = gap(z, ro), gi = gap(z, ri);
    for (let j = 0; j < N; j++) {
      const u = j / N, v = (j + 1) / N;
      line(n, at(go + (2 * Math.PI - 2 * go) * u, z, ro), at(go + (2 * Math.PI - 2 * go) * v, z, ro), C.ink);
      if (k === k0 || k === k1) line(n, at(gi + (2 * Math.PI - 2 * gi) * u, z, ri), at(gi + (2 * Math.PI - 2 * gi) * v, z, ri), C.soft);
    }
  }
  // Staggered vertical joints, so the eye reads stone courses. Positions are illustrative;
  // the count per course follows the circumference and sums near the reported stone total.
  for (let k = k0; k < k1; k++) {
    const z = zc(k), zt = zc(k + 1), r = R(z + H / 2), count = jointCount(r);
    for (let j = 0; j < count; j++) {
      const phi = (j + (k % 2) * .5) / count * 2 * Math.PI;
      if (window && Math.abs(r * Math.sin(phi)) < half + .12 && Math.cos(phi) > 0) continue;
      line(n, at(phi, z, R(z)), at(phi, zt, R(zt)), C.soft);
    }
  }
  // Bed faces: annuli at both ends (each section is lifted separately when separated).
  for (const z of [z0, z1]) {
    const ro = R(z), ri = ro - t, g = gap(z, ri), go = gap(z, ro);
    for (let j = 0; j < N; j++) {
      const u = j / N, v = (j + 1) / N, s = 2 * Math.PI;
      poly(n, [at(go + (s - 2 * go) * u, z, ro), at(go + (s - 2 * go) * v, z, ro), at(g + (s - 2 * g) * v, z, ri), at(g + (s - 2 * g) * u, z, ri)], C.wall, false);
    }
  }
  if (window) {
    // Jambs: vertical planes from the outer to the inner face; sill and head close the gap.
    for (const side of [-1, 1]) for (let i = 1; i < rows.length; i++) {
      const za = rows[i - 1], zb = rows[i], y = (z, r) => -Math.sqrt(Math.max(0, r * r - half * half));
      poly(n, [[side * half, y(za, R(za)), za], [side * half, y(zb, R(zb)), zb], [side * half, y(zb, R(zb) - t), zb], [side * half, y(za, R(za) - t), za]], C.stone, false);
    }
    for (const side of [-1, 1]) {
      const y = (z, r) => -Math.sqrt(Math.max(0, r * r - half * half));
      line(n, [side * half, y(z0, R(z0)), z0], [side * half, y(z1, R(z1)), z1], C.ink);
      line(n, [side * half, y(z0, R(z0) - t), z0], [side * half, y(z1, R(z1) - t), z1], C.soft);
    }
  }
  if (fill) {
    // Earth fill level with the top of the band (reported up to course 12).
    const ri = R(z1) - t, disc = [];
    for (let j = 0; j < N; j++) disc.push(surface(z1 - .002, ri, j * 2 * Math.PI / N));
    poly(n, disc, C.soil, false);
    const bottom = [];
    for (let j = N - 1; j >= 0; j--) bottom.push(surface(z0, R(z0), j * 2 * Math.PI / N));
    poly(n, bottom, scale(C.stone, .91), false);
  }
  n.contours.push({profile: slice(z0, z1), surface: (z, r, a) => surface(z, r, a),
    opening: window ? (a, z) => {const r = R(z); return Math.sin(a) < 0 && Math.abs(r * Math.cos(a)) < half;} : undefined});
}
function jointCount(r) {
  // Mean stone length chosen so 27 courses hold about P.body.stones stones in total.
  let sum = 0; for (let k = 0; k < P.body.courses; k++) sum += 2 * Math.PI * R(zc(k) + H / 2);
  return Math.max(6, Math.round(2 * Math.PI * r / (sum / P.body.stones)));
}

// A pair of long stones on one course, passing through the wall with short protruding ends.
function crossPair(n, k, alongX) {
  const z = zc(k - 1), h = H * .96, w = P.cross.width, o = P.cross.offset;
  const L = R(z + h / 2) + P.cross.protrude;
  for (const s of [-1, 1]) {
    if (alongX) box(n, -L, s * o - w / 2, z + .005, 2 * L, w, h, C.wood);
    else box(n, s * o - w / 2, -L, z + .005, w, 2 * L, h, C.wood);
  }
}

// Top frame: two tiers, each a 井 of four long stones; ends cross and project at the corners.
function frame(n) {
  const f = P.frame, half = f.span / 2, b = f.beam, a = half - b / 2;
  for (let tier = 0; tier < f.tiers; tier++) {
    const z = zc(P.body.courses) + tier * f.tierH, h = f.tierH - .01;
    for (const s of [-1, 1]) {
      box(n, -half, s * a - b / 2, z, 2 * half, b, h, tier ? C.roof : C.woodLight);
      box(n, s * a - b / 2, -half, z + .004, b, 2 * half, h - .008, tier ? C.roof : C.woodLight);
    }
  }
}

const root = node('ground line', null);
// Ground circle: a thin drafting line, not a filled disc that could read as masonry.
for (let j = 0; j < 72; j++) {const a = j * Math.PI / 36, b = (j + 1) * Math.PI / 36, r = 4.4; line(root, [r * Math.cos(a), r * Math.sin(a), 0], [r * Math.cos(b), r * Math.sin(b), 0], C.soft);}
const platform = node('06 platform', root);
{const p = P.platform, l = p.lowerSide / 2, u = p.upperSide / 2;
 box(platform, -l, -l, 0, p.lowerSide, p.lowerSide, p.lowerH, C.stone);
 box(platform, -u, -u, p.lowerH, p.upperSide, p.upperSide, p.upperH, C.wall);}

function pose(t) {
  return {lower: .32 * ease(t, .36, 1), win: .5 * ease(t, .27, .91), mid: .55 * ease(t, .18, .82),
    upper: .55 * ease(t, .09, .73), frame: .85 * ease(t, 0, .64)};
}
const lower = node('05 courses 1-12, earth fill', platform, p => tr(0, 0, p.lower));
band(lower, 0, P.body.fillTopCourse, {fill: true});
const win = node('04 courses 13-15, south window', lower, p => tr(0, 0, p.win));
band(win, P.window.fromCourse - 1, P.window.toCourse, {window: P.window});
const mid = node('03 courses 16-22', win, p => tr(0, 0, p.mid));
band(mid, P.window.toCourse, 22);
crossPair(mid, P.cross.levels[0][0], true); crossPair(mid, P.cross.levels[0][1], false);
const upper = node('02 courses 23-27', mid, p => tr(0, 0, p.upper));
band(upper, 22, P.body.courses);
crossPair(upper, P.cross.levels[1][0], true); crossPair(upper, P.cross.levels[1][1], false);
const top = node('01 top frame', upper, p => mul(tr(0, 0, p.frame), rz(P.frame.rotateDeg * Math.PI / 180)));
frame(top);

// Anchors sit on visible faces of the labelled part: a projecting stone end, the frame
// corner, the window head, the fill band's wall, the platform's upper step.
const crossEnd = (k, alongX) => ({cameraRight}) => {
  const z = zc(k - 1) + H / 2, L = R(z) + P.cross.protrude * .6;
  return alongX ? [Math.sign(cameraRight[0] || 1) * L, P.cross.offset, z] : [P.cross.offset, Math.sign(cameraRight[1] || 1) * L, z];
};
const parts = [
  {node: top, anchor: ({cameraRight}) => {const h = P.frame.span / 2; return [Math.sign(cameraRight[0] || 1) * h, Math.sign(cameraRight[1] || 1) * h, zc(27) + P.frame.tierH * 1.5];},
   label: '01  정자석 · 2단', text: 'TOP FRAME · 2 TIERS'},
  {node: upper, anchor: crossEnd(26, false), label: '02  장대석 · 25–26단', text: 'CROSS STONES · 25–26'},
  {node: mid, anchor: crossEnd(20, false), label: '03  장대석 · 19–20단', text: 'CROSS STONES · 19–20'},
  {node: win, anchor: () => [P.window.width / 2, -R(zc(15)) + .02, zc(15) - .05], label: '04  남쪽 창 · 13–15단', text: 'SOUTH WINDOW · 13–15'},
  {node: lower, anchor: ({cameraRight}) => {const z = zc(7), r = R(z), a = Math.atan2(cameraRight[1], cameraRight[0]); return [r * Math.cos(a), r * Math.sin(a), z];},
   label: '05  흙 채움 · 1–12단', text: 'EARTH-FILLED · 1–12'},
  {node: platform, anchor: ({cameraRight}) => {const u = P.platform.upperSide / 2; return [Math.sign(cameraRight[0] || 1) * u, Math.sign(cameraRight[1] || 1) * u * .2, P.platform.lowerH + P.platform.upperH * .5];},
   label: '06  2단 기단', text: 'TWO-TIER PLATFORM'}
];

return {
  root, parts, pose, pivotXY: [0, 0],
  guides: () => [[lower, platform, Z0], [win, lower, zc(12)], [mid, win, zc(15)], [upper, mid, zc(22)], [top, upper, zc(27)]]
    .map(([n, parent, z]) => ({from: point(parent.world, [0, 0, z]), to: point(n.world, [0, 0, z])})),
  dimension: {from: [0, 0, 0], to: [0, 0, zc(27) + P.frame.tiers * P.frame.tierH], offset: 4.7,
    label: '높이 · 약 8.8 m (2009 실측 보도)', en: 'HEIGHT ≈ 8.8 m (2009 SURVEY, REPORTED)'},
  inspect: {P, platform, lower, win, mid, upper, top, R, zc}
};
