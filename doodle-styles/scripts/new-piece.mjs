// node <skill>/scripts/new-piece.mjs <studio>/<name> [--title "…"] [--size 1080x1350 | --format 1x1|4x5|9x16|16x9]
//                                    [--from persimmons|kettle] [--style <id>]
// A STUDIO is a folder of pieces that share one hand: <studio>/house-style.json + <studio>/lib (copied from the skill).
// The first piece creates the studio (house style = --style, else watercolour); later pieces reuse it.
// --style on a later piece overrides the hand for that piece only (writes `style` into its piece.js).
// --from copies an example's piece.js to read — it is a construction reference; rewrite the subject from your brief.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SKILL, args } from './_lib.mjs'

const a = args(process.argv.slice(2))
const target = a._[0] ? resolve(a._[0]) : null
if (!target) { console.error('usage: new-piece.mjs <studio>/<name> [--title …] [--size WxH | --format 4x5] [--from kettle] [--style id]'); process.exit(1) }
const name = basename(target), studio = dirname(target)
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) { console.error(`"${name}": use lowercase letters, digits and hyphens`); process.exit(1) }
if (existsSync(join(target, 'piece.js'))) { console.error(`${target}/piece.js exists; refusing to overwrite`); process.exit(1) }
const { STYLE_IDS } = await import(pathToFileURL(join(SKILL, 'lib/styles/index.js')).href)
if (a.style && !STYLE_IDS.includes(a.style)) { console.error(`no style "${a.style}". One of: ${STYLE_IDS.join(', ')}`); process.exit(1) }

const formats = { '1x1': [1080, 1080], '4x5': [1080, 1350], '9x16': [1080, 1920], '16x9': [1920, 1080] }
const [W, H] = a.size ? String(a.size).split('x').map(Number) : formats[a.format || '1x1'] || [1080, 1080]
if (!(W > 16 && H > 16)) { console.error('--size WxH, e.g. 1080x1350'); process.exit(1) }

// the studio: lib + house style, once
mkdirSync(target, { recursive: true })
const fresh = !existsSync(join(studio, 'lib', 'doodle.js'))
if (fresh) cpSync(join(SKILL, 'lib'), join(studio, 'lib'), { recursive: true })
const houseFile = join(studio, 'house-style.json')
let pieceStyle = null
if (!existsSync(houseFile)) {
  writeFileSync(houseFile, JSON.stringify({ style: a.style || 'watercolour', tweaks: {}, note: 'Every piece in this studio is drawn in this hand. Change it with: styles.mjs pick <id> --studio .', source: 'anidoodle style recipes — https://github.com/alexgreensh/anidoodle' }, null, 2) + '\n')
} else if (a.style) pieceStyle = a.style

// the piece
const title = String(a.title || name)
let src
if (a.from) {
  const f = join(SKILL, 'examples', a.from, 'piece.js')
  if (!existsSync(f)) { console.error(`no example "${a.from}" (persimmons, kettle)`); process.exit(1) }
  src = readFileSync(f, 'utf8').replace(/^\s*style: '[^']*',\n/m, '')
  src = `// Copied from the skill's example "${a.from}" as a construction reference. Rewrite the subject from BRIEF.md.\n` + src
} else src = readFileSync(join(SKILL, 'template', 'piece.js'), 'utf8').replaceAll('__TITLE__', title).replaceAll('__W__', W).replaceAll('__H__', H)
if (pieceStyle) src = src.replace(/(\n\s*title: [^\n]+\n)/, `$1  style: '${pieceStyle}', // this piece only; the studio's house style is in ../house-style.json\n`)
writeFileSync(join(target, 'piece.js'), src)
writeFileSync(join(target, 'index.html'), `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>html,body{margin:0;background:#ece6dc}body{min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box}@media (prefers-color-scheme:dark){html,body{background:#1d1a17}}</style>
</head>
<body>
<div id="stage"></div>
<script type="module">
import piece from './piece.js'
import { mount } from '../lib/stage.js'
mount(piece, { house: '../house-style.json' })
</script>
</body>
</html>
`)
const brief = readFileSync(join(SKILL, 'references', 'BRIEF.md'), 'utf8')
const form = brief.slice(brief.indexOf('<!-- form -->') + 13, brief.indexOf('<!-- /form -->')).trim()
writeFileSync(join(target, 'BRIEF.md'), form.replaceAll('<title>', title).replaceAll('<W×H>', `${W}×${H}`) + '\n')
const house = JSON.parse(readFileSync(houseFile, 'utf8'))
console.log(`${fresh ? 'studio ' + studio + ' (lib copied, house style ' + house.style + ')\n' : ''}piece ${target}
  hand: ${pieceStyle ? pieceStyle + ' (this piece only)' : house.style + ' (house style)'}
next: fill BRIEF.md → write piece.js → node ${join(SKILL, 'scripts/render.mjs')} ${target} --still --at 0.3,0.6`)
