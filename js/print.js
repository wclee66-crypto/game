/* 맑은뜰 — 인쇄(PDF 저장)
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
        '<span class="ps-seal">맑</span>' +
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

  /* ---------------- 인쇄 실행 ---------------- */

  function run(game, o) {
    var root = document.getElementById('printRoot');
    root.innerHTML = (game === 'sudoku' ? sudokuSheets(o) : wordsearchSheets(o));
    // 글꼴·표가 자리를 잡은 뒤 인쇄 창을 연다
    setTimeout(function () {
      window.print();
      setTimeout(function () { root.innerHTML = ''; }, 1000);
    }, 120);
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
