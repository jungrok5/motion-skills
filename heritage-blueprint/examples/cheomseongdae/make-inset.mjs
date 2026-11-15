#!/usr/bin/env node
// Draw the corner diagram (a schematic south elevation) from the same parameter block that
// geometry.js uses, so the diagram and the model share one source. Run from this folder:
//   node make-inset.mjs            -> writes inset.html
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'geometry.js'), 'utf8');
const block = src.match(/\/\/ @params-start\s*const P = ([\s\S]*?);\s*\/\/ @params-end/);
if (!block) throw new Error('geometry.js has no @params block');
const P = JSON.parse(block[1]);

// Same C2 profile as the runtime's smoothProfile (natural cubic spline in height).
function spline(points, steps = 10) {
  const n = points.length, h = [], a = [], b = [], c = [], d = [], m = Array(n).fill(0), out = [];
  for (let i = 0; i < n - 1; i++) h[i] = points[i + 1][0] - points[i][0];
  for (let i = 1; i < n - 1; i++) {
    a[i] = h[i - 1]; b[i] = 2 * (h[i - 1] + h[i]); c[i] = h[i];
    d[i] = 6 * ((points[i + 1][1] - points[i][1]) / h[i] - (points[i][1] - points[i - 1][1]) / h[i - 1]);
    if (i > 1) {const k = a[i] / b[i - 1]; b[i] -= k * c[i - 1]; d[i] -= k * d[i - 1];}
  }
  for (let i = n - 2; i > 0; i--) m[i] = (d[i] - c[i] * m[i + 1]) / b[i];
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < steps; k++) {
    const t = k / steps, u = 1 - t;
    out.push([points[i][0] + t * h[i], u * points[i][1] + t * points[i + 1][1] + ((u ** 3 - u) * m[i] + (t ** 3 - t) * m[i + 1]) * h[i] * h[i] / 6]);
  }
  out.push(points.at(-1));
  return out;
}

const pl = P.platform, z0 = pl.lowerH + pl.upperH, H = P.body.height / P.body.courses;
const top = z0 + P.body.height, total = top + P.frame.tiers * P.frame.tierH;
const s = 172 / total, cx = 112, gy = 236;                 // px per metre, axis, ground line
const X = x => (cx + x * s).toFixed(1), Y = z => (gy - z * s).toFixed(1);
const prof = spline(P.body.profile).map(([z, r]) => [z + z0, r]);
const R = z => {for (let k = 1; k < prof.length; k++) if (z <= prof[k][0]) {const [za, ra] = prof[k - 1], [zb, rb] = prof[k]; return ra + (rb - ra) * (z - za) / (zb - za);} return prof.at(-1)[1];};
const right = prof.map(([z, r]) => `${X(r)} ${Y(z)}`), left = prof.slice().reverse().map(([z, r]) => `${X(-r)} ${Y(z)}`);
const body = `M${right.join('L')}L${left.join('L')}Z`;
const box = (x0, z, w, h) => `M${X(x0)} ${Y(z)}H${X(x0 + w)}V${Y(z + h)}H${X(x0)}Z`;
const wz0 = z0 + (P.window.fromCourse - 1) * H, wz1 = z0 + P.window.toCourse * H, ww = P.window.width / 2;
const half = P.frame.span / 2;
const r0 = P.body.profile[0][1], r1 = P.body.profile.at(-1)[1];
const dx = 28;                                               // height dimension line x
const svg = `  <figure class="siteplan" aria-label="남쪽 입면 비례 개요: 높이 약 8.8 m(보도값), 몸통 밑지름 약 ${(2 * r0).toFixed(1)} m, 윗지름 약 ${(2 * r1).toFixed(1)} m(도면 추정), 창은 13–15단. Schematic south elevation; proportions from a published survey drawing.">
    <svg viewBox="0 0 200 250" role="img" aria-label="첨성대 남쪽 입면 개요 / Cheomseongdae schematic south elevation">
      <text x="0" y="16" class="plan-heading">남쪽 입면 개요</text>
      <text x="0" y="31" class="plan-sub" lang="en">SOUTH ELEVATION</text>
      <path d="${box(-pl.lowerSide / 2, 0, pl.lowerSide, pl.lowerH)}${box(-pl.upperSide / 2, pl.lowerH, pl.upperSide, pl.upperH)}" fill="none" stroke="currentColor" stroke-width=".8"/>
      <path d="${body}" fill="none" stroke="currentColor" stroke-width=".9"/>
      <path d="${Array.from({length: P.body.courses - 1}, (_, k) => {const z = z0 + (k + 1) * H, r = R(z); return `M${X(-r)} ${Y(z)}H${X(r)}`;}).join('')}" fill="none" stroke="currentColor" stroke-width=".35" opacity=".45"/>
      <path d="${box(-ww, wz0, 2 * ww, wz1 - wz0)}" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width=".8"/>
      <path d="${box(-half, top, 2 * half, P.frame.tierH)}${box(-half, top + P.frame.tierH, 2 * half, P.frame.tierH)}" fill="none" stroke="currentColor" stroke-width=".8"/>
      <path d="M${dx} ${Y(0)}V${Y(total)}M${dx - 4} ${Y(0)}H${dx + 4}M${dx - 4} ${Y(total)}H${dx + 4}" class="dimension"/>
      <text x="${dx - 6}" y="${Y(total / 2)}" class="plan-sub" text-anchor="middle" transform="rotate(-90 ${dx - 6} ${Y(total / 2)})">약 8.8 m · 보도</text>
      <path d="M${X(-r0)} ${(gy + 8).toFixed(1)}H${X(r0)}M${X(-r0)} ${(gy + 4).toFixed(1)}V${(gy + 12).toFixed(1)}M${X(r0)} ${(gy + 4).toFixed(1)}V${(gy + 12).toFixed(1)}" class="dimension"/>
      <text x="${cx}" y="${(gy + 21).toFixed(1)}" text-anchor="middle" class="plan-sub">밑지름 ≈ ${(2 * r0).toFixed(1)} m · 추정</text>
      <text x="${X(ww + .25)}" y="${Y((wz0 + wz1) / 2 - .12)}" class="plan-sub">← 13–15단</text>
    </svg>
  </figure>
`;
fs.writeFileSync(path.join(here, 'inset.html'), svg);
console.log('inset.html written: total', total.toFixed(2), 'm, base Ø', (2 * r0).toFixed(2), 'm, top Ø', (2 * r1).toFixed(2), 'm');
