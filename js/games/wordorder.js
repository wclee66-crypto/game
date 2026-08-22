/* 새록 — 단어 순서 바로잡기
 * 점수: 정답 600 + 시간 300 + 연속 100 + 난이도 보너스
 *
 * 문제는 '글자가 뒤섞인 낱말' 그 자체다 — 기투레쓰봉 → 쓰레기봉투.
 * 종이 문제지와 똑같이 뒤섞인 낱말을 크게 보여 주고, 바른 순서로 되돌리게 한다.
 *
 * 화면에서는 손으로 쓸 수가 없으므로 글자를 눌러 빈칸을 채운다.
 * 이때 고를 글자는 낱말 글자 수의 **두 배**로 늘어놓는다(다섯 글자 낱말이면 열 글자).
 * 늘어난 절반은 낱말에 없는 글자이니 쓰지 않고 남겨 두면 된다.
 */
window.Games = window.Games || {};
window.Games.wordorder = (function () {

  /* decoy: 고를 글자를 낱말 글자 수의 몇 배로 늘어놓을지 (1 = 낱말 글자 수만큼 더 붙임) */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, count: 10, limit: 240, bonus: 0,   lens: [2],    decoy: 1,
              note: T('두 글자 낱말 · 고를 글자 4개') },
    step2:  { name: T('가볍게'), step: 2, count: 12, limit: 300, bonus: 0,   lens: [2, 3], decoy: 1,
              note: T('두세 글자 낱말 · 고를 글자 4~6개') },
    easy:   { name: T('쉬움'),   step: 3, count: 15, limit: 360, bonus: 0,   lens: [3],    decoy: 1,
              note: T('세 글자 낱말 · 고를 글자 6개') },
    normal: { name: T('보통'),   step: 4, count: 18, limit: 420, bonus: 100, lens: [3, 4], decoy: 1,
              note: T('서너 글자 낱말 · 고를 글자 6~8개') },
    hard:   { name: T('어려움'), step: 5, count: 20, limit: 480, bonus: 250, lens: [4, 5], decoy: 1,
              note: T('네다섯 글자 낱말 · 고를 글자 8~10개') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;
  var keyHandler = null;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }

  /* ================= 낱말 고르기 ================= */

  /** 글자 수별로 나눠 둔 낱말 — 처음 한 번만 만든다 */
  var byLen = null;
  /** 낱말에 없는 글자를 뽑아 쓸 낱글자 모음 */
  var syllables = null;

  function prepare() {
    if (byLen) return;
    byLen = {};
    var seen = {};
    (window.ORDER_WORDS || []).forEach(function (it) {
      var n = it.w.length;
      (byLen[n] = byLen[n] || []).push(it);
      it.w.split('').forEach(function (ch) { seen[ch] = 1; });
    });
    syllables = Object.keys(seen);
  }

  function rnd(n) { return Math.floor(Math.random() * n); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rnd(i + 1), t = arr[i];
      arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function decoysFor(word, howMany) {
    var out = [];
    var guard = 0;
    while (out.length < howMany && guard < 300) {
      guard++;
      var ch = syllables[rnd(syllables.length)];
      if (word.indexOf(ch) >= 0) continue;      // 낱말에 들어 있는 글자는 고를 글자로 못 쓴다
      if (out.indexOf(ch) >= 0) continue;
      out.push(ch);
    }
    return out;
  }

  /** 한 문제 = 뒤섞은 낱말(s) + 눌러서 고를 글자(tiles) */
  function makeProb(item, decoyRate) {
    var chars = item.w.split('');

    // 문제로 보여 줄 뒤섞은 낱말 — 우연히 정답 그대로가 되면 다시 섞는다
    var s, guard = 0;
    do { s = shuffle(chars.slice()).join(''); guard++; } while (s === item.w && guard < 40);

    // 고를 글자는 낱말 글자 + 낱말에 없는 글자를 같은 수만큼
    var extra = Math.round(item.w.length * (decoyRate == null ? 1 : decoyRate));
    var tiles = shuffle(chars.concat(decoysFor(item.w, extra)));

    return { w: item.w, h: item.h, s: s, tiles: tiles };
  }

  function makeSet(level, count) {
    prepare();
    var L = LEVELS[level];

    // 고른 길이의 낱말을 모두 모아 섞은 뒤 앞에서부터 쓴다 — 한 판에서 겹치지 않는다
    var pool = [];
    L.lens.forEach(function (n) { pool = pool.concat(byLen[n] || []); });
    pool = shuffle(pool.slice());

    var out = [];
    for (var i = 0; i < count; i++) {
      var item = pool[i % pool.length];
      out.push(makeProb(item, L.decoy));
    }
    return out;
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      probs: makeSet(level, L.count),
      i: 0, picks: [], slots: [],
      elapsed: 0, done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('wordorder', {
      day: S.day, level: S.level, probs: S.probs, i: S.i, picks: S.picks, elapsed: S.elapsed
    });
  }

  function restore(s) {
    // 예전 판에는 뒤섞은 낱말(s)이 없을 수 있다 — 그때는 지금 만들어 넣는다
    (s.probs || []).forEach(function (p) {
      if (!p.s) p.s = shuffle(p.w.split('')).join('');
    });
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      probs: s.probs, i: s.i, picks: s.picks, slots: [],
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('wordorder');
    var best = Store.bestEver('wordorder');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('단어 순서 바로잡기') + '</h2>') +
        ('<p class="intro__desc">' + T('글자가 뒤섞인 낱말을 바른 순서로 되돌립니다.') + '<br>') +
          ('<b>' + T('기투레쓰봉') + '</b> → <b>' + T('쓰레기봉투') + '</b><br>') +
          (T('아래 글자를 차례대로 눌러 빈칸을 채우세요.') + '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="woResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + (sess.i + 1) + T('번 문제부터</small></button>')
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · ' + L.count + (T('문제 · 제한') + ' ') + Math.round(L.limit / 60) + (T('분') + '</span>') +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="woPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="woRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderQuestion(); });
    });
    var rb = root.querySelector('#woResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    root.querySelector('#woPrint').addEventListener('click', function () { Print.dialog('wordorder'); });
    root.querySelector('#woRules').addEventListener('click', function () { App.showRules('wordorder'); });
  }

  /* ================= 화면: 문제 ================= */

  function renderQuestion() {
    if (!mounted) return;
    if (S.i >= S.probs.length) return finish();
    var L = lv(), p = S.probs[S.i];
    S.slots = [];
    locked = false;
    var right = S.picks.filter(function (x) { return x.correct; }).length;

    root.innerHTML =
      '<section class="game wordorder">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="woTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('문제') + '</span><b id="woNo">') + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('맞힘') + '</span><b id="woRight">') + right + '</b></div>' +
        '</div>' +

        '<div class="wo-card">' +
          ('<p class="wo-label">' + T('뒤섞인 낱말') + '</p>') +
          '<div class="wo-scr">' + UI.esc(p.s) + '</div>' +
          '<div class="wo-down" aria-hidden="true">↓</div>' +
          '<div class="wo-slots" id="woSlots">' +
            p.w.split('').map(function (_, k) {
              return '<button class="wo-slot is-empty" data-s="' + k + '"></button>';
            }).join('') +
          '</div>' +
          ('<p class="wo-msg" id="woMsg">' + T('글자를 차례대로 눌러 주세요') + '</p>') +
          ('<button class="wo-hintbtn" id="woHint">' + T('힌트 보기') + '</button>') +
        '</div>' +

        '<div class="wo-tiles" id="woTiles">' +
          p.tiles.map(function (ch, k) {
            return '<button class="wo-tile" data-t="' + k + '">' + UI.esc(ch) + '</button>';
          }).join('') +
        '</div>' +

        '<div class="row2 wo-acts">' +
          ('<button class="btn btn--ghost" id="woBack">' + T('한 글자 지우기') + '</button>') +
          ('<button class="btn btn--accent" id="woOk">' + T('확인') + '</button>') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="woQuit"><span>↺</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="woSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#woTime'),
      msg: root.querySelector('#woMsg'),
      right: root.querySelector('#woRight'),
      slots: root.querySelector('#woSlots'),
      tiles: root.querySelector('#woTiles')
    };

    els.tiles.addEventListener('click', function (e) {
      var t = e.target.closest('.wo-tile');
      if (!t || locked) return;
      place(+t.dataset.t);
    });
    els.slots.addEventListener('click', function (e) {
      var s = e.target.closest('.wo-slot');
      if (!s || locked) return;
      pull(+s.dataset.s);
    });
    root.querySelector('#woHint').addEventListener('click', function () {
      // 뜻을 몰라 막힐 때만 쓰는 도움말 — 점수와는 상관이 없다
      this.outerHTML = ('<p class="wo-hint"><span>' + T('힌트') + '</span>') + UI.esc(p.h) + '</p>';
    });
    root.querySelector('#woBack').addEventListener('click', function () { if (!locked) back(); });
    root.querySelector('#woOk').addEventListener('click', function () { if (!locked) submit(); });
    root.querySelector('#woQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#woSwitch').addEventListener('click', function () { App.gameSwitcher('wordorder'); });

    paint();
    startTimer();
  }

  /** 글자 하나를 빈칸에 넣는다 */
  function place(tileIndex) {
    var p = S.probs[S.i];
    if (S.slots.indexOf(tileIndex) >= 0) return;      // 이미 넣은 글자
    if (S.slots.length >= p.w.length) { UI.toast(T('빈칸이 다 찼습니다. 확인을 누르세요.')); return; }
    S.slots.push(tileIndex);
    paint();
  }

  /** 빈칸을 눌러 그 자리의 글자를 도로 뺀다 */
  function pull(slotIndex) {
    if (slotIndex >= S.slots.length) return;
    S.slots.splice(slotIndex, 1);
    paint();
  }

  function back() {
    if (!S.slots.length) return;
    S.slots.pop();
    paint();
  }

  function paint() {
    var p = S.probs[S.i];
    var full = S.slots.length === p.w.length;

    els.slots.querySelectorAll('.wo-slot').forEach(function (el, k) {
      var t = S.slots[k];
      el.textContent = t == null ? '' : p.tiles[t];
      el.classList.toggle('is-empty', t == null);
      el.classList.toggle('is-next', t == null && k === S.slots.length);
    });
    els.tiles.querySelectorAll('.wo-tile').forEach(function (el, k) {
      el.classList.toggle('is-used', S.slots.indexOf(k) >= 0);
    });
    if (!locked) {
      els.msg.textContent = full ? T('다 채우셨습니다. 확인을 누르세요.') : T('글자를 차례대로 눌러 주세요');
      els.msg.className = 'wo-msg' + (full ? ' is-ready' : '');
    }
  }

  function submit() {
    var p = S.probs[S.i];
    if (S.slots.length < p.w.length) { UI.toast(T('빈칸을 모두 채워 주세요.')); return; }

    locked = true;
    stopTimer();

    var made = S.slots.map(function (t) { return p.tiles[t]; }).join('');
    var ok = made === p.w;
    S.picks.push({ made: made, correct: ok });

    els.slots.querySelectorAll('.wo-slot').forEach(function (el, k) {
      el.classList.add(ok ? 'is-right' : 'is-wrong');
      if (!ok) el.textContent = p.w[k];              // 틀리면 바른 순서를 보여 준다
    });
    els.msg.className = 'wo-msg ' + (ok ? 'is-ok' : 'is-no');
    els.msg.innerHTML = ok
      ? T('<b>잘하셨습니다!</b>')
      : ('<b>' + T('바른 낱말은') + ' ') + UI.esc(p.w) + (T('입니다') + '</b>');
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
    }, ok ? 800 : 1800);
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
    Store.clearSession('wordorder');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'wordorder', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
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
      title: T('단어 순서를 마쳤습니다'),
      score: sc.total,
      headline: sc.correct === sc.count ? T('전부 맞히셨습니다. 대단합니다!') : T('{n}낱말을 바로잡으셨습니다.', { n: sc.correct }),
      rows: rows,
      note: sc.all ? '' : T('끝까지 풀어야 시간 보너스와 난이도 보너스를 받습니다.'),
      actions: [
        { label: T('다른 게임'), onClick: function () { App.gameSwitcher('wordorder'); } },
        { label: T('기록 보기'), onClick: function () { App.go('records'); } },
        { label: T('한 판 더'), kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
    });
  }

  /* ================= 자판 입력 (PC) ================= */

  function bindKeys() {
    keyHandler = function (e) {
      if (!mounted || !S || S.done || locked) return;
      if (!els.slots) return;
      if (e.key === 'Backspace') { back(); e.preventDefault(); }
      else if (e.key === 'Enter') { submit(); e.preventDefault(); }
    };
    document.addEventListener('keydown', keyHandler);
  }
  function unbindKeys() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  return {
    langs: ['ko'],                                 // 한글 글자를 뒤섞는 놀이다
    art: '<path d="M3 7h5v5H3zM10 7h5v5h-5zM17 7h4v5h-4z"/><path d="M4 17h13"/><path d="M14 14.5 17 17l-3 2.5"/>',
    id: 'wordorder', name: T('단어 순서'), tagline: T('뒤섞인 글자를 바로잡기'),
    rules: {
      title: T('단어 순서 바로잡기 점수 규칙'),
      lines: [
        [T('푸는 법'), T('뒤섞인 낱말을 보고, 아래 글자를 차례대로 눌러 빈칸을 채웁니다. 빈칸을 다시 누르면 그 글자가 빠집니다')],
        [T('난이도'), T('1단계 두 글자 · 2단계 두세 글자 · 3단계 세 글자 · 4단계 서너 글자 · 5단계 네다섯 글자')],
        [T('고를 글자'), T('낱말 글자 수의 두 배로 늘어놓습니다(다섯 글자 낱말이면 열 글자). 절반은 낱말에 없는 글자이니 남겨 두면 됩니다')],
        [T('힌트'), T('「힌트 보기」를 누르면 낱말의 뜻을 한 줄 보여 줍니다. 점수는 깎이지 않습니다')],
        [T('정답 점수'), T('최대 600점 · 맞힌 문제 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('연속 정답 보너스'), T('최대 100점 · 3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100')],
        [T('오답 감점'), T('없음 — 틀리면 바른 낱말을 보여 주고 다음 문제로 넘어갑니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')],
        [T('자판'), T('PC에서는 Backspace 한 글자 지우기, Enter 확인')]
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
    hasProgress: function () { return !!Store.getSession('wordorder'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 문제 모음 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        items: makeSet(key, count || 12)
      };
    }
  };
})();
