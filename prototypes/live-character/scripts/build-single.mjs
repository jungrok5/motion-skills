// node scripts/build-single.mjs <out.html> — one self-contained page (the modules inlined), for hosting where
// relative module imports are not served (an Artifact, a gist). The modules stay the source of truth.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mods = ['draw.js', 'rig.js', 'haru.js']
const varOf = (f) => '__' + f.replace(/\W/g, '_')
const imports = (src) => src.replace(/^import \{([^}]*)\} from '\.\/([\w.-]+)'\s*$/gm, (_, names, f) => `const {${names}} = ${varOf(f)}`)
let js = ''
for (const f of mods) {
  let src = readFileSync(join(root, f), 'utf8')
  const names = [...src.matchAll(/^export (?:const|function|class) (\w+)/gm)].map((m) => m[1])
  src = imports(src).replace(/^export /gm, '')
  js += `const ${varOf(f)} = (() => {\n${src}\nreturn { ${names.join(', ')} }\n})()\n`
}
let html = readFileSync(join(root, 'index.html'), 'utf8')
html = html.replace(/^<!doctype[^\n]*\n/i, '').replace(/<meta name="viewport"[^>]*>\n/, '')
html = html.replace(/<script type="module">([\s\S]*?)<\/script>/, (_, page) => `<script type="module">\n${js}\n${imports(page)}</script>`)
writeFileSync(process.argv[2], html)
console.log('wrote', process.argv[2], (html.length / 1024).toFixed(1), 'KB')
