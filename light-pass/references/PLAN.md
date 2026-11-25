# The light plan

A plan is JSON. Positions are fractions of the frame (`[0, 0]` top left, `[1, 1]` bottom right; outside the frame is fine,
a sun above it is `y < 0`). Widths and radii are fractions of the frame's width. Any number or point may be keyframed:
`[[t0, v0], [t1, v1], …]` — eased between keys, held before the first and after the last.

```json
{
  "sun": [0.44, 0.02],
  "color": [1.0, 0.86, 0.6],
  "auto":  { "amount": 0.6, "threshold": [0.6, 0.9], "pale": 0.6, "high": 0.6, "region": [0, 0, 1, 1], "decay": 0.968, "length": 0.9 },
  "beams": [ { "from": [0.40, 0.08], "to": [0.20, 0.80], "width": [0.016, 0.10], "gain": 0.5, "soft": 0.7, "falloff": 1.4, "shimmer": 0.15, "drift": 0.35 } ],
  "pools": [ { "at": [0.22, 0.75], "radius": [0.11, 0.026], "rotate": -6, "gain": 0.28, "soft": 0.8, "warmth": 0.6 } ],
  "halo": { "size": 0.12, "gain": 0.18 },
  "haze": 0.05, "shade": 0.22, "occlusion": 0.75,
  "grade": { "warm": 0.5, "lift": 0.02, "contrast": 1.08, "saturation": 1.1, "vignette": 0.3, "exposure": 1.0 }
}
```

| field | default | what it does · how to set it |
|---|---|---|
| `sun` | `[0.5, -0.1]` | where the light comes from. In frame: on the brightest gap. Off frame: where the shadows point away from. |
| `color` | `[1, 0.86, 0.62]` | the light's colour (linear-ish RGB 0–1). Amber morning, near white noon, `[0.86, 0.93, 1]` winter. |
| `auto.amount` | 0.6 | strength of the scattered rays: light carried from every gap away from the sun. 0 turns them off. |
| `auto.threshold` | `[0.55, 0.85]` | brightness at which a pixel starts / fully counts as a gap. Raise both on a bright picture (snow). |
| `auto.pale` | 0.6 | how much colourful pixels are refused as gaps (leaves lit green are not sky). |
| `auto.high` | 0 | only the top `high` of the frame can be a gap (0 = anywhere). Keeps bright ground from shining up. |
| `auto.region` | `[0,0,1,1]` | the box (x0, y0, x1, y1) where gaps are looked for — a window, the canopy. |
| `auto.decay`, `auto.length` | 0.965, 0.85 | how far the rays carry (decay per step, length of the march toward the sun). |
| `beams[]` | — | hand-placed shafts (≤ 16): `from` (the gap), `to` (where it lands), `width` `[at gap, at foot]`, `gain` (0.45), `soft` (0.7: 0 hard edge … 1 very soft), `falloff` (1.4: how fast it fades along), `shimmer` (0.15), `drift` (0.35 rad/s sway), `phase`, `free` (true: not from the sun) |
| `pools[]` | — | light lying on a surface (≤ 8): `at`, `radius` `[rx, ry]` (flat on the ground: ry ≈ rx / 4), `rotate` (degrees), `gain` (0.25), `soft` (0.8), `warmth` (0.6: how much of the light's colour) |
| `halo` | size 0.12, gain 0.25 | the glow round the sun. Lower it when the sun is off frame. |
| `haze` | 0.06 | the air taking the light's colour where the rays are. More in mist, dust, snowfall. |
| `shade` | 0.18 | what the light misses sinks by this much — the contrast that makes shafts read. |
| `occlusion` | 0.75 | how much a beam dims over dark things (trunks, frames), as if it passed behind them. |
| `grade` | warm 0.4, lift 0.02, contrast 1.05, saturation 1.08, vignette 0.25, exposure 1 | the picture's grade under the light. `warm` < 0 cools. |

## Placing it (in the mask view)

1. **Sun.** In frame, on the hottest gap; off frame, beyond the edge the shadows run away from. The mask view marks it with a
   cross.
2. **Main beams (3–7).** Each starts at a real gap (`from`) and runs away from the sun to where it lands (`to`). Vary the
   widths (narrowest 0.004–0.02 at the gap, 0.03–0.14 at the foot) and the spacing. Longer beams: lower `falloff`.
3. **Thin beams (1–3).** `width` under 0.03 at the foot, a little more `shimmer` — the sparkle between the big ones.
4. **Pools.** Where the brightest beams land, flattened to the surface (`ry` ≈ `rx` / 4 on the ground, rotated to its slope).
5. **Auto rays.** Turn `auto.amount` up until the gaps glow along their own shapes; limit with `high` or `region` if the
   ground or snow starts shining.
6. **Halo, haze, shade, grade.** Last, and lightly; `check.mjs` says when it washes or blows out.
