// lib/styles/index.js — the 32 hands. Each is lib/styles/<id>.js exporting a style object:
//   { id, name, ko, medium, mark, edge, order, palette, paper, bestFor, defaults, draw(D, S, K, opts) }
// Grouped for the picker; the order inside a group is the order on the gallery sheet.
export const GROUPS = [
  { key: 'pencil', ko: '연필 · 펜 · 마른 재료', ids: ['watercolour', 'storybook', 'coloured-pencil', 'ballpoint', 'crayon', 'charcoal', 'chalkboard', 'stipple'] },
  { key: 'ink', ko: '잉크 · 붓', ids: ['line-wash', 'sumi-e', 'marker-comic', 'rubber-hose', 'scratchboard', 'engraving'] },
  { key: 'paint', ko: '물감', ids: ['oil', 'broken-colour', 'dream-glaze', 'mid-century', 'folk-tale'] },
  { key: 'print', ko: '인쇄 · 판화', ids: ['woodblock', 'risograph', 'halftone', 'blueprint', 'scrapbook'] },
  { key: 'craft', ko: '종이 · 실 · 블록', ids: ['cut-paper', 'toy-theatre', 'embroidery', 'toy-brick'] },
  { key: 'digital', ko: '디지털 · 기하', ids: ['flat-vector', 'isometric', 'low-poly', 'pixel-art'] },
]
export const STYLE_IDS = GROUPS.flatMap((g) => g.ids)
export const DEFAULT_STYLE = 'watercolour'

const cache = new Map()
/** load one style module by id (works in the browser and in node) */
export async function loadStyle(id) {
  if (!STYLE_IDS.includes(id)) throw new Error(`unknown style "${id}". Styles: ${STYLE_IDS.join(', ')}`)
  if (!cache.has(id)) cache.set(id, import(`./${id}.js`).then((m) => m.default))
  return cache.get(id)
}
export async function loadAll() {
  const out = []
  for (const id of STYLE_IDS) { try { out.push(await loadStyle(id)) } catch (e) { /* a style not written yet */ } }
  return out
}
