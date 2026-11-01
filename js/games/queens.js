/* 새록 — 퀸 놓기
 * 점수: 풀기 600 + 시간 300 + 혼자 풀기 100 + 난이도 보너스
 *
 * 색깔로 나뉜 판에 왕관을 놓는다. 가로줄·세로줄·색 구역마다 딱 하나씩,
 * 그리고 왕관끼리는 (대각선으로도) 서로 닿으면 안 된다.
 * 링크드인의 매일 퍼즐 'Queens' 로 영어권에서 이름난 논리 퍼즐이고,
 * 숫자도 글자도 없어 어느 나라에서나 그대로 통한다. 2026-11-01 에 넣었다.
 *
 * 판은 매번 새로 짠다 —
 *  1. 서로 닿지 않게 왕관 자리부터 정한다 (줄마다 하나, 칸마다 하나).
 *  2. 왕관 자리에서 색 구역을 하나씩 키워 판을 채운다.
 *  3. 답이 둘 이상이면, 다른 답에 쓰인 칸 하나를 이웃 구역으로 옮겨 그 답을 깨뜨린다.
 *     정해 둔 왕관 자리는 건드리지 않으므로 처음 답은 그대로 남는다. 답이 하나가 될 때까지 되풀이한다.
 *  (무작위로 짜서 답이 하나인 판을 기다리면 8칸 판 하나에 몇 초씩 걸려 이렇게 했다)
 *
 * 왕관끼리 규칙을 어기면 둘 다 붉게 표시된다. 점수는 깎이지 않는다.
 */
window.Games = window.Games || {};
window.Games.queens = (function () {

  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, n: 5, rounds: 3, limit: 360,  bonus: 0,
              note: T('{n}×{n} 칸', { n: 5 }) },
    step2:  { name: T('가볍게'), step: 2, n: 6, rounds: 3, limit: 480,  bonus: 0,
              note: T('{n}×{n} 칸', { n: 6 }) },
    easy:   { name: T('쉬움'),   step: 3, n: 7, rounds: 2, limit: 480,  bonus: 0,
              note: T('{n}×{n} 칸', { n: 7 }) },
    normal: { name: T('보통'),   step: 4, n: 8, rounds: 2, limit: 600,  bonus: 100,
              note: T('{n}×{n} 칸', { n: 8 }) },
    hard:   { name: T('어려움'), step: 5, n: 9, rounds: 2, limit: 780,  bonus: 250,
              note: T('{n}×{n} 칸', { n: 9 }) }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  /* 구역 색 아홉 — 옅게 칠해 왕관이 잘 보이게, 이웃끼리 헷갈리지 않게 서로 멀리 떨어진 색으로 골랐다.
     색만으로 가르지 않도록 구역 경계에는 굵은 선을 함께 긋는다 (색을 잘 못 가리는 분·흑백 인쇄). */
  var COLORS = ['#F6B3AC', '#A8CBF4', '#B6E2AE', '#F7DE8C', '#D3B9EF', '#F8C78F', '#9FDDD7', '#E9B6D5', '#D2D0C3'];
  var CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5L3 8z"/><rect x="5" y="19.2" width="14" height="2" rx="1" fill="currentColor"/></svg>';

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;
  var mode = 'crown';                /* 'crown' 왕관 · 'x' X 표시 */

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function nbrs(i, n) {
    var y = Math.floor(i / n), x = i % n, out = [];
    if (y > 0) out.push(i - n);
    if (y < n - 1) out.push(i + n);
    if (x > 0) out.push(i - 1);
    if (x < n - 1) out.push(i + 1);
    return out;
  }

  /* ================= 판 만들기 ================= */

  /** 줄마다 왕관 칸 하나 — col[r] 이 r 번째 줄의 왕관 칸. 위아래 줄끼리 닿지 않게 */
  function placeQueens(n) {
    var col = [];
    function go(r) {
      if (r === n) return true;
      var cs = shuffle(Array.apply(null, { length: n }).map(function (_, i) { return i; }));
      for (var k = 0; k < cs.length; k++) {
        var c = cs[k];
        if (col.indexOf(c) >= 0 || (r > 0 && Math.abs(col[r - 1] - c) < 2)) continue;
        col.push(c);
        if (go(r + 1)) return true;
        col.pop();
      }
      return false;
    }
    go(0);
    return col;
  }

  /** 왕관 칸에서 구역을 키운다 — 작은 구역일수록 먼저 자라게 해서 크기가 너무 들쭉날쭉하지 않게 한다.
      (한 구역이 판의 절반을 먹으면 나머지가 너무 좁아져 풀 거리가 사라진다) */
  function growRegions(n, q) {
    var reg = [], size = [], i, g;
    for (i = 0; i < n * n; i++) reg.push(-1);
    q.forEach(function (c, r) { reg[r * n + c] = r; size.push(1); });
    for (var left = n * n - n; left > 0; left--) {
      var front = {};                                   /* 구역마다 자랄 수 있는 빈 칸 */
      for (i = 0; i < n * n; i++) {
        if (reg[i] >= 0) continue;
        nbrs(i, n).forEach(function (j) {
          if (reg[j] >= 0) (front[reg[j]] = front[reg[j]] || []).push(i);
        });
      }
      var keys = Object.keys(front), sum = 0, w = keys.map(function (k) {
        var v = 1 / Math.pow(size[k], 1.5); sum += v; return v;
      });
      var x = Math.random() * sum;
      for (g = 0; g < keys.length - 1 && x > w[g]; g++) x -= w[g];
      var k = +keys[g], cells = front[k];
      reg[cells[Math.floor(Math.random() * cells.length)]] = k;
      size[k]++;
    }
    return reg;
  }

  /** 정해 둔 답(sol)과 다른 답을 하나 찾는다. 없으면 null */
  function otherSolution(n, reg, sol) {
    var col = [], usedC = [], usedR = [], found = null;
    function go(r) {
      if (found) return;
      if (r === n) {
        for (var k = 0; k < n; k++) if (col[k] !== sol[k]) { found = col.slice(); return; }
        return;
      }
      for (var c = 0; c < n; c++) {
        var g = reg[r * n + c];
        if (usedC[c] || usedR[g] || (r > 0 && Math.abs(col[r - 1] - c) < 2)) continue;
        usedC[c] = usedR[g] = true; col.push(c);
        go(r + 1);
        col.pop(); usedC[c] = usedR[g] = false;
        if (found) return;
      }
    }
    go(0);
    return found;
  }

  /** 칸 하나를 빼도 구역이 한 덩어리로 남는가.
      한 칸짜리 구역은 만들지 않는다 — 왕관 자리를 그냥 알려 주는 셈이라 풀 거리가 사라진다. */
  function stillJoined(n, reg, cell) {
    var g = reg[cell], start = -1, total = 0, i;
    for (i = 0; i < n * n; i++) if (i !== cell && reg[i] === g) { total++; if (start < 0) start = i; }
    if (total < 2) return false;
    var seen = {}, stack = [start], cnt = 0;
    seen[start] = true;
    while (stack.length) {
      var x = stack.pop(); cnt++;
      nbrs(x, n).forEach(function (j) {
        if (j !== cell && !seen[j] && reg[j] === g) { seen[j] = true; stack.push(j); }
      });
    }
    return cnt === total;
  }

  function makeBoard(n) {
    for (var attempt = 0; attempt < 50; attempt++) {
      var sol = placeQueens(n), reg = growRegions(n, sol), isQ = {};
      sol.forEach(function (c, r) { isQ[r * n + c] = true; });
      for (var step = 0; step < 400; step++) {
        var alt = otherSolution(n, reg, sol);
        if (!alt) return { n: n, reg: reg, sol: sol };
        /* 다른 답의 왕관 칸 중 하나를 이웃 구역으로 옮긴다 — 그 구역에 왕관이 둘이 되어 다른 답이 깨진다 */
        var moved = false, rows = shuffle(alt.map(function (_, r) { return r; }));
        for (var k = 0; k < rows.length && !moved; k++) {
          var cell = rows[k] * n + alt[rows[k]];
          if (isQ[cell] || !stillJoined(n, reg, cell)) continue;
          var to = shuffle(nbrs(cell, n).map(function (j) { return reg[j]; })
            .filter(function (g) { return g !== reg[cell]; }));
          if (to.length) { reg[cell] = to[0]; moved = true; }
        }
        if (!moved) break;                          /* 옮길 칸이 없으면 처음부터 다시 */
      }
    }
    return makeBoard(n);
  }
  function makeSet(level, rounds) {
    var L = LEVELS[level] || LEVELS.easy, out = [];
    for (var r = 0; r < rounds; r++) out.push(makeBoard(L.n));
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
    Store.saveSession('queens', {
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
    var sess = Store.getSession('queens');
    var best = Store.bestEver('queens');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('퀸 놓기') + '</h2>') +
        ('<p class="intro__desc">' + T('가로줄·세로줄·같은 색 구역마다 왕관을 하나씩 놓습니다.') + '<br>' +
          T('왕관끼리는 대각선으로도 서로 닿으면 안 됩니다.') +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="qnResume">' + T('이어서 하기') + ' <small>') +
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
        ('<button class="btn btn--ghost btn--print" id="qnPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="qnRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#qnResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#qnPrint').addEventListener('click', function () { Print.dialog('queens'); });
    root.querySelector('#qnRules').addEventListener('click', function () { App.showRules('queens'); });
  }

  /* ================= 화면: 판 ================= */

  /** 이웃 칸과 구역이 다르면 그쪽 테두리를 굵게 */
  function edgeCls(B, i) {
    var n = B.n, y = Math.floor(i / n), x = i % n, s = '';
    if (x < n - 1 && B.reg[i + 1] !== B.reg[i]) s += ' is-er';
    if (y < n - 1 && B.reg[i + n] !== B.reg[i]) s += ' is-eb';
    return s;
  }

  function renderBoard() {
    if (!mounted) return;
    var L = lv(), n = L.n;
    if (S.r >= S.boards.length) return finish();
    var B = S.boards[S.r];
    locked = false;

    var cells = '';
    for (var i = 0; i < n * n; i++) {
      cells += '<span class="qn-cell' + edgeCls(B, i) + markCls(S.marks[i]) + '" data-i="' + i + '" style="background:' + COLORS[B.reg[i] % COLORS.length] + '">' + CROWN + '</span>';
    }

    root.innerHTML =
      '<section class="game queens">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="qnTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b>') + (S.r + 1) + '/' + S.boards.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('왕관') + '</span><b id="qnCount">0/' + n + '</b></div>') +
        '</div>' +

        ('<p class="mt-hint" id="qnMsg">' + T('줄마다·색마다 왕관을 하나씩 놓으세요') + '</p>') +

        '<div class="qn-board" id="qnBoard" style="--n:' + n + '">' + cells + '</div>' +

        '<div class="ng-mode" id="qnMode">' +
          '<button data-m="crown"' + (mode === 'crown' ? ' class="is-on"' : '') + '><i class="qn-sw">' + CROWN + '</i>' + T('왕관') + '</button>' +
          '<button data-m="x"' + (mode === 'x' ? ' class="is-on"' : '') + '><i class="ng-sw ng-sw--x">✕</i>' + T('X 표시') + '</button>' +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="qnHintBtn"><span>💡</span>' + T('힌트') + '</button>') +
          ('<button class="tool" id="qnNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="qnQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="qnSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#qnTime'),
      msg: root.querySelector('#qnMsg'),
      count: root.querySelector('#qnCount'),
      board: root.querySelector('#qnBoard')
    };

    bindTap(els.board);
    root.querySelectorAll('#qnMode button').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.m;
        root.querySelectorAll('#qnMode button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      });
    });
    root.querySelector('#qnHintBtn').addEventListener('click', hint);
    root.querySelector('#qnNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('queens'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#qnQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#qnSwitch').addEventListener('click', function () { App.gameSwitcher('queens'); });

    refresh();
    startTimer();
  }

  function markCls(m) { return m === 1 ? ' is-crown' : (m === 2 ? ' is-x' : ''); }

  function setMark(i, m) {
    S.marks[i] = m;
    var el = els.board.querySelector('[data-i="' + i + '"]');
    if (el) {
      el.classList.toggle('is-crown', m === 1);
      el.classList.toggle('is-x', m === 2);
    }
  }

  /* 왕관은 한 칸씩 누른다. X 는 누른 채 밀어 여러 칸에 한꺼번에 놓을 수 있다
     (네모로직과 같은 방식 — 처음 누른 칸과 같은 상태였던 칸만 바꾼다). */
  function bindTap(board) {
    var from = null, to = null, touched = null, last = null;
    function cellAt(p) {
      var t = document.elementFromPoint(p.clientX, p.clientY);
      t = t && t.closest ? t.closest('.qn-cell') : null;
      return t && board.contains(t) ? t : null;
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
      var want = mode === 'crown' ? 1 : 2;
      to = from === want ? 0 : want;
      touched = {};
      last = { clientX: e.clientX, clientY: e.clientY };
      paint(el);
      UI.beep('tick');
      if (board.setPointerCapture) { try { board.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    board.addEventListener('pointermove', function (e) {
      if (from === null || locked || to === 1) return;     /* 왕관은 밀어서 놓지 않는다 */
      var p = { clientX: e.clientX, clientY: e.clientY };
      var dx = p.clientX - last.clientX, dy = p.clientY - last.clientY;
      var steps = Math.min(60, Math.ceil(Math.sqrt(dx * dx + dy * dy) / 6));
      for (var k = 1; k <= steps; k++) {
        var el = cellAt({ clientX: last.clientX + dx * k / steps, clientY: last.clientY + dy * k / steps });
        if (el) paint(el);
      }
      last = p;
    });
    var end = function () {
      if (from === null) return;
      from = null; last = null;
      afterChange();
    };
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
  }

  /** 규칙을 어긴 왕관 — 같은 줄·칸·구역이거나 서로 닿은 것 */
  function conflicts() {
    var B = S.boards[S.r], n = B.n, crowns = [], bad = {}, i, j;
    for (i = 0; i < n * n; i++) if (S.marks[i] === 1) crowns.push(i);
    for (i = 0; i < crowns.length; i++) for (j = i + 1; j < crowns.length; j++) {
      var a = crowns[i], b = crowns[j];
      var ay = Math.floor(a / n), ax = a % n, by = Math.floor(b / n), bx = b % n;
      if (ay === by || ax === bx || B.reg[a] === B.reg[b] ||
          (Math.abs(ay - by) <= 1 && Math.abs(ax - bx) <= 1)) { bad[a] = bad[b] = true; }
    }
    return { crowns: crowns, bad: bad };
  }

  function refresh() {
    var c = conflicts(), n = lv().n;
    els.board.querySelectorAll('.qn-cell').forEach(function (el) {
      el.classList.toggle('is-bad', !!c.bad[el.dataset.i]);
    });
    els.count.textContent = c.crowns.length + '/' + n;
    return c;
  }

  function afterChange() {
    var c = refresh(), n = lv().n;
    var anyBad = Object.keys(c.bad).length > 0;
    if (anyBad) els.msg.innerHTML = '<b class="mt-no">' + T('붉은 왕관끼리 규칙에 맞지 않아요') + '</b>';
    else els.msg.textContent = T('줄마다·색마다 왕관을 하나씩 놓으세요');
    if (anyBad || c.crowns.length !== n) { persist(); return; }

    /* 한 판 끝 — 왕관 n 개가 서로 어긋나지 않으면 그것이 곧 답이다 (답은 하나뿐이다) */
    locked = true;
    stopTimer();
    S.marks.forEach(function (m, i) { if (m === 2) setMark(i, 0); });
    els.board.classList.add('is-solved');
    els.msg.innerHTML = '<b class="mt-ok">' + T('모두 맞게 놓았습니다!') + '</b>';
    UI.beep('ok');
    S.solved++;
    S.r++;
    S.marks = S.r < S.boards.length ? blankMarks(n) : S.marks;
    persist();
    clearPending();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      if (!mounted || !S || S.done) return;
      if (S.r >= S.boards.length) finish();
      else renderBoard();
    }, 1600);
  }

  /** 힌트 — 잘못 놓은 왕관이 있으면 걷어 내고, 없으면 맞는 자리 하나에 왕관을 놓는다 */
  function hint() {
    if (locked) return;
    var B = S.boards[S.r], n = B.n, good = {}, wrong = -1, todo = [], i;
    B.sol.forEach(function (c, r) { good[r * n + c] = true; });
    for (i = 0; i < n * n; i++) {
      if (S.marks[i] === 1 && !good[i]) { wrong = i; break; }
      if (good[i] && S.marks[i] !== 1) todo.push(i);
    }
    var pick = wrong >= 0 ? wrong : todo[Math.floor(Math.random() * todo.length)];
    if (pick == null) return;
    S.hints[S.r] = (S.hints[S.r] || 0) + 1;
    setMark(pick, wrong >= 0 ? 2 : 1);
    var el = els.board.querySelector('[data-i="' + pick + '"]');
    if (el) { el.classList.add('is-hint'); setTimeout(function () { el.classList.remove('is-hint'); }, 900); }
    afterChange();
    if (!locked) els.msg.textContent = wrong >= 0 ? T('잘못 놓은 왕관을 걷어 냈습니다') : T('맞는 자리에 왕관 하나를 놓았습니다');
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

  /** 그만둔 판은 맞는 자리에 놓은 왕관만큼 쳐 준다 (틀린 왕관만큼 뺀다) */
  function partial() {
    if (S.r >= S.boards.length) return 0;
    var B = S.boards[S.r], n = B.n, good = {}, ok = 0, bad = 0;
    B.sol.forEach(function (c, r) { good[r * n + c] = true; });
    S.marks.forEach(function (m, i) { if (m === 1) { if (good[i]) ok++; else bad++; } });
    return Math.max(0, (ok - bad) / n);
  }

  function score() {
    var L = lv();
    var right = Math.round(600 * Math.min(1, (S.solved + partial()) / L.rounds));
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
    Store.clearSession('queens');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'queens', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
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
      headline: T('퀸 놓기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('queens'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderBoard(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderBoard(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<path d="M3 3h18v18H3z"/><path d="M12 3v9H3M12 12h9M12 12v9"/>' +
         '<path d="M5 9l1.5-3 1.5 1.5L9.5 6 11 9z" fill="currentColor" stroke="none"/>' +
         '<path d="M14 20l1.5-3 1.5 1.5 1.5-1.5L20 20z" fill="currentColor" stroke="none"/>',
    id: 'queens', name: T('퀸 놓기'), tagline: T('줄마다·색마다 왕관 하나씩'),
    rules: {
      title: T('퀸 놓기 점수 규칙'),
      lines: [
        [T('난이도'), T('판이 커집니다 — 1단계 5×5 · 2단계 6×6 · 3단계 7×7 · 4단계 8×8 · 5단계 9×9')],
        [T('하는 법'), T('가로줄·세로줄·같은 색 구역마다 왕관을 하나씩 놓습니다. 왕관끼리는 대각선으로도 닿으면 안 됩니다')],
        [T('X 표시'), T('왕관이 못 들어갈 칸에 X 를 놓아 두면 헷갈리지 않습니다. 누른 채 밀면 여러 칸에 한꺼번에 놓입니다')],
        [T('풀기 점수'), T('최대 600점 · 다 푼 판 수에 비례 (그만둔 판은 맞게 놓은 왕관만큼)')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('혼자 풀기 보너스'), T('최대 100점 · 힌트 없이 푼 판마다')],
        [T('오답 감점'), T('없음 — 규칙에 어긋난 왕관은 붉게 보일 뿐입니다')],
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
    hasProgress: function () { return !!Store.getSession('queens'); },
    levels: LEVELS,
    levelOrder: ORDER,
    colors: COLORS,
    /** 인쇄용 — 한 장에 넉 판. 종이에서는 왕관 대신 동그라미를 그린다 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        n: L.n, boards: makeSet(key, count || 4)
      };
    }
  };
})();
