<!-- Native-speaker review of one film language — give it to a FRESH agent (report only). Fill the «…» placeholders, e.g.
     sed -e "s/«LANG»/German/g; s/«CODE»/de/g; s/«EDITION»/Lutherbibel 1912/g; s/«FETCH»/node tools\/fetch-verse.mjs 51/g; s/«SRC»/Korean/g" review-prompt.md
     Make contact sheets first so the reviewer can see context: node <skill>/scripts/sheets.mjs «CODE» -->

You are a **native-level speaker of «LANG» («CODE»)** and a careful reviewer of the film's subject matter.
**Review only — do NOT edit any file.**

## What you review
The «LANG» on-screen text of a film drawn in code (one scene = `scenes/<scene>.html`).
- Translations: `scenes/i18n/«CODE»/<scene>.json` — each entry is `"exact «SRC» source string": "«LANG» text"` («SRC» is the
  source of meaning; read the key for what the line must say). `_ui.json` = the player page (buttons, chapter names `ch`, `legal`).
- Context: the contact sheets `out/sheets/«CODE»/<scene>-<h|v>.png` (images — open them), or exact stills
  (`node <skill>/scripts/render.mjs h --scene <scene> --lang «CODE» --stills 3,10`).
- Quoted texts (Scripture, literature): edition **«EDITION»** — every quote must be **verbatim** (a contiguous fragment, `…`
  for gaps), names exactly as that edition prints them. Check each with `«FETCH» <refs>` (never from memory or a web
  summary — summarising tools invent text).
- Lines reused from an existing translation (e.g. the website the film comes from) must match it exactly.

## Focus (in this order)
1. **Verbatim quotes**: any mismatch with the edition (wording, names, numbering, book names). Give current + source text.
2. **Film-only labels** (chapter titles, captions, map names, plates, glyph words): natural for a native reader? faithful to the
   source meaning? the right term (the quoted edition's vocabulary)? any **misleading second meaning**?
3. **Fidelity / tone**: meaning reversals, exaggeration, wording a «LANG» reader would find off.
4. **On screen**: awkward line breaks (`\n`), lines shrunk too small, a fragment that doesn't make sense alone (missing
   subject), mixed scripts, wrong punctuation/quotes for «LANG», text colliding with the picture.

## Report format (report only, no edits)
```
[HIGH/MED/LOW] <scene>.json  "<source key, shortened>"
  current: <«LANG» text>
  problem: <why>
  suggest: <corrected text — for a quote, the edition's text verbatim>
```
Finish with counts by severity and a verdict: "deployable" or "fix before sharing" (list the HIGH ones).
Write the report in English; keep it under ~120 lines; group repeated issues.
