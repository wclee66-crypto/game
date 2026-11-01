/* 새록 — 짝 맞추기
 * 점수: 짝 찾기 600 + 시간 300 + 기억 100 + 난이도 보너스
 *
 * 뒤집힌 카드를 두 장씩 열어 같은 그림을 찾는다. 두 장이 다르면 잠시 뒤 다시 덮인다.
 * 기억력 게임의 대표라, 2026-11-01 「두뇌 게임」 입구를 열며 가장 먼저 넣었다.
 * 그림만 있어 어느 나라에서나 그대로 통한다.
 *
 * 앞의 세 단계는 처음에 모든 카드를 몇 초 동안 펼쳐 보여 준다 —
 * 어디에 무엇이 있는지 아예 모르는 채로 시작하면 기억이 아니라 운이 되기 때문이다.
 *
 * 다른 카드를 열어도 점수는 깎이지 않는다. 적게 틀리고 마치면 「기억 보너스」가 붙는다.
 */
window.Games = window.Games || {};
window.Games.cardmatch = (function () {

  /* 카드 그림 16가지 — 그림자 맞추기(shadow.js)와 같은 도형 그림이다.
     카드마다 제 색을 정해 두어, 모양과 색 두 가지로 알아볼 수 있게 했다. */
  var ICONS = {
    apple:    ['#D6453F', '<circle cx="12" cy="14" r="7"/><rect x="10.7" y="2.5" width="1.6" height="4" rx="0.5"/><ellipse cx="15" cy="4.3" rx="2.6" ry="1.4" transform="rotate(35 15 4.3)"/>'],
    star:     ['#E0A100', '<polygon points="12,1.5 15,9 22.5,9 16.5,13.8 18.8,21.2 12,16.8 5.2,21.2 7.5,13.8 1.5,9 9,9"/>'],
    heart:    ['#E0457B', '<circle cx="8" cy="9" r="4.6"/><circle cx="16" cy="9" r="4.6"/><polygon points="3.6,10 20.4,10 12,21.5"/>'],
    balloon:  ['#7C5CD6', '<ellipse cx="12" cy="9" rx="6" ry="7.2"/><polygon points="9.5,16 14.5,16 12,19.5"/>'],
    moon:     ['#C98A16', '<path d="M13 2.5a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>'],
    cloud:    ['#3B8FD8', '<circle cx="8" cy="12" r="4"/><circle cx="13" cy="9.5" r="5"/><circle cx="18" cy="12" r="4"/><rect x="5" y="12" width="15" height="6" rx="3"/>'],
    house:    ['#B5562F', '<polygon points="12,3 3,11 21,11"/><rect x="5" y="11" width="14" height="9"/>'],
    tree:     ['#1F9D55', '<circle cx="12" cy="8" r="7"/><rect x="10.5" y="14" width="3" height="7"/>'],
    mug:      ['#6B4F3A', '<polygon points="5,6 19,6 17.5,20 6.5,20"/><rect x="18.5" y="9" width="3" height="6" rx="1.5"/>'],
    key:      ['#8A7A12', '<circle cx="7" cy="7" r="4.5"/><rect x="10.5" y="6" width="9.5" height="2"/><rect x="17" y="8" width="1.6" height="3"/><rect x="19.5" y="8" width="1.6" height="2.2"/>'],
    leaf:     ['#5E9E1E', '<ellipse cx="12" cy="12" rx="8" ry="4.5" transform="rotate(-40 12 12)"/><polygon points="6.5,17 8.5,17.5 7,19.5"/>'],
    fish:     ['#E8742A', '<ellipse cx="10" cy="12" rx="7" ry="4.6"/><polygon points="17,12 22,7 22,17"/>'],
    sailboat: ['#2F5BB8', '<polygon points="12,3 12,15 4,15"/><polygon points="2,16 22,16 18,21 6,21"/>'],
    flower:   ['#C2417A', '<circle cx="12" cy="6" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="12" cy="18" r="4"/><circle cx="6" cy="12" r="4"/><circle cx="12" cy="12" r="2.8"/>'],
    candle:   ['#D9822B', '<rect x="10" y="9" width="4" height="13" rx="1"/><ellipse cx="12" cy="5.5" rx="2" ry="3" transform="rotate(-8 12 5.5)"/>'],
    kite:     ['#0E8FA8', '<polygon points="12,2 20,12 12,22 4,12"/>']
  };
  var IDS = Object.keys(ICONS);

  /* pairs 짝 수 · cols 한 줄 카드 수 · rounds 판 수 · peek 처음에 펼쳐 보여 주는 초 */
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, pairs: 3,  cols: 3, rounds: 2, peek: 4, limit: 240, bonus: 0,
              note: T('카드 {n}장', { n: 6 }) },
    step2:  { name: T('가볍게'), step: 2, pairs: 4,  cols: 4, rounds: 2, peek: 3, limit: 270, bonus: 0,
              note: T('카드 {n}장', { n: 8 }) },
    easy:   { name: T('쉬움'),   step: 3, pairs: 6,  cols: 4, rounds: 2, peek: 2, limit: 330, bonus: 0,
              note: T('카드 {n}장', { n: 12 }) },
    normal: { name: T('보통'),   step: 4, pairs: 8,  cols: 4, rounds: 2, peek: 0, limit: 420, bonus: 100,
              note: T('카드 {n}장', { n: 16 }) },
    hard:   { name: T('어려움'), step: 5, pairs: 10, cols: 5, rounds: 2, peek: 0, limit: 480, bonus: 250,
              note: T('카드 {n}장', { n: 20 }) }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null, root = null, timer = null, els = {}, locked = false;
  var nextTimer = null, flipTimer = null, peekTimer = null;
  var open = [];                    /* 지금 펼쳐 둔 카드 (아직 짝이 정해지지 않은 것) — 저장하지 않는다 */
  var mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }
  function clearPending() {
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
    if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; }
    if (peekTimer) { clearTimeout(peekTimer); peekTimer = null; }
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ================= 판 만들기 ================= */

  /** 카드 한 벌 — 그림 pairs 가지를 두 장씩 섞어 놓는다 */
  function makeDeck(pairs) {
    var ids = shuffle(IDS.slice()).slice(0, pairs);
    return shuffle(ids.concat(ids));
  }
  function makeSet(level, rounds) {
    var L = LEVELS[level] || LEVELS.easy, out = [];
    for (var r = 0; r < rounds; r++) out.push(makeDeck(L.pairs));
    return out;
  }
  function iconSvg(id, black) {
    var ic = ICONS[id];
    return '<svg viewBox="0 0 24 24" fill="' + (black ? '#000' : ic[0]) + '" aria-hidden="true">' + ic[1] + '</svg>';
  }

  /* ================= 상태 ================= */

  function newGame(level) {
    var L = LEVELS[level];
    S = {
      day: Store.dayKey(), level: level,
      decks: makeSet(level, L.rounds),
      r: 0, doneIdx: [], found: 0, misses: 0, peeked: false,
      elapsed: 0, done: false
    };
    persist();
  }
  function persist() {
    if (!S || S.done) return;
    Store.saveSession('cardmatch', {
      day: S.day, level: S.level, decks: S.decks, r: S.r, doneIdx: S.doneIdx,
      found: S.found, misses: S.misses, peeked: S.peeked, elapsed: S.elapsed
    });
  }
  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      decks: s.decks, r: s.r || 0, doneIdx: s.doneIdx || [],
      found: s.found || 0, misses: s.misses || 0, peeked: !!s.peeked,
      elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    clearPending();
    if (!mounted) return;
    var sess = Store.getSession('cardmatch');
    var best = Store.bestEver('cardmatch');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('짝 맞추기') + '</h2>') +
        ('<p class="intro__desc">' + T('뒤집힌 카드를 두 장씩 열어 같은 그림을 찾습니다.') + '<br>' +
          T('다른 그림이면 다시 덮이니, 어디에 있었는지 기억해 두세요.') +
          '<br><small>' + T('틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="cmResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{n}번째 판부터', { n: (sess.r || 0) + 1 }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' · ' + T('{n}판 · 제한 {m}분', { n: L.rounds, m: Math.round(L.limit / 60) }) +
                (L.peek ? ' · ' + T('처음 {n}초 보여 줌', { n: L.peek }) : '') + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="cmPrint">' + T('오려 쓰는 종이 카드 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="cmRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#cmResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#cmPrint').addEventListener('click', function () { Print.dialog('cardmatch'); });
    root.querySelector('#cmRules').addEventListener('click', function () { App.showRules('cardmatch'); });
  }

  /* ================= 화면: 판 ================= */

  function renderBoard() {
    if (!mounted) return;
    var L = lv();
    if (S.r >= S.decks.length) return finish();
    var deck = S.decks[S.r];
    open = [];
    /* 펼쳐 보여 주기는 판마다 처음 한 번만 — 이어서 할 때 또 보여 주면 그만큼 쉬워진다 */
    var peek = L.peek && !S.peeked && !S.doneIdx.length;
    locked = !!peek;

    root.innerHTML =
      '<section class="game cardmatch">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="cmTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('판') + '</span><b>') + (S.r + 1) + '/' + S.decks.length + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('찾은 짝') + '</span><b id="cmFound">') + (S.doneIdx.length / 2) + '/' + L.pairs + '</b></div>' +
        '</div>' +

        ('<p class="mt-hint" id="cmMsg">' + (peek ? T('카드 자리를 잘 봐 두세요') : T('카드를 두 장씩 눌러 같은 그림을 찾으세요')) + '</p>') +

        '<div class="cm-grid" id="cmGrid" style="--cols:' + L.cols + '">' +
          deck.map(function (id, i) {
            var done = S.doneIdx.indexOf(i) >= 0;
            return '<button class="cm-card' + (done ? ' is-done is-up' : (peek ? ' is-up' : '')) + '" data-i="' + i + '" aria-label="' + T('카드 {n}', { n: i + 1 }) + '">' +
              '<span class="cm-back"></span>' +
              '<span class="cm-face">' + iconSvg(id) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +

        '<div class="tools">' +
          ('<button class="tool" id="cmNew"><span>↺</span>' + T('새 문제') + '</button>') +
          ('<button class="tool" id="cmQuit"><span>⏹</span>' + T('그만두기') + '</button>') +
          ('<button class="tool" id="cmSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time: root.querySelector('#cmTime'),
      msg: root.querySelector('#cmMsg'),
      found: root.querySelector('#cmFound'),
      grid: root.querySelector('#cmGrid')
    };

    els.grid.addEventListener('click', function (e) {
      var c = e.target.closest('.cm-card');
      if (!c || locked || c.classList.contains('is-up')) return;
      flip(parseInt(c.dataset.i, 10), c);
    });
    root.querySelector('#cmNew').addEventListener('click', function () {
      UI.confirm(T('새 문제'), T('지금 판을 그만두고 난이도부터 다시 고르시겠어요?'), function () {
        Store.clearSession('cardmatch'); S = null; renderIntro();
      }, T('새로 시작'));
    });
    root.querySelector('#cmQuit').addEventListener('click', function () {
      UI.confirm(T('그만두기'), T('지금까지 푼 만큼만 점수로 기록됩니다. 그만둘까요?'), function () { finish(); }, T('그만두기'));
    });
    root.querySelector('#cmSwitch').addEventListener('click', function () { App.gameSwitcher('cardmatch'); });

    startTimer();

    if (peek) {
      peekTimer = setTimeout(function () {
        peekTimer = null;
        if (!mounted || !S || S.done) return;
        S.peeked = true;
        persist();
        els.grid.querySelectorAll('.cm-card:not(.is-done)').forEach(function (c) { c.classList.remove('is-up'); });
        els.msg.textContent = T('카드를 두 장씩 눌러 같은 그림을 찾으세요');
        locked = false;
      }, L.peek * 1000);
    }
  }

  function flip(i, card) {
    card.classList.add('is-up');
    open.push({ i: i, el: card });
    if (open.length < 2) { UI.beep('tick'); return; }

    var a = open[0], b = open[1], deck = S.decks[S.r];
    open = [];

    if (deck[a.i] !== deck[b.i]) {
      /* 다른 그림 — 잠시 보여 준 뒤 다시 덮는다. 그동안은 다른 카드를 못 누른다 */
      S.misses++;
      locked = true;
      els.msg.innerHTML = '<b class="mt-no">' + T('다른 그림이에요. 자리를 기억해 두세요') + '</b>';
      UI.beep('no');
      flipTimer = setTimeout(function () {
        flipTimer = null;
        a.el.classList.remove('is-up');
        b.el.classList.remove('is-up');
        locked = false;
        if (els.msg) els.msg.textContent = T('카드를 두 장씩 눌러 같은 그림을 찾으세요');
      }, 1000);
      persist();
      return;
    }

    a.el.classList.add('is-done');
    b.el.classList.add('is-done');
    S.doneIdx.push(a.i, b.i);
    S.found++;
    var L = lv(), got = S.doneIdx.length / 2;
    els.found.textContent = got + '/' + L.pairs;

    if (got < L.pairs) {
      els.msg.innerHTML = '<b class="mt-ok">' + T('짝을 찾았어요!') + '</b>';
      UI.beep('ok');
      persist();
      return;
    }

    /* 한 판 끝 */
    locked = true;
    stopTimer();
    els.msg.innerHTML = '<b class="mt-ok">' + T('판 완성!') + '</b>';
    UI.beep('ok');
    S.r++;
    S.doneIdx = [];
    S.peeked = false;
    persist();
    clearPending();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      if (!mounted || !S || S.done) return;
      if (S.r >= S.decks.length) finish();
      else renderBoard();
    }, 1100);
  }

  /* ================= 시간 ================= */

  function startTimer() {
    stopTimer();
    var L = lv();
    els.time.textContent = UI.fmtTime(L.limit - S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done || !mounted) return;
      if (locked && !flipTimer) return;          /* 펼쳐 보여 주는 동안·판 사이에는 시간을 세지 않는다 */
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
    var total = L.pairs * L.rounds;
    var found = Math.min(total, S.found);
    var right = Math.round(600 * found / total);
    var all = S.r >= L.rounds;
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    /* 기억 보너스 — 짝 수만큼까지는 틀려도 괜찮고, 그보다 많이 틀릴수록 줄어든다.
       처음 보는 카드는 누구나 한 번은 틀리기 마련이라 넉넉하게 잡았다. */
    var memo = found ? Math.round(100 * Math.max(0, Math.min(1, 1 - (S.misses - found) / (found * 2)))) : 0;
    var bonus = all ? L.bonus : 0;
    return {
      right: right, time: time, memo: memo, bonus: bonus,
      total: right + time + memo + bonus,
      found: found, count: total, misses: S.misses, all: all
    };
  }

  function finish() {
    S.done = true;
    stopTimer();
    clearPending();
    Store.clearSession('cardmatch');
    UI.beep('win');

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'cardmatch', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name,
      duration: S.elapsed,
      detail: { found: sc.found, count: sc.count, misses: sc.misses }
    });

    var rows = [
      { label: T('짝 찾기 점수 ({a}/{b}쌍)', { a: sc.found, b: sc.count }), value: sc.right }
    ];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('기억 보너스 (다른 그림을 연 횟수 {n}번)', { n: sc.misses }), value: sc.memo });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });

    UI.resultModal({
      title: T('축하드립니다!'),
      score: sc.total,
      headline: T('짝 맞추기 {n}단계 완료!', { n: L.step }),
      rows: rows,
      actions: (function () {
        var idx = ORDER.indexOf(S.level);
        var prv = ORDER[idx - 1], nxt = ORDER[idx + 1];
        var a = [{ label: T('다른 게임'), onClick: function () { App.gameSwitcher('cardmatch'); } }];
        if (prv) a.push({ label: T('이전 단계'), onClick: function () { newGame(prv); renderBoard(); } });
        a.push({ label: T('한 판 더'), kind: nxt ? undefined : 'accent', onClick: function () { S = null; renderIntro(); } });
        if (nxt) a.push({ label: T('다음 단계'), kind: 'accent', onClick: function () { newGame(nxt); renderBoard(); } });
        return a;
      })()
    });
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<rect x="3" y="4" width="8" height="11" rx="1.5"/><rect x="13" y="9" width="8" height="11" rx="1.5"/>' +
         '<circle cx="17" cy="14.5" r="2"/>',
    id: 'cardmatch', name: T('짝 맞추기'), tagline: T('같은 그림 카드 찾기'),
    rules: {
      title: T('짝 맞추기 점수 규칙'),
      lines: [
        [T('난이도'), T('카드가 늘어납니다 — 1단계 6장 · 2단계 8장 · 3단계 12장 · 4단계 16장 · 5단계 20장')],
        [T('하는 법'), T('카드를 두 장씩 엽니다. 같은 그림이면 그대로 남고, 다르면 다시 덮입니다')],
        [T('미리 보기'), T('1~3단계는 판을 시작할 때 모든 카드를 몇 초 동안 보여 줍니다')],
        [T('짝 찾기 점수'), T('최대 600점 · 찾은 짝 수에 비례')],
        [T('시간 보너스'), T('최대 300점 · 끝까지 풀었을 때만, 남은 시간에 비례')],
        [T('기억 보너스'), T('최대 100점 · 다른 그림을 적게 열수록 많이')],
        [T('오답 감점'), T('없음 — 다른 그림이면 다시 덮일 뿐입니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (끝까지 풀었을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () {
      mounted = false;
      stopTimer(); clearPending(); persist();
    },
    hasProgress: function () { return !!Store.getSession('cardmatch'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용 — 오려서 쓰는 카드 한 벌. 요양 기관에서 탁자 위에 펼쳐 놓고 함께 한다 */
    makeForPrint: function (level) {
      var key = LEVELS[level] ? level : 'easy';
      var L = LEVELS[key];
      return {
        level: key, levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        pairs: L.pairs, cols: L.cols,
        /* 종이 카드는 색을 그대로 둔다 — 흑백 인쇄기에서도 모양이 달라 짝을 가릴 수 있다 */
        cards: makeDeck(L.pairs).map(function (id) { return iconSvg(id); })
      };
    }
  };
})();
