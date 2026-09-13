/* 새록 — 그림자 맞추기
 * 점수: 정답 600 + 시간 300 + 연속 100 + 난이도 보너스
 *
 * 위에 초록색 그림 하나가 나오고, 아래 여러 검정 그림자 중에서
 * 같은 모양을 찾아 누른다. 말이 하나도 필요 없어 어느 나라에서나 그대로 통하고,
 * 그림은 도형(원·네모·세모)만으로 그려 낸 것이라 문제가 마르지 않는다.
 *
 * 도형 세기(shapecount.js)와 같은 틀을 따랐다 — 답을 누르면 확인 단추 없이 바로 채점된다.
 */
window.Games = window.Games || {};
window.Games.shadow = (function () {

  /* 물건 그림 16가지 — currentColor 로 채워, 화면(초록·검정)과 인쇄(검정)에서 알아서 색이 정해진다.
     선(테두리) 없이 면만으로 그려서, 겹친 도형끼리도 하나로 뭉쳐 보인다. */
  var ICONS = {
    apple:    '<circle cx="12" cy="14" r="7"/><rect x="10.7" y="2.5" width="1.6" height="4" rx="0.5"/><ellipse cx="15" cy="4.3" rx="2.6" ry="1.4" transform="rotate(35 15 4.3)"/>',
    star:     '<polygon points="12,1.5 15,9 22.5,9 16.5,13.8 18.8,21.2 12,16.8 5.2,21.2 7.5,13.8 1.5,9 9,9"/>',
    heart:    '<circle cx="8" cy="9" r="4.6"/><circle cx="16" cy="9" r="4.6"/><polygon points="3.6,10 20.4,10 12,21.5"/>',
    balloon:  '<ellipse cx="12" cy="9" rx="6" ry="7.2"/><polygon points="9.5,16 14.5,16 12,19.5"/>',
    moon:     '<path d="M13 2.5a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>',
    cloud:    '<circle cx="8" cy="12" r="4"/><circle cx="13" cy="9.5" r="5"/><circle cx="18" cy="12" r="4"/><rect x="5" y="12" width="15" height="6" rx="3"/>',
    house:    '<polygon points="12,3 3,11 21,11"/><rect x="5" y="11" width="14" height="9"/>',
    tree:     '<circle cx="12" cy="8" r="7"/><rect x="10.5" y="14" width="3" height="7"/>',
    mug:      '<polygon points="5,6 19,6 17.5,20 6.5,20"/><rect x="18.5" y="9" width="3" height="6" rx="1.5"/>',
    key:      '<circle cx="7" cy="7" r="4.5"/><rect x="10.5" y="6" width="9.5" height="2"/><rect x="17" y="8" width="1.6" height="3"/><rect x="19.5" y="8" width="1.6" height="2.2"/>',
    leaf:     '<ellipse cx="12" cy="12" rx="8" ry="4.5" transform="rotate(-40 12 12)"/><polygon points="6.5,17 8.5,17.5 7,19.5"/>',
    fish:     '<ellipse cx="10" cy="12" rx="7" ry="4.6"/><polygon points="17,12 22,7 22,17"/>',
    sailboat: '<polygon points="12,3 12,15 4,15"/><polygon points="2,16 22,16 18,21 6,21"/>',
    flower:   '<circle cx="12" cy="6" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="12" cy="18" r="4"/><circle cx="6" cy="12" r="4"/><circle cx="12" cy="12" r="2.8"/>',
    candle:   '<rect x="10" y="9" width="4" height="13" rx="1"/><ellipse cx="12" cy="5.5" rx="2" ry="3" transform="rotate(-8 12 5.5)"/>',
    kite:     '<polygon points="12,2 20,12 12,22 4,12"/>'
  };
  var IDS = Object.keys(ICONS);

  /* opts 보기 개수 — 단계가 오를수록 보기가 늘어 찾기 어려워진다 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, count: 6,  limit: 300, bonus: 0,   opts: 3,
              note: T('보기 3개 중에서 찾아요') },
    step2:  { name: T('가볍게'), step: 2, count: 8,  limit: 300, bonus: 0,   opts: 4,
              note: T('보기 4개 중에서 찾아요') },
    easy:   { name: T('쉬움'),   step: 3, count: 10, limit: 360, bonus: 0,   opts: 5,
              note: T('보기 5개 중에서 찾아요') },
    normal: { name: T('보통'),   step: 4, count: 10, limit: 420, bonus: 100, opts: 6,
              note: T('보기 6개 중에서 찾아요') },
    hard:   { name: T('어려움'), step: 5, count: 12, limit: 480, bonus: 250, opts: 8,
              note: T('보기 8개 중에서 찾아요') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null;
  var mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }

  /** 아이디 목록에서 n개를 겹치지 않게 뽑는다 */
  function pickN(n) {
    var pool = IDS.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n);
  }

  /** 문제 하나 — target 은 위에 초록으로 보여 줄 그림, opts 는 아래 그림자 보기(뒤섞임) */
  function makeProblem(L) {
    var ids = pickN(L.opts);
    var target = ids[Math.floor(Math.random() * ids.length)];
    return { target: target, opts: ids };
  }
  function makeSet(level, count) {
    var L = LEVELS[level] || LEVELS.easy;
    var out = [];
    for (var i = 0; i < count; i++) out.push(makeProblem(L));
    return out;
  }
  function iconSvg(id, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="currentColor">' + ICONS[id] + '</svg>';
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = { day: Store.dayKey(), level: level, probs: makeSet(level, L.count), i: 0, picks: [], elapsed: 0, done: false };
    persist();
  }
  function persist() {
    if (!S || S.done) return;
    Store.saveSession('shadow', { day: S.day, level: S.level, probs: S.probs, i: S.i, picks: S.picks, elapsed: S.elapsed });
  }
  function restore(s) {
    S = { day: s.day, level: LEVELS[s.level] ? s.level : 'easy', probs: s.probs, i: s.i, picks: s.picks, elapsed: s.elapsed || 0, done: false };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('shadow');
    var best = Store.bestEver('shadow');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('그림자 맞추기') + '</h2>') +
        ('<p class="intro__desc">' + T('위 그림과 똑같은 모양의 그림자를 아래에서 찾아 누릅니다.') + '<br>' +
          T('누르면 바로 채점됩니다.') + '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="sdResume">' + T('이어서 하기') + ' <small>') +
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
        ('<button class="btn btn--ghost btn--print" id="sdPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="sdRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderQuestion(); });
    });
    var rb = root.querySelector('#sdResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderQuestion(); });
    root.querySelector('#sdPrint').addEventListener('click', function () { Print.dialog('shadow'); });
    root.querySelector('#sdRules').addEventListener('click', function () { App.showRules('shadow'); });
  }

  /* ================= 화면: 문제 ================= */

  function renderQuestion() {
    if (!mounted) return;
    if (S.i >= S.probs.length) return finish();
    var L = lv(), p = S.probs[S.i];
    locked = false;
    var right = S.picks.filter(function (x) { return x.correct; }).length;

    root.innerHTML =
      '<section class="game shadow">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="sdTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('문제') + '</span><b id="sdNo">') + (S.i + 1) + '/' + S.probs.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('맞힘') + '</span><b id="sdRight">') + right + '</b></div>' +
        '</div>' +

        '<div class="sd-card">' +
          ('<p class="mt-hint sd-q">' + T('이 그림과 같은 그림자를 찾으세요') + '</p>') +
          iconSvg(p.target, 'sd-target') +
        '</div>' +

        '<div class="sd-grid" id="sdGrid" style="grid-template-columns:repeat(' + Math.min(4, p.opts.length) + ',1fr)">' +
          p.opts.map(function (id, k) {
            return '<button class="sd-opt" data-id="' + id + '" data-k="' + k + '">' + iconSvg(id, 'sd-opt-svg') + '</button>';
          }).join('') +
        '</div>' +
        ('<p class="mt-hint" id="sdMsg">' + T('그림자를 누르면 저절로 채점됩니다') + '</p>') +

        '<div class="tools">' +
          ('<button class="tool" id="sdNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="sdQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="sdSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#sdTime'),
      msg: root.querySelector('#sdMsg'),
      right: root.querySelector('#sdRight'),
      grid: root.querySelector('#sdGrid')
    };

    els.grid.addEventListener('click', function (e) {
      var b = e.target.closest('.sd-opt');
      if (!b || locked) return;
      submit(b.dataset.id, b);
    });
    root.querySelector('#sdNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('shadow'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#sdQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#sdSwitch').addEventListener('click', function () { App.gameSwitcher('shadow'); });

    startTimer();
  }

  function submit(id, keyEl) {
    if (locked) return;
    locked = true;
    stopTimer();

    var p = S.probs[S.i];
    var ok = id === p.target;
    S.picks.push({ input: id, correct: ok });

    if (keyEl) keyEl.classList.add(ok ? 'is-good' : 'is-bad');
    if (!ok) {
      /* 틀렸을 때는 바른 그림자에도 초록 테를 둘러 보여 준다 */
      var right = els.grid.querySelector('[data-id="' + p.target + '"]');
      if (right) right.classList.add('is-answer');
    }
    els.msg.innerHTML = ok
      ? ('<b class="mt-ok">' + T('정답입니다') + '</b>')
      : ('<b class="mt-no">' + T('바로 이 그림자입니다') + '</b>');
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
    return { right: right, time: time, combo: combo, bonus: bonus, total: right + time + combo + bonus,
             correct: correct, count: total, streak: best, all: all };
  }

  function finish() {
    S.done = true;
    stopTimer();
    clearPending();
    Store.clearSession('shadow');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'shadow', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed, detail: { correct: sc.correct, count: sc.count, streak: sc.streak }
    });

    var rows = [{ label: T('정답 점수 ({a}/{b}문제)', { a: sc.correct, b: sc.count }), value: sc.right }];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('연속 정답 보너스 (최대 {n}연속)', { n: sc.streak }), value: sc.combo });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('그림자 맞추기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('shadow'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderQuestion(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderQuestion(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    /* 다른 게임과 같은 선 그림(테두리만) 방식이다 — 별 하나와, 오른쪽 아래로 살짝 비켜 겹친
       그림자 별을 나란히 그려 '같은 모양 찾기'를 나타낸다 */
    art: '<path d="M8,2 L10,6.6 15,7 11.2,10.2 12.3,15 8,12.3 3.7,15 4.8,10.2 1,7 6,6.6 Z"/>' +
         '<path d="M15,9 L17,13.6 22,14 18.2,17.2 19.3,22 15,19.3 10.7,22 11.8,17.2 8,14 13,13.6 Z"/>',
    id: 'shadow', name: T('그림자 맞추기'), tagline: T('같은 모양의 그림자 찾기'),
    rules: {
      title: T('그림자 맞추기 점수 규칙'),
      lines: [
        [T('난이도'), T('단계가 올라갈수록 보기 그림자 수가 늘어납니다 — 1단계 3개 · 2단계 4개 · 3단계 5개 · 4단계 6개 · 5단계 8개')],
        [T('답 넣는 법'), T('위 초록 그림과 똑같은 모양의 검정 그림자를 아래에서 눌러 고릅니다')],
        [T('정답 점수'), T('최대 600점 · 맞힌 문제 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('연속 정답 보너스'), T('최대 100점 · 3연속 25 / 4연속 50 / 5연속 75 / 6연속 이상 100')],
        [T('오답 감점'), T('없음 — 틀리면 바른 그림자를 보여 주고 다음 문제로 넘어갑니다')],
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
    unmount: function () { mounted = false; stopTimer(); clearPending(); persist(); },
    hasProgress: function () { return !!Store.getSession('shadow'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 — 그림 여러 판, 보기는 기호(가나다)로 적어 종이에서도 답을 쓸 수 있게 한다 */
    makeForPrint: function (level, count) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      var items = makeSet(key, count || 6).map(function (p) {
        var ai = p.opts.indexOf(p.target);
        return {
          targetSvg: iconSvg(p.target, 'ps-sdt'),
          opts: p.opts.map(function (id) { return iconSvg(id, 'ps-sdoptsvg'); }),
          a: ai + 1
        };
      });
      return { level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name, note: L.note, items: items };
    }
  };
})();
