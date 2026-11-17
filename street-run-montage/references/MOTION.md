# MOTION — weight, gathers, contacts (what the rig does and what the check measures)

After the repo's `references/MOTION-QUALITY.md` (source: OhChadol, "AI slop 게임의 특징 및 해결법"). The ride is keyed in
numbers; the rig turns them into bodies that keep these rules by construction, and `check.mjs` measures them.

## Rider (lib/rider.js)
- **Weight → timing.** `mass` in the brief; heavier riders get deeper crouches and longer gathers (set `pre` / `post` on a
  move, or move `at` a beat later). Airtime is physics: `2·√(2h/g)` from the trick height.
- **Gather → act → settle.** Every pop (ollie, flips, grinds on and off) has a crouch from .3 s before (crouch → 1 at the
  pop − .04 s), an extension past standing at the pop, a tuck in the air, an absorb on landing (crouch .95) and a recovery
  over .5 s. Cheers and fist pumps dip before they rise and overshoot before they settle.
- **Contacts.** Feet are on the deck (deck points move with the board), or fixed on the ground: the push foot plants beside
  the board (toe side) at the board's position and stays at that world point until the board has run .62 m, then
  lifts and swings back; a dismount steps each foot to a fixed ground point. Pelvis height is limited so both ankles
  stay within reach (fixed bone lengths, two-bone IK, knee pole = the body's front).
- **Speed.** Speed keys may only rise during a push or downhill (the check fails "speeds up without a push or a slope").
- **Head and balance.** Riding side-on the head turns to the nose and the chest follows a little; arms hang loose and
  sway; in the air they go out for balance asymmetrically (front arm forward, back arm low); hair locks trail with
  speed and lift as the body drops (a spring-lagged copy of the bob).
- **Alive.** Breathing (chest and hips), blinks on irregular beats, small noise in the crouch and the head.

## Companion (lib/critter.js)
- **Gait from speed**: walk (< 1.2 m/s, duty .68), trot (< 3.4, diagonal pairs, duty .52), gallop (rotary, duty .36, spine
  flex, body pitch, bob). Stride grows with speed but never beyond what a leg can reach (`2·reach / duty`), so a
  short-legged animal takes quicker steps instead of overreaching.
- **Planted paws**: the gait phase is ∫ v / stride; a paw touches down at a world point computed from its touch-down time
  (the stride of that moment) and stays there until lift-off; swings arc to the next point. Front: elbow back, the paw
  folds back when lifted; hind: knee forward, the hock back, the foot folds forward when lifted.
- **Leaps** gather (.3 s crouch), stretch in the air (forelegs reach), absorb. **Sit** steps each paw into place
  (staggered), lowers the haunch, raises the chest as far as the front legs reach; the head turns for `face`.
- **Alive**: breathing, ears flicking on irregular beats, the tail swishing (up in an S at rest for cats and dogs,
  trailing in the gallop), a lagging bob in the tail.

## What check.mjs reports
`slipRider` / `slipBuddy` (largest movement of a planted foot / paw between samples at 120 Hz, mm — fails over 5),
`gathers` (crouch rise before each pop — fails without one), `idleBreath` (head travel at rest, mm — fails under 2),
speed-ups without a push, joints (`LIM`: knee 0–150°, elbow 0–150°, neck yaw ±80°, pitch ±45°, spine twist ±50°),
reach (a foot, or a planted paw, more than 2 cm beyond its leg — a paw in the air may straighten its leg).
