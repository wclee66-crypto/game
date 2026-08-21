/* 새록 — 스도쿠
 * 점수: 완성 500 + 시간 300 + 정확도 200 − (힌트 50/회) + 난이도 보너스
 *
 * 난이도는 다섯 단계이고, 앞 두 단계는 판 자체를 작게 만든다.
 * 숫자만 많이 주는 것으로는 9칸 판이 쉬워지지 않기 때문이다.
 *   n  = 한 줄의 칸 수, br·bc = 굵은 네모 한 칸의 세로·가로 크기
 */
window.Games = window.Games || {};
window.Games.sudoku = (function () {

  var LEVELS = {
    step1:  { name: '첫걸음', step: 1, n: 4, br: 2, bc: 2, givens: 8,  limit: 240,  bonus: 0,
              note: '4칸 판 · 숫자 1~4' },
    step2:  { name: '가볍게', step: 2, n: 6, br: 2, bc: 3, givens: 20, limit: 420,  bonus: 0,
              note: '6칸 판 · 숫자 1~6' },
    easy:   { name: '쉬움',   step: 3, n: 9, br: 3, bc: 3, givens: 45, limit: 480,  bonus: 0,
              note: '9칸 판 · 숫자 45개로 시작' },
    normal: { name: '보통',   step: 4, n: 9, br: 3, bc: 3, givens: 34, limit: 720,  bonus: 100,
              note: '9칸 판 · 숫자 34개로 시작' },
    hard:   { name: '어려움', step: 5, n: 9, br: 3, bc: 3, givens: 28, limit: 1080, bonus: 250,
              note: '9칸 판 · 숫자 28개로 시작' }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null;      // 현재 게임 상태
  var root = null;
  var timer = null;
  var els = {};
  var mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }

  /* ================= 퍼즐 만들기 ================= */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** i 칸에 v 를 놓아도 되는가 */
  function canPlace(g, i, v, L) {
    var N = L.n, r = Math.floor(i / N), c = i % N, k;
    for (k = 0; k < N; k++) {
      if (g[r * N + k] === v) return false;
      if (g[k * N + c] === v) return false;
    }
    var r0 = Math.floor(r / L.br) * L.br, c0 = Math.floor(c / L.bc) * L.bc;
    for (var rr = 0; rr < L.br; rr++) {
      for (var cc = 0; cc < L.bc; cc++) {
        if (g[(r0 + rr) * N + c0 + cc] === v) return false;
      }
    }
    return true;
  }

  function fill(g, pos, L) {
    var N = L.n;
    if (pos === N * N) return true;
    if (g[pos]) return fill(g, pos + 1, L);
    var nums = shuffle(Array.from({ length: N }, function (_, i) { return i + 1; }));
    for (var i = 0; i < N; i++) {
      if (canPlace(g, pos, nums[i], L)) {
        g[pos] = nums[i];
        if (fill(g, pos + 1, L)) return true;
        g[pos] = 0;
      }
    }
    return false;
  }

  /** 해가 몇 개인지 센다 (limit개를 넘으면 바로 중단) */
  function countSolutions(g, limit, L) {
    var N = L.n, best = -1, bestCount = N + 1, i, v;
    for (i = 0; i < N * N; i++) {
      if (g[i]) continue;
      var n = 0;
      for (v = 1; v <= N; v++) if (canPlace(g, i, v, L)) n++;
      if (n === 0) return 0;
      if (n < bestCount) { bestCount = n; best = i; if (n === 1) break; }
    }
    if (best === -1) return 1;
    var total = 0;
    for (v = 1; v <= N; v++) {
      if (!canPlace(g, best, v, L)) continue;
      g[best] = v;
      total += countSolutions(g, limit - total, L);
      g[best] = 0;
      if (total >= limit) return total;
    }
    return total;
  }

  function makePuzzle(level) {
    var L = LEVELS[level], N = L.n;
    var sol = new Array(N * N).fill(0);
    fill(sol, 0, L);
    var puz = sol.slice();
    var order = shuffle(Array.from({ length: N * N }, function (_, i) { return i; }));
    var removed = 0, target = N * N - L.givens;
    for (var i = 0; i < order.length && removed < target; i++) {
      var p = order[i], keep = puz[p];
      puz[p] = 0;
      if (countSolutions(puz.slice(), 2, L) !== 1) puz[p] = keep;
      else removed++;
    }
    return { puzzle: puz, solution: sol };
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var made = makePuzzle(level);
    var N = LEVELS[level].n;
    S = {
      day: Store.dayKey(),
      level: level,
      puzzle: made.puzzle,
      solution: made.solution,
      values: made.puzzle.slice(),
      notes: Array.from({ length: N * N }, function () { return []; }),
      sel: -1,
      mistakes: 0,
      hints: 0,
      elapsed: 0,
      noteMode: false,
      done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('sudoku', {
      day: S.day, level: S.level, puzzle: S.puzzle, solution: S.solution,
      values: S.values, notes: S.notes, mistakes: S.mistakes, hints: S.hints, elapsed: S.elapsed
    });
  }

  function restore(sess) {
    S = {
      day: sess.day, level: LEVELS[sess.level] ? sess.level : 'easy',
      puzzle: sess.puzzle, solution: sess.solution,
      values: sess.values, notes: sess.notes, sel: -1,
      mistakes: sess.mistakes, hints: sess.hints, elapsed: sess.elapsed,
      noteMode: false, done: false
    };
  }

  /* ================= 화면: 난이도 고르기 ================= */

  function renderIntro() {
    stopTimer();
    if (!mounted) return;
    var sess = Store.getSession('sudoku');
    var best = Store.bestEver('sudoku');

    root.innerHTML =
      '<section class="intro">' +
        '<div class="intro__mark">수</div>' +
        '<h2 class="intro__title">스도쿠</h2>' +
        '<p class="intro__desc">가로줄·세로줄·굵은 네모 칸마다<br>숫자가 한 번씩만 들어갑니다.<br><small>처음이시면 1단계부터 해 보세요.</small></p>' +
        (best ? '<p class="intro__best">나의 최고 기록 <b>' + UI.comma(best.score) + '점</b></p>' : '') +
        (sess && LEVELS[sess.level]
          ? '<button class="btn btn--accent btn--big" id="sdResume">이어서 하기 <small>' +
            LEVELS[sess.level].name + ' · ' + UI.fmtTime(sess.elapsed) + ' 경과</small></button>'
          : '') +
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
        '<button class="btn btn--ghost btn--print" id="sdPrint">종이로 풀 문제 만들기 <small>A4 인쇄 · PDF 저장</small></button>' +
        '<button class="linkbtn" id="sdRules">점수 규칙 보기</button>' +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.level;
        b.classList.add('is-loading');
        b.querySelector('.level__meta').textContent = '문제를 만드는 중…';
        setTimeout(function () { newGame(k); renderBoard(); }, 30);
      });
    });
    var rb = root.querySelector('#sdResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#sdPrint').addEventListener('click', function () { Print.dialog('sudoku'); });
    root.querySelector('#sdRules').addEventListener('click', function () { App.showRules('sudoku'); });
  }

  /* ================= 화면: 게임판 ================= */

  function renderBoard() {
    if (!mounted) return;
    var L = lv(), N = L.n;

    root.innerHTML =
      '<section class="game">' +
        '<div class="hud">' +
          '<div class="hud__item"><span class="hud__lbl">난이도</span><b id="sdLevel">' + L.name + '</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">시간</span><b id="sdTime">0:00</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">실수</span><b id="sdMiss">0</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">힌트</span><b id="sdHint">0</b></div>' +
        '</div>' +
        '<div class="sd-grid" id="sdGrid" style="--n:' + N + '"></div>' +
        '<div class="pad" id="sdPad">' +
          Array.from({ length: N }, function (_, i) {
            return '<button class="pad__key" data-n="' + (i + 1) + '"><span>' + (i + 1) + '</span><em class="pad__left"></em></button>';
          }).join('') +
          '<button class="pad__key pad__key--fn" data-act="erase">지우기</button>' +
        '</div>' +
        '<div class="tools">' +
          '<button class="tool" id="sdNote"><span>✎</span>메모</button>' +
          '<button class="tool" id="sdHintBtn"><span>?</span>힌트</button>' +
          '<button class="tool" id="sdRestart"><span>↺</span>새 문제</button>' +
          '<button class="tool" id="sdSwitch"><span>⇄</span>다른 게임</button>' +
        '</div>' +
      '</section>';

    els = {
      grid: root.querySelector('#sdGrid'),
      time: root.querySelector('#sdTime'),
      miss: root.querySelector('#sdMiss'),
      hint: root.querySelector('#sdHint'),
      note: root.querySelector('#sdNote'),
      pad: root.querySelector('#sdPad')
    };

    var frag = document.createDocumentFragment();
    for (var i = 0; i < N * N; i++) {
      var r = Math.floor(i / N), c = i % N;
      var el = document.createElement('button');
      el.className = 'sd-cell';
      el.dataset.i = i;
      if (c === N - 1) el.classList.add('er');
      else if (c % L.bc === L.bc - 1) el.classList.add('br');
      if (r === N - 1) el.classList.add('eb');
      else if (r % L.br === L.br - 1) el.classList.add('bb');
      frag.appendChild(el);
    }
    els.grid.appendChild(frag);

    els.grid.addEventListener('click', function (e) {
      var c = e.target.closest('.sd-cell');
      if (!c || S.done) return;
      S.sel = +c.dataset.i;
      paint();
    });

    els.pad.addEventListener('click', function (e) {
      var k = e.target.closest('.pad__key');
      if (!k || S.done) return;
      if (k.dataset.act === 'erase') erase();
      else input(+k.dataset.n);
    });

    els.note.addEventListener('click', function () {
      S.noteMode = !S.noteMode;
      els.note.classList.toggle('is-on', S.noteMode);
      UI.toast(S.noteMode ? '메모 모드입니다. 숫자를 작게 적어 둡니다.' : '메모 모드를 껐습니다.');
    });
    root.querySelector('#sdHintBtn').addEventListener('click', useHint);
    root.querySelector('#sdRestart').addEventListener('click', function () {
      UI.confirm('새 문제', '지금 풀던 문제는 사라집니다. 새로 시작할까요?', function () {
        Store.clearSession('sudoku');
        S = null; renderIntro();
      }, '새로 시작');
    });
    root.querySelector('#sdSwitch').addEventListener('click', function () { App.gameSwitcher('sudoku'); });

    paint();
    startTimer();
  }

  /* ================= 조작 ================= */

  function input(n) {
    var i = S.sel;
    if (i < 0) { UI.toast('먼저 빈칸을 눌러 주세요.'); return; }
    if (S.puzzle[i]) return;

    if (S.noteMode) {
      var arr = S.notes[i], p = arr.indexOf(n);
      if (p >= 0) arr.splice(p, 1); else arr.push(n);
      S.values[i] = 0;
      paint(); persist();
      return;
    }

    S.values[i] = n;
    S.notes[i] = [];
    if (n !== S.solution[i]) {
      S.mistakes++;
      UI.beep('no');
      var cell = els.grid.children[i];
      cell.classList.remove('shake'); void cell.offsetWidth; cell.classList.add('shake');
    } else {
      UI.beep('tick');
      clearNotes(i, n);
    }
    paint(); persist();
    if (isComplete()) finish();
  }

  /** 같은 줄·칸의 메모에서 그 숫자를 지워 준다 */
  function clearNotes(i, n) {
    var L = lv(), N = L.n;
    var r = Math.floor(i / N), c = i % N;
    var r0 = Math.floor(r / L.br) * L.br, c0 = Math.floor(c / L.bc) * L.bc;
    var idx = [], k;
    for (k = 0; k < N; k++) idx.push(r * N + k, k * N + c);
    for (var rr = 0; rr < L.br; rr++) {
      for (var cc = 0; cc < L.bc; cc++) idx.push((r0 + rr) * N + c0 + cc);
    }
    idx.forEach(function (j) {
      var p = S.notes[j].indexOf(n);
      if (p >= 0) S.notes[j].splice(p, 1);
    });
  }

  function erase() {
    var i = S.sel;
    if (i < 0 || S.puzzle[i]) return;
    S.values[i] = 0;
    S.notes[i] = [];
    paint(); persist();
  }

  function useHint() {
    if (S.done) return;
    var N = lv().n, i = S.sel;
    if (i < 0 || S.puzzle[i] || S.values[i] === S.solution[i]) {
      var empties = [];
      for (var k = 0; k < N * N; k++) if (S.values[k] !== S.solution[k]) empties.push(k);
      if (!empties.length) return;
      i = empties[Math.floor(Math.random() * empties.length)];
      S.sel = i;
    }
    S.values[i] = S.solution[i];
    S.notes[i] = [];
    S.hints++;
    clearNotes(i, S.solution[i]);
    UI.beep('ok');
    paint(); persist();
    UI.toast('힌트 한 칸을 채웠습니다. (−50점)');
    if (isComplete()) finish();
  }

  function isComplete() {
    var N = lv().n;
    for (var i = 0; i < N * N; i++) if (S.values[i] !== S.solution[i]) return false;
    return true;
  }

  /* ================= 그리기 ================= */

  function paint() {
    var L = lv(), N = L.n;
    var sel = S.sel;
    var selR = sel >= 0 ? Math.floor(sel / N) : -1;
    var selC = sel >= 0 ? sel % N : -1;
    var selBR = sel >= 0 ? Math.floor(selR / L.br) : -1;
    var selBC = sel >= 0 ? Math.floor(selC / L.bc) : -1;
    var selV = sel >= 0 ? S.values[sel] : 0;

    for (var i = 0; i < N * N; i++) {
      var cell = els.grid.children[i];
      var v = S.values[i];
      var r = Math.floor(i / N), c = i % N;

      if (v) {
        cell.textContent = v;
        cell.classList.remove('has-notes');
      } else if (S.notes[i].length) {
        cell.innerHTML = '<span class="notes">' + S.notes[i].slice().sort().join(' ') + '</span>';
        cell.classList.add('has-notes');
      } else {
        cell.textContent = '';
        cell.classList.remove('has-notes');
      }

      cell.classList.toggle('is-given', !!S.puzzle[i]);
      cell.classList.toggle('is-wrong', !!v && v !== S.solution[i]);
      cell.classList.toggle('is-sel', i === sel);
      cell.classList.toggle('is-peer', i !== sel &&
        (r === selR || c === selC ||
         (Math.floor(r / L.br) === selBR && Math.floor(c / L.bc) === selBC)));
      cell.classList.toggle('is-same', !!v && v === selV && i !== sel);
    }

    // 숫자별 남은 개수
    var count = {}, n;
    for (n = 1; n <= N; n++) count[n] = 0;
    S.values.forEach(function (v2, idx) { if (v2 && v2 === S.solution[idx]) count[v2]++; });
    els.pad.querySelectorAll('.pad__key[data-n]').forEach(function (k) {
      var left = N - count[+k.dataset.n];
      k.querySelector('.pad__left').textContent = left > 0 ? left : '';
      k.classList.toggle('is-done', left === 0);
    });

    els.miss.textContent = S.mistakes;
    els.hint.textContent = S.hints;
  }

  /* ================= 시간 ================= */

  function startTimer() {
    stopTimer();
    els.time.textContent = UI.fmtTime(S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done || !mounted) return;
      S.elapsed++;
      els.time.textContent = UI.fmtTime(S.elapsed);
      if (S.elapsed % 10 === 0) persist();
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  /* ================= 점수 ================= */

  function score() {
    var L = lv();
    var base = 500;
    var time = Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit);
    var acc = Math.max(0, 200 - S.mistakes * 40);
    var hintPenalty = S.hints * 50;
    var bonus = L.bonus;
    var total = Math.max(0, base + time + acc + bonus - hintPenalty);
    return { base: base, time: time, acc: acc, penalty: hintPenalty, bonus: bonus, total: total };
  }

  function finish() {
    S.done = true;
    stopTimer();
    Store.clearSession('sudoku');
    UI.beep('win');

    var L = lv();
    var sc = score();
    Store.addRecord({
      game: 'sudoku', score: sc.total, difficulty: L.step + '단계 ' + L.name,
      duration: S.elapsed,
      detail: { mistakes: S.mistakes, hints: S.hints, size: L.n, time: sc.time, acc: sc.acc, bonus: sc.bonus }
    });

    var rows = [
      { label: '완성 기본 점수', value: sc.base },
      { label: '시간 보너스 (' + UI.fmtTime(S.elapsed) + ' / ' + UI.fmtTime(L.limit) + ')', value: sc.time },
      { label: '정확도 보너스 (실수 ' + S.mistakes + '회)', value: sc.acc }
    ];
    if (sc.bonus) rows.push({ label: '난이도 보너스 (' + L.name + ')', value: sc.bonus });
    if (sc.penalty) rows.push({ label: '힌트 사용 (' + S.hints + '회)', value: sc.penalty, minus: true });

    UI.resultModal({
      title: '스도쿠를 다 풀었습니다!',
      score: sc.total,
      headline: praise(sc.total),
      rows: rows,
      note: '오늘 스도쿠 최고 기록: ' + UI.comma(Store.dayBest()['sudoku'] || sc.total) + '점',
      actions: [
        { label: '다른 게임', onClick: function () { App.gameSwitcher('sudoku'); } },
        { label: '기록 보기', onClick: function () { App.go('records'); } },
        { label: '한 판 더', kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
    });
  }

  function praise(n) {
    if (n >= 1000) return '아주 훌륭합니다. 오늘 머리가 맑으시네요!';
    if (n >= 700) return '잘하셨습니다. 꾸준함이 힘입니다.';
    if (n >= 400) return '좋습니다. 한 판 더 해 볼까요?';
    return '끝까지 푸신 것이 가장 큰 성과입니다.';
  }

  /* ================= 진입점 ================= */

  return {
    id: 'sudoku', name: '스도쿠', icon: '수', tagline: '숫자로 하는 두뇌 체조',
    rules: {
      title: '스도쿠 점수 규칙',
      lines: [
        ['난이도', '1단계 첫걸음(4칸) · 2단계 가볍게(6칸) · 3단계 쉬움 · 4단계 보통 · 5단계 어려움 (3~5단계는 9칸 판)'],
        ['완성 기본', '문제를 다 풀면 500점'],
        ['시간 보너스', '최대 300점 · 제한 시간이 많이 남을수록 높음 (4분 / 7분 / 8분 / 12분 / 18분)'],
        ['정확도 보너스', '최대 200점 · 실수 1회마다 40점씩 줄어듦'],
        ['힌트 감점', '힌트 1회마다 50점 차감'],
        ['난이도 보너스', '보통 +100점, 어려움 +250점 (1~3단계는 보너스 없음)'],
        ['최고 점수', '1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점'],
        ['주의', '다 풀지 않고 나가면 점수는 기록되지 않습니다 (진행 상황은 저장됩니다)']
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
      stopTimer();
      persist();
    },
    hasProgress: function () { return !!Store.getSession('sudoku'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용으로 새 문제를 하나 만들어 준다 (화면 상태와 무관) */
    makeForPrint: function (level) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      var made = makePuzzle(key);
      return {
        level: key, levelName: L.step + '단계 ' + L.name,
        n: L.n, br: L.br, bc: L.bc,
        puzzle: made.puzzle, solution: made.solution
      };
    }
  };
})();
