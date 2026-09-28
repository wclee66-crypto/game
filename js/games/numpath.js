/* 새록 — 숫자 이어가기
 *
 * 1부터 마지막 숫자까지, 가로·세로로 맞닿은 칸을 따라 한 줄로 이어지는 길을 완성한다.
 * 화면에서는 지금 넣을 숫자를 크게 보이고 빈칸 하나만 누르게 한다. 작은 글자를
 * 입력하거나 선을 정교하게 그릴 필요가 없어 떨리는 손에도 부담이 적다.
 */
window.Games = window.Games || {};
window.Games.numpath = (function () {
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, n: 4, show: 11, rounds: 3, limit: 300, bonus: 0, random: false, note: T('4×4 · 빈칸 5개') },
    step2:  { name: T('가볍게'), step: 2, n: 5, show: 16, rounds: 3, limit: 360, bonus: 0, random: true,  note: T('5×5 · 빈칸 9개 · 길이 뒤섞임') },
    easy:   { name: T('쉬움'),   step: 3, n: 5, show: 12, rounds: 3, limit: 420, bonus: 0, random: true,  note: T('5×5 · 빈칸 13개 · 길이 뒤섞임') },
    normal: { name: T('보통'),   step: 4, n: 6, show: 15, rounds: 2, limit: 480, bonus: 100, random: true, note: T('6×6 · 빈칸 21개 · 길이 뒤섞임') },
    hard:   { name: T('어려움'), step: 5, n: 7, show: 16, rounds: 2, limit: 600, bonus: 250, random: true, note: T('7×7 · 빈칸 33개 · 길이 뒤섞임') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];
  var S = null, root = null, timer = null, nextTimer = null, badTimer = null, els = {}, locked = false, mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clearPending() { if (nextTimer) clearTimeout(nextTimer); if (badTimer) clearTimeout(badTimer); nextTimer = badTimer = null; }

  function snakePath(n) {
    var path = [], r, c;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) path.push(r * n + (r % 2 ? n - 1 - c : c));
    return path;
  }

  /* 길을 무작정 꺾으면 중간에 갇혀 끝까지 못 가기 쉽다. 아직 갈 수 있는 길이 적은
     칸부터 먼저 고르는 방법으로 1부터 마지막까지 한 줄로 이어지는 길을 만든다.
     여러 번 해도 안 나오면 첫걸음용 뱀길로 돌아가므로 화면이 멈추지 않는다. */
  function randomPath(n) {
    var all = n * n, dirs = [[1,0],[-1,0],[0,1],[0,-1]], attempt, used, path, steps;
    function neighbors(at) {
      var r = Math.floor(at / n), c = at % n, out = [];
      dirs.forEach(function (d) {
        var rr = r + d[0], cc = c + d[1], next = rr * n + cc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && !used[next]) out.push(next);
      });
      return out;
    }
    function walk(at) {
      steps++;
      if (steps > 30000) return false;      /* 어려운 판도 잠시 멈추지 않게 한다 */
      used[at] = true; path.push(at);
      if (path.length === all) return true;
      var nexts = neighbors(at), i, j, t;
      for (i = nexts.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = nexts[i]; nexts[i] = nexts[j]; nexts[j] = t; }
      nexts.sort(function (a, b) { return neighbors(a).length - neighbors(b).length; });
      for (i = 0; i < nexts.length; i++) if (walk(nexts[i])) return true;
      used[at] = false; path.pop();
      return false;
    }
    for (attempt = 0; attempt < 80; attempt++) {
      used = []; path = []; steps = 0;
      if (walk(Math.floor(Math.random() * all))) return path;
    }
    return snakePath(n);
  }

  /* 1단계는 길의 규칙을 익히도록 단순하게 둔다. 2단계부터는 매번 다른 길을
     만들지만, 모든 숫자는 가로·세로로 이어져 있어 답이 없거나 끊기는 일은 없다. */
  function makeBoard(L) {
    var n = L.n, cells = [], i, pos = L.random ? randomPath(n) : snakePath(n);
    for (i = 0; i < n * n; i++) cells.push(0);
    pos.forEach(function (at, no) { cells[at] = no + 1; });

    var keep = { 1: 1 }; keep[n * n] = 1;
    var pool = [];
    for (i = 2; i < n * n; i++) pool.push(i);
    shuffle(pool).slice(0, Math.max(0, L.show - 2)).forEach(function (v) { keep[v] = 1; });
    var shown = cells.map(function (v) { return keep[v] ? v : 0; });
    return { n: n, answer: cells, shown: shown, next: 2 };
  }
  function makeSet(level, count) { var L = LEVELS[level] || LEVELS.easy, a = []; for (var i = 0; i < count; i++) a.push(makeBoard(L)); return a; }
  /* 처음부터 보이는 숫자는 누를 일이 없다. 다음 빈칸까지 건너뛰어, 언제나
     ‘지금 넣을 숫자’와 실제로 누를 칸이 한 쌍이 되게 한다. */
  function skipShown(b) { while (b.next <= b.answer.length && b.shown.indexOf(b.next) >= 0) b.next++; }
  function newGame(level) { var L = LEVELS[level]; S = { day: Store.dayKey(), level: level, boards: makeSet(level, L.rounds), r: 0, wrong: [], total: 0, elapsed: 0, done: false }; for (var i = 0; i < L.rounds; i++) S.wrong.push(0); persist(); }
  function persist() { if (S && !S.done) Store.saveSession('numpath', { day: S.day, level: S.level, boards: S.boards, r: S.r, wrong: S.wrong, total: S.total, elapsed: S.elapsed }); }
  function restore(s) { S = { day: s.day, level: LEVELS[s.level] ? s.level : 'easy', boards: s.boards, r: s.r || 0, wrong: s.wrong || [], total: s.total || 0, elapsed: s.elapsed || 0, done: false }; }

  function renderIntro() {
    stopTimer(); clearPending(); if (!mounted) return;
    var sess = Store.getSession('numpath'), best = Store.bestEver('numpath');
    root.innerHTML = '<section class="intro"><h2 class="intro__title">' + T('숫자 이어가기') + '</h2><p class="intro__desc">' + T('1부터 마지막 숫자까지 가로·세로로 이어지는 길입니다.') + '<br>' + T('판 위 숫자 다음에 들어갈 빈칸을 누르세요.') + '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>' +
      (best ? '<p class="intro__best">' + T('나의 최고 기록') + ' <b>' + UI.comma(best.score) + T('점') + '</b></p>' : '') +
      (sess && LEVELS[sess.level] ? '<button class="btn btn--accent btn--big" id="ntResume">' + T('이어서 하기') + ' <small>' + LEVELS[sess.level].name + ' · ' + T('{n}번째 판부터', { n: (sess.r || 0) + 1 }) + '</small></button>' : '') +
      '<div class="levels">' + ORDER.map(function (k) { var L = LEVELS[k]; return '<button class="level" data-level="' + k + '"><span class="level__step">' + T('{n}단계', { n: L.step }) + '</span><span class="level__name">' + L.name + '</span><span class="level__meta">' + L.note + ' · ' + T('{n}판 · 제한 {m}분', { n: L.rounds, m: Math.round(L.limit / 60) }) + '</span><span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span></button>'; }).join('') + '</div>' +
      '<button class="btn btn--ghost btn--print" id="ntPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button><button class="linkbtn" id="ntRules">' + T('점수 규칙 보기') + '</button></section>';
    root.querySelectorAll('.level').forEach(function (b) { b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); }); });
    var rb = root.querySelector('#ntResume'); if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#ntPrint').addEventListener('click', function () { Print.dialog('numpath'); });
    root.querySelector('#ntRules').addEventListener('click', function () { App.showRules('numpath'); });
  }

  function renderBoard() {
    if (!mounted) return; if (S.r >= S.boards.length) return finish();
    var L = lv(), b = S.boards[S.r]; skipShown(b); locked = false;
    root.innerHTML = '<section class="game numpath"><div class="hud"><div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>' + L.name + '</b></div><div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="ntTime">0:00</b></div><div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b>' + (S.r + 1) + '/' + S.boards.length + '</b></div></div>' +
      '<div class="nt-top"><span class="nt-top__lbl">' + T('지금 넣을 숫자') + '</span><b class="nt-next" id="ntNext">' + b.next + '</b></div><p class="mt-hint nt-msg" id="ntMsg">' + T('바로 앞 숫자와 가로·세로로 닿는 빈칸을 누르세요') + '</p>' +
      '<div class="nt-grid nt-grid--' + b.n + '" id="ntGrid">' + b.shown.map(function (v, i) { return '<button class="nt-cell' + (v ? ' is-given' : '') + '" data-i="' + i + '"' + (v ? ' disabled' : '') + '>' + (v || '') + '</button>'; }).join('') + '</div>' +
      '<div class="tools"><button class="tool" id="ntNew"><span>↺</span>' + T('새 문제') + '</button><button class="tool" id="ntQuit"><span>⏹</span>' + T('그만두기') + '</button><button class="tool" id="ntSwitch"><span>⇄</span>' + T('다른 게임') + '</button></div></section>';
    els = { time: root.querySelector('#ntTime'), next: root.querySelector('#ntNext'), msg: root.querySelector('#ntMsg'), grid: root.querySelector('#ntGrid') };
    els.grid.addEventListener('click', function (e) { var cell = e.target.closest('.nt-cell'); if (cell && !locked && !cell.disabled) tap(+cell.dataset.i, cell); });
    root.querySelector('#ntNew').addEventListener('click', function () { UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () { Store.clearSession('numpath'); S = null; renderIntro(); }, T('새로 시작')); });
    root.querySelector('#ntQuit').addEventListener('click', function () { UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기')); });
    root.querySelector('#ntSwitch').addEventListener('click', function () { App.gameSwitcher('numpath'); }); startTimer();
  }
  function tap(i, cell) {
    var b = S.boards[S.r];
    if (b.answer[i] !== b.next) { S.wrong[S.r]++; cell.classList.add('is-bad'); if (badTimer) clearTimeout(badTimer); badTimer = setTimeout(function () { cell.classList.remove('is-bad'); badTimer = null; }, 450); els.msg.innerHTML = '<b class="mt-no">' + T('그곳은 아니에요. 앞 숫자 옆을 살펴보세요') + '</b>'; UI.beep('no'); return; }
    b.shown[i] = b.next; cell.textContent = b.next; cell.disabled = true; cell.classList.add('is-done'); S.total++; b.next++; skipShown(b);
    if (b.next <= b.answer.length) { els.next.textContent = b.next; els.msg.textContent = T('바로 앞 숫자와 가로·세로로 닿는 빈칸을 누르세요'); UI.beep('tick'); persist(); return; }
    locked = true; stopTimer(); els.msg.innerHTML = '<b class="mt-ok">' + (S.wrong[S.r] ? T('판 완성!') : T('판 완성! 한 번도 틀리지 않았어요')) + '</b>'; UI.beep('ok'); S.r++; persist(); nextTimer = setTimeout(function () { if (!mounted || !S || S.done) return; S.r >= S.boards.length ? finish() : renderBoard(); }, 1000);
  }
  function startTimer() { stopTimer(); var L = lv(); els.time.textContent = UI.fmtTime(L.limit - S.elapsed); timer = setInterval(function () { if (!S || S.done || !mounted || locked) return; S.elapsed++; var left = L.limit - S.elapsed; els.time.textContent = UI.fmtTime(left); els.time.classList.toggle('is-urgent', left <= 30); if (S.elapsed % 10 === 0) persist(); if (left <= 0) finish(); }, 1000); }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }
  function score() { var L = lv(), total = L.rounds * (L.n * L.n - L.show), found = Math.min(total, S.total), all = S.r >= L.rounds, right = Math.round(600 * found / total), time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0, clean = 0; for (var i = 0; i < S.r; i++) if (!S.wrong[i]) clean++; return { right: right, time: time, focus: Math.round(100 * clean / L.rounds), bonus: all ? L.bonus : 0, found: found, total: total, clean: clean, all: all }; }
  function finish() { S.done = true; stopTimer(); clearPending(); Store.clearSession('numpath'); UI.beep('win'); var L = lv(), sc = score(), sum = sc.right + sc.time + sc.focus + sc.bonus; Store.addRecord({ game: 'numpath', score: sum, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name, duration: S.elapsed, detail: { found: sc.found, count: sc.total, wrongs: S.wrong.reduce(function (a, v) { return a + v; }, 0) } }); var rows = [{ label: T('이어가기 점수 ({a}/{b}칸)', { a: sc.found, b: sc.total }), value: sc.right }]; if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time }); rows.push({ label: T('집중 보너스 (틀리지 않은 판 {a}/{b})', { a: sc.clean, b: L.rounds }), value: sc.focus }); if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus }); UI.resultModal({ title: T('축하드립니다!'), score: sum, headline: T('숫자 이어가기 {n}단계 완료!', { n: L.step }), rows: rows, actions: (function () { var x = ORDER.indexOf(S.level), prev = ORDER[x - 1], next = ORDER[x + 1], a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('numpath'); } }]; if (prev) a.push({ label: T('이전 단계'), onClick: function () { newGame(prev); renderBoard(); } }); a.push({ label: T('한 판 더'), kind: next ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } }); if (next) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(next); renderBoard(); } }); return a; })() }); }
  return { art: '<path d="M5 5h5v5H5zM14 14h5v5h-5z"/><path d="M10 7.5h4M16.5 10v4"/><path d="M4 16h5"/>', id: 'numpath', name: T('숫자 이어가기'), tagline: T('숫자가 이어지는 길 완성하기'), rules: { title: T('숫자 이어가기 점수 규칙'), lines: [[T('난이도'), T('판이 커지고 빈칸이 늘어납니다 — 1단계 4×4 · 2~3단계 5×5 · 4단계 6×6 · 5단계 7×7')], [T('하는 법'), T('1부터 마지막 숫자까지 가로·세로로 맞닿은 길이 됩니다. 판 위에 보이는 다음 숫자가 들어갈 빈칸을 누릅니다')], [T('이어가기 점수'), T('최대 600점 · 바르게 채운 빈칸 수에 비례')], [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')], [T('집중 보너스'), T('최대 100점 · 한 번도 틀리지 않고 마친 판마다')], [T('오답 감점'), T('없음 — 잘못 누르면 그 칸이 잠깐 붉어질 뿐입니다')], [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')], [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')]] }, mount: function (container) { mounted = true; root = container; S && !S.done ? renderBoard() : renderIntro(); }, unmount: function () { mounted = false; stopTimer(); clearPending(); persist(); }, hasProgress: function () { return !!Store.getSession('numpath'); }, levels: LEVELS, levelOrder: ORDER, makeForPrint: function (level, count) { var key = LEVELS[level] ? level : 'easy', L = LEVELS[key]; return { level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name, n: L.n, boards: makeSet(key, count || 4) }; } };
})();
