# SOURCE — what this skill was made from

**Post:** ぬこー様ちゃん (@nukosama, a manga artist), X, 18 Nov 2026 —
https://x.com/nukosama/status/2123025321620644032?a=LlKRf28dkLpGafIAw10&s=19

> この漫画、背景全部AIで作りました。３Dモデルの作成がかなり早くなったので、かなり実用的になったと思います。
> ("I made every background in this manga with AI. Making 3D models has become much faster, so I think it is quite
> practical now.")

It quotes the artist's own manga page (コンカフェ嬢と余命半年おじさん 1/2: a café interior drawn in loose pen lines over flat
sepia tones, characters drawn by hand on top) and carries a 35 s 1280×720 video.

## The video, beat by beat (watched at 1 fps)

| t | what it shows | caption |
|---|---|---|
| 0–2 s | a cluttered student's room as a grey clay 3D model; letterbox; location name top-left, 「3Dモデル」 top-right | この部屋、3Dでできている。 |
| 2–5 s | a vertical wipe: the same view turns into a manga background (loose overshooting pen lines, light grey flat tones, white window with diagonal glare); the label flips to 「漫画の背景」 | そのまま漫画の背景になる。 |
| 5–10 s | a classroom after school from several angles (ceiling panels, desks, blackboard), a school corridor in deep one-point perspective | どこからでも、何枚でも。 |
| 10–17 s | a convenience store (signs over the aisles, shelves of goods), an izakaya counter with bottle shelves | 看板の字も、棚の商品も。 |
| 17–21 s | a train interior with straps; a shopping street, first as clay then as manga | 街も、まるごと。 |
| 21–30 s | a summer festival at night (torii, lantern rows glowing, dark sky, conifers), an entertainment street at night | 夜も。 |
| 30–35 s | black card | 手で描いた線は、1本もない。 / 漫画の背景を3Dから描く道具（開発中） |

Look: black letterbox (about 10 % top and bottom); a handwritten font for every text; hard cuts; each shot a slow
camera move; lines black with overshoot at corners, small ink dots at stroke ends, some doubled strokes; 3–4 flat
greys with soft marker edges; windows white with diagonal glare; at night a near-black sky, white glowing lanterns
and windows with bloom, mid-grey surfaces.

## What this skill takes

- The **format**: clay model → wipe → manga background, one location per beat, letterbox with location name, mode
  label and caption, a closing card.
- The **look** of the backgrounds: pen lines found from the 3D edges and drawn with a pen's habits, flat quantised
  greys, glass glare, night glow; plates (line layer, tone layer) an artist can put under their own characters.
- The **idea** that one built set gives any number of angles.

## What it does not take

- The artist's locations, rooms, signs, captions or manga page; the video's frames; its font.
- AI-generated 3D models: the post's sets were made with an AI 3D tool; here sets are built in code from a kit
  (`lib/kit.js`, `lib/props.js`) and a piece's own `scenes.js`. A GLB can be loaded (`S.model`) — your own, or a
  Polyfork model under `references/3D-MODELS.md` — but none is committed.
- Characters. The backgrounds are the product; people are drawn by the artist on top.
