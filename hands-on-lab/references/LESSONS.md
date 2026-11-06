# LESSONS — what broke while building this skill, and the fix

| problem | cause | fix |
|---|---|---|
| Bulbs rendered as black blobs | `LatheGeometry` faces point inward when the profile runs top → bottom; the back-face outline hull then covered the glass | `k.lathe` reverses a top → bottom profile so faces point outward |
| The breadboard's hole texture didn't show | `ExtrudeGeometry` bevels grow the shape by `bevelSize`, so every rounded box was taller than asked and swallowed the texture plane on top | `k.box` shrinks the shape by the bevel size: a box is exactly w × h × d |
| Flow stripes stayed on after the current stopped | stripe visibility came from the last *simulation step*, which ran before the final input change of the frame | the frame reads `flows` from the freshly solved values; the step only integrates phases |
| Schematic letters (V in a meter) lay on their side | symbols are rotated as a whole | symbols get the part's `rot` and counter-rotate their text |
| The cursor flew to the top-left corner | the target was the header language button, hidden on desktop | targets are the first *visible* match |
| Tour clicks on a control landed on nothing | a control's card only shows while its part is selected; the tour changed the battery while the switch card was open | a `select` step before every control on another part; `check` fails clicks with no target on screen |
| The lever was framed with eight weights stacked on it | the camera fit ran before the first `update` hid the unused weights, and counted meshes inside hidden groups | fit runs after the first update and skips anything under a hidden parent |
| The ramp ran out of the frame at shallow angles | the wedge grows as the slope gets gentler; the fit was made at 30° | `view.follow: true` re-fits every frame for benches that change size |
| `renderAt(t)` gave a different frame the second time | panel scroll left over from an earlier frame, and CSS transitions caught mid-way | `renderAt` resets the panel scroll; `?render` turns transitions off; `check` compares frames with a small anti-aliasing tolerance |
| The battery still said 3 V after choosing 4.5 V | the printed text is geometry built once | inputs that change printed or shaped geometry go in `rebuild` |
| Controls that did nothing slipped through | a control can be wired to an input no value reads | `check` sweeps every control and fails if no value moves and it does not rebuild the bench |
