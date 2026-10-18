# Pieces inside another page (scroll-scrubbed)

Use this when the piece is not watched on its own page but sits inside another page — a résumé, a landing page, a long article —
and the reader's **scroll** moves it. Learned building the owner's interactive résumé: github.com/jungrok5/resume →
`public/motion/<id>/index.html` (12 pieces) and `src/components/MotionSection.jsx` (the driver), notes in its `DEVELOPMENT.md`. Live: jungrok5.github.io/resume/interactive.html.

The page is still a normal explainer page (`renderAt(t)`, `DURATION`, `ready`, its own player when opened alone). What changes:

| | standalone explainer | scroll-embedded piece |
|---|---|---|
| length | 60–110 s, 4–8 chapters | 28–36 s, 3–5 beats |
| who moves t | the player, forward at 1× | the reader's scroll, any speed, both directions |
| t = 0 | intro fades in | a meaningful opening frame (it is also the poster) |
| end | fade to black | the last ~3 s hold the result frame |
| stage size | full width | ~860 px wide on desktop, ~390 px on a phone → bigger type, less text |
| compositions | 1920×1080 (+ a separate 9:16 cut) | 1920×1080 and 1080×1350 in **one** file (`?layout=tall`) |

## URL modes (one file)
| URL | what it does |
|---|---|
| `index.html` | standalone: player, chapters, a short note block, link back to the host page |
| `?embed` | canvas only: no player, no notes, no nav, no loop of its own; the canvas fills the iframe; draws only when the host calls `renderAt(t)` |
| `?layout=tall` | 1080×1350 (4:5) composition instead of 1920×1080 — recomposed (positions, camera, text blocks), never letterboxed or scaled |
| `?q=0.4…1` | render scale (embed only): canvas backing store and WebGL size = W·q × H·q, drawing code keeps logical W×H |
| `?render` | no player (added by `render.mjs`) |

Add to the page, starting from `template.html` (or from a 3D reference):
```html
<script>  /* in <head>, before first layout */
  (function () { var q = location.search, c = document.documentElement.classList;
    if (/[?&]embed/.test(q)) c.add('embed'); if (/layout=tall/.test(q)) c.add('tall'); })();
</script>
<style>
  html.embed, html.embed body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: var(--bg); }
  html.embed body { display: block; }
  html.embed .player, html.embed .stage { display: block; width: 100%; height: 100%; aspect-ratio: auto; border: 0; border-radius: 0; margin: 0; padding: 0; }
  html.embed canvas { width: 100%; height: 100%; object-fit: contain; }
  html.embed .bar, html.embed .chapters, html.embed .set, html.embed .big, html.embed .notes { display: none !important; }
  html.tall .stage { aspect-ratio: 4 / 5; }
</style>
```
Do **not** write `html.embed .player { display: none }`: the canvas sits inside `.player`, so that hides the picture too (it happened).
```js
const QS = new URLSearchParams(location.search);
const TALL = QS.get('layout') === 'tall', EMBED = QS.has('embed'), RENDER = QS.has('render');
const Q = EMBED ? Math.min(1, Math.max(.4, parseFloat(QS.get('q')) || 1)) : 1;   // template.html defines clamp() later
const W = TALL ? 1080 : 1920, H = TALL ? 1350 : 1080, DURATION = 32;
const L = (wide, tall) => TALL ? tall : wide;            // pick a value per layout
cv.width = Math.round(W * Q); cv.height = Math.round(H * Q);
// WebGL: renderer.setPixelRatio(1); renderer.setSize(Math.round(W * Q), Math.round(H * Q), false); (same for the composer)
function renderAt(t) {
  ctx.setTransform(Q, 0, 0, Q, 0, 0); ctx.globalAlpha = 1;  // template.html has setTransform(1, …): replace it
  // 3D: renderer.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0, W, H);
  …
}
window.ready = (async () => { /* load fonts */ await document.fonts.ready; renderAt(0); })();  // resolves after the first frame
if (!EMBED && !RENDER) { /* player */ }                  // template.html: replace  if (!location.search.includes('render'))
```
Also remove the template's final fade to black and start the intro visible at t = 0.

## The host page
The host loads `index.html?embed[&layout=tall]&q=…` in a **same-origin** iframe and calls `iframe.contentWindow.renderAt(t)`.
- **Pinned stage:** a tall section (≈ 290vh) with a `position: sticky; top: 0; height: 100vh` inner box holding the stage; the section's height is the scrub length.
- **Scroll → t:** `progress = clamp(-rect.top / (rect.height - innerHeight))`, `target = progress × DURATION`.
- **Ease, don't jump:** each animation frame move the shown time 28% of the way to the target (snap when < 0.02 s). This removes the
  steps of a mouse wheel. Only render when the shown time changes.
- **Mount near, unmount far:** create the iframe when the section is within ~1–2 viewports, remove it beyond ~3–4. Browsers cap live
  WebGL contexts (old ones get lost), and each piece is one; this keeps 2–3 alive. Choose `q` at mount from the stage's pixel width:
  `round(clamp(stage.clientWidth × devicePixelRatio / W, .5, 1), 1 decimal)`.
- **Posters:** an `<img>` of `poster.jpg` (16:9, t = 0) or `poster-tall.jpg` (4:5) covers the stage until `ready` resolves, then fades out;
  it stays if the iframe fails. JPEG ~100–350 KB each (PNG posters were 1–3 MB each). Make them from a still:
  `node <skill>/scripts/render.mjs <id>/index.html /tmp/p --stills 0 && ffmpeg -i /tmp/p/t000.0.png -q:v 3 <id>/poster.jpg`
  (tall: add `--query layout=tall --size 1080x1350`).
- **`pointer-events: none` on the iframe**, or wheel and touch scrolling stop over the stage.
- **Layout switch:** pick wide or tall by viewport width (the résumé uses tall below 821 px) and reload the iframe when it flips.

Minimal driver (no framework; the résumé's React version is `MotionSection.jsx`):
```html
<section class="ms" id="codegen"><div class="ms-pin"><div class="ms-stage">
  <img class="ms-poster" src="motion/codegen/poster.jpg" alt=""></div></div></section>
<style>
  .ms { height: 290vh; position: relative; }
  .ms-pin { position: sticky; top: 0; height: 100vh; display: grid; place-items: center; }
  .ms-stage { position: relative; width: min(92vw, calc((100vh - 120px) * 16 / 9)); aspect-ratio: 16 / 9; overflow: hidden; }
  .ms-stage img, .ms-stage iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; }
  .ms-stage iframe { pointer-events: none; }
  .ms-poster { z-index: 1; object-fit: cover; transition: opacity .35s; } .ms-poster.off { opacity: 0; }
</style>
<script>
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
for (const sec of document.querySelectorAll('.ms')) {
  const stage = sec.querySelector('.ms-stage'), poster = sec.querySelector('.ms-poster');
  const S = { frame: null, win: null, dur: 0, target: 0, shown: -1, raf: 0 };
  const tick = () => {
    S.raf = 0; if (!S.win) return;
    const d = S.target - S.shown;
    S.shown = S.shown < 0 || Math.abs(d) < .02 ? S.target : S.shown + d * .28;
    try { S.win.renderAt(S.shown); } catch (e) { /* page unloading */ }
    if (S.shown !== S.target) S.raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (!S.raf) S.raf = requestAnimationFrame(tick); };
  const mount = () => {
    const q = Math.round(clamp(stage.clientWidth * devicePixelRatio / 1920, .5, 1) * 10) / 10;
    const f = S.frame = document.createElement('iframe');
    f.src = `motion/${sec.id}/index.html?embed&q=${q}`; f.tabIndex = -1; f.title = sec.id;
    f.onload = async () => {
      const w = f.contentWindow;
      for (let i = 0; i < 50 && !w.ready; i++) await new Promise(r => setTimeout(r, 40));
      await w.ready; if (S.frame !== f) return;
      S.win = w; S.dur = w.DURATION; S.shown = -1; poster.classList.add('off'); onScroll();
    };
    stage.appendChild(f);
  };
  const unmount = () => { S.frame.remove(); S.frame = S.win = null; poster.classList.remove('off'); };
  const onScroll = () => {
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    const near = r.bottom > -vh * 1.2 && r.top < vh * 2.2, far = r.bottom < -vh * 3 || r.top > vh * 4;
    if (near && !S.frame) mount(); else if (far && S.frame) unmount();
    S.target = clamp(-r.top / Math.max(1, r.height - vh)) * S.dur;
    kick();
  };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
}
</script>
```

## Timing rules for scrubbing
- **t = 0 means something**: the opening state of the problem, fully drawn. No fade-in from black (it is the poster and the first thing seen).
- **Every beat has a readable resting state.** The reader stops scrolling anywhere; a still at any t must make sense. Nothing may be carried
  only by fast motion, flicker or a transition.
- **Hold the result**: the last ~3 s show the headline number or outcome, unchanged. No fade to black.
- 3–5 beats in ~32 s gives each beat 6–10 s: let the change happen early in the beat and hold the settled state for the rest, so slow and fast scrollers both see it land.
- Pure function of t, as always: scrolling backwards must look exactly like scrolling forwards.

## Text on a small stage
Body and labels: wide ≥ 36 px, tall ≥ 46 px. Key numbers: wide ≥ 110 px, tall ≥ 130 px (logical pixels). To judge a still, imagine it at
the embed size: wide × 0.45, tall × 0.36. Keep on-screen text sparse: the host page's text next to the stage carries the bullet list; the
piece shows *how* plus the headline number. Long footnotes collide with captions in the tall layout: give the tall layout its own shorter footnote.

## Honesty
On a résumé or case study every number on screen comes from the source text, never from a guess. Anything illustrative (sample sizes,
schematic proportions, sample code or log lines, a drawn game scene) is visibly labelled `개념도` (diagram) or `예시` (example) and must not look
like a measurement. Prefer qualitative pictures to fake numbers. Research or a prototype is not presented as shipped.
Run the expert review (`EXPERT-REVIEW.md`) with "every number must come from <source file>".

## Share link per item
Give each section `id="<piece id>"`; the share button copies `page.html#<id>` (system share sheet on phones via `navigator.share`, clipboard
otherwise). If the page is rendered by a framework, the element may not exist when the browser tries the hash: scroll to it once more after
mount (`setTimeout(() => el.scrollIntoView({ block: 'start' }), 60)`).

## MP4 for each piece (to link under the stage or post elsewhere)
`render.mjs` records the canvas backing store, so `q` sets the video size (q only applies with `?embed`):
```bash
# wide → 1280×720
RENDER_ARGS='--query embed&q=0.6667' <skill>/scripts/render-chunked.sh <id>/index.html <id>/<id>.mp4 6
# tall → 864×1080
RENDER_ARGS='--query embed&layout=tall&q=0.8 --size 1080x1350' <skill>/scripts/render-chunked.sh <id>/index.html <id>/<id>-tall.mp4 6
```
6 s segments keep each job short (software WebGL is slow) and resumable. Re-bake a piece's MP4s whenever its `index.html` changes.
