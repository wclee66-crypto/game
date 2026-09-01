/* 새록 — 시계 보기
 * 점수: 정답 600 + 시간 300 + 연속 100 + 난이도 보너스
 *
 * 바늘 시계가 가리키는 시각을 읽고, 시각 단추 가운데 맞는 것을 하나 누른다.
 * 시계 읽기는 치매 검사·훈련에서 실제로 쓰이는 대표 활동이고,
 * 시계판은 만국 공통이라 말이 거의 필요 없다. 그림은 코드가 그때그때 그린다.
 *
 * 한국어는 「3시 40분」, 영어는 「3:40」 으로 시각을 적는다.
 * 난이도는 분 단위로 조절한다 — 정각 → 30분 → 15분 → 5분 → 1분(숫자 없는 판).
 */
window.Games = window.Games || {};
window.Games.clock = (function () {

  /* stepMin 분 눈금 · choices 보기 수 · plain 숫자 없는 시계판 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, count: 6,  limit: 300, bonus: 0,
              stepMin: 60, choices: 3, plain: false,
              note: T('정각만 나와요 (3시, 7시)') },
    step2:  { name: T('가볍게'), step: 2, count: 8,  limit: 300, bonus: 0,
              stepMin: 30, choices: 3, plain: false,
              note: T('30분 단위 (3시 30분)') },
    easy:   { name: T('쉬움'),   step: 3, count: 10, limit: 360, bonus: 0,
              stepMin: 15, choices: 3, plain: false,
              note: T('15분 단위 (3시 15분)') },
    normal: { name: T('보통'),   step: 4, count: 10, limit: 420, bonus: 100,
              stepMin: 5,  choices: 4, plain: false,
              note: T('5분 단위 (3시 40분)') },
    hard:   { name: T('어려움'), step: 5, count: 12, limit: 480, bonus: 250,
              stepMin: 1,  choices: 4, plain: true,
              note: T('1분 단위 · 숫자 없는 시계판') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }
  function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  /** 시각을 그 말에 맞게 적는다 — 한국어 「3시 40분」 · 영어 「3:40」 */
  function fmt(t) {
    if (I18N.get() === 'en') return t.h + ':' + (t.m < 10 ? '0' : '') + t.m;
    return t.m ? T('{h}시 {m}분', { h: t.h, m: t.m }) : T('{h}시', { h: t.h });
  }
  function key(t) { return t.h + ':' + t.m; }

  /* ================= 문제 만들기 ================= */

  /** 한 문제 — { h, m, opts: [{h,m}...], ans: 정답 자리 } */
  function makeOne(L) {
    var h = rnd(1, 12);
    var m = (L.stepMin === 60) ? 0 : rnd(0, Math.floor(59 / L.stepMin)) * L.stepMin;
    var right = { h: h, m: m };

    /* 틀린 보기 — 헷갈릴 만한 시각들: 한 시간 어긋남 · 분이 한 눈금 어긋남 ·
       바늘을 서로 바꿔 읽은 시각. 그중에서 겹치지 않게 뽑는다 */
    var pool = [];
    pool.push({ h: h % 12 + 1, m: m });
    pool.push({ h: (h + 10) % 12 + 1, m: m });
    if (L.stepMin < 60) {
      pool.push({ h: h, m: (m + L.stepMin) % 60 });
      pool.push({ h: h, m: (m - L.stepMin + 60) % 60 });
    }
    var swapH = Math.round(m / 5); if (swapH === 0) swapH = 12;
    pool.push({ h: swapH, m: (h % 12) * 5 });

    var seen = {}; seen[key(right)] = 1;
    var wrongs = [];
    while (pool.length && wrongs.length < L.choices - 1) {
      var c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      if (L.stepMin === 60 && c.m !== 0) continue;      /* 첫걸음은 정각 보기만 */
      if (seen[key(c)]) continue;
      seen[key(c)] = 1;
      wrongs.push(c);
    }
    while (wrongs.length < L.choices - 1) {             /* 모자라면 아무 시각이나 */
      c = { h: rnd(1, 12), m: (L.stepMin === 60) ? 0 : rnd(0, Math.floor(59 / L.stepMin)) * L.stepMin };
      if (seen[key(c)]) continue;
      seen[key(c)] = 1;
      wrongs.push(c);
    }

    var opts = wrongs.concat([right]);
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = opts[i]; opts[i] = opts[j]; opts[j] = t;
    }
    return { h: h, m: m, opts: opts, ans: opts.map(key).indexOf(key(right)) };
  }

  function makeSet(level, count) {
    var L = LEVELS[level] || LEVELS.easy;
    var out = [], seen = {};
    for (var i = 0; i < count; i++) {
      var p, guard = 0;
      do { p = makeOne(L); guard++; } while (seen[p.h + ':' + p.m] && guard < 40);
      seen[p.h + ':' + p.m] = 1;
      out.push(p);
    }
    return out;
  }

  /* ================= 시계 그리기 ================= */

  /** 시계판 SVG — 색은 currentColor, 화면·인쇄가 알아서 정한다 */
  function clockSvg(p, plain, cls) {
    var out = [], i, a;
    out.push('<circle cx="50" cy="50" r="46" stroke-width="2.5"/>');
    for (i = 0; i < 60; i++) {                       /* 분 눈금 — 5분마다 굵게 */
      a = i * 6 * Math.PI / 180;
      var big = i % 5 === 0;
      var r1 = big ? 40.5 : 43;
      out.push('<line x1="' + (50 + Math.sin(a) * r1).toFixed(1) + '" y1="' + (50 - Math.cos(a) * r1).toFixed(1) +
        '" x2="' + (50 + Math.sin(a) * 45).toFixed(1) + '" y2="' + (50 - Math.cos(a) * 45).toFixed(1) +
        '" stroke-width="' + (big ? 2 : 1) + '"/>');
    }
    if (!plain) {                                    /* 1~12 숫자 */
      for (i = 1; i <= 12; i++) {
        a = i * 30 * Math.PI / 180;
        out.push('<text x="' + (50 + Math.sin(a) * 33).toFixed(1) + '" y="' + (50 - Math.cos(a) * 33 + 3.4).toFixed(1) +
          '" text-anchor="middle" font-size="9.5" font-weight="800" fill="currentColor" stroke="none">' + i + '</text>');
      }
    }
    var ha = ((p.h % 12) * 30 + p.m * 0.5) * Math.PI / 180;   /* 시침 */
    var ma = p.m * 6 * Math.PI / 180;                          /* 분침 */
    out.push('<line x1="50" y1="50" x2="' + (50 + Math.sin(ha) * 22).toFixed(1) + '" y2="' + (50 - Math.cos(ha) * 22).toFixed(1) + '" stroke-width="4.5" stroke-linecap="round"/>');
    out.push('<line x1="50" y1="50" x2="' + (50 + Math.sin(ma) * 34).toFixed(1) + '" y2="' + (50 - Math.cos(ma) * 34).toFixed(1) + '" stroke-width="2.6" stroke-linecap="round"/>');
    out.push('<circle cx="50" cy="50" r="2.6" fill="currentColor" stroke="none"/>');
    return '<svg class="' + (cls || 'ck-svg') + '" viewBox="0 0 100 100" fill="none" stroke="currentColor">' + out.join('') + '</svg>';
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      probs: makeSet(level, L.count),
      i: 0, picks: [],
      elapsed: 0, done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('clock', {
      day: S.day, level: S.level, probs: S.probs, i: S.i, picks: S.picks, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      probs: s.probs, i: s.i, picks: s.picks,
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('clock');
    var best = Store.bestEver('clock');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('시계 보기') + '</h2>') +
        ('<p class="intro__desc">' + T('바늘 시계가 가리키는 시각을 읽습니다.') + '<br>' +
          T('맞는 시각을 하나 누르면 바로 채점됩니다.') +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="ckResume">' + T('이어서 하기') + ' <small>') +
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
        ('<button class="btn btn--ghost btn--print" id="ckPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="ckRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderQuestion(); });
    });
    var rb = root.querySelector('#ckResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    root.querySelector('#ckPrint').addEventListener('click', function () { Print.dialog('clock'); });
    root.querySelector('#ckRules').addEventListener('click', function () { App.showRules('clock'); });
  }

  /* ================= 화면: 문제 ================= */

  function renderQuestion() {
    if (!mounted) return;
    if (S.i >= S.probs.length) return finish();
    var L = lv(), p = S.probs[S.i];
    locked = false;
    var right = S.picks.filter(function (x) { return x.correct; }).length;

    root.innerHTML =
      '<section class="game clock">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="ckTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('문제') + '</span><b id="ckNo">') + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('맞힘') + '</span><b id="ckRight">') + right + '</b></div>' +
        '</div>' +

        '<div class="sc-card">' +
          clockSvg(p, L.plain) +
          ('<p class="sc-q">' + (p.m ? T('몇 시 몇 분일까요?') : T('몇 시일까요?')) + '</p>') +
          ('<p class="mt-hint" id="ckMsg">' + T('답을 누르면 저절로 채점됩니다') + '</p>') +
        '</div>' +

        '<div class="pad mt-pad ck-opts" id="ckOpts">' +
          p.opts.map(function (t, i) {
            return '<button class="pad__key ck-opt" data-i="' + i + '">' + UI.esc(fmt(t)) + '</button>';
          }).join('') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="ckNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="ckQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="ckSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#ckTime'),
      msg: root.querySelector('#ckMsg'),
      right: root.querySelector('#ckRight'),
      opts: root.querySelector('#ckOpts')
    };

    els.opts.addEventListener('click', function (e) {
      var k = e.target.closest('.pad__key');
      if (!k || locked) return;
      submit(parseInt(k.dataset.i, 10), k);
    });
    root.querySelector('#ckNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('clock'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#ckQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#ckSwitch').addEventListener('click', function () { App.gameSwitcher('clock'); });

    startTimer();
  }

  function submit(idx, keyEl) {
    if (locked) return;
    locked = true;
    stopTimer();

    var p = S.probs[S.i];
    var ok = idx === p.ans;
    S.picks.push({ input: idx, correct: ok, left: ok ? Math.max(0, lv().limit - S.elapsed) : 0 });

    if (keyEl) keyEl.classList.add(ok ? 'is-good' : 'is-bad');
    els.msg.innerHTML = ok
      ? ('<b class="mt-ok">' + T('정답입니다') + '</b>')
      : ('<b class="mt-no">' + T('정답은 {t}입니다', { t: fmt(p.opts[p.ans]) }) + '</b>');
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
    Store.clearSession('clock');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'clock', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
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
      headline: T('시계 보기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      /* 「다음 단계」로 바로 이어 가시게 한다. 마지막 단계에서는 「한 판 더」가 초록이 된다. */
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('clock'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderQuestion(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderQuestion(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    id: 'clock', name: T('시계 보기'), tagline: T('바늘이 가리키는 시각 읽기'),
    rules: {
      title: T('시계 보기 점수 규칙'),
      lines: [
        [T('난이도'), T('분 눈금이 촘촘해집니다 — 1단계 정각 · 2단계 30분 · 3단계 15분 · 4단계 5분 · 5단계 1분 단위에 숫자 없는 시계판')],
        [T('답 넣는 법'), T('시각 단추 가운데 맞는 것을 하나 누르면 바로 채점됩니다')],
        [T('정답 점수'), T('최대 600점 · 맞힌 문제 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('연속 정답 보너스'), T('최대 100점 · 3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100')],
        [T('오답 감점'), T('없음 — 틀리면 정답을 보여 주고 다음 문제로 넘어갑니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderQuestion();
      else renderIntro();
    },
    unmount: function () {
      mounted = false;
      stopTimer(); clearPending(); persist();
    },
    hasProgress: function () { return !!Store.getSession('clock'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 — 시계 여섯 개와 시각 적는 칸 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      var items = makeSet(key, count || 6).map(function (p) {
        return { svg: clockSvg(p, L.plain, 'ps-cksvg'), a: fmt({ h: p.h, m: p.m }) };
      });
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        items: items
      };
    }
  };
})();
