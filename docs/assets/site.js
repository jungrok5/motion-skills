/* motion-skills samples site — the little behaviour every skill page shares. No dependencies.
   1. Live demo: <iframe data-src="demo/?o={o}">; {o} becomes "v" under 820 px wide, else "h".
      Buttons inside the same .demo with data-src (and optional data-cap, HTML) switch the iframe.
   2. Gallery filter: <div class="chips" data-for="ID" hidden> gets one button per tag found in #ID's tiles
      (data-tags="a b", labels from the chips' data-labels JSON); groups (.group) with no visible tile hide.
   3. Command blocks: every <pre> gets a 복사 button that copies its text (wrapped in .cmd). Runs on the hub too. */
(function () {
  function fill(src) { return src.replace(/\{o\}/g, innerWidth < 820 ? 'v' : 'h'); }

  document.querySelectorAll('.demo').forEach(function (demo) {
    var frame = demo.querySelector('iframe[data-src]');
    if (!frame) return;
    var cap = demo.querySelector('[data-cap-target]');
    frame.src = fill(frame.dataset.src);
    demo.querySelectorAll('button[data-src]').forEach(function (b) {
      b.addEventListener('click', function () {
        demo.querySelectorAll('button[data-src]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        frame.src = fill(b.dataset.src);
        if (cap && b.dataset.cap) cap.innerHTML = b.dataset.cap;
      });
    });
  });

  document.querySelectorAll('.chips[data-for]').forEach(function (chips) {
    var root = document.getElementById(chips.dataset.for);
    if (!root) return;
    var labels = {};
    try { labels = JSON.parse(chips.dataset.labels || '{}'); } catch (e) {}
    var tiles = Array.prototype.slice.call(root.querySelectorAll('.tile[data-tags]'));
    var order = Object.keys(labels), count = {};
    tiles.forEach(function (t) {
      t.dataset.tags.split(/\s+/).forEach(function (k) {
        if (!k) return; count[k] = (count[k] || 0) + 1;
        if (order.indexOf(k) < 0) order.push(k);
      });
    });
    function button(key, text, n) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.dataset.filter = key;
      b.setAttribute('aria-pressed', String(key === ''));
      b.textContent = text;
      var s = document.createElement('span'); s.className = 'n'; s.textContent = n; b.appendChild(s);
      b.addEventListener('click', function () { apply(key); });
      chips.appendChild(b);
    }
    function apply(key) {
      chips.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.filter === key)); });
      tiles.forEach(function (t) { t.hidden = key !== '' && (' ' + t.dataset.tags + ' ').indexOf(' ' + key + ' ') < 0; });
      root.querySelectorAll('.group').forEach(function (g) { g.hidden = !g.querySelector('.tile:not([hidden])'); });
    }
    button('', '전체', tiles.length);
    order.forEach(function (k) { if (count[k]) button(k, labels[k] || k, count[k]); });
    chips.setAttribute('role', 'group');
    chips.hidden = false;
  });

  if (navigator.clipboard) document.querySelectorAll('pre').forEach(function (pre) {
    var box = document.createElement('div'); box.className = 'cmd';
    pre.parentNode.insertBefore(box, pre); box.appendChild(pre);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn copy'; b.textContent = '복사';
    b.setAttribute('aria-live', 'polite');
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(pre.innerText.replace(/\n+$/, '')).then(function () {
        b.textContent = '복사됨';
        setTimeout(function () { b.textContent = '복사'; }, 1500);
      });
    });
    box.appendChild(b);
  });
})();
