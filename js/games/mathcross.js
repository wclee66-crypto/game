/* 새록 — 계산 퍼즐 (가로세로 셈)
 * 점수: 채우기 600 + 시간 300 + 정확도 100 − (힌트 50/회) + 난이도 보너스
 *
 * 십자말풀이처럼 생겼는데 낱말 대신 셈이 들어간다.
 * 가로 식과 세로 식이 모서리에서 숫자 한 칸을 함께 쓰므로,
 * 한 칸을 채우면 다른 식도 함께 풀린다. 그 맞물림이 이 놀이의 재미다.
 *
 * 말이 필요 없는 게임이라 문구만 바꾸면 세계 어디서나 그대로 통한다.
 *
 * 어르신을 위해 정한 것 —
 *  1) **빈칸의 답은 언제나 한 자리(1~9)다.** 그래야 스도쿠와 똑같이
 *     숫자 하나만 누르면 끝난다. 두 자리를 이어 눌러야 하면 벽이 높아진다.
 *     어려운 단계는 '주어진 숫자'를 크게 하고 식을 늘려 어렵게 만든다.
 *  2) **모양을 판마다 새로 짠다.** ㄱ · 十 · ㄷ · 네모 틀 · 사다리 …
 *     같은 그림만 되풀이되면 금세 물린다.
 *  3) **더하기와 빼기만 쓴다.** 곱셈이 섞이면 식이 갑자기 어려워진다.
 *     어렵게 만드는 것은 숫자의 크기와 식의 개수로 한다.
 *  4) **틀려도 지우고 다시 넣으면 된다.** 점수는 조금 깎이지만 벌은 없다.
 *
 * 문제 만드는 법 —
 *  ① 모양을 짠다 (식 넷~여섯이 어디에 놓이는지)
 *  ② 식을 하나씩 채운다. 이미 정해진 칸이 있으면 그것에 맞춰 나머지를 고른다.
 *  ③ 지울 칸을 하나씩 늘려 보되, **지울 때마다 풀리는지 검사한다.**
 *     한 식에 모르는 칸이 하나만 남으면 그 칸은 저절로 풀린다 —
 *     이것을 더 풀 것이 없을 때까지 되풀이해 전부 풀리는지 본다.
 */
window.Games = window.Games || {};
window.Games.mathcross = (function () {

  /* ================= 모양 ================= *
   * 식 하나는 칸 다섯을 쓴다 — [수] [기호] [수] [=] [수]
   *
   * 모양을 미리 적어 두지 않고 그때그때 새로 짠다. 규칙은 두 가지뿐이다.
   *  ① 가로 식은 **짝수 줄**에, 세로 식은 **짝수 칸**에 놓고, 시작 자리도 짝수로 한다.
   *     그러면 가로와 세로가 만나는 자리가 언제나 '숫자 칸'이 된다.
   *     (식 안에서 0·2·4번째가 숫자, 1·3번째가 기호이기 때문이다)
   *  ② 한 줄에 가로 식은 하나, 한 칸에 세로 식도 하나.
   *     둘을 겹쳐 놓으면 '=' 자리와 기호 자리가 부딪친다.
   *
   * 이렇게 하면 ㄱ · 十 · ㄷ · 네모 틀 · 사다리… 가 저절로 나오고,
   * 판을 열 때마다 다른 모양이 된다.
   */

  /** N×N 판에 놓을 수 있는 식을 모두 적는다 */
  function candidates(N) {
    var out = [], r, c;
    for (r = 0; r < N; r += 2)
      for (c = 0; c + 4 < N; c += 2) out.push({ d: 'h', r: r, c: c });
    for (c = 0; c < N; c += 2)
      for (r = 0; r + 4 < N; r += 2) out.push({ d: 'v', r: r, c: c });
    return out;
  }

  /** 그 식이 차지하는 칸들 */
  function cellsOf(e) {
    var out = [];
    for (var k = 0; k < 5; k++) out.push(e.d === 'h' ? id(e.r, e.c + k) : id(e.r + k, e.c));
    return out;
  }

  /** 식 k 개짜리 모양을 짠다. 서로 이어 붙여 한 덩어리가 되게 한다. */
  function makeShape(N, k) {
    var cands = candidates(N);
    for (var t = 0; t < 80; t++) {
      var chosen = [cands[rnd(cands.length)]];
      var usedRow = {}, usedCol = {}, used = {};
      var take = function (e) {
        chosen.indexOf(e) < 0 && chosen.push(e);
        if (e.d === 'h') usedRow[e.r] = 1; else usedCol[e.c] = 1;
        cellsOf(e).forEach(function (x) { used[x] = 1; });
      };
      chosen = []; take(cands[rnd(cands.length)]);

      while (chosen.length < k) {
        var opts = cands.filter(function (e) {
          if (chosen.indexOf(e) >= 0) return false;
          if (e.d === 'h' ? usedRow[e.r] : usedCol[e.c]) return false;
          return cellsOf(e).some(function (x) { return used[x]; });   /* 이어 붙는가 */
        });
        if (!opts.length) break;
        /* 지금 적은 쪽(가로/세로)을 먼저 고른다 */
        var nh = chosen.filter(function (e) { return e.d === 'h'; }).length;
        var want = (nh * 2 <= chosen.length) ? 'h' : 'v';
        var same = opts.filter(function (e) { return e.d === want; });
        var use = same.length ? same : opts;
        take(use[rnd(use.length)]);
      }
      if (chosen.length !== k) continue;
      /* 가로와 세로가 엇비슷해야 네모 틀·사다리·계단처럼 맞물린 모양이 된다.
         세로만 여럿이면 홀로 떠 있는 칸이 생겨 무엇을 풀라는 것인지 알아보기 어렵다. */
      var h = chosen.filter(function (e) { return e.d === 'h'; }).length;
      if (Math.abs(h * 2 - k) > 1) continue;
      return chosen;
    }
    return null;
  }

  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, n: 5, eqs: 4, max: 10, ops: ['+', '−'], count: 4, limit: 300, bonus: 0,
              note: T('식 4개 · 10까지 · 더하기 빼기') },
    step2:  { name: T('가볍게'), step: 2, n: 5, eqs: 4, max: 20, ops: ['+', '−'], count: 5, limit: 330, bonus: 0,
              note: T('식 4개 · 20까지') },
    easy:   { name: T('쉬움'),   step: 3, n: 5, eqs: 5, max: 40, ops: ['+', '−'], count: 5, limit: 360, bonus: 0,
              note: T('식 5개 · 40까지') },
    normal: { name: T('보통'),   step: 4, n: 7, eqs: 5, max: 60, ops: ['+', '−'], count: 5, limit: 480, bonus: 100,
              note: T('식 5개 · 60까지') },
    hard:   { name: T('어려움'), step: 5, n: 7, eqs: 6, max: 99, ops: ['+', '−'], count: 5, limit: 600, bonus: 250,
              note: T('식 6개 · 99까지') }
  };

  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }

  /* ================= 문제 만들기 ================= */

  function calc(a, op, b) {
    if (op === '+') return a + b;
    if (op === '−') return a - b;
    return a * b;
  }

  /** 셈 하나가 어르신께 낼 만한가 */
  function ok(a, op, b, c, L) {
    if (a < 1 || b < 1 || c < 1) return false;
    if (a > L.max || b > L.max || c > L.max) return false;
    if (op === '×' && (a > 9 || b > 9)) return false;   /* 구구단을 넘지 않는다 */
    if (op === '−' && a <= b) return false;             /* 0 이나 음수가 나오지 않게 */
    return true;
  }

  /** 식 한 줄을 채운다. 이미 정해진 칸(A·B·C)이 있으면 그것에 맞춘다.
   *  숫자가 커지면 모든 짝을 훑기에는 너무 느리므로, 아무거나 골라 보고
   *  맞으면 쓰는 식으로 여러 번 시도한다. */
  function fillOne(A, B, C, L) {
    for (var t = 0; t < 600; t++) {
      var op = pick(L.ops);
      var hi = (op === '×') ? 9 : L.max;          /* 곱하기를 쓰게 될 때를 위한 안전장치 */
      var a = A, b = B, c = C;

      if (a == null && b == null && c == null) {
        a = 1 + rnd(hi); b = 1 + rnd(hi); c = calc(a, op, b);
      } else if (a == null && b == null) {        /* 답만 아는 경우 */
        b = 1 + rnd(hi);
        a = (op === '+') ? c - b : (op === '−') ? c + b : (b && c % b === 0 ? c / b : null);
      } else if (a == null) {
        if (c == null) { a = 1 + rnd(hi); c = calc(a, op, b); }
        else a = (op === '+') ? c - b : (op === '−') ? c + b : (b && c % b === 0 ? c / b : null);
      } else if (b == null) {
        if (c == null) { b = 1 + rnd(hi); c = calc(a, op, b); }
        else b = (op === '+') ? c - a : (op === '−') ? a - c : (a && c % a === 0 ? c / a : null);
      } else if (c == null) {
        c = calc(a, op, b);
      } else {
        if (calc(a, op, b) !== c) continue;
      }

      if (a == null || b == null || c == null) continue;
      if (!ok(a, op, b, c, L)) continue;
      return { a: a, op: op, b: b, c: c };
    }
    return null;
  }

  /** 칸 번호 — 줄과 칸을 하나의 숫자로 (5×5 안이므로 넉넉하다) */
  function id(r, c) { return r * 10 + c; }

  /** 모양 하나를 '식 목록'으로 편다.
   *  식마다 숫자가 들어갈 칸 셋(a·b·c)과 기호가 들어갈 칸 둘을 적어 둔다. */
  function layout(sh) {
    return sh.map(function (e) {
      var dir = e.d, r = e.r, c = e.c;
      var at = function (k) { return dir === 'h' ? id(r, c + k) : id(r + k, c); };
      return { a: at(0), opAt: at(1), b: at(2), eqAt: at(3), c: at(4) };
    });
  }

  /** 숫자를 다 채운 판을 만든다. 못 만들면 null */
  function makeBoard(L) {
    for (var t = 0; t < 120; t++) {
      var sh = makeShape(L.n, L.eqs);
      if (!sh) continue;
      var eqs = layout(sh);
      var val = {}, ops = {}, bad = false;

      for (var i = 0; i < eqs.length && !bad; i++) {
        var e = eqs[i];
        var got = fillOne(val[e.a], val[e.b], val[e.c], L);
        if (!got) { bad = true; break; }
        val[e.a] = got.a; val[e.b] = got.b; val[e.c] = got.c;
        ops[e.opAt] = got.op;
      }
      if (!bad) return { eqs: eqs, val: val, ops: ops };
    }
    return null;
  }

  /** 빈칸만 남기고 풀 수 있는가 —
   *  한 식에 모르는 칸이 하나만 남으면 그 칸은 저절로 풀린다.
   *  더 풀 것이 없을 때까지 되풀이해서 전부 풀리는지 본다. */
  function solvable(eqs, val, blank) {
    var known = {};
    Object.keys(val).forEach(function (k) { if (!blank[k]) known[k] = true; });

    var moved = true;
    while (moved) {
      moved = false;
      eqs.forEach(function (e) {
        var ids = [e.a, e.b, e.c];
        var un = ids.filter(function (x) { return !known[x]; });
        if (un.length === 1) { known[un[0]] = true; moved = true; }
      });
    }
    return Object.keys(val).every(function (k) { return known[k]; });
  }

  /** 지울 칸을 고른다. 답이 한 자리(1~9)인 칸만 지운다 —
   *  그래야 숫자판에서 한 번만 누르면 끝난다. */
  function makeBlanks(board, L) {
    var ids = Object.keys(board.val).filter(function (k) {
      return board.val[k] >= 1 && board.val[k] <= 9;
    });
    /* 섞는다 */
    for (var i = ids.length - 1; i > 0; i--) {
      var j = rnd(i + 1), t = ids[i]; ids[i] = ids[j]; ids[j] = t;
    }
    var cap = board.eqs.length;
    var blank = {}, n = 0;
    ids.forEach(function (k) {
      if (n >= cap) return;
      blank[k] = true;
      if (solvable(board.eqs, board.val, blank)) n++;
      else delete blank[k];
    });
    return blank;
  }

  /** 문제 한 판.
   *  빈칸은 **식 하나에 하나**가 이 구조의 최대다 —
   *  한 식에 모르는 칸이 둘이면 그 식만으로는 풀 수 없기 때문이다.
   *  그래서 식 개수만큼 빈칸이 나올 때까지 판을 다시 만들어 본다.
   *  (답이 한 자리인 칸만 지우므로, 큰 수가 많은 판은 빈칸을 덜 낸다) */
  function makePuzzle(L) {
    var best = null;
    for (var t = 0; t < 150; t++) {
      var b = makeBoard(L);
      if (!b) continue;
      var blank = makeBlanks(b, L);
      var n = Object.keys(blank).length;
      if (!best || n > best.n) best = { n: n, p: { eqs: b.eqs, val: b.val, ops: b.ops, blank: blank } };
      if (n >= b.eqs.length) break;
    }
    return (best && best.n >= 2) ? best.p : null;
  }

  /* ================= 칸 그리기 ================= */

  /** 판을 '줄×칸' 표로 편다 — 그리기 쉬우라고 */
  function toGrid(p) {
    var g = {}, min = { r: 9, c: 9 }, max = { r: 0, c: 0 };
    function put(k, cell) {
      g[k] = cell;
      var r = Math.floor(k / 10), c = k % 10;
      if (r < min.r) min.r = r; if (r > max.r) max.r = r;
      if (c < min.c) min.c = c; if (c > max.c) max.c = c;
    }
    p.eqs.forEach(function (e) {
      put(e.a, { t: 'num', k: e.a });
      put(e.b, { t: 'num', k: e.b });
      put(e.c, { t: 'num', k: e.c });
      put(e.opAt, { t: 'op', v: p.ops[e.opAt] });
      put(e.eqAt, { t: 'eq' });
    });
    return { g: g, r0: min.r, c0: min.c, rows: max.r - min.r + 1, cols: max.c - min.c + 1 };
  }

  /** 한 판을 HTML 로. mode: 'play' 화면 · 'print' 문제지 · 'answer' 정답지 */
  function boardHtml(p, mode, values) {
    var L2 = toGrid(p);
    var out = '<div class="mc-board" style="--r:' + L2.rows + ';--c:' + L2.cols + '">';
    for (var r = 0; r < L2.rows; r++) {
      for (var c = 0; c < L2.cols; c++) {
        var k = id(L2.r0 + r, L2.c0 + c);
        var cell = L2.g[k];
        if (!cell) { out += '<i class="mc-gap"></i>'; continue; }
        if (cell.t === 'op') { out += '<i class="mc-sym">' + cell.v + '</i>'; continue; }
        if (cell.t === 'eq') { out += '<i class="mc-sym">=</i>'; continue; }

        var given = !p.blank[k];
        if (given) { out += '<i class="mc-num mc-num--given">' + p.val[k] + '</i>'; continue; }
        if (mode === 'answer') { out += '<i class="mc-num mc-num--ans">' + p.val[k] + '</i>'; continue; }
        if (mode === 'print') { out += '<i class="mc-num mc-num--blank"></i>'; continue; }

        var v = values && values[k];
        var right = v && v === p.val[k];
        out += '<button class="mc-num mc-num--in' + (v ? (right ? ' is-ok' : ' is-bad') : '') +
               '" data-k="' + k + '">' + (v || '') + '</button>';
      }
    }
    return out + '</div>';
  }

  /* ================= 판 만들기 · 이어하기 ================= */

  function newGame(level) {
    var key = LEVELS[level] ? level : 'easy';
    var L = LEVELS[key];
    var list = [];
    for (var i = 0; i < L.count; i++) {
      var p = makePuzzle(L);
      if (p) list.push(p);
    }
    S = {
      day: Store.dayKey(), level: key, list: list, at: 0,
      values: {}, filled: 0, need: 0, wrong: 0, hints: 0, elapsed: 0, done: false
    };
    S.need = list.reduce(function (n, p) { return n + Object.keys(p.blank).length; }, 0);
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('mathcross', {
      day: S.day, level: S.level, list: S.list, at: S.at,
      values: S.values, filled: S.filled, need: S.need,
      wrong: S.wrong, hints: S.hints, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      list: s.list, at: s.at || 0, values: s.values || {},
      filled: s.filled || 0, need: s.need || 0,
      wrong: s.wrong || 0, hints: s.hints || 0, elapsed: s.elapsed || 0, done: false
    };
  }

  function cur() { return S.list[S.at]; }
  function vals() { S.values[S.at] = S.values[S.at] || {}; return S.values[S.at]; }

  /** 지금 판을 다 맞게 채웠는가 */
  function pageDone() {
    var p = cur(), v = vals();
    return Object.keys(p.blank).every(function (k) { return v[k] === p.val[k]; });
  }

  /* ================= 화면 ================= */

  function renderIntro() {
    stopTimer();
    if (!mounted) return;
    var sess = Store.getSession('mathcross');
    var best = Store.bestEver('mathcross');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('계산 퍼즐') + '</h2>') +
        ('<p class="intro__desc">' + T('가로와 세로가 모두 맞도록') + '<br>' + T('빈칸에 숫자를 넣으세요.') + '<br>') +
          ('<small>' + T('빈칸의 답은 언제나 1부터 9까지입니다.') + '<br>') +
          (T('모서리 칸은 가로 식과 세로 식이 함께 씁니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="mcResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{a}/{b}판', { a: (sess.at || 0) + 1, b: sess.list.length }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' ' + T('· {n}판 · 제한 {m}분', { n: L.count, m: Math.round(L.limit / 60) }) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="mcPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="mcRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#mcResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#mcRules').addEventListener('click', function () { App.showRules('mathcross'); });
    root.querySelector('#mcPrint').addEventListener('click', function () { Print.dialog('mathcross'); });
  }

  function renderBoard() {
    if (!mounted) return;
    var L = lv();

    root.innerHTML =
      '<section class="game mathcross">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="mcTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b id="mcNo">1 / 1</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('실수') + '</span><b id="mcMiss">0</b></div>') +
        '</div>' +
        '<div class="mc-wrap" id="mcWrap"></div>' +
        ('<p class="mc-note" id="mcNote">' + T('빈칸을 누르고 아래에서 숫자를 고르세요.') + '</p>') +
        '<div class="pad" id="mcPad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
            return '<button class="pad__key" data-n="' + n + '"><span>' + n + '</span></button>';
          }).join('') +
          ('<button class="pad__key pad__key--fn" data-act="erase">' + T('지우기') + '</button>') +
        '</div>' +
        '<div class="tools" id="mcTools">' +
          ('<button class="tool" id="mcHintBtn"><span>💡</span>' + T('힌트') + '</button>') +
          ('<button class="tool" id="mcRestart"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="mcSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      wrap: root.querySelector('#mcWrap'),
      time: root.querySelector('#mcTime'),
      no: root.querySelector('#mcNo'),
      miss: root.querySelector('#mcMiss'),
      note: root.querySelector('#mcNote')
    };

    root.querySelector('#mcPad').addEventListener('click', function (e) {
      var b = e.target.closest('.pad__key');
      if (!b) return;
      if (b.dataset.act === 'erase') put(0);
      else put(Number(b.dataset.n));
    });
    root.querySelector('#mcHintBtn').addEventListener('click', useHint);
    root.querySelector('#mcRestart').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('mathcross'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#mcSwitch').addEventListener('click', function () { App.gameSwitcher('mathcross'); });

    paint();
    startTimer();
  }

  function paint() {
    if (!els.wrap || !S.list.length) return;
    els.wrap.innerHTML = boardHtml(cur(), 'play', vals());
    els.wrap.querySelectorAll('.mc-num--in').forEach(function (b) {
      b.addEventListener('click', function () {
        S.sel = Number(b.dataset.k);
        paintSel();
      });
    });
    paintSel();
    els.no.textContent = (S.at + 1) + ' / ' + S.list.length;
    els.miss.textContent = S.wrong;
  }

  function paintSel() {
    els.wrap.querySelectorAll('.mc-num--in').forEach(function (b) {
      b.classList.toggle('is-sel', Number(b.dataset.k) === S.sel);
    });
  }

  /** 숫자를 넣는다 (0 이면 지우기) */
  function put(n) {
    if (!S || S.done) return;
    var p = cur(), v = vals();
    if (S.sel == null || !p.blank[S.sel]) { UI.toast(T('먼저 빈칸을 눌러 주세요.')); return; }

    var before = v[S.sel];
    if (!n) { delete v[S.sel]; }
    else {
      v[S.sel] = n;
      if (n !== p.val[S.sel]) { S.wrong++; UI.beep('no'); }
      else UI.beep('tick');
    }
    /* 다 채운 칸 수를 다시 센다 */
    S.filled = S.list.reduce(function (t, q, i) {
      var vv = S.values[i] || {};
      return t + Object.keys(q.blank).filter(function (k) { return vv[k] === q.val[k]; }).length;
    }, 0);

    paint();
    persist();

    if (pageDone()) {
      if (S.at < S.list.length - 1) {
        UI.toast(T('잘하셨습니다! 다음 판으로 갑니다.'));
        setTimeout(function () {
          if (!mounted || !S || S.done) return;
          S.at++; S.sel = null; paint(); persist();
        }, 700);
      } else finish(false);
    }
  }

  function useHint() {
    if (!S || S.done) return;
    var p = cur(), v = vals();
    var left = Object.keys(p.blank).filter(function (k) { return v[k] !== p.val[k]; });
    if (!left.length) return;
    var k = left[rnd(left.length)];
    v[k] = p.val[k];
    S.hints++;
    UI.toast(T('한 칸을 채워 드렸습니다.'));
    put(0);                       /* 다시 세고 다시 그린다 (지우기는 고른 칸이 없으면 아무 일도 안 한다) */
    S.sel = null;
    paint(); persist();
    if (pageDone()) {
      if (S.at < S.list.length - 1) { S.at++; paint(); persist(); }
      else finish(false);
    }
  }

  function startTimer() {
    stopTimer();
    var L = lv();
    els.time.textContent = UI.fmtTime(L.limit - S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done || !mounted) return;
      S.elapsed++;
      var left = L.limit - S.elapsed;
      els.time.textContent = UI.fmtTime(left);
      els.time.classList.toggle('is-urgent', left <= 30);
      if (S.elapsed % 10 === 0) persist();
      if (left <= 0) finish(true);
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  /* ================= 점수 ================= */

  function score() {
    var L = lv();
    var all = S.filled >= S.need;
    var fill = S.need ? Math.round(600 * S.filled / S.need) : 0;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    var acc = Math.max(0, 100 - S.wrong * 10);
    var penalty = S.hints * 50;
    var bonus = all ? L.bonus : 0;
    return {
      fill: fill, time: time, acc: acc, penalty: penalty, bonus: bonus, all: all,
      total: Math.max(0, fill + time + acc + bonus - penalty)
    };
  }

  function finish(timeUp) {
    S.done = true;
    stopTimer();
    Store.clearSession('mathcross');
    UI.beep(timeUp ? 'no' : 'win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'mathcross', score: sc.total,
      difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { filled: S.filled, need: S.need, wrong: S.wrong, hints: S.hints, timeUp: !!timeUp }
    });

    var rows = [{ label: T('채운 칸 ({a}/{b}칸)', { a: S.filled, b: S.need }), value: sc.fill }];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('정확도 보너스 (실수 {n}회)', { n: S.wrong }), value: sc.acc });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });
    if (sc.penalty) rows.push({ label: T('힌트 사용 ({n}회)', { n: S.hints }), value: sc.penalty, minus: true });

    UI.resultModal({
      title: timeUp ? T('시간이 다 되었습니다') : T('축하드립니다!'),
      score: sc.total,
      headline: sc.all
        ? T('계산 퍼즐 {n}단계 완료!', { n: L.step })
        : T('{a}칸 중 {b}칸을 채우셨습니다.', { a: S.need, b: S.filled }),
      rows: rows,
      /* 다 채웠을 때는 「다음 단계」로 바로 이어 가시게 한다.
         못 채운 판과 마지막 단계에서는 「한 판 더」가 초록이 된다. */
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1];
        var nxt = sc.all ? ORDER[idx + 1] : null;
        var a = [{ label: sc.all ? T('다른 게임') : T('닫기'),
                   onClick: sc.all ? function () { App.gameSwitcher('mathcross'); } : undefined }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderBoard(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderBoard(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<path d="M3 3h8v8H3zM13 13h8v8h-8z"/><path d="M13 3h8v8h-8zM3 13h8v8H3z" opacity=".4"/><path d="M15 5.5h4M17 3.5v4M5 17.5h4"/>',
    id: 'mathcross', name: T('계산 퍼즐'), tagline: T('가로와 세로가 맞아떨어지는 셈'),
    rules: {
      title: T('계산 퍼즐 점수 규칙'),
      lines: [
        [T('푸는 법'), T('가로 식과 세로 식이 모두 맞도록 빈칸에 숫자를 넣습니다. 모서리 칸은 두 식이 함께 쓰므로, 한 칸을 채우면 다른 식도 함께 풀립니다')],
        [T('빈칸의 답'), T('언제나 1부터 9까지입니다. 숫자판에서 한 번만 누르면 됩니다')],
        [T('빈칸 수'), T('식 하나에 하나씩입니다. 식이 둘이면 빈칸도 둘, 넷이면 넷입니다')],
        [T('모양'), T('판을 열 때마다 새로 짜므로 같은 모양이 되풀이되지 않습니다 — ㄱ · 十 · ㄷ · 네모 틀 · 사다리 …')],
        [T('난이도'), T('더하기와 빼기만 나옵니다. 단계가 올라갈수록 식이 늘고 숫자가 커집니다 — 1단계 식 4개·10까지 · 2단계 식 4개·20까지 · 3단계 식 5개·40까지 · 4단계 식 5개·60까지 · 5단계 식 6개·99까지')],
        [T('채우기 점수'), T('최대 600점 · 맞게 채운 칸 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 다 채웠을 때만, 남은 시간에 비례')],
        [T('정확도 보너스'), T('최대 100점 · 틀린 숫자를 1번 넣을 때마다 10점씩 줄어듦')],
        [T('힌트 감점'), T('힌트 1회마다 50점 차감 (한 칸을 채워 줍니다)')],
        [T('틀렸을 때'), T('그 자리에 빨갛게 남습니다. 지우고 다시 넣으시면 됩니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (다 채웠을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () { mounted = false; stopTimer(); persist(); },
    hasProgress: function () { return !!Store.getSession('mathcross'); },
    levels: LEVELS,
    levelOrder: ORDER,

    /** 종이로 풀 문제를 한 판 새로 만든다.
     *  5칸짜리는 아홉 판, 7칸짜리는 여섯 판 — 칸이 너무 작아지지 않게.
     *  화면에서 하던 판(S)은 건드리지 않는다. */
    makeForPrint: function (level) {
      var L = LEVELS[level] ? LEVELS[level] : LEVELS.easy;
      var per = L.n >= 7 ? 6 : 9;
      var list = [];
      for (var i = 0; i < per; i++) {
        var p = makePuzzle(L);
        if (p) list.push(p);
      }
      return {
        levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        count: list.length,
        big: L.n >= 7,
        body: list.map(function (p) { return '<div class="ps-mc">' + boardHtml(p, 'print') + '</div>'; }).join(''),
        answer: list.map(function (p) { return '<div class="ps-mc">' + boardHtml(p, 'answer') + '</div>'; }).join('')
      };
    }
  };
})();
