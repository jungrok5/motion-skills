# BRIEF — 새벽빵 · Dawn Bakery

**Topic (as given):** 망원동 새벽 빵집 홈페이지를 커서 군단이 만드는 영상 — "a website for a dawn bakery, built by a swarm of cursors".

## 1. The site (what gets built)
- **Who it is for:** neighbours who walk past at 7 a.m. and want to know what is out of the oven and when.
- **Voice:** warm, short Korean lines; English only as small labels (mono kickers, the pixel banner).
- **Page:** 860 px wide, cream paper `#f6eee1`, ink brown `#2b1d14`, crust `#c8742f`, oven orange `#e85d2a`, wheat `#e9c46a`,
  card white `#fffaf2`, hairline `#e6d8c2`. Headings `serif`, body `sans`, labels `mono`, banner and sign-off `pixel`.
- **Agents:** 28, named after the dough — flour, yeast, salt, levain, crumb, crust, butter, proof, knead, rye, oven, glaze, steam, sugar.

| # | section | blocks (op) | swarm moment |
|---|---|---|---|
| 1 | nav | bar (rect) · logo 「새벽빵」 (text serif) · 3 links · 「예약」 button | — |
| 2 | hero | dawn street in pixels: sky bands from navy to orange, a half sun, rooftops, the lit shop with a striped awning, chimney steam, `BAKED AT 5AM` (paint, px 10) | **the whole swarm paints it** |
| 3 | intro | kicker · headline 「새벽 다섯 시, 첫 판이 나옵니다.」 · paragraph · oven picture (image) · 3 chips | file card flies in |
| 4 | menu | 「오늘의 빵」 · 3 cards (rect + image + name + note + price): 크루아상, 캄파뉴, 소금빵 | three pictures dropped at once |
| 5 | oven hours | 「굽는 시간표」 · a 7 × 18 heat grid (days × 05–22 h), Monday closed (empty slots), peaks at dawn, noon, 3 p.m. | **swarm fills the grid** |
| 6 | visit | 「오시는 길」 · map (image) · address · hours · 「예약하기」 button | — |
| 7 | footer | rule · sign-off line · `SEE YOU AT 5AM` (pixel) · credit | swarm gathers, page publishes |

## 2. Pictures designed for this topic (`defineArt` in index.html)
- `dawn-street` — the pixel hero (sampled at 10 px, so it reads as pixel art whatever it is drawn with).
- `croissant`, `campagne`, `saltbread` — product shots on a soft linen ground, one light from the upper left.
- `oven` — a brick oven mouth with fire and a wooden peel carrying two loaves.

## 3. Timing (≈ 37 s at 30 fps, 1080 × 1350)
prompt 3.4 s → nav 2 s → hero paint 3.4 s → intro 4 s → menu 5 s → hours 3.5 s → visit 3.5 s → footer 3 s → publish + zoom-out 6 s.
Sections are separated by `sync()` so the camera reaches each one before work starts there.

## 4. Review (score each still 1–5; ship at ≥ 4 everywhere)
| check | what to look for |
|---|---|
| swarm reads | at every moment several cursors are visibly *doing* something (dragging, typing, carrying, painting), not drifting |
| build grammar | selection box + size tag while dragging, red guides at the snap, I-beam + caret while typing, file card → drop → blocks resolve |
| the site is good | at the end the zoomed-out page is a site you would publish: aligned columns, consistent spacing, nothing overlapping |
| topic, not template | every block, word and picture is about the bakery; no portfolio leftovers |
| legible | body text ≥ 14 px on screen, Korean renders in the bundled font (check passes) |
