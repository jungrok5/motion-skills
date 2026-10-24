import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scenes');
const destination=process.argv[2]||path.resolve(root,'../out/summer-crossing-motion.html');
const assets={},json={};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='ref')walk(p);}else if(e.name.endsWith('.webp'))assets[path.relative(root,p).split(path.sep).join('/')]='data:image/webp;base64,'+fs.readFileSync(p).toString('base64');else if(e.name.endsWith('.json'))json[path.relative(root,p).split(path.sep).join('/')]=JSON.parse(fs.readFileSync(p,'utf8'));}}
walk(path.join(root,'art'));
let html=fs.readFileSync(path.join(root,'crossing-motion.html'),'utf8');
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
html=html.replace('<body>','<body><script>window.MOTION_ASSETS='+safe(JSON.stringify(assets))+';window.MOTION_JSON='+safe(JSON.stringify(json))+';</script>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,p)=>'<script>\n'+safe(fs.readFileSync(path.join(root,p),'utf8'))+'\n</script>');
html=html.replace('url("motion-serif.woff2")','url("data:font/woff2;base64,'+fs.readFileSync(path.join(root,'motion-serif.woff2')).toString('base64')+'")');
if(/<script[^>]+src=|<link[^>]+href=/.test(html))throw Error('External dependency in deliverable');
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,html);
console.log(JSON.stringify({file:destination,bytes:Buffer.byteLength(html),images:Object.keys(assets).length,json:Object.keys(json).length}));
