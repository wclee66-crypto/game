/* 새록 — 화면 전환과 홈·기록 화면 */
window.App = (function () {

  var APP_VERSION = 'v27';                // sw.js 의 VERSION 과 함께 올린다

  /* 게임 목록은 index.html 에서 불러온 순서 그대로 저절로 만들어진다.
   * 새 게임을 넣을 때 여기에 이름을 적을 필요가 없다 —
   * index.html 에 <script> 한 줄만 더하면 홈·게임 고르기·기록 화면에 함께 나타난다.
   * 보이는 순서를 바꾸고 싶으면 index.html 의 <script> 순서를 바꾸면 된다. */
  /* 낱말찾기처럼 그 나라 말이 있어야만 되는 게임은 langs 를 적어 둔다.
     적지 않은 게임(숫자·그림)은 어느 말에서나 그대로 쓸 수 있다. */
  function playableIn(id, code) {
    var L = window.Games[id] && window.Games[id].langs;
    return !L || L.indexOf(code) >= 0;
  }
  var ALL_GAMES = Object.keys(window.Games || {});
  var GAMES = ALL_GAMES;                 // 말을 고를 때 다시 추린다 (relist)

  function relist() {
    var code = I18N.get();
    GAMES = ALL_GAMES.filter(function (g) { return playableIn(g, code); });
    MAX_DAY = MAX_PER_GAME * GAMES.length;
  }

  var MAX_PER_GAME = 1250;               // 한 게임에서 받을 수 있는 최고 점수
  var MAX_DAY = MAX_PER_GAME * GAMES.length;   // relist() 에서 다시 센다
  var DAY_GOAL = 3;                      // 하루에 이만큼 종목을 하면 목표 달성
  var HOME_GAMES = 3;                    // 홈에는 이만큼만 추려서 보여 준다

  var view, current = null, here = 'home';

  /* ================= 앱 설치 ================= */
  /* 크롬 계열은 설치 조건을 만족하면 beforeinstallprompt 를 보내 준다.
     그 순간을 잡아 두었다가 홈 화면의 '앱으로 설치' 버튼에 연결한다. */
  var installEvent = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    if (here === 'home' && view) renderHome();
  });
  window.addEventListener('appinstalled', function () {
    installEvent = null;
    UI.toast(T('홈 화면에 설치되었습니다.'));
    if (here === 'home' && view) renderHome();
  });

  function ua() { return navigator.userAgent || ''; }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           navigator.standalone === true;
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(ua()) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  /** 카카오톡·네이버 등 앱 안에 들어 있는 간이 브라우저 — 설치가 아예 불가능하다 */
  function isInApp() {
    return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|kakaostory|Snapchat/i.test(ua());
  }
  /** iOS에서 진짜 Safari인지 (크롬·엣지 등은 설치가 제대로 되지 않는다) */
  function isIOSSafari() {
    return isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS|Whale/i.test(ua());
  }

  function tip(title, detail) {
    return '<div class="install install--tip">' +
      '<span class="install__ico">⤓</span>' +
      '<span class="install__txt">' + UI.esc(title) + '<em>' + detail + '</em></span></div>';
  }

  function installCard() {
    if (isStandalone()) return '';                     // 이미 앱으로 실행 중 — 안내 불필요

    if (isInApp()) {
      return tip(T('여기서는 설치할 수 없습니다'),
        T('카카오톡·네이버 앱 안에서 열린 화면입니다.<br>오른쪽 위 <b>⋮</b> 또는 <b>⋯</b> → <b>다른 브라우저로 열기</b> 를 눌러<br>크롬이나 삼성 인터넷에서 다시 열어 주세요.'));
    }

    if (installEvent) {                                // 크롬 계열이 설치 가능하다고 알려 온 상태
      return '<button class="install" id="hmInstall">' +
        '<span class="install__ico">⤓</span>' +
        ('<span class="install__txt">' + T('앱으로 설치하기') + '<em>' + T('홈 화면에 아이콘이 생기고, 인터넷 없이도 열립니다') + '</em></span>') +
        '</button>';
    }

    if (isIOSSafari()) {
      return tip(T('앱으로 설치하려면'),
        (T('아래쪽') + ' <b>' + T('공유 버튼 ⬆') + '</b> → <b>' + T('홈 화면에 추가') + '</b> ' + T('를 누르세요.') + '<br>' + T('아이폰은 이것이 정식 설치 방법입니다.')));
    }
    if (isIOS()) {
      return tip(T('Safari로 열어 주세요'),
        (T('아이폰·아이패드는') + ' <b>Safari</b>' + T('에서만 앱으로 설치됩니다.') + '<br>' + T('이 주소를 Safari에서 다시 열어 주세요.')));
    }

    return tip(T('앱으로 설치하려면'),
      (T('브라우저 메뉴') + ' <b>⋮</b> → <b>' + T('앱 설치') + '</b> ' + T('를 누르세요.') + '<br>' + T('“홈 화면에 추가”만 보이면') + ' <b>' + T('새로고침') + '</b> ' + T('한 번 뒤 다시 열어 보세요.')));
  }

  function doInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    installEvent.userChoice.then(function (res) {
      if (res && res.outcome === 'accepted') installEvent = null;
      if (here === 'home' && view) renderHome();
    });
  }

  /* ================= 라우터 ================= */

  function go(route) {
    if (current && Games[current]) Games[current].unmount();
    current = GAMES.indexOf(route) >= 0 ? route : null;
    here = route;

    // 게임 화면에 있을 때는 '게임 고르기' 탭이 켜진 것으로 본다
    var tabRoute = GAMES.indexOf(route) >= 0 ? 'games' : route;
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('is-on', t.dataset.route === tabRoute);
    });
    document.getElementById('btnBack').hidden = (route === 'home');

    /* 화면 위 제목 — 게임 화면의 제목·설명은 게임 파일이 스스로 들고 있다.
     * (name 과 tagline) 그래서 게임이 늘어도 여기는 손대지 않는다. */
    var FIXED = {
      home:    [T('새록'), T('매일 조금씩, 기억이 새록새록')],
      games:   [T('게임 고르기'), T('오늘은 무엇을 해 볼까요')],
      records: [T('나의 기록'), T('날짜별 점수를 모아 봅니다')]
    };
    var titles = FIXED[route] ||
      (Games[route] ? [Games[route].name, Games[route].tagline || ''] : titles_default());
    document.getElementById('appTitle').textContent = titles[0];
    document.getElementById('appSub').textContent = titles[1];

    view.innerHTML = '';
    view.scrollTop = 0;
    window.scrollTo(0, 0);

    if (route === 'home') renderHome();
    else if (route === 'games') renderPicker();
    else if (route === 'records') renderRecords();
    else Games[route].mount(view);

    location.hash = route;
  }
  function titles_default() { return [T('새록'), T('매일 조금씩, 기억이 새록새록')]; }

  /* ================= 홈 ================= */

  /** 오늘 점수를 고리로 보여 준다.
   *
   * 고리는 '점수 대비 만점'이 아니라 **오늘 몇 종목을 했는가**를 나타낸다.
   * 게임이 계속 늘어나면 하루 만점도 끝없이 커져서 고리가 늘 텅 비어 보이기 때문이다.
   * 목표는 하루 GOAL 종목이고, 그 이상 하면 고리가 가득 찬다.
   */
  function progressRing(total) {
    var best = Store.dayBest();
    var doneCount = GAMES.filter(function (g) { return best[g] != null; }).length;
    var goal = Math.min(DAY_GOAL, GAMES.length);
    var pct = Math.max(0, Math.min(1, doneCount / goal));
    var R = 34, C = 2 * Math.PI * R;

    return '<div class="ring">' +
      '<svg class="ring__svg" width="86" height="86" viewBox="0 0 86 86" aria-label="' + T('오늘 {n}종목 완료', { n: doneCount }) + '">' +
        '<circle class="ring__track" cx="43" cy="43" r="' + R + '" fill="none" stroke-width="10"></circle>' +
        '<circle class="ring__fill" cx="43" cy="43" r="' + R + '" fill="none" stroke-width="10" stroke-linecap="round"' +
          ' stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 43 43)"></circle>' +
        '<text class="ring__txt" x="43" y="48" text-anchor="middle">' + (doneCount >= goal ? '다 함' : doneCount + '/' + goal) + '</text>' +
      '</svg>' +
      '<div class="ring__body">' +
        '<div class="today__score"><b>' + UI.comma(total) + ('</b><span>' + T('점') + '</span></div>') +
        '<p class="today__meta">' +
          (doneCount >= goal ? T('오늘 {n}종목 · 목표를 채우셨습니다', { n: doneCount })
                             : T('오늘 {n}종목 완료 · 목표 {g}종목', { n: doneCount, g: goal })) +
        '</p>' +
      '</div>' +
    '</div>';
  }

  /** 게임 한 칸. 홈과 '게임 고르기' 화면이 같은 모양을 쓴다. */
  function gameCard(g) {
    var G = Games[g];
    var s = Store.dayBest()[g];
    var resume = G.hasProgress();
    var sub = resume ? '이어서 할 수 있어요' : (s != null ? '오늘 최고 기록' : T('아직 안 하셨어요'));

    /* 오늘 한 게임은 칸 전체를 옅은 초록으로 물들인다 —
       기호를 없앤 대신 '무엇을 했는지'가 한눈에 보이도록. */
    var state = s != null ? ' is-done' : (resume ? ' is-resume' : '');
    var right = s != null
      ? '<span class="gcard__go">' + UI.comma(s) + '<small>점</small></span>'
      : '<span class="gcard__go is-new' + (resume ? ' is-resume' : '') + '">' +
        (resume ? '이어하기' : T('시작하기')) + '</span>';
    return '<button class="gcard' + state + '" data-go="' + g + '">' +
      '<span class="gcard__body">' +
        '<span class="gcard__name">' + G.name + '</span>' +
        '<span class="gcard__sub">' + sub + '</span>' +
      '</span>' + right +
    '</button>';
  }

  /** 홈에 올릴 몇 가지를 고른다 — 이어서 할 것 > 아직 안 한 것 > 이미 한 것 */
  function pickForHome(best) {
    var rank = function (g) {
      if (Games[g].hasProgress()) return 0;
      if (best[g] == null) return 1;
      return 2;
    };
    return GAMES.slice()
      .map(function (g, i) { return { g: g, r: rank(g), i: i }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
      .slice(0, HOME_GAMES)
      .map(function (x) { return x.g; });
  }

  /* ================= 게임 고르기 ================= */

  function renderPicker() {
    var best = Store.dayBest();
    var done = GAMES.filter(function (g) { return best[g] != null; }).length;

    view.innerHTML =
      '<section class="picker">' +
        '<p class="picker__lead">' + T('오늘 <b>{n}가지</b>를 하셨습니다.', { n: done }) + ' ' +
          (T('골고루 하실수록 좋습니다.') + '</p>') +
        '<div class="gamelist">' + GAMES.map(gameCard).join('') + '</div>' +
        ('<p class="tipline">' + T('게임은 앞으로 계속 늘어납니다.') + '<br>' + T('새 게임이 생기면 이 화면에 나타납니다.') + '</p>') +
      '</section>';

    view.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.go); });
    });
  }

  function renderHome() {
    var today = Store.dayKey();
    var best = Store.dayBest(today);
    var total = Store.dayTotal(today);
    var lbl = Store.labelOf(today);
    var streak = Store.streak();

    var days = Store.lastDays(7);
    var chartData = days.map(function (k) {
      var l = Store.labelOf(k);
      return { label: l.weekday, value: Store.dayTotal(k), today: k === today };
    });
    var chartMax = Math.max(1000, Math.max.apply(null, chartData.map(function (d) { return d.value; })));

    var doneCount = GAMES.filter(function (g) { return best[g] != null; }).length;

    view.innerHTML =
      '<section class="home">' +

        installCard() +

        '<div class="card card--today">' +
          '<div class="today__head">' +
            '<span class="today__date">' + lbl.text + '</span>' +
            (streak > 0 ? '<span class="badge">' + T('연속 {n}일째', { n: streak }) + '</span>' : ('<span class="badge badge--soft">' + T('오늘 시작해요') + '</span>')) +
          '</div>' +
          progressRing(total) +
        '</div>' +

        ('<h2 class="sec">' + T('오늘의 게임') + '</h2>') +
        '<div class="gamelist">' + pickForHome(best).map(gameCard).join('') + '</div>' +
        (GAMES.length > HOME_GAMES
          ? ('<button class="btn btn--ghost btn--wide" id="hmMore">' + T('게임 모두 보기 (')) + GAMES.length + '가지)</button>'
          : '') +

        ('<h2 class="sec">' + T('최근 이레') + '</h2>') +
        '<div class="card">' +
          UI.barChart(chartData, chartMax) +
          ('<p class="card__foot">' + T('막대는 그날의 총점입니다. 같은 게임을 여러 번 하면 가장 높은 점수만 더해집니다.') + '</p>') +
        '</div>' +

        '<div class="row2">' +
          ('<button class="btn btn--ghost" id="hmRules">' + T('점수 규칙 한눈에') + '</button>') +
          ('<button class="btn btn--ghost" id="hmRecords">' + T('기록 자세히') + '</button>') +
        '</div>' +

        ('<p class="tipline">' + T('매일 조금씩, 여러 종목을 골고루 하는 것이 두뇌 건강에 좋습니다.') + '</p>') +
      '</section>';

    view.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.go); });
    });
    var ib = view.querySelector('#hmInstall');
    if (ib) ib.addEventListener('click', doInstall);
    var mb = view.querySelector('#hmMore');
    if (mb) mb.addEventListener('click', function () { go('games'); });
    view.querySelector('#hmRules').addEventListener('click', function () { showRules('all'); });
    view.querySelector('#hmRecords').addEventListener('click', function () { go('records'); });
  }

  /* ================= 기록 ================= */

  function renderRecords() {
    var st = Store.stats();
    var today = Store.dayKey();
    var days14 = Store.lastDays(14);
    var chartData = days14.map(function (k) {
      var l = Store.labelOf(k);
      return { label: l.date, value: Store.dayTotal(k), today: k === today };
    });
    var chartMax = Math.max(1000, Math.max.apply(null, chartData.map(function (d) { return d.value; })));

    var all = Store.allRecords();
    var keys = Object.keys(all).sort().reverse().slice(0, 60);

    view.innerHTML =
      '<section class="records">' +

        '<div class="stats">' +
          '<div class="stat"><b>' + UI.comma(st.plays) + ('</b><span>' + T('총 판수') + '</span></div>') +
          '<div class="stat"><b>' + UI.comma(st.days) + ('</b><span>' + T('플레이한 날') + '</span></div>') +
          '<div class="stat"><b>' + UI.comma(Store.streak()) + ('</b><span>' + T('연속 일수') + '</span></div>') +
          '<div class="stat"><b>' + UI.comma(st.avg) + ('</b><span>' + T('판당 평균') + '</span></div>') +
        '</div>' +

        ('<h2 class="sec">' + T('최근 2주 총점') + '</h2>') +
        '<div class="card">' + UI.barChart(chartData, chartMax) + '</div>' +

        ('<h2 class="sec">' + T('게임별 최고 기록') + '</h2>') +
        '<div class="card bestlist">' +
          GAMES.map(function (g) {
            var b = Store.bestEver(g);
            var s = st.byGame[g] || { plays: 0, sum: 0, best: 0 };
            return '<div class="bestrow">' +
              '<span class="bestrow__name">' + Games[g].name +
                '<em>' + (s.plays ? s.plays + (T('판 · 평균') + ' ') + Math.round(s.sum / s.plays) + '점' : T('기록 없음')) + '</em></span>' +
              '<span class="bestrow__score">' + (b ? UI.comma(b.score) + '<em>' + T('점 · {m}/{d}', { m: Store.labelOf(b.day).month, d: Store.labelOf(b.day).date }) + '</em>' : '—') + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +

        ('<h2 class="sec">' + T('날짜별 기록') + '</h2>') +
        (keys.length ? '<div class="daylist">' + keys.map(dayBlock).join('') + '</div>'
                     : ('<div class="card empty">' + T('아직 기록이 없습니다.') + '<br>' + T('게임을 한 판 해 보세요.') + '</div>')) +

        '<div class="row2">' +
          ('<button class="btn btn--ghost" id="rcExport">' + T('기록 내보내기') + '</button>') +
          ('<button class="btn btn--ghost" id="rcImport">' + T('기록 가져오기') + '</button>') +
        '</div>' +
        '<div class="row2">' +
          ('<button class="btn btn--ghost btn--danger" id="rcReset">' + T('기록 지우기') + '</button>') +
        '</div>' +
        '<input type="file" id="rcFile" accept="application/json,.json" hidden>' +
      '</section>';

    view.querySelectorAll('.day__head').forEach(function (h) {
      h.addEventListener('click', function () { h.parentElement.classList.toggle('is-open'); });
    });
    view.querySelector('#rcExport').addEventListener('click', exportRecords);
    view.querySelector('#rcImport').addEventListener('click', function () { view.querySelector('#rcFile').click(); });
    view.querySelector('#rcFile').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var n = Store.importJSON(String(fr.result));
          UI.toast(n ? n + '판의 기록을 불러왔습니다.' : T('새로 불러올 기록이 없습니다.'));
          renderRecords();
        } catch (err) {
          UI.modal({
            title: T('기록 가져오기'),
            body: ('<p class="modal__msg">' + T('파일을 읽지 못했습니다.') + '<br>') + UI.esc(err.message || '') + '</p>',
            actions: [{ label: T('닫기'), kind: 'accent' }]
          });
        }
      };
      fr.readAsText(f);
      e.target.value = '';
    });
    view.querySelector('#rcReset').addEventListener('click', function () {
      UI.confirm(T('기록 지우기'), T('지금까지의 모든 점수 기록이 사라집니다. 정말 지울까요?'), function () {
        Store.resetRecords();
        UI.toast(T('기록을 모두 지웠습니다.'));
        renderRecords();
      }, T('모두 지우기'));
    });
  }

  function dayBlock(key) {
    var lbl = Store.labelOf(key);
    var list = Store.dayRecords(key).slice().reverse();
    var total = Store.dayTotal(key);
    var best = Store.dayBest(key);

    return '<div class="day' + (key === Store.dayKey() ? ' is-open' : '') + '">' +
      '<button class="day__head">' +
        '<span class="day__date">' + lbl.text + '</span>' +
        '<span class="day__count">' +
          T('{n}종목', { n: GAMES.filter(function (g) { return best[g] != null; }).length }) +
        '</span>' +
        '<span class="day__total">' + UI.comma(total) + (T('점') + '</span>') +
      '</button>' +
      '<ul class="day__list">' +
        list.map(function (r) {
          var t = new Date(r.at);
          var hh = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
          return '<li>' +
            '<span class="rec__name">' + (Games[r.game] ? Games[r.game].name : r.game) +
              '<em>' + UI.esc(r.difficulty) + ' · ' + hh + ' · ' + UI.fmtTime(r.duration) + '</em></span>' +
            '<span class="rec__score">' + UI.comma(r.score) + '</span>' +
          '</li>';
        }).join('') +
      '</ul>' +
    '</div>';
  }

  function exportRecords() {
    var text = Store.exportJSON();
    var name = T('새록-기록-{d}.json', { d: Store.dayKey() });
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      UI.toast(T('기록 파일을 내려받았습니다.'));
    } catch (e) {
      UI.modal({
        title: T('기록 내보내기'),
        body: ('<p class="modal__msg">' + T('아래 내용을 복사해 보관하세요.') + '</p><textarea class="export" readonly>') + UI.esc(text) + '</textarea>',
        actions: [{ label: T('닫기'), kind: 'accent' }]
      });
    }
  }

  /* ================= 규칙 / 게임 전환 / 설정 ================= */

  function rulesTable(g) {
    return '<h3 class="rules__h">' + Games[g].rules.title + '</h3>' +
      '<table class="rules"><tbody>' +
      Games[g].rules.lines.map(function (l) {
        return '<tr><th>' + UI.esc(l[0]) + '</th><td>' + UI.esc(l[1]) + '</td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  function showRules(which) {
    var body = which === 'all'
      ? ('<p class="modal__msg">' + T('모든 게임이') + ' <b>' + T('기본 1,000점 만점') + '</b>' + T('이고, 어려운 난이도를 고르면 보너스가 더해집니다. 하루 만점은') + ' ') + UI.comma(MAX_DAY) + (T('점입니다.') + '</p>') +
        GAMES.map(rulesTable).join('') +
        '<p class="modal__msg small">같은 게임을 여러 번 해도 그날 총점에는 <b>가장 높은 점수</b>만 반영됩니다. 판마다의 기록은 모두 남습니다.</p>'
      : rulesTable(which);

    UI.modal({ title: which === 'all' ? '점수 규칙' : '', body: body, actions: [{ label: T('닫기'), kind: 'accent' }] });
  }

  function gameSwitcher(from) {
    var others = GAMES.concat(['records']).filter(function (g) { return g !== from; });
    var body = '<div class="switcher">' + others.map(function (g) {
      var name = g === 'records' ? '나의 기록' : Games[g].name;
      var sub = g === 'records' ? '날짜별 점수 보기'
        : (Games[g].hasProgress() ? '진행 중인 판이 있습니다' : T('새로 시작하기'));
      return '<button class="switcher__item" data-go="' + g + '">' +
        '<span class="switcher__txt">' + name + '<em>' + sub + '</em></span></button>';
    }).join('') + '</div>';

    var m = UI.modal({
      title: T('어디로 갈까요?'),
      body: body,
      actions: [{ label: T('계속 하기'), kind: 'accent' }]
    });
    m.card.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { m.close(); go(b.dataset.go); });
    });
  }

  function showSettings() {
    var s = Store.settings();
    var body =
      '<div class="settings">' +
        '<div class="set">' +
          '<span class="set__lbl">' + T(T('말')) + '</span>' +
          '<div class="seg" id="setLang">' +
            I18N.langs.map(function (o) {
              return '<button data-v="' + o.code + '"' + (I18N.get() === o.code ? ' class="is-on"' : '') +
                '>' + o.name + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="set">' +
          ('<span class="set__lbl">' + T('글씨 크기') + '</span>') +
          '<div class="seg" id="setFs">' +
            [['md', T('보통')], ['lg', T('크게')], ['xl', T('아주 크게')]].map(function (o) {
              return '<button data-v="' + o[0] + '"' + (s.fontScale === o[0] ? ' class="is-on"' : '') + '>' + o[1] + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="set">' +
          ('<span class="set__lbl">' + T('소리') + '</span>') +
          '<div class="seg" id="setSound">' +
            '<button data-v="on"' + (s.sound ? ' class="is-on"' : '') + ('>' + T('켜기') + '</button>') +
            '<button data-v="off"' + (!s.sound ? ' class="is-on"' : '') + ('>' + T('끄기') + '</button>') +
          '</div>' +
        '</div>' +
        '<div class="set">' +
          ('<span class="set__lbl">' + T('버전') + '</span>') +
          '<span class="set__ver">' + APP_VERSION + '</span>' +
        '</div>' +
        ('<button class="btn btn--ghost" id="setUpdate">' + T('최신 버전으로 새로 받기') + '</button>') +
        ('<p class="modal__msg small">' + T('기록은 이 기기 안에만 저장됩니다. 앱을 지우거나 브라우저 기록을 삭제하면 점수도 함께 사라지니, 필요하면') + ' <b>' + T('기록 내보내기') + '</b>' + T('로 파일을 보관하세요. (새로 받아도 점수는 지워지지 않습니다.)') + '</p>') +
      '</div>';

    var m = UI.modal({ title: T('설정'), body: body, actions: [{ label: T('닫기'), kind: 'accent' }] });

    m.card.querySelectorAll('#setLang button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (I18N.get() === b.dataset.v) return;
        Store.setSetting('lang', b.dataset.v);
        I18N.set(b.dataset.v);
        relist();                          // 그 말로 못 하는 게임은 목록에서 빠진다
        m.close();
        go('home');
      });
    });

    m.card.querySelectorAll('#setFs button').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.setSetting('fontScale', b.dataset.v);
        applySettings();
        m.card.querySelectorAll('#setFs button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
    });
    m.card.querySelector('#setUpdate').addEventListener('click', forceUpdate);

    m.card.querySelectorAll('#setSound button').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.setSetting('sound', b.dataset.v === 'on');
        if (b.dataset.v === 'on') UI.beep('ok');
        m.card.querySelectorAll('#setSound button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
    });
  }

  function applySettings() {
    document.documentElement.dataset.fs = Store.settings().fontScale || 'md';
  }

  /** 서버에서 새 파일을 받아 온다. 점수 기록은 건드리지 않는다.
   *
   * 중요: 저장해 둔 파일을 먼저 지우면 안 된다.
   * 서버에 연결되지 않는 상태에서 지워 버리면 새로 받지도 못하고
   * 저장본까지 사라져 앱이 아예 열리지 않게 된다.
   * 그래서 '연결 확인 → 서비스워커 갱신 → 다시 열기' 순서로만 진행한다.
   * (옛 파일은 새 파일을 다 받은 뒤에 서비스워커가 알아서 정리한다.)
   */
  function forceUpdate() {
    UI.toast(T('연결을 확인하는 중입니다…'), 3000);

    fetch('./index.html?probe=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res || !res.ok) throw new Error('unreachable');

        var step = navigator.serviceWorker
          ? navigator.serviceWorker.getRegistrations().then(function (rs) {
              return Promise.all(rs.map(function (r) { return r.update(); }));
            })['catch'](function () { /* 갱신에 실패해도 다시 열기는 한다 */ })
          : Promise.resolve();

        return step.then(function () {
          var base = location.href.split('#')[0].split('?')[0];
          location.replace(base + '?u=' + Date.now() + '#home');
        });
      })['catch'](function () {
        UI.modal({
          title: T('지금은 새로 받을 수 없습니다'),
          body: ('<p class="modal__msg">' + T('인터넷에 연결되어 있지 않거나, 앱을 내려받은 주소에 연결할 수 없습니다.')) +
                ('<br><br>' + T('걱정하지 않으셔도 됩니다.') + ' <b>' + T('지금 저장된 것으로 게임은 그대로 하실 수 있고, 점수도 안전합니다.') + '</b>') +
                (' ' + T('나중에 인터넷이 연결된 뒤 다시 눌러 주세요.') + '</p>'),
          actions: [{ label: T('확인'), kind: 'accent' }]
        });
      });
  }

  /* ================= 시작 ================= */

  function init() {
    view = document.getElementById('view');
    I18N.start();                        // 저장된 말, 없으면 브라우저 말
    relist();
    applySettings();

    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { go(t.dataset.route); });
    });
    document.getElementById('btnBack').addEventListener('click', function () { go('home'); });
    document.getElementById('btnSettings').addEventListener('click', showSettings);

    // 화면을 벗어날 때 진행 상황을 저장한다
    window.addEventListener('pagehide', function () { if (current && Games[current]) Games[current].unmount(); });
    document.addEventListener('visibilitychange', function () {
      if (!current || !Games[current]) return;
      if (document.hidden) Games[current].unmount();
      else if (document.getElementById('modalRoot').hidden) Games[current].mount(view);
    });

    var start = (location.hash || '').replace('#', '');
    go(['home', 'records'].concat(GAMES).indexOf(start) >= 0 ? start : 'home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { go: go, showRules: showRules, gameSwitcher: gameSwitcher, showSettings: showSettings, MAX_PER_GAME: MAX_PER_GAME, MAX_DAY: MAX_DAY };
})();
