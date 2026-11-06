// node <skill>/scripts/sheet.mjs <project> [--out out/sheet.png] [--cols 5]
// The cast sheet: the head and torso at their limits both ways (left / right, up / down, tilts, both diagonals), every
// expression, every limb pose held, and every action at its peak — drawn straight from params, so you can score it
// against the body check (references/BODY-CHECK.md) before writing a demo.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { project, open, args } from './_lib.mjs'
const a = args(process.argv.slice(2), { cols: 5 })
const prj = project(a._[0] || '.')
const out = a.out || join(prj.dir, 'out', 'sheet.png'); mkdirSync(dirname(out), { recursive: true })
const { page, errors, close } = await open(prj, { w: 360, h: 450, scale: 1 })
const tiles = await page.evaluate(() => {
  const { sim, ch, paint, canvas } = window.live
  const shots = []
  const grab = (name) => { paint(); shots.push([name, canvas.toDataURL('image/png')]) }
  const turns = [['정면', {}], ['왼쪽 끝', { angleX: -30, eyeBallX: -0.8 }], ['오른쪽 끝', { angleX: 30, eyeBallX: 0.8 }], ['위 끝', { angleY: 30, eyeBallY: 0.6 }], ['아래 끝', { angleY: -30, eyeBallY: -0.6 }],
    ['기울기 왼', { angleZ: -30 }], ['기울기 오른', { angleZ: 30 }], ['대각 ↗ 끝', { angleX: 30, angleY: 30, angleZ: 30, bodyX: 10, bodyZ: 10 }], ['대각 ↙ 끝', { angleX: -30, angleY: -30, angleZ: -30, bodyX: -10, bodyZ: -10 }],
    ['감은 눈', { eyeLOpen: 0, eyeROpen: 0 }], ['입 아', { mouthOpen: 1, vowel: 0 }], ['입 오', { mouthOpen: 0.7, vowel: -1 }]]
  for (const [n, p] of turns) { sim.snap(p); grab(n) }
  for (const [id, e] of Object.entries(ch.expressions || {})) if (id !== 'none') { sim.snap(e.set || {}, e.limbs || {}); grab('표정 · ' + (e.label || id)) }
  for (const id of Object.keys(ch.poses || {})) { const limbs = Object.fromEntries(Object.keys(ch.poses[id]).map((l) => [l, id])); sim.snap({}, limbs); grab('자세 · ' + id) }
  for (const [id, act] of Object.entries(ch.actions || {})) {
    sim.reset(); sim.express('none')
    for (let i = 0; i < 36; i++) sim.step(1 / 120)
    sim.act(id)
    const n = Math.round(act.dur * (act.peak ?? 0.45) * 120)
    for (let i = 0; i < n; i++) sim.step(1 / 120)
    sim.snapped = true
    grab('동작 · ' + (act.label || id))
  }
  return shots
})
await page.setContent(`<body style="margin:0;background:#fff;font:600 15px system-ui"><div style="display:grid;grid-template-columns:repeat(${a.cols},360px);gap:4px">${tiles.map(([n, s]) => `<figure style="margin:0"><img src="${s}" style="width:360px;display:block"><figcaption style="padding:2px 6px 6px">${n}</figcaption></figure>`).join('')}</div></body>`)
await page.screenshot({ path: out, fullPage: true })
console.log('wrote', out, tiles.length, 'tiles')
if (errors.length) console.log('page errors:', errors)
await close()
