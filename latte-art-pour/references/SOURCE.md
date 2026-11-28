# Source

Made from the Threads post by @ujae_ — https://www.threads.com/share/BAJMYuMY94
(canonical: https://www.threads.com/@ujae_/post/DgOmBZzDIso). The post (Korean) shares a latte-art simulator made by a
motion designer in New Zealand: "it takes a while to understand and get used to, but for anyone who has poured latte
art it is seriously addictive". Two clips (19 s and 14 s, 720×1280): a top-down cup, a pour point that the player
raises and lowers, a rosetta built by rocking and pulling back, a tulip of stacked pushes, a final draw-through. The
author's reply names the simulator, PourLatte (pourlatte.com, also on Google Play).

## What this skill takes
- The idea: latte art from above, drawn by a simulated pour rather than painted — height decides white or not, rocking
  makes leaves, pushing stacks, a thin high stream cuts through.
- What the clips show about the physics: the spout sits at the back edge of what it pours; foam is pushed forward and
  outward and piles into thin bands at the rim; the stream drags brown between lobes; the cut pulls leaves into chevrons.

## What it does not take
- No code, UI, layout, name, icons, colours or controls of the simulator. The model (`lib/latte.js`), the score, the
  film (camera, cup, pitcher, words, strip, sound) and the hands-on page are written here from scratch.
- No frames or clips of the source in the repo or on the site (they were watched in a scratch folder only).
- It is a film skill: a topic → a designed cup and figure → an MP4. The `?play=1` page is a small hands-on extra.
