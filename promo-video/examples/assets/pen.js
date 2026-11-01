/* pen.js — hand-drawn marks (red pen, marker, highlighter) that fit exactly what they mark.
 *
 * Why: marks drawn as fixed SVG paths stretched over a guessed box never match the real text (a circle that misses the
 * minus sign, a strike that covers half a word, an "O" that does not close). Pen measures the target's layout box
 * (transform-independent, after fonts load) and generates the stroke from it.
 *
 *   <script src="../assets/pen.js"></script>
 *   const m1 = Pen.circle('#bad');                  // element, selector, or an array (e.g. kinetic words: el._w.slice(0, 2))
 *   const m2 = Pen.strike($('#title')._w.slice(0, 2));
 *   const m3 = Pen.underline('#key', { color: '#2340A8' });
 *   // in render(t):  m1.draw(t, start, 0.5);  m2.draw(t, start2, 0.3);
 *
 * Kinds: circle (closed, slightly overshooting loop), strike, underline, cross (X over the target), check (tick at its
 * right), box. Options: color (#E0393E), width (7), pad (auto), seed (1), opacity (.92).
 * The SVG goes into the target's offsetParent (a positioned ancestor), so it moves with that container but is never
 * clipped by a word's overflow:hidden. Do NOT put marks inside kinetic-split text; pass the word spans instead.
 */
window.Pen = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = seed => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
  const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const els = t => (Array.isArray(t) ? t : typeof t === 'string' ? [...document.querySelectorAll(t)] : [t]).filter(Boolean);

  // layout box of el relative to host, ignoring CSS transforms (offset chain)
  function rel(el, host) {
    let x = 0, y = 0, n = el;
    while (n && n !== host) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n === host) return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    const a = el.getBoundingClientRect(), b = host.getBoundingClientRect(), s = b.width / (host.offsetWidth || 1);
    return { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s };
  }
  function union(list, host) {
    const bs = list.map(e => rel(e, host));
    const x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y));
    const x1 = Math.max(...bs.map(b => b.x + b.w)), y1 = Math.max(...bs.map(b => b.y + b.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  const f = v => v.toFixed(1);
  const SHAPES = {
    circle(b, o, r) {
      const pad = o.pad ?? Math.max(12, b.h * 0.22);
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w / 2 + pad, ry = b.h / 2 + pad * 0.85;
      const t0 = -2.2 + r() * 0.3, turns = 1.1, n = 64, ph = r() * 6, tilt = (-3 + r() * 2) * Math.PI / 180;
      let d = '';
      for (let i = 0; i <= n; i++) {
        const u = i / n, th = t0 + u * turns * 2 * Math.PI;
        const k = 1 + 0.035 * Math.sin(3 * th + ph) - 0.07 * u;          // wobble + spiral in, so the end crosses the start
        const px = rx * k * Math.cos(th), py = ry * k * Math.sin(th);
        const X = cx + px * Math.cos(tilt) - py * Math.sin(tilt), Y = cy + px * Math.sin(tilt) + py * Math.cos(tilt);
        d += (i ? ' L' : 'M') + f(X) + ' ' + f(Y);
      }
      return d;
    },
    strike(b, o, r) {
      const ext = o.pad ?? Math.max(8, b.w * 0.03), y = b.y + b.h * (0.56 + (r() - .5) * 0.06), lift = b.h * 0.08;
      const x0 = b.x - ext, x1 = b.x + b.w + ext;
      return `M${f(x0)} ${f(y + lift / 2)} Q ${f((x0 + x1) / 2)} ${f(y - lift * (0.4 + r() * 0.4))} ${f(x1)} ${f(y - lift / 2)}`;
    },
    underline(b, o, r) {
      const y = b.y + b.h + (o.pad ?? 6), x0 = b.x - 4, x1 = b.x + b.w + 6;
      return `M${f(x0)} ${f(y)} Q ${f((x0 + x1) / 2)} ${f(y + 6 + r() * 4)} ${f(x1)} ${f(y - 3)}`;
    },
    cross(b, o) {
      const p = o.pad ?? 6;
      return `M${f(b.x - p)} ${f(b.y - p)} L ${f(b.x + b.w + p)} ${f(b.y + b.h + p)} M ${f(b.x + b.w + p)} ${f(b.y - p)} L ${f(b.x - p)} ${f(b.y + b.h + p)}`;
    },
    check(b, o) {
      const s = o.size ?? b.h * 0.9, x = b.x + b.w + (o.pad ?? 14), y = b.y + b.h / 2;
      return `M${f(x)} ${f(y)} L ${f(x + s * 0.35)} ${f(y + s * 0.38)} L ${f(x + s)} ${f(y - s * 0.5)}`;
    },
    box(b, o) {
      const p = o.pad ?? 10, x0 = b.x - p, y0 = b.y - p, x1 = b.x + b.w + p, y1 = b.y + b.h + p;
      return `M${f(x0)} ${f(y0 + 3)} L ${f(x1)} ${f(y0)} L ${f(x1 + 2)} ${f(y1)} L ${f(x0)} ${f(y1 + 2)} Z`;
    },
  };

  function mark(kind, target, o = {}) {
    let svg, path, builtFor = null;
    const build = () => {
      const list = els(target);
      if (!list.length) throw new Error('Pen.' + kind + ': target not found');
      const host = list[0].offsetParent || document.body;
      const status = document.fonts ? document.fonts.status : 'loaded';
      const b = union(list, host), key = status + JSON.stringify(b);
      if (key === builtFor) return;
      builtFor = key;
      if (!svg) {
        svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'pen-mark');
        svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:5';
        path = document.createElementNS(NS, 'path');
        path.setAttribute('pathLength', '1');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path); host.appendChild(svg);
      }
      svg.setAttribute('width', host.offsetWidth || 1); svg.setAttribute('height', host.offsetHeight || 1);
      path.setAttribute('stroke', o.color || '#E0393E');
      path.setAttribute('stroke-width', o.width || 7);
      path.style.opacity = o.opacity ?? 0.92;
      path.setAttribute('d', SHAPES[kind](b, o, rnd(o.seed || 1)));
      path.style.strokeDasharray = '1';
    };
    return {
      draw(t, start, dur = 0.45) {
        build();
        const p = Math.min(1, Math.max(0, (t - start) / dur));
        path.style.strokeDashoffset = String(1 - ease(p));
        svg.style.visibility = t >= start ? 'visible' : 'hidden';
      },
      hide() { if (svg) svg.style.visibility = 'hidden'; },
    };
  }
  const api = {};
  Object.keys(SHAPES).forEach(k => { api[k] = (target, o) => mark(k, target, o); });
  return api;
})();
