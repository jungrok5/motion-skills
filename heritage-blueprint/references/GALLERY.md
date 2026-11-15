# Combining finished models on one page

Read when the user wants several finished models on one page ("put these six on one page in a
3×2 grid", "keep the views I set", "labels back when expanded", "zoom one at a time"). The input
is finished single-model HTML files. `build.py` still builds one scene; this is a reusable
procedure for a project-local composer, not a bundled CLI, and it does not redo the research.

## 1. Inputs and what to preserve

- Make an inventory: stable model id, title (local + English), order, HTML path and hash, the
  approved default view, evidence limits. Use the files and titles the user named; never pick
  the "newest" from a folder.
- If the user tuned views in open tabs, capture that state before any reload, rebuild or
  navigation (next section). If it cannot be read, keep the page and ask; do not re-estimate.
- Keep the originals and a recoverable combined version. Adapt embedded copies only; the source
  hashes stay identical. List what changed (shell, runtime adapter, anchors, geometry); "the
  source file is unchanged" is not "the embedded code is unchanged".
- Read each input's actual runtime first; run scripts only from trusted, reviewed models. Replace
  code by a unique anchor and assert the match count; never blind-regex an unknown version. If a
  replacement fails, stop that step and report it.

## 2. Capture views before reloading

Per model record what the runtime exposes: camera scale and centre, orbit (yaw / pitch),
separated or not with a settled phase, the source viewport size, model id and version. Wait until
the animation is idle. These fields are a project convention, not a template API; prefer
`window.heritageBlueprint.state()` or another existing hook, or add a minimal bridge in a copy.

Store the values in a work JSON and feed them to the build. Browser `localStorage` alone does not
carry defaults to a file, another browser or the published domain. Map camera units deliberately
across sizes (world scale vs CSS-pixel centre): save a normalised pan and an interpretable zoom,
apply them once the iframe has a real size, only at startup, and stop once the user interacts.
Detail and overview may keep separate session views; returning restores the overview view.

## 3. Structure

| layer | owns |
|---|---|
| outer page | page title, numbering, grid, enlarge / back, focus and scroll |
| one iframe per model | its WebGL, hierarchy, animation, input and callouts |
| build input | HTML inventory, default views, adapter rules, source versions |
| verification record | source / output hashes, viewports, ready states, callout counts, interactions, stills |

One `iframe srcdoc` per model avoids clashing ids, globals and listeners. Keep
`sandbox="allow-scripts"`; never add `allow-same-origin` to reach child DOM. Messages use an
explicit project channel with allowed types and shapes; the parent checks
`event.source === iframe.contentWindow`, the child checks `event.source === parent`. Sandboxed
children are opaque-origin, so `postMessage('*')` needs both source and data checks; never accept
script, HTML or navigation in a message.

Every page keeps its CSS, scripts and fonts inline. Repeated font data URLs may be pulled into one
dictionary in the outer page and restored byte-for-byte before setting `srcdoc` (verify, keep the
licence). Serialise JSON safely so a nested `</script>` cannot end the outer block; never paste
titles into HTML unescaped.

## 4. Overview and detail

- Rows and columns follow the request and the count; 3×2 for six is an example. If the user
  insists on three columns, narrow screens may scroll sideways at a minimum card width; otherwise
  reduce columns for readability, and say so.
- The overview may drop repeated titles, long hints and small insets, but keeps the model, the
  needed controls and **all separated callouts**. Never `display:none` the annotations.
- Detail reuses the same iframe (resize the container, send a display mode); never destroy and
  rebuild the model. Restore that model's callouts and inset; keep UI the user removed removed.
- Exit with a back button and Escape, returning keyboard focus to the trigger; other cards are
  inert in detail mode.
- Wait until every model reports ready (an existing ready signal or a meaningful render state)
  before stills or saving defaults; iframe `load` is not WebGL or font readiness.

## 5. Callouts that point at the right thing

1. `anchorLocal → part.node.world → camera projection → anchorScreen`; the dot follows the part.
2. Bridges may label above / below, towers left / right, by actual target order; distribute by the
   current `parts` count, never hard-code "five for a bridge, six for a tower".
3. Measure the full local + English boxes after wrapping, with the real card width **and height**;
   then align, avoid and bound-check.
4. Leaders run from the real anchor to the box edge, bending around the body and other text if
   needed; the dot never moves into empty space to suit the layout.
5. Accept overview and detail separately.

## 6. Accepting the combined page

- Card count and order equal the inputs; source hashes unchanged; fonts and runtime still inline;
  no ignored adapter failures.
- In a real browser: every model renders, default states and full callouts, at the actual
  overview size and the narrow / short sizes that change layout.
- Spot-check a horizontal and a vertical model: independent orbit, separate / assemble, enlarge /
  back, Escape, defaults after reload, one resize.
- Compare saved views by camera meaning, not raw pixels after a resize.
- Open the final stills; record URL / path, hash, viewports, tested and untested items. HTTP
  preview, file-open and true offline are different tests.

## 7. Publishing, only when asked

Deploy only within the user's authorisation. Prepare a separate public copy with only the files
the site needs; keep the full ledger, backups and QA local. Embedded JSON is public too: remove
local paths and private metadata, keep public source URLs, statuses and precision notes. Compare
geometry, fonts, default views and callouts after cleaning. Use the service's own CLI or console;
verify the live URL afterwards. Updating this skill never implies redeploying an existing site.
