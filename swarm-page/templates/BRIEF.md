# BRIEF — <topic>

Fill this in before any code (references/BRIEF.md explains each field). One page, one creature, one sky.

## The page (the live HTML)
- **What it is:** <a log, a ledger, a line-up, a notice, a menu …> — who reads it and why
- **Kicker / headline / note:** <the words; the headline is editable (data-hic-edit)>
- **Body:** <a table, a list, a form — real elements, sortable or typeable where it makes sense>
- **Controls:** fly trigger <label>, land control <label> (data-swarm-hold), sound toggle, other buttons
- **Ink:** <colour of the type on the sky> · second light ink (if the light turns): <colour>
- **Type:** <system font stacks for display and text>

## The creature (what the page's pixels become)
- **Creature:** <starling | bee | firefly | fish | plane | dot | custom GLSL> — why it fits the topic
- **Mass and size:** <light and quick / heavy and slow> → speed, minSpeed, maxTurn, follow springs
- **In the air:** tint <colour> × <mix>; second light <colour> × <mix>; blend over | add
- **Wingbeat:** <beats per second> · glide <0..1> (flap when climbing, glide when diving)
- **Idle at rest:** hops every <a–b> s, sheen <0..0.05> — what "breathing" looks like for this page

## The flock (how it moves)
- **Formation:** sheet (murmuration) | ball (swarm) | stream (school, squadron) · spread · thickness
- **Where it roams:** area x0 y0 x1 y1 · depth
- **Neighbours / reaction / salience:** 7 · <s> · <n> (how a turn travels)
- **Gather → lift:** gather <s> (quiver and crouch), lift wave speed <px/s>, kick
- **Land:** order top | origin | random · span <s> — and the settle dip

## The sky and setting
- **Hour and weather:** <dusk, noon, night, under water …> · sky stops · sun / moon · clouds · stars · rays
- **Second light (optional):** <night …> and when it turns (every flight)
- **Scene in front (never flies):** <roofs, reeds, hives, a shoreline …> — drawn as SVG in #scene
- **Water (optional):** waterline y, deep colour, glint

## The trigger
- **Fly:** <a button, an intro on load, a hover, a timer …> · **Land:** <button, Escape, a timer>
- **In flight:** pointer = <hawk / net / hand>; clicking where a line was recalls it

## Sound (synthesised, off until the toggle)
- <wings | buzz | paper | hum> · ambience <none | crickets | birds>

## Still review (score every still; see references/BRIEF.md)
- rest: … · fly 0.3 s: … · fly 3 s: … · land 1.2 s: … · land 5 s: …
