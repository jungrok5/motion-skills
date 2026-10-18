# 실물을 공간에 늘어놓기 — craft notes (first samples: skill-journey-glass, boss-lag-glass)

The look of the first sample was copied from a reference and is not the rule; take the look from the topic (see STYLES.md). The samples named here are in the worked example repo, github.com/jungrok5/mmo-server-explained.
Techniques below still apply.

What worked (skill-journey-glass, boss-lag-glass):
- Panel UI is a 2D canvas (e.g. 900×1260) used as a CanvasTexture on a plane; redraw it from t (cache keyed on t quantized to 1/60 s).
  Size the panel to its content (empty lower halves look unfinished).
- Glass: blue gradient with alpha, rim glow plus a light that runs along the rim, a reflection band sweeping across, a faint reflection of cards
  on the floor and a glow under them. Panel opacity high enough for text; true background blur is not needed.
- Lines: a screen-space thick-line shader (≈1–3 px, varied brightness) with pulses travelling along; 1 px LineSegments look too thin.
- Camera: one continuous spline through key poses (crane → orbit → approach → top-down → pull back), eased; avoid the repeated "slide to next panel".
- Readability: panel titles ≥ ~48 px on screen (vertical) / ≥ 44 px (wide), rows ≥ 32 / 26 px.
- Wide version: put the info panel on the right third and the scene in the left two thirds so the panel does not cover the action.

Known weak spots: panels that leave the frame can cover the scene for a moment; very dense line webs read as a translucent net.
