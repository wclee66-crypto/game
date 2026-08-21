/* 새록 — 낱말찾기
 * 점수: 낱말 600 + 시간 300 + 정확도 100 − (힌트 50/회) + 난이도 보너스
 */
window.Games = window.Games || {};
window.Games.wordsearch = (function () {

  /* 앞 두 단계는 판을 작게, 낱말을 짧게, 방향을 줄인다.
     maxLen 은 낼 수 있는 낱말의 최대 글자 수. */
  var LEVELS = {
    step1:  { name: '첫걸음', step: 1, size: 6,  count: 4,  maxLen: 3, limit: 300, bonus: 0,
              dirs: [[0, 1], [1, 0]], note: '6칸 판 · 낱말 4개 · 가로와 세로만' },
    step2:  { name: '가볍게', step: 2, size: 7,  count: 5,  maxLen: 3, limit: 300, bonus: 0,
              dirs: [[0, 1], [1, 0], [1, 1]], note: '7칸 판 · 낱말 5개 · 대각선 추가' },
    easy:   { name: '쉬움',   step: 3, size: 8,  count: 6,  maxLen: 8, limit: 360, bonus: 0,
              dirs: [[0, 1], [1, 0], [1, 1]], note: '8칸 판 · 낱말 6개' },
    normal: { name: '보통',   step: 4, size: 10, count: 8,  maxLen: 10, limit: 480, bonus: 100,
              dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1]], note: '10칸 판 · 낱말 8개 · 거꾸로도 나옴' },
    hard:   { name: '어려움', step: 5, size: 12, count: 10, maxLen: 12, limit: 600, bonus: 250,
              dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]], note: '12칸 판 · 낱말 10개 · 여덟 방향' }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  /* 찾은 낱말을 칠하는 색 — 포인트 초록에서 시작해 서로 잘 구분되는 순서로 */
  var HUES = ['#0E9E62', '#2F6FED', '#D98324', '#7C5CD6', '#0E8FA8',
              '#D6456B', '#5B9E1E', '#C2458F', '#4C4CCB', '#A2703B'];

  var S = null, root = null, timer = null, els = {};
  var mounted = false;   // 이 게임이 화면에 올라와 있는가
  var drag = null;   // {start:[r,c], path:[idx...], anchored:bool}

  /* ================= 판 만들기 ================= */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildBoard(level) {
    var L = LEVELS[level], N = L.size;
    var cap = Math.min(N, L.maxLen || N);

    // 짧은 낱말이 넉넉한 주제만 고른다 (앞 단계에서 판이 비지 않도록)
    var themes = WORD_THEMES.filter(function (t) {
      return t.words.filter(function (w) { return w.length >= 2 && w.length <= cap; }).length >= L.count + 2;
    });
    if (!themes.length) themes = WORD_THEMES;
    var theme = themes[Math.floor(Math.random() * themes.length)];

    var pool = shuffle(theme.words.filter(function (w) { return w.length >= 2 && w.length <= cap; }));

    var grid = Array.from({ length: N * N }, function () { return ''; });
    var placed = [];

    pool.forEach(function (w) {
      if (placed.length >= L.count) return;
      var chars = w.split('');
      for (var t = 0; t < 400; t++) {
        var d = L.dirs[Math.floor(Math.random() * L.dirs.length)];
        var r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
        var er = r + d[0] * (chars.length - 1), ec = c + d[1] * (chars.length - 1);
        if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
        var ok = true, cells = [];
        for (var k = 0; k < chars.length; k++) {
          var idx = (r + d[0] * k) * N + (c + d[1] * k);
          if (grid[idx] && grid[idx] !== chars[k]) { ok = false; break; }
          cells.push(idx);
        }
        if (!ok) continue;
        cells.forEach(function (idx, k) { grid[idx] = chars[k]; });
        placed.push({ word: w, cells: cells });
        break;
      }
    });

    for (var i = 0; i < grid.length; i++) {
      if (!grid[i]) grid[i] = WORD_FILLER[Math.floor(Math.random() * WORD_FILLER.length)];
    }

    return { theme: theme.name, grid: grid, placed: placed, size: N };
  }

  function newGame(level) {
    var b = buildBoard(level);
    S = {
      day: Store.dayKey(), level: level, theme: b.theme, size: b.size,
      grid: b.grid, placed: b.placed,
      found: [], hinted: [], elapsed: 0, wrong: 0, hints: 0, done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('wordsearch', {
      day: S.day, level: S.level, theme: S.theme, size: S.size, grid: S.grid,
      placed: S.placed, found: S.found, hinted: S.hinted,
      elapsed: S.elapsed, wrong: S.wrong, hints: S.hints
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: s.level, theme: s.theme, size: s.size, grid: s.grid, placed: s.placed,
      found: s.found, hinted: s.hinted || [], elapsed: s.elapsed, wrong: s.wrong, hints: s.hints, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    if (!mounted) return;
    var sess = Store.getSession('wordsearch');
    var best = Store.bestEver('wordsearch');

    root.innerHTML =
      '<section class="intro">' +
        '<div class="intro__mark">낱</div>' +
        '<h2 class="intro__title">낱말찾기</h2>' +
        '<p class="intro__desc">글자판 속에 숨은 낱말을<br>손가락으로 쭉 그어 찾습니다.<br><small>글자를 하나씩 눌러 이어 붙여도 됩니다.<br>고른 칸은 낱말이 될 때까지 색이 남습니다.</small></p>' +
        (best ? '<p class="intro__best">나의 최고 기록 <b>' + UI.comma(best.score) + '점</b></p>' : '') +
        (sess ? '<button class="btn btn--accent btn--big" id="wsResume">이어서 하기 <small>' + LEVELS[sess.level].name + ' · ' + sess.found.length + '/' + sess.placed.length + '개 찾음</small></button>' : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + L.step + '단계</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · 제한 ' + Math.round(L.limit / 60) + '분</span>' +
              '<span class="level__bonus">' + (L.bonus ? '난이도 보너스 +' + L.bonus : '기본') + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        '<button class="btn btn--ghost btn--print" id="wsPrint">종이로 풀 문제 만들기 <small>A4 인쇄 · PDF 저장</small></button>' +
        '<button class="linkbtn" id="wsRules">점수 규칙 보기</button>' +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#wsResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#wsPrint').addEventListener('click', function () { Print.dialog('wordsearch'); });
    root.querySelector('#wsRules').addEventListener('click', function () { App.showRules('wordsearch'); });
  }

  /* ================= 화면: 판 ================= */

  function renderBoard() {
    if (!mounted) return;
    var L = LEVELS[S.level];
    root.innerHTML =
      '<section class="game">' +
        '<div class="hud">' +
          '<div class="hud__item"><span class="hud__lbl">주제</span><b>' + UI.esc(S.theme) + '</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">남은 시간</span><b id="wsTime">0:00</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">찾음</span><b id="wsFound">0</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">힌트</span><b id="wsHint">0</b></div>' +
        '</div>' +
        '<div class="ws-wrap"><div class="ws-grid" id="wsGrid" style="--cols:' + S.size + '"></div></div>' +
        '<ul class="ws-words" id="wsWords"></ul>' +
        '<div class="tools">' +
          '<button class="tool" id="wsHintBtn"><span>💡</span>힌트</button>' +
          '<button class="tool" id="wsRestart"><span>↺</span>새 판</button>' +
          '<button class="tool" id="wsSwitch"><span>⇄</span>다른 게임</button>' +
        '</div>' +
      '</section>';

    els = {
      grid: root.querySelector('#wsGrid'),
      words: root.querySelector('#wsWords'),
      time: root.querySelector('#wsTime'),
      found: root.querySelector('#wsFound'),
      hint: root.querySelector('#wsHint')
    };

    var frag = document.createDocumentFragment();
    for (var i = 0; i < S.grid.length; i++) {
      var c = document.createElement('div');
      c.className = 'ws-cell';
      c.dataset.i = i;
      c.textContent = S.grid[i];
      frag.appendChild(c);
    }
    els.grid.appendChild(frag);

    bindSelection();
    root.querySelector('#wsHintBtn').addEventListener('click', useHint);
    root.querySelector('#wsRestart').addEventListener('click', function () {
      UI.confirm('새 판', '지금 판은 사라집니다. 새로 시작할까요?', function () {
        Store.clearSession('wordsearch'); S = null; renderIntro();
      }, '새로 시작');
    });
    root.querySelector('#wsSwitch').addEventListener('click', function () { App.gameSwitcher('wordsearch'); });

    paintFound();
    paintWords();
    startTimer();
  }

  /* ================= 선택 ================= */

  function cellFrom(x, y) {
    var e = document.elementFromPoint(x, y);
    return e && e.classList && e.classList.contains('ws-cell') ? e : null;
  }

  function pathBetween(a, b) {
    var N = S.size;
    var r1 = Math.floor(a / N), c1 = a % N, r2 = Math.floor(b / N), c2 = b % N;
    var dr = r2 - r1, dc = c2 - c1;
    if (dr === 0 && dc === 0) return [a];
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    var sr = dr === 0 ? 0 : dr / Math.abs(dr);
    var sc = dc === 0 ? 0 : dc / Math.abs(dc);
    var out = [];
    for (var k = 0; k <= steps; k++) out.push((r1 + sr * k) * N + (c1 + sc * k));
    return out;
  }

  function markPath(path) {
    els.grid.querySelectorAll('.is-pick').forEach(function (c) { c.classList.remove('is-pick'); });
    (path || []).forEach(function (i) { els.grid.children[i].classList.add('is-pick'); });
  }

  function bindSelection() {
    var g = els.grid;

    g.addEventListener('pointerdown', function (e) {
      if (S.done) return;
      var c = cellFrom(e.clientX, e.clientY);
      if (!c) return;
      e.preventDefault();
      var i = +c.dataset.i;

      /* 눌러서 고르는 중: 누를 때마다 선택을 늘려 나간다.
         낱말이 완성될 때까지 선택 색은 그대로 남는다. */
      if (drag && drag.anchored) {
        if (i === drag.start && drag.path.length === 1) {   // 시작 칸을 다시 누르면 취소
          drag = null; markPath(null);
          return;
        }
        var p = pathBetween(drag.start, i);
        if (!p) {                                           // 곧지 않은 방향 → 그 칸에서 새로 시작
          drag = { start: i, path: [i], anchored: true, moved: false };
          markPath(drag.path);
          return;
        }
        drag.path = p;
        markPath(p);
        if (tryMatch(p)) drag = null;                       // 낱말이 되면 확정, 아니면 색을 유지
        return;
      }

      drag = { start: i, path: [i], anchored: false, moved: false };
      markPath(drag.path);
      g.setPointerCapture(e.pointerId);
    });

    g.addEventListener('pointermove', function (e) {
      if (!drag || S.done) return;
      var c = cellFrom(e.clientX, e.clientY);
      if (!c) return;
      var i = +c.dataset.i;
      if (i === drag.path[drag.path.length - 1]) return;
      var p = pathBetween(drag.start, i);
      if (!p) return;
      drag.moved = true;
      drag.path = p;
      markPath(p);
    });

    function end() {
      if (!drag || S.done) return;
      if (!drag.moved) {              // 끌지 않고 눌렀다 → 눌러서 고르기로 이어 간다
        if (!drag.anchored) {
          drag.anchored = true;
          UI.toast('글자를 차례로 눌러 낱말을 만들어 보세요.');
        }
        return;
      }
      var p = drag.path;              // 손가락으로 그었다 → 여기서 확정
      drag = null;
      submit(p);
    }
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', function () {
      if (drag && !drag.anchored) { drag = null; markPath(null); }
    });
  }

  /** 고른 칸들이 낱말이 되는지만 본다. 되면 찾은 것으로 처리하고 true. 감점은 없다. */
  function tryMatch(path) {
    if (!path || path.length < 2) return false;
    var fwd = path.map(function (i) { return S.grid[i]; }).join('');
    var rev = path.slice().reverse().map(function (i) { return S.grid[i]; }).join('');

    for (var k = 0; k < S.placed.length; k++) {
      var p = S.placed[k];
      if (S.found.indexOf(p.word) >= 0) continue;
      if (p.word === fwd || p.word === rev) {
        S.found.push(p.word);
        UI.beep('ok');
        markPath(null);
        paintFound(); paintWords(); persist();
        if (S.found.length === S.placed.length) finish(false);
        return true;
      }
    }
    return false;
  }

  function submit(path) {
    markPath(null);
    if (!path || path.length < 2) return;
    if (tryMatch(path)) return;

    S.wrong++;
    UI.beep('no');
    path.forEach(function (i) {
      var c = els.grid.children[i];
      c.classList.remove('is-miss'); void c.offsetWidth; c.classList.add('is-miss');
      setTimeout(function () { c.classList.remove('is-miss'); }, 500);
    });
    persist();
  }

  function useHint() {
    if (S.done) return;
    var rest = S.placed.filter(function (p) { return S.found.indexOf(p.word) < 0; });
    if (!rest.length) return;
    var pick = rest[Math.floor(Math.random() * rest.length)];
    if (S.hinted.indexOf(pick.word) < 0) S.hinted.push(pick.word);
    S.hints++;
    UI.beep('tick');
    paintFound(); paintWords(); persist();
    UI.toast('‘' + pick.word + '’의 첫 글자에 표시했습니다. (−50점)');
    els.hint.textContent = S.hints;
  }

  /* ================= 그리기 ================= */

  function paintFound() {
    Array.prototype.forEach.call(els.grid.children, function (c) {
      c.classList.remove('is-found', 'is-hinted');
      c.style.removeProperty('--wc');
    });
    S.placed.forEach(function (p, k) {
      if (S.found.indexOf(p.word) >= 0) {
        p.cells.forEach(function (i) {
          var c = els.grid.children[i];
          c.classList.add('is-found');
          c.style.setProperty('--wc', HUES[k % HUES.length]);
        });
      } else if (S.hinted.indexOf(p.word) >= 0) {
        els.grid.children[p.cells[0]].classList.add('is-hinted');
      }
    });
    els.found.textContent = S.found.length + ' / ' + S.placed.length;
    els.hint.textContent = S.hints;
  }

  function paintWords() {
    els.words.innerHTML = S.placed.map(function (p, k) {
      var done = S.found.indexOf(p.word) >= 0;
      return '<li class="ws-word' + (done ? ' is-done' : '') + '"' +
        (done ? ' style="--wc:' + HUES[k % HUES.length] + '"' : '') + '>' + UI.esc(p.word) + '</li>';
    }).join('');
  }

  /* ================= 시간 ================= */

  function startTimer() {
    stopTimer();
    var L = LEVELS[S.level];
    els.time.textContent = UI.fmtTime(L.limit - S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done) return;
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
    var L = LEVELS[S.level];
    var all = S.found.length === S.placed.length;
    var words = Math.round(600 * S.found.length / S.placed.length);
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    var acc = Math.max(0, 100 - S.wrong * 10);
    var penalty = S.hints * 50;
    var bonus = all ? L.bonus : 0;
    return {
      words: words, time: time, acc: acc, penalty: penalty, bonus: bonus, all: all,
      total: Math.max(0, words + time + acc + bonus - penalty)
    };
  }

  function finish(timeUp) {
    S.done = true;
    stopTimer();
    Store.clearSession('wordsearch');
    UI.beep(timeUp ? 'no' : 'win');
    paintFound();

    var sc = score();
    Store.addRecord({
      game: 'wordsearch', score: sc.total, difficulty: LEVELS[S.level].step + '단계 ' + LEVELS[S.level].name,
      duration: S.elapsed,
      detail: { found: S.found.length, total: S.placed.length, wrong: S.wrong, hints: S.hints, theme: S.theme, timeUp: !!timeUp }
    });

    var rows = [{ label: '찾은 낱말 (' + S.found.length + '/' + S.placed.length + '개)', value: sc.words }];
    if (sc.all) rows.push({ label: '시간 보너스 (' + UI.fmtTime(LEVELS[S.level].limit - S.elapsed) + ' 남김)', value: sc.time });
    rows.push({ label: '정확도 보너스 (헛선택 ' + S.wrong + '회)', value: sc.acc });
    if (sc.bonus) rows.push({ label: '난이도 보너스 (' + LEVELS[S.level].name + ')', value: sc.bonus });
    if (sc.penalty) rows.push({ label: '힌트 사용 (' + S.hints + '회)', value: sc.penalty, minus: true });

    UI.resultModal({
      title: timeUp ? '시간이 다 되었습니다' : '낱말을 모두 찾았습니다!',
      score: sc.total,
      headline: timeUp ? '남은 낱말: ' + S.placed.filter(function (p) { return S.found.indexOf(p.word) < 0; }).map(function (p) { return p.word; }).join(', ')
                       : '주제 ‘' + S.theme + '’ 완주!',
      rows: rows,
      note: sc.all ? '' : '모든 낱말을 찾아야 시간 보너스와 난이도 보너스를 받습니다.',
      actions: [
        { label: '다른 게임', onClick: function () { App.gameSwitcher('wordsearch'); } },
        { label: '기록 보기', onClick: function () { App.go('records'); } },
        { label: '한 판 더', kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
    });
  }

  return {
    id: 'wordsearch', name: '낱말찾기', tagline: '글자판 속 숨은 낱말',
    rules: {
      title: '낱말찾기 점수 규칙',
      lines: [
        ['난이도', '1단계 첫걸음(6칸·낱말 4개·가로세로만) · 2단계 가볍게(7칸·5개) · 3단계 쉬움(8칸·6개) · 4단계 보통(10칸·8개) · 5단계 어려움(12칸·10개)'],
        ['낱말 점수', '최대 600점 · 찾은 낱말 수에 비례 (모두 찾으면 600점)'],
        ['시간 보너스', '최대 300점 · 모든 낱말을 찾았을 때만, 남은 시간에 비례'],
        ['정확도 보너스', '최대 100점 · 잘못 그은 횟수 1회마다 10점씩 줄어듦'],
        ['힌트 감점', '힌트 1회마다 50점 차감'],
        ['난이도 보너스', '보통 +100점, 어려움 +250점 (모두 찾았을 때 · 1~3단계는 보너스 없음)'],
        ['최고 점수', '1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점'],
        ['시간이 끝나면', '찾은 만큼만 점수로 기록됩니다']
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () { mounted = false; stopTimer(); persist(); },
    hasProgress: function () { return !!Store.getSession('wordsearch'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용으로 새 판을 하나 만들어 준다 (화면 상태와 무관) */
    makeForPrint: function (level) {
      var b = buildBoard(LEVELS[level] ? level : 'easy');
      return { level: level, levelName: LEVELS[level].name, theme: b.theme, grid: b.grid, placed: b.placed, size: b.size };
    }
  };
})();
