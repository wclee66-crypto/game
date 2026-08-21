/* 새록 — 산수
 * 점수: 정답 600 + 시간 300 + 연속 100 + 난이도 보너스
 *
 * 답은 보기에서 고르지 않고 숫자판으로 직접 넣는다.
 * 눈으로 고르는 것보다 머릿속에서 꺼내 쓰는 편이 훈련이 되기 때문이다.
 */
window.Games = window.Games || {};
window.Games.math = (function () {

  var LEVELS = {
    step1:  { name: '첫걸음', step: 1, count: 10, limit: 300, bonus: 0,   kind: 'a1',
              note: '한 자리 더하기 · 답이 10 이하' },
    step2:  { name: '가볍게', step: 2, count: 12, limit: 300, bonus: 0,   kind: 'a2',
              note: '한 자리 더하기와 빼기' },
    easy:   { name: '쉬움',   step: 3, count: 15, limit: 360, bonus: 0,   kind: 'a3',
              note: '두 자리 ± 한 자리 · 받아올림 없음' },
    normal: { name: '보통',   step: 4, count: 18, limit: 420, bonus: 100, kind: 'a4',
              note: '두 자리 ± 두 자리 · 받아올림 있음' },
    hard:   { name: '어려움', step: 5, count: 20, limit: 480, bonus: 250, kind: 'a5',
              note: '두 자리 계산 + 세 수 이어 계산' }
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

  function makeOne(kind) {
    var a, b, c;
    switch (kind) {
      case 'a1':                                   // 한 자리 더하기, 답 10 이하
        a = rnd(1, 8);
        b = rnd(1, 9 - a + 1);
        return { q: a + ' + ' + b, a: a + b };

      case 'a2':                                   // 한 자리 더하기·빼기
        if (Math.random() < 0.5) {
          a = rnd(2, 9); b = rnd(1, 9);
          return { q: a + ' + ' + b, a: a + b };
        }
        a = rnd(3, 9); b = rnd(1, a - 1);
        return { q: a + ' − ' + b, a: a - b };

      case 'a3':                                   // 두 자리 ± 한 자리, 받아올림·받아내림 없음
        if (Math.random() < 0.5) {
          a = rnd(11, 89);
          if (a % 10 === 9) a -= 1;
          b = rnd(1, 9 - (a % 10));
          return { q: a + ' + ' + b, a: a + b };
        }
        a = rnd(21, 99);
        if (a % 10 === 0) a += 1;
        b = rnd(1, a % 10);
        return { q: a + ' − ' + b, a: a - b };

      case 'a4':                                   // 두 자리 ± 두 자리, 받아올림·받아내림 있음
        if (Math.random() < 0.5) {
          for (var t = 0; t < 60; t++) {
            a = rnd(12, 79); b = rnd(12, 99 - a);
            if (b >= 10 && (a % 10) + (b % 10) > 9) return { q: a + ' + ' + b, a: a + b };
          }
          a = rnd(15, 60); b = rnd(15, 39);
          return { q: a + ' + ' + b, a: a + b };
        }
        for (var t2 = 0; t2 < 60; t2++) {
          a = rnd(21, 99); b = rnd(10, a - 1);
          if ((a % 10) < (b % 10)) return { q: a + ' − ' + b, a: a - b };
        }
        a = rnd(41, 99); b = rnd(10, a - 10);
        return { q: a + ' − ' + b, a: a - b };

      case 'a5':                                   // 두 자리 계산 + 세 수 이어 계산
        if (Math.random() < 0.45) return makeOne('a4');
        if (Math.random() < 0.5) {
          a = rnd(11, 59); b = rnd(11, 40); c = rnd(5, a + b - 1);
          return { q: a + ' + ' + b + ' − ' + c, a: a + b - c };
        }
        a = rnd(31, 99); b = rnd(10, a - 5); c = rnd(5, 40);
        return { q: a + ' − ' + b + ' + ' + c, a: a - b + c };
    }
    return { q: '1 + 1', a: 2 };
  }

  function makeSet(level, count) {
    var kind = LEVELS[level].kind;
    var out = [], seen = {};
    for (var i = 0; i < count; i++) {
      var p, guard = 0;
      do { p = makeOne(kind); guard++; } while (seen[p.q] && guard < 40);
      seen[p.q] = 1;
      out.push(p);
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
        '<div class="intro__mark">산</div>' +
        '<h2 class="intro__title">산수</h2>' +
        '<p class="intro__desc">더하기와 빼기를 암산으로 풉니다.<br>답은 숫자판을 눌러 직접 넣습니다.<br><small>틀려도 점수가 깎이지 않습니다.</small></p>' +
        (best ? '<p class="intro__best">나의 최고 기록 <b>' + UI.comma(best.score) + '점</b></p>' : '') +
        (sess && LEVELS[sess.level]
          ? '<button class="btn btn--accent btn--big" id="mtResume">이어서 하기 <small>' +
            LEVELS[sess.level].name + ' · ' + (sess.i + 1) + '번 문제부터</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + L.step + '단계</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · ' + L.count + '문제 · 제한 ' + Math.round(L.limit / 60) + '분</span>' +
              '<span class="level__bonus">' + (L.bonus ? '난이도 보너스 +' + L.bonus : '기본') + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        '<button class="btn btn--ghost btn--print" id="mtPrint">종이로 풀 문제 만들기 <small>A4 인쇄 · PDF 저장</small></button>' +
        '<button class="linkbtn" id="mtRules">점수 규칙 보기</button>' +
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
          '<div class="hud__item"><span class="hud__lbl">난이도</span><b>' + L.name + '</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">남은 시간</span><b id="mtTime">0:00</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">문제</span><b id="mtNo">' + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">맞힘</span><b id="mtRight">' + right + '</b></div>' +
        '</div>' +

        '<div class="mt-card">' +
          '<div class="mt-q"><span class="mt-expr">' + p.q + '</span><span class="mt-eq">=</span>' +
            '<span class="mt-ans" id="mtAns"></span></div>' +
          '<p class="mt-hint" id="mtMsg">답을 누른 뒤 <b>확인</b>을 누르세요</p>' +
        '</div>' +

        '<div class="pad mt-pad" id="mtPad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
            return '<button class="pad__key" data-n="' + n + '">' + n + '</button>';
          }).join('') +
          '<button class="pad__key pad__key--fn" data-act="back">지우기</button>' +
          '<button class="pad__key" data-n="0">0</button>' +
          '<button class="pad__key pad__key--ok" data-act="ok">확인</button>' +
        '</div>' +

        '<div class="tools">' +
          '<button class="tool" id="mtQuit"><span>↺</span>그만두기</button>' +
          '<button class="tool" id="mtSwitch"><span>⇄</span>다른 게임</button>' +
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
    root.querySelector('#mtQuit').addEventListener('click', function () {
      UI.confirm('그만두기', '지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?', function () { finish(); }, '그만두기');
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
    if (!S.input) { UI.toast('답을 먼저 눌러 주세요.'); return; }
    locked = true;
    stopTimer();

    var p = S.probs[S.i];
    var val = parseInt(S.input, 10);
    var ok = val === p.a;
    S.picks.push({ input: val, correct: ok, left: ok ? Math.max(0, lv().limit - S.elapsed) : 0 });

    els.ans.classList.add(ok ? 'is-right' : 'is-wrong');
    els.msg.innerHTML = ok
      ? '<b class="mt-ok">잘하셨습니다!</b>'
      : '<b class="mt-no">정답은 ' + p.a + '입니다</b>';
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
    var correct = S.picks.filter(function (p) { return p.correct; }).length;

    var right = Math.round(600 * correct / total);
    var all = S.picks.length === total;
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
      game: 'math', score: sc.total, difficulty: L.step + '단계 ' + L.name,
      duration: S.elapsed,
      detail: { correct: sc.correct, count: sc.count, streak: sc.streak }
    });

    var rows = [
      { label: '정답 점수 (' + sc.correct + '/' + sc.count + '문제)', value: sc.right }
    ];
    if (sc.all) rows.push({ label: '시간 보너스 (' + UI.fmtTime(Math.max(0, L.limit - S.elapsed)) + ' 남김)', value: sc.time });
    rows.push({ label: '연속 정답 보너스 (최대 ' + sc.streak + '연속)', value: sc.combo });
    if (sc.bonus) rows.push({ label: '난이도 보너스 (' + L.name + ')', value: sc.bonus });

    UI.resultModal({
      title: '산수를 마쳤습니다',
      score: sc.total,
      headline: sc.correct === sc.count ? '전부 맞히셨습니다. 대단합니다!' : sc.correct + '문제를 맞히셨습니다.',
      rows: rows,
      note: sc.all ? '' : '끝까지 풀어야 시간 보너스와 난이도 보너스를 받습니다.',
      actions: [
        { label: '다른 게임', onClick: function () { App.gameSwitcher('math'); } },
        { label: '기록 보기', onClick: function () { App.go('records'); } },
        { label: '한 판 더', kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
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
    id: 'math', name: '산수', icon: '산',
    rules: {
      title: '산수 점수 규칙',
      lines: [
        ['난이도', '1단계 한 자리 더하기 · 2단계 한 자리 더하기·빼기 · 3단계 두 자리 ± 한 자리(받아올림 없음) · 4단계 두 자리 ± 두 자리 · 5단계 세 수 이어 계산'],
        ['정답 점수', '최대 600점 · 맞힌 문제 수에 비례'],
        ['시간 보너스', '최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례'],
        ['연속 정답 보너스', '최대 100점 · 3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100'],
        ['오답 감점', '없음 — 틀리면 정답을 보여 주고 다음 문제로 넘어갑니다'],
        ['난이도 보너스', '보통 +100점, 어려움 +250점 (끝까지 풀었을 때)'],
        ['최고 점수', '1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점'],
        ['자판', 'PC에서는 숫자 키로 입력, Backspace 지우기, Enter 확인']
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
        level: key, levelName: L.step + '단계 ' + L.name,
        note: L.note,
        items: makeSet(key, count || 24)
      };
    }
  };
})();
