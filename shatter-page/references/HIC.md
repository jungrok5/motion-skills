# HTML-in-Canvas — notes shared by the live-page skills

Master copy: `references/HTML-IN-CANVAS.md`. Every live-page skill carries an identical copy as `references/HIC.md`,
next to `lib/hic.js` (the runtime) and `scripts/hic-test.mjs` (the shared checks). Run `node tools/sync-hic.mjs` after
changing a master, and `node tools/sync-hic.mjs --check` before a PR.

The live-page skills come from Felix Rieseberg's post "All hail the weird web" —
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19 — announcing HTML-in-Canvas in the Claude
desktop app, and its demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, which links fifteen demos. Each demo became
one skill. The skills keep the idea and the technique of each demo and write all of their own code. They never copy a demo's
code, text or art.

## What the feature is

A `<canvas>` can lay out ordinary HTML children: real DOM with real layout, fonts, focus, selection, caret, IME, form
controls, `find in page`, accessibility tree. The canvas does not show them directly. Instead the page's script takes the
children's **pixels** and draws them however it likes: as a WebGL texture on a jelly, a cube, a city or a sheet of glass,
bent by a black hole or knitted into stitches. The browser still routes clicks and keys to the real elements, so the drawing
stays a working web page. The look comes from code and the content is still a document. That pairing is the style of every
live-page skill.

## The API (two generations; probe, never sniff versions)

| | current (Chrome / Edge 157+) | earlier (Claude desktop app; Chromium with `--enable-blink-features=CanvasDrawElement`) |
|---|---|---|
| markup | `<canvas content="drawable">`, children with `drawable` | `<canvas layoutsubtree>` |
| upload to WebGL | `gl.texElementSubImage2D(target, level, x, y, el, {width, height})` into an allocated texture | `gl.texElementImage2D(target, gl.RGBA8, el, {width, height})` (allocates) |
| 2D canvas | `ctx.drawElementImage(el, x, y)` / `drawElement` | same |
| change signal | `canvas.onpaint` fires when a child's pixels change; `canvas.requestPaint()` asks for one | same |
| hit testing | `canvas.updateElementGeometry(el, {canvasTransform: DOMMatrix})` | the child's own CSS `transform` (origin `0 0`) |

Markup that works in both: `<canvas id="stage" layoutsubtree content="drawable"><div id="page" drawable>…</div></canvas>`.
`lib/hic.js` hides the differences. `HIC.supported()`, `HIC.stage(canvas)` → `S.upload(el, tex)`, `S.onPaint(fn)`,
`S.place(el, matrix)`, `S.placeLocal(el, x, y, toPage)`, `S.home(el)`, `S.probe(el)`, `S.loop(fn)`, `S.ready()`, `HIC.fallback(canvas)`,
WebGL helpers (`HIC.gl.program / texture / target / pingpong / bind / fullscreen`) and `HIC.mat4`. The header of `hic.js`
documents each one.

## Rules every live-page skill keeps

1. **The page stays real.** Text is DOM text, never a picture of text and never re-typeset in a shader. It can be selected,
   typed into, tabbed through and found with ⌘F. Controls are real `<input>`, `<button>` and `<label>` elements. If a feature
   only works by faking the DOM, it is out of style.
2. **What you see is what you click.** Every drawn element is placed for hit testing where it is drawn. For a flat or 3D
   plane, use its matrix: `S.place(el, m)` takes 2D or `matrix3d`, so a perspective plane, a cube face or a desk sheet is
   exact. For a non-affine warp (jelly, lens, ink, black hole, Droste), place it with the warp's local affine at the pointer
   (`S.placeLocal`) on every pointer move. Then the element under the pointer is the one drawn there. Prove it with a real
   mouse click in the check, through `__hic.screenOf(el)`, which inverts the warp.
3. **Upload only on paint.** Upload the texture in `onPaint`, when the DOM's pixels changed, and not every frame. Animate
   the drawing every frame from the last upload. In CSS hit-test mode each transform you set is reported as a paint with no
   new pixels. `hic.js` filters those out and uploads again once the pointer rests. A page whose HTML animates by itself
   (video, CSS animation) passes `animates: true`.
4. **Size the upload for sharp text.** Upload at element size × devicePixelRatio, capped by `MAX_TEXTURE_SIZE`. Use mipmaps
   (`mips: true`) when the page is drawn smaller than 1:1 (tilted planes, cubes, cities).
5. **One fallback, the same HTML.** When `HIC.supported()` is false, call `HIC.fallback(canvas)`. The children move out of
   the canvas and become an ordinary, readable, working page with one line saying what the reader is missing. Never show a
   blank canvas. Never sniff the browser name to decide.
6. **Calm and still.** `#still=<s>` freezes time for stills and checks, and `#calm` (or `prefers-reduced-motion`) drops
   idle motion. A page must look composed at `#still=1` with no pointer.
7. **Deterministic look.** Use `HIC.rng(seed)` for any scatter, so every load and every still is the same picture.
8. **Sound is synthesised** (Web Audio), off until a user gesture, with a visible toggle. Load no samples.
9. **No network.** Fonts are system stacks or files bundled with the page. Load nothing from a CDN, so the page also works
   as a Claude artifact.
10. **Phone width.** At 390 px wide nothing scrolls sideways. The page can simplify (fewer cells, a closer camera) but the
    live HTML stays usable.

## Checking a page

`scripts/hic-test.mjs` (`run(file, opts)`) is the base of every skill's `scripts/check.mjs`. It launches Chromium with the
feature flag on, waits for `__hic.ready` and proves the following with numbers:

- it draws (not blank);
- a real click through the drawing focuses an editable element (`[data-hic-edit]`);
- typing changes the text, re-uploads and changes the pixels;
- a real click reaches `[data-hic-click]`;
- frames keep coming;
- phone width works;
- with the feature off, the fallback is a readable page.

The skill adds its own checks through `extra`, such as "the jelly wobbles after a pull" or "the cube twists and the face
is still typeable".

Headless Chromium here renders WebGL in software (SwiftShader). Frame rates in checks are low and only show that frames are
coming, not how fast they are. Stills come from `stills()` (or the skill's `scripts/still.mjs`).

## What broke and the fix (shared lessons)

- **The upload signature is not `texImage2D`'s.** `texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el)`
  throws "not of type Element or ElementImage". The earlier call is `texElementImage2D(target, internalformat, el, {width, height})`.
- **Children of a canvas are invisible fallback content** when the feature is off. The fallback has to move them out,
  because CSS cannot reveal them.
- **Transforms set for hit testing are reported as paints.** Uploading on each of them made every pointer move re-rasterise
  the page. Skip move-only paints and upload once things rest (`hic.js` does this).
- **Clicks landed on the wrong word under a warp.** The element was left at its layout position. Place it with the warp's
  local affine at the pointer, and hide it (`S.place(el, null)`) where no page is drawn, so clicks there reach the canvas.
- **Having `updateElementGeometry` does not prove it moves hit testing.** Some builds ignore it. `S.probe()` puts a known
  element at the canvas centre, asks `elementFromPoint` and falls back to CSS mode.
- **Direct children of the canvas are laid out at its origin.** Their own margins do not move them, so a CSS
  transform on a child is already relative to the canvas. A transform on a *descendant* (a card inside the page) starts
  from that descendant's layout box. Since runtime 1.1 `S.place` always takes canvas-relative matrices and removes the
  layout offset itself in CSS mode (`S.layoutOffset(el)`), so the same matrix works in both modes. Before 1.1, a skill
  placing descendants had to remove the offset by hand (exploded-view-map did).
- **`S.probe()` used to leave the page at its probe offset** and could answer `css?` when an overlay covered the canvas
  centre or the target was measured through a transform. Since 1.1 it measures with offsets, asks `elementsFromPoint`
  (every layer) and puts the element home (`S.home(el)`) before it resolves.
- **A DOM change made inside the `onPaint` callback is not reported as a new paint.** Since 1.1 a MutationObserver
  notices such changes and asks for one more paint on the next frame. `onPaint(fn)` now also receives the paint event
  (`event.changedElements`, where the browser gives it), so a page with several drawn children can upload only the one
  that changed.
- **Software GL in headless Chromium is slow**, about 0.7–10 fps on a loaded machine. This led to four changes:
  - Use `antialias: false`, because 4× MSAA on SwiftShader made frames about 3× slower.
  - Draw only when something changed.
  - Pages queued frames faster than the GPU drew them. The backlog starved the compositor, so Playwright screenshots
    took 30–60 s and timed out. Keep one frame in flight by polling a GPU fence on later frames.
  - Give every live-page skill a reduced-resolution flag (`#q=0.5`) and `#nointro` for checks. Step physics and tweens
    by simulated time in checks. Run checks one at a time.
- **`fenceSync` never reports done inside the task that created it**, even after `gl.finish()`. Poll it on later frames,
  or read synchronously with a plain `readPixels` from your own render target. Reading straight from a texture uploaded
  from an element returned zeros: render it to a target first.
- **With `UNPACK_PREMULTIPLY_ALPHA_WEBGL` on, a Float32Array `texSubImage2D` silently uploads nothing.** Turn it off
  around float uploads (deflection tables, maps).
- **`#still=t` counts from page load**, not from the start of a demo that begins after a delay. Pages with delayed
  idle demos document their own still addresses.
- **The shared typing check diffed too sparsely** for small glyph changes on tilted or 3D pages. Since 1.1 it also diffs
  a crop around the edited field.
- **Chrome 157's geometry path (`updateElementGeometry`) is untested here**, because the checks run on Chromium 153 with
  the earlier API in CSS mode. One source demo notes that Chrome 157 can return a stale hit test after a geometry change
  until an attribute outside the canvas changes. app-cube guards against this by touching an attribute on `<html>`.
  Check that guard on a real Chrome 157+.
- **Clean-copy tests share `/tmp`.** Name the quick-start project folder after the skill (`../my-<skill>`), not
  `../my-page`.
