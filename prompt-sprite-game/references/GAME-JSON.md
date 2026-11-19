# game.json — the game as data

Everything a game is, in one file the engine reads. The examples (`examples/lighthouse-cat/`, `examples/mushroom-basket/`)
are full instances; the starters in `templates/` are the smallest valid shape.

```jsonc
{
  "title": "등대 고양이",                 // shown on the title card and the page
  "seed": 7,                              // world RNG (enemy decisions, particles, tile speckle)
  "kind": "platform",                     // "platform" (side view) | "arena" (top-down)
  "view": { "w": 320, "h": 192 },         // logical pixels; tiles are 16 px, so 20 × 12 tiles on screen
  "text": { "intro": "…", "win": "…", "lose": "…", "needMore": "FISH 5" },  // needMore: ASCII, drawn in the pixel font
  "rules": { "win": "goal", "need": 5, "lives": 3, "time": 0 },
  //   platform: win "goal" (reach the goal with `need` items) | "collect"
  //   arena:    win "collect" (all items, or `need`) | "survive" (last until `time` runs out); time in seconds, 0 = none
  "palette": { "bg": "#…", "ink": "#…", "heart": "#…", "dust": "#…", "poof": "#…", "shadow": "rgba(…)", "hudBg": "rgba(…)" },
  "colors": { "k": "#1d1626", "w": "#f4ecdc" },   // colours shared by every hand grid (outline, white …)
  "backdrop": [ /* layers, back to front — see below */ ],
  "floor": { "look": "grass", "colors": ["base", "dark", "light"],     // arena only: the ground under everything
             "decor": [{ "kind": "flower", "color": "#f6f0e0", "center": "#f2c22a", "density": 0.12 }] },  // flower | tuft | pebble | patch
  "tiles": {
    "#": { "look": "rock",   "colors": ["base", "dark", "light"] },                 // solid
    "=": { "look": "plank",  "colors": [ … ], "oneway": true },                     // stand on it, jump up through it
    "^": { "look": "spikes", "colors": [ … ], "hazard": true },                     // hurts
    "~": { "look": "water",  "colors": [ … ], "hazard": true, "pit": true }         // a fall: back to the last safe footing
  },
  "legend": { "P": "cat", "f": "fish", "c": "crab", "s": "gull", "L": "lamp" },   // level character → cast key
  "cast": {
    "cat": {
      "role": "player",                 // player | item | enemy | goal
      "name": "고양이",                 // shown under the sprite on the title card
      "prompt": "orange tabby cat",     // Tessera prompt: 1–4 plain English words
      "seed": 7, "pick": 0,             // which painting: seed, and which of the four (0–3)
      "faces": "right",                 // which way the drawing looks: right | left | front
      "mass": 1.0,                      // 0.4–4: sets every timing (references/MOTION.md)
      "gait": "hop",                    // hop | glide | still
      "body": [12, 13],                 // optional collision box w × h in px (default 12 × 13; items 10 × 10)
      "colors": { "o": "#ee8a3c" },     // this grid's own colours
      "pixels": [ "16 strings of 16 characters; '.' is transparent" ]
    },
    "crab": { "role": "enemy", "move": "patrol", "speed": 0.55, "…": "…" },
    //   move: patrol (platform: walk, turn at walls / ledges / hazards; glide: fly back and forth within `range` tiles)
    //         wander (arena: a new direction now and then) | chase (arena: aims at the player within `sight` px) | still
    //   stompable: false — cannot be stomped (platform); turnAtLedge: false — walks off ledges
    "fish": { "role": "item", "gait": "still", "sparkle": "#d8f0ff", "…": "…" }
  },
  "level": [ "rows of equal length; '.' empty, tile characters, legend characters" ],
  "physics": { "gravity": 0.32, "jump": 5.6, "speed": 1.6, "airAccel": 0.18, "maxFall": 6, "pounce": 3.2 },  // optional
  "tune": { "bpm": 96, "lead": "D5 . F5 …", "bass": "D3 . . …", "arp": "…", "waves": { "lead": "triangle" }, "vols": { "lead": 0.1 } },
  "ui": { "paint": "…" },               // optional: override any title-screen label (see DEFAULT_UI in lib/engine.js)
  "credit": "…"                          // the line under the canvas when the hand sprites are on screen
}
```

## Placing things in the level

- A walker (player, ground enemy) is placed on the cell it **stands in**: the tile below it is its ground.
- An item or a flyer is placed where it floats; check.mjs's reach test counts an item reached if the jump arc from a
  reachable footing passes through its cell.
- Default jump: apex 46 px (2.9 tiles), about 3.5 tiles across at full speed. So: a step up of 2 tiles, a gap of 2–3
  tiles, a one-way plank 2 tiles above the ground. Three tiles up is out of reach (check.mjs will say which target).
- Arena: border the map with a solid tile; the reach test floods from the player over open floor.

## Tile looks

`rock`, `stone`, `brick`, `grass` (a fourth colour is the grass cap), `dirt`, `sand`, `snow`, `plank`, `metal`, `ice`,
`hedge`, `cloud` (see-through edges), `spikes`, `water` / `lava` (a surface line and depth), `pond` (seamless water,
for an arena), `stump` (a round trunk top, for an arena). An exposed top gets a cap or a highlight automatically.
A new look is a `case` in `tileArt` in your project's copy of `lib/engine.js` — keep it to the same palette logic
(base / dark / light) so it sits with the rest.

## Backdrop layers

`gradient` (colors top → bottom, dithered bands) · `stars` (count, bottom, color, color2) · `moon` / `sun` (x, y, r,
color, rim) · `clouds` (count, bottom, color, rim, drift) · `hills` / `mountains` / `waves` / `dunes` (y, amp, period,
color, rim, speed) · `city` (y, amp, color, lit) · `trees` (y, amp, color) · `fill` (color, y). Each takes `scroll`
(0 = fixed to the screen, 1 = moves with the level) for parallax.

## Tune

Notes are `C4`…`B6` with `#` / `b`, `.` is a rest; each step is an eighth note at `bpm`. Tracks loop independently, so
a 4-step arp over a 32-step lead is fine. Keep `vols` low (lead ≤ 0.12): it sits under the sound effects.
