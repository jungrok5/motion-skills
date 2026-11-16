# Topic → brief, and the review lists

The film is a product launch told as an agent doing the work while you watch: it greets the user, learns them, looks
at their world, asks one question, does a thing at scale, hands over results, and says it is done. The brief turns any
product (an app, a service, an AI agent, a shop, a club) into that arc. Write it as `BRIEF.md` (templates/BRIEF.md)
before code.

## Filling the brief
1. **The one line first.** What a customer would say after watching ("one photo of the fridge, a week of dinners").
   It becomes the end card and decides which scenes earn their place.
2. **The arc.** Pick 4–10 of these beats; keep the order, drop what the product does not do:
   hello (greeting + the mascot wakes + one input) → learn (what it knows about the user: a stack of cards) →
   look (what it reads: a carousel and a counter) → ask (chat: the agent proposes, the user adds one wish) →
   do (the output appears: a pair, a poster, a list) → scale (a swarm or a row: many of them) → act (one button, a
   cursor, a confirmation chip) → result (before / after bars) → end (mascot says done, the one line).
3. **Words.** Every readable line ≤ 8 words, said the way a person types in a chat. One or two accent words per line,
   on the thing that matters (a number, a name, a deadline). Numbers are real or clearly illustrative; never invent a
   claim about a real company.
4. **Mascot.** An object from the topic's world with a dot-matrix screen (references/MASCOT.md). Its screen words are
   short: a name, a verb, a state.
5. **Cards and drawings.** List what each card shows and which part is texture (meta lines, sliders, rows) and which
   must be read (title, one line, one number). Design drawings for the topic (ingredient tiles, receipts, tickets,
   floor plans …) in a module (`art.js`); never paste screenshots of real products or people.
6. **Hand-overs.** Choose per scene: `recede` (default: pieces fall back and blur), `push` (the camera flies through —
   for a big change of subject), `whip` (sideways — for "and then"), `rise`. No hard cuts.
7. **Length.** Readable time sets it: ~0.7 s + 0.24 s per word for every line, after it has finished typing. A scene
   is 4–8 s; the film 15–60 s.

## Still review (score each sheet frame; any "no" is fixed before rendering)
- Is there one thing to read, and is it obviously the sharpest, nearest thing in the frame?
- Does the depth read: something in focus, something soft behind (or in front), a glow behind the subject?
- Is the accent only on the words / button / bar that matter?
- Is the ground bright and the type near-black with tight tracking?
- Would this frame make sense with the sound off?
- Is everything designed for this topic (no template receipts or example rice cooker left in)?
- Mascot: is its screen legible at this size? Is it an object, not a character with limbs?

## Motion review (play the preview; any "yes" is fixed)
- Does anything appear without moving in (no pop from nothing, no fade in place)?
- Does a hand-over jump (`check.mjs` prints the biggest frame-to-frame change)?
- Is anything perfectly still for more than a second? (Every piece floats; the mascot bobs and breathes steam / sparks.)
- Does a counter, typing or a bubble run faster than you can follow?
- Does a big move start and stop dead? (Springs overshoot and settle; the mascot dips before it nods.)
