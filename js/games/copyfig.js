/* 새록 — 따라 그리기 (점 잇기)
 * 점수: 그리기 600 + 시간 300 + 정확도 100 − (힌트 50/회) + 난이도 보너스
 *
 * 왼쪽 본을 보고 오른쪽 빈 점판에 똑같이 그리는 놀이다.
 * 눈으로 본 것을 손으로 옮기는 힘(시공간 능력)을 쓰는데,
 * 이것이 치매에서 일찍 흐려지는 힘이라 검사에도 흔히 쓰인다.
 *
 * 말이 필요 없는 게임이라 문구만 바꾸면 세계 어디서나 그대로 통한다.
 *
 * 어르신을 위해 정한 것 —
 *  1) **긋는 방법을 두 가지 다 받아 준다.** 점을 누른 채 끌어도 되고,
 *     점 두 개를 차례로 눌러도 된다. 손이 떨려 끌기가 어려운 분은 두 번 누르면 되고,
 *     끄는 것이 자연스러운 분은 그대로 끌면 된다. 어느 쪽도 막지 않는다.
 *  2) **같은 선을 다시 누르면 지워진다.** 따로 지우개를 찾지 않아도 된다.
 *  3) **누르는 자리를 눈에 보이는 점보다 넓게** 잡는다. 점은 작아도 손가락은 굵다.
 *  4) **본과 그리는 곳을 나란히** 둔다. 눈을 멀리 옮기지 않고 견주어 볼 수 있어야 한다.
 *  5) 틀린 선은 빨갛게 남는다. 지우고 다시 그으면 되고 벌은 없다.
 *
 * 본 만드는 법 —
 *  점에서 점으로 걸어 다니며 선을 긋는다. 가로·세로·대각선으로만 가고,
 *  중간에 점이 있으면 몇 칸이든 건너뛸 수 있다 (긴 선도 나오게).
 *  절반은 좌우로 접어 대칭으로 만든다 — 화살표·별·집처럼 '모양다운 모양'이 나온다.
 */
window.Games = window.Games || {};
window.Games.copyfig = (function () {

  var U = 10;            /* 점과 점 사이 (그림 좌표) */

  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, n: 3, lines: 3, count: 5, limit: 300, bonus: 0,
              note: T('점 3×3 · 선 3개') },
    step2:  { name: T('가볍게'), step: 2, n: 3, lines: 4, count: 5, limit: 330, bonus: 0,
              note: T('점 3×3 · 선 4개') },
    easy:   { name: T('쉬움'),   step: 3, n: 3, lines: 6, count: 5, limit: 360, bonus: 0,
              note: T('점 3×3 · 선 6개') },
    normal: { name: T('보통'),   step: 4, n: 4, lines: 7, count: 5, limit: 420, bonus: 100,
              note: T('점 4×4 · 선 7개') },
    hard:   { name: T('어려움'), step: 5, n: 4, lines: 9, count: 5, limit: 480, bonus: 250,
              note: T('점 4×4 · 선 9개') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }

  function id(r, c) { return r * 10 + c; }
  function rowOf(i) { return Math.floor(i / 10); }
  function colOf(i) { return i % 10; }

  /** 선 하나의 이름 — 어느 쪽에서 그어도 같은 이름이 되게 */
  function key(a, b) { return a < b ? a + '-' + b : b + '-' + a; }

  /** 두 점을 곧은 선으로 이을 수 있는가 (가로·세로·대각선) */
  function joinable(a, b) {
    if (a === b) return false;
    var dr = rowOf(b) - rowOf(a), dc = colOf(b) - colOf(a);
    return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  }

  /** 선 하나를 '한 칸짜리 조각'들로 편다.
   *  긴 선을 반씩 나눠 그어도, 이어서 한 번에 그어도 같은 조각이 되게 하려는 것이다.
   *  본과 그린 것 모두 이 조각으로만 다루므로, 눈에 같으면 앱도 같다고 본다. */
  function units(a, b) {
    var r1 = rowOf(a), c1 = colOf(a), r2 = rowOf(b), c2 = colOf(b);
    var n = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    var dr = (r2 - r1) / n || 0, dc = (c2 - c1) / n || 0;
    var out = [];
    for (var k = 0; k < n; k++) {
      out.push(key(id(r1 + dr * k, c1 + dc * k), id(r1 + dr * (k + 1), c1 + dc * (k + 1))));
    }
    return out;
  }

  /** 선 목록을 조각으로 펴서 겹침 없이 모은다 */
  function toUnits(keys) {
    var set = {};
    keys.forEach(function (k) {
      var q = k.split('-').map(Number);
      units(q[0], q[1]).forEach(function (u) { set[u] = 1; });
    });
    return Object.keys(set);
  }

  /* ================= 본 만들기 ================= */

  /** 그 점에서 곧게 갈 수 있는 점들 */
  function reach(i, n) {
    var out = [];
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++) {
        var j = id(r, c);
        if (joinable(i, j)) out.push(j);
      }
    return out;
  }

  /** 좌우로 접어 대칭으로 만든다 — 화살표·별처럼 '모양다운 모양'이 나온다 */
  function mirror(set, n) {
    var out = {};
    Object.keys(set).forEach(function (k) {
      out[k] = 1;
      var p = k.split('-').map(Number);
      var m = p.map(function (i) { return id(rowOf(i), n - 1 - colOf(i)); });
      out[key(m[0], m[1])] = 1;
    });
    return out;
  }

  /** 선 want 개짜리 본을 만든다 */
  function makeFigure(n, want) {
    for (var t = 0; t < 200; t++) {
      var sym = Math.random() < 0.5;
      var need = sym ? Math.ceil(want / 2) : want;

      var set = {}, at = id(rnd(n), rnd(n)), guard = 0;
      while (Object.keys(set).length < need && guard++ < 200) {
        var opts = reach(at, n).filter(function (j) { return !set[key(at, j)]; });
        if (!opts.length) { at = id(rnd(n), rnd(n)); continue; }
        var nx = pick(opts);
        set[key(at, nx)] = 1;
        at = nx;
      }
      if (Object.keys(set).length < need) continue;

      if (sym) set = mirror(set, n);
      var keys = Object.keys(set);
      if (keys.length < Math.max(3, want - 2) || keys.length > want + 2) continue;

      /* 한 줄로만 늘어선 것은 그림이라 하기 어렵다 — 점이 몇 개나 쓰였는지 본다 */
      var dots = {};
      keys.forEach(function (k) { k.split('-').forEach(function (x) { dots[x] = 1; }); });
      if (Object.keys(dots).length < 3) continue;

      /* 조각으로 펴서 돌려준다 — 긴 선과 그 토막이 겹쳐 들어가는 일이 없어진다 */
      return toUnits(keys);
    }
    return null;
  }

  /* ================= 그리기 ================= */

  function px(i) { return colOf(i) * U; }
  function py(i) { return rowOf(i) * U; }

  function segPath(list) {
    return list.map(function (k) {
      var p = k.split('-').map(Number);
      return 'M' + px(p[0]) + ' ' + py(p[0]) + 'L' + px(p[1]) + ' ' + py(p[1]);
    }).join(' ');
  }

  /** 점판 하나를 그린다.
   *  o.lines 그릴 선 · o.bad 틀린 선 · o.sel 고른 점 · o.tap 누를 수 있게 할지 */
  function svgGrid(n, o) {
    o = o || {};
    var pad = 2.2, size = (n - 1) * U;
    var out = '<svg class="cf-svg' + (o.tap ? ' cf-svg--draw' : '') + '" viewBox="' + (-pad) + ' ' + (-pad) + ' ' +
      (size + pad * 2) + ' ' + (size + pad * 2) + '" xmlns="http://www.w3.org/2000/svg">';

    if (o.lines && o.lines.length) out += '<path class="cf-line" d="' + segPath(o.lines) + '"/>';
    if (o.bad && o.bad.length) out += '<path class="cf-line cf-line--bad" d="' + segPath(o.bad) + '"/>';

    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var i = id(r, c);
        out += '<circle class="cf-dot' + (o.sel === i ? ' is-sel' : '') +
               '" cx="' + px(i) + '" cy="' + py(i) + '" r="1.1"/>';
        /* 손가락으로 누를 자리는 눈에 보이는 점보다 훨씬 넓게 잡는다 */
        if (o.tap) out += '<circle class="cf-hit" cx="' + px(i) + '" cy="' + py(i) +
                          '" r="' + (U / 2 - 0.4) + '" data-i="' + i + '"/>';
      }
    }
    return out + '</svg>';
  }

  /* ================= 판 만들기 · 이어하기 ================= */

  function newGame(level) {
    var kk = LEVELS[level] ? level : 'easy';
    var L = LEVELS[kk];
    var list = [];
    for (var i = 0; i < L.count; i++) {
      var f = makeFigure(L.n, L.lines);
      if (f) list.push(f);
    }
    S = {
      day: Store.dayKey(), level: kk, n: L.n, list: list, at: 0,
      drawn: {}, wrong: 0, hints: 0, elapsed: 0, done: false, sel: null
    };
    S.need = list.reduce(function (t, f) { return t + f.length; }, 0);
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('copyfig', {
      day: S.day, level: S.level, n: S.n, list: S.list, at: S.at,
      drawn: S.drawn, need: S.need, wrong: S.wrong, hints: S.hints, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      n: s.n, list: s.list, at: s.at || 0, drawn: s.drawn || {},
      need: s.need || 0, wrong: s.wrong || 0, hints: s.hints || 0,
      elapsed: s.elapsed || 0, done: false, sel: null
    };
  }

  function cur() { return S.list[S.at]; }
  function mine() { S.drawn[S.at] = S.drawn[S.at] || {}; return S.drawn[S.at]; }

  /** 지금 판에서 맞게 그은 선 · 잘못 그은 선 */
  function split() {
    var want = cur(), got = mine(), okList = [], badList = [];
    Object.keys(got).forEach(function (k) {
      (want.indexOf(k) >= 0 ? okList : badList).push(k);
    });
    return { ok: okList, bad: badList };
  }

  function pageDone() {
    var s = split();
    return s.bad.length === 0 && s.ok.length === cur().length;
  }

  /* ================= 누르기 · 끌기 =================
   * 두 가지를 다 받아 준다 —
   *   ① 점을 누른 채 다른 점으로 끌었다 놓기
   *   ② 점 하나를 누르고, 다른 점을 또 누르기
   * 손가락으로 끌 때는 뗀 자리의 요소가 처음 누른 점으로 잡히므로,
   * 뗀 자리의 좌표로 다시 찾아야 한다 (elementFromPoint).
   * 끄는 동안에는 화면을 다시 그리지 않는다. 그려 버리면 잡고 있던 점이 사라진다.
   */

  /** 그 자리에 있는 점의 번호 (없으면 null) */
  function dotAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var h = el && el.closest ? el.closest('.cf-hit') : null;
    return h ? Number(h.getAttribute('data-i')) : null;
  }

  var from = null;

  function bindDraw() {
    var box = els.mine;

    box.addEventListener('pointerdown', function (e) {
      if (!S || S.done) return;
      var i = dotAt(e.clientX, e.clientY);
      if (i == null) return;
      from = i;
      e.preventDefault();                 /* 글자가 끌려 잡히지 않게 */
    });

    box.addEventListener('pointerup', function (e) {
      if (!S || S.done || from == null) { from = null; return; }
      var j = dotAt(e.clientX, e.clientY);
      var a = from;
      from = null;
      if (j == null) { return; }          /* 점이 아닌 곳에서 뗐다 — 아무 일도 없다 */

      if (j !== a) { link(a, j); return; }   /* 끌어서 이었다 */

      /* 제자리에서 뗐다 — 한 번 누른 것으로 본다 */
      if (S.sel == null) { S.sel = a; paint(); }
      else if (S.sel === a) { S.sel = null; paint(); }
      else link(S.sel, a);
    });

    box.addEventListener('pointercancel', function () { from = null; });
  }


  /** 두 점 사이에 선을 긋거나 지운다 — 조각 단위로 다룬다.
   *  긴 선을 그으면 그 조각이 전부 그어지고, 이미 다 그어져 있으면 전부 지워진다. */
  function link(a, b) {
    if (S.flip) return;                 /* 다음 판으로 넘어가는 중 — 잠깐 기다린다 */
    if (!joinable(a, b)) { S.sel = b; paint(); return; }

    var us = units(a, b), got = mine();
    var allOn = us.every(function (u) { return got[u]; });
    if (allOn) {
      us.forEach(function (u) { delete got[u]; });   /* 같은 선을 다시 그으면 지워진다 */
    } else {
      var miss = false;
      us.forEach(function (u) {
        if (got[u]) return;
        got[u] = 1;
        if (cur().indexOf(u) < 0) miss = true;
      });
      if (miss) { S.wrong++; UI.beep('no'); }
      else UI.beep('tick');
    }
    S.sel = null;
    paint();
    persist();

    if (pageDone()) {
      if (S.at < S.list.length - 1) {
        S.flip = true;
        UI.toast(T('잘하셨습니다! 다음 그림으로 갑니다.'));
        setTimeout(function () {
          if (!mounted || !S || S.done) return;
          S.flip = false;
          S.at++; S.sel = null; paint(); persist();
        }, 700);
      } else finish(false);
    }
  }

  function useHint() {
    if (!S || S.done) return;
    var got = mine();
    var left = cur().filter(function (k) { return !got[k]; });
    if (!left.length) return;
    got[pick(left)] = 1;
    S.hints++;
    S.sel = null;
    UI.toast(T('선 하나를 그어 드렸습니다.'));
    paint(); persist();
    if (pageDone()) {
      if (S.at < S.list.length - 1) { S.at++; paint(); persist(); }
      else finish(false);
    }
  }

  /* ================= 화면 ================= */

  function renderIntro() {
    stopTimer();
    if (!mounted) return;
    var sess = Store.getSession('copyfig');
    var best = Store.bestEver('copyfig');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('따라 그리기') + '</h2>') +
        ('<p class="intro__desc">' + T('왼쪽 그림을 보고') + '<br>' + T('오른쪽 점판에 똑같이 그리세요.') + '<br>') +
          ('<small>' + T('마우스를 누르고 점을 잇거나,') + '<br>') +
          (T('점 두 개를 차례로 누르면 선이 이어집니다.') + '<br>') +
          (T('같은 선을 다시 누르면 지워집니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="cfResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{a}/{b}판', { a: (sess.at || 0) + 1, b: sess.list.length }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' ' + T('· {n}판 · 제한 {m}분', { n: L.count, m: Math.round(L.limit / 60) }) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="cfPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="cfRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#cfResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#cfRules').addEventListener('click', function () { App.showRules('copyfig'); });
    root.querySelector('#cfPrint').addEventListener('click', function () { Print.dialog('copyfig'); });
  }

  function renderBoard() {
    if (!mounted) return;
    var L = lv();

    root.innerHTML =
      '<section class="game copyfig">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="cfTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('그림') + '</span><b id="cfNo">1 / 1</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('실수') + '</span><b id="cfMiss">0</b></div>') +
        '</div>' +
        '<div class="cf-pair">' +
          ('<figure class="cf-panel"><figcaption>' + T('본') + '</figcaption><div id="cfModel"></div></figure>') +
          ('<figure class="cf-panel"><figcaption>' + T('여기에 그리세요') + '</figcaption><div id="cfMine"></div></figure>') +
        '</div>' +
        ('<p class="cf-note" id="cfNote">' + T('마우스를 누르고 점을 잇거나, 점 두 개를 차례로 누르면 선이 이어집니다.') + '</p>') +
        '<div class="tools" id="cfTools">' +
          ('<button class="tool" id="cfHintBtn"><span>💡</span>' + T('힌트') + '</button>') +
          ('<button class="tool" id="cfClear"><span>↩</span>' + T('다 지우기') + '</button>') +
          ('<button class="tool" id="cfRestart"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="cfSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      model: root.querySelector('#cfModel'),
      mine: root.querySelector('#cfMine'),
      time: root.querySelector('#cfTime'),
      no: root.querySelector('#cfNo'),
      miss: root.querySelector('#cfMiss'),
      note: root.querySelector('#cfNote')
    };

    bindDraw();
    root.querySelector('#cfHintBtn').addEventListener('click', useHint);
    root.querySelector('#cfClear').addEventListener('click', function () {
      if (!S || S.done) return;
      S.drawn[S.at] = {}; S.sel = null; paint(); persist();
    });
    root.querySelector('#cfRestart').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('copyfig'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#cfSwitch').addEventListener('click', function () { App.gameSwitcher('copyfig'); });

    paint();
    startTimer();
  }

  function paint() {
    if (!els.mine || !S.list.length) return;
    var s = split();
    els.model.innerHTML = svgGrid(S.n, { lines: cur() });
    els.mine.innerHTML = svgGrid(S.n, { lines: s.ok, bad: s.bad, sel: S.sel, tap: true });
    els.no.textContent = (S.at + 1) + ' / ' + S.list.length;
    els.miss.textContent = S.wrong;
  }

  function startTimer() {
    stopTimer();
    var L = lv();
    els.time.textContent = UI.fmtTime(L.limit - S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done || !mounted) return;
      S.elapsed++;
      var left = L.limit - S.elapsed;
      els.time.textContent = UI.fmtTime(left);
      els.time.classList.toggle('is-urgent', left <= 30);
      if (S.elapsed % 10 === 0) persist();
      if (left <= 0) finish(true);
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  /* ================= 점수 ================= */

  function score() {
    var L = lv();
    /* 판마다 맞게 그은 선을 모두 센다 */
    var done = 0;
    S.list.forEach(function (f, i) {
      var got = S.drawn[i] || {};
      done += f.filter(function (k) { return got[k]; }).length;
    });
    var all = done >= S.need;
    var draw = S.need ? Math.round(600 * done / S.need) : 0;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    var acc = Math.max(0, 100 - S.wrong * 10);
    var penalty = S.hints * 50;
    var bonus = all ? L.bonus : 0;
    return {
      draw: draw, time: time, acc: acc, penalty: penalty, bonus: bonus,
      all: all, done: done,
      total: Math.max(0, draw + time + acc + bonus - penalty)
    };
  }

  function finish(timeUp) {
    S.done = true;
    stopTimer();
    Store.clearSession('copyfig');
    UI.beep(timeUp ? 'no' : 'win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'copyfig', score: sc.total,
      difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { done: sc.done, need: S.need, wrong: S.wrong, hints: S.hints, timeUp: !!timeUp }
    });

    var rows = [{ label: T('그린 선 ({a}/{b}개)', { a: sc.done, b: S.need }), value: sc.draw }];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('정확도 보너스 (실수 {n}회)', { n: S.wrong }), value: sc.acc });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });
    if (sc.penalty) rows.push({ label: T('힌트 사용 ({n}회)', { n: S.hints }), value: sc.penalty, minus: true });

    /* 그린 그림이 주인공이다 — 다 그렸을 때는 창을 아래에 작게 붙이고
       점수 세부는 넣지 않는다. 시간이 다 됐을 때만 세부를 보여 준다. */
    UI.resultModal({
      title: timeUp ? T('시간이 다 되었습니다') : T('축하드립니다!'),
      low: true,
      score: sc.total,
      headline: timeUp
        ? T('선 {a}개 중 {b}개를 그리셨습니다.', { a: S.need, b: sc.done })
        : T('따라 그리기 {n}단계 완료!', { n: L.step }),
      rows: timeUp ? rows : undefined,
      actions: [
        { label: T('닫기') },
        { label: T('다른 게임'), onClick: function () { App.gameSwitcher('copyfig'); } },
        { label: T('한 판 더'), kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/>' +
         '<circle cx="5" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>' +
         '<circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/>' +
         '<path d="M5 12 12 5 19 12 12 19Z"/>',
    id: 'copyfig', name: T('따라 그리기'), tagline: T('본을 보고 똑같이 옮기는 눈'),
    rules: {
      title: T('따라 그리기 점수 규칙'),
      lines: [
        [T('푸는 법'), T('왼쪽 본을 보고 오른쪽 점판에 똑같이 그립니다. 마우스를 누른 채 점에서 점으로 끌어도 되고, 점 두 개를 차례로 눌러도 선이 이어집니다')],
        [T('선 지우기'), T('같은 선을 다시 누르면 지워집니다. 「다 지우기」로 한꺼번에 지울 수도 있습니다')],
        [T('그을 수 있는 선'), T('가로·세로·대각선으로 곧게만 그을 수 있습니다. 점을 건너뛴 긴 선도 됩니다')],
        [T('무엇에 좋은가'), T('눈으로 본 것을 손으로 옮기는 힘을 씁니다. 치매에서 일찍 흐려지는 힘이라 검사에도 쓰입니다')],
        [T('난이도'), T('1단계 점 3×3·선 3개 · 2단계 선 4개 · 3단계 선 6개 · 4단계 점 4×4·선 7개 · 5단계 선 9개')],
        [T('그리기 점수'), T('최대 600점 · 맞게 그은 선 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 다 그렸을 때만, 남은 시간에 비례')],
        [T('정확도 보너스'), T('최대 100점 · 없는 선을 1번 그을 때마다 10점씩 줄어듦')],
        [T('힌트 감점'), T('힌트 1회마다 50점 차감 (선 하나를 그어 줍니다)')],
        [T('틀렸을 때'), T('그 선이 빨갛게 남습니다. 다시 눌러 지우시면 됩니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (다 그렸을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () { mounted = false; stopTimer(); persist(); },
    hasProgress: function () { return !!Store.getSession('copyfig'); },
    levels: LEVELS,
    levelOrder: ORDER,

    /** 종이로 풀 문제를 한 판 새로 만든다. 한 장에 여덟 판 (두 칸 × 네 줄).
     *  화면에서 하던 판(S)은 건드리지 않는다. */
    makeForPrint: function (level) {
      var L = LEVELS[level] ? LEVELS[level] : LEVELS.easy;
      var list = [];
      for (var i = 0; i < 8; i++) {
        var f = makeFigure(L.n, L.lines);
        if (f) list.push(f);
      }
      function pairHtml(f, showAns) {
        return '<div class="ps-cf">' +
          '<div class="ps-cf__half">' + svgGrid(L.n, { lines: f }) + '</div>' +
          '<div class="ps-cf__half">' + svgGrid(L.n, showAns ? { lines: f } : {}) + '</div>' +
        '</div>';
      }
      return {
        levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        count: list.length,
        body: list.map(function (f) { return pairHtml(f, false); }).join(''),
        answer: list.map(function (f) { return pairHtml(f, true); }).join('')
      };
    }
  };
})();
