# Starter fonts (subsets)

So the quick start renders on a machine with no Korean fonts and no network, the starter ships **subsets** of three
SIL Open Font License 1.1 families from Google Fonts, cut to the characters in `scenes/` only:

| file | family (as named in film.json) | licence |
|---|---|---|
| `Jua-starter.ttf` | Jua (Woowahan Brothers) — dialogue balloons | `OFL-jua.txt` |
| `BlackHanSans-starter.ttf` | Black Han Sans (Zess Type) — shouts, SFX | `OFL-blackhansans.txt` |
| `NotoSansKR-starter.ttf` | Noto Sans KR — the ✱ caption tags | `OFL-notosanskr.txt` |

Made with `pyftsubset <font> --text-file=<every character in scenes/*.html, *.js> --layout-features=*`.

**Change a line of text and a glyph may be missing.** For your own film install the full fonts (Google Fonts: Jua,
Do Hyeon, Black Han Sans, Nanum Pen Script, Gaegu, Noto Sans KR, Noto Serif KR) into `$FONTS_DIR`
(default `~/.local/share/fonts`) and name the full TTFs in `film.json` — `scripts/new-film.py` writes that film.json.
render.mjs looks in the project's `fonts/` first, then `$FONTS_DIR`.
