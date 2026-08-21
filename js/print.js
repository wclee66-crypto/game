/* 새록 — 인쇄(PDF 저장)
 *
 * 화면용 게임과는 별개로, 연필로 풀 수 있는 A4 문제지를 만든다.
 * 시간·힌트·실수 같은 화면용 정보는 넣지 않고 문제만 크게 담는다.
 *
 * 브라우저의 인쇄 창에서 '대상'을 'PDF로 저장'으로 고르면 PDF 파일이 된다.
 */
window.Print = (function () {

  function esc(s) { return UI.esc(s); }

  function sheetHead(title, level, sub) {
    return '<div class="ps-head">' +
      '<div class="ps-head__left">' +
        '<span class="ps-seal">새</span>' +
        '<span class="ps-title">' + esc(title) + '<em>' + esc(level) + '</em></span>' +
      '</div>' +
      '<div class="ps-name">이름 <span class="ps-blank"></span> 날짜 <span class="ps-blank ps-blank--sm"></span></div>' +
    '</div>' +
    (sub ? '<p class="ps-sub">' + esc(sub) + '</p>' : '');
  }

  /* ---------------- 스도쿠 ---------------- */

  /** b = {n, br, bc} 판 모양, cells = 채울 값 */
  function sudokuGrid(b, cells, opts) {
    opts = opts || {};
    var N = b.n;
    var out = '<table class="ps-sd" style="--pn:' + N + '"><tbody>';
    for (var r = 0; r < N; r++) {
      out += '<tr>';
      for (var c = 0; c < N; c++) {
        var i = r * N + c;
        var cls = [];
        if (c % b.bc === b.bc - 1 && c !== N - 1) cls.push('br');
        if (r % b.br === b.br - 1 && r !== N - 1) cls.push('bb');
        var v = cells[i];
        var given = opts.givens ? opts.givens[i] : v;
        if (opts.answer && !given) cls.push('ans');     // 정답지에서 채워 넣은 칸
        out += '<td class="' + cls.join(' ') + '">' + (v ? v : '') + '</td>';
      }
      out += '</tr>';
    }
    return out + '</tbody></table>';
  }

  function sudokuSheets(o) {
    var pages = [];
    for (var n = 0; n < o.count; n++) {
      var made = Games.sudoku.makeForPrint(o.level);
      pages.push('<section class="ps-sheet">' +
        sheetHead('스도쿠', made.levelName + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''),
          '가로줄·세로줄·굵은 네모 칸마다 1부터 ' + made.n + '까지 한 번씩만 들어갑니다.') +
        sudokuGrid(made, made.puzzle) +
      '</section>');

      if (o.answer) {
        pages.push('<section class="ps-sheet ps-sheet--ans">' +
          sheetHead('스도쿠 정답', made.levelName + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''), '') +
          sudokuGrid(made, made.solution, { givens: made.puzzle, answer: true }) +
        '</section>');
      }
    }
    return pages.join('');
  }

  /* ---------------- 낱말찾기 ---------------- */

  function wsGrid(b, marked) {
    var out = '<table class="ps-ws" style="--n:' + b.size + '"><tbody>';
    for (var r = 0; r < b.size; r++) {
      out += '<tr>';
      for (var c = 0; c < b.size; c++) {
        var i = r * b.size + c;
        out += '<td' + (marked && marked[i] ? ' class="ans"' : '') + '>' + esc(b.grid[i]) + '</td>';
      }
      out += '</tr>';
    }
    return out + '</tbody></table>';
  }

  function wsWords(b) {
    return '<ul class="ps-ws-words">' +
      b.placed.map(function (p) { return '<li>' + esc(p.word) + '</li>'; }).join('') +
    '</ul>';
  }

  function wordsearchSheets(o) {
    var pages = [];
    for (var n = 0; n < o.count; n++) {
      var b = Games.wordsearch.makeForPrint(o.level);
      pages.push('<section class="ps-sheet">' +
        sheetHead('낱말찾기', '주제 ' + b.theme + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''),
          '글자판에서 아래 낱말을 찾아 동그라미를 치세요. 가로·세로·대각선 모두 있습니다.') +
        wsGrid(b) +
        wsWords(b) +
      '</section>');

      if (o.answer) {
        var marked = {};
        b.placed.forEach(function (p) { p.cells.forEach(function (i) { marked[i] = true; }); });
        pages.push('<section class="ps-sheet ps-sheet--ans">' +
          sheetHead('낱말찾기 정답', '주제 ' + b.theme + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''), '') +
          wsGrid(b, marked) +
          wsWords(b) +
        '</section>');
      }
    }
    return pages.join('');
  }

  /* ---------------- 산수 ---------------- */

  function mathSheets(o) {
    var pages = [];
    for (var n = 0; n < o.count; n++) {
      var b = Games.math.makeForPrint(o.level, 24);
      var body = '<ol class="ps-math">' + b.items.map(function (it) {
        return '<li><span class="pm-q">' + esc(it.q) + ' =</span><span class="pm-blank"></span></li>';
      }).join('') + '</ol>';

      pages.push('<section class="ps-sheet ps-sheet--left">' +
        sheetHead('산수', b.levelName + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''),
          b.note + ' · 빈칸에 답을 적으세요.') +
        body +
      '</section>');

      if (o.answer) {
        pages.push('<section class="ps-sheet ps-sheet--left ps-sheet--ans">' +
          sheetHead('산수 정답', b.levelName + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''), '') +
          '<ol class="ps-math">' + b.items.map(function (it) {
            return '<li><span class="pm-q">' + esc(it.q) + ' =</span><span class="pm-a">' + it.a + '</span></li>';
          }).join('') + '</ol>' +
        '</section>');
      }
    }
    return pages.join('');
  }

  /* ---------------- 단어 순서 바로잡기 ---------------- */

  /** 한 줄 = 뒤섞인 낱말 · 화살표 · 답 쓸 네모
   *  종이에서는 연필로 쓰면 되므로, 화면에서 쓰는 '고를 글자'는 넣지 않는다. */
  function woRows(items, answer) {
    return '<table class="ps-wo"><tbody>' + items.map(function (it) {
      var boxes = it.w.split('').map(function (ch) {
        return '<span class="pw-box' + (answer ? ' ans' : '') + '">' + (answer ? esc(ch) : '') + '</span>';
      }).join('');
      return '<tr>' +
        '<td class="pw-q">' + esc(it.s) + '</td>' +
        '<td class="pw-arrow">···▸</td>' +
        '<td class="pw-a">' + boxes + '</td>' +
      '</tr>';
    }).join('') + '</tbody></table>';
  }

  function wordorderSheets(o) {
    var pages = [];
    for (var n = 0; n < o.count; n++) {
      var b = Games.wordorder.makeForPrint(o.level, 10);

      pages.push('<section class="ps-sheet">' +
        sheetHead('단어 순서 바로잡기', b.levelName + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''),
          '글자 순서가 뒤섞인 낱말입니다. 바른 순서로 오른쪽 네모에 한 글자씩 적으세요.') +
        woRows(b.items, false) +
      '</section>');

      if (o.answer) {
        pages.push('<section class="ps-sheet ps-sheet--ans">' +
          sheetHead('단어 순서 정답', b.levelName + (o.count > 1 ? ' · ' + (n + 1) + '번' : ''), '') +
          woRows(b.items, true) +
        '</section>');
      }
    }
    return pages.join('');
  }

  /* ---------------- 인쇄 실행 ---------------- */

  /** 게임마다 문제지를 만드는 함수 — 새 게임을 지원할 때 여기에 한 줄 더한다 */
  var SHEETS = {
    sudoku: sudokuSheets,
    wordsearch: wordsearchSheets,
    math: mathSheets,
    wordorder: wordorderSheets
  };

  /* 인쇄 내용은 **인쇄 창이 닫힌 뒤에** 지운다.
   *
   * 예전에는 1초 뒤에 지웠는데, 인쇄 창을 열어 놓고 'PDF로 저장'을 고르는 동안
   * 내용이 사라져 빈 종이가 저장되는 일이 생긴다.
   * (크롬은 window.print() 가 창이 닫힐 때까지 멈춰 있지만, 휴대폰·다른 브라우저는 그렇지 않다.)
   * afterprint 를 받지 못하는 브라우저를 위해 넉넉한 예비 시간도 함께 둔다.
   */
  function run(game, o) {
    var root = document.getElementById('printRoot');
    root.innerHTML = (SHEETS[game] || wordsearchSheets)(o);

    var cleared = false;
    function cleanup() {
      if (cleared) return;
      cleared = true;
      window.removeEventListener('afterprint', cleanup);
      root.innerHTML = '';
    }
    window.addEventListener('afterprint', cleanup);

    // 글꼴·표가 자리를 잡은 뒤 인쇄 창을 연다
    setTimeout(function () {
      window.print();
      setTimeout(cleanup, 180000);              // 3분 — 저장을 다 마칠 때까지 기다려 준다
    }, 200);
  }

  /* ---------------- 설정 창 ---------------- */

  function seg(id, items, current) {
    return '<div class="seg" id="' + id + '">' +
      items.map(function (it) {
        return '<button data-v="' + it[0] + '"' + (it[0] === current ? ' class="is-on"' : '') + '>' + esc(it[1]) + '</button>';
      }).join('') +
    '</div>';
  }

  function dialog(game) {
    var G = Games[game];
    var order = G.levelOrder || Object.keys(G.levels);
    var levelItems = order.map(function (k) { return [k, G.levels[k].step + '단계'] ; });
    var pick = { level: levelItems[0][0], count: 1, answer: false };

    var body =
      '<p class="modal__msg">연필로 풀 수 있는 <b>A4 문제지</b>를 만듭니다. ' +
      '인쇄 창에서 <b>대상</b>을 <b>“PDF로 저장”</b>으로 고르면 파일로 저장됩니다.</p>' +
      '<div class="settings">' +
        '<div class="set set--stack"><span class="set__lbl">난이도</span>' + seg('prLevel', levelItems, pick.level) +
          '<span class="set__hint" id="prHint">' + esc(G.levels[pick.level].note || '') + '</span></div>' +
        '<div class="set"><span class="set__lbl">장수</span>' +
          seg('prCount', [['1', '1장'], ['2', '2장'], ['4', '4장']], '1') + '</div>' +
        '<div class="set"><span class="set__lbl">정답지</span>' +
          seg('prAns', [['no', '없이'], ['yes', '함께']], 'no') + '</div>' +
      '</div>' +
      '<p class="modal__msg small">문제지에는 시간·점수 같은 것은 인쇄되지 않습니다. ' +
      '정답지를 “함께”로 두면 문제지 다음 장에 정답이 나옵니다.</p>';

    var m = UI.modal({
      title: '인쇄용 문제지 만들기',
      body: body,
      actions: [
        { label: '취소' },
        { label: '만들기', kind: 'accent', onClick: function () { run(game, pick); } }
      ]
    });

    function bind(id, fn) {
      m.card.querySelectorAll('#' + id + ' button').forEach(function (b) {
        b.addEventListener('click', function () {
          m.card.querySelectorAll('#' + id + ' button').forEach(function (x) { x.classList.remove('is-on'); });
          b.classList.add('is-on');
          fn(b.dataset.v);
        });
      });
    }
    bind('prLevel', function (v) {
      pick.level = v;
      var h = m.card.querySelector('#prHint');
      if (h) h.textContent = G.levels[v].note || '';
    });
    bind('prCount', function (v) { pick.count = +v; });
    bind('prAns', function (v) { pick.answer = (v === 'yes'); });
  }

  return { dialog: dialog };
})();
