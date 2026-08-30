/* 새록 — 미로찾기
 * 점수: 도착 600 + 시간 300 + 지름길 100 − (힌트 50/회) + 난이도 보너스
 *
 * 말이 필요 없는 게임이라 문구만 바꾸면 세계 어디서나 그대로 통한다.
 * 미로는 판을 시작할 때마다 새로 만들어 낸다. 같은 미로가 되풀이되지 않고,
 * 그림 파일이 없으니 인터넷 없이도 가볍게 돌아간다.
 *
 * 어르신을 위해 정한 것 —
 *  1) **손가락으로 선을 긋게 하지 않는다.** 큰 화살표 넷을 누르는 방식이다.
 *     떨리는 손으로 좁은 길을 따라 긋는 것은 벽이 너무 높다.
 *  2) **한 번 누르면 갈림길까지 쭉 간다.** 한 칸씩 가면 스무 번 넘게 눌러야 한다.
 *     길이 하나뿐인 곳은 저절로 지나가고, 고를 곳에서만 멈춘다.
 *  3) **벽을 눌러도 아무 일도 없다.** 틀렸다고 알리지 않고 점수도 깎지 않는다.
 *  4) 지나온 길은 굵은 선으로 남는다. 되돌아 나오면 그 선도 함께 지워진다.
 *
 * 미로 만드는 법 — 되돌아가기(recursive backtracker).
 * 어느 칸에서 어느 칸으로도 길이 하나뿐인 미로가 되므로 헷갈릴 일이 없다.
 */
window.Games = window.Games || {};
window.Games.maze = (function () {

  var C = 10;            /* 칸 하나의 크기 (그림 좌표) */

  /* 벽이 없는 쪽을 비트로 적는다 — 1 위 · 2 오른쪽 · 4 아래 · 8 왼쪽 */
  var N = 1, E = 2, S_ = 4, Wl = 8;
  var DIRS = [
    { dx: 0, dy: -1, bit: N,  opp: S_ },
    { dx: 1, dy: 0,  bit: E,  opp: Wl },
    { dx: 0, dy: 1,  bit: S_, opp: N  },
    { dx: -1, dy: 0, bit: Wl, opp: E  }
  ];

  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, n: 5,  limit: 300, bonus: 0,
              note: T('5칸 미로 · 길이 단순합니다') },
    step2:  { name: T('가볍게'), step: 2, n: 7,  limit: 300, bonus: 0,
              note: T('7칸 미로') },
    easy:   { name: T('쉬움'),   step: 3, n: 9,  limit: 360, bonus: 0,
              note: T('9칸 미로') },
    normal: { name: T('보통'),   step: 4, n: 12, limit: 420, bonus: 100,
              note: T('12칸 미로 · 갈림길이 많습니다') },
    hard:   { name: T('어려움'), step: 5, n: 15, limit: 480, bonus: 250,
              note: T('15칸 미로 · 막다른 길이 많습니다') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }

  /* ================= 미로 만들기 ================= */

  /** n×n 미로를 만든다. 칸마다 '뚫린 쪽'을 비트로 적어 돌려준다. */
  function genMaze(n) {
    var cell = [], vis = [], i;
    for (i = 0; i < n * n; i++) { cell.push(0); vis.push(false); }

    var stack = [0];
    vis[0] = true;

    while (stack.length) {
      var cur = stack[stack.length - 1];
      var cx = cur % n, cy = Math.floor(cur / n);
      var opts = [];

      for (var d = 0; d < 4; d++) {
        var nx = cx + DIRS[d].dx, ny = cy + DIRS[d].dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        var ni = ny * n + nx;
        if (!vis[ni]) opts.push({ i: ni, d: d });
      }
      if (!opts.length) { stack.pop(); continue; }

      var pick = opts[Math.floor(Math.random() * opts.length)];
      cell[cur] |= DIRS[pick.d].bit;
      cell[pick.i] |= DIRS[pick.d].opp;
      vis[pick.i] = true;
      stack.push(pick.i);
    }
    return cell;
  }

  /** 어느 칸에서 다른 모든 칸까지 몇 걸음인지 (넓이 우선 탐색) */
  function distFrom(cell, n, src) {
    var d = [], i;
    for (i = 0; i < n * n; i++) d.push(-1);
    d[src] = 0;
    var q = [src], head = 0;
    while (head < q.length) {
      var c = q[head++];
      var cx = c % n, cy = Math.floor(c / n);
      for (var k = 0; k < 4; k++) {
        if (!(cell[c] & DIRS[k].bit)) continue;
        var nx = cx + DIRS[k].dx, ny = cy + DIRS[k].dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        var ni = ny * n + nx;
        if (d[ni] < 0) { d[ni] = d[c] + 1; q.push(ni); }
      }
    }
    return d;
  }

  /** 어느 칸에서 도착까지의 지름길 (칸 번호 줄) */
  function pathTo(cell, n, from, dGoal) {
    var out = [from], cur = from;
    while (dGoal[cur] > 0) {
      var cx = cur % n, cy = Math.floor(cur / n), next = -1;
      for (var k = 0; k < 4; k++) {
        if (!(cell[cur] & DIRS[k].bit)) continue;
        var nx = cx + DIRS[k].dx, ny = cy + DIRS[k].dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        var ni = ny * n + nx;
        if (dGoal[ni] === dGoal[cur] - 1) { next = ni; break; }
      }
      if (next < 0) break;
      out.push(next);
      cur = next;
    }
    return out;
  }

  /* ================= 그리기 ================= */

  function cx(i, n) { return (i % n) * C + C / 2; }
  function cy(i, n) { return Math.floor(i / n) * C + C / 2; }

  /** 벽을 선으로 그린다. 바깥 테두리는 출발·도착만 남기고 둘러친다. */
  function wallPath(cell, n) {
    var p = [];
    /* 바깥 테두리 */
    p.push('M0 0 H' + (n * C));
    p.push('M0 ' + (n * C) + ' H' + (n * C));
    p.push('M0 0 V' + (n * C));
    p.push('M' + (n * C) + ' 0 V' + (n * C));
    /* 안쪽 벽 — 칸마다 오른쪽·아래쪽만 보면 겹치지 않는다 */
    for (var i = 0; i < n * n; i++) {
      var x = (i % n) * C, y = Math.floor(i / n) * C;
      if (!(cell[i] & E) && (i % n) < n - 1) p.push('M' + (x + C) + ' ' + y + ' V' + (y + C));
      if (!(cell[i] & S_) && Math.floor(i / n) < n - 1) p.push('M' + x + ' ' + (y + C) + ' H' + (x + C));
    }
    return p.join(' ');
  }

  /** 칸 줄을 이어 선으로 만든다 */
  function linePath(list, n) {
    if (!list || list.length < 2) return '';
    return list.map(function (i, k) {
      return (k ? 'L' : 'M') + cx(i, n) + ' ' + cy(i, n);
    }).join(' ');
  }

  /** 미로 한 판을 그린다.
   *  o.trail  지나온 길 · o.hint 힌트로 알려 준 길 · o.solve 정답 길 · o.at 지금 자리 */
  function svgMaze(cell, n, o) {
    o = o || {};
    var pad = 1.4;
    var size = n * C;
    var out = '<svg class="mz-svg" viewBox="' + (-pad) + ' ' + (-pad) + ' ' +
      (size + pad * 2) + ' ' + (size + pad * 2) + '" xmlns="http://www.w3.org/2000/svg">';

    /* 출발·도착 칸 바탕 */
    out += '<rect class="mz-start" x="0.6" y="0.6" width="' + (C - 1.2) + '" height="' + (C - 1.2) + '" rx="1.6"/>';
    out += '<rect class="mz-goal" x="' + ((n - 1) * C + 0.6) + '" y="' + ((n - 1) * C + 0.6) +
           '" width="' + (C - 1.2) + '" height="' + (C - 1.2) + '" rx="1.6"/>';

    if (o.solve) out += '<path class="mz-solve" d="' + linePath(o.solve, n) + '"/>';
    if (o.hint && o.hint.length > 1) out += '<path class="mz-hint" d="' + linePath(o.hint, n) + '"/>';
    if (o.trail && o.trail.length > 1) out += '<path class="mz-trail" d="' + linePath(o.trail, n) + '"/>';

    out += '<path class="mz-wall" d="' + wallPath(cell, n) + '"/>';

    /* 출발 자리 표시 — 종이에서 어디서 시작하는지 알 수 있게 */
    out += '<circle class="mz-home" cx="' + cx(0, n) + '" cy="' + cy(0, n) + '" r="1.9"/>';

    /* 도착 자리 표시 — 겹동그라미 */
    out += '<circle class="mz-flag" cx="' + cx(n * n - 1, n) + '" cy="' + cy(n * n - 1, n) + '" r="2.6"/>';
    out += '<circle class="mz-flag2" cx="' + cx(n * n - 1, n) + '" cy="' + cy(n * n - 1, n) + '" r="1.2"/>';

    if (o.at != null) {
      out += '<circle class="mz-me" cx="' + cx(o.at, n) + '" cy="' + cy(o.at, n) + '" r="2.9"/>';
    }
    return out + '</svg>';
  }

  /* ================= 판 만들기 · 이어하기 ================= */

  function newGame(level) {
    var key = LEVELS[level] ? level : 'easy';
    var L = LEVELS[key];
    var cell = genMaze(L.n);
    var goal = L.n * L.n - 1;
    S = {
      day: Store.dayKey(), level: key, n: L.n, cell: cell,
      at: 0, trail: [0], steps: 0,
      best: distFrom(cell, L.n, 0)[goal],   /* 지름길 걸음 수 */
      hint: [], hints: 0, elapsed: 0, done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('maze', {
      day: S.day, level: S.level, n: S.n, cell: S.cell,
      at: S.at, trail: S.trail, steps: S.steps, best: S.best,
      hints: S.hints, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      n: s.n, cell: s.cell, at: s.at || 0, trail: s.trail || [0],
      steps: s.steps || 0, best: s.best || 1,
      hint: [], hints: s.hints || 0, elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 움직이기 ================= */

  /** 그 칸에서 갈 수 있는 곳 (온 길은 뺀다) */
  function ways(i, from) {
    var out = [], n = S.n;
    var x = i % n, y = Math.floor(i / n);
    for (var k = 0; k < 4; k++) {
      if (!(S.cell[i] & DIRS[k].bit)) continue;
      var nx = x + DIRS[k].dx, ny = y + DIRS[k].dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      var ni = ny * n + nx;
      if (ni === from) continue;
      out.push(ni);
    }
    return out;
  }

  /** 한 칸 옮긴다. 되돌아 나오면 지나온 선도 함께 지운다. */
  function stepTo(next) {
    var t = S.trail;
    if (t.length > 1 && t[t.length - 2] === next) t.pop();   /* 되돌아 나옴 */
    else t.push(next);
    S.at = next;
    S.steps++;
  }

  /** 화살표 한 번 — 갈림길이 나올 때까지 쭉 간다 */
  function move(dirIdx) {
    if (!S || S.done) return;
    var n = S.n, d = DIRS[dirIdx];
    if (!(S.cell[S.at] & d.bit)) { bump(); return; }         /* 벽 — 아무 일도 없다 */

    var x = S.at % n, y = Math.floor(S.at / n);
    var nx = x + d.dx, ny = y + d.dy;
    if (nx < 0 || ny < 0 || nx >= n || ny >= n) { bump(); return; }

    var from = S.at;
    stepTo(ny * n + nx);
    S.hint = [];

    /* 곧은 길은 저절로 지나간다 — 한 칸씩 스무 번 누르지 않으시도록.
       다만 **길이 꺾이거나 갈라지면 멈춘다.** 끝까지 데려다주면
       게임이 저절로 풀리는 셈이라, 눈으로 길을 고르는 재미가 사라진다. */
    var ahead = d.dy * n + d.dx;
    var guard = 0;
    while (S.at !== n * n - 1 && guard++ < 100) {
      var w = ways(S.at, from);
      if (w.length !== 1) break;            /* 갈림길이거나 막다른 길 */
      if (w[0] !== S.at + ahead) break;     /* 길이 꺾인다 */
      from = S.at;
      stepTo(w[0]);
    }

    paint();
    persist();
    if (S.at === n * n - 1) finish(false);
    else UI.beep('tick');
  }

  /** 벽에 부딪혔을 때 — 소리도 벌도 없이 살짝 흔들기만 한다 */
  function bump() {
    if (!els.wrap) return;
    els.wrap.classList.remove('is-bump');
    void els.wrap.offsetWidth;
    els.wrap.classList.add('is-bump');
  }

  function useHint() {
    if (!S || S.done) return;
    var goal = S.n * S.n - 1;
    var dGoal = distFrom(S.cell, S.n, goal);
    S.hint = pathTo(S.cell, S.n, S.at, dGoal).slice(0, 6);   /* 앞으로 다섯 칸만 */
    S.hints++;
    paint();
    persist();
    if (els.hint) els.hint.textContent = S.hints;
    UI.toast(T('가야 할 길을 조금만 알려 드렸습니다.'));
  }

  /* ================= 화면 ================= */

  function renderIntro() {
    stopTimer();
    if (!mounted) return;
    var sess = Store.getSession('maze');
    var best = Store.bestEver('maze');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('미로찾기') + '</h2>') +
        ('<p class="intro__desc">' + T('왼쪽 위에서 출발해') + '<br>' + T('오른쪽 아래로 나가는 길을 찾으세요.') + '<br>') +
          ('<small>' + T('화살표를 누르면 길이 꺾이는 곳까지 저절로 갑니다.') + '<br>') +
          (T('벽 쪽을 눌러도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="mzResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{n}걸음까지 감', { n: sess.steps || 0 }) + '</small></button>'
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
        ('<button class="btn btn--ghost btn--print" id="mzPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="mzRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#mzResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#mzRules').addEventListener('click', function () { App.showRules('maze'); });
    root.querySelector('#mzPrint').addEventListener('click', function () { Print.dialog('maze'); });
  }

  function renderBoard() {
    if (!mounted) return;
    var L = lv();

    root.innerHTML =
      '<section class="game maze">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="mzTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('걸음') + '</span><b id="mzStep">0</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('힌트') + '</span><b id="mzHint">0</b></div>') +
        '</div>' +
        '<div class="mz-wrap" id="mzWrap">' + svgMaze(S.cell, S.n, { trail: S.trail, at: S.at }) + '</div>' +
        ('<p class="mz-note" id="mzNote">' + T('오른쪽 아래 겹동그라미로 나가시면 됩니다.') + '</p>') +
        '<div class="mz-pad">' +
          ('<button class="mz-btn mz-btn--up" data-dir="0" aria-label="' + T('위로') + '">▲</button>') +
          ('<button class="mz-btn mz-btn--left" data-dir="3" aria-label="' + T('왼쪽으로') + '">◀</button>') +
          ('<button class="mz-btn mz-btn--right" data-dir="1" aria-label="' + T('오른쪽으로') + '">▶</button>') +
          ('<button class="mz-btn mz-btn--down" data-dir="2" aria-label="' + T('아래로') + '">▼</button>') +
        '</div>' +
        '<div class="tools" id="mzTools">' +
          ('<button class="tool" id="mzHintBtn"><span>💡</span>' + T('힌트') + '</button>') +
          ('<button class="tool" id="mzBack"><span>↩</span>' + T('처음 자리로') + '</button>') +
          ('<button class="tool" id="mzRestart"><span>↺</span>' + T('새 판') + '</button>') +
          ('<button class="tool" id="mzSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#mzTime'),
      step: root.querySelector('#mzStep'),
      hint: root.querySelector('#mzHint'),
      note: root.querySelector('#mzNote'),
      wrap: root.querySelector('#mzWrap')
    };

    root.querySelectorAll('.mz-btn').forEach(function (b) {
      b.addEventListener('click', function () { move(Number(b.dataset.dir)); });
    });
    root.querySelector('#mzHintBtn').addEventListener('click', useHint);
    root.querySelector('#mzBack').addEventListener('click', function () {
      if (!S || S.done) return;
      S.at = 0; S.trail = [0]; S.hint = [];
      paint(); persist();
    });
    root.querySelector('#mzRestart').addEventListener('click', function () {
      UI.confirm(T('새 판'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('maze'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#mzSwitch').addEventListener('click', function () { App.gameSwitcher('maze'); });

    bindSwipe();
    els.step.textContent = S.steps;
    els.hint.textContent = S.hints;
    startTimer();
  }

  /** 미로 위를 손가락으로 밀어도 움직이게 한다 (화살표가 더 쉬우신 분도 있고, 이쪽이 편한 분도 있다) */
  function bindSwipe() {
    var sx = 0, sy = 0, on = false;
    els.wrap.addEventListener('touchstart', function (e) {
      if (!e.touches.length) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; on = true;
    }, { passive: true });
    els.wrap.addEventListener('touchend', function (e) {
      if (!on || !e.changedTouches.length) return;
      on = false;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 3);
      else move(dy > 0 ? 2 : 0);
    }, { passive: true });
  }

  /** 키보드 화살표 — 컴퓨터로 하시는 분을 위해 */
  function onKey(e) {
    if (!mounted || !S || S.done) return;
    var map = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
    if (map[e.key] == null) return;
    e.preventDefault();
    move(map[e.key]);
  }

  function paint() {
    if (!els.wrap) return;
    els.wrap.innerHTML = svgMaze(S.cell, S.n, { trail: S.trail, at: S.at, hint: S.hint });
    if (els.step) els.step.textContent = S.steps;
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
    var L = lv(), goal = S.n * S.n - 1;
    var arrived = S.at === goal;

    /* 못 나가셨어도 얼마나 가까이 갔는지만큼은 점수로 드린다 */
    var left = distFrom(S.cell, S.n, S.at)[goal];
    var prog = arrived ? 1 : Math.max(0, Math.min(1, (S.best - left) / S.best));

    var reach = Math.round(600 * prog);
    var time = arrived ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    /* 지름길로 갈수록 높다. 지름길이 20걸음인데 20걸음에 나가면 100점. */
    var road = arrived ? Math.round(100 * S.best / Math.max(S.best, S.steps)) : 0;
    var penalty = S.hints * 50;
    var bonus = arrived ? L.bonus : 0;

    return {
      reach: reach, time: time, road: road, penalty: penalty, bonus: bonus,
      arrived: arrived, prog: prog, left: left,
      total: Math.max(0, reach + time + road + bonus - penalty)
    };
  }

  function finish(timeUp) {
    S.done = true;
    stopTimer();
    Store.clearSession('maze');
    UI.beep(timeUp ? 'no' : 'win');

    var L = lv(), sc = score();

    /* 못 나가셨으면 길을 보여 드린다 — 궁금한 채로 끝나면 서운하다 */
    if (!sc.arrived && els.wrap) {
      var dGoal = distFrom(S.cell, S.n, S.n * S.n - 1);
      els.wrap.innerHTML = svgMaze(S.cell, S.n, {
        solve: pathTo(S.cell, S.n, 0, dGoal), trail: S.trail, at: S.at
      });
    }
    afterTools();

    Store.addRecord({
      game: 'maze', score: sc.total,
      difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { steps: S.steps, best: S.best, hints: S.hints, arrived: sc.arrived, timeUp: !!timeUp }
    });

    var rows = [];
    rows.push({
      label: sc.arrived ? T('도착 점수') : T('간 만큼의 점수 ({n}%)', { n: Math.round(sc.prog * 100) }),
      value: sc.reach
    });
    if (sc.arrived) {
      rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
      rows.push({ label: T('지름길 보너스 ({a}걸음 / 지름길 {b}걸음)', { a: S.steps, b: S.best }), value: sc.road });
    }
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });
    if (sc.penalty) rows.push({ label: T('힌트 사용 ({n}회)', { n: S.hints }), value: sc.penalty, minus: true });

    /* 지나온 길이 보여야 한다 — 도착했을 때는 창을 아래에 작게 붙이고
       점수 세부는 넣지 않는다. 못 나왔을 때만 세부를 보여 준다. */
    UI.resultModal({
      title: timeUp ? T('시간이 다 되었습니다') : T('축하드립니다!'),
      low: true,
      score: sc.total,
      headline: sc.arrived
        ? T('미로찾기 {n}단계 완료!', { n: L.step })
        : T('도착까지 {n}걸음 남았습니다.', { n: sc.left }),
      rows: sc.arrived ? undefined : rows,
      note: sc.arrived ? '' : T('초록 선이 지름길입니다.'),
      actions: [
        { label: T('미로 보기') },
        { label: T('다른 게임'), onClick: function () { App.gameSwitcher('maze'); } },
        { label: T('한 판 더'), kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
    });
  }

  /** 판이 끝난 뒤에는 아래 단추를 바꿔 준다 */
  function afterTools() {
    var t = root.querySelector('#mzTools');
    if (!t) return;
    t.innerHTML =
      ('<button class="tool" id="mzAgain"><span>↺</span>' + T('한 판 더') + '</button>') +
      ('<button class="tool" id="mzSwitch2"><span>⇄</span>' + T('다른 게임') + '</button>');
    t.querySelector('#mzAgain').addEventListener('click', function () { S = null; renderIntro(); });
    t.querySelector('#mzSwitch2').addEventListener('click', function () { App.gameSwitcher('maze'); });

    var pad = root.querySelector('.mz-pad');
    if (pad) pad.hidden = true;
    if (els.note) els.note.textContent = T('굵은 선이 지나오신 길입니다.');
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<path d="M3 3h18v18H3z"/><path d="M3 8h6M15 3v8M9 8v8M15 11h6M9 16h9M21 16v5"/>',
    id: 'maze', name: T('미로찾기'), tagline: T('길을 눈으로 더듬어 찾는 시간'),
    rules: {
      title: T('미로찾기 점수 규칙'),
      lines: [
        [T('난이도'), T('1단계 5칸 · 2단계 7칸 · 3단계 9칸 · 4단계 12칸 · 5단계 15칸')],
        [T('움직이는 법'), T('화살표 넷을 누르시면 됩니다. 휴대폰에서는 미로 위를 손가락으로 밀어도 되고, 컴퓨터에서는 키보드 화살표도 됩니다')],
        [T('곧은 길은 저절로'), T('한 번 누르면 길이 꺾이거나 갈라지는 곳까지 쭉 갑니다. 한 칸씩 스무 번 누르지 않으셔도 됩니다')],
        [T('도착 점수'), T('최대 600점 · 나가시면 600점, 못 나가셔도 가까이 간 만큼 드립니다')],
        [T('시간 보너스'), T('최대 300점 · 나가셨을 때만, 남은 시간에 비례')],
        [T('지름길 보너스'), T('최대 100점 · 지름길에 가깝게 나오실수록 높습니다')],
        [T('힌트 감점'), T('힌트 1회마다 50점 차감 (가야 할 길을 다섯 칸만 알려 줍니다)')],
        [T('벽에 부딪히면'), T('아무 일도 없습니다. 점수가 깎이지 않으니 마음껏 눌러 보셔도 됩니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (나가셨을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')],
        [T('시간이 끝나면'), T('간 만큼만 점수로 기록되고, 지름길을 초록 선으로 알려 드립니다')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      document.addEventListener('keydown', onKey);
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () {
      mounted = false;
      document.removeEventListener('keydown', onKey);
      stopTimer();
      persist();
    },
    hasProgress: function () { return !!Store.getSession('maze'); },
    levels: LEVELS,
    levelOrder: ORDER,

    /** 종이로 풀 문제를 한 판 새로 만든다.
     *  화면에서 하던 판(S)은 건드리지 않는다 — 인쇄했다고 진행 중인 판이 사라지면 안 된다. */
    makeForPrint: function (level) {
      var L = LEVELS[level] ? LEVELS[level] : LEVELS.easy;
      var cell = genMaze(L.n);
      var goal = L.n * L.n - 1;
      var dGoal = distFrom(cell, L.n, goal);
      return {
        levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        n: L.n,
        steps: distFrom(cell, L.n, 0)[goal],
        body: svgMaze(cell, L.n, {}),
        answer: svgMaze(cell, L.n, { solve: pathTo(cell, L.n, 0, dGoal) })
      };
    }
  };
})();
