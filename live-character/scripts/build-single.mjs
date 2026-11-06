// node <skill>/scripts/build-single.mjs <project> <out.html>
// One self-contained page: lib/ and character.js inlined into the project's index.html, for hosting where relative
// module imports are not served (an Artifact, a gist). The project stays the source of truth.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { project } from './_lib.mjs'
const prj = project(process.argv[2] || '.')
const out = process.argv[3] || join(prj.dir, 'out', 'single.html')
const mods = [['draw.js', join(prj.root, 'lib/draw.js')], ['rig.js', join(prj.root, 'lib/rig.js')], ['parts.js', join(prj.root, 'lib/parts.js')],
  ['stage.js', join(prj.root, 'lib/stage.js')], ['character.js', join(prj.dir, 'character.js')]]
const v = (f) => '__' + f.replace(/\W/g, '_')
const imports = (src) => src
  .replace(/^import \{([^}]*)\} from '[^']*?([\w-]+\.js)'\s*$/gm, (_, names, f) => `const {${names}} = ${v(f)}`)
  .replace(/^import (\w+) from '[^']*?([\w-]+\.js)'\s*$/gm, (_, name, f) => `const ${name} = ${v(f)}.default`)
let js = ''
for (const [f, path] of mods) {
  let src = readFileSync(path, 'utf8')
  const names = [...src.matchAll(/^export (?:const|function|class) (\w+)/gm)].map((m) => m[1])
  const hasDefault = /^export default /m.test(src)
  src = imports(src).replace(/^export default /m, 'const __default = ').replace(/^export /gm, '')
  js += `const ${v(f)} = (() => {\n${src}\nreturn { ${names.join(', ')}${hasDefault ? (names.length ? ', ' : '') + 'default: __default' : ''} }\n})()\n`
}
let html = readFileSync(join(prj.dir, 'index.html'), 'utf8')
html = html.replace(/^<!doctype[^\n]*\n/i, '').replace(/<html[^>]*>\n?/, '').replace(/<\/html>\n?/, '').replace(/<meta charset[^>]*>\n?/, '').replace(/<meta name="viewport"[^>]*>\n?/, '').replace(/<\/?body>\n?/g, '')
html = html.replace(/<script type="module">([\s\S]*?)<\/script>/, (_, page) => `<script type="module">\n${js}\n${imports(page)}</script>`)
html = html.replace(/(<title>[^<]*<\/title>)/, '$1\n<meta name="claude:viewport-fit-sides" content="cover">')
writeFileSync(out, html)
console.log('wrote', out, (html.length / 1024).toFixed(1), 'KB')
