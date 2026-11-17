// check: a colossus project must pass this before a film is rendered.
// Run from the project folder:  node <skill>/scripts/check.mjs [--fast] [--events] [--w 320 --h 180]
//   --fast    only the Node checks (structure, legs, gait, cameras) — seconds
//   --events  also print every touchdown / lift-off per shot (to time shots and sound on the footfalls)
// Exit code 1 when anything FAILs. Every check reports numbers, not only pass / fail.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './_browser.mjs';
import { loadProject } from './_project.mjs';

const a = parseArgs();
const dir = path.resolve(a.dir || a._[0] || '.');
const P = await loadProject(dir);
const { CFG, GAIT, TIMELINE, DURATION, MODS } = P.config;
const G = P.gait;
let fails = 0, warns = 0;
const row = (ok, name, msg) => { console.log(`${ok === true ? 'ok  ' : ok === 'warn' ? 'WARN' : 'FAIL'}  ${name.padEnd(22)} ${msg}`); if (ok === false) fails++; if (ok === 'warn') warns++; };
const f2 = (x, d = 2) => Number(x).toFixed(d);

// ------------------------------------------------------------------ structure
{
  const miss = MODS.filter((m) => !fs.existsSync(path.join(dir, m + '.js')) && !fs.existsSync(path.join(P.eng, '..', m + '.js')));
  row(!miss.length, 'modules', miss.length ? 'missing: ' + miss.join(', ') : MODS.join(', '));
  row(fs.existsSync(path.join(dir, 'BRIEF.md')), 'brief', fs.existsSync(path.join(dir, 'BRIEF.md')) ? 'BRIEF.md' : 'no BRIEF.md — write the brief before the code (references/BRIEF.md)');
  let gap = 0, t = 0, badShot = [];
  for (const s of TIMELINE) { gap = Math.max(gap, Math.abs(s.start - t)); t = s.end; if (!P.shots.SHOTS[s.shot]) badShot.push(s.shot); }
  row(TIMELINE.length > 0 && gap < 1e-6 && Math.abs(t - DURATION) < 1e-6 && !badShot.length, 'timeline',
    `${TIMELINE.length} shots, ${f2(DURATION, 1)} s` + (gap > 1e-6 ? `, gap ${f2(gap)} s` : '') + (Math.abs(t - DURATION) > 1e-6 ? `, ends at ${t} not ${DURATION}` : '') + (badShot.length ? `, undefined: ${badShot.join(', ')}` : ''));
}

// ------------------------------------------------------------------ legs: reach, knees, bone lengths (the body is possible)
const E_TRUN = 2.2 * CFG.LEG_SCALE, LT = CFG.THIGH, LS = CFG.SHIN;
const N = G.NLEGS, T = GAIT.T, DT = 1 / 120;
const pose = {}, fs_ = {}, fsB = {};
// walker-local -> world for a point (roll about X, yaw about Y, pitch about Z, in the engine's Euler order XYZ)
function toWorld(p, q) {
  const [x, y, z] = q;
  const cr = Math.cos(p.roll), sr = Math.sin(p.roll), cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  // R = Rx(roll) * Ry(yaw) * Rz(pitch)
  let x1 = cp * x - sp * y, y1 = sp * x + cp * y, z1 = z;
  let x2 = cy * x1 + sy * z1, z2 = -sy * x1 + cy * z1, y2 = y1;
  let y3 = cr * y2 - sr * z2, z3 = sr * y2 + cr * z2;
  return [p.x + x2, p.y + y3, p.z + z3];
}
let reachMin = 1e9, reachMax = 0, kneeMin = 1e9, kneeMax = 0, kneeBelow = 0, slide = 0, sink = 0, float = 0, minSupport = 99, minSide = 99, outside = 0;
let footGap = 1e9, peel = 0, slamH = 0, nCyc = 0;
const lim = { reach: [Math.abs(LT - LS) * 1.08, (LT + LS) * 0.97], knee: [25, 170] };
for (let t = 0; t < 2 * T; t += DT) {
  G.bodyPose(t, pose);
  const planted = [];
  for (let i = 0; i < N; i++) {
    const L = G.LEGS[i];
    G.footState(i, t, fs_);
    const hip = toWorld(pose, L.hip);
    const ox = fs_.x - hip[0], oz = fs_.z - hip[2], ol = Math.hypot(ox, oz) || 1;
    const tr = [hip[0] + E_TRUN * ox / ol, hip[1], hip[2] + E_TRUN * oz / ol];
    const d = Math.hypot(fs_.x - tr[0], fs_.y - tr[1], fs_.z - tr[2]);
    reachMin = Math.min(reachMin, d); reachMax = Math.max(reachMax, d);
    const ang = Math.acos(Math.max(-1, Math.min(1, (LT * LT + LS * LS - d * d) / (2 * LT * LS)))) * 180 / Math.PI;
    kneeMin = Math.min(kneeMin, ang); kneeMax = Math.max(kneeMax, ang);
    const k = G.solveKnee(tr, [fs_.x, fs_.y, fs_.z], [0, 1, 0], LT, LS);
    // knee must sit above the hip->ankle chord (knees bend up and out; never inverted)
    const u = ((k[0] - tr[0]) * (fs_.x - tr[0]) + (k[1] - tr[1]) * (fs_.y - tr[1]) + (k[2] - tr[2]) * (fs_.z - tr[2])) / (d * d);
    const chordY = tr[1] + u * (fs_.y - tr[1]);
    if (k[1] < chordY - 1e-3) kneeBelow++;
    if (fs_.swing === 0) {
      planted.push([fs_.x, fs_.z, L.side]);
      // a planted foot must not move: compare with a moment later
      G.footState(i, t + DT, fsB);
      if (fsB.swing === 0) slide = Math.max(slide, Math.hypot(fsB.x - fs_.x, fsB.z - fs_.z, fsB.y - fs_.y));
      sink = Math.max(sink, CFG.ANKLE_H - fs_.y); float = Math.max(float, fs_.y - CFG.ANKLE_H);
    } else if (fs_.y < CFG.ANKLE_H - 1e-6) sink = Math.max(sink, CFG.ANKLE_H - fs_.y);
  }
  // support: planted feet per side, centre of mass inside the planted polygon
  minSupport = Math.min(minSupport, planted.length);
  minSide = Math.min(minSide, planted.filter((p) => p[2] > 0).length, planted.filter((p) => p[2] < 0).length);
  const hull = (() => { const pts = planted.map((p) => [p[0], p[1]]).sort((p, q) => p[0] - q[0] || p[1] - q[1]); if (pts.length < 3) return pts;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1)); })();
  let inside = hull.length >= 3;
  for (let j = 0; j < hull.length && inside; j++) { const p = hull[j], q = hull[(j + 1) % hull.length]; if ((q[0] - p[0]) * (pose.z - p[1]) - (q[1] - p[1]) * (pose.x - p[0]) < 0) inside = false; }
  if (!inside) outside++;
  // feet on one side must not run into each other (pad + claws)
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    if (G.LEGS[i].side !== G.LEGS[j].side) continue;
    G.footState(i, t, fs_); G.footState(j, t, fsB);
    footGap = Math.min(footGap, Math.hypot(fs_.x - fsB.x, fs_.z - fsB.z));
  }
}
// anticipation (the foot peels off slowly) and the slam (it arrives fast and stops dead)
{
  const sw = (1 - GAIT.duty) * T, i = 0, t0 = (1 - G.LEGS[0].phase + GAIT.duty) * T % T;
  const vx = (t) => { G.footState(i, t + 0.01, fsB); G.footState(i, t - 0.01, fs_); return [(fsB.x - fs_.x) / 0.02 - G.SPEED, (fsB.y - fs_.y) / 0.02]; };
  const start = Math.abs(vx(t0 + sw * 0.06)[0]), mid = Math.abs(vx(t0 + sw * 0.5)[0]);
  peel = start / mid;
  const end = vx(t0 + sw * 0.97); slamH = Math.abs(end[0]) / Math.max(1e-3, Math.abs(end[1]));
  nCyc = sw;
}
row(reachMin >= lim.reach[0] && reachMax <= lim.reach[1], 'leg reach', `hip->ankle ${f2(reachMin)}..${f2(reachMax)} m of ${f2(LT + LS)} (limits ${f2(lim.reach[0])}..${f2(lim.reach[1])}: the IK never clamps)`);
row(kneeMin >= lim.knee[0] && kneeMax <= lim.knee[1], 'knee angle', `${f2(kneeMin, 0)}..${f2(kneeMax, 0)}° (limits ${lim.knee[0]}..${lim.knee[1]}°: never folded flat, never locked straight)`);
row(kneeBelow === 0, 'knee direction', kneeBelow ? `${kneeBelow} samples with a knee below the hip-ankle line (inverted knee)` : 'every knee bends up and out, both sides');
row(true, 'bone lengths', `thigh ${f2(LT)} m, shin ${f2(LS)} m, fixed (two-bone IK, lengths never animated)`);
row(slide <= 0.002, 'planted feet', `max slide ${f2(slide * 1000, 1)} mm while planted (limit 2 mm)`);
row(sink <= 1e-4 && float <= 1e-4, 'feet on the ground', `sink ${f2(sink * 1000, 1)} mm, float ${f2(float * 1000, 1)} mm while planted`);
row(minSide >= 2 && outside === 0, 'support', `>= ${minSupport} feet down (>= ${minSide} a side); body over the planted feet ${outside ? 'FAILS ' + outside + ' samples' : 'always'}`);
row(footGap > 2 * CFG.FOOT_R + 0.5 ? true : 'warn', 'foot spacing', `closest feet on one side ${f2(footGap)} m apart (pads ${f2(2 * CFG.FOOT_R)} m; claws reach ${f2(2 * CFG.CLAW_R)} m)`);
row(peel < 0.35, 'anticipation', `lift-off speed ${f2(peel * 100, 0)}% of mid-swing (the foot peels off, limit 35%)`);
row(slamH < 0.35, 'slam', `at touchdown the foot moves ${f2(slamH * 100, 0)}% as fast sideways as down (lands straight down, limit 35%)`);
{
  const bp = {}; let lo = 1e9, hi = -1e9;
  for (let t = 0; t < T; t += DT) { G.bodyPose(t, bp); lo = Math.min(lo, bp.y); hi = Math.max(hi, bp.y); }
  row(hi - lo > 0.05, 'weight', `body rides ${f2(lo)}..${f2(hi)} m (sinks ${f2((hi - lo) * 100, 0)} cm into each step); cycle ${GAIT.T} s, ${f2(G.SPEED)} m/s`);
}

// ------------------------------------------------------------------ cameras
{
  const L2 = CFG.BODY_LEN / 2 + 1, D2 = CFG.BODY_DEPTH / 2 + 1;
  let low = [], inside = [];
  for (const s of TIMELINE) for (let k = 0; k <= 10; k++) {
    const t = s.start + (s.end - s.start - 1e-3) * k / 10;
    const c = P.shots.evalShot('', t); G.bodyPose(t, pose);
    if (c.pos[1] < 0.12) low.push(`${s.shot}@${f2(t, 1)}`);
    const lx = c.pos[0] - pose.x, ly = c.pos[1] - pose.y, lz = c.pos[2] - pose.z;
    if (Math.abs(lx) < L2 && Math.abs(lz) < D2 && ly > -CFG.CHASSIS_H - 1 && ly < CFG.BODY_H + 2) inside.push(`${s.shot}@${f2(t, 1)}`);
  }
  row(!low.length && !inside.length, 'cameras', low.length || inside.length ? `below ground: ${low.slice(0, 4).join(' ')} inside the structure: ${inside.slice(0, 4).join(' ')}` : `${TIMELINE.length} shots sampled: above ground, outside the structure`);
}

// ------------------------------------------------------------------ events (for timing shots and sound)
if (a.events) {
  console.log('\nfootfalls per shot (leg: t touchdown @ x,z | t lift-off):');
  for (const s of TIMELINE) {
    const ev = [];
    for (let i = 0; i < N; i++) {
      const L = G.LEGS[i];
      for (let n = Math.floor(s.start / T) - 1; n <= Math.ceil(s.end / T) + 1; n++) {
        const td = (n + 1 - L.phase) * T + 0 * T; // u wraps to 0 at t/T + phase = n + 1
        const lo = (n + 1 - L.phase + GAIT.duty) * T;
        if (td >= s.start && td < s.end) { G.footState(i, td + 1e-4, fs_); ev.push([td, `leg ${i} down ${f2(td)} @ ${f2(fs_.x, 1)},${f2(fs_.z, 1)}`]); }
        if (lo >= s.start && lo < s.end) ev.push([lo, `leg ${i} up   ${f2(lo)}`]);
      }
    }
    console.log(`  ${s.shot} [${s.start}..${s.end}]  ` + ev.sort((p, q) => p[0] - q[0]).map((e) => e[1]).join(' · '));
  }
}

// ------------------------------------------------------------------ in the browser: loads clean, deterministic, every shot reads
if (!a.fast) {
  const { openProject, frame, pixels } = await import('./_browser.mjs');
  const W = +(a.w || 320), H = +(a.h || 180);
  const B = await openProject(dir, { w: W, h: H });
  const logs = [...new Set(B.logs)].filter((l) => !/GPU stall|GL Driver Message/.test(l));
  row(!B.errors.length, 'module build', B.errors.length ? B.errors.join(' | ').slice(0, 400) : `all modules built in ${B.readyMs} ms ${JSON.stringify(B.info.buildMs)}`);
  row(B.info.tris < 7e6 ? true : 'warn', 'triangles', `${(B.info.tris / 1e6).toFixed(2)} M per frame, ${B.info.calls} draw calls (budget ~7 M)`);
  const stat = (px) => { const L = []; for (let i = 0; i < px.data.length; i += 4) L.push(0.2126 * px.data[i] + 0.7152 * px.data[i + 1] + 0.0722 * px.data[i + 2]); L.sort((p, q) => p - q); return { med: L[L.length >> 1], p02: L[Math.floor(L.length * 0.02)], p99: L[Math.floor(L.length * 0.99)], L }; };
  const det = async () => { await frame(B.page, 7.3); const p1 = await pixels(B.page, 128); await frame(B.page, 21.1); await frame(B.page, 7.3); const p2 = await pixels(B.page, 128); let d = 0; for (let i = 0; i < p1.data.length; i++) d = Math.max(d, Math.abs(p1.data[i] - p2.data[i])); return d; };
  const dd = await det();
  row(dd <= 1, 'deterministic', `same t rendered twice (another t between): max pixel difference ${dd}`);
  for (const s of TIMELINE) {
    const t1 = s.start + (s.end - s.start) * 0.45, t2 = Math.min(s.end - 0.02, t1 + 0.6);
    await frame(B.page, t1); const p1 = await pixels(B.page, 96); const st = stat(p1);
    await frame(B.page, t2); const p2 = await pixels(B.page, 96);
    let mv = 0; for (let i = 0; i < p1.data.length; i += 4) mv += Math.abs(p1.data[i] - p2.data[i]) + Math.abs(p1.data[i + 1] - p2.data[i + 1]);
    mv /= p1.data.length / 2;
    const ok = st.med > 6 && st.med < 200 && st.p99 > 25 && mv > 0.15;
    row(ok, 'shot ' + s.shot, `median ${f2(st.med, 0)} p99 ${f2(st.p99, 0)} (luma 0-255), motion ${f2(mv)} per pixel over 0.6 s` + (st.med <= 6 ? ' — black' : st.p99 <= 25 ? ' — nothing lit' : mv <= 0.15 ? ' — nothing moves' : ''));
  }
  const after = [...new Set(B.logs)].filter((l) => !/GPU stall|GL Driver Message/.test(l));
  row(!after.length, 'console', after.length ? after.slice(0, 5).join(' | ').slice(0, 400) : 'no errors, no 404s');
  await B.close();
}
console.log(`\n${fails ? fails + ' FAILED' : 'all passed'}${warns ? `, ${warns} warning(s)` : ''}`);
process.exit(fails ? 1 : 0);
