/* 새록 — 숫자 짝 찾기
 * 점수: 찾기 600 + 시간 300 + 집중 100 + 난이도 보너스
 *
 * 두 자리 숫자가 가득한 판 안에, 똑같은 숫자가 딱 두 번씩만 나오는 자리(짝)가 몇 쌍 숨어 있다.
 * 나머지는 모두 서로 다른 숫자다. 짝인 숫자 하나를 찾아 누르면, 나머지 하나도 함께 표시된다
 * (두 번 눌러야 하는 번거로움을 없앴다 — 짝을 찾았다는 것 자체가 이미 다 안 것이다).
 *
 * 숫자만 있어 어느 나라에서나 그대로 통하고, 눈으로 훑어 같은 것을 찾아내는 훈련이라
 * 「숫자 찾기」(1부터 차례대로 찾기)와는 다른 결의 주의력 훈련이 된다.
 *
 * 틀리게 누르면 그 칸이 잠깐 붉어질 뿐 점수는 깎이지 않는다. 다만 한 판을
 * 한 번도 틀리지 않고 마치면 「집중 보너스」가 붙는다. (숫자 찾기와 같은 방식)
 */
window.Games = window.Games || {};
window.Games.numpair = (function () {

  /* cols 한 줄 칸 수 · cells 판의 전체 칸 수 · pairs 짝 개수 · rounds 판 수 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, cols: 4, cells: 16, pairs: 2, rounds: 3, limit: 240, bonus: 0,
              note: T('16칸 · 2쌍 찾기') },
    step2:  { name: T('가볍게'), step: 2, cols: 4, cells: 20, pairs: 3, rounds: 3, limit: 280, bonus: 0,
              note: T('20칸 · 3쌍 찾기') },
    easy:   { name: T('쉬움'),   step: 3, cols: 6, cells: 24, pairs: 3, rounds: 3, limit: 320, bonus: 0,
              note: T('24칸 · 3쌍 찾기') },
    normal: { name: T('보통'),   step: 4, cols: 6, cells: 30, pairs: 4, rounds: 2, limit: 360, bonus: 100,
              note: T('30칸 · 4쌍 찾기') },
    hard:   { name: T('어려움'), step: 5, cols: 6, cells: 36, pairs: 5, rounds: 2, limit: 420, bonus: 250,
              note: T('36칸 · 5쌍 찾기') }
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
  function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  /* ================= 판 만들기 ================= */

  /** cells 칸짜리 판 하나 — 두 자리 숫자(10~99) 중 pairs 개는 꼭 두 번씩, 나머지는 한 번씩만 나온다 */
  function makeGrid(cells, pairs) {
    var pool = [];
    for (var n = 10; n <= 99; n++) pool.push(n);
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    var need = pairs + (cells - pairs * 2);   /* 짝 숫자 + 홀로 숫자에 쓸 값의 가짓수 */
    var picks = pool.slice(0, need);
    var grid = [];
    for (i = 0; i < pairs; i++) { grid.push(picks[i]); grid.push(picks[i]); }
    for (i = pairs; i < need; i++) grid.push(picks[i]);
    for (i = grid.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = grid[i]; grid[i] = grid[j]; grid[j] = t;
    }
    return grid;
  }
  function makeSet(level, rounds) {
    var L = LEVELS[level] || LEVELS.easy, out = [];
    for (var r = 0; r < rounds; r++) out.push(makeGrid(L.cells, L.pairs));
    return out;
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      grids: makeSet(level, L.rounds),
      r: 0, found: 0, doneIdx: [],      /* 지금 판 번호 · 지금 판에서 찾은 쌍 수 · 표시된 칸 자리 */
      wrong: [], total: 0,
      elapsed: 0, done: false
    };
    for (var i = 0; i < L.rounds; i++) S.wrong.push(0);
    persist();
  }
  function persist() {
    if (!S || S.done) return;
    Store.saveSession('numpair', {
      day: S.day, level: S.level, grids: S.grids, r: S.r, found: S.found, doneIdx: S.doneIdx,
      wrong: S.wrong, total: S.total, elapsed: S.elapsed
    });
  }
  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      grids: s.grids, r: s.r || 0, found: s.found || 0, doneIdx: s.doneIdx || [],
      wrong: s.wrong || [], total: s.total || 0,
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('numpair');
    var best = Store.bestEver('numpair');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('숫자 짝 찾기') + '</h2>') +
        ('<p class="intro__desc">' + T('판 안에서 똑같은 숫자가 두 번 나오는 자리를 찾습니다.') + '<br>' +
          T('하나를 누르면 나머지 짝도 함께 표시됩니다.') +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="npResume">' + T('이어서 하기') + ' <small>') +
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
        ('<button class="btn btn--ghost btn--print" id="npPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="npRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#npResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#npPrint').addEventListener('click', function () { Print.dialog('numpair'); });
    root.querySelector('#npRules').addEventListener('click', function () { App.showRules('numpair'); });
  }

  /* ================= 화면: 판 ================= */

  function renderBoard() {
    if (!mounted) return;
    var L = lv();
    if (S.r >= S.grids.length) return finish();
    var grid = S.grids[S.r];
    locked = false;

    root.innerHTML =
      '<section class="game numpair">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="npTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b id="npNo">') + (S.r + 1) + '/' + S.grids.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('찾은 짝') + '</span><b id="npFound">') + S.found + '/' + L.pairs + '</b></div>' +
        '</div>' +

        ('<p class="mt-hint np-msg" id="npMsg">' + T('같은 숫자가 두 번 나오는 자리를 찾아 누르세요') + '</p>') +

        '<div class="np-grid" id="npGrid" style="grid-template-columns:repeat(' + L.cols + ',1fr)">' +
          grid.map(function (v, i) {
            return '<button class="np-cell' + (S.doneIdx.indexOf(i) >= 0 ? ' is-done' : '') + '" data-i="' + i + '">' + v + '</button>';
          }).join('') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="npNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="npQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="npSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#npTime'),
      msg: root.querySelector('#npMsg'),
      found: root.querySelector('#npFound'),
      grid: root.querySelector('#npGrid')
    };

    els.grid.addEventListener('click', function (e) {
      var c = e.target.closest('.np-cell');
      if (!c || locked || c.classList.contains('is-done')) return;
      tap(parseInt(c.dataset.i, 10), c);
    });
    root.querySelector('#npNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('numpair'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#npQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#npSwitch').addEventListener('click', function () { App.gameSwitcher('numpair'); });

    startTimer();
  }

  function tap(i, cell) {
    var grid = S.grids[S.r], v = grid[i];
    /* 이 칸과 같은 숫자를 가진, 아직 안 찾은 다른 칸을 찾는다 — 있으면 짝이다 */
    var partner = -1;
    for (var k = 0; k < grid.length; k++) {
      if (k !== i && grid[k] === v && S.doneIdx.indexOf(k) < 0) { partner = k; break; }
    }

    if (partner < 0) {
      /* 틀림 — 홀로인 숫자를 눌렀다. 칸만 잠깐 붉어진다 */
      S.wrong[S.r] = (S.wrong[S.r] || 0) + 1;
      cell.classList.add('is-bad');
      if (badTimer) clearTimeout(badTimer);
      badTimer = setTimeout(function () { badTimer = null; cell.classList.remove('is-bad'); }, 450);
      els.msg.innerHTML = '<b class="mt-no">' + T('그 숫자는 한 번만 나와요') + '</b>';
      UI.beep('no');
      return;
    }

    S.doneIdx.push(i, partner);
    cell.classList.add('is-done');
    var pcell = els.grid.querySelector('[data-i="' + partner + '"]');
    if (pcell) pcell.classList.add('is-done');
    S.found++;
    S.total++;
    els.found.textContent = S.found + '/' + lv().pairs;

    if (S.found < lv().pairs) {
      els.msg.textContent = T('같은 숫자가 두 번 나오는 자리를 찾아 누르세요');
      UI.beep('tick');
      persist();
      return;
    }

    /* 한 판 끝 */
    locked = true;
    stopTimer();
    els.msg.innerHTML = '<b class="mt-ok">' +
      (S.wrong[S.r] ? T('판 완성!') : T('판 완성! 한 번도 틀리지 않았어요')) + '</b>';
    UI.beep('ok');
    S.r++;
    S.found = 0;
    S.doneIdx = [];
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
    var totalPairs = L.pairs * L.rounds;
    var found = Math.min(totalPairs, S.total);

    var right = Math.round(600 * found / totalPairs);
    var all = S.r >= L.rounds;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;

    var clean = 0;
    for (var i = 0; i < S.r; i++) if (!S.wrong[i]) clean++;
    var focus = Math.round(100 * clean / L.rounds);

    var bonus = all ? L.bonus : 0;
    var wrongs = S.wrong.reduce(function (a, b) { return a + (b || 0); }, 0);
    return {
      right: right, time: time, focus: focus, bonus: bonus,
      total: right + time + focus + bonus,
      found: found, count: totalPairs, clean: clean, rounds: S.r, wrongs: wrongs, all: all
    };
  }

  function finish() {
    S.done = true;
    stopTimer();
    clearPending();
    Store.clearSession('numpair');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'numpair', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { found: sc.found, count: sc.count, rounds: sc.rounds, wrongs: sc.wrongs }
    });

    var rows = [
      { label: T('찾기 점수 ({a}/{b}쌍)', { a: sc.found, b: sc.count }), value: sc.right }
    ];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('집중 보너스 (틀리지 않은 판 {a}/{b})', { a: sc.clean, b: L.rounds }), value: sc.focus });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('숫자 짝 찾기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('numpair'); } }];
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
         '<circle cx="6" cy="6" r="1.3" fill="currentColor" stroke="none"/>' +
         '<circle cx="18" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    id: 'numpair', name: T('숫자 짝 찾기'), tagline: T('두 번 나오는 숫자 찾기'),
    rules: {
      title: T('숫자 짝 찾기 점수 규칙'),
      lines: [
        [T('난이도'), T('판이 커지고 짝 수가 늘어납니다 — 1단계 16칸 2쌍 · 2단계 20칸 3쌍 · 3단계 24칸 3쌍 · 4단계 30칸 4쌍 · 5단계 36칸 5쌍')],
        [T('하는 법'), T('판 안에서 똑같은 숫자가 두 번 나오는 자리 하나를 찾아 누릅니다. 나머지 짝도 함께 표시됩니다')],
        [T('찾기 점수'), T('최대 600점 · 찾은 짝 수에 비례')],
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
    hasProgress: function () { return !!Store.getSession('numpair'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 — 판 여러 장. 종이에서는 짝인 숫자 둘 다 동그라미를 친다 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note, cols: L.cols, pairs: L.pairs,
        grids: makeSet(key, count || 4)
      };
    }
  };
})();
