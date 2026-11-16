// storybook-short · film.js — shots, camera, plates, actors, transitions, the clock, the page contract.
// A film is a list of shots. Each shot has painted plates (backgrounds painted once, at a depth for parallax), a camera
// over time, a cast (actors whose pose is a function of shot time), live effects (birds, bunting, leaves, a dog), and a
// sound spec (ambience + events; footsteps come from the walks by themselves). Every frame is seek(t): nothing carries
// from one frame to the next, so any frame renders alone and the same t is the same picture.
import * as P from './paint.js';
import { Actor, drawActor, gait, JOINTS } from './body.js';
import * as K from './kit.js';

export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** camera keys → cam(t): [[t, { x, y, zoom }], …], eased between keys */
export function camKeys(keys) {
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [ta, A] = keys[i - 1], [tb, B] = keys[i], u = ease((t - ta) / (tb - ta)); return { x: P.lerp(A.x, B.x, u), y: P.lerp(A.y, B.y, u), zoom: P.lerp(A.zoom ?? 1, B.zoom ?? 1, u) }; }
    return keys[keys.length - 1][1];
  };
}

/**
 * walk(actor, o) — a walk across x from o.from to o.to between o.t0 and o.t1 (shot time), on ground y.
 * Distance is eased in and out; the stride and the end are snapped so both feet finish planted. Arms swing against the
 * legs, the pelvis bobs (lowest at each heel strike), the head rides the bob a beat later (motion.js does the rest).
 * Returns pose(t) with .contacts = [{ t, x, foot }] (heel strikes: footsteps for the sound and the checks).
 */
export function walk(actor, o) {
  const a = actor.a, dir = Math.sign(o.to - o.from), stride = o.stride ?? 2.1 * a;
  const n = Math.max(1, Math.round(Math.abs(o.to - o.from) / (stride / 2))), dist = n * stride / 2 + (o.extra ?? 0);
  const yaw = (o.yaw ?? .45) * dir, g = { x0: o.from, dir, stride, lift: o.lift ?? .3 * a, bob: o.bob ?? .1 * a, stance: .62 };
  const easeIn = o.easeIn ?? .18, easeOut = o.easeOut ?? .18;
  const dAt = t => { const u = P.clamp((t - o.t0) / (o.t1 - o.t0)); // trapezoid speed profile: accelerate, cruise, decelerate
    const vmax = 1 / (1 - (easeIn + easeOut) / 2); let s;
    if (u < easeIn) s = vmax * u * u / (2 * easeIn); else if (u > 1 - easeOut) { const w = 1 - u; s = 1 - vmax * w * w / (2 * easeOut); } else s = vmax * (u - easeIn / 2);
    return P.clamp(s) * dist; };
  const pose = t => {
    const d = dAt(t), G = gait(d, g), sw = Math.sin(G.phase * Math.PI * 2) * (o.swing ?? .38) * P.clamp(Math.min(d, dist - d) / (stride * .4));
    return { x: G.pelvisX, y: o.y, yaw, pelvis: [0, g.bob - G.bob], feet: G.feet, arms: { near: { a: -sw, e: .3 }, far: { a: sw, e: .3 } }, lean: .04 * P.clamp(Math.min(d, dist - d) / stride), walking: true, gait: G };
  };
  // heel strikes: when a foot's phase wraps (u crosses 0), sampled finely
  const contacts = []; let prev = null;
  for (let t = o.t0; t <= o.t1 + 1e-6; t += 1 / 240) { const G = gait(dAt(t), g); if (prev) G.feet.forEach((f, i) => { if (f.k !== prev.feet[i].k || (prev.feet[i].u >= .62 && f.u < .62 && f.planted)) contacts.push({ t: +t.toFixed(4), x: f.x, foot: i }); }); prev = G; }
  pose.contacts = contacts.filter((c, i, A) => !A.slice(0, i).some(p => p.foot === c.foot && Math.abs(p.t - c.t) < .1));
  pose.spec = { ...o, dir, yaw, dist, stride };
  return pose;
}
/** stand(actor, o): standing at x on y facing yaw; the weight shifts over planted feet, the arms hang and breathe */
export function stand(actor, o) {
  const a = actor.a, yaw = o.yaw ?? 0, gap = (o.stance ?? .32) * a, sx = Math.sign(Math.sin(yaw)) || 1;
  const feet = o.feet || (yaw ? [{ x: o.x - sx * gap * .5, y: 0, ang: 0 }, { x: o.x + sx * gap * .6, y: 0, ang: 0 }] : [{ x: o.x - gap, y: 0, ang: 0 }, { x: o.x + gap, y: 0, ang: 0 }]);
  const pose = t => ({ x: o.x, y: o.y, yaw, pelvis: [Math.sin(t * .5 + (o.seed || 0)) * .05 * a, Math.sin(t * .9) * .015 * a], feet, arms: o.arms || { near: { a: .05 + Math.sin(t * 1.1) * .02, e: .25 }, far: { a: .05, e: .25 } } });
  pose.spec = { ...o, yaw };
  return pose;
}
/** sit(actor, o): front-on on a seat at seatY above ground y; feet on the floor if they reach, dangling (and swinging) if not */
export function sit(actor, o) {
  const a = actor.a, G = actor.geom(), L = actor.B.legs;
  const pose = t => {
    const pelvisY = -o.seat - G.hipY; // lift the pelvis from standing height to the seat
    const hipY = o.y - o.seat, legLen = (L.thigh * .25 + L.shin) * a, reach = hipY + legLen;
    const dangle = reach < o.y - 2, sw = dangle ? Math.sin(t * 2.2 + (o.seed || 0)) * .25 * a : 0;
    const feet = [-1, 1].map((s, i) => ({ x: o.x + s * .32 * a + (i ? sw : -sw) * .5, y: dangle ? -(o.y - reach) + Math.abs(sw) * .2 : 0, ang: 0 }));
    return { x: o.x, y: o.y, yaw: 0, sit: true, pelvis: [0, pelvisY], feet, arms: o.arms || { near: { a: .1, e: .9 }, far: { a: .1, e: .9 } } };
  };
  pose.spec = { ...o, yaw: 0, sit: true };
  return pose;
}
/**
 * keyed(base, keys) — layer keyed body moves over a base pose: keys [{ t, lean, crouch, arms, pelvis, hop, antic, big, settle }].
 * Values ease between keys (smoothstep). A big move is keyed as: antic (the gather, the other way) → big (the action) →
 * settle (the recovery past rest and back). check.mjs fails a `big` key with no `antic` key in the 0.6 s before it or no
 * `settle` key after it.
 */
export function keyed(base, keys) {
  const fields = ['lean', 'crouch', 'hop'];
  const at = (t, get) => { if (t <= keys[0].t) return get(keys[0]); for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) { const A = keys[i - 1], B = keys[i], u = P.smooth((t - A.t) / (B.t - A.t)); return lerpAny(get(A), get(B), u); } return get(keys[keys.length - 1]); };
  const pose = t => {
    const p = base(t), out = { ...p };
    for (const f of fields) { const v = at(t, k => k[f] ?? 0); if (f === 'lean') out.lean = (p.lean || 0) + v; else if (f === 'crouch') out.pelvis = [(out.pelvis || [0, 0])[0], (out.pelvis || [0, 0])[1] + v]; else if (f === 'hop') out.hopY = v; }
    const arms = at(t, k => k.arms || null); if (arms) out.arms = { near: { ...(p.arms?.near || {}), ...(arms.near || {}) }, far: { ...(p.arms?.far || {}), ...(arms.far || {}) } };
    if (out.hopY) { out.pelvis = [out.pelvis[0], out.pelvis[1] - out.hopY]; out.feet = out.feet.map(f => ({ ...f, y: (f.y || 0) - out.hopY })); }
    return out;
  };
  pose.spec = { ...base.spec, keys };
  pose.contacts = base.contacts;
  return pose;
}
function lerpAny(a, b, u) {
  if (a == null) return b; if (b == null) return a;
  if (typeof a === 'number') return P.lerp(a, b, u);
  const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = lerpAny(a[k] ?? (typeof b[k] === 'number' ? 0 : b[k]), b[k] ?? (typeof a[k] === 'number' ? 0 : a[k]), u); return o;
}
/** run several pose functions in sequence: [[tEnd, fn], …] (the next takes over after tEnd) */
export function seq(parts) { const f = t => { for (const [te, fn] of parts) if (t <= te) return fn(t); return parts[parts.length - 1][1](t); }; f.contacts = parts.flatMap(([, fn]) => fn.contacts || []); f.parts = parts; f.spec = parts[0][1].spec; return f; }

export class Film {
  constructor(o = {}) {
    this.W = o.W || 1920; this.H = o.H || 1080; this.seed = o.seed || 1; this.title = o.title || ''; this.paper = o.paper || '#fbf8f2';
    this.shots = []; this.score = o.score || {}; this.FPS = o.fps || 30; this.fadeOut = o.fadeOut ?? 1.0;
  }
  shot(s) {
    const start = this.shots.reduce((t, x) => t + x.dur, 0);
    const S = { in: 'paper', plates: [], cast: [], fx: [], sound: {}, ...s, start };
    S.cam = typeof S.cam === 'function' ? S.cam : camKeys(S.cam || [[0, { x: this.W / 2, y: this.H / 2, zoom: 1 }]]);
    S.cast = S.cast.map((c, i) => ({ id: `${S.name}:${i}`, ...c }));
    this.shots.push(S); return S;
  }
  get DURATION() { return +this.shots.reduce((t, x) => t + x.dur, 0).toFixed(3); }
  shotAt(t) { for (const s of this.shots) if (t < s.start + s.dur) return s; return this.shots[this.shots.length - 1]; }
  /** footsteps and every sound event, in film time */
  events() {
    const ev = [];
    for (const S of this.shots) {
      for (const c of S.cast) for (const k of (c.pose.contacts || [])) if (k.t >= 0 && k.t < S.dur) ev.push({ t: S.start + k.t, type: c.step || 'step', surface: S.sound.surface || 'path', gain: c.stepGain ?? .7, who: c.actor.name, x: k.x });
      for (const [t, type, opt] of (S.sound.events || [])) ev.push({ t: S.start + t, type, ...(opt || {}) });
    }
    return ev.sort((a, b) => a.t - b.t);
  }
  ambiences() { return this.shots.map(S => ({ t0: S.start, t1: S.start + S.dur, types: S.sound.amb || [], shot: S.name })); }

  // ── drawing ──
  setScale(s) { this.scale = s; }
  plate(S, pl) {
    if (pl._c) return pl._c;
    const bb = pl.bb || [-200, -200, this.W + 200, this.H + 200], r = (this.scale || 1) * (pl.res || S.res || 1.15);
    const c = P.canvas((bb[2] - bb[0]) * r, (bb[3] - bb[1]) * r), g = c.getContext('2d');
    g.setTransform(r, 0, 0, r, -bb[0] * r, -bb[1] * r); pl.paint(g, { W: this.W, H: this.H, K, P, bb });
    pl._c = { c, bb }; return pl._c;
  }
  view(S, t, depth = 1) {
    const cam = S.cam(t), z = Math.pow(cam.zoom ?? 1, depth), cx = P.lerp(this.W / 2, cam.x, depth), cy = P.lerp(this.H / 2, cam.y, depth), sc = this.scale || 1;
    return new DOMMatrix().scale(sc).translate(this.W / 2, this.H / 2).scale(z).translate(-cx, -cy);
  }
  drawShot(ctx, S, t) {
    const sc = this.scale || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = P.css(this.paper); ctx.fillRect(0, 0, this.W * sc, this.H * sc);
    if (!this._paper) this._paper = P.paper(this.W, this.H, this.paper, this.seed, sc); ctx.drawImage(this._paper, 0, 0);
    const layers = [...S.plates.map(p => ({ kind: 'plate', z: p.z ?? (p.front ? 10 : 0), depth: p.depth ?? 1, p })),
      ...S.fx.map(f => ({ kind: 'fx', z: f.z ?? (f.front ? 11 : 1), depth: f.depth ?? 1, f })),
      ...S.cast.map(c => ({ kind: 'actor', z: c.z ?? 5, depth: 1, c }))].sort((a, b) => a.z - b.z);
    const joints = [];
    for (const L of layers) {
      const M = this.view(S, t, L.depth); ctx.setTransform(M);
      if (L.kind === 'plate') { const { c, bb } = this.plate(S, L.p); ctx.drawImage(c, bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }
      else if (L.kind === 'fx') L.f.draw(ctx, t, { W: this.W, H: this.H, K, P, S });
      else { const c = L.c, p = c.pose(t), head = c.motion ? c.actor.motion(c.id, c.motion).pose(Math.max(0, t)) : null; if (head && p.walking) head.rise = (head.rise || 0) + p.pelvis[1] * .2; const j = drawActor(ctx, c.actor, { ...p, head: head || p.head }, S.start + t); joints.push({ c, p, j }); }
    }
    if (S.vignette) { ctx.setTransform(sc, 0, 0, sc, 0, 0); if (!S._vig) { const v = P.canvas(this.W * sc, this.H * sc), vg = v.getContext('2d'); vg.setTransform(sc, 0, 0, sc, 0, 0); K.vignette(vg, this.W, this.H, { paper: this.paper, seed: this.seed + 5, ...(S.vignette === true ? {} : S.vignette) }); S._vig = v; } ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(S._vig, 0, 0); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return joints;
  }
  draw(ctx, T) {
    const sc = this.scale || 1, S = this.shotAt(T), t = T - S.start, i = this.shots.indexOf(S);
    let joints = this.drawShot(ctx, S, t);
    const tr = S.in === 'cut' ? 0 : (S.inDur ?? (S.in === 'dissolve' ? .8 : .7));
    if (t < tr) {
      if (S.in === 'dissolve' && i > 0) { // previous shot fading out over this one
        const prev = this.shots[i - 1]; if (!this._tmp) { this._tmp = P.canvas(this.W * sc, this.H * sc); }
        const g = this._tmp.getContext('2d'); this.drawShot(g, prev, prev.dur + t); ctx.globalAlpha = 1 - P.smooth(t / tr); ctx.drawImage(this._tmp, 0, 0); ctx.globalAlpha = 1;
      } else { ctx.globalAlpha = 1 - P.smooth(t / tr); ctx.drawImage(this._paper, 0, 0); ctx.globalAlpha = 1; }
    }
    const left = this.DURATION - T;
    if (left < this.fadeOut) { ctx.globalAlpha = 1 - left / this.fadeOut; ctx.drawImage(this._paper, 0, 0); ctx.globalAlpha = 1; }
    return { S, t, joints };
  }

  // ── checks ──
  /** body rules over every shot: knees and elbows bend the right way and within range, planted feet stay put and are
   *  reached, walkers face the way they move, the seated stay on their seat */
  rig(step = 1 / 30) {
    const out = [], add = (name, value, limit, ok) => out.push({ name, value: +(+value).toFixed(3), limit, ok });
    const c = P.canvas(8, 8), ctx = c.getContext('2d'); this.scale = this.scale || 1;
    for (const S of this.shots) for (const cm of S.cast) {
      const who = `${S.name} · ${cm.actor.name}`; let kneeBad = 0, kneeMax = 0, reachMax = 0, drift = 0, elbowBad = 0, faceBad = 0; const plant = [new Map(), new Map()];
      for (let t = 0; t < S.dur; t += step) {
        const p = cm.pose(t), head = cm.motion ? cm.actor.motion(cm.id, cm.motion).pose(t) : null;
        const j = drawActor(ctx, cm.actor, { ...p, head }, t), dir = Math.sign(Math.sin(p.yaw || 0));
        for (let i = 0; i < 2; i++) {
          const h = j.hips[i], k = j.knees[i], an = j.ankles[i], v1 = [k[0] - h[0], k[1] - h[1]], v2 = [an[0] - k[0], an[1] - k[1]];
          const cross = v1[0] * v2[1] - v1[1] * v2[0], bend = Math.abs(Math.atan2(cross, v1[0] * v2[0] + v1[1] * v2[1]));
          kneeMax = Math.max(kneeMax, bend);
          if (dir && !p.sit && cross * dir < -1 && bend > .05) kneeBad++;
          const f = p.feet[i], tgt = [f.x, p.y + (f.y || 0) - cm.actor.geom().ankle]; reachMax = Math.max(reachMax, Math.hypot(an[0] - tgt[0], an[1] - tgt[1]));
          if (p.walking && f.planted) { const m = plant[i], key = f.k; if (m.has(key)) drift = Math.max(drift, Math.abs(m.get(key) - an[0])); else m.set(key, an[0]); }
        }
        for (const w of ['near', 'far']) { const e = p.arms?.[w]?.e ?? .25; if (e < JOINTS.elbow[0] - 1e-6 || e > JOINTS.elbow[1]) elbowBad++; }
        if (p.walking && p.gait) { const mv = Math.sign(cm.pose.spec?.dir ?? 0); if (mv && mv !== dir) faceBad++; }
      }
      add(`${who}: knees fold the right way (frames wrong)`, kneeBad, '0', kneeBad === 0);
      add(`${who}: knee bend max (rad)`, kneeMax, `≤ ${JOINTS.knee[1]}`, kneeMax <= JOINTS.knee[1]);
      add(`${who}: feet reached (px off target)`, reachMax, '≤ 1.5', reachMax <= 1.5);
      add(`${who}: planted foot drift (px)`, drift, '≤ 1', drift <= 1);
      add(`${who}: elbows in range (frames out)`, elbowBad, '0', elbowBad === 0);
      add(`${who}: walks the way it faces (frames wrong)`, faceBad, '0', faceBad === 0);
    }
    return out;
  }
  /** motion rules: idles breathe (motion.js), big keyed moves have a gather and a settle, footsteps exist for walks */
  motionReport() {
    const out = [], add = (name, value, limit, ok) => out.push({ name, value: +(+value).toFixed(3), limit, ok });
    for (const S of this.shots) for (const cm of S.cast) {
      const who = `${S.name} · ${cm.actor.name}`;
      if (!cm.motion) add(`${who}: has a head motion (breath, blinks, gaze)`, 0, 'motion: {…}', false);
      else { const M = cm.actor.motion(cm.id, cm.motion), bl = M.blinks.filter(t => t < S.dur); add(`${who}: blinks in the shot`, bl.length, `≥ ${Math.max(1, Math.floor(S.dur / 5))}`, bl.length >= Math.max(1, Math.floor(S.dur / 5))); }
      const keys = cm.pose.spec?.keys || [];
      for (const k of keys.filter(k => k.big)) {
        const antic = keys.some(q => q.antic && q.t < k.t && k.t - q.t <= .6 + 1e-6), settle = keys.some(q => q.settle && q.t > k.t);
        add(`${who}: big move at ${k.t}s has a gather (antic key ≤ 0.6 s before)`, antic ? 1 : 0, '1', antic);
        add(`${who}: big move at ${k.t}s has a recovery (settle key after)`, settle ? 1 : 0, '1', settle);
      }
      if (cm.pose.contacts?.length) { const c = cm.pose.contacts.filter(c => c.t < S.dur), iv = c.slice(1).map((x, i) => x.t - c[i].t); add(`${who}: footsteps (heel strikes)`, c.length, '≥ 2', c.length >= 2); if (iv.length) add(`${who}: steps never closer than 0.18 s`, Math.min(...iv), '≥ 0.18', Math.min(...iv) >= .18); }
    }
    return out;
  }
}

/** cast sheet: each actor turned both ways, the walk cycle both ways, a seated pose, and any keyed big move */
export function castSheet(film, actors, o = {}) {
  const cw = o.cell || 300, ch = Math.round(cw * 1.35), pad = 12, head = 30;
  const rows = [];
  for (const A of actors) {
    rows.push({ title: `${A.name} · turns (yaw −.45 · 0 · +.45) · seated`, cells: [-.45, 0, .45].map(yaw => ({ A, kind: 'stand', yaw, label: `yaw ${yaw}` })).concat([{ A, kind: 'sit', label: 'seated' }]) });
    rows.push({ title: `${A.name} · walk → right (heel strike · passing · heel strike · passing)`, cells: [0, .25, .5, .75].map(ph => ({ A, kind: 'walk', dir: 1, ph, label: `phase ${ph}` })) });
    rows.push({ title: `${A.name} · walk ← left`, cells: [0, .25, .5, .75].map(ph => ({ A, kind: 'walk', dir: -1, ph, label: `phase ${ph}` })) });
  }
  if (o.extra) rows.push(...o.extra);
  const cols = Math.max(...rows.map(r => r.cells.length)), c = P.canvas(cols * (cw + pad) + pad, rows.length * (ch + head + pad) + pad), g = c.getContext('2d');
  g.fillStyle = '#efe9df'; g.fillRect(0, 0, c.width, c.height);
  rows.forEach((row, ri) => {
    const y = pad + ri * (ch + head + pad);
    g.fillStyle = '#3a3036'; g.font = '600 15px system-ui, sans-serif'; g.fillText(row.title, pad, y + 19);
    row.cells.forEach((cl, ci) => {
      const x = pad + ci * (cw + pad), cell = P.canvas(cw, ch), cg = cell.getContext('2d'); cg.drawImage(P.paper(cw, ch, film.paper, 3), 0, 0);
      const A = cl.A, a = A.a, sc = ch / (a * 8.4), gy = ch / sc - a * .6;
      cg.setTransform(sc, 0, 0, sc, 0, 0); cg.strokeStyle = 'rgba(0,0,0,.2)'; cg.beginPath(); cg.moveTo(0, gy); cg.lineTo(cw / sc, gy); cg.stroke();
      const mx = cw / sc / 2;
      let pose;
      if (cl.kind === 'stand') pose = stand(A, { x: mx, y: gy, yaw: cl.yaw })(0);
      else if (cl.kind === 'sit') { K.bench(cg, mx - a * 1.4, gy, a * 2.8, { seed: 3 }); pose = sit(A, { x: mx, y: gy, seat: 70 + a * .1 })(0); pose.pelvis[1] = -(70 + 12) - A.geom().hipY; }
      else if (cl.kind === 'pose') pose = cl.pose(mx, gy);
      else { const S = 2.1 * a, w = walk(A, { from: mx - cl.dir * S * cl.ph - cl.dir * S * 2, to: mx + cl.dir * S * 3, y: gy, t0: 0, t1: 100, easeIn: 0, easeOut: 0 }); const d = S * (2 + cl.ph); const G = gait(d, { x0: mx - cl.dir * d, dir: cl.dir, stride: S, lift: .3 * a, bob: .1 * a }); pose = { ...w(0), x: G.pelvisX, pelvis: [0, .1 * a - G.bob], feet: G.feet, arms: { near: { a: -Math.sin(G.phase * Math.PI * 2) * .38, e: .3 }, far: { a: Math.sin(G.phase * Math.PI * 2) * .38, e: .3 } } }; }
      drawActor(cg, A, { ...pose, head: cl.head || null }, 0);
      g.drawImage(cell, x, y + head); g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(x + .5, y + head + .5, cw - 1, ch - 1);
      g.fillStyle = 'rgba(40,30,36,.8)'; g.font = '13px system-ui, sans-serif'; g.fillText(cl.label, x + 8, y + head + 18);
    });
  });
  return c;
}

/** mount the film on the page (index.html calls this). Query: ?render=1 ?scale=.5 ?t=3 ?cast ?shot=name */
export function mount(film, opt = {}) {
  const q = new URLSearchParams(location.search), scale = +(q.get('scale') || (q.has('render') ? 1 : .5));
  film.setScale(scale); document.title = film.title || document.title;
  const st = document.createElement('style');
  st.textContent = 'html,body{margin:0;height:100%;background:#e9e4da}body{display:grid;place-items:center}canvas{width:min(100vw,calc(100vh*16/9));height:auto;display:block}#play{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font:600 18px system-ui,sans-serif;padding:14px 22px;border-radius:999px;border:0;background:rgba(36,28,34,.82);color:#fff;cursor:pointer}';
  document.head.appendChild(st);
  if (q.has('cast')) { film.setScale(1); const c = castSheet(film, opt.actors || [], { cell: +(q.get('cell') || 260), extra: opt.castExtra }); document.body.appendChild(c); window.__film = { film, cast: c }; window.DURATION = 0; window.seek = () => {}; window.__ready = true; return; }
  const cv = P.canvas(film.W * scale, film.H * scale), ctx = cv.getContext('2d'); document.body.appendChild(cv);
  window.DURATION = film.DURATION; window.FPS = film.FPS;
  window.seek = t => film.draw(ctx, Math.max(0, Math.min(film.DURATION - 1e-3, t)));
  window.__film = { film, rig: () => film.rig(), motion: () => film.motionReport(), events: () => film.events(), shots: film.shots.map(s => ({ name: s.name, start: s.start, dur: s.dur })), score: opt.score };
  if (q.has('render')) { window.seek(+(q.get('t') || 0)); window.__ready = true; return; }
  // live: silent until a click (browsers need a gesture for sound), then the clock follows the audio
  let t0 = performance.now() - (+(q.get('t') || 0)) * 1000, ac = null, acT0 = 0;
  const btn = document.createElement('button'); btn.id = 'play'; btn.textContent = '▶ 소리와 함께 처음부터'; document.body.appendChild(btn);
  btn.onclick = async () => { btn.remove(); if (opt.score) { ac = new AudioContext(); await opt.score.play(ac, film); acT0 = ac.currentTime + .05; } else t0 = performance.now(); };
  const now = () => ac ? ac.currentTime - acT0 : (performance.now() - t0) / 1000;
  const tick = () => { let t = now(); if (t > film.DURATION + 1.5) { if (ac) { ac.close(); ac = null; } t0 = performance.now(); t = 0; } window.seek(t); requestAnimationFrame(tick); };
  window.__ready = true; tick();
}
