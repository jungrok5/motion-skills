/* sheet.js — a small, real spreadsheet for sheet-city pages.
 *
 * A plain DOM <table> (column letters, row numbers, cells), an edit bar (address, formula field, one slider bound to a
 * cell, undo, sound), formulas with a dependency graph, selection, in-cell editing, keyboard moves and undo. It knows
 * nothing about WebGL: lib/city.js draws it as a model city, and with HTML-in-Canvas off it is simply the page.
 *
 *   const book = SheetBook.create(document.getElementById('sheet'), BOOK);
 *   book.on(e => …)   e = { kind: 'init'|'select'|'type'|'slide'|'undo', source: id, changed: [ids], before: {id: value} }
 *
 * BOOK (designed per topic; see references/ENGINE.md):
 *   title      the sheet's name, shown in the corner of the edit bar (contenteditable)
 *   rows       [{ cls: 'head'|'total'|…, cells: ['Label', '120', '=SUM(B3:B6)', …], fmt: {dp, pre, suf}, unit }]
 *              cell 0 is column A. Strings starting with '=' are formulas. cls becomes the <tr> class (the palette).
 *   city       'B2:M12' — the cells that stand up as buildings (others stay printed on the sheet)
 *   widths     { A: 170, default: 90 } column widths in px;  rowH: 56, headH: 28
 *   fmt        default number format { dp: 0, pre: '', suf: '', group: true }
 *   slider     { cell: 'B14', min, max, step, label } — a real <input type=range> in the edit bar that writes that cell
 *   select     'B9' — the cell selected at start (the formula field always edits the selected cell)
 *   labels     { undo: 'Undo', sound: 'Sound' } — wording of the bar's buttons
 *
 * Formulas: + - * / ^, comparisons (= <> < > <= >=), parentheses, A1 / $A$1 references, ranges A1:B4, and
 * SUM AVERAGE MIN MAX COUNT ROUND(x[,dp]) ABS IF(cond, a, b). Errors show as #ERR, #DIV/0 or #LOOP.
 */
(function (root) {
  'use strict';

  var ERR = { toString: function () { return '#ERR'; } };
  var DIV0 = { toString: function () { return '#DIV/0'; } };
  var LOOP = { toString: function () { return '#LOOP'; } };
  var isErr = function (v) { return v === ERR || v === DIV0 || v === LOOP; };

  function colName(c) { var s = ''; c++; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26 | 0; } return s; }
  function colIndex(s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n - 1; }

  // ------------------------------------------------------------------ formulas: tokens → recursive descent
  var TOK = /\s*(\$?[A-Za-z]{1,2}\$?\d{1,3}(?![\w.(])|[A-Za-z_]+(?=\s*\()|\d*\.?\d+(?:[eE][-+]?\d+)?|"[^"]*"|<=|>=|<>|[-+*/^(),:=<>&%])/g;
  function tokens(src) {
    var out = [], m, used = 0;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(src))) { out.push(m[1]); used += m[0].length; if (TOK.lastIndex === src.length) break; }
    if (used !== src.replace(/\s+$/, '').length) throw ERR;   // something did not tokenise
    return out;
  }
  var REF = /^\$?([A-Za-z]{1,2})\$?(\d{1,3})$/;

  // Returns the references a formula reads (as [c, r] pairs, ranges expanded) without evaluating it.
  function refsOf(src, COLS, ROWS) {
    var t; try { t = tokens(src); } catch (e) { return []; }
    var out = [];
    for (var i = 0; i < t.length; i++) {
      var a = REF.exec(t[i]); if (!a) continue;
      var c0 = colIndex(a[1].toUpperCase()), r0 = +a[2] - 1, c1 = c0, r1 = r0;
      if (t[i + 1] === ':' && REF.test(t[i + 2] || '')) { var b = REF.exec(t[i + 2]); c1 = colIndex(b[1].toUpperCase()); r1 = +b[2] - 1; i += 2; }
      for (var r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) for (var c = Math.min(c0, c1); c <= Math.max(c0, c1); c++)
        if (c >= 0 && r >= 0 && c < COLS && r < ROWS) out.push(r * COLS + c);
    }
    return out;
  }

  // evaluate(src, get) — get(c, r) returns a cell's value (number, string, null or an error object)
  function evaluate(src, get) {
    var t = tokens(src), p = 0;
    function peek() { return t[p]; }
    function eat(x) { if (t[p] !== x) throw ERR; p++; }
    function num(v) { if (isErr(v)) throw v; if (v === null || v === '') return 0; if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0; throw ERR; }
    function cellRef(s) { var a = REF.exec(s); if (!a) throw ERR; return [colIndex(a[1].toUpperCase()), +a[2] - 1]; }
    function range() {           // a reference or a range → list of values
      var a = cellRef(t[p++]);
      if (peek() === ':') { p++; var b = cellRef(t[p++]), out = [];
        for (var r = Math.min(a[1], b[1]); r <= Math.max(a[1], b[1]); r++) for (var c = Math.min(a[0], b[0]); c <= Math.max(a[0], b[0]); c++) out.push(get(c, r));
        return out; }
      return [get(a[0], a[1])];
    }
    function call(fn) {
      eat('(');
      var args = [];
      if (fn === 'IF') {
        var cond = compare(); eat(','); var a = compare(), b = 0;
        if (peek() === ',') { p++; b = compare(); }
        eat(')');
        return num(cond) ? a : b;
      }
      if (peek() !== ')') for (;;) {
        if (REF.test(peek() || '') ) {
          var save = p, vals = range();
          if (peek() === ',' || peek() === ')') vals.forEach(function (v) { if (isErr(v)) throw v; if (typeof v === 'number') args.push(v); });
          else { p = save; args.push(num(compare())); }
        } else args.push(num(compare()));
        if (peek() === ',') p++; else break;
      }
      eat(')');
      var sum = 0; args.forEach(function (v) { sum += v; });
      switch (fn) {
        case 'SUM': return sum;
        case 'AVERAGE': case 'AVG': if (!args.length) throw DIV0; return sum / args.length;
        case 'MIN': return args.length ? Math.min.apply(null, args) : 0;
        case 'MAX': return args.length ? Math.max.apply(null, args) : 0;
        case 'COUNT': return args.length;
        case 'ABS': return Math.abs(args[0] || 0);
        case 'ROUND': var k = Math.pow(10, args[1] || 0); return Math.round((args[0] || 0) * k) / k;
      }
      throw ERR;
    }
    function atom() {
      var x = peek();
      if (x === undefined) throw ERR;
      if (x === '(') { p++; var v = compare(); eat(')'); return v; }
      if (x === '-') { p++; return -num(atom()); }
      if (x === '+') { p++; return num(atom()); }
      if (x[0] === '"') { p++; return x.slice(1, -1); }
      if (REF.test(x)) { var vs = range(); if (vs.length !== 1) throw ERR; if (isErr(vs[0])) throw vs[0]; return vs[0] === null ? 0 : vs[0]; }
      if (/^[A-Za-z_]+$/.test(x)) { p++; return call(x.toUpperCase()); }
      var n = Number(x); if (!isFinite(n)) throw ERR; p++;
      if (peek() === '%') { p++; n /= 100; }
      return n;
    }
    function power() { var v = atom(); while (peek() === '^') { p++; v = Math.pow(num(v), num(atom())); } return v; }
    function term() { var v = power(); for (;;) { var o = peek(); if (o === '*') { p++; v = num(v) * num(power()); } else if (o === '/') { p++; var d = num(power()); if (d === 0) throw DIV0; v = num(v) / d; } else return v; } }
    function sum() { var v = term(); for (;;) { var o = peek(); if (o === '+') { p++; v = num(v) + num(term()); } else if (o === '-') { p++; v = num(v) - num(term()); } else if (o === '&') { p++; v = String(v) + String(term()); } else return v; } }
    function compare() {
      var v = sum(), o = peek();
      if (o === '=' || o === '<>' || o === '<' || o === '>' || o === '<=' || o === '>=') {
        p++; var w = sum(), a = typeof v === 'number' ? v : v, b = w;
        switch (o) { case '=': return a == b ? 1 : 0; case '<>': return a != b ? 1 : 0; case '<': return a < b ? 1 : 0; case '>': return a > b ? 1 : 0; case '<=': return a <= b ? 1 : 0; default: return a >= b ? 1 : 0; }
      }
      return v;
    }
    var v = compare();
    if (p !== t.length) throw ERR;
    if (typeof v === 'number' && !isFinite(v)) throw DIV0;
    return v;
  }

  function fmtNum(v, f) {
    if (v === null || v === undefined) return '';
    if (isErr(v)) return String(v);
    if (typeof v !== 'number') return String(v);
    f = f || {};
    var dp = f.dp || 0, a = Math.abs(v);
    var s = f.group === false ? a.toFixed(dp) : a.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    return (v < 0 && Math.round(a * Math.pow(10, dp)) !== 0 ? '−' : '') + (f.pre || '') + s + (f.suf || '');
  }

  // ------------------------------------------------------------------ the book
  function create(host, B) {
    var doc = host.ownerDocument;
    var ROWS = B.rows.length, COLS = 0;
    B.rows.forEach(function (r) { COLS = Math.max(COLS, r.cells.length); });
    var N = ROWS * COLS;
    var raw = new Array(N).fill(''), val = new Array(N).fill(null), shown = new Array(N).fill(null), tds = new Array(N);
    var precedents = new Array(N), dependents = [];
    var colHead = [], rowHead = [], listeners = [], undoStack = [];
    var selected = -1, editing = -1, state = null;
    var idx = function (c, r) { return r * COLS + c; };
    var addr = function (i) { return colName(i % COLS) + ((i / COLS | 0) + 1); };
    function parse(a) { var m = REF.exec(String(a || '').trim()); if (!m) return -1; var c = colIndex(m[1].toUpperCase()), r = +m[2] - 1; return c >= 0 && r >= 0 && c < COLS && r < ROWS ? idx(c, r) : -1; }
    function rangeOf(s) { var p = String(s || '').split(':'), a = parse(p[0]), b = parse(p[1] || p[0]); if (a < 0 || b < 0) return null;
      return { c0: Math.min(a % COLS, b % COLS), c1: Math.max(a % COLS, b % COLS), r0: Math.min(a / COLS | 0, b / COLS | 0), r1: Math.max(a / COLS | 0, b / COLS | 0) }; }
    var CITY = rangeOf(B.city) || { c0: 1, c1: COLS - 1, r0: 1, r1: ROWS - 1 };
    var inCity = function (i) { var c = i % COLS, r = i / COLS | 0; return c >= CITY.c0 && c <= CITY.c1 && r >= CITY.r0 && r <= CITY.r1; };
    B.rows.forEach(function (row, r) { row.cells.forEach(function (s, c) { raw[idx(c, r)] = s == null ? '' : String(s); }); });
    var fmtOf = function (i) { var row = B.rows[i / COLS | 0]; return Object.assign({}, B.fmt || {}, row.fmt || {}); };

    // ---- evaluation (memoised per recalc, cycles caught)
    function get(c, r) { if (c < 0 || r < 0 || c >= COLS || r >= ROWS) throw ERR; return valueOf(idx(c, r)); }
    function valueOf(i) {
      if (state[i] === 2) return val[i];
      if (state[i] === 1) return LOOP;
      state[i] = 1;
      var s = raw[i].trim(), v;
      if (s === '') v = null;
      else if (s[0] === '=') { try { v = evaluate(s.slice(1), get); } catch (e) { v = isErr(e) ? e : ERR; } }
      else { var n = Number(s.replace(/[,\s$€£₩]/g, '').replace(/−/g, '-')); v = /\d/.test(s) && isFinite(n) ? n : s; }
      val[i] = v; state[i] = 2;
      return v;
    }
    function graph() {
      dependents = []; for (var i = 0; i < N; i++) dependents.push([]);
      for (i = 0; i < N; i++) {
        precedents[i] = raw[i].trim()[0] === '=' ? refsOf(raw[i].trim().slice(1), COLS, ROWS) : [];
        precedents[i].forEach(function (j) { if (dependents[j].indexOf(i) < 0) dependents[j].push(i); });
      }
    }
    function recalc(source, kind, before) {
      graph();
      state = new Uint8Array(N);
      var changed = [];
      for (var i = 0; i < N; i++) {
        var v = valueOf(i), text = fmtNum(v, fmtOf(i));
        if (text !== shown[i]) { shown[i] = text; if (tds[i]) paint(i); changed.push(i); }
      }
      if (slider && doc.activeElement !== slider) { var sv = val[sliderCell]; if (typeof sv === 'number') slider.value = sv; fillSlider(); }
      if (fx && doc.activeElement !== fx) fx.value = selected >= 0 ? raw[selected] : '';
      emit({ kind: kind, source: source, changed: changed, before: before || {} });
    }
    function paint(i) {
      var td = tds[i], v = val[i];
      td.firstChild.textContent = shown[i];
      td.classList.toggle('num', typeof v === 'number');
      td.classList.toggle('neg', typeof v === 'number' && v < 0);
      td.classList.toggle('err', isErr(v));
      td.classList.toggle('formula', raw[i].trim()[0] === '=');
    }
    function emit(e) { listeners.forEach(function (f) { try { f(e); } catch (err) { setTimeout(function () { throw err; }); } }); }

    // ---- DOM
    host.classList.add('sheet-book');
    var table = doc.createElement('table');
    table.className = 'grid';
    var colgroup = doc.createElement('colgroup');
    var wd = B.widths || {};
    var cw = function (c) { return wd[colName(c)] || wd['default'] || 90; };
    colgroup.appendChild(doc.createElement('col')).style.width = (wd.rowHead || 36) + 'px';
    for (var c = 0; c < COLS; c++) colgroup.appendChild(doc.createElement('col')).style.width = cw(c) + 'px';
    table.appendChild(colgroup);
    var tw = (wd.rowHead || 36); for (c = 0; c < COLS; c++) tw += cw(c);
    table.style.width = tw + 'px';
    var hr = table.createTHead().insertRow();
    hr.appendChild(doc.createElement('th')).className = 'corner';
    for (c = 0; c < COLS; c++) { var th = hr.appendChild(doc.createElement('th')); th.textContent = colName(c); th.className = 'ch'; colHead.push(th); }
    var body = table.createTBody();
    for (var r = 0; r < ROWS; r++) {
      var tr = body.insertRow(), spec = B.rows[r];
      if (spec.cls) tr.className = spec.cls;
      if (B.rowH && !spec.h) tr.style.height = B.rowH + 'px';
      if (spec.h) tr.style.height = spec.h + 'px';
      var rh = tr.appendChild(doc.createElement('th')); rh.textContent = r + 1; rh.className = 'rh'; rowHead.push(rh);
      for (c = 0; c < COLS; c++) {
        var i = idx(c, r), td = tr.insertCell();
        td.dataset.i = i; td.dataset.addr = addr(i);
        if (c === 0) td.classList.add('label');
        if (inCity(i)) td.classList.add('lot');
        td.appendChild(doc.createElement('div')).className = 'v';
        tds[i] = td;
      }
    }
    host.appendChild(table);

    // ---- the edit bar: address · formula field · slider · undo · sound
    var L = Object.assign({ undo: 'Undo', sound: 'Sound', fx: 'Formula of the selected cell' }, B.labels || {});
    var bar = doc.createElement('div'); bar.className = 'bar';
    bar.style.width = tw + 'px';
    var title = doc.createElement('div');
    title.className = 'title'; title.id = 'book-title'; title.contentEditable = 'plaintext-only'; title.spellcheck = false;
    title.textContent = B.title || 'Sheet';
    title.setAttribute('aria-label', 'Sheet name');
    var where = doc.createElement('output'); where.className = 'where'; where.id = 'where';
    var fxl = doc.createElement('label'); fxl.className = 'fxl'; fxl.textContent = 'fx'; fxl.htmlFor = 'fx';
    var fx = doc.createElement('input'); fx.id = 'fx'; fx.type = 'text'; fx.autocomplete = 'off'; fx.spellcheck = false;
    fx.setAttribute('aria-label', L.fx); fx.setAttribute('data-hic-edit', '');
    bar.appendChild(title); bar.appendChild(where); bar.appendChild(fxl); bar.appendChild(fx);
    var slider = null, sliderCell = -1, sliderOut = null;
    if (B.slider) {
      sliderCell = parse(B.slider.cell);
      var sl = doc.createElement('label'); sl.className = 'knob';
      var st = doc.createElement('span'); st.textContent = B.slider.label || addr(sliderCell); sl.appendChild(st);
      slider = doc.createElement('input'); slider.type = 'range'; slider.id = 'knob';
      slider.min = B.slider.min; slider.max = B.slider.max; slider.step = B.slider.step || 1;
      sl.appendChild(slider);
      sliderOut = doc.createElement('output'); sliderOut.className = 'kv'; sl.appendChild(sliderOut);
      bar.appendChild(sl);
      slider.addEventListener('input', function () {
        var b = {}; b[sliderCell] = val[sliderCell];
        raw[sliderCell] = String(slider.value);
        fillSlider();
        recalc(sliderCell, 'slide', b);
      });
    }
    function fillSlider() {
      if (!slider) return;
      slider.style.setProperty('--fill', (100 * (slider.value - slider.min) / (slider.max - slider.min)) + '%');
      sliderOut.textContent = fmtNum(+slider.value, fmtOf(sliderCell));
    }
    var undoBtn = doc.createElement('button'); undoBtn.type = 'button'; undoBtn.id = 'undo'; undoBtn.className = 'btn';
    undoBtn.textContent = L.undo; undoBtn.setAttribute('data-hic-click', '');
    undoBtn.addEventListener('click', function () { undoLast(); });
    var soundBtn = doc.createElement('button'); soundBtn.type = 'button'; soundBtn.id = 'sound'; soundBtn.className = 'btn sound';
    soundBtn.setAttribute('aria-pressed', 'false'); soundBtn.textContent = '♪ ' + L.sound;
    bar.appendChild(undoBtn); bar.appendChild(soundBtn);
    host.appendChild(bar);

    var editor = doc.createElement('input');
    editor.id = 'cell-editor'; editor.type = 'text'; editor.autocomplete = 'off'; editor.spellcheck = false;
    editor.setAttribute('aria-label', 'Cell contents');

    // ---- selection and editing
    function select(i) {
      if (i === selected) return;
      if (selected >= 0) { tds[selected].classList.remove('sel'); colHead[selected % COLS].classList.remove('on'); rowHead[selected / COLS | 0].classList.remove('on'); }
      selected = i;
      if (i >= 0) { tds[i].classList.add('sel'); colHead[i % COLS].classList.add('on'); rowHead[i / COLS | 0].classList.add('on'); }
      where.textContent = i >= 0 ? addr(i) : '';
      if (doc.activeElement !== fx) fx.value = i >= 0 ? raw[i] : '';
      emit({ kind: 'select', source: i, changed: [], before: {} });
    }
    function edit(i, initial) {
      if (editing >= 0) commit();
      if (!tds[i]) return;
      select(i);
      editing = i;
      editor.value = initial === undefined ? raw[i] : initial;
      tds[i].classList.add('edit');
      tds[i].appendChild(editor);
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(editor.value.length, editor.value.length);
      emit({ kind: 'edit', source: i, changed: [], before: {} });
    }
    function endEdit() { var i = editing; editing = -1; tds[i].classList.remove('edit'); if (editor.parentNode) editor.remove(); return i; }
    function commit() { if (editing < 0) return; var v = editor.value, i = endEdit(); set(i, v, 'type'); }
    function cancel() { if (editing >= 0) { endEdit(); emit({ kind: 'cancel', source: selected, changed: [], before: {} }); } }
    function snapshot() { var b = {}; for (var i = 0; i < N; i++) b[i] = val[i]; return b; }
    function set(i, text, kind) {
      text = String(text);
      if (raw[i] === text) return false;
      undoStack.push([i, raw[i]]); if (undoStack.length > 200) undoStack.shift();
      var b = snapshot();
      raw[i] = text;
      recalc(i, kind || 'type', b);
      return true;
    }
    function undoLast() {
      var u = undoStack.pop(); if (!u) return false;
      if (editing >= 0) endEdit();
      var b = snapshot();
      raw[u[0]] = u[1]; select(u[0]);
      recalc(u[0], 'undo', b);
      return true;
    }
    function move(dc, dr, from) {
      var i = from === undefined ? selected : from; if (i < 0) return;
      var c = HICclamp(i % COLS + dc, 0, COLS - 1), r = HICclamp((i / COLS | 0) + dr, 0, ROWS - 1);
      select(idx(c, r));
    }
    function HICclamp(x, a, b) { return x < a ? a : x > b ? b : x; }

    // presses: a second press on the same cell within 450 ms opens it (the browser's own dblclick does not reach
    // elements inside a canvas in every build, so it is counted here)
    var last = { i: -1, t: 0 };
    host.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var td = e.target.closest && e.target.closest('td[data-i]');
      if (!td || e.target === editor) return;
      var i = +td.dataset.i, now = performance.now();
      var second = i === last.i && now - last.t < 450;
      last = { i: second ? -1 : i, t: now };
      if (editing >= 0 && editing !== i) commit();
      if (doc.activeElement && doc.activeElement !== doc.body && doc.activeElement !== editor) doc.activeElement.blur();
      select(i);
      if (second) { e.preventDefault(); setTimeout(function () { edit(i); }, 0); }
    });
    editor.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.isComposing || e.keyCode === 229) return;
      var i = editing;
      if (e.key === 'Enter') { e.preventDefault(); commit(); move(0, e.shiftKey ? -1 : 1, i); }
      else if (e.key === 'Tab') { e.preventDefault(); commit(); move(e.shiftKey ? -1 : 1, 0, i); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    editor.addEventListener('blur', function () { if (editing >= 0 && doc.hasFocus()) commit(); });
    fx.addEventListener('focus', function () { if (selected < 0) select(parse(B.select) >= 0 ? parse(B.select) : idx(CITY.c0, CITY.r0)); });
    // typing in the formula field shows the draft in the cell itself, as spreadsheets do (on a building: its roof and walls)
    function draft(on) {
      if (selected < 0) return;
      var td = tds[selected];
      td.classList.toggle('draft', on);
      if (on) td.firstChild.textContent = fx.value; else paint(selected);
    }
    fx.addEventListener('input', function () { draft(true); });
    fx.addEventListener('blur', function () { draft(false); });
    fx.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') { e.preventDefault(); if (selected >= 0) { draft(false); set(selected, fx.value, 'type'); } fx.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); fx.value = selected >= 0 ? raw[selected] : ''; fx.blur(); }
    });
    title.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
    doc.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t === editor || t === fx || t === title || t === slider || selected < 0 || e.defaultPrevented) return;
      if (t.closest && t.closest('a, button, input, textarea, [contenteditable]')) return;
      var mod = e.metaKey || e.ctrlKey, k = e.key;
      if (mod && !e.shiftKey && k.toLowerCase() === 'z') { e.preventDefault(); undoLast(); return; }
      if (mod || e.altKey) return;
      if (k === 'ArrowLeft') move(-1, 0);
      else if (k === 'ArrowRight') move(1, 0);
      else if (k === 'ArrowUp') move(0, -1);
      else if (k === 'ArrowDown') move(0, 1);
      else if (k === 'Tab') move(e.shiftKey ? -1 : 1, 0);
      else if (k === 'Enter' || k === 'F2') edit(selected);
      else if (k === 'Delete' || k === 'Backspace') set(selected, '', 'type');
      else if (k === 'Escape') select(-1);
      else if (k.length === 1) { edit(selected, ''); return; }   // the keystroke itself lands in the editor
      else return;
      e.preventDefault();
    });

    // ---- geometry: boxes in the host's own CSS px (the host must be position: relative)
    function box(el) {
      var x = 0, y = 0, n = el;
      while (n && n !== host) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
    }
    function lots() {
      var out = [];
      for (var r = CITY.r0; r <= CITY.r1; r++) for (var c = CITY.c0; c <= CITY.c1; c++) { var i = idx(c, r), b = box(tds[i]); out.push({ i: i, c: c - CITY.c0, r: r - CITY.r0, row: B.rows[r], x: b.x, y: b.y, w: b.w, h: b.h }); }
      return out;
    }
    // Show a number in a cell without changing its value (while a result counts toward its new figure).
    function show(i, n) { if (!tds[i] || i === editing) return; tds[i].firstChild.textContent = fmtNum(n, fmtOf(i)); tds[i].classList.toggle('neg', n < 0); }
    function unshow(i) { if (tds[i]) paint(i); }

    var api = {
      COLS: COLS, ROWS: ROWS, CITY: CITY, host: host, table: table, bar: bar, fx: fx, editor: editor, slider: slider, soundButton: soundBtn, undoButton: undoBtn, titleEl: title,
      idx: idx, addr: addr, parse: parse, td: function (i) { return tds[i]; }, cellOf: function (el) { var td = el && el.closest && el.closest('td[data-i]'); return td ? +td.dataset.i : -1; },
      value: function (i) { return val[i]; }, raw: function (i) { return raw[i]; }, text: function (i) { return shown[i]; },
      unitOf: function (i) { var row = B.rows[i / COLS | 0]; return row.unit; }, rowSpec: function (i) { return B.rows[i / COLS | 0]; },
      precedents: function (i) { return precedents[i] || []; }, dependents: function (i) { return dependents[i] || []; },
      inCity: inCity, lots: lots, box: box, select: select, edit: edit, commit: commit, cancel: cancel, set: set, undo: undoLast, show: show, unshow: unshow,
      get selected() { return selected; }, get editing() { return editing; },
      on: function (f) { listeners.push(f); return api; },
      format: fmtNum, evaluate: evaluate, isError: isErr
    };
    recalc(-1, 'init');
    var s0 = parse(B.select); if (s0 >= 0) select(s0);
    return api;
  }

  root.SheetBook = { create: create, evaluate: evaluate, format: fmtNum, colName: colName };
})(typeof window !== 'undefined' ? window : globalThis);
