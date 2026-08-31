/* 새록 — 도형 세기
 * 점수: 정답 600 + 시간 300 + 연속 100 + 난이도 보너스
 *
 * 겹쳐 그려진 도형들 속에서 한 가지 도형만 골라 센다.
 * 말이 하나도 필요 없어 어느 나라에서나 그대로 통하고,
 * 그림은 코드가 그때그때 그려 내므로 문제가 마르지 않는다.
 *
 * 답은 언제나 2~9개 — 숫자 단추 하나만 누르면 바로 채점된다.
 * (숫자 계산에서 배운 대로, 확인 단추를 두지 않는다)
 */
window.Games = window.Games || {};
window.Games.shapecount = (function () {

  /* shapes 도형 수 · kinds 도형 종류 수 · minDist 중심 사이 최소 거리(작을수록 겹침) ·
     smin~smax 도형 반지름 · rot 네모도 비스듬히 놓는가 · tmax 답의 최대값 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, count: 6,  limit: 300, bonus: 0,
              shapes: 5,  kinds: 2, minDist: 26, smin: 9,  smax: 12, rot: false, tmax: 4,
              note: T('도형 5개 · 겹치지 않아요') },
    step2:  { name: T('가볍게'), step: 2, count: 8,  limit: 300, bonus: 0,
              shapes: 7,  kinds: 3, minDist: 21, smin: 8,  smax: 12, rot: false, tmax: 5,
              note: T('도형 7개 · 살짝 겹쳐요') },
    easy:   { name: T('쉬움'),   step: 3, count: 10, limit: 360, bonus: 0,
              shapes: 9,  kinds: 3, minDist: 16, smin: 7,  smax: 12, rot: false, tmax: 6,
              note: T('도형 9개 · 겹쳐 나와요') },
    normal: { name: T('보통'),   step: 4, count: 10, limit: 420, bonus: 100,
              shapes: 11, kinds: 3, minDist: 12, smin: 6,  smax: 12, rot: false, tmax: 7,
              note: T('도형 11개 · 많이 겹쳐요') },
    hard:   { name: T('어려움'), step: 5, count: 12, limit: 480, bonus: 250,
              shapes: 14, kinds: 3, minDist: 9,  smin: 5,  smax: 12, rot: true,  tmax: 9,
              note: T('도형 14개 · 비스듬히 겹쳐요') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var KINDS = ['tri', 'sq', 'cir'];
  var KNAME = {
    tri: function () { return T('세모는 몇 개일까요?'); },
    sq:  function () { return T('네모는 몇 개일까요?'); },
    cir: function () { return T('동그라미는 몇 개일까요?'); }
  };

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }
  function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  /* ================= 그림 만들기 ================= */

  /** 한 그림을 만든다 — 좌표만 남기고, 그리기는 drawScene 이 한다.
   *  { list: [{k,x,y,s,r}], target: 셀 도형, a: 답(2~9) } */
  function makeScene(L) {
    /* 어떤 도형들을 쓸지, 그중 무엇을 셀지 */
    var kinds = KINDS.slice();
    for (var i = kinds.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t;
    }
    kinds = kinds.slice(0, L.kinds);
    var target = kinds[0];

    /* 개수 나누기 — 셀 도형은 2~tmax개, 나머지 종류도 1개 이상씩 */
    var a = rnd(2, Math.min(L.tmax, L.shapes - (kinds.length - 1)));
    var counts = {}; counts[target] = a;
    var left = L.shapes - a;
    for (i = 1; i < kinds.length; i++) counts[kinds[i]] = 1, left--;
    while (left > 0) { counts[kinds[rnd(1, kinds.length - 1)]]++; left--; }

    /* 자리 잡기 — 가까이 두면 겹쳐 보인다. minDist 를 못 지키면 그냥 둔다(윗단계의 겹침) */
    var list = [];
    Object.keys(counts).forEach(function (k) {
      for (var n = 0; n < counts[k]; n++) {
        var best = null, tryN;
        for (tryN = 0; tryN < 50; tryN++) {
          var s = rnd(L.smin, L.smax);
          var p = { k: k, x: rnd(s + 3, 97 - s), y: rnd(s + 3, 73 - s), s: s,
                    r: k === 'sq' ? (L.rot ? rnd(0, 44) : 0) : rnd(0, 359) };
          var near = 999;
          for (var m = 0; m < list.length; m++) {
            var dx = list[m].x - p.x, dy = list[m].y - p.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < near) near = d;
          }
          if (!best || near > best.near) { best = p; best.near = near; }
          if (near >= L.minDist) break;
        }
        delete best.near;
        list.push(best);
      }
    });

    /* 그리는 순서를 섞는다 — 같은 종류가 뭉쳐 그려지면 세기 쉬워진다 */
    for (i = list.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return { list: list, target: target, a: a };
  }

  /** 좌표를 SVG 속살로 그린다. 색은 currentColor — 화면·인쇄가 알아서 정한다 */
  function drawScene(p) {
    return p.list.map(function (o) {
      if (o.k === 'cir') {
        return '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + o.s + '"/>';
      }
      if (o.k === 'sq') {
        return '<rect x="' + (o.x - o.s) + '" y="' + (o.y - o.s) +
          '" width="' + (o.s * 2) + '" height="' + (o.s * 2) + '"' +
          (o.r ? ' transform="rotate(' + o.r + ' ' + o.x + ' ' + o.y + ')"' : '') + '/>';
      }
      /* 세모 — 반지름 s 원에 내접, 조금씩 돌려 그린다 */
      var pts = [];
      for (var i = 0; i < 3; i++) {
        var ang = (o.r + 90 + i * 120) * Math.PI / 180;
        pts.push((o.x + Math.cos(ang) * o.s * 1.12).toFixed(1) + ',' +
                 (o.y - Math.sin(ang) * o.s * 1.12).toFixed(1));
      }
      return '<polygon points="' + pts.join(' ') + '"/>';
    }).join('');
  }

  function sceneSvg(p, cls) {
    return '<svg class="' + (cls || 'sc-svg') + '" viewBox="0 0 100 76" ' +
      'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">' +
      drawScene(p) + '</svg>';
  }

  function makeSet(level, count) {
    var L = LEVELS[level] || LEVELS.easy;
    var out = [];
    for (var i = 0; i < count; i++) out.push(makeScene(L));
    return out;
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
    Store.saveSession('shapecount', {
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
    var sess = Store.getSession('shapecount');
    var best = Store.bestEver('shapecount');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('도형 세기') + '</h2>') +
        ('<p class="intro__desc">' + T('그림 속에서 한 가지 도형만 골라 셉니다.') + '<br>' +
          T('몇 개인지 숫자를 누르면 바로 채점됩니다.') +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="scResume">' + T('이어서 하기') + ' <small>') +
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
        ('<button class="btn btn--ghost btn--print" id="scPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="scRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderQuestion(); });
    });
    var rb = root.querySelector('#scResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    root.querySelector('#scPrint').addEventListener('click', function () { Print.dialog('shapecount'); });
    root.querySelector('#scRules').addEventListener('click', function () { App.showRules('shapecount'); });
  }

  /* ================= 화면: 문제 ================= */

  function renderQuestion() {
    if (!mounted) return;
    if (S.i >= S.probs.length) return finish();
    var L = lv(), p = S.probs[S.i];
    locked = false;
    var right = S.picks.filter(function (x) { return x.correct; }).length;

    root.innerHTML =
      '<section class="game shapecount">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="scTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('문제') + '</span><b id="scNo">') + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('맞힘') + '</span><b id="scRight">') + right + '</b></div>' +
        '</div>' +

        '<div class="sc-card">' +
          sceneSvg(p) +
          ('<p class="sc-q" id="scQ">' + KNAME[p.target]() + '</p>') +
          ('<p class="mt-hint" id="scMsg">' + T('답을 누르면 저절로 채점됩니다') + '</p>') +
        '</div>' +

        /* 답은 언제나 2~9개 — 숫자 하나만 누르면 끝난다 */
        '<div class="pad mt-pad" id="scPad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
            return '<button class="pad__key" data-n="' + n + '">' + n + '</button>';
          }).join('') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="scNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="scQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="scSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#scTime'),
      msg: root.querySelector('#scMsg'),
      right: root.querySelector('#scRight'),
      pad: root.querySelector('#scPad')
    };

    els.pad.addEventListener('click', function (e) {
      var k = e.target.closest('.pad__key');
      if (!k || locked) return;
      submit(parseInt(k.dataset.n, 10), k);
    });
    root.querySelector('#scNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('shapecount'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#scQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#scSwitch').addEventListener('click', function () { App.gameSwitcher('shapecount'); });

    startTimer();
  }

  function submit(val, keyEl) {
    if (locked) return;
    locked = true;
    stopTimer();

    var p = S.probs[S.i];
    var ok = val === p.a;
    S.picks.push({ input: val, correct: ok, left: ok ? Math.max(0, lv().limit - S.elapsed) : 0 });

    if (keyEl) keyEl.classList.add(ok ? 'is-good' : 'is-bad');
    els.msg.innerHTML = ok
      ? ('<b class="mt-ok">' + T('정답입니다') + '</b>')
      : ('<b class="mt-no">' + T('정답은 {n}개입니다', { n: p.a }) + '</b>');
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
    Store.clearSession('shapecount');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'shapecount', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
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
      headline: T('도형 세기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      /* 「다음 단계」로 바로 이어 가시게 한다. 마지막 단계에서는 「한 판 더」가 초록이 된다. */
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('shapecount'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderQuestion(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderQuestion(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<circle cx="9" cy="9" r="5.5"/><rect x="10.5" y="10.5" width="9.5" height="9.5" rx="1"/><path d="M7.5 21l4.5-8 4.5 8z"/>',
    id: 'shapecount', name: T('도형 세기'), tagline: T('겹친 그림 속 도형 헤아리기'),
    rules: {
      title: T('도형 세기 점수 규칙'),
      lines: [
        [T('난이도'), T('단계가 올라갈수록 도형이 많아지고 서로 겹쳐 나옵니다 — 1단계 5개 · 2단계 7개 · 3단계 9개 · 4단계 11개 · 5단계 14개(비스듬히)')],
        [T('답 넣는 법'), T('묻는 도형이 몇 개인지 세어 숫자 단추를 누르면 바로 채점됩니다. 답은 언제나 2~9개입니다')],
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
    hasProgress: function () { return !!Store.getSession('shapecount'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 — 그림 여러 판과 답 적는 칸. 화면의 판은 건드리지 않는다 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      var items = makeSet(key, count || 6).map(function (p) {
        return { svg: sceneSvg(p, 'ps-scsvg'), q: KNAME[p.target](), a: p.a };
      });
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        items: items
      };
    }
  };
})();
