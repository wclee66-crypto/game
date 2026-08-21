/* 새록 — 상식 퀴즈
 * 점수: 정답 700 + 속도 200 + 연속 100 + 난이도 보너스
 */
window.Games = window.Games || {};
window.Games.quiz = (function () {

  /* 난이도는 세 가지가 함께 달라진다 — 문항 수 · 문항당 시간 · 문제의 어려움(pool)
   * pool 은 문제 은행의 d 값(1 쉬움 / 2 보통 / 3 어려움) 중 어떤 것을 낼지 정한다. */
  /* 앞 두 단계는 문항을 줄이고, 시간을 늘리고, 보기 수까지 줄인다.
     보기가 넷에서 둘로 줄면 체감 난이도가 크게 낮아진다. */
  var LEVELS = {
    step1:  { name: '첫걸음', step: 1, count: 5,  time: 40, opts: 2, bonus: 0,   pool: [1],
              note: '5문항 · 보기 2개 · 문항당 40초 · 쉬운 문제만' },
    step2:  { name: '가볍게', step: 2, count: 8,  time: 30, opts: 3, bonus: 0,   pool: [1],
              note: '8문항 · 보기 3개 · 문항당 30초 · 쉬운 문제만' },
    easy:   { name: '기본',   step: 3, count: 10, time: 25, opts: 4, bonus: 0,   pool: [1, 2],
              note: '10문항 · 보기 4개 · 문항당 25초' },
    normal: { name: '보통',   step: 4, count: 15, time: 16, opts: 4, bonus: 100, pool: [2, 3],
              note: '15문항 · 보기 4개 · 문항당 16초 · 보통 이상' },
    hard:   { name: '도전',   step: 5, count: 20, time: 10, opts: 4, bonus: 250, pool: [3],
              note: '20문항 · 보기 4개 · 문항당 10초 · 어려운 문제만' }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  function qtime() { return (LEVELS[S.level] || LEVELS.easy).time; }

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;      // 정답 표시 뒤 다음 문제로 넘어가는 예약
  var mounted = false;       // 이 게임이 화면에 올라와 있는가

  /* 예약된 '다음 문제' 를 취소한다.
     이것을 지우지 않으면 다른 게임으로 넘어간 뒤에도 예약이 터져
     새 게임 화면을 퀴즈 화면으로 덮어써 버린다. */
  function clearPending() {
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function dOf(q) { return q.d || 1; }

  function pickQuestions(cat, n, pool, nOpts) {
    var all = QUIZ_DATA.items.filter(function (q) { return cat === 'all' || q.c === cat; });
    var want = shuffle(all.filter(function (q) { return pool.indexOf(dOf(q)) >= 0; }));
    var picked = want.slice(0, n);

    // 그 난이도 문제가 모자라면 남은 문제 중 어려운 것부터 채운다
    if (picked.length < n) {
      var rest = shuffle(all.filter(function (q) { return pool.indexOf(dOf(q)) < 0; }));
      rest.sort(function (a, b) { return dOf(b) - dOf(a); });
      picked = picked.concat(rest.slice(0, n - picked.length));
    }

    return picked.map(function (q) {
      var opts = q.a.map(function (text, i) { return { text: text, ok: i === q.k }; });

      // 보기 수를 줄일 때는 정답 하나에 오답을 필요한 만큼만 남긴다
      if (nOpts && nOpts < opts.length) {
        var right = opts.filter(function (o) { return o.ok; })[0];
        var wrongs = shuffle(opts.filter(function (o) { return !o.ok; })).slice(0, nOpts - 1);
        opts = [right].concat(wrongs);
      }
      shuffle(opts);

      return {
        c: q.c, q: q.q, d: dOf(q),
        options: opts.map(function (o) { return o.text; }),
        answer: opts.findIndex(function (o) { return o.ok; })
      };
    });
  }

  function newGame(level, cat) {
    var L = LEVELS[level];
    var qs = pickQuestions(cat, L.count, L.pool, L.opts);
    S = {
      day: Store.dayKey(), level: level, cat: cat,
      qs: qs, i: 0,
      picks: [],          // {choice, correct, left}
      left: L.time, done: false, elapsed: 0, review: false
    };
    persist();
  }

  /* 오답 노트에 담긴 문제로 복습 판을 짠다. 보기 순서는 새로 섞는다. */
  function buildFromNotes(notes) {
    return notes.map(function (n) {
      var opts = shuffle(n.options.slice());
      return { c: n.c, q: n.q, options: opts, answer: opts.indexOf(n.a) };
    }).filter(function (q) { return q.answer >= 0; });
  }

  function newReview(notes) {
    var qs = buildFromNotes(notes).slice(0, 20);
    if (!qs.length) { UI.toast('다시 풀 문제가 없습니다.'); return false; }
    S = {
      day: Store.dayKey(), level: 'easy', cat: 'review',
      qs: qs, i: 0, picks: [], left: LEVELS.easy.time, done: false, elapsed: 0, review: true
    };
    persist();
    return true;
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('quiz', {
      day: S.day, level: S.level, cat: S.cat, qs: S.qs, i: S.i,
      picks: S.picks, elapsed: S.elapsed, review: S.review
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: s.level, cat: s.cat, qs: s.qs, i: s.i, picks: s.picks,
      left: (LEVELS[s.level] || LEVELS.easy).time, elapsed: s.elapsed || 0, done: false, review: !!s.review
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('quiz');
    var best = Store.bestEver('quiz');
    var wrong = Store.getWrong();

    root.innerHTML =
      '<section class="intro">' +
        '<div class="intro__mark">상</div>' +
        '<h2 class="intro__title">상식 퀴즈</h2>' +
        '<p class="intro__desc">보기 가운데 하나를 고릅니다.<br>빨리 맞힐수록 점수가 높습니다.<br><small>1단계는 보기가 둘뿐이고 시간도 넉넉합니다.<br>단계가 오를수록 문제가 어렵고 시간이 짧아집니다.</small></p>' +
        (best ? '<p class="intro__best">나의 최고 기록 <b>' + UI.comma(best.score) + '점</b></p>' : '') +
        (sess ? '<button class="btn btn--accent btn--big" id="qzResume">이어서 하기 <small>' + (sess.i + 1) + '번 문제부터' + (sess.review ? ' · 복습' : '') + '</small></button>' : '') +
        (wrong.length
          ? '<button class="btn btn--big btn--note" id="qzReview">틀린 문제만 다시 풀기 ' +
            '<small>오답 노트 ' + wrong.length + '문제' + (wrong.length > 20 ? ' 중 20문제' : '') + ' · 점수는 기록되지 않습니다</small></button>'
          : '') +
        '<h3 class="intro__sub">분야 고르기</h3>' +
        '<div class="chips" id="qzCats">' +
          QUIZ_DATA.categories.map(function (c, i) {
            return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" data-cat="' + c.id + '">' + c.name + '</button>';
          }).join('') +
        '</div>' +
        '<h3 class="intro__sub">난이도 고르기</h3>' +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + L.step + '단계</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? '난이도 보너스 +' + L.bonus : '기본') + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        '<button class="linkbtn" id="qzRules">점수 규칙 보기</button>' +
        (wrong.length ? '<button class="linkbtn" id="qzClearNote">오답 노트 비우기</button>' : '') +
      '</section>';

    var cat = 'all';
    root.querySelectorAll('#qzCats .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('#qzCats .chip').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        cat = b.dataset.cat;
      });
    });
    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () {
        var lv = b.dataset.level;
        var avail = QUIZ_DATA.items.filter(function (q) { return cat === 'all' || q.c === cat; }).length;
        if (avail < LEVELS[lv].count) {
          UI.toast('이 분야에는 문제가 ' + avail + '개뿐입니다. 그만큼만 출제됩니다.');
        }
        newGame(lv, cat);
        renderQuestion();
      });
    });
    var rb = root.querySelector('#qzResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    var rv = root.querySelector('#qzReview');
    if (rv) rv.addEventListener('click', function () { if (newReview(shuffle(wrong.slice()))) renderQuestion(); });
    root.querySelector('#qzRules').addEventListener('click', function () { App.showRules('quiz'); });
    var cn = root.querySelector('#qzClearNote');
    if (cn) cn.addEventListener('click', function () {
      UI.confirm('오답 노트 비우기', '모아 둔 ' + wrong.length + '문제가 모두 지워집니다. 비울까요?', function () {
        Store.clearWrong();
        UI.toast('오답 노트를 비웠습니다.');
        renderIntro();
      }, '비우기');
    });
  }

  /* ================= 화면: 문제 ================= */

  function renderQuestion() {
    if (!mounted) return;
    if (S.i >= S.qs.length) return finish();
    var q = S.qs[S.i];
    S.left = qtime();
    locked = false;

    root.innerHTML =
      '<section class="game quiz">' +
        '<div class="qz-top">' +
          '<span class="qz-count">' + (S.i + 1) + ' / ' + S.qs.length + '</span>' +
          (S.review ? '<span class="chip chip--note">복습</span>' : '') +
          '<span class="chip chip--tag">' + UI.esc(q.c) + '</span>' +
          '<span class="qz-clock" id="qzClock">' + qtime() + '</span>' +
        '</div>' +
        '<div class="qz-bar"><div class="qz-bar__fill" id="qzBar"></div></div>' +
        '<h2 class="qz-q">' + UI.esc(q.q) + '</h2>' +
        '<div class="qz-opts" id="qzOpts">' +
          q.options.map(function (o, i) {
            return '<button class="qz-opt" data-i="' + i + '"><span class="qz-opt__no">' + '①②③④'[i] + '</span>' + UI.esc(o) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="tools">' +
          '<button class="tool" id="qzQuit"><span>↺</span>그만두기</button>' +
          '<button class="tool" id="qzSwitch"><span>⇄</span>다른 게임</button>' +
        '</div>' +
      '</section>';

    els = { clock: root.querySelector('#qzClock'), bar: root.querySelector('#qzBar'), opts: root.querySelector('#qzOpts') };

    els.opts.addEventListener('click', function (e) {
      var b = e.target.closest('.qz-opt');
      if (!b || locked) return;
      answer(+b.dataset.i);
    });
    root.querySelector('#qzQuit').addEventListener('click', function () {
      UI.confirm('그만두기', '지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?', function () { finish(); }, '그만두기');
    });
    root.querySelector('#qzSwitch').addEventListener('click', function () { App.gameSwitcher('quiz'); });

    tickBar();
    startTimer();
  }

  function tickBar() {
    els.bar.style.width = (S.left / qtime() * 100) + '%';
    els.clock.textContent = S.left;
    els.clock.classList.toggle('is-urgent', S.left <= Math.max(3, Math.round(qtime() * 0.25)));
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(function () {
      if (!S || S.done || locked) return;
      S.left--; S.elapsed++;
      if (S.left <= 0) { tickBar(); answer(-1); return; }
      tickBar();
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function answer(choice) {
    locked = true;
    stopTimer();
    var q = S.qs[S.i];
    var correct = choice === q.answer;
    S.picks.push({ choice: choice, correct: correct, left: correct ? S.left : 0 });

    Array.prototype.forEach.call(els.opts.children, function (b, i) {
      if (i === q.answer) b.classList.add('is-right');
      if (i === choice && !correct) b.classList.add('is-wrong');
      b.disabled = true;
    });
    UI.beep(correct ? 'ok' : 'no');

    // 다시 맞힌 문제는 오답 노트에서 뺀다
    var cleared = correct && Store.removeWrong(q.q);

    var msg = correct ? (cleared ? '정답입니다! 오답 노트에서 지웠습니다.' : '정답입니다!')
                      : (choice === -1 ? '시간이 지났습니다.' : '아쉽습니다.');
    var badge = document.createElement('div');
    badge.className = 'qz-badge ' + (correct ? 'is-right' : 'is-wrong');
    badge.textContent = msg;
    root.querySelector('.quiz').appendChild(badge);

    persist();
    clearPending();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      if (!mounted || !S || S.done) return;    // 다른 화면으로 넘어갔으면 아무것도 하지 않는다
      S.i++;
      persist();
      if (S.i >= S.qs.length) finish();
      else renderQuestion();
    }, correct ? 900 : 1500);
  }

  /* ================= 점수 ================= */

  function score() {
    var L = LEVELS[S.level];
    var total = S.qs.length;
    var correct = S.picks.filter(function (p) { return p.correct; }).length;

    var right = Math.round(700 * correct / total);

    var speedSum = 0;
    S.picks.forEach(function (p) { if (p.correct) speedSum += p.left / qtime(); });
    var speed = Math.round(200 * speedSum / total);

    var run = 0, best = 0;
    S.picks.forEach(function (p) { run = p.correct ? run + 1 : 0; if (run > best) best = run; });
    var combo = Math.min(100, Math.max(0, best - 2) * 25);

    var answered = S.picks.length;
    var bonus = answered === total ? L.bonus : 0;

    return { right: right, speed: speed, combo: combo, bonus: bonus, total: right + speed + combo + bonus, correct: correct, count: total, streak: best };
  }

  /** 이번 판에서 틀린 문제를 오답 노트에 담는다 */
  function collectWrong() {
    var out = [];
    S.picks.forEach(function (p, i) {
      if (p.correct) return;
      var q = S.qs[i];
      if (q) out.push({ c: q.c, q: q.q, options: q.options, a: q.options[q.answer] });
    });
    Store.addWrong(out);
    return out.length;
  }

  function finish() {
    S.done = true;
    stopTimer();
    Store.clearSession('quiz');
    UI.beep('win');

    var missed = collectWrong();
    if (S.review) return finishReview(missed);

    var sc = score();
    Store.addRecord({
      game: 'quiz', score: sc.total, difficulty: LEVELS[S.level].step + '단계 ' + LEVELS[S.level].name + ' · ' + catName(S.cat),
      duration: S.elapsed,
      detail: { correct: sc.correct, count: sc.count, streak: sc.streak, cat: S.cat }
    });

    var rows = [
      { label: '정답 점수 (' + sc.correct + '/' + sc.count + '문항)', value: sc.right },
      { label: '속도 보너스', value: sc.speed },
      { label: '연속 정답 보너스 (최대 ' + sc.streak + '연속)', value: sc.combo }
    ];
    if (sc.bonus) rows.push({ label: '난이도 보너스 (' + LEVELS[S.level].name + ')', value: sc.bonus });

    UI.resultModal({
      title: '퀴즈가 끝났습니다',
      score: sc.total,
      headline: sc.correct === sc.count ? '전부 맞히셨습니다. 대단합니다!' : sc.correct + '문제를 맞히셨습니다.',
      rows: rows,
      note: missed
        ? '틀린 ' + missed + '문제를 오답 노트에 담았습니다.'
        : '연속 정답 보너스는 3연속부터 25점씩 올라가 최대 100점입니다.',
      actions: missed
        ? [
            { label: '다른 게임', onClick: function () { App.gameSwitcher('quiz'); } },
            { label: '한 판 더', onClick: function () { S = null; renderIntro(); } },
            { label: '틀린 문제만', kind: 'accent', onClick: startReviewNow }
          ]
        : [
            { label: '다른 게임', onClick: function () { App.gameSwitcher('quiz'); } },
            { label: '기록 보기', onClick: function () { App.go('records'); } },
            { label: '한 판 더', kind: 'accent', onClick: function () { S = null; renderIntro(); } }
          ]
    });
  }

  /** 오답 노트를 바로 이어서 푼다 */
  function startReviewNow() {
    var notes = shuffle(Store.getWrong().slice());
    if (!notes.length) { UI.toast('다시 풀 문제가 없습니다.'); S = null; renderIntro(); return; }
    if (newReview(notes)) renderQuestion();
  }

  function finishReview(missed) {
    var correct = S.picks.filter(function (p) { return p.correct; }).length;
    var left = Store.getWrong().length;

    UI.resultModal({
      title: '복습을 마쳤습니다',
      score: correct,
      unit: '문제',
      headline: correct + ' / ' + S.qs.length + '문제를 맞히셨습니다.' +
        (correct ? ' 맞힌 문제는 오답 노트에서 지웠습니다.' : ''),
      rows: [
        { label: '맞혀서 지운 문제', value: correct },
        { label: '오답 노트에 남은 문제', value: left, plain: true }
      ],
      note: '복습은 연습이라 점수로 기록되지 않습니다. 점수를 쌓으시려면 새 퀴즈를 풀어 주세요.',
      actions: left
        ? [
            { label: '새 퀴즈', onClick: function () { S = null; renderIntro(); } },
            { label: '다른 게임', onClick: function () { App.gameSwitcher('quiz'); } },
            { label: '남은 문제 더', kind: 'accent', onClick: startReviewNow }
          ]
        : [
            { label: '다른 게임', onClick: function () { App.gameSwitcher('quiz'); } },
            { label: '새 퀴즈', kind: 'accent', onClick: function () { S = null; renderIntro(); } }
          ]
    });
  }

  function catName(id) {
    var c = QUIZ_DATA.categories.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : '전체';
  }

  return {
    id: 'quiz', name: '상식 퀴즈', icon: '상', tagline: '아는 만큼 빨리 맞히기',
    rules: {
      title: '상식 퀴즈 점수 규칙',
      lines: [
        ['정답 점수', '최대 700점 · 맞힌 문항 수에 비례'],
        ['속도 보너스', '최대 200점 · 정답을 빨리 고를수록 높음'],
        ['난이도', '1단계 첫걸음 5문항·보기 2개·40초 / 2단계 가볍게 8문항·보기 3개·30초 / 3단계 기본 10문항·25초 / 4단계 보통 15문항·16초 / 5단계 도전 20문항·10초'],
        ['연속 정답 보너스', '최대 100점 · 3연속부터 25점씩 (3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100)'],
        ['오답 감점', '없음 — 틀려도 점수가 깎이지 않습니다'],
        ['난이도 보너스', '보통(15문항) +100점, 도전(20문항) +250점 (끝까지 풀었을 때)'],
        ['최고 점수', '기본 1,000점 / 보통 1,100점 / 도전 1,250점'],
        ['오답 노트', '틀린 문제는 자동으로 모입니다. 시작 화면의 “틀린 문제만 다시 풀기”로 복습하고, 다시 맞히면 노트에서 지워집니다'],
        ['복습 판', '연습이므로 점수로 기록되지 않습니다 (한 번에 최대 20문제)']
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderQuestion();
      else renderIntro();
    },
    unmount: function () { mounted = false; stopTimer(); clearPending(); persist(); },
    hasProgress: function () { return !!Store.getSession('quiz'); },
    levels: LEVELS,
    levelOrder: ORDER
  };
})();
