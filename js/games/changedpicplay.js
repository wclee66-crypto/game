/* 새록 — 일반 두뇌 게임용 바뀐 그림 찾기 */
window.Games.changedpicplay = (function () {
  var ID = 'changedpicplay';
  var TITLE = T('바뀐 그림 찾기');
  var INTRO = T('그림판을 기억한 뒤 바뀐 자리를 찾아 보세요.');
  var LIMIT = 5;
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];
  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, count: 4,  cols: 2, seconds: 5, changes: 1, bonus: 0 },
    step2:  { name: T('가볍게'), step: 2, count: 6,  cols: 3, seconds: 5, changes: 1, bonus: 0 },
    easy:   { name: T('쉬움'),   step: 3, count: 9,  cols: 3, seconds: 5, changes: 1, bonus: 0 },
    normal: { name: T('보통'),   step: 4, count: 9,  cols: 3, seconds: 4, changes: 2, bonus: 100 },
    hard:   { name: T('어려움'), step: 5, count: 12, cols: 4, seconds: 4, changes: 2, bonus: 250 }
  };
  var LABELS = {
    apple: '사과', star: '별', heart: '하트', balloon: '풍선', moon: '달', cloud: '구름', house: '집', tree: '나무',
    mug: '머그잔', key: '열쇠', leaf: '나뭇잎', fish: '물고기', sailboat: '돛단배', flower: '꽃', candle: '양초', kite: '연'
  };
  var root, state, timer;

  ORDER.forEach(function (key) {
    var L = LEVELS[key];
    L.note = T('그림 {n}개 · {s}초 동안 보기', { n: L.count, s: L.seconds }) + ' · ' +
      T('바뀐 자리 {n}곳', { n: L.changes });
  });

  function shuffled(items) {
    var remaining = items.slice(), output = [];
    while (remaining.length) {
      output.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
    }
    return output;
  }

  function makeBoard(level) {
    var L = LEVELS[level] || LEVELS.easy;
    var pool = shuffled(Games.cardmatch.pictureIds);
    var before = pool.slice(0, L.count), after = before.slice();
    var changes = shuffled(before.map(function (_, i) { return i; })).slice(0, L.changes);
    changes.forEach(function (i, j) { after[i] = pool[L.count + j]; });
    return { before: before, after: after, changes: changes, cols: L.cols, levelName: L.name };
  }

  function save() { Store.saveSession(ID, state); }

  function levelList() {
    return ORDER.map(function (id) {
      var L = LEVELS[id];
      return '<button class="level" type="button" data-level="' + id + '">' +
        '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
        '<span class="level__name">' + L.name + '</span>' +
        '<span class="level__meta">' + T('그림 {n}개 · {s}초 동안 보기', { n: L.count, s: L.seconds }) + '</span>' +
        '<span class="cmplay-level-detail">' + T('바뀐 자리 {n}곳', { n: L.changes }) + '</span></button>';
    }).join('');
  }

  function intro() {
    root.innerHTML = '<div class="intro"><h2 class="intro__title" tabindex="-1">' + T('난이도를 골라 주세요.') + '</h2>' +
      '<p class="intro__desc">' + INTRO + '</p></div>' +
      (state ? '<div class="cmplay-actions"><button class="btn btn--accent" type="button" data-resume>' +
        T('이어서 하기') + '</button></div>' : '') + '<div class="levels">' + levelList() + '</div>' +
      '<div class="cmplay-actions"><button class="btn btn--ghost" type="button" data-print>' + T('문제 인쇄') + '</button></div>';
    root.querySelector('[data-print]').onclick = function () { Print.dialog(ID); };
    if (state) root.querySelector('[data-resume]').onclick = function () { render(true); };
    root.querySelectorAll('[data-level]').forEach(function (b) {
      b.onclick = function () {
        state = { day: Store.dayKey(), level: b.dataset.level, round: 1, points: 0, started: Date.now() };
        newRound();
      };
    });
  }

  function newRound() {
    state.board = makeBoard(state.level);
    state.selected = [];
    state.phase = 'ready';
    save();
    render(true);
  }

  function pictureCell(i, phase) {
    if (phase === 'ready' || phase === 'cover') return '<div class="cmplay-cell is-covered" aria-hidden="true"></div>';

    var picture = (phase === 'study' ? state.board.before : state.board.after)[i];
    var label = T('{n}번 칸, {picture}', { n: i + 1, picture: T(LABELS[picture]) });
    var selected = state.selected.indexOf(i) >= 0;
    var changed = state.board.changes.indexOf(i) >= 0;
    var art = Games.cardmatch.pictureSvg(picture);
    if (phase === 'answer') {
      return '<button class="cmplay-cell' + (selected ? ' is-selected' : '') + '" type="button" data-cell="' + i +
        '" aria-label="' + UI.esc(label) + '" aria-pressed="' + selected + '">' + art +
        '<span class="cmplay-mark" aria-hidden="true">' + (selected ? '●' : '') + '</span></button>';
    }

    var mark = '', status = '';
    if (phase === 'review' && changed) {
      mark = '✓'; status = ' is-correct'; label += ' · ' + T('바뀐 자리');
    } else if (phase === 'review' && selected) {
      mark = '×'; status = ' is-incorrect'; label += ' · ' + T('바뀌지 않은 자리');
    }
    return '<div class="cmplay-cell' + status + '" role="img" aria-label="' + UI.esc(label) + '">' + art +
      (mark ? '<span class="cmplay-mark" aria-hidden="true">' + mark + '</span>' : '') + '</div>';
  }

  function statusText() {
    var L = LEVELS[state.level];
    if (state.phase === 'ready') return T('시작을 누르면 그림을 {n}초 동안 보여 드립니다.', { n: L.seconds });
    if (state.phase === 'study') return T('그림과 자리를 기억해 주세요.');
    if (state.phase === 'cover') return T('그림판을 가렸습니다.');
    if (state.phase === 'answer') return T('바뀐 자리 {n}곳을 골라 주세요.', { n: L.changes });
    return state.hits === L.changes ? T('정답입니다!') : T('틀렸습니다. ✓ 표시가 바뀐 자리입니다.');
  }

  function selectionText() {
    return T('{n}곳 중 {s}곳 선택', { n: LEVELS[state.level].changes, s: state.selected.length });
  }

  function render(focus) {
    var L = LEVELS[state.level], phase = state.phase;
    root.innerHTML = '<div class="cmplay-meta"><strong>' + L.name + '</strong><span>' +
      T('{n} / {total} 문제', { n: state.round, total: LIMIT }) + '</span></div>' +
      '<h2 class="cmplay-status" tabindex="-1">' + statusText() + '</h2>' +
      '<div class="cmplay-grid" style="--cols:' + L.cols + '">' +
        state.board.before.map(function (_, i) { return pictureCell(i, phase); }).join('') + '</div>' +
      '<div class="cmplay-actions">' +
        (phase === 'answer' ? '<p class="cmplay-selection" role="status">' + selectionText() + '</p>' : '') +
        (phase === 'ready' || phase === 'review' ? '<button class="btn btn--accent" type="button" data-next>' +
          T(phase === 'ready' ? '시작하기' : (state.round < LIMIT ? '다음 문제' : '결과 보기')) + '</button>' : '') +
        (phase === 'ready' || phase === 'review' || phase === 'answer' ?
          '<button class="linkbtn cmplay-level-picker" type="button" data-levels>' + T('다른 단계 고르기') + '</button>' : '') +
      '</div>';
    if (phase === 'ready') root.querySelector('[data-next]').onclick = study;
    if (phase === 'review') root.querySelector('[data-next]').onclick = state.round < LIMIT ? advance : finish;
    if (phase === 'answer') root.querySelectorAll('[data-cell]').forEach(function (b) {
      b.onclick = function () { select(b, Number(b.dataset.cell)); };
    });
    var levelsButton = root.querySelector('[data-levels]');
    if (levelsButton) levelsButton.onclick = function () {
      intro();
      root.querySelector('h2').focus();
    };
    if (focus) root.querySelector('.cmplay-status').focus({ preventScroll: true });
  }

  function study() {
    state.phase = 'study';
    render(true);
    timer = setTimeout(function () {
      state.phase = 'cover';
      render(false);
      timer = setTimeout(function () {
        state.phase = 'answer';
        save();
        render(true);
      }, 700);
    }, LEVELS[state.level].seconds * 1000);
  }

  function select(button, i) {
    if (state.phase !== 'answer') return;
    var at = state.selected.indexOf(i);
    if (at < 0) state.selected.push(i);
    else state.selected.splice(at, 1);

    var L = LEVELS[state.level];
    /* 한 곳만 고른 동안에는 맞았는지에 관한 표시를 주지 않는다. */
    if (state.selected.length === L.changes) {
      state.hits = state.selected.filter(function (j) { return state.board.changes.indexOf(j) >= 0; }).length;
      state.points += (1000 / LIMIT) * state.hits / L.changes;
      state.phase = 'review';
      save();
      render(true);
      return;
    }
    button.setAttribute('aria-pressed', String(at < 0));
    button.classList.toggle('is-selected', at < 0);
    button.querySelector('.cmplay-mark').textContent = at < 0 ? '●' : '';
    root.querySelector('.cmplay-selection').textContent = selectionText();
    save();
  }

  function advance() {
    state.round += 1;
    newRound();
  }

  function finish() {
    if (!state) return;
    var L = LEVELS[state.level];
    var score = state.points + (state.points === 1000 ? L.bonus : 0);
    Store.addRecord({ game: ID, score: score, difficulty: L.name, duration: (Date.now() - state.started) / 1000 });
    Store.clearSession(ID);
    state = null;
    root.innerHTML = '<div class="intro"><h2 class="intro__title" tabindex="-1">' + T('다섯 문제를 마치셨습니다.') + '</h2>' +
      '<p class="cmplay-score">' + T('최종 점수 · {n}점', { n: UI.comma(score) }) + '</p>' +
      '<button class="btn btn--accent" type="button" data-again>' + T('한 판 더') + '</button></div>';
    root.querySelector('[data-again]').onclick = function () {
      intro();
      root.querySelector('[data-level]').focus();
    };
    root.querySelector('h2').focus();
  }

  return {
    id: ID, name: TITLE, tagline: INTRO, modes: ['play'], levels: LEVELS, levelOrder: ORDER,
    rules: { title: TITLE, lines: [
      [T('하는 법'), INTRO],
      [T('난이도'), T('보통과 어려움은 두 곳을 모두 고르면 정답을 보여 드립니다.')],
      [T('자리 맞히기 점수'), T('맞힌 자리 수에 따라 한 문제에 최대 200점을 받습니다.')],
      [T('난이도 보너스'), T('모두 맞히면 보통 100점, 어려움 250점을 더 받습니다.')]
    ] },
    mount: function (container) {
      container.innerHTML = '<section class="cmplay"></section>';
      root = container.firstElementChild;
      state = Store.getSession(ID);
      if (state) render(false);
      else intro();
    },
    unmount: function () {
      clearTimeout(timer);
      if (state && (state.phase === 'study' || state.phase === 'cover')) {
        state.phase = 'ready';
        save();
      }
    },
    hasProgress: function () { return !!Store.getSession(ID); },
    makeForPrint: makeBoard
  };
})();
