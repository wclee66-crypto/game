/* 새록 — 색칠 공부
 *
 * 번호가 적힌 칸을, 그 번호의 색으로 칠하는 놀이입니다.
 * 색을 하나 고른 뒤 같은 번호의 칸을 눌러 칠합니다.
 *
 * 점수: 칠한 칸 700 + 정확도 200 + 시간 100 − (힌트 30/회) + 난이도 보너스
 * '마음대로 칠하기'는 점수를 매기지 않는 쉼터입니다.
 */
window.Games = window.Games || {};
window.Games.coloring = (function () {

  var LEVELS = {
    step1:  { name: '첫걸음', step: 1, detail: 1, colors: 4,  bonus: 0,   note: '아주 큰 칸 · 색 4가지' },
    step2:  { name: '가볍게', step: 2, detail: 2, colors: 5,  bonus: 0,   note: '큰 칸 · 색 5가지' },
    easy:   { name: '쉬움',   step: 3, detail: 3, colors: 6,  bonus: 0,   note: '칸 30개쯤 · 색 6가지' },
    normal: { name: '보통',   step: 4, detail: 4, colors: 8,  bonus: 100, note: '칸 40개쯤 · 색 8가지' },
    hard:   { name: '어려움', step: 5, detail: 5, colors: 10, bonus: 250, note: '칸 50개쯤 · 색 10가지' }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  var S = null;          // 지금 판 (없으면 null)
  var pic = null;        // 지금 그림 (경로·번호) — 저장하지 않고 씨앗값으로 다시 만든다
  var root = null, timer = null, els = {};
  var mounted = false;
  var picked = 0;        // 지금 고른 색 번호 (0이면 아직 안 고름, -1이면 지우개)
  var blinkTimer = null;

  /* ================= 말 다듬기 ================= */
  /* '5가 적힌 칸' vs '6이 적힌 칸' — 숫자를 읽는 소리에 받침이 있는지로 갈린다.
     (일·삼·육·칠·팔·십은 받침이 있고, 이·사·오·구는 없다) */
  var NUM_BATCHIM = { 1: 1, 3: 1, 6: 1, 7: 1, 8: 1, 10: 1 };
  function numJosa(n, withB, noB) { return n + (NUM_BATCHIM[n] ? withB : noB); }

  /** 낱말 끝 글자에 받침이 있는가 — '초록을' vs '노랑를' 을 가르기 위해 */
  function josa(word, withB, noB) {
    var c = word.charCodeAt(word.length - 1) - 0xAC00;
    return word + ((c >= 0 && c <= 11171 && c % 28 !== 0) ? withB : noB);
  }

  /* ================= 판 만들기 ================= */

  function build() {
    var L = LEVELS[S.level];
    pic = PICTURES.make(S.picId, { detail: L.detail, colors: L.colors, seed: S.seed });
    S.picId = pic.id;
    if (!S.fills || S.fills.length !== pic.regions.length) {
      S.fills = pic.regions.map(function () { return 0; });
    }
  }

  function newGame(level, picId, free) {
    S = {
      day: Store.dayKey(), level: level, picId: picId || 'random', free: !!free,
      seed: (Math.random() * 0x7FFFFFFF) | 0,
      fills: null, wrong: 0, hints: 0, elapsed: 0, done: false
    };
    build();
    picked = 0;
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('coloring', {
      day: S.day, level: S.level, picId: S.picId, free: S.free, seed: S.seed,
      fills: S.fills, wrong: S.wrong, hints: S.hints, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: s.level, picId: s.picId, free: !!s.free, seed: s.seed,
      fills: s.fills, wrong: s.wrong || 0, hints: s.hints || 0, elapsed: s.elapsed || 0, done: false
    };
    build();
    picked = 0;
  }

  function doneCount() {
    var n = 0;
    for (var i = 0; i < S.fills.length; i++) if (S.fills[i]) n++;
    return n;
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    stopBlink();
    if (!mounted) return;
    var sess = Store.getSession('coloring');
    var best = Store.bestEver('coloring');

    root.innerHTML =
      '<section class="intro">' +
        '<div class="intro__mark">색</div>' +
        '<h2 class="intro__title">색칠 공부</h2>' +
        '<p class="intro__desc">색을 하나 고른 다음<br>같은 번호가 적힌 칸을 누르면 칠해집니다.<br>' +
          '<small>다 칠한 그림은 종이로 인쇄할 수 있습니다.</small></p>' +
        (best ? '<p class="intro__best">나의 최고 기록 <b>' + UI.comma(best.score) + '점</b></p>' : '') +
        (sess ? '<button class="btn btn--accent btn--big" id="clResume">이어서 하기 <small>' +
                  LEVELS[sess.level].name + ' · ' + sess.fills.filter(Boolean).length + '/' + sess.fills.length + '칸 칠함</small></button>' : '') +

        '<h3 class="intro__sub">어떻게 칠할까요?</h3>' +
        '<div class="row2 cl-modes" id="clMode">' +
          '<button class="btn is-on" data-mode="num">번호대로<small>점수가 기록됩니다</small></button>' +
          '<button class="btn" data-mode="free">마음대로<small>점수 없이 편하게</small></button>' +
        '</div>' +

        '<h3 class="intro__sub">어떤 그림을 칠할까요?</h3>' +
        '<div class="chips" id="clPics">' +
          '<button class="chip is-on" data-pic="random">아무거나</button>' +
          PICTURES.list.map(function (p) {
            return '<button class="chip" data-pic="' + p.id + '">' + UI.esc(p.name) + '</button>';
          }).join('') +
        '</div>' +

        '<h3 class="intro__sub">단계를 누르면 시작합니다</h3>' +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + L.step + '단계</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? '난이도 보너스 +' + L.bonus : '기본') + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +

        '<button class="btn btn--ghost btn--print" id="clPrint">종이 도안 만들기 <small>A4 인쇄 · PDF 저장</small></button>' +
        '<button class="linkbtn" id="clRules">점수 규칙 보기</button>' +
      '</section>';

    var wantPic = 'random', wantFree = false;

    root.querySelectorAll('#clMode button').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('#clMode button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        wantFree = b.dataset.mode === 'free';
        root.querySelectorAll('.level').forEach(function (lv) {
          var L = LEVELS[lv.dataset.level];
          lv.querySelector('.level__bonus').textContent = wantFree
            ? '번호 없이 마음대로'
            : (L.bonus ? '난이도 보너스 +' + L.bonus : '기본');
        });
      });
    });
    root.querySelectorAll('#clPics .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('#clPics .chip').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        wantPic = b.dataset.pic;
      });
    });
    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level, wantPic, wantFree); renderBoard(); });
    });
    var rb = root.querySelector('#clResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#clPrint').addEventListener('click', function () { Print.dialog('coloring'); });
    root.querySelector('#clRules').addEventListener('click', function () { App.showRules('coloring'); });
  }

  /* ================= 화면: 색칠판 ================= */

  function svgMarkup() {
    var s = '<svg class="cl-svg" id="clSvg" viewBox="' + pic.viewBox + '" ' +
            'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + UI.esc(pic.name) + ' 색칠 그림">';
    pic.regions.forEach(function (r, i) {
      s += '<path class="cl-rg" data-i="' + i + '" d="' + r.d + '" fill="#FFFFFF"></path>';
    });
    pic.strokes.forEach(function (d) {
      s += '<path class="cl-line" d="' + d + '"></path>';
    });
    if (!S.free) {
      pic.regions.forEach(function (r, i) {
        s += '<text class="cl-num" data-i="' + i + '" x="' + r.x + '" y="' + r.y + '">' + r.c + '</text>';
      });
    }
    return s + '</svg>';
  }

  function paletteMarkup() {
    /* 번호대로 칠할 때는 그림에 쓰인 색만, 마음대로 칠할 때는 그 단계의 모든 색을 내놓는다 */
    var list = pic.colors.slice();
    if (S.free) {
      list = [];
      for (var n = 1; n <= LEVELS[S.level].colors; n++) list.push(n);
    }
    return '<div class="cl-palette" id="clPal">' +
      list.map(function (n) {
        /* 노랑·분홍·하늘처럼 밝은 색 위에는 번호를 검게 써야 잘 보인다 */
        var dark = (n === 2 || n === 7 || n === 8) ? ' is-dark' : '';
        return '<button class="cl-color" data-c="' + n + '" aria-label="' + PICTURES.nameOf(n) + '">' +
          '<span class="cl-color__dot' + dark + '" style="background:' + PICTURES.hexOf(n) + '">' + (S.free ? '' : n) + '</span>' +
          '<span class="cl-color__nm">' + PICTURES.nameOf(n) + '</span></button>';
      }).join('') +
      '<button class="cl-color cl-color--eraser" data-c="-1" aria-label="지우개">' +
        '<span class="cl-color__dot">↺</span><span class="cl-color__nm">지우개</span></button>' +
    '</div>';
  }

  function renderBoard() {
    if (!mounted) return;
    var L = LEVELS[S.level];

    root.innerHTML =
      '<section class="game coloring">' +
        '<div class="hud">' +
          '<div class="hud__item"><span class="hud__lbl">그림</span><b>' + UI.esc(pic.name) + '</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">칠한 칸</span><b id="clDone">0</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">' + (S.free ? '단계' : '실수') + '</span><b id="clWrong">0</b></div>' +
          '<div class="hud__item"><span class="hud__lbl">시간</span><b id="clTime">0:00</b></div>' +
        '</div>' +
        '<div class="cl-stage">' + svgMarkup() + '</div>' +
        '<p class="cl-tip" id="clTip">아래에서 색을 고른 뒤, 그 번호가 적힌 칸을 누르세요.</p>' +
        paletteMarkup() +
        '<div class="tools">' +
          (S.free ? '' : '<button class="tool" id="clHint"><span>💡</span>어디에 칠하나</button>') +
          '<button class="tool" id="clPrintNow"><span>🖨</span>종이로 인쇄</button>' +
          '<button class="tool" id="clNew"><span>↺</span>새 그림</button>' +
          '<button class="tool" id="clSwitch"><span>⇄</span>다른 게임</button>' +
        '</div>' +
      '</section>';

    els = {
      svg: root.querySelector('#clSvg'),
      done: root.querySelector('#clDone'),
      wrong: root.querySelector('#clWrong'),
      time: root.querySelector('#clTime'),
      tip: root.querySelector('#clTip')
    };
    if (S.free) els.wrong.textContent = L.step + '단계';

    els.svg.addEventListener('click', onTap);
    root.querySelectorAll('.cl-color').forEach(function (b) {
      b.addEventListener('click', function () { choose(+b.dataset.c); });
    });
    var hb = root.querySelector('#clHint');
    if (hb) hb.addEventListener('click', useHint);
    root.querySelector('#clPrintNow').addEventListener('click', printThis);
    root.querySelector('#clNew').addEventListener('click', function () {
      UI.confirm('새 그림', '지금 칠하던 그림은 사라집니다. 새로 시작할까요?', function () {
        Store.clearSession('coloring');
        S = null; pic = null;
        renderIntro();
      }, '새로 시작');
    });
    root.querySelector('#clSwitch').addEventListener('click', function () { App.gameSwitcher('coloring'); });

    paintAll();

    /* 다른 게임에 갔다 오거나 화면을 껐다 켜면 판을 다시 그린다.
       이때 고른 색을 그대로 되살려 놓지 않으면, 아무 색도 안 골라진 것처럼
       보이는데 칸을 누르면 칠해져 버린다. */
    var keep = picked;
    picked = 0;
    if (keep && root.querySelector('.cl-color[data-c="' + keep + '"]')) choose(keep);

    startTimer();
  }

  /* ================= 칠하기 ================= */

  function choose(n) {
    picked = n;
    stopBlink();
    root.querySelectorAll('.cl-color').forEach(function (b) {
      b.classList.toggle('is-on', +b.dataset.c === n);
    });
    if (n === -1) {
      els.tip.textContent = '지우고 싶은 칸을 누르세요.';
    } else if (S.free) {
      els.tip.textContent = josa(PICTURES.nameOf(n), '을', '를') + ' 골랐습니다. 칠하고 싶은 칸을 누르세요.';
    } else {
      els.tip.textContent = n + '번 ' + PICTURES.nameOf(n) + ' — ' +
        numJosa(n, '이', '가') + ' 적힌 칸을 누르세요.';
    }
  }

  function onTap(e) {
    if (!S || S.done) return;
    var t = e.target;
    if (t && t.classList.contains('cl-num')) {          // 번호 글자를 눌러도 그 칸으로
      t = els.svg.querySelector('.cl-rg[data-i="' + t.dataset.i + '"]');
    }
    if (!t || !t.classList || !t.classList.contains('cl-rg')) return;
    var i = +t.dataset.i;

    if (picked === 0) { UI.toast('먼저 아래에서 색을 고르세요.'); return; }

    if (picked === -1) {                                 // 지우개
      if (!S.fills[i]) return;
      S.fills[i] = 0;
      paintOne(i);
      updateHud();
      persist();
      return;
    }

    var want = pic.regions[i].c;
    if (!S.free && picked !== want) {                    // 번호가 다르면 칠하지 않는다
      S.wrong++;
      UI.beep('no');
      flash(t, i);
      updateHud();
      persist();
      return;
    }

    if (S.fills[i] === picked) return;
    S.fills[i] = picked;
    UI.beep('tick');
    paintOne(i);
    updateHud();
    persist();

    if (doneCount() === S.fills.length) finish();
  }

  /** 잘못 고른 칸을 잠깐 붉게 흔들고, 그 칸의 번호를 크게 보여 준다 */
  function flash(el, i) {
    el.classList.remove('is-miss');
    void el.getBoundingClientRect();          // 애니메이션을 다시 시작시키기 위한 한 줄
    el.classList.add('is-miss');
    var num = els.svg.querySelector('.cl-num[data-i="' + i + '"]');
    if (num) num.classList.add('is-miss');
    setTimeout(function () {
      el.classList.remove('is-miss');
      if (num) num.classList.remove('is-miss');
    }, 600);
    els.tip.textContent = '그 칸은 ' + pic.regions[i].c + '번 ' + PICTURES.nameOf(pic.regions[i].c) + ' 자리입니다.';
  }

  function paintOne(i) {
    var el = els.svg.querySelector('.cl-rg[data-i="' + i + '"]');
    var num = els.svg.querySelector('.cl-num[data-i="' + i + '"]');
    var v = S.fills[i];
    el.setAttribute('fill', v ? PICTURES.hexOf(v) : '#FFFFFF');
    el.classList.toggle('is-filled', !!v);
    if (num) num.classList.toggle('is-hidden', !!v);
  }

  function paintAll() {
    for (var i = 0; i < S.fills.length; i++) paintOne(i);
    updateHud();
  }

  function updateHud() {
    els.done.textContent = doneCount() + ' / ' + S.fills.length;
    if (!S.free) els.wrong.textContent = S.wrong;
  }

  /* ================= 힌트 ================= */

  function stopBlink() {
    if (blinkTimer) { clearTimeout(blinkTimer); blinkTimer = null; }
    if (els.svg) els.svg.querySelectorAll('.is-blink').forEach(function (e) { e.classList.remove('is-blink'); });
  }

  function useHint() {
    if (!S || S.done) return;
    if (picked <= 0) { UI.toast('먼저 아래에서 색을 고르세요.'); return; }

    var hit = [];
    pic.regions.forEach(function (r, i) { if (r.c === picked && !S.fills[i]) hit.push(i); });
    if (!hit.length) {
      UI.toast(picked + '번 ' + josa(PICTURES.nameOf(picked), '은', '는') +
               ' 다 칠했습니다. 다른 색을 골라 보세요.');
      return;
    }

    S.hints++;
    UI.beep('tick');
    persist();
    stopBlink();
    hit.forEach(function (i) {
      els.svg.querySelector('.cl-rg[data-i="' + i + '"]').classList.add('is-blink');
    });
    UI.toast(picked + '번 칸 ' + hit.length + '곳이 반짝입니다. (−30점)');
    blinkTimer = setTimeout(stopBlink, 3200);
  }

  /* ================= 시간 ================= */

  function startTimer() {
    stopTimer();
    els.time.textContent = UI.fmtTime(S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done) return;
      S.elapsed++;
      els.time.textContent = UI.fmtTime(S.elapsed);
      if (S.elapsed % 10 === 0) persist();
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  /* ================= 인쇄 ================= */

  function printThis() {
    if (!pic) return;
    var m = UI.modal({
      title: '종이로 인쇄',
      body: '<p class="modal__msg">지금 이 그림을 A4 한 장으로 인쇄합니다.<br>' +
            '인쇄 창에서 <b>대상</b>을 <b>“PDF로 저장”</b>으로 고르면 파일로 저장됩니다.</p>' +
            '<div class="settings"><div class="set"><span class="set__lbl">무엇을</span>' +
            '<div class="seg" id="clPrKind">' +
              '<button data-v="blank" class="is-on">빈 도안</button>' +
              '<button data-v="mine">지금 칠한 그림</button>' +
            '</div></div></div>' +
            '<p class="modal__msg small">빈 도안에는 번호와 색깔표가 함께 인쇄됩니다. ' +
            '크레파스나 색연필로 칠해 보세요.</p>',
      actions: [
        { label: '취소' },
        { label: '인쇄하기', kind: 'accent', onClick: function () {
            Print.coloringNow(pic, kind === 'mine' ? S.fills : null, S.free);
          } }
      ]
    });
    var kind = 'blank';
    m.card.querySelectorAll('#clPrKind button').forEach(function (b) {
      b.addEventListener('click', function () {
        m.card.querySelectorAll('#clPrKind button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        kind = b.dataset.v;
      });
    });
  }

  /* ================= 점수 ================= */

  function score() {
    var L = LEVELS[S.level];
    var total = S.fills.length;
    var filled = doneCount();
    var fill = Math.round(700 * filled / total);
    var acc = Math.max(0, 200 - S.wrong * 20);
    var par = total * 5;                                  // 한 칸에 5초면 넉넉한 기준
    var time = filled === total
      ? Math.round(100 * Math.max(0, Math.min(1, (par * 3 - S.elapsed) / (par * 2))))
      : 0;
    var penalty = S.hints * 30;
    var bonus = filled === total ? L.bonus : 0;
    return {
      fill: fill, acc: acc, time: time, penalty: penalty, bonus: bonus,
      all: filled === total,
      total: Math.max(0, fill + acc + time + bonus - penalty)
    };
  }

  function finish() {
    S.done = true;
    stopTimer();
    stopBlink();
    Store.clearSession('coloring');
    UI.beep('win');

    /* 결과 창에서 '한 장 더'를 눌러도 인쇄가 되도록, 완성한 그림을 따로 붙잡아 둔다 */
    var donePic = pic, doneFills = S.fills.slice(), doneFree = S.free;
    function printDone() { Print.coloringNow(donePic, doneFills, doneFree); }

    if (S.free) {                                          // 쉼터 모드 — 점수를 매기지 않는다
      UI.modal({
        title: '다 칠했습니다!',
        body: '<p class="modal__msg">‘' + UI.esc(pic.name) + '’ 그림을 곱게 완성하셨습니다.<br>' +
              '종이로 인쇄해 두면 오래 남습니다.</p>',
        dismissable: false,
        actions: [
          { label: '인쇄하기', keepOpen: true, onClick: printDone },
          { label: '다른 게임', onClick: function () { App.gameSwitcher('coloring'); } },
          { label: '한 장 더', kind: 'accent', onClick: function () { S = null; pic = null; renderIntro(); } }
        ]
      });
      return;
    }

    var sc = score();
    Store.addRecord({
      game: 'coloring', score: sc.total,
      difficulty: LEVELS[S.level].step + '단계 ' + LEVELS[S.level].name,
      duration: S.elapsed,
      detail: { picture: pic.name, cells: S.fills.length, wrong: S.wrong, hints: S.hints }
    });

    var rows = [
      { label: '칠한 칸 (' + S.fills.length + '칸 모두)', value: sc.fill },
      { label: '정확도 보너스 (실수 ' + S.wrong + '회)', value: sc.acc },
      { label: '시간 보너스 (' + UI.fmtTime(S.elapsed) + ' 걸림)', value: sc.time }
    ];
    if (sc.bonus) rows.push({ label: '난이도 보너스 (' + LEVELS[S.level].name + ')', value: sc.bonus });
    if (sc.penalty) rows.push({ label: '힌트 사용 (' + S.hints + '회)', value: sc.penalty, minus: true });

    UI.resultModal({
      title: '그림을 다 칠했습니다!',
      score: sc.total,
      headline: '‘' + pic.name + '’ 완성',
      rows: rows,
      note: '칠한 그림은 “인쇄하기”로 종이에 남길 수 있습니다.',
      actions: [
        { label: '인쇄하기', keepOpen: true, onClick: printDone },
        { label: '기록 보기', onClick: function () { App.go('records'); } },
        { label: '한 장 더', kind: 'accent', onClick: function () { S = null; pic = null; renderIntro(); } }
      ]
    });
  }

  /* ================= 바깥으로 ================= */

  return {
    id: 'coloring', name: '색칠 공부', icon: '색',
    rules: {
      title: '색칠 공부 점수 규칙',
      lines: [
        ['난이도', '1단계 첫걸음(색 4가지) · 2단계 가볍게(색 5가지) · 3단계 쉬움(색 6가지) · 4단계 보통(색 8가지) · 5단계 어려움(색 10가지)'],
        ['칠한 칸', '최대 700점 · 칠한 칸 수에 비례 (모두 칠하면 700점)'],
        ['정확도 보너스', '최대 200점 · 색을 잘못 고른 횟수 1회마다 20점씩 줄어듦'],
        ['시간 보너스', '최대 100점 · 시간 제한은 없고, 천천히 해도 점수가 남습니다'],
        ['힌트 감점', '힌트 1회마다 30점 차감'],
        ['난이도 보너스', '보통 +100점, 어려움 +250점 (다 칠했을 때 · 1~3단계는 보너스 없음)'],
        ['최고 점수', '1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점'],
        ['마음대로 칠하기', '번호도 점수도 없습니다. 기록에 남지 않습니다']
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
      stopTimer();
      stopBlink();
      persist();
    },
    hasProgress: function () { return !!Store.getSession('coloring'); },
    levels: LEVELS,
    levelOrder: ORDER,
    /** 인쇄용으로 새 그림을 하나 만들어 준다 (화면 상태와 무관) */
    makeForPrint: function (level, picId) {
      var L = LEVELS[level] || LEVELS.easy;
      return PICTURES.make(picId || 'random', {
        detail: L.detail, colors: L.colors, seed: (Math.random() * 0x7FFFFFFF) | 0
      });
    }
  };
})();
