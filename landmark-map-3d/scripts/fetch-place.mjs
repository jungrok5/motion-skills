// landmark-map-3d · fetch-place.mjs — download the real neighbourhood around a place from OpenStreetMap and turn it into
// place.json: building footprints with heights, roads with widths and names, water, parks, plazas, rivers, rail, every
// mapped tree and street lamp, crossings and named places (POIs) — all in metres around the centre (x east, z south).
//   node <skill>/scripts/fetch-place.mjs --q "Eiffel Tower, Paris"            (geocoded with Nominatim)
//   node <skill>/scripts/fetch-place.mjs --at 48.85826,2.29450 --size 1600x1900 --out place.json
// Options: --size WxH metres (default 1400x1600; the film's camera must stay inside it) · --out place.json
//          --cache data/ (the raw .osm is kept there; a second run converts from it with no network) · --simplify 0.35
// Data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). place.json is a derived
// database: keep the credit line it carries, show "© OpenStreetMap contributors" in the film's end card (the engine does).
// Network: tries the Overpass API, then the OSM editing API (/api/0.6/map, split into tiles when one call is too big).
// Be polite: one place at a time, a few calls, a User-Agent that names the project.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const UA = 'motion-skills/landmark-map-3d (https://github.com/jungrok5/motion-skills)';
const out = resolve(opt('out', 'place.json')), cache = resolve(opt('cache', join(dirname(out), 'data')));
const [W, H] = opt('size', '1400x1600').split('x').map(Number);
const SIMP = +opt('simplify', .35);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, init = {}) {
  for (let k = 0; ; k++) {
    try {
      const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) } });
      if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
      return r;
    } catch (e) { if (k === 3) throw e; await sleep(2000 * 2 ** k); }
  }
}

// ------------------------------------------------------------------ where
let lat0, lon0, label = opt('name', '');
if (opt('at')) [lat0, lon0] = opt('at').split(',').map(Number);
else if (opt('q')) {
  const r = await get('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(opt('q')));
  const j = await r.json(); if (!j.length) { console.error('Nominatim found nothing for', opt('q')); process.exit(1); }
  lat0 = +j[0].lat; lon0 = +j[0].lon; label = label || j[0].display_name.split(',')[0];
  console.log(`geocoded "${opt('q')}" → ${lat0.toFixed(5)}, ${lon0.toFixed(5)}  (${j[0].display_name})`);
} else { console.error('usage: fetch-place.mjs --q "Eiffel Tower, Paris" | --at lat,lon  [--size 1400x1600] [--out place.json]'); process.exit(1); }

const R = Math.PI / 180, phi = lat0 * R;
const mLat = 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);
const mLon = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi);
const P = (lat, lon) => [(lon - lon0) * mLon, -(lat - lat0) * mLat];
const M = 60;                                       // fetch a margin so roads and blocks run off the edge, not stop at it
const bb = { s: lat0 - (H / 2 + M) / mLat, n: lat0 + (H / 2 + M) / mLat, w: lon0 - (W / 2 + M) / mLon, e: lon0 + (W / 2 + M) / mLon };

// ------------------------------------------------------------------ download (cached)
mkdirSync(cache, { recursive: true });
const key = `${lat0.toFixed(5)}_${lon0.toFixed(5)}_${W}x${H}`;
const raw = join(cache, `osm-${key}.osm`);
let xmls = [];
if (existsSync(raw)) { xmls = [readFileSync(raw, 'utf8')]; console.log('using cached', raw); }
else {
  const q = `[timeout:90];(nwr(${bb.s},${bb.w},${bb.n},${bb.e}););(._;>;);out meta;`;
  try {
    const r = await get('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    xmls = [await r.text()]; console.log('downloaded from Overpass');
  } catch (e) {
    console.log(`Overpass unavailable (${e.message}) — using the OSM API in tiles`);
    const tile = async (s, w, n, e, d = 0) => {
      const r = await get(`https://api.openstreetmap.org/api/0.6/map?bbox=${w.toFixed(6)},${s.toFixed(6)},${e.toFixed(6)},${n.toFixed(6)}`);
      if (r.status === 400 || r.status === 509) {
        if (d > 3) throw new Error('area too dense even after splitting');
        const ml = (s + n) / 2, mo = (w + e) / 2;
        for (const [a, b, c, f] of [[s, w, ml, mo], [s, mo, ml, e], [ml, w, n, mo], [ml, mo, n, e]]) await tile(a, b, c, f, d + 1);
        return;
      }
      if (!r.ok) throw new Error('OSM API HTTP ' + r.status);
      xmls.push(await r.text()); process.stdout.write(`  tile ${xmls.length}\r`); await sleep(400);
    };
    await tile(bb.s, bb.w, bb.n, bb.e);
    console.log(`downloaded ${xmls.length} tile(s) from api.openstreetmap.org`);
  }
  writeFileSync(raw, xmls.join('\n<!-- tile -->\n'));
  xmls = [readFileSync(raw, 'utf8')];
}

// ------------------------------------------------------------------ parse (the OSM XML is regular; no dependency needed)
const ent = s => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const attr = (s, k) => { const m = s.match(new RegExp(`\\s${k}="([^"]*)"`)); return m ? m[1] : null; };
const tagsOf = body => { const t = {}; for (const m of body.matchAll(/<tag k="([^"]*)" v="([^"]*)"\s*\/>/g)) t[ent(m[1])] = ent(m[2]); return t; };
const nodes = new Map(), ways = new Map(), rels = new Map();
for (const xml of xmls) {
  for (const m of xml.matchAll(/<node\b([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
    const id = attr(m[1], 'id'); if (nodes.has(id)) continue;
    nodes.set(id, { lat: +attr(m[1], 'lat'), lon: +attr(m[1], 'lon'), t: m[3] ? tagsOf(m[3]) : {} });
  }
  for (const m of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const id = attr(m[1], 'id'); if (ways.has(id)) continue;
    ways.set(id, { id, nd: [...m[2].matchAll(/<nd ref="(\d+)"/g)].map(x => x[1]), t: tagsOf(m[2]) });
  }
  for (const m of xml.matchAll(/<relation\b([^>]*)>([\s\S]*?)<\/relation>/g)) {
    const id = attr(m[1], 'id'); if (rels.has(id)) continue;
    rels.set(id, { id, mem: [...m[2].matchAll(/<member type="(\w+)" ref="(\d+)" role="([^"]*)"/g)].map(x => ({ type: x[1], ref: x[2], role: x[3] })), t: tagsOf(m[2]) });
  }
}
console.log(`parsed ${nodes.size} nodes, ${ways.size} ways, ${rels.size} relations`);

// ------------------------------------------------------------------ geometry helpers
const X0 = -W / 2, X1 = W / 2, Z0 = -H / 2, Z1 = H / 2;
const r1 = v => Math.round(v * 10) / 10;
const ptsOf = w => w.nd.map(id => nodes.get(id)).filter(Boolean).map(n => P(n.lat, n.lon));
const area = p => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]); return a / 2; };
function dp(p, eps) {                                 // Douglas–Peucker
  if (p.length < 3 || eps <= 0) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let mx = 0, at = -1;
    const [ax, az] = p[a], [bx, bz] = p[b], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    for (let i = a + 1; i < b; i++) { const d = L < 1e-6 ? Math.hypot(p[i][0] - ax, p[i][1] - az) : Math.abs((p[i][0] - ax) * dz - (p[i][1] - az) * dx) / L; if (d > mx) { mx = d; at = i; } }
    if (mx > eps) { keep[at] = 1; st.push([a, at], [at, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
function clipPoly(p) {                                // Sutherland–Hodgman against the place rectangle
  const edges = [[0, X0, 1], [0, X1, -1], [1, Z0, 1], [1, Z1, -1]];
  for (const [k, v, s] of edges) {
    const o = []; if (!p.length) break;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], ia = (a[k] - v) * s >= 0, ib = (b[k] - v) * s >= 0;
      if (ia) o.push(a);
      if (ia !== ib) { const t = (v - a[k]) / (b[k] - a[k]); o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    p = o;
  }
  return p;
}
function clipLine(p) {                                // Liang–Barsky per segment → runs inside the rectangle
  const runs = []; let cur = null;
  for (let i = 0; i < p.length - 1; i++) {
    let [x0, z0] = p[i], [x1, z1] = p[i + 1], t0 = 0, t1 = 1; const dx = x1 - x0, dz = z1 - z0; let ok = true;
    for (const [pp, q] of [[-dx, x0 - X0], [dx, X1 - x0], [-dz, z0 - Z0], [dz, Z1 - z0]]) {
      if (pp === 0) { if (q < 0) { ok = false; break; } continue; }
      const r = q / pp; if (pp < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) { cur = null; continue; }
    const a = [x0 + dx * t0, z0 + dz * t0], b = [x0 + dx * t1, z0 + dz * t1];
    if (!cur || t0 > 0) { cur = [a]; runs.push(cur); }
    cur.push(b); if (t1 < 1) cur = null;
  }
  return runs.filter(r => r.length > 1);
}
const fin = p => p.map(([x, z]) => [r1(x), r1(z)]);
const ring = p => { if (p.length > 1 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1]) p = p.slice(0, -1); return p; };
const ccw = p => area(p) < 0 ? p : p.slice().reverse();     // x east, z south: negative shoelace here = counter-clockwise seen from above
const inPoly = ([x, z], p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const centroid = p => { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; };
const num = s => { if (s == null) return null; const m = String(s).replace(',', '.').match(/-?\d+(\.\d+)?/); if (!m) return null; let v = +m[0]; if (/ft|'/.test(s)) v *= .3048; return v; };
function polygon(p, minArea = 2) {                    // clip, simplify, orient; null if it vanished
  p = clipPoly(ring(p)); if (p.length < 3) return null;
  p = dp([...p, p[0]], SIMP).slice(0, -1); if (p.length < 3 || Math.abs(area(p)) < minArea) return null;
  return fin(ccw(p));
}

// multipolygon relations: join member ways into rings; a ring the data cuts at the download edge is closed along the
// edge (the side with the smaller area — right for a river crossing the map, the usual case)
function rings(rel, role) {
  let chains = rel.mem.filter(m => m.type === 'way' && (m.role === role || (role === 'outer' && m.role === ''))).map(m => ways.get(m.ref)).filter(Boolean).map(w => ptsOf(w)).filter(p => p.length > 1);
  const out = [], eq = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < .01;
  while (chains.length) {
    let c = chains.shift();
    for (let grew = true; grew && !eq(c[0], c.at(-1));) {
      grew = false;
      for (let i = 0; i < chains.length; i++) {
        const d = chains[i];
        if (eq(c.at(-1), d[0])) c = c.concat(d.slice(1)); else if (eq(c.at(-1), d.at(-1))) c = c.concat(d.slice().reverse().slice(1));
        else if (eq(c[0], d.at(-1))) c = d.concat(c.slice(1)); else if (eq(c[0], d[0])) c = d.slice().reverse().concat(c.slice(1)); else continue;
        chains.splice(i, 1); grew = true; break;
      }
    }
    if (!eq(c[0], c.at(-1))) {
      // open: clip to a box a bit larger than the download, then walk the box from the end back to the start both ways
      const runs = clipLine(c.map(([x, z]) => [x, z]));
      if (!runs.length) continue;
      c = runs.sort((a, b) => b.length - a.length)[0];
      const per = q => { const [x, z] = q; const d = [[Math.abs(z - Z0), 0], [Math.abs(x - X1), 1], [Math.abs(z - Z1), 2], [Math.abs(x - X0), 3]].sort((a, b) => a[0] - b[0])[0]; const s = d[1]; return s + (s === 0 ? (x - X0) / W : s === 1 ? (z - Z0) / H : s === 2 ? (X1 - x) / W : (Z1 - z) / H); };
      const cornerAt = k => [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]][((k % 4) + 4) % 4];
      const walk = (a, b, dir) => {             // the box corners passed going from perimeter position a to b
        const o = [];
        if (dir > 0) { const e = b >= a ? b : b + 4; for (let k = Math.floor(a) + 1; k < e; k++) o.push(cornerAt(k)); }
        else { const e = b <= a ? b : b - 4; for (let k = Math.ceil(a) - 1; k > e; k--) o.push(cornerAt(k)); }
        return o;
      };
      const pa = per(c.at(-1)), pb = per(c[0]);
      const A = c.concat(walk(pa, pb, 1)), B = c.concat(walk(pa, pb, -1));
      c = Math.abs(area(A)) < Math.abs(area(B)) ? A : B;
    }
    out.push(c);
  }
  return out;
}

// ------------------------------------------------------------------ classify
const place = { name: label, center: { lat: +lat0.toFixed(6), lon: +lon0.toFixed(6) }, size: [W, H],
  credit: '© OpenStreetMap contributors · ODbL', license: 'ODbL-1.0 (https://opendatacommons.org/licenses/odbl/1-0/)',
  fetched: new Date().toISOString().slice(0, 10),
  buildings: [], roads: [], areas: [], rivers: [], rail: [], trees: [], lamps: [], crossings: [], signals: [], benches: [], shelters: [], pois: [] };
const names = t => { const o = {}; for (const [k, v] of Object.entries(t)) { if (k === 'name') o.name = v; else if (/^name:(en|ko|ja|zh|fr|es|de|it)$/.test(k)) o[k.slice(5)] = v; } return Object.keys(o).length ? o : null; };
const AREA = t => {
  if (t.natural === 'water' || t.waterway === 'riverbank' || t.landuse === 'reservoir' || t.landuse === 'basin' || t.water) return 'water';
  if (t.amenity === 'fountain') return 'fountain';
  if (t.natural === 'wood' || t.landuse === 'forest') return 'wood';
  if (t.leisure === 'pitch' || t.leisure === 'track') return 'pitch';
  if (t.leisure === 'playground') return 'playground';
  if (t.landuse === 'flowerbed') return 'flowerbed';
  if (t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'grass' || t.landuse === 'meadow' || t.landuse === 'recreation_ground' || t.landuse === 'village_green' || t.natural === 'grassland' || t.natural === 'scrub' || t.natural === 'heath' || t.leisure === 'dog_park' || t.landuse === 'cemetery') return t.leisure === 'park' || t.leisure === 'garden' ? 'park' : 'grass';
  if (t.natural === 'sand' || t.natural === 'beach') return 'sand';
  if (t.man_made === 'pier' || t.man_made === 'bridge') return 'deck';
  if (t.amenity === 'parking' && t.parking !== 'underground') return 'parking';
  if ((t.highway === 'pedestrian' && (t.area === 'yes' || t.type === 'multipolygon')) || t['area:highway'] === 'pedestrian' || t.place === 'square' || t['area:highway'] === 'footway') return 'plaza';
  if (t['area:highway']) return 'roadarea';
  return null;
};
const isBuilding = t => (t.building && t.building !== 'no') || t['building:part'];
const bOf = (t, p, holes, id) => {
  const o = { id: +id, p, kind: t.building || 'part' };
  if (t['building:part'] && !t.building) { o.part = 1; o.kind = t['building:part']; }
  const h = num(t.height) ?? num(t['building:height']), mh = num(t.min_height) ?? num(t['building:min_height']);
  const lv = num(t['building:levels']), mlv = num(t['building:min_level']), rlv = num(t['roof:levels']);
  if (h != null) o.h = r1(h); if (mh) o.mh = r1(mh); if (lv != null) o.lv = lv; if (mlv) o.mlv = mlv; if (rlv) o.rlv = rlv;
  if (t['roof:shape']) o.roof = t['roof:shape']; if (t['roof:colour']) o.rc = t['roof:colour']; if (t['building:colour']) o.c = t['building:colour'];
  if (t['building:material']) o.mat = t['building:material'];
  const nm = names(t); if (nm) o.n = nm;
  if (holes?.length) o.holes = holes;
  return o;
};
const POI = t => {
  if (t.amenity && /^(restaurant|food_court|fast_food|biergarten)$/.test(t.amenity)) return 'food';
  if (t.amenity === 'cafe' || t.amenity === 'ice_cream' || t.shop === 'bakery' || t.shop === 'pastry') return 'cafe';
  if (t.amenity === 'bar' || t.amenity === 'pub' || t.amenity === 'nightclub') return 'bar';
  if (t.tourism === 'museum' || t.amenity === 'arts_centre' || t.tourism === 'gallery') return 'museum';
  if (t.amenity === 'theatre' || t.amenity === 'cinema' || t.amenity === 'concert_hall') return 'culture';
  if (t.tourism === 'attraction' || t.historic || t.tourism === 'viewpoint' || t.tourism === 'artwork' && t.name) return 'sight';
  if (t.tourism === 'hotel' || t.tourism === 'hostel' || t.tourism === 'guest_house') return 'hotel';
  if (t.railway === 'station' || t.railway === 'subway_entrance' || t.public_transport === 'station' || t.railway === 'halt' || t.railway === 'tram_stop') return 'transit';
  if (t.amenity === 'ferry_terminal') return 'ferry';
  if (t.amenity === 'place_of_worship') return 'worship';
  if (t.leisure === 'park' || t.leisure === 'garden') return 'park';
  if (t.shop) return 'shop';
  if (t.amenity === 'school' || t.amenity === 'university' || t.amenity === 'library') return 'school';
  if (t.amenity === 'hospital' || t.amenity === 'pharmacy' || t.amenity === 'clinic') return 'health';
  return null;
};

const usedWays = new Set();
// relations first
for (const r of rels.values()) {
  if (r.t.type !== 'multipolygon' && r.t.type !== 'building') continue;
  const t = r.t, kind = AREA(t), bld = isBuilding(t);
  if (!kind && !bld) continue;
  const outer = rings(r, 'outer'), inner = rings(r, 'inner').map(p => polygon(p)).filter(Boolean);
  for (const o of outer) {
    const p = polygon(o, bld ? 4 : 8); if (!p) continue;
    const holes = inner.filter(h => inPoly(h[0], p));
    if (bld) place.buildings.push(bOf(t, p, holes, r.id)); else place.areas.push({ k: kind, p, ...(holes.length ? { holes } : {}), ...(names(t) ? { n: names(t) } : {}) });
  }
  for (const m of r.mem) if (m.type === 'way') { const w = ways.get(m.ref); if (w && !Object.keys(w.t).filter(k => !/^(source|created_by|note|fixme)/.test(k)).length) usedWays.add(m.ref); }
}
const ROADS = /^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|pedestrian|footway|path|cycleway|steps|track|busway)$/;
for (const w of ways.values()) {
  if (usedWays.has(w.id)) continue;
  const t = w.t, p0 = ptsOf(w); if (p0.length < 2) continue;
  const closed = w.nd[0] === w.nd.at(-1) && w.nd.length > 3;
  if (isBuilding(t) && closed) { const p = polygon(p0, 4); if (p) place.buildings.push(bOf(t, p, null, w.id)); continue; }
  const kind = closed ? AREA(t) : null;
  if (kind && !(t.highway && t.area !== 'yes' && kind === 'plaza' && !t['area:highway'])) { const p = polygon(p0, 8); if (p) place.areas.push({ k: kind, p, ...(names(t) ? { n: names(t) } : {}) }); if (!t.highway) continue; if (t.area === 'yes') continue; }
  if (t.highway && ROADS.test(t.highway) && t.tunnel !== 'yes' && t.tunnel !== 'building_passage' && t.covered !== 'yes' && !(t.layer && +t.layer < 0)) {
    for (const run of clipLine(dp(p0, SIMP * .6))) {
      const o = { k: t.highway, p: fin(run) };
      const wd = num(t.width), ln = num(t.lanes);
      if (wd) o.w = r1(wd); if (ln) o.lanes = ln; if (t.oneway === 'yes' || t.junction === 'roundabout') o.oneway = 1;
      if (t.bridge && t.bridge !== 'no') o.bridge = 1; if (t.layer) o.layer = +t.layer;
      if (t.junction === 'roundabout') o.ring = 1; if (t.footway === 'crossing' || t.cycleway === 'crossing') o.crossing = 1;
      const nm = names(t); if (nm) o.n = nm;
      if (t.ref) o.ref = t.ref;
      place.roads.push(o);
    }
    continue;
  }
  if (t.waterway && /^(river|canal|stream)$/.test(t.waterway) && t.tunnel !== 'yes' && t.tunnel !== 'culvert') {
    for (const run of clipLine(dp(p0, SIMP))) place.rivers.push({ k: t.waterway, p: fin(run), ...(num(t.width) ? { w: num(t.width) } : {}), ...(names(t) ? { n: names(t) } : {}) });
    continue;
  }
  if (t.railway && /^(rail|light_rail|tram|narrow_gauge|monorail)$/.test(t.railway) && t.tunnel !== 'yes' && !(t.layer && +t.layer < 0)) {
    for (const run of clipLine(dp(p0, SIMP))) place.rail.push({ k: t.railway, p: fin(run), ...(t.bridge && t.bridge !== 'no' ? { bridge: 1 } : {}) });
    continue;
  }
  if (t.natural === 'tree_row') {
    for (const run of clipLine(p0)) for (let i = 0; i < run.length - 1; i++) {
      const [ax, az] = run[i], [bx, bz] = run[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < L; s += 8) place.trees.push([r1(ax + (bx - ax) * s / L), r1(az + (bz - az) * s / L)]);
    }
  }
}
// building parts replace the outline they sit in (OSM Simple 3D Buildings)
const parts = place.buildings.filter(b => b.part);
if (parts.length) {
  const cs = parts.map(b => centroid(b.p));
  place.buildings = place.buildings.filter(b => b.part || !cs.some(c => inPoly(c, b.p)));
}
// nodes: trees, lamps, crossings, POIs
const inside = ([x, z]) => x >= X0 && x <= X1 && z >= Z0 && z <= Z1;
for (const n of nodes.values()) {
  const t = n.t; if (!Object.keys(t).length) continue;
  const q = P(n.lat, n.lon); if (!inside(q)) continue;
  const xz = [r1(q[0]), r1(q[1])];
  if (t.natural === 'tree') { const h = num(t.height); place.trees.push(h ? [...xz, r1(h)] : xz); }
  else if (t.highway === 'street_lamp') place.lamps.push(xz);
  else if (t.highway === 'crossing' || t.railway === 'crossing') place.crossings.push(xz);
  else if (t.highway === 'traffic_signals') place.signals.push(xz);
  else if (t.amenity === 'bench') place.benches.push(xz);
  if ((t.highway === 'bus_stop' && t.shelter === 'yes') || (t.amenity === 'shelter' && t.shelter_type === 'public_transport')) place.shelters.push(xz);
  const c = POI(t), nm = names(t);
  if (c && nm) place.pois.push({ x: xz[0], z: xz[1], c, n: nm, ...(t.tourism === 'attraction' || t.historic === 'monument' ? { star: 1 } : {}) });
}
// named areas and buildings with a POI meaning become POIs at their centroid
for (const w of ways.values()) {
  const c = POI(w.t), nm = names(w.t); if (!c || !nm) continue;
  const p = ptsOf(w); if (p.length < 3) continue;
  const q = centroid(p); if (!inside(q)) continue;
  place.pois.push({ x: r1(q[0]), z: r1(q[1]), c, n: nm, ...(w.t.tourism === 'attraction' || w.t.wikidata ? { star: 1 } : {}) });
}
place.roads.sort((a, b) => (a.layer || 0) - (b.layer || 0));
const json = JSON.stringify(place).replace(/\],\[/g, '],[').replace(/},{/g, '},\n{');
writeFileSync(out, json);
const c = k => place[k].length;
console.log(`${out}  ${(json.length / 1024).toFixed(0)} KB
  buildings ${c('buildings')} (${place.buildings.filter(b => b.h || b.lv).length} with height) · roads ${c('roads')} · areas ${c('areas')} (water ${place.areas.filter(a => a.k === 'water').length}) · rivers ${c('rivers')} · rail ${c('rail')}
  trees ${c('trees')} · lamps ${c('lamps')} · crossings ${c('crossings')} · benches ${c('benches')} · shelters ${c('shelters')} · POIs ${c('pois')}
next: node <skill>/scripts/new-film.mjs <dir> (copy place.json in), or see what is there: node <skill>/scripts/place-map.mjs ${out.split('/').pop()}`);
