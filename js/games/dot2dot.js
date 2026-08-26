/* 새록 — 점 잇기 (숫자 순서대로 이어 그림 완성)
 * 점수: 잇기 600 + 시간 300 + 정확도 100 − (힌트 50/회) + 난이도 보너스
 *
 * 1부터 순서대로 점을 누르면 선이 그어지고, 마지막 점을 이으면
 * 숨어 있던 그림이 나타난다. 이 '그림이 나타나는 순간'이 보상이라,
 * 점수만 주는 다른 게임들과 재미의 결이 다르다.
 *
 * 숫자 순서를 따라가는 힘을 쓴다 — 치매 검사(선 잇기 검사)에 실제로 쓰이는 힘이다.
 * 말이 필요 없는 게임이라 문구만 바꾸면 세계 어디서나 그대로 통한다.
 *
 * 어르신을 위해 정한 것 —
 *  1) **다음 번호가 깜빡인다.** 어디를 눌러야 할지 늘 보인다.
 *  2) **틀린 점을 눌러도 벌이 없다.** 빨갛게 한 번 깜빡이고 만다.
 *  3) 난이도는 **점의 개수**로만 조절한다. 그림 자체는 늘 알아볼 수 있는 것들이다.
 *
 * 그림 만드는 법 —
 *  그림마다 꼭짓점(모양을 결정하는 점)을 손으로 정해 두었다.
 *  단계가 올라가면 **가장 긴 변을 반으로 쪼개** 점을 늘린다.
 *  꼭짓점은 늘 남아 있으므로 점이 많아져도 모양이 무너지지 않는다.
 */
window.Games = window.Games || {};
window.Games.dot2dot = (function () {

  /* ================= 그림들 =================
   * 좌표는 0~100 안. 꼭짓점을 차례로 이어 닫으면 그 모양이 된다.
   * 꼭짓점 수가 그 그림의 최소 점 수다.
   */
  function starPts() {
    var p = [];
    for (var k = 0; k < 10; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 5;
      var r = (k % 2) ? 19 : 45;
      p.push([Math.round(50 + Math.cos(a) * r), Math.round(54 + Math.sin(a) * r)]);
    }
    return p;
  }

  var SHAPES = [
    { id: 'star',      name: T('별'),     pts: starPts() },
    { id: 'heart',     name: T('하트'),   pts: [[50,90],[15,55],[10,35],[20,20],[35,18],[50,32],[65,18],[80,20],[90,35],[85,55]] },
    { id: 'house',     name: T('집'),     pts: [[15,90],[15,45],[50,14],[85,45],[85,90]] },
    { id: 'fish',      name: T('물고기'), pts: [[8,50],[35,30],[62,30],[80,42],[94,24],[94,76],[80,58],[62,70],[35,70]] },
    { id: 'tree',      name: T('나무'),   pts: [[50,10],[75,48],[62,48],[84,78],[56,78],[56,92],[44,92],[44,78],[16,78],[38,48],[25,48]] },
    { id: 'bolt',      name: T('번개'),   pts: [[55,8],[25,55],[45,55],[35,92],[75,42],[52,42],[68,8]] },
    { id: 'crown',     name: T('왕관'),   pts: [[15,80],[15,40],[32,56],[50,24],[68,56],[85,40],[85,80]] },
    { id: 'gem',       name: T('보석'),   pts: [[30,22],[70,22],[92,45],[50,88],[8,45]] },
    { id: 'arrow',     name: T('화살표'), pts: [[8,42],[55,42],[55,24],[92,50],[55,76],[55,58],[8,58]] },
    { id: 'moon',      name: T('초승달'), pts: [[60,8],[38,15],[21,32],[15,52],[21,72],[38,88],[60,92],[47,80],[37,64],[35,50],[39,35],[49,20]] },
    { id: 'cat',       name: T('고양이'), pts: [[20,82],[20,36],[12,10],[36,27],[64,27],[88,10],[80,36],[80,82]] },
    { id: 'tulip',     name: T('튤립'),   pts: [[38,92],[38,55],[20,42],[20,16],[36,32],[50,14],[64,32],[80,16],[80,42],[62,55],[62,92]] }
  ];

  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, dots: 12, count: 3, limit: 300, bonus: 0,
              note: T('그림 3개 · 점 12개') },
    step2:  { name: T('가볍게'), step: 2, dots: 16, count: 3, limit: 330, bonus: 0,
              note: T('그림 3개 · 점 16개') },
    easy:   { name: T('쉬움'),   step: 3, dots: 20, count: 4, limit: 390, bonus: 0,
              note: T('그림 4개 · 점 20개') },
    normal: { name: T('보통'),   step: 4, dots: 28, count: 4, limit: 450, bonus: 100,
              note: T('그림 4개 · 점 28개까지') },
    hard:   { name: T('어려움'), step: 5, dots: 36, count: 4, limit: 540, bonus: 250,
              note: T('그림 4개 · 점 36개까지') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function rnd(n) { return Math.floor(Math.random() * n); }

  /* ================= 점 늘리기 ================= */

  function dist(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 꼭짓점 목록을 K개까지 늘린다 — 가장 긴 변을 반으로 쪼개기를 되풀이.
   *  꼭짓점은 늘 남으므로 점이 많아져도 모양이 무너지지 않는다.
   *  다만 **짧아진 변은 더 쪼개지 않는다** — 물고기 꼬리처럼 좁은 곳에
   *  점이 몰리면 번호가 겹쳐 읽을 수 없다. 그래서 복잡한 그림은
   *  K에 못 미쳐도 그만 늘린다. 어려운 단계의 점 수가 '까지'인 이유다. */
  var MIN_EDGE = 11;
  function expand(pts, K) {
    var out = pts.map(function (p) { return [p[0], p[1]]; });
    while (out.length < K) {
      var big = -1, bigLen = MIN_EDGE * 2;   /* 쪼갠 뒤에도 MIN_EDGE 는 남아야 한다 */
      for (var i = 0; i < out.length; i++) {
        var d = dist(out[i], out[(i + 1) % out.length]);
        if (d >= bigLen) { bigLen = d; big = i; }
      }
      if (big < 0) break;                    /* 더 쪼갤 만한 변이 없다 */
      var a = out[big], b = out[(big + 1) % out.length];
      out.splice(big + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    return out;
  }

  /** 한 판에 쓸 그림들을 고른다 — 겹치지 않게, 시작점과 방향은 판마다 다르게 */
  function makeSet(L) {
    var pool = SHAPES.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = rnd(i + 1), t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, L.count).map(function (sh) {
      var pts = expand(sh.pts, Math.max(L.dots, sh.pts.length));
      /* 시작점을 돌리고, 반은 거꾸로 — 같은 그림이라도 판마다 다르게 이어진다 */
      var s = rnd(pts.length);
      var seq = pts.slice(s).concat(pts.slice(0, s));
      if (Math.random() < 0.5) seq = [seq[0]].concat(seq.slice(1).reverse());
      return { id: sh.id, name: sh.name, pts: seq };
    });
  }

  /* ================= 그리기 ================= */

  /** 점이 그림 안에 있는가 (광선 쏘기) */
  function inside(x, y, pts) {
    var hit = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }

  /** 번호표를 그림 바깥쪽으로 밀어낸다 — 선과 겹치지 않게.
   *  가운데에서 밀어내는 방식은 번개·초승달처럼 오목한 그림에서 선 위에 얹혔다.
   *  이제 그 점의 진행 방향에 수직으로 양쪽을 대 보고, 그림 밖인 쪽을 고른다. */
  function labelPos(i, pts, cx, cy) {
    var K = pts.length;
    var p = pts[i], a = pts[(i - 1 + K) % K], b = pts[(i + 1) % K];
    var tx = b[0] - a[0], ty = b[1] - a[1];
    var d = Math.sqrt(tx * tx + ty * ty) || 1;
    var nx = -ty / d, ny = tx / d;                       /* 진행 방향에 수직 */
    var o1 = [p[0] + nx * 6.5, p[1] + ny * 6.5];
    var o2 = [p[0] - nx * 6.5, p[1] - ny * 6.5];
    var in1 = inside(o1[0], o1[1], pts), in2 = inside(o2[0], o2[1], pts);
    if (in1 !== in2) return in1 ? o2 : o1;               /* 밖인 쪽 */
    /* 둘 다 밖(뾰족한 끝)이면 가운데에서 먼 쪽 */
    var d1 = (o1[0] - cx) * (o1[0] - cx) + (o1[1] - cy) * (o1[1] - cy);
    var d2 = (o2[0] - cx) * (o2[0] - cx) + (o2[1] - cy) * (o2[1] - cy);
    return d1 > d2 ? o1 : o2;
  }

  function center(pts) {
    var x = 0, y = 0;
    pts.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }

  /** 이웃한 점 사이의 가장 짧은 거리 — 누르는 자리가 서로 겹치지 않게 */
  function minGap(pts) {
    var m = 999;
    for (var i = 0; i < pts.length; i++) {
      var d = dist(pts[i], pts[(i + 1) % pts.length]);
      if (d < m) m = d;
    }
    return m;
  }

  /** 그림 한 판을 그린다.
   *  o.step 이은 점 수 · o.tap 누를 수 있게 · o.doneFill 완성 색칠 ·
   *  o.showAll 선 전부(정답지) · o.numbers 번호 보이기 */
  function svgPic(pic, o) {
    o = o || {};
    var pts = pic.pts, K = pts.length;
    var c = center(pts);
    var fs = K <= 16 ? 5.2 : K <= 24 ? 4.4 : 3.6;
    var dotR = K <= 20 ? 1.5 : 1.2;
    var hitR = Math.min(5.5, Math.max(2.6, minGap(pts) / 2 - 0.3));

    var out = '<svg class="dd-svg" viewBox="-10 -10 120 120" xmlns="http://www.w3.org/2000/svg">';

    /* 완성되면 은은하게 칠해 준다 — 그림이 '나타나는' 순간 */
    if (o.doneFill) {
      out += '<polygon class="dd-fill" points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '"/>';
    }

    /* 이은 선 */
    var upto = o.showAll ? K : (o.step || 0);
    if (upto > 1) {
      var d = pts.slice(0, upto).map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join('');
      if (o.showAll || upto >= K) d += 'L' + pts[0][0] + ' ' + pts[0][1];   /* 마지막은 처음으로 닫는다 */
      out += '<path class="dd-line" d="' + d + '"/>';
    }

    /* 점과 번호 */
    for (var i = 0; i < K; i++) {
      var p = pts[i];
      var st = (o.step || 0);
      var cls = 'dd-dot' + (i < st ? ' is-done' : '') + (o.tap && i === st ? ' is-next' : '');
      out += '<circle class="' + cls + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + dotR + '"/>';
      if (o.numbers !== false) {
        var lp = labelPos(i, pts, c[0], c[1]);
        out += '<text class="dd-num' + (i < st ? ' is-done' : '') + (o.tap && i === st ? ' is-next' : '') +
               '" x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + fs * 0.35).toFixed(1) +
               '" font-size="' + fs + '" text-anchor="middle">' + (i + 1) + '</text>';
      }
      if (o.tap) {
        out += '<circle class="dd-hit" cx="' + p[0] + '" cy="' + p[1] + '" r="' + hitR.toFixed(1) + '" data-i="' + i + '"/>';
      }
    }
    return out + '</svg>';
  }

  /* ================= 판 만들기 · 이어하기 ================= */

  function newGame(level) {
    var kk = LEVELS[level] ? level : 'easy';
    var L = LEVELS[kk];
    var list = makeSet(L);
    S = {
      day: Store.dayKey(), level: kk, list: list, at: 0, step: 0,
      wrong: 0, hints: 0, elapsed: 0, done: false, flip: false
    };
    S.need = list.reduce(function (t, p) { return t + p.pts.length; }, 0);
    S.got = 0;
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('dot2dot', {
      day: S.day, level: S.level, list: S.list, at: S.at, step: S.step,
      need: S.need, got: S.got, wrong: S.wrong, hints: S.hints, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      list: s.list, at: s.at || 0, step: s.step || 0,
      need: s.need || 0, got: s.got || 0, wrong: s.wrong || 0,
      hints: s.hints || 0, elapsed: s.elapsed || 0, done: false, flip: false
    };
  }

  function cur() { return S.list[S.at]; }

  /* ================= 누르기 ================= */

  function tapDot(i) {
    if (!S || S.done || S.flip) return;

    if (i !== S.step) {                     /* 다음 번호가 아니다 — 빨갛게 한 번 깜빡이고 만다 */
      S.wrong++;
      UI.beep('no');
      var el = els.wrap.querySelector('.dd-hit[data-i="' + i + '"]');
      if (el) {
        var dot = els.wrap.querySelectorAll('.dd-dot')[i];
        if (dot) { dot.classList.remove('is-bad'); void dot.getBBox; dot.classList.add('is-bad'); }
      }
      if (els.miss) els.miss.textContent = S.wrong;
      return;
    }

    S.step++;
    S.got++;
    UI.beep('tick');

    var K = cur().pts.length;
    if (S.step >= K) {                       /* 다 이었다 — 그림이 나타난다 */
      S.flip = true;
      paint(true);
      UI.beep('ok');
      UI.toast(cur().name + '! ' + (S.at < S.list.length - 1 ? T('다음 그림으로 갑니다.') : ''));
      setTimeout(function () {
        if (!mounted || !S || S.done) return;
        S.flip = false;
        if (S.at < S.list.length - 1) {
          S.at++; S.step = 0; paint(); persist();
        } else {
          finish(false);
        }
      }, 1400);
    } else {
      paint();
    }
    persist();
  }

  function useHint() {
    if (!S || S.done || S.flip) return;
    S.hints++;
    /* 다음 점을 크게 흔들어 알려 준다 */
    var dots = els.wrap.querySelectorAll('.dd-dot');
    var d = dots[S.step];
    if (d) { d.classList.remove('is-wave'); void d.getBBox; d.classList.add('is-wave'); }
    var nums = els.wrap.querySelectorAll('.dd-num');
    var n2 = nums[S.step];
    if (n2) { n2.classList.remove('is-wave'); void n2.getBBox; n2.classList.add('is-wave'); }
    UI.toast(T('다음 점을 흔들어 드렸습니다.'));
    if (els.hint) els.hint.textContent = S.hints;
    persist();
  }

  /* ================= 화면 ================= */

  function renderIntro() {
    stopTimer();
    if (!mounted) return;
    var sess = Store.getSession('dot2dot');
    var best = Store.bestEver('dot2dot');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('점 잇기') + '</h2>') +
        ('<p class="intro__desc">' + T('1부터 순서대로 점을 이으면') + '<br>' + T('숨어 있던 그림이 나타납니다.') + '<br>') +
          ('<small>' + T('다음에 누를 점이 깜빡입니다.') + '<br>') +
          (T('다른 점을 눌러도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="ddResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{a}/{b}판', { a: (sess.at || 0) + 1, b: sess.list.length }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' ' + T('· 제한 {m}분', { m: Math.round(L.limit / 60) }) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="ddPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="ddRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#ddResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#ddRules').addEventListener('click', function () { App.showRules('dot2dot'); });
    root.querySelector('#ddPrint').addEventListener('click', function () { Print.dialog('dot2dot'); });
  }

  function renderBoard() {
    if (!mounted) return;
    var L = lv();

    root.innerHTML =
      '<section class="game dot2dot">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="ddTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('그림') + '</span><b id="ddNo">1 / 1</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('힌트') + '</span><b id="ddHint">0</b></div>') +
        '</div>' +
        '<div class="dd-wrap" id="ddWrap"></div>' +
        ('<p class="dd-note" id="ddNote">' + T('깜빡이는 1번 점부터 순서대로 눌러 보세요.') + '</p>') +
        '<div class="tools" id="ddTools">' +
          ('<button class="tool" id="ddHintBtn"><span>💡</span>' + T('힌트') + '</button>') +
          ('<button class="tool" id="ddRestart"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="ddSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      wrap: root.querySelector('#ddWrap'),
      time: root.querySelector('#ddTime'),
      no: root.querySelector('#ddNo'),
      hint: root.querySelector('#ddHint'),
      miss: null,
      note: root.querySelector('#ddNote')
    };

    els.wrap.addEventListener('click', function (e) {
      var h = e.target.closest('.dd-hit');
      if (h) tapDot(Number(h.dataset.i));
    });
    root.querySelector('#ddHintBtn').addEventListener('click', useHint);
    root.querySelector('#ddRestart').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('dot2dot'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#ddSwitch').addEventListener('click', function () { App.gameSwitcher('dot2dot'); });

    paint();
    startTimer();
  }

  function paint(doneFill) {
    if (!els.wrap || !S.list.length) return;
    els.wrap.innerHTML = svgPic(cur(), { step: S.step, tap: !doneFill, doneFill: !!doneFill });
    els.no.textContent = (S.at + 1) + ' / ' + S.list.length;
    els.hint.textContent = S.hints;
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
    var all = S.got >= S.need;
    var join = S.need ? Math.round(600 * S.got / S.need) : 0;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    var acc = Math.max(0, 100 - S.wrong * 5);
    var penalty = S.hints * 50;
    var bonus = all ? L.bonus : 0;
    return {
      join: join, time: time, acc: acc, penalty: penalty, bonus: bonus, all: all,
      total: Math.max(0, join + time + acc + bonus - penalty)
    };
  }

  function finish(timeUp) {
    S.done = true;
    stopTimer();
    Store.clearSession('dot2dot');
    UI.beep(timeUp ? 'no' : 'win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'dot2dot', score: sc.total,
      difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { got: S.got, need: S.need, wrong: S.wrong, hints: S.hints, timeUp: !!timeUp }
    });

    var rows = [{ label: T('이은 점 ({a}/{b}개)', { a: S.got, b: S.need }), value: sc.join }];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('정확도 보너스 (헛짚음 {n}회)', { n: S.wrong }), value: sc.acc });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });
    if (sc.penalty) rows.push({ label: T('힌트 사용 ({n}회)', { n: S.hints }), value: sc.penalty, minus: true });

    UI.resultModal({
      title: timeUp ? T('시간이 다 되었습니다') : T('다 이으셨습니다!'),
      score: sc.total,
      headline: sc.all
        ? T('그림 {n}개를 모두 완성하셨습니다.', { n: S.list.length })
        : T('점 {a}개 중 {b}개를 이으셨습니다.', { a: S.need, b: S.got }),
      rows: rows,
      actions: [
        { label: T('닫기') },
        { label: T('다른 게임'), onClick: function () { App.gameSwitcher('dot2dot'); } },
        { label: T('한 판 더'), kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<circle cx="5" cy="18" r="1.7"/><circle cx="9" cy="6" r="1.7"/><circle cx="16" cy="10" r="1.7"/><circle cx="20" cy="19" r="1.7"/><circle cx="12" cy="15" r="1.7"/><path d="M5 18 9 6l7 4-4 5 8 4"/>',
    id: 'dot2dot', name: T('점 잇기'), tagline: T('순서대로 이으면 그림이 나타나는'),
    rules: {
      title: T('점 잇기 점수 규칙'),
      lines: [
        [T('푸는 법'), T('1부터 순서대로 점을 누릅니다. 누를 때마다 선이 이어지고, 마지막 점을 누르면 그림이 완성됩니다')],
        [T('다음 점'), T('다음에 누를 점이 초록으로 깜빡입니다. 헷갈리면 그것만 찾으시면 됩니다')],
        [T('난이도'), T('점의 개수로만 달라집니다 — 1단계 12개 · 2단계 16개 · 3단계 20개 · 4단계 28개 · 5단계 36개')],
        [T('잇기 점수'), T('최대 600점 · 이은 점 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 다 이었을 때만, 남은 시간에 비례')],
        [T('정확도 보너스'), T('최대 100점 · 다른 점을 1번 누를 때마다 5점씩 줄어듦')],
        [T('힌트 감점'), T('힌트 1회마다 50점 차감 (다음 점을 흔들어 알려 줍니다)')],
        [T('틀렸을 때'), T('빨갛게 한 번 깜빡이고 맙니다. 이은 선이 지워지지 않습니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (다 이었을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')],
        [T('시간이 끝나면'), T('이은 만큼만 점수로 기록됩니다')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () { mounted = false; stopTimer(); persist(); },
    hasProgress: function () { return !!Store.getSession('dot2dot'); },
    levels: LEVELS,
    levelOrder: ORDER,

    /** 종이로 풀 문제를 한 판 새로 만든다. 한 장에 넉 장 (두 칸 × 두 줄).
     *  화면에서 하던 판(S)은 건드리지 않는다. */
    makeForPrint: function (level) {
      var L = LEVELS[level] ? LEVELS[level] : LEVELS.easy;
      var list = makeSet({ count: 4, dots: L.dots });
      return {
        levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        count: list.length,
        body: list.map(function (p) {
          return '<div class="ps-dd">' + svgPic(p, { step: 0 }) + '</div>';
        }).join(''),
        answer: list.map(function (p) {
          return '<div class="ps-dd">' + svgPic(p, { showAll: true }) + '</div>';
        }).join('')
      };
    }
  };
})();
