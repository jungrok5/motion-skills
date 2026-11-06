// node <skill>/scripts/check.mjs <project>
// Proves a character: its data is complete; the motion is deterministic and finite; no pose, move, action or expression
// asks a joint past its limits (the body check); planted feet stay planted; and in the browser the page loads clean,
// every frame draws, nothing leaves the frame at the top or sides, and the same time draws the same pixels.
import { Sim } from '../lib/rig.js'
import { project, loadCharacter, open } from './_lib.mjs'
const prj = project(process.argv[2] || '.')
const ch = await loadCharacter(prj.dir)
const fails = [], notes = []
const fail = (m) => fails.push(m), ok = (m) => notes.push('ok  ' + m)

// ---------------------------------------------------------------- data
for (const k of ['id', 'name', 'anchors', 'rig', 'view', 'face', 'draw', 'demo', 'expressions', 'actions']) if (ch[k] == null) fail(`character.${k} is missing`)
for (const k of ['head', 'extent', 'neckY', 'chinY', 'neckBaseY', 'bottomY', 'faceW']) if (ch.anchors?.[k] == null) fail(`anchors.${k} is missing`)
if (Math.abs(ch.view.w / ch.view.h - 0.8) > 0.02) fail(`view is ${ch.view.w}x${ch.view.h}: keep it 4:5 (w / h = 0.8)`)
for (const [name, pose] of Object.entries(ch.poses || {})) for (const [lid, a] of Object.entries(pose)) {
  const L = ch.limbs?.find((l) => l.id === lid)
  if (!L) { fail(`pose ${name}: no limb ${lid}`); continue }
  for (const [j, [lo, hi]] of Object.entries(L.lim)) if (a[j] != null && (a[j] < lo || a[j] > hi)) fail(`pose ${name}.${lid}.${j} = ${a[j]} outside [${lo}, ${hi}]`)
}
ok('data')

// ---------------------------------------------------------------- motion (node, no browser)
const H = 1 / 120
function run(setup, secs, each) {
  const s = new Sim(ch, 7); setup?.(s)
  const ev = [...(ch.demo?.events || [])].sort((a, b) => a[0] - b[0]); let i = 0
  for (let n = 0; n < secs * 120; n++) {
    if (!setup) while (i < ev.length && ev[i][0] <= s.t + 1e-9) { const [, k, a] = ev[i++]; s[k](a) }
    s.step(H); each?.(s)
  }
  return s
}
const state = (s) => JSON.stringify([s.P, s.chains.map((c) => c.a), s.limbs.map((l) => l.x)], (k, v) => (typeof v === 'number' ? +v.toFixed(6) : v))
const finite = (s, where) => { const bad = Object.entries(s.P).find(([, v]) => !Number.isFinite(v)) || s.chains.find((c) => c.a.some((v) => !Number.isFinite(v))) || s.limbs.find((l) => Object.values(l.x).some((v) => !Number.isFinite(v))); if (bad) { fail(`not finite in ${where}`); return false } return true }
const a1 = [], a2 = []
const sA = run(null, ch.demo.dur, (s) => { if (Math.round(s.t * 120) % 60 === 0) a1.push(state(s)) })
run(null, ch.demo.dur, (s) => { if (Math.round(s.t * 120) % 60 === 0) a2.push(state(s)) })
if (a1.join() !== a2.join()) fail('the demo is not deterministic (two runs differ)'); else ok('deterministic demo')
finite(sA, 'the demo')
const limits = new Set(sA.violations)
// planted feet: the end of a planted limb stays on its ground point while nothing lifts it
let slip = 0
run(null, ch.demo.dur, (s) => { for (const l of s.limbs) if (l.planted && l.liftW === 0) { const j = l.solve(s.D); slip = Math.max(slip, Math.hypot(j.W[0] - l.planted[0], j.W[1] - l.planted[1])) } })
if (slip > 3) fail(`a planted foot slides ${slip.toFixed(1)} px`); else if (ch.limbs?.some((l) => l.planted)) ok(`planted feet hold (max ${slip.toFixed(2)} px)`)
// every action, expression and idle move, both ways round
for (const id of Object.keys(ch.actions)) { const s = run((s) => s.act(id), ch.actions[id].dur + 0.5); finite(s, 'action ' + id); s.violations.forEach((v) => limits.add(`action ${id}: ${v}`)) }
for (const id of Object.keys(ch.expressions)) { const s = run((s) => s.express(id), 2); finite(s, 'expression ' + id); s.violations.forEach((v) => limits.add(`expression ${id}: ${v}`)) }
for (const [id, m] of Object.entries(ch.moves || {})) for (const side of [-1, 1]) {
  const s = run((s) => { s.idle.move = { id, t: 0, side, fade: 1 }; s.idle.last = id }, m.dur + 0.3)
  finite(s, `idle move ${id}`); s.violations.forEach((v) => limits.add(`idle ${id} (${side}): ${v}`))
}
if (limits.size) for (const v of limits) fail('joint limit: ' + v); else ok('no joint asked past its limits (demo, actions, expressions, idle moves both ways)')

// ---------------------------------------------------------------- the page
const { page, errors, close } = await open(prj, { w: 400, h: 500 })
const frame = (t) => page.evaluate((t) => {
  const L = window.live; L.set({ transparent: true }); L.renderAt(t)
  const c = L.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1, n = 0, h = 0
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 3] * 13) | 0; if (d[i + 3] > 20) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y } }
  L.set({ transparent: false })
  return { x0, y0, x1, y1, cover: n / (c.width * c.height), w: c.width, h: c.height, hash: h }
}, t)
const times = Array.from({ length: 12 }, (_, i) => +(ch.demo.dur * (i + 0.5) / 12).toFixed(2))
for (const t of times) {
  const f = frame(t)
  if (f.cover < 0.08) fail(`t=${t}: the frame is nearly empty (${(f.cover * 100).toFixed(1)} %)`)
  if (f.y0 <= 1) fail(`t=${t}: the character touches the top edge (leave room above the head and ears)`)
  if (f.x0 <= 1 || f.x1 >= f.w - 2) fail(`t=${t}: the character touches a side edge`)
}
const h1 = (await frame(times[5])).hash, h2 = (await frame(times[5])).hash
if (h1 !== h2) fail('renderAt(t) is not deterministic in the browser'); else ok(`${times.length} frames draw, inside the frame, deterministic`)
if (errors.length) fail('page errors: ' + errors.join(' | ')); else ok('page loads clean')
await close()

console.log(notes.join('\n'))
if (fails.length) { console.log(fails.map((f) => 'FAIL ' + f).join('\n')); process.exit(1) }
console.log(`PASS ${ch.name} (${ch.id})`)
