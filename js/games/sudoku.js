/* 맑은뜰 — 스도쿠
 * 점수: 완성 500 + 시간 300 + 정확도 200 − (힌트 50/회) + 난이도 보너스
 */
window.Games = window.Games || {};
window.Games.sudoku = (function () {

  var LEVELS = {
    easy:   { name: '쉬움',   givens: 45, limit: 480,  bonus: 0 },
    normal: { name: '보통',   givens: 34, limit: 720,  bonus: 100 },
    hard:   { name: '어려움', givens: 28, limit: 1080, bonus: 250 }
  };

  var S = null;      // 현재 게임 상태
  var root = null;
  var timer = null;
  var els = {};
  var mounted = false;   // 이 게임이 화면에 올라와 있는가

  /* ================= 퍼즐 만들기 ================= */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function canPlace(g, i, v) {
    var r = Math.floor(i / 9), c = i % 9;
    var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (var k = 0; k < 9; k++) {
      if (g[r * 9 + k] === v) return false;
      if (g[k * 9 + c] === v) return false;
      if (g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === v) return false;
    }
    return true;
  }

  function fill(g, pos) {
    if (pos === 81) return true;
    if (g[pos]) return fill(g, pos + 1);
    var nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (var i = 0; i < 9; i++) {
      if (canPlace(g, pos, nums[i])) {
        g[pos] = nums[i];
        if (fill(g, pos + 1)) return true;
        g[pos] = 0;
      }
    }
    return false;
  }

  /** 해가 몇 개인지 센다 (limit개를 넘으면 바로 중단) */
  function countSolutions(g, limit) {
    var best = -1, bestCount = 10;
    for (var i = 0; i < 81; i++) {
      if (g[i]) continue;
      var n = 0;
      for (var v = 1; v <= 9; v++) if (canPlace(g, i, v)) n++;
      if (n === 0) return 0;
      if (n < bestCount) { bestCount = n; best = i; if (n === 1) break; }
    }
    if (best === -1) return 1;
    var total = 0;
    for (var v2 = 1; v2 <= 9; v2++) {
      if (!canPlace(g, best, v2)) continue;
      g[best] = v2;
      total += countSolutions(g, limit - total);
      g[best] = 0;
      if (total >= limit) return total;
    }
    return total;
  }

  function makePuzzle(level) {
    var sol = new Array(81).fill(0);
    fill(sol, 0);
    var puz = sol.slice();
    var order = shuffle(Array.from({ length: 81 }, function (_, i) { return i; }));
    var removed = 0, target = 81 - LEVELS[level].givens;
    for (var i = 0; i < order.length && removed < target; i++) {
      var p = order[i], keep = puz[p];
      puz[p] = 0;
      if (countSolutions(puz.slice(), 2) !== 1) puz[p] = keep;
      else removed++;
    }
    return { puzzle: puz, solution: sol };
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var made = makePuzzle(level);
    S = {
      day: Store.dayKey(),
      level: level,
      puzzle: made.puzzle,
      solution: made.solution,
      values: made.puzzle.slice(),
      notes: Array.from({ length: 81 }, function () { return []; }),
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
      day: sess.day, level: sess.level, puzzle: sess.puzzle, solution: sess.solution,
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
        '<p class="intro__desc">가로줄·세로줄·굵은 네모 칸마다<br>1부터 9까지 한 번씩만 들어갑니다.</p>' +
        (best ? '<p class="intro__best">나의 최고 기록 <b>' + UI.comma(best.score) + '점</b></p>' : '') +
        (sess ? '<button class="btn btn--accent btn--big" id="sdResume">이어서 하기 <small>' + LEVELS[sess.level].name + ' · ' + UI.fmtTime(sess.elapsed) + ' 경과</small></button>' : '') +
        '<div class="levels">' +
          Object.keys(LEVELS).map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">숫자 ' + L.givens + '개로 시작 · 제한 ' + Math.round(L.limit / 60) + '분</span>' +
              (L.bonus ? '<span class="level__bonus">난이도 보너스 +' + L.bonus + '</span>' : '<span class="level__bonus">기본</span>') +
              '</button>';
          }).join('') +
        '</div>' +
        '<button class="btn btn--ghost btn--print" id="sdPrint">🖨 종이로 풀 문제 만들기 <small>A4 인쇄 · PDF 저장</small></button>' +
        '<button class="linkbtn" id="sdRules">점수 규칙 보기</button>' +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () {
        var lv = b.dataset.level;
        b.classList.add('is-loading');
        b.querySelector('.level__meta').textContent = '문제를 만드는 중…';
        setTimeout(function () { newGame(lv); renderBoard(); }, 30);
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
    var L = LEVELS[S.level];
    root.innerHTML =
      '<section class="game">' +
        '<div class="hud">' +
          '<div class="hud__item"><span class="hud__lbl">난이도</span><b id="sdLevel">' + L.name + '</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">시간</span><b id="sdTime">0:00</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">실수</span><b id="sdMiss">0</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">힌트</span><b id="sdHint">0</b></div>' +
        '</div>' +
        '<div class="sd-grid" id="sdGrid"></div>' +
        '<div class="pad" id="sdPad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
            return '<button class="pad__key" data-n="' + n + '"><span>' + n + '</span><em class="pad__left"></em></button>';
          }).join('') +
          '<button class="pad__key pad__key--fn" data-act="erase">지우기</button>' +
        '</div>' +
        '<div class="tools">' +
          '<button class="tool" id="sdNote"><span>✎</span>메모</button>' +
          '<button class="tool" id="sdHintBtn"><span>💡</span>힌트</button>' +
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
    for (var i = 0; i < 81; i++) {
      var c = document.createElement('button');
      c.className = 'sd-cell';
      c.dataset.i = i;
      if (i % 3 === 2 && i % 9 !== 8) c.classList.add('br');
      if (Math.floor(i / 9) % 3 === 2 && i < 72) c.classList.add('bb');
      frag.appendChild(c);
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
      // 같은 줄·칸의 메모에서 지워 준다
      clearNotes(i, n);
    }
    paint(); persist();
    if (isComplete()) finish();
  }

  function clearNotes(i, n) {
    var r = Math.floor(i / 9), c = i % 9;
    var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    var idx = [];
    for (var k = 0; k < 9; k++) {
      idx.push(r * 9 + k, k * 9 + c, (br + Math.floor(k / 3)) * 9 + bc + (k % 3));
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
    var i = S.sel;
    if (i < 0 || S.puzzle[i] || S.values[i] === S.solution[i]) {
      var empties = [];
      for (var k = 0; k < 81; k++) if (S.values[k] !== S.solution[k]) empties.push(k);
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
    for (var i = 0; i < 81; i++) if (S.values[i] !== S.solution[i]) return false;
    return true;
  }

  /* ================= 그리기 ================= */

  function paint() {
    var sel = S.sel;
    var selR = sel >= 0 ? Math.floor(sel / 9) : -1;
    var selC = sel >= 0 ? sel % 9 : -1;
    var selB = sel >= 0 ? Math.floor(selR / 3) * 3 + Math.floor(selC / 3) : -1;
    var selV = sel >= 0 ? S.values[sel] : 0;

    for (var i = 0; i < 81; i++) {
      var cell = els.grid.children[i];
      var v = S.values[i];
      var r = Math.floor(i / 9), c = i % 9;
      var b = Math.floor(r / 3) * 3 + Math.floor(c / 3);

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
      cell.classList.toggle('is-peer', i !== sel && (r === selR || c === selC || b === selB));
      cell.classList.toggle('is-same', !!v && v === selV && i !== sel);
    }

    // 숫자별 남은 개수
    var count = {};
    for (var n = 1; n <= 9; n++) count[n] = 0;
    S.values.forEach(function (v2, idx) { if (v2 && v2 === S.solution[idx]) count[v2]++; });
    els.pad.querySelectorAll('.pad__key[data-n]').forEach(function (k) {
      var left = 9 - count[+k.dataset.n];
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
      if (!S || S.done) return;
      S.elapsed++;
      els.time.textContent = UI.fmtTime(S.elapsed);
      if (S.elapsed % 10 === 0) persist();
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  /* ================= 점수 ================= */

  function score() {
    var L = LEVELS[S.level];
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

    var sc = score();
    Store.addRecord({
      game: 'sudoku', score: sc.total, difficulty: LEVELS[S.level].name,
      duration: S.elapsed,
      detail: { mistakes: S.mistakes, hints: S.hints, time: sc.time, acc: sc.acc, bonus: sc.bonus }
    });

    var rows = [
      { label: '완성 기본 점수', value: sc.base },
      { label: '시간 보너스 (' + UI.fmtTime(S.elapsed) + ' / ' + UI.fmtTime(LEVELS[S.level].limit) + ')', value: sc.time },
      { label: '정확도 보너스 (실수 ' + S.mistakes + '회)', value: sc.acc }
    ];
    if (sc.bonus) rows.push({ label: '난이도 보너스 (' + LEVELS[S.level].name + ')', value: sc.bonus });
    if (sc.penalty) rows.push({ label: '힌트 사용 (' + S.hints + '회)', value: sc.penalty, minus: true });

    UI.resultModal({
      title: '스도쿠를 다 풀었습니다!',
      score: sc.total,
      headline: praise(sc.total),
      rows: rows,
      note: '오늘 스도쿠 최고 기록: ' + UI.comma(Store.dayBest()[ 'sudoku'] || sc.total) + '점',
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
    id: 'sudoku', name: '스도쿠', icon: '수',
    rules: {
      title: '스도쿠 점수 규칙',
      lines: [
        ['완성 기본', '문제를 다 풀면 500점'],
        ['시간 보너스', '최대 300점 · 제한 시간이 많이 남을수록 높음 (쉬움 8분 / 보통 12분 / 어려움 18분)'],
        ['정확도 보너스', '최대 200점 · 실수 1회마다 40점씩 줄어듦'],
        ['힌트 감점', '힌트 1회마다 50점 차감'],
        ['난이도 보너스', '보통 +100점, 어려움 +250점'],
        ['최고 점수', '쉬움 1,000점 / 보통 1,100점 / 어려움 1,250점'],
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
    /** 인쇄용으로 새 문제를 하나 만들어 준다 (화면 상태와 무관) */
    makeForPrint: function (level) {
      var made = makePuzzle(LEVELS[level] ? level : 'easy');
      return { level: level, levelName: LEVELS[level].name, puzzle: made.puzzle, solution: made.solution };
    }
  };
})();
