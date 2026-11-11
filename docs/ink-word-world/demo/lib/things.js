// Things every world can use as they are: the turns of time and weather the form always has (night and day, the
// clearing wash, rain, wind). They are written the way a world writes its own things — copy one to see the shape:
// a function that takes (w, x, y), calls w.add({ … update(w, dt), draw(w, ink, light) }) and returns it.
import { clamp, hash, INK, rgba, stroke } from './brush.js';
import { Drift } from './life.js';

/** 밤 — the sheet turns over from where the word was written. An invisible thing stays as long as it is night. */
export function night(w, x, y) { w.setNight(true, x, y); return w.add({ tags: ['night'], update(w) { if (!w.night) w.dismiss(this); } }); }
/** 낮 — and turns back */
export function day(w, x, y) { for (const t of w.all('night')) w.dismiss(t); w.setNight(false, x, y); return w.add({ tags: ['day'], update(w) { if (this.age > 3) w.dismiss(this); } }); }
/** 비움 — everything leaves and water crosses the sheet */
export function clear(w) { w.clear(); return null; }

/**
 * 비 — rain for `seconds`: slanted strokes that fall with the wind, wash the paper where they land and ring the surface.
 * o: { seconds, rate (drops per second), floor(x, w) → y where a drop lands (default: anywhere on the lower sheet),
 *      ring: draw rings where drops land, wash: how much each drop thins the ink }
 */
export function rain(w, x, y, o = {}) {
  const old = w.first('rain'); if (old) { old.until = old.age + (o.seconds || 16); old.rate = Math.min(260, old.rate * 1.5); return null; }
  const drops = new Drift(500), rings = [], r = w.rand.fork(31);
  w.cue('rain', { on: true }); w.quiet = true;
  return w.add({
    tags: ['rain', 'weather'], z: 60, until: o.seconds || 16, rate: o.rate || 110, grow: 1.5, fade: 2.5, drops, rings,
    update(w, dt) {
      const live = this.leaving == null && this.age < this.until; if (!live && this.leaving == null) w.dismiss(this);
      if (live) { this._n = (this._n || 0) + this.rate * dt; while (this._n >= 1) { this._n--; const px = r() * (w.W + 300) - 150; drops.spawn(px, -30, 0, 900 + r() * 260, 3, .7 + r() * .6, { land: o.floor ? o.floor(px, w) : w.H * (.35 + r() * .62) }); } }
      drops.update(w, dt, { wind: 1.1, floor: p => p.y >= p.data.land, onLand: (p, w) => {
        if (r() < .3) { rings.push({ x: p.x, y: p.data.land, age: 0 }); w.push(p.x, p.data.land, (r() - .5) * 90, 40, 26); }
        if (r() < (o.wash ?? .1)) w.water(p.x, p.data.land, 42, .16); if (r() < .05) w.cue('drop', { x: p.x, f: 700 + r() * 900, v: .035 }, .08);
      } });
      for (let i = rings.length - 1; i >= 0; i--) { rings[i].age += dt; if (rings[i].age > 1.1) rings.splice(i, 1); }
    },
    leave(w) { w.cue('rain', { on: false }); w.quiet = false; },
    draw(w, ink) {
      ink.strokeStyle = rgba(INK.black, .34); ink.lineCap = 'round';
      drops.each(p => { ink.lineWidth = 1.5 * p.size; ink.beginPath(); ink.moveTo(p.x, p.y); ink.lineTo(p.x - p.vx * .028, p.y - p.vy * .028); ink.stroke(); });
      if (o.ring !== false) for (const g of rings) { const k = g.age / 1.1; ink.strokeStyle = rgba(INK.black, .3 * (1 - k)); ink.lineWidth = 1.4; ink.beginPath(); ink.ellipse(g.x, g.y, 8 + k * 30, (8 + k * 30) * (o.flat ?? .32), 0, 0, 6.283); ink.stroke(); }
    }
  });
}

/**
 * 바람 — wind for `seconds`, blowing away from the side the word was written on: it sets w.wind (things lean, sails
 * fill, rain slants), drags the wet ink across the sheet and draws dry wisps.
 * o: { seconds, speed (units/s), band: [y0, y1] fractions of the sheet it blows through }
 */
export function wind(w, x, y, o = {}) {
  const dir = o.dir || (x < w.W / 2 ? 1 : -1), speed = o.speed || 420, band = o.band || [.05, .95], r = w.rand.fork(53);
  const old = w.first('wind'); if (old) w.dismiss(old);
  const wisps = []; w.cue('wind', { on: true });
  return w.add({
    tags: ['wind', 'weather'], z: 55, grow: 1.2, fade: 2.5, dir,
    update(w, dt) {
      const live = this.leaving == null && this.age < (o.seconds || 13); if (!live && this.leaving == null) w.dismiss(this);
      const k = live ? clamp(this.age / 1.5) : clamp(1 - (this.leaving || 0) / 2.5), gust = .7 + .5 * Math.sin(w.t * 1.3) * Math.sin(w.t * .37 + 1);
      w.wind.x = dir * speed * k * gust; w.wind.y = Math.sin(w.t * .6) * 30 * k;
      if (live && w.frame % 3 === 0) { const py = (band[0] + r() * (band[1] - band[0])) * w.H, px = r() * w.W; w.push(px, py, w.wind.x * 1.1, w.wind.y, 120); }
      if (live && r() < dt * 5) wisps.push({ x: dir > 0 ? -80 : w.W + 80, y: (band[0] + r() * (band[1] - band[0])) * w.H, age: 0, len: 140 + r() * 220, s: r() * 99, sp: .8 + r() * .6 });
      for (let i = wisps.length - 1; i >= 0; i--) { const s = wisps[i]; s.age += dt; s.x += w.wind.x * 1.6 * s.sp * dt; s.y += Math.sin(s.age * 2 + s.s) * 14 * dt; if (s.age > 5 || s.x < -400 || s.x > w.W + 400) wisps.splice(i, 1); }
    },
    leave(w) { w.cue('wind', { on: false }); },
    gone(w) { w.wind.x = w.wind.y = 0; },
    draw(w, ink) {
      for (const s of wisps) { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([s.x - dir * u * s.len, s.y + Math.sin(u * 5 + s.s + s.age * 2) * 9 + (hash(s.s | 0, i) - .5) * 3]); }
        stroke(ink, pts, { w: 5, alpha: .2 * clamp(s.age * 2) * clamp(5 - s.age), dry: .7, seed: s.s, taper: [.6, .05] }); }
    }
  });
}
