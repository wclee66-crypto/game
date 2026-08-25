/* 새록 — 화면 전환과 홈·기록 화면 */
window.App = (function () {

  var APP_VERSION = 'v55';                // sw.js 의 VERSION 과 함께 올린다

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
  var HOME_GAMES = 3;                    // 좁은 화면에서 홈에 추려 보여 줄 개수

  /* 컴퓨터처럼 넓은 화면(게임 칸이 두세 줄로 놓이는 폭)에서는 홈에 모두 보여 준다.
     휴대폰·태블릿은 한 줄로 쌓여 홈이 너무 길어지므로 셋만 보여 주고
     '게임 모두 보기' 로 넘어가게 둔다. 기준 폭은 css/style.css 의 격자와 같다. */
  function wideScreen() {
    return !!(window.matchMedia && window.matchMedia('(min-width: 1100px)').matches);
  }

  var view, current = null, here = 'home';

  /* ================= 앱 설치 ================= */
  /* 크롬 계열은 설치 조건을 만족하면 beforeinstallprompt 를 보내 준다.
     그 순간을 잡아 두었다가 맨 위 줄의 '앱 설치' 단추에 연결한다. */
  var installEvent = null;
  var installed = false;                  // 이 판에서 설치를 마쳤는가

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    syncInstallBtn();
  });
  window.addEventListener('appinstalled', function () {
    installEvent = null;
    installed = true;                     // 설치했는데 또 권하면 안 된다
    UI.toast(T('홈 화면에 설치되었습니다.'));
    syncInstallBtn();
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

  /* 이 사이트가 무엇을 하는 곳인지 한 번은 알려 드린다.
     처음 오신 분에게는 꼭 필요하지만, 매일 오시는 분에게는 자리만 차지하므로
     닫으면 다시 나오지 않는다. (설정에 introDone 으로 남는다) */
  /* 검색용 낱장 페이지로 가는 길. 말에 따라 주소가 다르다. */
  function aboutHref() { return (I18N.get() === 'en' ? '/en' : '') + '/print/'; }

  function introCard() {
    if (Store.settings().introDone) return '';
    return '<section class="about">' +
      '<button class="about__x" id="hmAboutX" aria-label="' + T('닫기') + '">×</button>' +
      '<h2 class="about__h">' + T('머리를 쓰는 일이 가장 좋은 예방입니다') + '</h2>' +
      '<p class="about__p">' +
        T('새록은 초기 치매 및 인지 장애 개선에 도움이 되는 게임을 무료로 이용하실 수 있는 ' +
          '두뇌 훈련 놀이터입니다. 어렵지 않은 놀이를 매일 조금씩 하시면 됩니다. ' +
          '컴퓨터·태블릿·휴대폰 어디서나 열리고, 화면이 불편하시면 문제를 인쇄하여 사용하실 수도 있습니다.') +
      '</p>' +
      /* 왜 만들었는지를 짧게 적는다 — 처음 오신 분이 믿고 써 보시게 하는 것은 기능 설명이 아니다 */
      '<p class="about__p about__note">' +
        T('제가 치매를 앓으시는 어머니를 위해 인터넷에서 문제를 검색하다가 찾기가 너무 힘들어 ' +
          '직접 만들어 쓰던 것입니다. 다른 분들에게도 도움이 되면 좋겠다는 생각에 올려 봅니다.') +
      '</p>' +
      '<button class="about__more" id="hmAbout">' + T('종이 문제지 안내 보기') + '</button>' +
    '</section>';
  }

  /* 설치 안내에 무엇을 적을지 한 곳에서 정한다.
     null 이면 안내할 것이 없다 (이미 앱으로 실행 중).
     예전에는 홈 맨 위에 상자로 놓였는데, 매일 오시는 분에게는 자리만 차지해
     2026-08-22 에 맨 위 줄의 작은 단추로 옮겼다. */
  function installInfo() {
    if (isStandalone() || installed) return null;      // 이미 앱이거나 방금 설치함

    if (isInApp()) {
      return { title: T('여기서는 설치할 수 없습니다'),
        detail: T('카카오톡·네이버 앱 안에서 열린 화면입니다.<br>오른쪽 위 <b>⋮</b> 또는 <b>⋯</b> → <b>다른 브라우저로 열기</b> 를 눌러<br>크롬이나 삼성 인터넷에서 다시 열어 주세요.') };
    }

    if (installEvent) {                                // 크롬 계열이 설치 가능하다고 알려 온 상태
      return { now: true, title: T('앱으로 설치하기'),
        detail: T('홈 화면에 아이콘이 생기고, 인터넷 없이도 열립니다') };
    }

    if (isIOSSafari()) {
      return { title: T('앱으로 설치하려면'),
        detail: T('아래쪽 <b>공유 버튼 ⬆</b> → <b>홈 화면에 추가</b> 를 누르세요.<br>아이폰은 이것이 정식 설치 방법입니다.') };
    }
    if (isIOS()) {
      return { title: T('Safari로 열어 주세요'),
        detail: T('아이폰·아이패드는 <b>Safari</b>에서만 앱으로 설치됩니다.<br>이 주소를 Safari에서 다시 열어 주세요.') };
    }

    return { title: T('앱으로 설치하려면'),
      detail: T('브라우저 메뉴 <b>⋮</b> → <b>앱 설치</b> 를 누르세요.<br>“홈 화면에 추가”만 보이면 <b>새로고침</b> 한 번 뒤 다시 열어 보세요.') };
  }

  /** 맨 위 줄의 설치 단추를 보이거나 감춘다 */
  function syncInstallBtn() {
    var b = document.getElementById('btnInstall');
    if (b) b.hidden = !installInfo();
  }

  /** 설치 단추를 눌렀을 때 */
  function showInstall() {
    var info = installInfo();
    if (!info) return;
    if (info.now) { doInstall(); return; }             // 바로 설치할 수 있으면 곧장 띄운다
    UI.modal({
      title: info.title,
      body: '<p class="modal__msg">' + info.detail + '</p>',
      actions: [{ label: T('알겠습니다'), kind: 'primary' }]
    });
  }

  function doInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    installEvent.userChoice.then(function (res) {
      if (res && res.outcome === 'accepted') installEvent = null;
      syncInstallBtn();
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
        '<text class="ring__txt" x="43" y="48" text-anchor="middle">' + (doneCount >= goal ? T('다 함') : doneCount + '/' + goal) + '</text>' +
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
    var sub = resume ? T('이어서 할 수 있어요') : (s != null ? T('오늘 최고 기록') : T('아직 안 하셨어요'));

    /* 오늘 한 게임은 칸 전체를 옅은 초록으로 물들인다 —
       기호를 없앤 대신 T('무엇을 했는지')가 한눈에 보이도록. */
    var state = s != null ? ' is-done' : (resume ? ' is-resume' : '');
    var right = s != null
      ? '<span class="gcard__go">' + UI.comma(s) + ('<small>' + T('점') + '</small></span>')
      : '<span class="gcard__go is-new' + (resume ? ' is-resume' : '') + '">' +
        (resume ? T('이어하기') : T('시작하기')) + '</span>';
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
      .slice(0, wideScreen() ? GAMES.length : HOME_GAMES)
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
    var homeList = pickForHome(best);

    view.innerHTML =
      '<section class="home">' +

        introCard() +

        '<div class="card card--today">' +
          '<div class="today__head">' +
            '<span class="today__date">' + lbl.text + '</span>' +
            (streak > 0 ? '<span class="badge">' + T('연속 {n}일째', { n: streak }) + '</span>' : ('<span class="badge badge--soft">' + T('오늘 시작해요') + '</span>')) +
          '</div>' +
          progressRing(total) +
        '</div>' +

        ('<h2 class="sec">' + T('오늘의 게임') + '</h2>') +
        '<div class="gamelist">' + homeList.map(gameCard).join('') + '</div>' +
        (homeList.length < GAMES.length
          ? '<button class="btn btn--ghost btn--wide" id="hmMore">' + T('게임 모두 보기 ({n}가지)', { n: GAMES.length }) + '</button>'
          : '') +

        ('<h2 class="sec">' + T('최근 일주일') + '</h2>') +
        '<div class="card">' +
          UI.barChart(chartData, chartMax) +
          ('<p class="card__foot">' + T('막대는 그날의 총점입니다. 같은 게임을 여러 번 하면 가장 높은 점수만 더해집니다.') + '</p>') +
        '</div>' +

        '<div class="row3">' +
          ('<button class="btn btn--ghost" id="hmRules">' + T('점수 규칙 한눈에') + '</button>') +
          ('<button class="btn btn--ghost" id="hmRecords">' + T('기록 자세히') + '</button>') +
          ('<button class="btn btn--ghost btn--print" id="hmPrint">' + T('문제 인쇄') +
            '<small>' + T('문제를 A4 용지로 인쇄하여 직접 풀이할 수 있습니다') + '</small></button>') +
        '</div>' +

        (Suggest.ready() ? ('<button class="linkbtn" id="hmSuggest">' + T('건의하기') + '</button>') : '') +

        ('<p class="tipline">' + T('매일 조금씩, 여러 종목을 골고루 하는 것이 두뇌 건강에 좋습니다.') + '</p>') +
      '</section>';

    view.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.go); });
    });
    var ax = view.querySelector('#hmAboutX');
    if (ax) ax.addEventListener('click', function () {
      Store.setSetting('introDone', true);
      renderHome();
    });
    var mb = view.querySelector('#hmMore');
    if (mb) mb.addEventListener('click', function () { go('games'); });
    view.querySelector('#hmRules').addEventListener('click', function () { showRules('all'); });
    view.querySelector('#hmRecords').addEventListener('click', function () { go('records'); });
    view.querySelector('#hmPrint').addEventListener('click', function () { Print.mixedDialog(); });
    var sg = view.querySelector('#hmSuggest');
    if (sg) sg.addEventListener('click', function () { Suggest.open(); });
    var ab = view.querySelector('#hmAbout');
    if (ab) ab.addEventListener('click', function () { location.href = aboutHref(); });
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
                '<em>' + (s.plays ? T('{p}판 · 평균 {avg}점', { p: s.plays, avg: Math.round(s.sum / s.plays) }) : T('기록 없음')) + '</em></span>' +
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
          UI.toast(n ? n + T('판의 기록을 불러왔습니다.') : T('새로 불러올 기록이 없습니다.'));
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
      ? '<p class="modal__msg">' + T('모든 게임이 <b>기본 1,000점 만점</b>이고, 어려운 난이도를 고르면 보너스가 더해집니다. 하루 만점은 {n}점입니다.', { n: UI.comma(MAX_DAY) }) + '</p>' +
        GAMES.map(rulesTable).join('') +
        ('<p class="modal__msg small">' + T('같은 게임을 여러 번 해도 그날 총점에는 <b>가장 높은 점수</b>만 반영됩니다. 판마다의 기록은 모두 남습니다.') + '</p>')
      : rulesTable(which);

    UI.modal({ title: which === 'all' ? T('점수 규칙') : '', body: body, actions: [{ label: T('닫기'), kind: 'accent' }] });
  }

  /* 게임을 나타내는 작은 그림. 게임 파일의 art 를 그대로 쓴다.
     art 가 없는 게임은 동그라미 하나로 대신한다 — 화면이 비지 않게. */
  var RECORDS_ART = '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>';
  function gameArt(g) {
    var d = g === 'records' ? RECORDS_ART : (Games[g] && Games[g].art);
    if (!d) d = '<circle cx="12" cy="12" r="7"/>';
    return '<svg class="switcher__art" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }

  function gameSwitcher(from) {
    var others = GAMES.concat(['records']).filter(function (g) { return g !== from; });
    var body = '<div class="switcher">' + others.map(function (g) {
      var name = g === 'records' ? T('나의 기록') : Games[g].name;
      var sub = g === 'records' ? T('날짜별 점수 보기')
        : (Games[g].hasProgress() ? T('진행 중인 판이 있습니다') : T('새로 시작하기'));
      return '<button class="switcher__item" data-go="' + g + '">' +
        '<span class="switcher__txt">' + name + '<em>' + sub + '</em></span>' +
        gameArt(g) + '</button>';
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
          '<span class="set__lbl">' + T('언어') + '</span>' +
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
        (Suggest.ready() ? ('<button class="btn btn--ghost" id="setSuggest">' + T('건의하기') + '</button>') : '') +
        ('<button class="btn btn--ghost" id="setUpdate">' + T('최신 버전으로 새로 받기') + '</button>') +
        ('<p class="modal__msg small">' + T('기록은 이 기기 안에만 저장됩니다. 앱을 지우거나 브라우저 기록을 삭제하면 점수도 함께 사라지니, 필요하면') + ' <b>' + T('기록 내보내기') + '</b>' + T('로 파일을 보관하세요. (새로 받아도 점수는 지워지지 않습니다.)') + '</p>') +
      '</div>';

    var m = UI.modal({ title: T('설정'), body: body, actions: [{ label: T('닫기'), kind: 'accent' }] });

    m.card.querySelectorAll('#setLang button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (I18N.get() === b.dataset.v) return;
        Store.setSetting('lang', b.dataset.v);
        /* 게임 이름·설명은 파일을 처음 읽을 때 정해지므로 화면만 다시 그려서는 안 바뀐다.
           통째로 다시 열어야 모든 글이 새 말로 바뀐다. 점수 기록은 그대로 남는다. */
        location.reload();
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
    var sgb = m.card.querySelector('#setSuggest');
    if (sgb) sgb.addEventListener('click', function () { m.close(); Suggest.open(); });
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

  /* index.html 에 박혀 있는 글(아래 탭·브라우저 제목·설명)을 고른 말로 바꾼다 */
  function localizeShell() {
    var TABS = { home: T('홈'), games: T('게임 고르기'), records: T('나의 기록') };
    document.querySelectorAll('.tab').forEach(function (t) {
      var lbl = t.querySelector('.tab__lbl');
      if (lbl && TABS[t.dataset.route]) lbl.textContent = T(TABS[t.dataset.route]);
    });
    var inst = document.getElementById('btnInstall');
    if (inst) {
      inst.querySelector('.appbar__inst-txt').textContent = T('앱 설치');
      inst.setAttribute('aria-label', T('앱으로 설치하기'));
    }
    document.title = T('새록 · 두뇌 훈련');
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', T('스도쿠·낱말찾기·숫자 계산·단어 순서·상식퀴즈·색칠 공부·틀린그림찾기를 매일 조금씩. 날짜별 점수가 기록되는 치매 예방 두뇌 훈련 앱'));
  }


  function init() {
    view = document.getElementById('view');
    relist();                            // 말은 js/i18n.js 에서 이미 정해졌다
    localizeShell();
    applySettings();

    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { go(t.dataset.route); });
    });
    document.getElementById('btnBack').addEventListener('click', function () { go('home'); });
    document.getElementById('btnSettings').addEventListener('click', showSettings);
    document.getElementById('btnInstall').addEventListener('click', showInstall);
    syncInstallBtn();

    // 화면을 벗어날 때 진행 상황을 저장한다
    window.addEventListener('pagehide', function () { if (current && Games[current]) Games[current].unmount(); });
    document.addEventListener('visibilitychange', function () {
      if (!current || !Games[current]) return;
      if (document.hidden) Games[current].unmount();
      else if (document.getElementById('modalRoot').hidden) Games[current].mount(view);
    });

    /* 넓은 화면 기준을 넘나들면 홈에 보여 줄 개수가 달라지므로 다시 그린다 */
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 1100px)');
      var onWide = function () { if (here === 'home') renderHome(); };
      if (mq.addEventListener) mq.addEventListener('change', onWide);
      else if (mq.addListener) mq.addListener(onWide);
    }

    var start = (location.hash || '').replace('#', '');
    go(['home', 'records'].concat(GAMES).indexOf(start) >= 0 ? start : 'home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    go: go, showRules: showRules, gameSwitcher: gameSwitcher, showSettings: showSettings,
    version: function () { return APP_VERSION; },
    MAX_PER_GAME: MAX_PER_GAME, MAX_DAY: MAX_DAY
  };
})();
