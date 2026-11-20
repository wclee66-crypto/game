/* 새록 — 번갈아 잇기
 * 점수: 찾기 600 + 시간 300 + 집중 100 + 난이도 보너스
 *
 * 숫자판 위에 숫자와 글자가 섞여 있다. 1 → 가 → 2 → 나 → 3 → 다 … 처럼
 * 숫자와 글자를 번갈아 가며 차례대로 눌러 잇는다.
 *
 * 「숫자 찾기」(numsearch.js)는 숫자 하나만 차례대로 찾지만, 이 게임은 두 가지 순서를
 * 한꺼번에 머릿속에 두고 번갈아 넘나들어야 한다. 하던 생각을 바꿔 가며 하는 힘(실행 기능)을
 * 쓰는 훈련으로, 치료 현장에서 쓰는 「선 잇기 검사」의 어려운 쪽(B형)을 옮긴 것이다.
 * 2026-11-20 에 더했다. 종이 문제지로도 풀 수 있다 (숫자는 동그라미, 글자는 네모로 구별).
 *
 * 글자는 말마다 다르다 — 한국어 가나다…, 영어 ABC…, 일본어 あいう….
 * 판에는 글자 자체가 아니라 '몇 번째 글자'만 적어 두므로(음수), 말을 바꿔도 이어서 할 수 있다.
 *
 * 틀리게 눌러도 점수는 깎이지 않는다. 그 칸이 잠깐 붉어지고 지금 찾을 것을 알려 줄 뿐이다.
 * 한 번도 틀리지 않고 마친 판에는 「집중 보너스」가 붙는다.
 * 앞의 세 단계는 다음에 누를 것을 판 위에 크게 보여 주고, 4·5단계는 보여 주지 않는다.
 */
window.Games = window.Games || {};
window.Games.altlink = (function () {

  /* 글자 14개씩 — 가장 어려운 단계가 열두 쌍이라 그보다 넉넉하면 된다 */
  var LETTERS = {
    ko: '가나다라마바사아자차카타파하'.split(''),
    en: 'ABCDEFGHIJKLMN'.split(''),
    ja: 'あいうえおかきくけこさしすせ'.split('')
  };
  function letters() { return LETTERS[I18N.get()] || LETTERS.ko; }

  /** 판 위의 값 → 화면에 적을 글. 양수는 숫자, 음수는 -1 이 첫째 글자 */
  function label(v) { return v > 0 ? String(v) : letters()[-v - 1]; }

  /* size 한 변의 칸 수 · pairs 숫자·글자 각각의 개수 · rounds 판 수 · showNext 다음 차례를 보여 주는가 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, size: 3, pairs: 3,  rounds: 3, limit: 240, bonus: 0,   showNext: true,
              note: T('숫자 {n}개 · 글자 {n}개', { n: 3 }) },
    step2:  { name: T('가볍게'), step: 2, size: 4, pairs: 5,  rounds: 3, limit: 300, bonus: 0,   showNext: true,
              note: T('숫자 {n}개 · 글자 {n}개', { n: 5 }) },
    easy:   { name: T('쉬움'),   step: 3, size: 5, pairs: 8,  rounds: 2, limit: 360, bonus: 0,   showNext: true,
              note: T('숫자 {n}개 · 글자 {n}개', { n: 8 }) },
    normal: { name: T('보통'),   step: 4, size: 5, pairs: 10, rounds: 2, limit: 420, bonus: 100, showNext: false,
              note: T('숫자 {n}개 · 글자 {n}개', { n: 10 }) },
    hard:   { name: T('어려움'), step: 5, size: 6, pairs: 12, rounds: 2, limit: 480, bonus: 250, showNext: false,
              note: T('숫자 {n}개 · 글자 {n}개', { n: 12 }) }
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
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ================= 판 만들기 ================= */

  /** 한 판 — size×size 칸 가운데 2×pairs 칸에만 숫자(1..pairs)와 글자(-1..-pairs)를 흩어 놓는다. 0 은 빈칸 */
  function makeGrid(size, pairs) {
    var n = size * size, spots = [], i;
    for (i = 0; i < n; i++) spots.push(i);
    shuffle(spots);
    var grid = [];
    for (i = 0; i < n; i++) grid.push(0);
    for (i = 1; i <= pairs; i++) {
      grid[spots[2 * i - 2]] = i;
      grid[spots[2 * i - 1]] = -i;
    }
    return grid;
  }
  function makeSet(level, rounds) {
    var L = LEVELS[level] || LEVELS.easy, out = [];
    for (var r = 0; r < rounds; r++) out.push(makeGrid(L.size, L.pairs));
    return out;
  }

  /** found 개를 찾은 뒤 다음에 눌러야 할 값 — 1, 가, 2, 나, … */
  function target(found) {
    return found % 2 === 0 ? found / 2 + 1 : -((found + 1) / 2);
  }

  /** 화면 맨 위 안내 — 1 → 가 → 2 → 나 … */
  function rule() {
    return T('1 → {a} → 2 → {b} → 3 …', { a: label(-1), b: label(-2) });
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      grids: makeSet(level, L.rounds),
      r: 0, found: 0,
      wrong: [],
      total: 0,
      elapsed: 0, done: false
    };
    for (var i = 0; i < L.rounds; i++) S.wrong.push(0);
    persist();
  }
  function persist() {
    if (!S || S.done) return;
    Store.saveSession('altlink', {
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
    var sess = Store.getSession('altlink');
    var best = Store.bestEver('altlink');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('번갈아 잇기') + '</h2>') +
        ('<p class="intro__desc">' + T('숫자와 글자를 번갈아 가며 차례대로 눌러 잇습니다.') + '<br>' +
          rule() +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="alResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{n}번째 판부터', { n: (sess.r || 0) + 1 }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · ' + T('{n}판 · 제한 {m}분', { n: L.rounds, m: Math.round(L.limit / 60) }) +
                (L.showNext ? '' : ' · ' + T('다음 차례를 알려 주지 않음')) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="alPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="alRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#alResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#alPrint').addEventListener('click', function () { Print.dialog('altlink'); });
    root.querySelector('#alRules').addEventListener('click', function () { App.showRules('altlink'); });
  }

  /* ================= 화면: 판 ================= */

  function renderBoard() {
    if (!mounted) return;
    var L = lv();
    if (S.r >= S.grids.length) return finish();
    var grid = S.grids[S.r], n = L.pairs * 2;
    locked = false;

    /* 이미 찾은 칸 — 1, 가, 2, 나 … 를 found 개째까지 */
    var doneSet = {};
    for (var k = 0; k < S.found; k++) doneSet[target(k)] = true;

    root.innerHTML =
      '<section class="game numsearch altlink">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="alTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b>') + (S.r + 1) + '/' + S.grids.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('찾음') + '</span><b id="alFound">') + S.found + '/' + n + '</b></div>' +
        '</div>' +

        '<div class="ns-top">' +
          (L.showNext
            ? ('<span class="ns-top__lbl">' + T('다음 차례') + '</span>' +
               '<b class="ns-next" id="alNext">' + label(target(S.found)) + '</b>')
            : '') +
          ('<p class="mt-hint ns-msg" id="alMsg">' + rule() + '</p>') +
        '</div>' +

        '<div class="ns-grid ns-grid--' + L.size + '" id="alGrid">' +
          grid.map(function (v) {
            if (!v) return '<span class="al-empty"></span>';
            return '<button class="ns-cell ' + (v > 0 ? 'al-num' : 'al-let') + (doneSet[v] ? ' is-done' : '') +
              '" data-v="' + v + '" aria-label="' + label(v) + '">' + label(v) + '</button>';
          }).join('') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="alNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="alQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="alSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#alTime'),
      msg: root.querySelector('#alMsg'),
      found: root.querySelector('#alFound'),
      next: root.querySelector('#alNext'),
      grid: root.querySelector('#alGrid')
    };

    els.grid.addEventListener('click', function (e) {
      var c = e.target.closest('.ns-cell');
      if (!c || locked || c.classList.contains('is-done')) return;
      tap(parseInt(c.dataset.v, 10), c);
    });
    root.querySelector('#alNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('altlink'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#alQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#alSwitch').addEventListener('click', function () { App.gameSwitcher('altlink'); });

    startTimer();
  }

  function tap(v, cell) {
    var L = lv(), n = L.pairs * 2;
    var want = target(S.found);

    if (v !== want) {
      /* 틀림 — 칸만 잠깐 붉어지고 지금 찾을 것을 알려 준다. 점수는 깎지 않는다 */
      S.wrong[S.r] = (S.wrong[S.r] || 0) + 1;
      cell.classList.add('is-bad');
      if (badTimer) clearTimeout(badTimer);
      badTimer = setTimeout(function () { badTimer = null; cell.classList.remove('is-bad'); }, 450);
      els.msg.innerHTML = '<b class="mt-no">' + T('지금 찾을 것: {x}', { x: label(want) }) + '</b>';
      UI.beep('no');
      return;
    }

    S.found++;
    S.total++;
    cell.classList.add('is-done');
    els.found.textContent = S.found + '/' + n;

    if (S.found < n) {
      if (els.next) els.next.textContent = label(target(S.found));
      els.msg.textContent = rule();
      UI.beep('tick');
      persist();
      return;
    }

    /* 한 판 끝 */
    locked = true;
    stopTimer();
    if (els.next) els.next.textContent = '✓';
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
    var totalTaps = L.pairs * 2 * L.rounds;
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
    Store.clearSession('altlink');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'altlink', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
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
      headline: T('번갈아 잇기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('altlink'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderBoard(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderBoard(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<circle cx="6" cy="6" r="3"/><rect x="15" y="4" width="6" height="6" rx="1.5"/>' +
         '<circle cx="6" cy="18" r="3"/><rect x="15" y="14" width="6" height="6" rx="1.5"/>' +
         '<path d="M9 6h6M18 10v4M15 17H9M6 9v6" stroke-width="1.6"/>',
    id: 'altlink', name: T('번갈아 잇기'), tagline: T('숫자와 글자를 번갈아 잇기'),
    rules: {
      title: T('번갈아 잇기 점수 규칙'),
      lines: [
        [T('난이도'), T('숫자와 글자가 늘어납니다 — 1단계 3쌍 · 2단계 5쌍 · 3단계 8쌍 · 4단계 10쌍 · 5단계 12쌍')],
        [T('하는 법'), T('1 → 가 → 2 → 나 → 3 … 처럼 숫자와 글자를 번갈아 차례대로 누릅니다. 맞으면 그 칸이 초록으로 바뀝니다')],
        [T('다음 차례'), T('1~3단계는 판 위에 다음에 누를 것을 크게 보여 줍니다. 4·5단계는 보여 주지 않습니다')],
        [T('찾기 점수'), T('최대 600점 · 찾은 칸 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('집중 보너스'), T('최대 100점 · 한 번도 틀리지 않고 마친 판마다')],
        [T('오답 감점'), T('없음 — 잘못 누르면 그 칸이 잠깐 붉어지고 지금 찾을 것을 알려 드립니다')],
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
    hasProgress: function () { return !!Store.getSession('altlink'); },
    levels: LEVELS,
    levelOrder: ORDER,
    label: label,
    rule: rule,
    /** 인쇄용 — 판 넉 장. 종이에서는 번갈아 가며 차례대로 찾아 연필로 잇는다 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note, size: L.size, pairs: L.pairs,
        grids: makeSet(key, count || 4)
      };
    }
  };
})();
