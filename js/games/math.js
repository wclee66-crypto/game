/* 새록 — 숫자 계산
 * 점수: 정답 600 + 시간 300 + 연속 100 + 난이도 보너스
 *
 * 답은 보기에서 고르지 않고 숫자판으로 직접 넣는다.
 * 눈으로 고르는 것보다 머릿속에서 꺼내 쓰는 편이 훈련이 되기 때문이다.
 *
 * 2026-08-28 에 곱하기·나누기를 전부 뺐다. 이 게임을 찾는 분들께는
 * 쉬운 곱셈도 벽이라, 어렵게 하는 것은 자릿수로만 한다.
 * 더하고 빼는 수는 언제나 2 이상이다 — 1을 더하고 빼는 것은 훈련이 안 된다.
 */
window.Games = window.Games || {};
window.Games.math = (function () {

  /* kinds — 한 판에 섞여 나올 문제 모양들.
     한 가지만 되풀이하면 금세 지루해지므로 단계마다 서너 가지를 섞는다.
     같은 모양이 여러 번 적힌 것은 그만큼 자주 나오라는 뜻이다. */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, count: 10, limit: 300, bonus: 0,
              kinds: ['add1', 'add1', 'sub1e'],
              note: T('한 자리 더하기와 빼기 · 답이 10 이하') },
    step2:  { name: T('가볍게'), step: 2, count: 12, limit: 300, bonus: 0,
              kinds: ['add1b', 'sub1', 'blank1'],
              note: T('한 자리 더하기와 빼기 · 빈칸 채우기') },
    easy:   { name: T('쉬움'),   step: 3, count: 15, limit: 360, bonus: 0,
              kinds: ['add2s', 'sub2s', 'blank2'],
              note: T('두 자리 ± 한 자리 · 빈칸 채우기') },
    normal: { name: T('보통'),   step: 4, count: 18, limit: 420, bonus: 100,
              kinds: ['add2', 'sub2', 'blank3', 'blankm'],
              note: T('두 자리 ± 두 자리 · 빈칸 채우기') },
    hard:   { name: T('어려움'), step: 5, count: 20, limit: 480, bonus: 250,
              kinds: ['add3', 'sub3', 'chain', 'blankm'],
              note: T('세 자리 더하기와 빼기 · 세 수 이어 계산') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;
  var keyHandler = null;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }

  /* ================= 문제 만들기 ================= */

  function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  /** 한 문제를 만든다. { q: 보여 줄 식, a: 답, noeq: 뒤에 = 를 붙이지 않음 }
   *  더하고 빼는 수는 언제나 2 이상이다. 곱하기·나누기는 내지 않는다. */
  function makeOne(kind) {
    var a, b, c, t, ones, tens;
    switch (kind) {
      case 'add1':                                 // 한 자리 더하기, 답 10 이하
        a = rnd(2, 8); b = rnd(2, 10 - a);
        return { q: a + ' + ' + b, a: a + b };

      case 'sub1e':                                // 10 이하에서 빼기
        a = rnd(5, 10); b = rnd(2, a - 2);
        return { q: a + ' − ' + b, a: a - b };

      case 'add1b':                                // 한 자리 더하기 (받아올림 있음)
        a = rnd(2, 9); b = rnd(2, 9);
        return { q: a + ' + ' + b, a: a + b };

      case 'sub1':                                 // 한 자리 빼기
        a = rnd(5, 9); b = rnd(2, a - 2);
        return { q: a + ' − ' + b, a: a - b };

      case 'blank1':                               // 3 + □ = 7
        a = rnd(2, 7); b = rnd(2, 10 - a);
        return { q: a + ' + □ = ' + (a + b), a: b, noeq: true };

      case 'add2s':                                // 두 자리 + 한 자리, 받아올림 없음
        ones = rnd(0, 7); tens = rnd(1, 8);
        a = tens * 10 + ones; b = rnd(2, 9 - ones);
        return { q: a + ' + ' + b, a: a + b };

      case 'sub2s':                                // 두 자리 − 한 자리, 받아내림 없음
        ones = rnd(2, 9); tens = rnd(2, 9);
        a = tens * 10 + ones; b = rnd(2, ones);
        return { q: a + ' − ' + b, a: a - b };

      case 'blank2':                               // 두 자리 + □ = 두 자리 (받아올림 없음)
        ones = rnd(0, 7); tens = rnd(1, 8);
        a = tens * 10 + ones; b = rnd(2, 9 - ones);
        return { q: a + ' + □ = ' + (a + b), a: b, noeq: true };

      case 'add2':                                 // 두 자리 + 두 자리, 받아올림 있음
        for (t = 0; t < 60; t++) {
          a = rnd(12, 79); b = rnd(12, 99 - a);
          if ((a % 10) + (b % 10) > 9) return { q: a + ' + ' + b, a: a + b };
        }
        a = rnd(15, 60); b = rnd(15, 39);
        return { q: a + ' + ' + b, a: a + b };

      case 'sub2':                                 // 두 자리 − 두 자리, 받아내림 있음
        for (t = 0; t < 60; t++) {
          a = rnd(21, 99); b = rnd(10, a - 2);
          if ((a % 10) < (b % 10)) return { q: a + ' − ' + b, a: a - b };
        }
        a = rnd(41, 99); b = rnd(10, a - 10);
        return { q: a + ' − ' + b, a: a - b };

      case 'blank3':                               // □ + 27 = 61
        b = rnd(11, 49); c = rnd(b + 11, 99);
        return { q: '□ + ' + b + ' = ' + c, a: c - b, noeq: true };

      case 'blankm':                               // 72 − □ = 45
        a = rnd(31, 99); b = rnd(11, a - 11);
        return { q: a + ' − □ = ' + (a - b), a: b, noeq: true };

      case 'add3':                                 // 세 자리 더하기 (10 단위로 떨어져 암산할 만하다)
        a = rnd(11, 49) * 10; b = rnd(11, 49) * 10;
        return { q: a + ' + ' + b, a: a + b };

      case 'sub3':                                 // 세 자리 빼기
        a = rnd(31, 90) * 10; b = rnd(11, 29) * 10;
        return { q: a + ' − ' + b, a: a - b };

      case 'chain':                                // 세 수 이어 계산
        if (Math.random() < 0.5) {
          a = rnd(11, 59); b = rnd(11, 40); c = rnd(5, a + b - 2);
          return { q: a + ' + ' + b + ' − ' + c, a: a + b - c };
        }
        a = rnd(31, 99); b = rnd(10, a - 5); c = rnd(5, 40);
        return { q: a + ' − ' + b + ' + ' + c, a: a - b + c };
    }
    return { q: '2 + 2', a: 4 };
  }

  /** 한 판에 낼 문제를 모두 만든다.
   *  모양이 고르게 섞이도록 목록을 돌아가며 쓰고, 그 순서를 다시 섞는다. */
  function makeSet(level, count) {
    var L = LEVELS[level] || LEVELS.easy;
    var kinds = L.kinds || [L.kind || 'add1'];
    var out = [], seen = {}, i, k;
    for (i = 0; i < count; i++) {
      k = kinds[i % kinds.length];
      var p, guard = 0;
      do { p = makeOne(k); guard++; } while (seen[p.q] && guard < 40);
      seen[p.q] = 1;
      out.push(p);
    }
    /* 같은 모양이 줄줄이 나오지 않도록 자리를 섞는다 */
    for (i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      probs: makeSet(level, L.count),
      i: 0, picks: [], input: '',
      elapsed: 0, done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('math', {
      day: S.day, level: S.level, probs: S.probs, i: S.i, picks: S.picks, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      probs: s.probs, i: s.i, picks: s.picks, input: '',
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('math');
    var best = Store.bestEver('math');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('숫자 계산') + '</h2>') +
        ('<p class="intro__desc">' + T('더하기와 빼기를 암산으로 풉니다.') + '<br>' + T('답은 숫자판을 눌러 직접 넣습니다.') + '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="mtResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{n}번 문제부터', { n: sess.i + 1 }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · ' + T('{n}문제 · 제한 {m}분', { n: L.count, m: Math.round(L.limit / 60) }) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="mtPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="mtRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderQuestion(); });
    });
    var rb = root.querySelector('#mtResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    root.querySelector('#mtPrint').addEventListener('click', function () { Print.dialog('math'); });
    root.querySelector('#mtRules').addEventListener('click', function () { App.showRules('math'); });
  }

  /* ================= 화면: 문제 ================= */

  function renderQuestion() {
    if (!mounted) return;
    if (S.i >= S.probs.length) return finish();
    var L = lv(), p = S.probs[S.i];
    S.input = '';
    locked = false;
    var right = S.picks.filter(function (x) { return x.correct; }).length;

    root.innerHTML =
      '<section class="game math">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="mtTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('문제') + '</span><b id="mtNo">') + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('맞힘') + '</span><b id="mtRight">') + right + '</b></div>' +
        '</div>' +

        /* 빈칸 문제(11 − □ = 7)는 답 상자가 □ 자리에 들어간다.
           밖에 상자를 하나 더 달면 네모가 둘이 되어 헷갈린다. */
        '<div class="mt-card">' +
          '<div class="mt-q">' +
            (p.q.indexOf('□') >= 0
              ? '<span class="mt-expr">' + p.q.split('□')[0] + '</span>' +
                '<span class="mt-ans" id="mtAns"></span>' +
                '<span class="mt-expr">' + p.q.split('□')[1] + '</span>'
              : '<span class="mt-expr">' + p.q + '</span>' +
                '<span class="mt-eq">=</span>' +
                '<span class="mt-ans" id="mtAns"></span>') +
          '</div>' +
          ('<p class="mt-hint" id="mtMsg">' + T('답을 누른 뒤') + ' <b>' + T('확인') + '</b>' + T('을 누르세요') + '</p>') +
        '</div>' +

        '<div class="pad mt-pad" id="mtPad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
            return '<button class="pad__key" data-n="' + n + '">' + n + '</button>';
          }).join('') +
          ('<button class="pad__key pad__key--fn" data-act="back">' + T('지우기') + '</button>') +
          '<button class="pad__key" data-n="0">0</button>' +
          ('<button class="pad__key pad__key--ok" data-act="ok">' + T('확인') + '</button>') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="mtNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="mtQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="mtSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#mtTime'),
      ans: root.querySelector('#mtAns'),
      msg: root.querySelector('#mtMsg'),
      right: root.querySelector('#mtRight'),
      pad: root.querySelector('#mtPad')
    };

    els.pad.addEventListener('click', function (e) {
      var k = e.target.closest('.pad__key');
      if (!k || locked) return;
      if (k.dataset.act === 'back') back();
      else if (k.dataset.act === 'ok') submit();
      else type(k.dataset.n);
    });
    root.querySelector('#mtNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('math'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#mtQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#mtSwitch').addEventListener('click', function () { App.gameSwitcher('math'); });

    paintAns();
    startTimer();
  }

  function type(d) {
    if (S.input.length >= 4) return;
    if (S.input === '' && d === '0') return;
    S.input += d;
    paintAns();
  }
  function back() { S.input = S.input.slice(0, -1); paintAns(); }

  function paintAns() {
    els.ans.textContent = S.input || '';
    els.ans.classList.toggle('is-empty', !S.input);
  }

  function submit() {
    if (!S.input) { UI.toast(T('답을 먼저 눌러 주세요.')); return; }
    locked = true;
    stopTimer();

    var p = S.probs[S.i];
    var val = parseInt(S.input, 10);
    var ok = val === p.a;
    S.picks.push({ input: val, correct: ok, left: ok ? Math.max(0, lv().limit - S.elapsed) : 0 });

    els.ans.classList.add(ok ? 'is-right' : 'is-wrong');
    els.msg.innerHTML = ok
      ? ('<b class="mt-ok">' + T('잘하셨습니다!') + '</b>')
      : ('<b class="mt-no">' + T('정답은') + ' ') + p.a + (T('입니다') + '</b>');
    if (ok) els.right.textContent = S.picks.filter(function (x) { return x.correct; }).length;
    UI.beep(ok ? 'ok' : 'no');

    persist();
    clearPending();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      if (!mounted || !S || S.done) return;
      S.i++;
      persist();
      if (S.i >= S.probs.length) finish();
      else renderQuestion();
    }, ok ? 700 : 1500);
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
    var total = S.probs.length;
    /* 안전장치 — 어떤 경우에도 정답 수가 문제 수를 넘어 점수가 부풀지 않게 한다 */
    var correct = Math.min(total, S.picks.filter(function (p) { return p.correct; }).length);

    var right = Math.round(600 * correct / total);
    var all = S.picks.length >= total;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;

    var run = 0, best = 0;
    S.picks.forEach(function (p) { run = p.correct ? run + 1 : 0; if (run > best) best = run; });
    var combo = Math.min(100, Math.max(0, best - 2) * 25);

    var bonus = all ? L.bonus : 0;
    return {
      right: right, time: time, combo: combo, bonus: bonus,
      total: right + time + combo + bonus,
      correct: correct, count: total, streak: best, all: all
    };
  }

  function finish() {
    S.done = true;
    stopTimer();
    clearPending();
    Store.clearSession('math');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'math', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { correct: sc.correct, count: sc.count, streak: sc.streak }
    });

    var rows = [
      { label: T('정답 점수 ({a}/{b}문제)', { a: sc.correct, b: sc.count }), value: sc.right }
    ];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('연속 정답 보너스 (최대 {n}연속)', { n: sc.streak }), value: sc.combo });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('숫자 계산 {n}단계 완료!', { n: L.step }),
      rows: rows,
      note: sc.all ? '' : T('끝까지 풀어야 시간 보너스와 난이도 보너스를 받습니다.'),
      /* 「다음 단계」로 바로 이어 가시게 한다. 마지막 단계에서는 「한 판 더」가 초록이 된다. */
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('math'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderQuestion(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderQuestion(); } });
        return a;
      })()
    });
  }

  /* ================= 자판 입력 (PC) ================= */

  function bindKeys() {
    keyHandler = function (e) {
      if (!mounted || !S || S.done || locked) return;
      if (!els.ans) return;
      if (e.key >= '0' && e.key <= '9') { type(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { back(); e.preventDefault(); }
      else if (e.key === 'Enter') { submit(); e.preventDefault(); }
    };
    document.addEventListener('keydown', keyHandler);
  }
  function unbindKeys() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  return {
    art: '<path d="M4 8h6M7 5v6"/><path d="M14 8h6"/><path d="M4 17h6"/><path d="M14.5 14.5l5 5M19.5 14.5l-5 5"/>',
    id: 'math', name: T('숫자 계산'), tagline: T('더하고 빼며 머리 깨우기'),
    rules: {
      title: T('숫자 계산 점수 규칙'),
      lines: [
        [T('난이도'), T('더하기와 빼기만 나옵니다 — 1단계 한 자리·답 10 이하 · 2단계 한 자리와 빈칸 채우기 · 3단계 두 자리 ± 한 자리 · 4단계 두 자리 ± 두 자리 · 5단계 세 자리와 세 수 이어 계산')],
        [T('더하고 빼는 수'), T('언제나 2 이상입니다. 1을 더하거나 빼는 문제는 내지 않습니다')],
        [T('정답 점수'), T('최대 600점 · 맞힌 문제 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('연속 정답 보너스'), T('최대 100점 · 3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100')],
        [T('오답 감점'), T('없음 — 틀리면 정답을 보여 주고 다음 문제로 넘어갑니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')],
        [T('자판'), T('PC에서는 숫자 키로 입력, Backspace 지우기, Enter 확인')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      bindKeys();
      if (S && !S.done) renderQuestion();
      else renderIntro();
    },
    unmount: function () {
      mounted = false;
      stopTimer(); clearPending(); unbindKeys(); persist();
    },
    hasProgress: function () { return !!Store.getSession('math'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 문제 모음 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        items: makeSet(key, count || 24)
      };
    }
  };
})();
