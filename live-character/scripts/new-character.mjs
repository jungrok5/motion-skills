// node <skill>/scripts/new-character.mjs <dir> [--from haru|bori]
// Starts a character project: lib/ (the engine and kit), character.js (the closest worked example as a construction
// reference: a person -> haru, an animal -> bori), index.html (the player), BRIEF.md (the template to fill first).
// Then: write BRIEF.md from the topic, redesign character.js from it (references/CHARACTER.md), check, sheet, render.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { args } from './_lib.mjs'
const skill = join(dirname(fileURLToPath(import.meta.url)), '..')
const a = args(process.argv.slice(2), { from: 'haru' })
const dir = resolve(a._[0] || 'my-character')
if (!existsSync(join(skill, 'examples', a.from, 'character.js'))) { console.error(`--from ${a.from}: no such example (haru, bori)`); process.exit(1) }
if (existsSync(join(dir, 'character.js'))) { console.error(`${dir} already has a character.js`); process.exit(1) }
mkdirSync(dir, { recursive: true })
cpSync(join(skill, 'lib'), join(dir, 'lib'), { recursive: true })
const id = basename(dir).replace(/[^\w-]/g, '-').toLowerCase()
let src = readFileSync(join(skill, 'examples', a.from, 'character.js'), 'utf8').replaceAll("'../../lib/", "'./lib/")
src = src.replace(/id: '[^']*'/, `id: '${id}'`)
src = `// ${id}/character.js — started from examples/${a.from} as a construction reference. Redesign every part from BRIEF.md:\n// silhouette, palette, hair / ears / tail, clothes, face, poses, moves, actions, expressions, temper, demo.\n` + src
writeFileSync(join(dir, 'character.js'), src)
writeFileSync(join(dir, 'index.html'), readFileSync(join(skill, 'examples', a.from, 'index.html'), 'utf8').replaceAll("'../../lib/", "'./lib/").replace(/<title>[^<]*<\/title>/, `<title>${id} · live-character</title>`))
if (!existsSync(join(dir, 'BRIEF.md'))) writeFileSync(join(dir, 'BRIEF.md'), readFileSync(join(skill, 'references', 'BRIEF.md'), 'utf8'))
console.log(`started ${dir} (from ${a.from})
next:
  1. fill BRIEF.md from the topic
  2. redesign character.js from it (see ${join(skill, 'references', 'CHARACTER.md')})
  3. node ${join(skill, 'scripts', 'check.mjs')} ${dir}
  4. node ${join(skill, 'scripts', 'sheet.mjs')} ${dir}     -> out/sheet.png, score it (references/BODY-CHECK.md)
  5. node ${join(skill, 'scripts', 'render.mjs')} ${dir}    -> out/demo.mp4`)
