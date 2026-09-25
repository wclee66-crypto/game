/* 새록 — 규칙 찾기
 * 점수: 정답 600 + 시간 300 + 연속 100 + 난이도 보너스
 *
 * 일정하게 늘거나 줄어드는 숫자 배열 속에 빈칸이 하나 있다.
 * 앞뒤 숫자를 보고 규칙(몇씩 뛰는지)을 찾아 빈칸에 들어갈 숫자를 넣는다.
 * 예) 2, 4, □, 8, 10 → 6
 *
 * 답은 숫자판으로 직접 넣는다 (숫자 계산과 같은 방식) — 눈으로 고르지 않고
 * 머릿속에서 규칙을 이어 계산해 보는 것이 훈련이 되기 때문이다.
 */
window.Games = window.Games || {};
window.Games.numrule = (function () {

  /* len 배열 길이 · steps 몇씩 뛰는지(그중 하나를 고른다) · desc 거꾸로(줄어드는 배열)도 나오는가 ·
     max 배열의 가장 큰 수가 넘지 않을 값 · edge 빈칸이 맨 앞·맨 끝에도 올 수 있는가 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, len: 4, steps: [1, 2], desc: false, max: 10,  edge: false,
              count: 10, limit: 240, bonus: 0,
              note: T('1부터 10까지 · 1씩 또는 2씩 늘어나요') },
    step2:  { name: T('가볍게'), step: 2, len: 5, steps: [1, 2, 3], desc: false, max: 20, edge: false,
              count: 12, limit: 280, bonus: 0,
              note: T('1부터 20까지 · 조금씩 늘어나요') },
    easy:   { name: T('쉬움'),   step: 3, len: 5, steps: [2, 3, 5, 10], desc: false, max: 60, edge: false,
              count: 15, limit: 320, bonus: 0,
              note: T('2·3·5·10씩 뛰어 세기') },
    normal: { name: T('보통'),   step: 4, len: 6, steps: [2, 3, 5, 10], desc: true, max: 80, edge: true,
              count: 15, limit: 360, bonus: 100,
              note: T('늘어나거나 줄어드는 숫자') },
    hard:   { name: T('어려움'), step: 5, len: 6, steps: [2, 3, 4, 5, 10], desc: true, max: 120, edge: true,
              count: 15, limit: 420, bonus: 250,
              note: T('더 큰 숫자로 늘어나거나 줄어드는 숫자') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;
  var keyHandler = null;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }
  function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  /* ================= 문제 만들기 ================= */

  /** 한 문제 — { seq: 숫자 배열, blank: 빈칸 자리, a: 정답 } */
  function makeOne(L) {
    var d = L.steps[rnd(0, L.steps.length - 1)];
    if (L.desc && Math.random() < 0.5) d = -d;
    var len = L.len, start;
    if (d > 0) {
      start = rnd(1, Math.max(1, L.max - d * (len - 1)));
    } else {
      var minStart = 1 - d * (len - 1);          /* d 가 음수라 -d*(len-1) 은 양수다 */
      start = rnd(minStart, Math.max(minStart, L.max));
    }
    var seq = [];
    for (var i = 0; i < len; i++) seq.push(start + d * i);

    var minPos = L.edge ? 0 : 1;
    var maxPos = len - 1 - minPos;
    var blank = rnd(minPos, maxPos);
    return { seq: seq, blank: blank, a: seq[blank] };
  }
  function makeSet(level, count) {
    var L = LEVELS[level] || LEVELS.easy, out = [];
    for (var i = 0; i < count; i++) out.push(makeOne(L));
    return out;
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = { day: Store.dayKey(), level: level, probs: makeSet(level, L.count), i: 0, picks: [], input: '', elapsed: 0, done: false };
    persist();
  }
  function persist() {
    if (!S || S.done) return;
    Store.saveSession('numrule', { day: S.day, level: S.level, probs: S.probs, i: S.i, picks: S.picks, elapsed: S.elapsed });
  }
  function restore(s) {
    S = { day: s.day, level: LEVELS[s.level] ? s.level : 'easy', probs: s.probs, i: s.i, picks: s.picks, input: '', elapsed: s.elapsed || 0, done: false };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('numrule');
    var best = Store.bestEver('numrule');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('규칙 찾기') + '</h2>') +
        ('<p class="intro__desc">' + T('숫자가 일정하게 늘거나 줄어드는 규칙을 찾습니다.') + '<br>' +
          T('빈칸에 들어갈 숫자를 숫자판으로 넣으세요.') + '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="nrResume">' + T('이어서 하기') + ' <small>') +
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
        ('<button class="btn btn--ghost btn--print" id="nrPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="nrRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderQuestion(); });
    });
    var rb = root.querySelector('#nrResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    root.querySelector('#nrPrint').addEventListener('click', function () { Print.dialog('numrule'); });
    root.querySelector('#nrRules').addEventListener('click', function () { App.showRules('numrule'); });
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
      '<section class="game numrule">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="nrTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('문제') + '</span><b id="nrNo">') + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('맞힘') + '</span><b id="nrRight">') + right + '</b></div>' +
        '</div>' +

        '<div class="nr-card">' +
          '<div class="nr-seq">' +
            p.seq.map(function (v, i) {
              return i === p.blank
                ? '<span class="nr-item nr-item--blank is-empty" id="nrAns"></span>'
                : '<span class="nr-item">' + v + '</span>';
            }).join('') +
          '</div>' +
          ('<p class="mt-hint" id="nrMsg">' + T('답을 누르면 저절로 채점됩니다') + '</p>') +
        '</div>' +

        '<div class="pad mt-pad mt-pad--cont" id="nrPad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
            return '<button class="pad__key" data-n="' + n + '">' + n + '</button>';
          }).join('') +
        '</div>' +
        '<div class="pad mt-pad mt-pad--fn2 mt-pad--cont" id="nrPad2">' +
          '<button class="pad__key" data-n="0">0</button>' +
          ('<button class="pad__key pad__key--fn" data-act="back">' + T('지우기') + '</button>') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="nrNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="nrQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="nrSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#nrTime'),
      ans: root.querySelector('#nrAns'),
      msg: root.querySelector('#nrMsg'),
      right: root.querySelector('#nrRight')
    };

    function onPad(e) {
      var k = e.target.closest('.pad__key');
      if (!k || locked) return;
      if (k.dataset.act === 'back') back();
      else type(k.dataset.n);
    }
    root.querySelector('#nrPad').addEventListener('click', onPad);
    root.querySelector('#nrPad2').addEventListener('click', onPad);
    root.querySelector('#nrNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('numrule'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#nrQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#nrSwitch').addEventListener('click', function () { App.gameSwitcher('numrule'); });

    paintAns();
    startTimer();
  }

  function type(d) {
    if (S.input.length >= 4) return;
    if (S.input === '' && d === '0') return;
    S.input += d;
    paintAns();
    autoCheck();
  }
  function back() {
    clearAuto();
    S.input = S.input.slice(0, -1);
    paintAns();
    if (S.input) autoCheck();
  }

  /* 답을 누르면 확인 단추 없이 저절로 채점한다 — 숫자 계산과 같은 방식.
     정답 자릿수만큼 누르면 곧장 채점하고, 짧게 누르고 멈추면 2초 뒤에 그 답으로 채점한다
     (틀린 답이 정답보다 자릿수가 짧을 수 있어서다). 음수 정답은 없으므로 부호는 다루지 않는다. */
  var autoTimer = null;
  function clearAuto() { if (autoTimer) clearTimeout(autoTimer); autoTimer = null; }
  function autoCheck() {
    clearAuto();
    var need = String(S.probs[S.i].a).length;
    if (S.input.length >= need) { submit(); return; }
    autoTimer = setTimeout(function () {
      autoTimer = null;
      if (!mounted || !S || S.done || locked) return;
      if (S.input) submit();
    }, 2000);
  }

  function paintAns() {
    els.ans.textContent = S.input || '';
    els.ans.classList.toggle('is-empty', !S.input);
  }

  function submit() {
    if (!S.input || locked) return;
    clearAuto();
    locked = true;
    stopTimer();

    var p = S.probs[S.i];
    var val = parseInt(S.input, 10);
    var ok = val === p.a;
    S.picks.push({ input: val, correct: ok });

    els.ans.classList.add(ok ? 'is-right' : 'is-wrong');
    els.msg.innerHTML = ok
      ? ('<b class="mt-ok">' + T('정답입니다') + '</b>')
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
    }, ok ? 700 : 1600);
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
    Store.clearSession('numrule');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'numrule', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { correct: sc.correct, count: sc.count, streak: sc.streak }
    });

    var rows = [{ label: T('정답 점수 ({a}/{b}문제)', { a: sc.correct, b: sc.count }), value: sc.right }];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('연속 정답 보너스 (최대 {n}연속)', { n: sc.streak }), value: sc.combo });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('규칙 찾기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      note: sc.all ? '' : T('끝까지 풀어야 시간 보너스와 난이도 보너스를 받습니다.'),
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('numrule'); } }];
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

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/>' +
         '<path d="M17.5 9.5v5M20 9.5v5" stroke-dasharray="0 3.5" stroke-linecap="round"/>' +
         '<rect x="16" y="9" width="6" height="6" rx="1.5"/>',
    id: 'numrule', name: T('규칙 찾기'), tagline: T('숫자 배열 속 빈칸 채우기'),
    rules: {
      title: T('규칙 찾기 점수 규칙'),
      lines: [
        [T('난이도'), T('배열이 길어지고 숫자가 커집니다 — 1단계 1~2씩 · 2단계 1~3씩 · 3단계 2·3·5·10씩 · 4단계 늘거나 줄어듦 · 5단계 더 큰 수로 늘거나 줄어듦')],
        [T('하는 법'), T('숫자가 일정하게 늘거나 줄어드는 규칙을 찾아, 빈칸에 들어갈 숫자를 숫자판으로 넣습니다')],
        [T('답 넣는 법'), T('확인 단추 없이, 답을 누르면 저절로 채점됩니다')],
        [T('정답 점수'), T('최대 600점 · 맞힌 문제 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('연속 정답 보너스'), T('최대 100점 · 3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100')],
        [T('오답 감점'), T('없음 — 틀리면 정답을 보여 주고 다음 문제로 넘어갑니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')],
        [T('자판'), T('PC에서는 숫자 키로 입력하고 Backspace 로 지웁니다. 답은 저절로 채점됩니다')]
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
      stopTimer(); clearPending(); clearAuto(); unbindKeys(); persist();
    },
    hasProgress: function () { return !!Store.getSession('numrule'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 문제 모음 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        items: makeSet(key, count || 20)
      };
    }
  };
})();
