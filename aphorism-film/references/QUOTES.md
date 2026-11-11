# QUOTES — choosing, checking and setting the lines

The words on screen are the film's script, and they carry someone's name. A wrong attribution in big type is worse than
no film. Rules:

## Choose
- **5–8 lines** that together say one thing about the topic (the brief's THREAD). Order them as an argument: thesis →
  consequence → scale → threat/turn → answer → the thesis again (the loop).
- **Short.** 3–12 words set well; up to ~16 if part of it can be small italics. Cut with an ellipsis only at a clause
  boundary, never to change the meaning.
- **Public domain.** The author died long ago AND the wording is the original or a translation published before 1930
  (Jowett, Adams, Long, Carter, Fairclough, Bury 1926 …) or your own literal translation of the original. Never set a
  modern copyrighted translation (e.g. a 2002 Meditations) or a living author's words without permission.
- **Original language as the kicker** where it is famous and short (*Carpe diem*, *Ars longa, vita brevis*, *Cogito,
  ergo sum*): tracked caps above the translation. It is texture and a citation at once.
- **The user's own lines** (a company's values, a speech, a poem they wrote) are fine — attribute them as they say.

## Check (every line, before writing the brief)
1. Find the line in the work: book / chapter / section or year (`src`). If you cannot name where it comes from, do not use it.
2. Watch the famous misattributions: "Be the change you wish to see" (not Gandhi's words), "We are what we repeatedly do"
   (Will Durant summarising Aristotle), "The only constant is change" (a paraphrase of Heraclitus), "Insanity is doing the
   same thing…" (not Einstein), "Knowledge is power" in that exact form (Hobbes popularised it; Bacon wrote *ipsa scientia
   potestas est*, "knowledge itself is power"). When the popular form is not the author's, set the author's form — or
   attribute the popular form to whoever said it.
3. Write `by` as the author ("Plato, quoting a proverb" when he cites one) and `src` as the work and place
   ("Georgics III, 284", "Poor Richard's Almanack, 1748"). check.mjs does not check facts; you do.

## Set (see TYPE.md)
- One idea per line of type. Break before the word that should be big: "Lost / **time** is never / **found** again."
- The big words are nouns and verbs that carry the thought (time, found, life, art, why, free); the small italics are the
  joints (is, never, of all, can bear). Articles and prepositions are never big.
- Keep the author's punctuation; a full stop on the last big word gives the stack its end.
- Non-Latin scripts (Korean, Japanese …): the bundled fonts cover Latin only. Add a font with `addFont('AF Didone KR',
  './fonts/<file>.woff2')` and set `FALLBACK.serif = '"AF Didone KR"'` before the film starts; subset it to the
  characters you use (an OFL Korean serif such as Noto Serif KR is 5 MB whole, ~60 KB subset). `bundle.mjs` inlines
  `./fonts/` too.
