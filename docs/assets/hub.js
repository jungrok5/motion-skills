/* motion-skills hub — renders the skill cards from docs/skills.json.
   The same renderCards() runs in two places so the card markup has one source:
   - in Node, tools/build-hub.mjs writes it between <!-- skills:start --> and <!-- skills:end --> in docs/index.html
     (so the hub works without JavaScript and search engines see the cards);
   - in the browser, this file re-renders the grid from skills.json (so a missed rebuild still shows the registry),
     and sends an old anchor (index.html#<skill-id>) to that skill's page. */
(function (root) {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shortRepo(url) { return String(url || '').replace(/^https?:\/\/(www\.)?github\.com\//, ''); }

  function renderCard(s, reg) {
    var repo = reg.repo, branch = reg.branch || 'main', src = (s.source || s.id + '/').replace(/\/?$/, '/');
    var from = s.absorbedFrom ? '<p class="from">출처: ' + esc(shortRepo(s.absorbedFrom.repo)) +
      (s.absorbedFrom.path ? '의 <code>' + esc(s.absorbedFrom.path) + '</code>' : '') + '</p>' : '';
    return '<article class="card" id="' + esc(s.id) + '" data-id="' + esc(s.id) + '">\n' +
      '  <a class="img" href="' + esc(s.page) + '" tabindex="-1"><img src="' + esc(s.poster) +
      '" alt="' + esc(s.posterAlt || s.name + ' 포스터') + '" width="1200" height="675"></a>\n' +
      '  <div class="body">\n' +
      '    <h3><a href="' + esc(s.page) + '">' + esc(s.name) + '</a></h3>\n' +
      '    <p class="tagline">' + esc(s.tagline) + '</p>\n' +
      '    <p class="stats">' + (s.stats || []).map(esc).join(' · ') + '</p>\n' +
      '    <ul class="tags">' + (s.tags || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>\n' +
      (from ? '    ' + from + '\n' : '') +
      '    <div class="btns"><a class="btn p" href="' + esc(s.page) + '">샘플 페이지</a>' +
      '<a class="btn" href="' + esc(repo + '/blob/' + branch + '/' + src + 'SKILL.md') + '">SKILL.md</a>' +
      '<a class="btn" href="' + esc(repo + '/tree/' + branch + '/' + src.replace(/\/$/, '')) + '">폴더</a></div>\n' +
      '  </div>\n</article>';
  }
  function renderCards(reg) { return reg.skills.map(function (s) { return renderCard(s, reg); }).join('\n'); }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { renderCards: renderCards }; return; }

  // browser
  var hash = decodeURIComponent(location.hash.slice(1));
  function redirect(ids) {
    if (hash && ids.indexOf(hash) >= 0) location.replace(hash + '/');
  }
  var grid = root.document.getElementById('skills');
  if (!grid) return;
  redirect(Array.prototype.map.call(grid.querySelectorAll('[data-id]'), function (e) { return e.dataset.id; }));
  if (!root.fetch) return;
  fetch('skills.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (reg) {
      grid.innerHTML = renderCards(reg);
      redirect(reg.skills.map(function (s) { return s.id; }));
    })
    .catch(function () { /* keep the prerendered cards */ });
})(typeof window !== 'undefined' ? window : this);
