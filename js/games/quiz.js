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
    step1:  { name: T('첫걸음'), step: 1, count: 5,  time: 40, opts: 2, bonus: 0,   pool: [1],
              note: T('5문항 · 보기 2개 · 문항당 40초 · 쉬운 문제만') },
    step2:  { name: T('가볍게'), step: 2, count: 8,  time: 30, opts: 3, bonus: 0,   pool: [1],
              note: T('8문항 · 보기 3개 · 문항당 30초 · 쉬운 문제만') },
    easy:   { name: T('기본'),   step: 3, count: 10, time: 25, opts: 4, bonus: 0,   pool: [1, 2],
              note: T('10문항 · 보기 4개 · 문항당 25초') },
    normal: { name: T('보통'),   step: 4, count: 15, time: 16, opts: 4, bonus: 100, pool: [2, 3],
              note: T('15문항 · 보기 4개 · 문항당 16초 · 보통 이상') },
    hard:   { name: T('도전'),   step: 5, count: 20, time: 10, opts: 4, bonus: 250, pool: [3],
              note: T('20문항 · 보기 4개 · 문항당 10초 · 어려운 문제만') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  function qtime() { return (LEVELS[S.level] || LEVELS.easy).time; }

  /* 문제 은행은 말에 따라 통째로 바뀐다.
     영어에서는 영어 문제 은행을 쓰고, 없으면 한국어 은행으로 돌아간다.
     (섞어 내면 한 판 안에 두 말이 나와 버린다) */
  function bank() {
    if (I18N.get() === 'en' && window.QUIZ_DATA_EN) return window.QUIZ_DATA_EN;
    return window.QUIZ_DATA;
  }

  /* 지금 말로 된 오답 노트만 본다.
     영어 사용자에게 예전에 담아 둔 한국어 문제를 보여 주면 풀 수가 없다.
     lang 이 없는 것은 영어판이 생기기 전에 담긴 것이라 한국어로 친다. */
  function myWrong() {
    var cur = I18N.get();
    return Store.getWrong().filter(function (w) { return (w.lang || 'ko') === cur; });
  }

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
    var all = bank().items.filter(function (q) { return cat === 'all' || q.c === cat; });
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
    if (!qs.length) { UI.toast(T('다시 풀 문제가 없습니다.')); return false; }
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
      picks: S.picks, elapsed: S.elapsed, review: S.review,
      lang: I18N.get()                    // 어느 말로 풀던 판인가 — 말이 바뀌면 이어서 하지 않는다
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
    if (sess && (sess.lang || 'ko') !== I18N.get()) sess = null;   // 다른 말로 풀던 판은 이어서 하지 않는다
    var best = Store.bestEver('quiz');
    var wrong = myWrong();

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('상식 퀴즈') + '</h2>') +
        ('<p class="intro__desc">' + T('보기 가운데 하나를 고릅니다.') + '<br>' + T('빨리 맞힐수록 점수가 높습니다.') + '<br><small>' + T('1단계는 보기가 둘뿐이고 시간도 넉넉합니다.') + '<br>' + T('단계가 오를수록 문제가 어렵고 시간이 짧아집니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess ? '<button class="btn btn--accent btn--big" id="qzResume">' + T('이어서 하기') +
           ' <small>' + (sess.review ? T('{n}번 문제부터 · 복습', { n: sess.i + 1 })
                                     : T('{n}번 문제부터', { n: sess.i + 1 })) + '</small></button>' : '') +
        (wrong.length
          ? ('<button class="btn btn--big btn--note" id="qzReview">' + T('틀린 문제만 다시 풀기') + ' ') +
            '<small>' + (wrong.length > 20
              ? T('오답 노트 {n}문제 중 20문제 · 점수는 기록되지 않습니다', { n: wrong.length })
              : T('오답 노트 {n}문제 · 점수는 기록되지 않습니다', { n: wrong.length })) + '</small></button>'
          : '') +
        ('<h3 class="intro__sub">' + T('분야 고르기') + '</h3>') +
        '<div class="chips" id="qzCats">' +
          bank().categories.map(function (c, i) {
            return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" data-cat="' + c.id + '">' + c.name + '</button>';
          }).join('') +
        '</div>' +
        ('<h3 class="intro__sub">' + T('난이도 고르기') + '</h3>') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        ('<button class="linkbtn" id="qzRules">' + T('점수 규칙 보기') + '</button>') +
        (wrong.length ? ('<button class="linkbtn" id="qzClearNote">' + T('오답 노트 비우기') + '</button>') : '') +
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
        var avail = bank().items.filter(function (q) { return cat === 'all' || q.c === cat; }).length;
        if (avail < LEVELS[lv].count) {
          UI.toast(T('이 분야에는 문제가 {n}개뿐입니다. 그만큼만 출제됩니다.', { n: avail }));
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
      UI.confirm(T('오답 노트 비우기'), T('모아 둔 {n}문제가 모두 지워집니다. 비울까요?', { n: wrong.length }), function () {
        Store.clearWrong(I18N.get());     // 지금 말로 된 것만 지운다
        UI.toast(T('오답 노트를 비웠습니다.'));
        renderIntro();
      }, T('비우기'));
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
          (S.review ? ('<span class="chip chip--note">' + T('복습') + '</span>') : '') +
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
          ('<button class="tool" id="qzNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="qzQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="qzSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = { clock: root.querySelector('#qzClock'), bar: root.querySelector('#qzBar'), opts: root.querySelector('#qzOpts') };

    els.opts.addEventListener('click', function (e) {
      var b = e.target.closest('.qz-opt');
      if (!b || locked) return;
      answer(+b.dataset.i);
    });
    root.querySelector('#qzNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('quiz'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#qzQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
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

    var msg = correct ? (cleared ? T('정답입니다! 오답 노트에서 지웠습니다.') : T('정답입니다!'))
                      : (choice === -1 ? T('시간이 지났습니다.') : T('아쉽습니다.'));
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
      if (q) out.push({ c: q.c, q: q.q, options: q.options, a: q.options[q.answer], lang: I18N.get() });
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
      game: 'quiz', score: sc.total,
      difficulty: T('{n}단계', { n: LEVELS[S.level].step }) + ' ' + LEVELS[S.level].name + ' · ' + catName(S.cat),
      duration: S.elapsed,
      detail: { correct: sc.correct, count: sc.count, streak: sc.streak, cat: S.cat }
    });

    var rows = [
      { label: T('정답 점수 ({a}/{b}문항)', { a: sc.correct, b: sc.count }), value: sc.right },
      { label: T('속도 보너스'), value: sc.speed },
      { label: T('연속 정답 보너스 (최대 {n}연속)', { n: sc.streak }), value: sc.combo }
    ];
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: LEVELS[S.level].name }), value: sc.bonus });

    UI.resultModal({
      title: T('퀴즈가 끝났습니다'),
      score: sc.total,
      headline: sc.correct === sc.count ? T('전부 맞히셨습니다. 대단합니다!') : T('{n}문제를 맞히셨습니다.', { n: sc.correct }),
      rows: rows,
      note: missed
        ? T('틀린 {n}문제를 오답 노트에 담았습니다.', { n: missed })
        : T('연속 정답 보너스는 3연속부터 25점씩 올라가 최대 100점입니다.'),
      actions: missed
        ? [
            { label: T('다른 게임'), onClick: function () { App.gameSwitcher('quiz'); } },
            { label: T('한 판 더'), onClick: function () { S = null; renderIntro(); } },
            { label: T('틀린 문제만'), kind: 'accent', onClick: startReviewNow }
          ]
        : [
            { label: T('다른 게임'), onClick: function () { App.gameSwitcher('quiz'); } },
            { label: T('기록 보기'), onClick: function () { App.go('records'); } },
            { label: T('한 판 더'), kind: 'accent', onClick: function () { S = null; renderIntro(); } }
          ]
    });
  }

  /** 오답 노트를 바로 이어서 푼다 */
  function startReviewNow() {
    var notes = shuffle(myWrong().slice());
    if (!notes.length) { UI.toast(T('다시 풀 문제가 없습니다.')); S = null; renderIntro(); return; }
    if (newReview(notes)) renderQuestion();
  }

  function finishReview(missed) {
    var correct = S.picks.filter(function (p) { return p.correct; }).length;
    var left = myWrong().length;

    UI.resultModal({
      title: T('복습을 마쳤습니다'),
      score: correct,
      unit: T('문제'),
      headline: correct
        ? T('{a} / {b}문제를 맞히셨습니다. 맞힌 문제는 오답 노트에서 지웠습니다.', { a: correct, b: S.qs.length })
        : T('{a} / {b}문제를 맞히셨습니다.', { a: correct, b: S.qs.length }),
      rows: [
        { label: T('맞혀서 지운 문제'), value: correct },
        { label: T('오답 노트에 남은 문제'), value: left, plain: true }
      ],
      note: T('복습은 연습이라 점수로 기록되지 않습니다. 점수를 쌓으시려면 새 퀴즈를 풀어 주세요.'),
      actions: left
        ? [
            { label: T('새 퀴즈'), onClick: function () { S = null; renderIntro(); } },
            { label: T('다른 게임'), onClick: function () { App.gameSwitcher('quiz'); } },
            { label: T('남은 문제 더'), kind: 'accent', onClick: startReviewNow }
          ]
        : [
            { label: T('다른 게임'), onClick: function () { App.gameSwitcher('quiz'); } },
            { label: T('새 퀴즈'), kind: 'accent', onClick: function () { S = null; renderIntro(); } }
          ]
    });
  }

  function catName(id) {
    var c = bank().categories.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : T('전체');
  }

  return {
    /* langs 를 적지 않는다 — 한국어·영어 문제 은행이 모두 있어 두 말에서 다 나온다.
       새 말을 더할 때는 그 말의 문제 은행을 만들고 bank() 에 한 줄 더한다. */
    art: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.2 3.4v1.4"/><circle cx="12.4" cy="17.4" r=".9" fill="currentColor" stroke="none"/>',
    id: 'quiz', name: T('상식 퀴즈'), tagline: T('아는 만큼 빨리 맞히기'),
    rules: {
      title: T('상식 퀴즈 점수 규칙'),
      lines: [
        [T('정답 점수'), T('최대 700점 · 맞힌 문항 수에 비례')],
        [T('속도 보너스'), T('최대 200점 · 정답을 빨리 고를수록 높음')],
        [T('난이도'), T('1단계 첫걸음 5문항·보기 2개·40초 / 2단계 가볍게 8문항·보기 3개·30초 / 3단계 기본 10문항·25초 / 4단계 보통 15문항·16초 / 5단계 도전 20문항·10초')],
        [T('연속 정답 보너스'), T('최대 100점 · 3연속부터 25점씩 (3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100)')],
        [T('오답 감점'), T('없음 — 틀려도 점수가 깎이지 않습니다')],
        [T('난이도 보너스'), T('보통(15문항) +100점, 도전(20문항) +250점 (끝까지 풀었을 때)')],
        [T('최고 점수'), T('기본 1,000점 / 보통 1,100점 / 도전 1,250점')],
        [T('오답 노트'), T('틀린 문제는 자동으로 모입니다. 시작 화면의 “틀린 문제만 다시 풀기”로 복습하고, 다시 맞히면 노트에서 지워집니다')],
        [T('복습 판'), T('연습이므로 점수로 기록되지 않습니다 (한 번에 최대 20문제)')]
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
