/* 새록 — 네모로직
 * 점수: 풀기 600 + 시간 300 + 혼자 풀기 100 + 난이도 보너스
 *
 * 줄마다 적힌 숫자만큼 칸을 이어 칠한다. 「3 1」이면 세 칸을 잇달아 칠하고,
 * 한 칸 이상 띄운 뒤 한 칸을 칠한다는 뜻이다. 가로·세로가 모두 맞으면 그림이 나온다.
 * 한국·일본·영어권 모두에서 사랑받는 퍼즐이고 숫자만 있어 말이 필요 없다.
 * 2026-11-01 「두뇌 게임」 입구를 열며 짝 맞추기와 함께 넣었다.
 *
 * 판은 매번 새로 짠다 —
 *  - 왼쪽 절반을 무작위로 칠하고 오른쪽에 거울처럼 비춘다. 좌우가 맞아 무늬·얼굴처럼 보인다.
 *  - 짠 판을 '한 줄씩만 보고 풀기'로 끝까지 풀어 본다. 다 풀리는 판만 쓴다.
 *    그래야 답이 하나뿐이고, 찍지 않고 생각만으로 풀 수 있다.
 *
 * 누르면 칠해지고, 다시 누르면 지워진다. 「X 표시」로 바꾸면 비워 둘 칸에 X 를 놓는다.
 * 누른 채 손가락을 밀면 지나간 칸이 함께 칠해진다 (한 칸씩 눌러도 된다).
 * 틀리게 칠해도 점수는 깎이지 않는다. 힌트 없이 풀면 「혼자 풀기 보너스」가 붙는다.
 */
window.Games = window.Games || {};
window.Games.nonogram = (function () {

  /* n 판 크기 · rounds 판 수 · dens 칠할 칸의 비율 (낮을수록 숫자가 잘게 쪼개져 어렵다) */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, n: 5,  rounds: 2, dens: .64, limit: 300,  bonus: 0,
              note: T('{n}×{n} 칸', { n: 5 }) },
    step2:  { name: T('가볍게'), step: 2, n: 5,  rounds: 3, dens: .55, limit: 420,  bonus: 0,
              note: T('{n}×{n} 칸', { n: 5 }) },
    easy:   { name: T('쉬움'),   step: 3, n: 7,  rounds: 2, dens: .58, limit: 600,  bonus: 0,
              note: T('{n}×{n} 칸', { n: 7 }) },
    normal: { name: T('보통'),   step: 4, n: 8,  rounds: 2, dens: .55, limit: 900,  bonus: 100,
              note: T('{n}×{n} 칸', { n: 8 }) },
    hard:   { name: T('어려움'), step: 5, n: 10, rounds: 1, dens: .52, limit: 1200, bonus: 250,
              note: T('{n}×{n} 칸', { n: 10 }) }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;
  var mode = 'fill';                 /* 'fill' 칠하기 · 'x' X 표시 */

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }

  /* ================= 판 만들기 ================= */

  /** 한 줄에서 칠한 칸이 이어진 길이들 — [1,1,0,1] → [2,1] */
  function runs(line) {
    var out = [], k = 0;
    for (var i = 0; i < line.length; i++) {
      if (line[i] === 1) k++;
      else if (k) { out.push(k); k = 0; }
    }
    if (k) out.push(k);
    return out;
  }
  function cluesOf(sol, n) {
    var rows = [], cols = [], r, c, line;
    for (r = 0; r < n; r++) rows.push(runs(sol.slice(r * n, r * n + n)));
    for (c = 0; c < n; c++) {
      line = [];
      for (r = 0; r < n; r++) line.push(sol[r * n + c]);
      cols.push(runs(line));
    }
    return { rows: rows, cols: cols };
  }

  /** 한 줄만 보고 알 수 있는 칸을 채운다.
   *  cur: -1 모름 · 0 빈칸 · 1 칠함. 놓을 수 있는 모든 자리를 따져,
   *  어느 자리에서나 칠해지는 칸은 칠함, 어느 자리에서나 비는 칸은 빈칸으로 정한다.
   *  맞는 자리가 하나도 없으면 null. */
  function solveLine(clue, cur) {
    var n = cur.length, canF = [], canE = [], arr = [], any = false, i;
    for (i = 0; i < n; i++) { canF.push(false); canE.push(false); arr.push(0); }
    var need = [];                    /* need[ci] — ci 번째 덩이부터 끝까지 놓는 데 드는 최소 칸 */
    var acc = 0;
    for (i = clue.length - 1; i >= 0; i--) { acc += clue[i] + (i < clue.length - 1 ? 1 : 0); need[i] = acc; }

    function place(ci, start) {
      var k;
      if (ci === clue.length) {
        for (k = start; k < n; k++) { if (cur[k] === 1) return; arr[k] = 0; }
        any = true;
        for (k = 0; k < n; k++) { if (arr[k]) canF[k] = true; else canE[k] = true; }
        return;
      }
      var len = clue[ci];
      for (var s = start; s + need[ci] <= n; s++) {
        if (s > start && cur[s - 1] === 1) break;        /* 앞에 칠해야 할 칸을 건너뛸 수는 없다 */
        var ok = true;
        for (k = s; k < s + len; k++) if (cur[k] === 0) { ok = false; break; }
        if (!ok) continue;
        if (s + len < n && cur[s + len] === 1) continue;
        for (k = start; k < s; k++) arr[k] = 0;
        for (k = s; k < s + len; k++) arr[k] = 1;
        if (s + len < n) arr[s + len] = 0;
        place(ci + 1, Math.min(n, s + len + 1));
      }
    }
    place(0, 0);
    if (!any) return null;
    var out = [];
    for (i = 0; i < n; i++) out.push(canF[i] && !canE[i] ? 1 : (canE[i] && !canF[i] ? 0 : cur[i]));
    return out;
  }

  /** 한 줄씩만 보고 끝까지 풀리는가 — 풀리면 답이 하나뿐이고 찍을 필요가 없다 */
  function lineSolvable(cl, n) {
    var g = [], r, c, line, res, changed = true, i;
    for (i = 0; i < n * n; i++) g.push(-1);
    while (changed) {
      changed = false;
      for (r = 0; r < n; r++) {
        line = g.slice(r * n, r * n + n);
        res = solveLine(cl.rows[r], line);
        if (!res) return false;
        for (c = 0; c < n; c++) if (res[c] !== line[c]) { g[r * n + c] = res[c]; changed = true; }
      }
      for (c = 0; c < n; c++) {
        line = [];
        for (r = 0; r < n; r++) line.push(g[r * n + c]);
        res = solveLine(cl.cols[c], line);
        if (!res) return false;
        for (r = 0; r < n; r++) if (res[r] !== line[r]) { g[r * n + c] = res[r]; changed = true; }
      }
    }
    return g.indexOf(-1) < 0;
  }

  /** 판 하나 — 좌우가 맞는 무늬를 짜고, 한 줄씩 풀리는 것만 고른다 */
  function makeBoard(L) {
    var n = L.n, half = Math.ceil(n / 2);
    for (var tries = 0; tries < 400; tries++) {
      var sol = [], r, c;
      for (r = 0; r < n; r++) {
        var row = [];
        for (c = 0; c < half; c++) row.push(Math.random() < L.dens ? 1 : 0);
        for (c = 0; c < n; c++) sol.push(c < half ? row[c] : row[n - 1 - c]);
      }
      var cl = cluesOf(sol, n);
      /* 빈 줄이 있으면 무늬가 끊겨 보이고 풀 거리도 줄어 다시 짠다 */
      var empty = cl.rows.concat(cl.cols).some(function (x) { return !x.length; });
      if (empty || !lineSolvable(cl, n)) continue;
      return { sol: sol.join(''), rows: cl.rows, cols: cl.cols };
    }
    /* 거의 일어나지 않지만, 끝내 못 찾으면 조금 더 꽉 찬 무늬로 다시 짠다 (꽉 찰수록 잘 풀린다) */
    return makeBoard({ n: n, dens: Math.min(.9, L.dens + .1) });
  }
  function makeSet(level, rounds) {
    var L = LEVELS[level] || LEVELS.easy, out = [];
    for (var r = 0; r < rounds; r++) out.push(makeBoard(L));
    return out;
  }

  /* ================= 상태 ================= */

  function blankMarks(n) { var m = []; for (var i = 0; i < n * n; i++) m.push(0); return m; }

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      boards: makeSet(level, L.rounds),
      r: 0, marks: blankMarks(L.n), solved: 0, hints: [],
      elapsed: 0, done: false
    };
    for (var i = 0; i < L.rounds; i++) S.hints.push(0);
    persist();
  }
  function persist() {
    if (!S || S.done) return;
    Store.saveSession('nonogram', {
      day: S.day, level: S.level, boards: S.boards, r: S.r, marks: S.marks,
      solved: S.solved, hints: S.hints, elapsed: S.elapsed
    });
  }
  function restore(s) {
    var key = LEVELS[s.level] ? s.level : 'easy';
    S = {
      day: s.day, level: key,
      boards: s.boards, r: s.r || 0, marks: s.marks || blankMarks(LEVELS[key].n),
      solved: s.solved || 0, hints: s.hints || [],
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('nonogram');
    var best = Store.bestEver('nonogram');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('네모로직') + '</h2>') +
        ('<p class="intro__desc">' + T('줄마다 적힌 숫자만큼 칸을 이어서 칠합니다.') + '<br>' +
          T('숫자가 둘 이상이면 그 사이를 한 칸 이상 띄웁니다. 다 맞으면 그림이 나옵니다.') +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="ngResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{n}번째 판부터', { n: (sess.r || 0) + 1 }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · ' + T('{n}판 · 제한 {m}분', { n: L.rounds, m: Math.round(L.limit / 60) }) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="ngPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="ngRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#ngResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#ngPrint').addEventListener('click', function () { Print.dialog('nonogram'); });
    root.querySelector('#ngRules').addEventListener('click', function () { App.showRules('nonogram'); });
  }

  /* ================= 화면: 판 ================= */

  function clueHtml(list, cls) {
    return '<span class="' + cls + '">' + list.map(function (v) { return '<b>' + v + '</b>'; }).join('') + '</span>';
  }

  function renderBoard() {
    if (!mounted) return;
    var L = lv(), n = L.n;
    if (S.r >= S.boards.length) return finish();
    var B = S.boards[S.r];
    locked = false;

    var cells = '<span class="ng-corner"></span>';
    for (var c = 0; c < n; c++) cells += '<span class="ng-cc' + edge(-1, c, n) + '" data-c="' + c + '">' + clueHtml(B.cols[c], 'ng-col') + '</span>';
    for (var r = 0; r < n; r++) {
      cells += '<span class="ng-rc" data-r="' + r + '">' + clueHtml(B.rows[r], 'ng-row') + '</span>';
      for (c = 0; c < n; c++) {
        var i = r * n + c;
        cells += '<span class="ng-cell' + edge(r, c, n) + markCls(S.marks[i]) + '" data-i="' + i + '"></span>';
      }
    }

    root.innerHTML =
      '<section class="game nonogram">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="ngTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b>') + (S.r + 1) + '/' + S.boards.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('힌트') + '</span><b id="ngHint">') + (S.hints[S.r] || 0) + '</b></div>' +
        '</div>' +

        ('<p class="mt-hint" id="ngMsg">' + T('숫자만큼 칸을 이어서 칠하세요') + '</p>') +

        '<div class="ng-board' + (n >= 10 ? ' ng-board--big' : '') + '" id="ngBoard" style="--n:' + n + '">' + cells + '</div>' +

        '<div class="ng-mode" id="ngMode">' +
          '<button data-m="fill"' + (mode === 'fill' ? ' class="is-on"' : '') + '><i class="ng-sw ng-sw--fill"></i>' + T('칠하기') + '</button>' +
          '<button data-m="x"' + (mode === 'x' ? ' class="is-on"' : '') + '><i class="ng-sw ng-sw--x">✕</i>' + T('X 표시') + '</button>' +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="ngHintBtn"><span>💡</span>' + T('힌트') + '</button>') +
          ('<button class="tool" id="ngNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="ngQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="ngSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#ngTime'),
      msg: root.querySelector('#ngMsg'),
      hint: root.querySelector('#ngHint'),
      board: root.querySelector('#ngBoard')
    };

    bindPaint(els.board);
    root.querySelectorAll('#ngMode button').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.m;
        root.querySelectorAll('#ngMode button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      });
    });
    root.querySelector('#ngHintBtn').addEventListener('click', hint);
    root.querySelector('#ngNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('nonogram'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#ngQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#ngSwitch').addEventListener('click', function () { App.gameSwitcher('nonogram'); });

    refreshClues();
    startTimer();
  }

  /** 다섯 칸마다 굵은 선 — 칸을 세기 쉽게 */
  function edge(r, c, n) {
    var s = '';
    if (r < 0) return '';                              /* 위쪽 숫자 칸 */
    if (c % 5 === 4 && c !== n - 1) s += ' is-r5';
    if (r % 5 === 4 && r !== n - 1) s += ' is-b5';
    if (r === 0) s += ' is-top';
    if (c === 0) s += ' is-left';
    if (c === n - 1) s += ' is-right';
    if (r === n - 1) s += ' is-bottom';
    return s;
  }
  function markCls(m) { return m === 1 ? ' is-fill' : (m === 2 ? ' is-x' : ''); }

  function setMark(i, m) {
    S.marks[i] = m;
    var el = els.board.querySelector('[data-i="' + i + '"]');
    if (el) {
      el.classList.toggle('is-fill', m === 1);
      el.classList.toggle('is-x', m === 2);
    }
  }

  /* 누르고 밀어 칠하기 — 처음 누른 칸과 같은 상태였던 칸만 함께 바꾼다.
     (칠한 칸을 밀어 지우다가 X 칸까지 지워 버리지 않게) */
  function bindPaint(board) {
    var from = null, to = null, touched = null;

    function cellAt(e) {
      var t = document.elementFromPoint(e.clientX, e.clientY);
      return t && t.classList && t.classList.contains('ng-cell') && board.contains(t) ? t : null;
    }
    function paint(el) {
      var i = parseInt(el.dataset.i, 10);
      if (touched[i] || S.marks[i] !== from) return;
      touched[i] = true;
      setMark(i, to);
    }
    board.addEventListener('pointerdown', function (e) {
      if (locked) return;
      var el = cellAt(e);
      if (!el) return;
      e.preventDefault();
      var i = parseInt(el.dataset.i, 10);
      from = S.marks[i];
      var want = mode === 'fill' ? 1 : 2;
      to = from === want ? 0 : want;
      touched = {};
      paint(el);
      UI.beep('tick');
      if (board.setPointerCapture) { try { board.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    /* 손가락을 빨리 밀면 움직임 소식이 띄엄띄엄 와서 칸을 건너뛴다.
       지난 자리와 지금 자리 사이를 잘게 나눠 그 사이 칸도 모두 칠한다. */
    var last = null;
    board.addEventListener('pointermove', function (e) {
      if (from === null || locked) return;
      var p = { clientX: e.clientX, clientY: e.clientY };
      if (last) {
        var dx = p.clientX - last.clientX, dy = p.clientY - last.clientY;
        var steps = Math.min(60, Math.ceil(Math.sqrt(dx * dx + dy * dy) / 6));
        for (var k = 1; k < steps; k++) {
          var mid = cellAt({ clientX: last.clientX + dx * k / steps, clientY: last.clientY + dy * k / steps });
          if (mid) paint(mid);
        }
      }
      last = p;
      var el = cellAt(e);
      if (el) paint(el);
    });
    board.addEventListener('pointerdown', function (e) { last = { clientX: e.clientX, clientY: e.clientY }; });
    var end = function () {
      if (from === null) return;
      from = null;
      last = null;
      afterChange();
    };
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
  }

  /** 줄의 칠한 칸이 숫자와 꼭 맞으면 그 숫자를 흐리게 — 다 된 줄을 한눈에 */
  function refreshClues() {
    var n = lv().n, B = S.boards[S.r], r, c, line;
    for (r = 0; r < n; r++) {
      line = [];
      for (c = 0; c < n; c++) line.push(S.marks[r * n + c] === 1 ? 1 : 0);
      var re = els.board.querySelector('.ng-rc[data-r="' + r + '"]');
      if (re) re.classList.toggle('is-ok', runs(line).join() === B.rows[r].join());
    }
    for (c = 0; c < n; c++) {
      line = [];
      for (r = 0; r < n; r++) line.push(S.marks[r * n + c] === 1 ? 1 : 0);
      var ce = els.board.querySelector('.ng-cc[data-c="' + c + '"]');
      if (ce) ce.classList.toggle('is-ok', runs(line).join() === B.cols[c].join());
    }
  }

  function isSolved() {
    var sol = S.boards[S.r].sol;
    for (var i = 0; i < sol.length; i++) if ((S.marks[i] === 1) !== (sol.charAt(i) === '1')) return false;
    return true;
  }

  function afterChange() {
    refreshClues();
    if (!isSolved()) { persist(); return; }

    /* 한 판 끝 — X 를 걷어 내고 그림만 남긴다 */
    locked = true;
    stopTimer();
    S.marks.forEach(function (m, i) { if (m === 2) setMark(i, 0); });
    els.board.classList.add('is-solved');
    els.msg.innerHTML = '<b class="mt-ok">' + T('그림 완성!') + '</b>';
    UI.beep('ok');
    S.solved++;
    S.r++;
    S.marks = S.r < S.boards.length ? blankMarks(lv().n) : S.marks;
    persist();
    clearPending();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      if (!mounted || !S || S.done) return;
      if (S.r >= S.boards.length) finish();
      else renderBoard();
    }, 1800);
  }

  /** 힌트 — 아직 틀렸거나 비어 있는 칸 하나를 바르게 고쳐 준다.
      잘못 칠한 칸이 있으면 그것부터 고친다 (어디가 틀렸는지 모르는 것이 가장 답답하다). */
  function hint() {
    if (locked) return;
    var sol = S.boards[S.r].sol, wrong = -1, blank = [], i;
    for (i = 0; i < sol.length; i++) {
      var need = sol.charAt(i) === '1';
      if (S.marks[i] === 1 && !need) { wrong = i; break; }
      if (need && S.marks[i] !== 1) blank.push(i);
    }
    var pick = wrong >= 0 ? wrong : blank[Math.floor(Math.random() * blank.length)];
    if (pick == null) return;
    S.hints[S.r] = (S.hints[S.r] || 0) + 1;
    els.hint.textContent = S.hints[S.r];
    setMark(pick, sol.charAt(pick) === '1' ? 1 : 2);
    var el = els.board.querySelector('[data-i="' + pick + '"]');
    if (el) { el.classList.add('is-hint'); setTimeout(function () { el.classList.remove('is-hint'); }, 900); }
    els.msg.textContent = wrong >= 0 ? T('잘못 칠한 칸을 X 로 고쳤습니다') : T('칠해야 할 칸 하나를 칠했습니다');
    afterChange();
  }

  /* ================= 시간 ================= */

  function startTimer() {
    stopTimer();
    var L = lv();
    els.time.textContent = UI.fmtTime(L.limit - S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done || !mounted || locked) return;
      S.elapsed++;
      var left = L.limit - S.elapsed;
      els.time.textContent = UI.fmtTime(left);
      els.time.classList.toggle('is-urgent', left <= 30);
      if (S.elapsed % 10 === 0) persist();
      if (left <= 0) finish();
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  /* ================= 점수 ================= */

  /** 그만둔 판도 바르게 칠한 만큼은 쳐 준다 (잘못 칠한 칸만큼 뺀다) */
  function partial() {
    if (S.r >= S.boards.length) return 0;
    var sol = S.boards[S.r].sol, good = 0, bad = 0, all = 0;
    for (var i = 0; i < sol.length; i++) {
      var need = sol.charAt(i) === '1';
      if (need) all++;
      if (S.marks[i] === 1) { if (need) good++; else bad++; }
    }
    return all ? Math.max(0, (good - bad) / all) : 0;
  }

  function score() {
    var L = lv();
    var part = partial();
    var right = Math.round(600 * Math.min(1, (S.solved + part) / L.rounds));
    var all = S.solved >= L.rounds;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    var clean = 0;
    for (var i = 0; i < S.solved; i++) if (!S.hints[i]) clean++;
    var self = Math.round(100 * clean / L.rounds);
    var bonus = all ? L.bonus : 0;
    var hints = S.hints.reduce(function (a, b) { return a + (b || 0); }, 0);
    return {
      right: right, time: time, self: self, bonus: bonus,
      total: right + time + self + bonus,
      solved: S.solved, clean: clean, hints: hints, all: all
    };
  }

  function finish() {
    S.done = true;
    stopTimer();
    clearPending();
    Store.clearSession('nonogram');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'nonogram', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { solved: sc.solved, rounds: L.rounds, hints: sc.hints }
    });

    var rows = [
      { label: T('풀기 점수 ({a}/{b}판)', { a: sc.solved, b: L.rounds }), value: sc.right }
    ];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('혼자 풀기 보너스 (힌트 없이 푼 판 {a}/{b})', { a: sc.clean, b: L.rounds }), value: sc.self });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('네모로직 {n}단계 완료!', { n: L.step }),
      rows: rows,
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('nonogram'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderBoard(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderBoard(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<path d="M3 3h18v18H3z"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>' +
         '<rect x="9" y="3" width="6" height="6" fill="currentColor" stroke="none"/>' +
         '<rect x="3" y="9" width="18" height="6" fill="currentColor" stroke="none"/>' +
         '<rect x="9" y="15" width="6" height="6" fill="currentColor" stroke="none"/>',
    id: 'nonogram', name: T('네모로직'), tagline: T('숫자대로 칠하면 그림이 나와요'),
    rules: {
      title: T('네모로직 점수 규칙'),
      lines: [
        [T('난이도'), T('판이 커지고 숫자가 잘게 나뉩니다 — 1·2단계 5×5 · 3단계 7×7 · 4단계 8×8 · 5단계 10×10')],
        [T('하는 법'), T('줄마다 적힌 숫자만큼 칸을 이어 칠합니다. 숫자가 둘 이상이면 사이를 한 칸 이상 띄웁니다')],
        [T('X 표시'), T('비워 둘 칸이 확실하면 X 를 놓아 두면 헷갈리지 않습니다. 점수와는 상관없습니다')],
        [T('풀기 점수'), T('최대 600점 · 다 푼 판 수에 비례 (그만둔 판은 바르게 칠한 만큼)')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('혼자 풀기 보너스'), T('최대 100점 · 힌트 없이 푼 판마다')],
        [T('오답 감점'), T('없음 — 잘못 칠해도 다시 누르면 지워집니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () {
      mounted = false;
      stopTimer(); clearPending(); persist();
    },
    hasProgress: function () { return !!Store.getSession('nonogram'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 — 판 여러 장. 종이에서는 연필로 칸을 칠한다 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        n: L.n, boards: makeSet(key, count || (L.n <= 8 ? 4 : 2))
      };
    }
  };
})();
