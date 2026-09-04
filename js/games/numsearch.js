/* 새록 — 숫자 찾기
 * 점수: 찾기 600 + 시간 300 + 집중 100 + 난이도 보너스
 *
 * 뒤섞인 숫자판에서 1부터 차례대로 찾아 누른다. (마지막 단계는 큰 수부터 거꾸로)
 * 주의력과 눈으로 훑는 힘을 기르는 훈련으로, 치료 현장에서 실제로 많이 쓰는
 * 「숫자 찾기 표」를 그대로 옮긴 것이다. 글자가 하나도 없어 어느 말에서나 통한다.
 *
 * 틀리게 누르면 그 칸이 잠깐 붉어질 뿐 점수는 깎이지 않는다. 다만 한 판을
 * 한 번도 틀리지 않고 마치면 「집중 보너스」가 붙는다.
 * 판은 판마다 새로 섞는다 — 미리 만들어 둔 표가 없다.
 */
window.Games = window.Games || {};
window.Games.numsearch = (function () {

  /* size 한 변의 칸 수 · rounds 판 수 · rev 거꾸로(큰 수부터) */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, size: 3, rounds: 4, limit: 240, bonus: 0,   rev: false,
              note: T('3×3 · 1부터 9까지') },
    step2:  { name: T('가볍게'), step: 2, size: 4, rounds: 3, limit: 300, bonus: 0,   rev: false,
              note: T('4×4 · 1부터 16까지') },
    easy:   { name: T('쉬움'),   step: 3, size: 5, rounds: 3, limit: 360, bonus: 0,   rev: false,
              note: T('5×5 · 1부터 25까지') },
    normal: { name: T('보통'),   step: 4, size: 6, rounds: 2, limit: 420, bonus: 100, rev: false,
              note: T('6×6 · 1부터 36까지') },
    hard:   { name: T('어려움'), step: 5, size: 6, rounds: 2, limit: 480, bonus: 250, rev: true,
              note: T('6×6 · 36부터 거꾸로 1까지') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null, badTimer = null;
  var mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() {
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
    if (badTimer) { clearTimeout(badTimer); badTimer = null; }
  }

  /* ================= 판 만들기 ================= */

  /** 1..n 을 뒤섞은 한 판. 시작 숫자가 한가운데에 오면 너무 쉬워 한 번 더 섞는다 */
  function makeGrid(size, rev) {
    var n = size * size, a = [], i, j, t;
    for (i = 1; i <= n; i++) a.push(i);
    var guard = 0;
    do {
      for (i = n - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        t = a[i]; a[i] = a[j]; a[j] = t;
      }
      guard++;
    } while (guard < 10 && size % 2 === 1 && a[(n - 1) / 2] === (rev ? n : 1));
    return a;
  }

  function makeSet(level, rounds) {
    var L = LEVELS[level] || LEVELS.easy, out = [];
    for (var r = 0; r < rounds; r++) out.push(makeGrid(L.size, L.rev));
    return out;
  }

  /** 이 판에서 다음에 찾을 숫자 — 순서대로면 1,2,3… 거꾸로면 n,n-1,… */
  function target(L, found) {
    var n = L.size * L.size;
    return L.rev ? n - found : found + 1;
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      grids: makeSet(level, L.rounds),
      r: 0, found: 0,                 /* 지금 판 번호 · 지금 판에서 찾은 개수 */
      wrong: [],                      /* 판마다 잘못 누른 횟수 */
      total: 0,                       /* 지금까지 찾은 숫자 수 (모든 판) */
      elapsed: 0, done: false
    };
    for (var i = 0; i < L.rounds; i++) S.wrong.push(0);
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('numsearch', {
      day: S.day, level: S.level, grids: S.grids, r: S.r, found: S.found,
      wrong: S.wrong, total: S.total, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      grids: s.grids, r: s.r || 0, found: s.found || 0,
      wrong: s.wrong || [], total: s.total || 0,
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('numsearch');
    var best = Store.bestEver('numsearch');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('숫자 찾기') + '</h2>') +
        ('<p class="intro__desc">' + T('뒤섞인 숫자판에서 1부터 차례대로 찾아 누릅니다.') + '<br>' +
          T('다음에 찾을 숫자는 판 위에 크게 보여 드립니다.') +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="nsResume">' + T('이어서 하기') + ' <small>') +
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
        ('<button class="btn btn--ghost btn--print" id="nsPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="nsRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#nsResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#nsPrint').addEventListener('click', function () { Print.dialog('numsearch'); });
    root.querySelector('#nsRules').addEventListener('click', function () { App.showRules('numsearch'); });
  }

  /* ================= 화면: 판 ================= */

  function hint(L) {
    var n = L.size * L.size;
    return L.rev ? T('{n}부터 거꾸로 1까지 차례대로 누르세요', { n: n })
                 : T('1부터 {n}까지 차례대로 누르세요', { n: n });
  }

  function renderBoard() {
    if (!mounted) return;
    var L = lv();
    if (S.r >= S.grids.length) return finish();
    var grid = S.grids[S.r], n = L.size * L.size;
    locked = false;

    /* 이미 찾은 칸 — 순서대로면 1..found, 거꾸로면 n..n-found+1 */
    function isDone(v) { return L.rev ? v > n - S.found : v <= S.found; }

    root.innerHTML =
      '<section class="game numsearch">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="nsTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b id="nsNo">') + (S.r + 1) + '/' + S.grids.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('찾음') + '</span><b id="nsFound">') + S.found + '/' + n + '</b></div>' +
        '</div>' +

        '<div class="ns-top">' +
          ('<span class="ns-top__lbl">' + T('다음 숫자') + '</span>') +
          ('<b class="ns-next" id="nsNext">' + target(L, S.found) + '</b>') +
          ('<p class="mt-hint ns-msg" id="nsMsg">' + hint(L) + '</p>') +
        '</div>' +

        '<div class="ns-grid ns-grid--' + L.size + '" id="nsGrid">' +
          grid.map(function (v) {
            return '<button class="ns-cell' + (isDone(v) ? ' is-done' : '') + '" data-v="' + v + '">' + v + '</button>';
          }).join('') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="nsNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="nsQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="nsSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#nsTime'),
      msg: root.querySelector('#nsMsg'),
      found: root.querySelector('#nsFound'),
      next: root.querySelector('#nsNext'),
      grid: root.querySelector('#nsGrid')
    };

    els.grid.addEventListener('click', function (e) {
      var c = e.target.closest('.ns-cell');
      if (!c || locked || c.classList.contains('is-done')) return;
      tap(parseInt(c.dataset.v, 10), c);
    });
    root.querySelector('#nsNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('numsearch'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#nsQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#nsSwitch').addEventListener('click', function () { App.gameSwitcher('numsearch'); });

    startTimer();
  }

  function tap(v, cell) {
    var L = lv(), n = L.size * L.size;
    var want = target(L, S.found);

    if (v !== want) {
      /* 틀림 — 칸만 잠깐 붉어진다. 점수는 깎지 않는다 */
      S.wrong[S.r] = (S.wrong[S.r] || 0) + 1;
      cell.classList.add('is-bad');
      if (badTimer) clearTimeout(badTimer);
      badTimer = setTimeout(function () { badTimer = null; cell.classList.remove('is-bad'); }, 450);
      els.msg.innerHTML = '<b class="mt-no">' + T('지금은 {n}을 찾으세요', { n: want }) + '</b>';
      UI.beep('no');
      return;
    }

    S.found++;
    S.total++;
    cell.classList.add('is-done');
    els.found.textContent = S.found + '/' + n;

    if (S.found < n) {
      els.next.textContent = target(L, S.found);
      els.msg.textContent = hint(L);
      UI.beep('tick');
      persist();
      return;
    }

    /* 한 판 끝 */
    locked = true;
    stopTimer();
    els.next.textContent = '✓';
    els.msg.innerHTML = '<b class="mt-ok">' +
      (S.wrong[S.r] ? T('판 완성!') : T('판 완성! 한 번도 틀리지 않았어요')) + '</b>';
    UI.beep('ok');
    S.r++;
    S.found = 0;
    persist();
    clearPending();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      if (!mounted || !S || S.done) return;
      if (S.r >= S.grids.length) finish();
      else renderBoard();
    }, 1000);
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

  function score() {
    var L = lv();
    var n = L.size * L.size;
    var totalTaps = n * L.rounds;
    var found = Math.min(totalTaps, S.total);

    var right = Math.round(600 * found / totalTaps);
    var all = S.r >= L.rounds;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;

    /* 집중 보너스 — 한 번도 틀리지 않고 마친 판마다 100점을 판 수로 나눈 만큼 */
    var clean = 0;
    for (var i = 0; i < S.r; i++) if (!S.wrong[i]) clean++;
    var focus = Math.round(100 * clean / L.rounds);

    var bonus = all ? L.bonus : 0;
    var wrongs = S.wrong.reduce(function (a, b) { return a + (b || 0); }, 0);
    return {
      right: right, time: time, focus: focus, bonus: bonus,
      total: right + time + focus + bonus,
      found: found, count: totalTaps, clean: clean, rounds: S.r, wrongs: wrongs, all: all
    };
  }

  function finish() {
    S.done = true;
    stopTimer();
    clearPending();
    Store.clearSession('numsearch');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'numsearch', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { found: sc.found, count: sc.count, rounds: sc.rounds, wrongs: sc.wrongs }
    });

    var rows = [
      { label: T('찾기 점수 ({a}/{b}개)', { a: sc.found, b: sc.count }), value: sc.right }
    ];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('집중 보너스 (틀리지 않은 판 {a}/{b})', { a: sc.clean, b: L.rounds }), value: sc.focus });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('숫자 찾기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      /* 「다음 단계」로 바로 이어 가시게 한다. 마지막 단계에서는 「한 판 더」가 초록이 된다. */
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('numsearch'); } }];
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
         '<path d="M5.2 6.2h1.6M5.2 12.2h1.6M17.2 18.2h1.6" stroke-width="2"/>',
    id: 'numsearch', name: T('숫자 찾기'), tagline: T('뒤섞인 숫자를 차례대로 찾기'),
    rules: {
      title: T('숫자 찾기 점수 규칙'),
      lines: [
        [T('난이도'), T('판이 커집니다 — 1단계 3×3 · 2단계 4×4 · 3단계 5×5 · 4단계 6×6 · 5단계 6×6 을 큰 수부터 거꾸로')],
        [T('하는 법'), T('판 위에 보이는 「다음 숫자」를 찾아 누릅니다. 맞으면 그 칸이 초록으로 바뀝니다')],
        [T('찾기 점수'), T('최대 600점 · 찾은 숫자 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('집중 보너스'), T('최대 100점 · 한 번도 틀리지 않고 마친 판마다')],
        [T('오답 감점'), T('없음 — 잘못 누르면 그 칸이 잠깐 붉어질 뿐입니다')],
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
    hasProgress: function () { return !!Store.getSession('numsearch'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 — 숫자판 넉 장. 종이에서는 차례대로 찾아 동그라미를 치거나 선으로 잇는다 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note, size: L.size, rev: L.rev,
        grids: makeSet(key, count || 4)
      };
    }
  };
})();
