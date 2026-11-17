// Load a project's pure-JS timing (config, gait, shots) in Node, without a browser.
// colossus.js must import nothing (it is plain data + shot functions), so it can be copied next to the engine files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function engineDir(dir) {
  const own = path.join(dir, 'engine');
  return fs.existsSync(path.join(own, 'main.js')) ? own : path.join(SKILL, 'engine');
}

export async function loadProject(dir) {
  dir = path.resolve(dir);
  const src = path.join(dir, 'colossus.js');
  if (!fs.existsSync(src)) throw new Error(`no colossus.js in ${dir}`);
  const eng = engineDir(dir);
  const code = fs.readFileSync(src, 'utf8');
  if (/^\s*import\s/m.test(code)) throw new Error('colossus.js must not import anything (keep it plain data + shot functions)');
  const h = crypto.createHash('md5').update(code + fs.readFileSync(path.join(eng, 'gait.js'), 'utf8') + fs.readFileSync(path.join(eng, 'config.js'), 'utf8')).digest('hex').slice(0, 10);
  const tmp = path.join(os.tmpdir(), 'colossus-' + h);
  fs.mkdirSync(path.join(tmp, 'engine'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'colossus.js'), code);
  for (const f of ['config.js', 'gait.js', 'shots.js']) fs.copyFileSync(path.join(eng, f), path.join(tmp, 'engine', f));
  const imp = (f) => import(pathToFileURL(path.join(tmp, 'engine', f)).href);
  const config = await imp('config.js');
  const gait = await imp('gait.js');
  const shots = await imp('shots.js');
  return { dir, eng, config, gait, shots, colossus: await import(pathToFileURL(path.join(tmp, 'colossus.js')).href) };
}
