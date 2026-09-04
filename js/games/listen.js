/* 새록 — 듣고 기억하기
 * 점수: 정답 600 + 집중 300 + 연속 100 + 난이도 보너스
 *
 * 문장을 듣고(기기가 읽어 준다), 글이 사라진 뒤에 핵심 낱말을 묻는 질문에 답한다.
 * 열세 게임이 모두 '눈으로 보는' 훈련이라, 듣고 기억하는 힘(청각 주의력·작업 기억)을
 * 쓰는 게임이 하나도 없었다. 인지 훈련에서 "문장 듣고 되묻기"는 기본 항목이다.
 *
 * 읽어 주기는 기기 안의 speechSynthesis 를 쓴다 — 서버도 돈도 안 든다.
 * 다만 기기마다 있고 없고가 달라, 없으면 글로만 보여 준다 (소리 없이도 풀 수 있어야 한다).
 * 귀가 어두운 분을 위해 「다시 듣기」「글로 보기」는 언제나 누를 수 있고 점수를 깎지 않는다.
 * 대신 한 번만 듣고 맞히면 '집중 보너스'를 더 준다.
 *
 * 문장 은행은 js/data/listen-data.js (한국어). 영어·일본어 은행은 아직 없어
 * 그 말에서는 숨긴다 (langs). 은행을 만들면 'en' 'ja' 를 더하고 데이터를 갈아 끼우면 된다.
 */
window.Games = window.Games || {};
window.Games.listen = (function () {

  /* d 은행 단계 · choices 보기 수 · showText 듣는 동안 글을 함께 보여 주는가 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, count: 6,  bonus: 0,   d: 1, choices: 2, showText: true,
              note: T('짧은 한 문장 · 보기 2개 · 글도 함께') },
    step2:  { name: T('가볍게'), step: 2, count: 8,  bonus: 0,   d: 2, choices: 3, showText: true,
              note: T('한 문장 · 보기 3개 · 글도 함께') },
    easy:   { name: T('쉬움'),   step: 3, count: 8,  bonus: 0,   d: 3, choices: 3, showText: true,
              note: T('두 문장 · 보기 3개 · 글도 함께') },
    normal: { name: T('보통'),   step: 4, count: 10, bonus: 100, d: 4, choices: 4, showText: false,
              note: T('두 문장 · 숫자와 순서 · 소리만') },
    hard:   { name: T('어려움'), step: 5, count: 10, bonus: 250, d: 5, choices: 4, showText: false,
              note: T('세 문장 · 보기 4개 · 소리만') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }
  function bank() { return window.LISTEN_DATA || []; }

  /* ================= 읽어 주기 ================= */

  /** 이 기기가 읽어 줄 수 있는가 */
  function canSpeak() {
    return !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }

  /** 그 말의 목소리를 고른다 — 없으면 기본 목소리 */
  function pickVoice() {
    try {
      var want = I18N.get() === 'ja' ? 'ja' : I18N.get() === 'en' ? 'en' : 'ko';
      var vs = window.speechSynthesis.getVoices() || [];
      for (var i = 0; i < vs.length; i++) if ((vs[i].lang || '').toLowerCase().indexOf(want) === 0) return vs[i];
    } catch (e) {}
    return null;
  }

  var speaking = false;
  function speak(lines, done) {
    if (!canSpeak()) { if (done) done(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(lines.join(' '));
      u.lang = I18N.get() === 'ja' ? 'ja-JP' : I18N.get() === 'en' ? 'en-US' : 'ko-KR';
      u.rate = 0.85;                                     /* 어르신께는 천천히 */
      u.pitch = 1;
      var v = pickVoice(); if (v) u.voice = v;
      speaking = true;
      u.onend = u.onerror = function () { speaking = false; if (done) done(); };
      window.speechSynthesis.speak(u);
    } catch (e) { speaking = false; if (done) done(); }
  }
  function hush() { speaking = false; try { if (canSpeak()) window.speechSynthesis.cancel(); } catch (e) {} }

  /* ================= 문제 만들기 ================= */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** 한 판 — 그 단계의 문장을 count 개 고른다. 모자라면 이웃 단계에서 빌린다 */
  function makeSet(level, count) {
    var L = LEVELS[level] || LEVELS.easy;
    var all = bank();
    var pool = [];
    all.forEach(function (it, i) { if (it.d === L.d) pool.push(i); });
    if (pool.length < count) {
      all.forEach(function (it, i) { if (Math.abs(it.d - L.d) === 1 && pool.indexOf(i) < 0) pool.push(i); });
    }
    shuffle(pool);
    return pool.slice(0, count).map(function (idx) {
      var it = all[idx];
      /* 보기 — 정답 + 틀린 보기 앞에서 필요한 만큼, 그리고 섞는다 */
      var opts = shuffle([it.a].concat(it.x.slice(0, L.choices - 1)));
      return { i: idx, opts: opts, ans: opts.indexOf(it.a) };
    });
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      probs: makeSet(level, L.count),
      i: 0, phase: 'listen',          /* listen → answer */
      picks: [],                      /* { correct, clean } — clean: 다시 듣기·글로 보기 없이 맞힘 */
      replays: 0, peeked: false,      /* 이 문제에서 다시 들은 횟수 · 글로 봤는가 */
      elapsed: 0, done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('listen', {
      day: S.day, level: S.level, probs: S.probs, i: S.i, phase: S.phase, picks: S.picks,
      replays: S.replays, peeked: S.peeked, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      probs: s.probs, i: s.i, phase: s.phase || 'listen', picks: s.picks || [],
      replays: s.replays || 0, peeked: !!s.peeked,
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    hush();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('listen');
    var best = Store.bestEver('listen');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('듣고 기억하기') + '</h2>') +
        ('<p class="intro__desc">' + T('문장을 듣고, 무엇이었는지 기억해 답합니다.') + '<br>' +
          T('답할 때는 글이 사라지고 질문만 남습니다.') +
          '<br><small>' + (canSpeak() ? T('다시 듣기·글로 보기는 언제든 눌러도 됩니다.') : T('이 기기는 읽어 주기가 안 되어 글로 보여 드립니다.')) + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="lsResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{n}번 문제부터', { n: sess.i + 1 }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · ' + T('{n}문제', { n: L.count }) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        ('<button class="linkbtn" id="lsRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderQuestion(); });
    });
    var rb = root.querySelector('#lsResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    root.querySelector('#lsRules').addEventListener('click', function () { App.showRules('listen'); });
  }

  /* ================= 화면: 문제 ================= */

  function item() { return bank()[S.probs[S.i].i]; }

  function renderQuestion() {
    if (!mounted) return;
    if (S.i >= S.probs.length) return finish();
    var L = lv(), p = S.probs[S.i], it = item();
    locked = false;
    var right = S.picks.filter(function (x) { return x.correct; }).length;
    var listenPhase = S.phase === 'listen';
    var textOn = !canSpeak() || L.showText || S.peeked;   /* 읽어 주기가 없으면 언제나 글로 */

    root.innerHTML =
      '<section class="game listen">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('문제') + '</span><b id="lsNo">') + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('맞힘') + '</span><b id="lsRight">') + right + '</b></div>' +
        '</div>' +

        (listenPhase
          ? '<div class="sc-card ls-card">' +
              '<p class="ls-step">' + T('잘 들어 보세요') + '</p>' +
              '<div class="ls-text' + (textOn ? '' : ' is-hidden') + '" id="lsText">' +
                it.s.map(function (t) { return '<p>' + UI.esc(t) + '</p>'; }).join('') +
              '</div>' +
              (textOn ? '' : '<p class="ls-veil" id="lsVeil">' + T('소리로만 듣습니다. 글이 필요하면 「글로 보기」를 누르세요.') + '</p>') +
              '<div class="ls-btns">' +
                (canSpeak()
                  ? '<button class="btn btn--accent btn--big ls-play" id="lsPlay"><span>▶</span> ' + T('듣기') + '</button>'
                  : '') +
                (!textOn ? '<button class="btn btn--ghost" id="lsPeek">' + T('글로 보기') + '</button>' : '') +
                '<button class="btn btn--ghost ls-go" id="lsGo">' + T('다 들었어요 → 문제 풀기') + '</button>' +
              '</div>' +
            '</div>'
          : '<div class="sc-card ls-card">' +
              '<p class="ls-step">' + T('기억해 보세요') + '</p>' +
              '<p class="ls-q">' + UI.esc(it.q) + '</p>' +
              '<p class="mt-hint" id="lsMsg">' + T('답을 누르면 저절로 채점됩니다') + '</p>' +
            '</div>' +
            '<div class="pad mt-pad ls-opts" id="lsOpts">' +
              p.opts.map(function (o, i) {
                return '<button class="pad__key ls-opt" data-i="' + i + '">' + UI.esc(o) + '</button>';
              }).join('') +
            '</div>' +
            '<div class="ls-btns ls-btns--sub">' +
              (canSpeak() ? '<button class="btn btn--ghost" id="lsAgain">' + T('다시 듣기') + '</button>' : '') +
              '<button class="btn btn--ghost" id="lsShow">' + T('글로 보기') + '</button>' +
            '</div>') +

        '<div class="tools">' +
          ('<button class="tool" id="lsNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="lsQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="lsSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = { msg: root.querySelector('#lsMsg'), right: root.querySelector('#lsRight') };

    var play = root.querySelector('#lsPlay');
    if (play) play.addEventListener('click', function () {
      if (S.phase === 'listen' && play.dataset.played) S.replays++;    /* 두 번째부터는 '다시 듣기' */
      play.dataset.played = '1';
      play.classList.add('is-on');
      speak(it.s, function () { play.classList.remove('is-on'); });
      persist();
    });
    var peek = root.querySelector('#lsPeek');
    if (peek) peek.addEventListener('click', function () { S.peeked = true; persist(); renderQuestion(); });
    var go = root.querySelector('#lsGo');
    if (go) go.addEventListener('click', function () { hush(); S.phase = 'answer'; persist(); renderQuestion(); });

    var opts = root.querySelector('#lsOpts');
    if (opts) opts.addEventListener('click', function (e) {
      var k = e.target.closest('.pad__key');
      if (!k || locked) return;
      submit(parseInt(k.dataset.i, 10), k);
    });
    var again = root.querySelector('#lsAgain');
    if (again) again.addEventListener('click', function () {
      if (locked) return;
      S.replays++; persist();
      again.classList.add('is-on');
      speak(it.s, function () { again.classList.remove('is-on'); });
    });
    var show = root.querySelector('#lsShow');
    if (show) show.addEventListener('click', function () {
      if (locked) return;
      S.peeked = true; persist();
      /* 답하는 화면에서 글을 보면 잠깐 보여 주고 다시 감춘다 — 보고 답하는 것도 괜찮다 */
      UI.modal({
        title: T('들으신 문장'),
        body: '<div class="ls-text">' + it.s.map(function (t) { return '<p>' + UI.esc(t) + '</p>'; }).join('') + '</div>',
        actions: [{ label: T('닫고 답하기'), kind: 'accent' }]
      });
    });

    root.querySelector('#lsNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('listen'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#lsQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#lsSwitch').addEventListener('click', function () { App.gameSwitcher('listen'); });
  }

  function submit(idx, keyEl) {
    if (locked) return;
    locked = true;
    hush();

    var p = S.probs[S.i], it = item();
    var ok = idx === p.ans;
    var clean = ok && S.replays === 0 && !S.peeked;
    S.picks.push({ correct: ok, clean: clean });

    if (keyEl) keyEl.classList.add(ok ? 'is-good' : 'is-bad');
    els.msg.innerHTML = ok
      ? ('<b class="mt-ok">' + T('정답입니다') + '</b>')
      : ('<b class="mt-no">' + T('정답은 {t}입니다', { t: it.a }) + '</b>');
    if (ok) els.right.textContent = S.picks.filter(function (x) { return x.correct; }).length;
    UI.beep(ok ? 'ok' : 'no');

    persist();
    clearPending();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      if (!mounted || !S || S.done) return;
      S.i++; S.phase = 'listen'; S.replays = 0; S.peeked = false;
      persist();
      if (S.i >= S.probs.length) finish();
      else renderQuestion();
    }, ok ? 900 : 1800);
  }

  /* ================= 점수 ================= */

  function score() {
    var L = lv();
    var total = S.probs.length;
    var correct = Math.min(total, S.picks.filter(function (p) { return p.correct; }).length);
    var clean = Math.min(total, S.picks.filter(function (p) { return p.clean; }).length);

    var right = Math.round(600 * correct / total);
    var all = S.picks.length >= total;
    var focus = Math.round(300 * clean / total);         /* 한 번만 듣고 맞힌 만큼 */

    var run = 0, best = 0;
    S.picks.forEach(function (p) { run = p.correct ? run + 1 : 0; if (run > best) best = run; });
    var combo = Math.min(100, Math.max(0, best - 2) * 25);

    var bonus = all ? L.bonus : 0;
    return {
      right: right, focus: focus, combo: combo, bonus: bonus,
      total: right + focus + combo + bonus,
      correct: correct, clean: clean, count: total, streak: best, all: all
    };
  }

  function finish() {
    S.done = true;
    hush();
    clearPending();
    Store.clearSession('listen');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'listen', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { correct: sc.correct, clean: sc.clean, count: sc.count, streak: sc.streak }
    });

    var rows = [
      { label: T('정답 점수 ({a}/{b}문제)', { a: sc.correct, b: sc.count }), value: sc.right },
      { label: T('집중 보너스 (한 번만 듣고 맞힘 {n}문제)', { n: sc.clean }), value: sc.focus },
      { label: T('연속 정답 보너스 (최대 {n}연속)', { n: sc.streak }), value: sc.combo }
    ];
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('듣고 기억하기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('listen'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderQuestion(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderQuestion(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<path d="M4 10v4h3l4 3.5v-11L7 10z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5"/><path d="M17.5 7a7 7 0 0 1 0 10"/>',
    id: 'listen', name: T('듣고 기억하기'), tagline: T('듣고, 기억하고, 답하기'),
    langs: ['ko'],                  /* 문장 은행이 한국어뿐이다 — 은행을 만들면 'en' 'ja' 를 더한다 */
    rules: {
      title: T('듣고 기억하기 점수 규칙'),
      lines: [
        [T('푸는 법'), T('「듣기」를 누르면 기기가 문장을 읽어 줍니다. 「문제 풀기」를 누르면 글이 사라지고 질문이 나옵니다. 보기 가운데 맞는 것을 누르세요')],
        [T('난이도'), T('1단계 짧은 한 문장·보기 2개 · 2단계 한 문장·보기 3개 · 3단계 두 문장 · 4단계 두 문장에 숫자와 순서·소리만 · 5단계 세 문장·보기 4개·소리만')],
        [T('다시 듣기 · 글로 보기'), T('언제든 눌러도 되고 점수를 깎지 않습니다. 다만 한 번만 듣고 맞힌 문제에는 집중 보너스가 붙습니다')],
        [T('정답 점수'), T('최대 600점 · 맞힌 문제 수에 비례')],
        [T('집중 보너스'), T('최대 300점 · 다시 듣기나 글로 보기 없이 맞힌 문제 수에 비례')],
        [T('연속 정답 보너스'), T('최대 100점 · 3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100')],
        [T('오답 감점'), T('없음 — 틀리면 정답을 보여 주고 다음 문제로 넘어갑니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')],
        [T('읽어 주기가 안 되는 기기'), T('글로 보여 드립니다. 글을 읽고 「문제 풀기」를 누르면 똑같이 풀 수 있습니다')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (canSpeak()) { try { window.speechSynthesis.getVoices(); } catch (e) {} }  /* 목소리 목록을 미리 깨운다 */
      if (S && !S.done) renderQuestion();
      else renderIntro();
    },
    unmount: function () {
      mounted = false;
      hush(); clearPending(); persist();
    },
    hasProgress: function () { return !!Store.getSession('listen'); },
    levels: LEVELS,
    levelOrder: ORDER
  };
})();
