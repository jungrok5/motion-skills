// lib/stage.js — the player. mount(character) builds a live stage and its controls from the character's data
// (expressions, actions, talk line, demo script), follows the pointer, and exposes a deterministic
// window.live.renderAt(t) for renders and checks. ?bare shows the stage alone; ?still draws one frame and waits.
import { Sim, smooth } from './rig.js'

const CSS = `
:root { --bg: #edf1f5; --panel: #fbfcfd; --ink: #1c2330; --muted: #5a6575; --line: #d5dce5; --accent: #b9740c; --accent-ink: #3a2400;
  --chip: #e4eaf1; --chip-on: #f1b23c; --stage-top: #dce8f3; --stage-bottom: #f6eee1; --glow: rgba(255, 214, 140, 0.55);
  --display: "Jua", "IBM Plex Sans KR", system-ui, sans-serif; --body: "IBM Plex Sans KR", system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #10151d; --panel: #171e2a; --ink: #e7ecf3; --muted: #98a4b5; --line: #283244;
  --accent: #f1b23c; --accent-ink: #2a1a00; --chip: #222c3b; --chip-on: #f1b23c; --stage-top: #1a2636; --stage-bottom: #2b2620; --glow: rgba(241, 178, 60, 0.18); color-scheme: dark } }
:root[data-theme="dark"] { --bg: #10151d; --panel: #171e2a; --ink: #e7ecf3; --muted: #98a4b5; --line: #283244;
  --accent: #f1b23c; --accent-ink: #2a1a00; --chip: #222c3b; --chip-on: #f1b23c; --stage-top: #1a2636; --stage-bottom: #2b2620; --glow: rgba(241, 178, 60, 0.18); color-scheme: dark }
* { box-sizing: border-box } [hidden] { display: none !important }
html, body { margin: 0 }
body { background: var(--bg); color: var(--ink); font: 15px/1.6 var(--body); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 20px 40px }
body.bare { padding: 0; background: transparent } body.bare .wrap { display: block; max-width: none } body.bare .rail, body.bare .caption { display: none }
body.bare .stage { border: 0; border-radius: 0; max-height: none; height: 100vh; aspect-ratio: auto }
.wrap { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 28px; align-items: start }
.stage-col { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 12px); display: grid; gap: 10px; min-width: 0 }
.stage { position: relative; width: 100%; aspect-ratio: 4 / 5; max-height: 82vh; border-radius: 18px; overflow: hidden; border: 1px solid var(--line); touch-action: none; background: var(--stage-bottom) }
.stage canvas { width: 100%; height: 100%; display: block; cursor: crosshair }
.caption { min-height: 2.6em; font: 500 15px/1.5 var(--body); text-align: center; text-wrap: balance }
.caption:empty::before { content: attr(data-hint); color: var(--muted); font-weight: 400 }
.rail { display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; min-width: 0 }
.rail h1 { font: 400 44px/1.05 var(--display); margin: 0 }
.rail header p { margin: 6px 0 0; color: var(--muted); max-width: 46ch }
.group { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px }
.group h2 { margin: 0; font: 600 12px/1 var(--body); letter-spacing: 0.12em; color: var(--muted) }
.chips { display: flex; flex-wrap: wrap; gap: 8px }
.rail button { font: 500 14px/1 var(--body); color: var(--ink); background: var(--chip); border: 1px solid transparent; border-radius: 999px; padding: 10px 14px; cursor: pointer }
.rail button:hover { border-color: var(--line) }
.rail button:focus-visible, .rail input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
.rail button[aria-pressed="true"] { background: var(--chip-on); color: var(--accent-ink) }
.rail button.primary { background: var(--accent); color: var(--accent-ink); font-weight: 600 }
.say { display: flex; gap: 8px } .say input { flex: 1; min-width: 0; font: 15px var(--body); color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px }
.sliders { display: grid; gap: 10px }
.sliders label { display: grid; grid-template-columns: 7.5em minmax(0, 1fr) 3em; align-items: center; gap: 10px; color: var(--muted); font-size: 14px }
.sliders output { font: 13px var(--mono); text-align: right; font-variant-numeric: tabular-nums; color: var(--ink) }
input[type="range"] { width: 100%; accent-color: var(--accent) }
.toggle { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 14px; cursor: pointer } .toggle input { accent-color: var(--accent); width: 18px; height: 18px }
.params { font: 12px/1.7 var(--mono); color: var(--muted); background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 12px; font-variant-numeric: tabular-nums }
.params b { color: var(--ink); font-weight: 500 }
.notes { border-top: 1px solid var(--line); padding-top: 16px; color: var(--muted); font-size: 14px } .notes a { color: var(--accent) }
@media (max-width: 820px) { .wrap { grid-template-columns: minmax(0, 1fr); gap: 18px } .stage-col { position: static } .stage { max-height: 70vh; margin: 0 auto } .rail h1 { font-size: 36px } }
`

const NOTES = `<strong>왜 자연스러워 보이나</strong> 머리는 볼록한 곡면 위에서 부위마다 다른 깊이로 돌고, 눈이 먼저 · 고개가 살짝 넘쳤다 돌아오고 · 몸은 0.25초 늦게 따라옵니다.
  숨 · 깜빡임 · 작은 idle 동작은 매번 간격이 다르고, 머리카락 · 귀 · 꼬리 · 팔은 각자의 스프링으로 흔들립니다.
  움직임 원리는 <a href="https://github.com/livliv-dev/player" target="_blank" rel="noopener">LivLiv Player</a>(Apache-2.0)를 연구해 벡터 캐릭터용으로 다시 구현했습니다 (live-character 스킬).`

const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.innerHTML = html; return e }

/** the demo's pointer at time t from keys [[t, x, y] | [t, null]] (model px), eased between keys; null = off */
export function pointerAt(keys, t) {
  if (!keys?.length || t < keys[0][0]) return null
  let i = 0
  while (i < keys.length - 1 && t >= keys[i + 1][0]) i++
  const a = keys[i], b = keys[i + 1]
  if (a[1] == null) return null
  if (!b || b[1] == null) return [a[1], a[2]]
  const u = smooth(a[0], b[0], t)
  return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}

export function mount(ch, opts = {}) {
  const q = new URLSearchParams(location.search), bare = q.has('bare') || opts.bare
  document.head.append(el('style', {}, CSS))
  if (bare) document.body.classList.add('bare')
  const exprs = Object.entries(ch.expressions || { none: { label: '기본' } })
  const acts = Object.entries(ch.actions || {})
  const wrap = el('main', { class: 'wrap' }, `
    <div class="stage-col"><div class="stage" id="stage"><canvas id="cv" aria-label="${ch.name}: 숨 쉬고 깜빡이며 포인터를 바라보는 캐릭터"></canvas></div>
      <div class="caption" id="caption" aria-live="polite" data-hint="화면 위에서 움직이면 눈이 먼저, 고개가 뒤따라요. 얼굴을 누르면 쓰다듬기, 다른 곳을 누르면 털·머리카락이 흔들려요."></div></div>
    <div class="rail">
      <header><h1>${ch.name}</h1><p>${ch.blurb || ''}</p></header>
      <div class="group"><h2>데모</h2><div class="chips"><button class="primary" id="demo">${Math.round(ch.demo?.dur || 0)}초 데모 재생</button><button id="stop" hidden>멈추고 직접 조작</button></div></div>
      <div class="group"><h2>표정</h2><div class="chips" id="exprs">${exprs.map(([id, e]) => `<button data-e="${id}" aria-pressed="${id === 'none'}">${e.label || id}</button>`).join('')}</div></div>
      <div class="group"><h2>동작</h2><div class="chips" id="acts">${acts.map(([id, a]) => `<button data-a="${id}">${a.label || id}</button>`).join('')}</div></div>
      <div class="group"><h2>말하기</h2><form class="say" id="sayForm"><input id="sayText" value="${ch.talk || '안녕!'}" aria-label="${ch.name}이(가) 말할 문장"><button class="primary" type="submit">말하기</button></form></div>
      <div class="group"><h2>움직임 비교</h2>
        <div class="chips" id="modes"><button data-m="lively" aria-pressed="true">자연스러운 idle</button><button data-m="sine">사인파 idle</button></div>
        <div class="sliders"><label>흔들림 <input type="range" id="physics" min="0" max="2" step="0.05" value="1"><output id="physicsOut">1.00</output></label>
          <label>몸의 방황 <input type="range" id="wander" min="0" max="2" step="0.05" value="1"><output id="wanderOut">1.00</output></label></div>
        <label class="toggle"><input type="checkbox" id="lattice"> 머리 변형 격자 보기</label>
        <label class="toggle"><input type="checkbox" id="showParams"> 파라미터 보기</label>
        <div class="params" id="params" hidden></div></div>
      <div class="notes">${opts.notes ?? NOTES}</div>
    </div>`)
  document.body.append(wrap)

  const cv = document.getElementById('cv'), stageEl = document.getElementById('stage'), ctx = cv.getContext('2d')
  const sim = new Sim(ch, opts.seed ?? 7)
  const VIEW = ch.view, FACE = ch.face
  let view = { s: 1, ox: 0, oy: 0 }
  const o = { lattice: false, transparent: false }
  function resize() {
    const r = stageEl.getBoundingClientRect(), dpr = Math.min(2.5, window.devicePixelRatio || 1)
    cv.width = Math.max(2, Math.round(r.width * dpr)); cv.height = Math.max(2, Math.round(r.height * dpr))
    const s = Math.min(cv.width / VIEW.w, cv.height / VIEW.h)
    view = { s, ox: (cv.width - VIEW.w * s) / 2 - VIEW.x * s, oy: cv.height - (VIEW.y + VIEW.h) * s }
  }
  new ResizeObserver(resize).observe(stageEl); resize()
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
  let theme = {}
  const readTheme = () => { theme = { top: css('--stage-top'), bottom: css('--stage-bottom'), glow: css('--glow') } }
  readTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme)
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  function paint(marker) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    if (!o.transparent) {
      const g = ctx.createLinearGradient(0, 0, 0, cv.height)
      g.addColorStop(0, theme.top); g.addColorStop(1, theme.bottom)
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height)
    }
    ctx.setTransform(view.s, 0, 0, view.s, view.ox, view.oy)
    if (!o.transparent) {
      const cx = FACE.x, cy = FACE.y, R = VIEW.w * 0.55
      const glow = ctx.createRadialGradient(cx, cy, 40, cx, cy, R)
      glow.addColorStop(0, theme.glow); glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h)
      for (let i = 0; i < 9; i++) {
        const x = VIEW.x + ((i * 137 + sim.t * (6 + i)) % (VIEW.w - 60)) + 30, y = VIEW.y + 60 + ((i * 251) % (VIEW.h * 0.7)) + Math.sin(sim.t * 0.4 + i) * 12
        ctx.beginPath(); ctx.arc(x, y, 6 + (i % 3) * 5, 0, 7); ctx.fillStyle = theme.glow; ctx.fill()
      }
    }
    ch.draw(ctx, sim, o)
    if (o.lattice) lattice(ctx, sim.D)
    if (marker) {
      ctx.beginPath(); ctx.arc(marker[0], marker[1], 14, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,40,60,0.55)'; ctx.stroke()
      ctx.beginPath(); ctx.arc(marker[0], marker[1], 4, 0, 7); ctx.fillStyle = 'rgba(30,40,60,0.55)'; ctx.fill()
    }
  }
  const look = (mx, my) => ({ x: Math.max(-1, Math.min(1, (mx - FACE.x) / (VIEW.w / 2))), y: Math.max(-1, Math.min(1, -(my - FACE.y) / (VIEW.h / 2) * 1.6)),
    d: Math.hypot((mx - FACE.x) / FACE.rx, (my - FACE.y) / FACE.ry) })
  const toModel = (e) => { const r = cv.getBoundingClientRect(), k = cv.width / r.width; return [((e.clientX - r.left) * k - view.ox) / view.s, ((e.clientY - r.top) * k - view.oy) / view.s] }

  // ---------------------------------------------------------------- the scripted demo (what renderAt plays)
  const DEMO = ch.demo || { dur: 10, events: [] }
  const events = [...(DEMO.events || [])].sort((a, b) => a[0] - b[0])
  let next = 0
  function playTo(t) {
    if (t < sim.t - 1e-6 || sim.snapped) { sim.reset(); next = 0; sim.express('none') }
    const h = 1 / 120
    while (sim.t + h <= t + 1e-9) {
      while (next < events.length && events[next][0] <= sim.t + 1e-9) { const [, kind, arg] = events[next++]; sim[kind](arg) }
      const p = pointerAt(DEMO.pointer, sim.t)
      if (p) { const l = look(p[0], p[1]); sim.point(l.x, l.y, l.d, true) } else sim.point(0, 0, 99, false)
      sim.step(h)
    }
  }
  const caption = document.getElementById('caption')
  const captionFor = () => { const text = sim.talk ? sim.talk.text : ''; if (caption.textContent !== text) caption.textContent = text }
  function renderAt(t) { playTo(t); paint(pointerAt(DEMO.pointer, t)); captionFor() }
  const live = window.live = { sim, ch, renderAt, DURATION: DEMO.dur, paint, opts: o, set: (x) => Object.assign(o, x), canvas: cv }

  // ---------------------------------------------------------------- live loop and input
  let demo = null, last = performance.now()
  const demoBtn = document.getElementById('demo'), stopBtn = document.getElementById('stop'), paramsEl = document.getElementById('params')
  const setExpr = (id) => { for (const b of document.querySelectorAll('#exprs button')) b.setAttribute('aria-pressed', String(b.dataset.e === id)) }
  function startDemo() { sim.reset(); next = 0; demo = { start: performance.now() }; demoBtn.hidden = true; stopBtn.hidden = false; setExpr('none') }
  function stopDemo() { demo = null; demoBtn.hidden = false; stopBtn.hidden = true; sim.point(0, 0, 99, false) }
  demoBtn.onclick = startDemo; stopBtn.onclick = stopDemo
  function frame(now) {
    const dt = (now - last) / 1000; last = now
    if (demo) { const t = (now - demo.start) / 1000; if (t >= DEMO.dur) stopDemo(); else { playTo(t); paint(pointerAt(DEMO.pointer, t)) } }
    else { sim.advance(dt); paint() }
    captionFor()
    if (!paramsEl.hidden) paramsEl.innerHTML = Object.keys(sim.spec).map((k) => `<span>${k} <b>${sim.P[k].toFixed(2)}</b></span>`).join('')
    requestAnimationFrame(frame)
  }
  if (!q.has('still')) { if (q.has('demo') || opts.autoplay) startDemo(); requestAnimationFrame(frame) } else paint()

  let touching = false
  cv.addEventListener('pointermove', (e) => { if (demo || (e.pointerType === 'touch' && !touching)) return; const [mx, my] = toModel(e), l = look(mx, my); sim.point(l.x, l.y, l.d, true) })
  cv.addEventListener('pointerleave', () => { if (!demo) sim.point(0, 0, 99, false) })
  cv.addEventListener('pointerdown', (e) => {
    if (demo) return
    touching = true
    const [mx, my] = toModel(e), l = look(mx, my)
    sim.point(l.x, l.y, l.d, true)
    if (l.d < 0.85 && ch.actions?.pat) sim.act('pat'); else sim.poke(mx, my, 1)
  })
  addEventListener('pointerup', (e) => { touching = false; if (e.pointerType === 'touch' && !demo) setTimeout(() => sim.point(0, 0, 99, false), 400) })
  document.getElementById('exprs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; sim.express(b.dataset.e); setExpr(b.dataset.e) }
  document.getElementById('acts').onclick = (e) => { const b = e.target.closest('button'); if (b && !demo) sim.act(b.dataset.a) }
  document.getElementById('sayForm').addEventListener('submit', (e) => { e.preventDefault(); if (!demo) sim.say(document.getElementById('sayText').value) })
  document.getElementById('modes').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return
    stopDemo(); sim.setMode(b.dataset.m); setExpr('none')
    for (const x of document.querySelectorAll('#modes button')) x.setAttribute('aria-pressed', String(x === b))
  }
  for (const id of ['physics', 'wander']) {
    const r = document.getElementById(id), out = document.getElementById(id + 'Out')
    r.oninput = () => { sim.settings[id] = +r.value; out.textContent = (+r.value).toFixed(2) }
  }
  document.getElementById('lattice').onchange = (e) => { o.lattice = e.target.checked }
  document.getElementById('showParams').onchange = (e) => { paramsEl.hidden = !e.target.checked }
  return live
}

/** the head's bulge as a bent grid: shows how a turn is drawn */
function lattice(ctx, D) {
  const h = D.A.head, out = [0, 0]
  ctx.save(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,170,200,0.75)'
  for (let i = -6; i <= 6; i++) for (const vert of [true, false]) {
    ctx.beginPath()
    for (let j = -12; j <= 12; j++) {
      const a = i / 6, b = j / 12, u = vert ? a : b, v = vert ? b : a
      if (u * u + v * v > 1.02) continue
      D.head(h.cx + u * h.rx * 1.05, h.cy + v * h.ry * 1.05, 0, out); ctx.lineTo(out[0], out[1])
    }
    ctx.stroke()
  }
  ctx.restore()
}
