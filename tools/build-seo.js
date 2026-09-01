/* 새록 — 검색용 페이지 만들기
 *
 * 앱 자체는 화면 하나짜리라 검색에 거의 걸리지 않습니다.
 * 그래서 게임마다 '글이 있는 페이지'를 따로 만들어 둡니다.
 * 내용은 게임 파일에서 그대로 읽어 오므로, 게임이 늘면 페이지도 저절로 늘어납니다.
 *
 *   node tools/build-seo.js
 *
 * 만들어지는 것 (모두 지웠다가 다시 만듭니다)
 *   /sudoku/index.html …      게임마다 한 장 (한국어)
 *   /en/sudoku/index.html …   영어
 *   /print/index.html         종이 문제지 안내 — 검색에서 가장 값어치 있는 자리
 *   /sitemap.xml  /robots.txt
 */
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SITE = process.env.SAEROK_SITE || 'https://playsaerok.com';

/* ================= 게임 파일 읽어 오기 ================= */

/** 게임 파일들은 브라우저에서 도는 것이라, 없는 것을 흉내 내 준다 */
function loadGames(lang) {
  var w = {};
  w.window = w;
  w.navigator = { language: lang };
  w.location = { search: '', hash: '', href: '', pathname: '/' };
  w.document = {
    documentElement: { setAttribute: function () {}, dataset: {} },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function () { return { style: {}, classList: { add: function () {} } }; },
    addEventListener: function () {}
  };
  w.addEventListener = function () {};
  w.setTimeout = function () {}; w.clearTimeout = function () {};
  w.setInterval = function () {}; w.clearInterval = function () {};
  w.requestAnimationFrame = function () {};
  w.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  w.matchMedia = function () { return { matches: false, addEventListener: function () {}, addListener: function () {} }; };
  w.fetch = function () { return { then: function () { return this; }, catch: function () { return this; } }; };
  w.Store = {
    settings: function () { return { lang: lang, fontScale: 'md', sound: true }; },
    setSetting: function () {}, dayKey: function () { return '2026-01-01'; },
    getSession: function () { return null; }, saveSession: function () {}, clearSession: function () {},
    addRecord: function () {}, bestEver: function () { return null; }, dayBest: function () { return {}; },
    getWrong: function () { return []; }, labelOf: function () { return { text: '', month: 1, date: 1 }; }
  };
  w.UI = {
    esc: function (s) { return String(s); }, h: function () { return w.document.createElement(); },
    toast: function () {}, modal: function () { return { card: w.document, close: function () {} }; },
    confirm: function () {}, beep: function () {}, comma: function (n) { return n; },
    fmtTime: function () { return ''; }, resultModal: function () {}, barChart: function () { return ''; }
  };
  w.App = { go: function () {}, showRules: function () {}, gameSwitcher: function () {}, version: function () { return ''; } };
  w.Print = { dialog: function () {}, coloringNow: function () {}, mixedDialog: function () {} };
  w.Suggest = { open: function () {} };

  function run(rel) {
    var code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    /* with(w) 로 감싸 브라우저의 window 처럼 보이게 한다 */
    var fn = new Function('window', 'with (window) { ' + code + '\n }');
    fn(w);
  }

  run('js/i18n.js');
  run('js/lang/en.js');
  run('js/lang/ja.js');
  w.I18N.set(lang);
  run('js/data/quiz-data.js');
  run('js/data/quiz-data-en.js');
  run('js/data/words.js');
  run('js/data/words-en.js');
  run('js/data/order-words.js');
  run('js/data/order-words-en.js');
  run('js/data/pictures.js');

  ['sudoku', 'wordsearch', 'math', 'wordorder', 'quiz', 'coloring', 'spot', 'maze', 'mathcross', 'copyfig', 'dot2dot', 'shapecount', 'clock'].forEach(function (id) {
    run('js/games/' + id + '.js');
  });

  var out = [];
  Object.keys(w.Games).forEach(function (id) {
    var G = w.Games[id];
    if (G.langs && G.langs.indexOf(lang) < 0) return;       /* 그 말로 못 하는 게임은 뺀다 */
    out.push({
      id: id, name: G.name, tagline: G.tagline || '',
      rules: G.rules, levels: G.levels, order: G.levelOrder || [],
      canPrint: !!G.makeForPrint,
      langs: G.langs || null                                  /* 어느 말에서 되는 게임인가 */
    });
  });
  return { games: out, T: w.I18N.t };
}

/* ================= 글 ================= */

var COPY = {
  ko: {
    brand: '새록',
    siteName: '새록 · 두뇌 훈련',
    home: '홈으로',
    play: '지금 해 보기',
    printPage: '문제지 인쇄하기',
    otherGames: '다른 게임',
    levels: '난이도 5단계',
    scoring: '점수 규칙',
    free: '모두 무료입니다. 회원가입도 필요 없습니다.',
    intro: '새록은 초기 치매 및 인지 장애 개선에 도움이 되는 게임을 무료로 이용하실 수 있는 ' +
           '두뇌 훈련 놀이터입니다. 컴퓨터·태블릿·휴대폰 어디서나 열리고, ' +
           '화면이 불편하시면 문제를 인쇄하여 사용하실 수도 있습니다.',
    printTitle: '어르신 두뇌 훈련 문제지',
    printLead: '초기 치매 및 인지 장애 개선에 도움이 되는 ' +
               '스도쿠·낱말찾기·숫자 계산·단어 순서·색칠 공부·틀린그림찾기 게임을 ' +
               'A4 용지에 몇 장이든 무료로 인쇄하실 수 있습니다.',
    printWho: '요양보호사·사회복지사·주간보호센터·노인복지관에서 그대로 쓰실 수 있습니다. ' +
              '누를 때마다 새 문제가 만들어지므로 같은 문제지를 다시 쓸 일이 없습니다.',
    printHow: '인쇄 방법',
    printSteps: [
      '홈 화면 아래쪽의 「문제 인쇄」을 누릅니다.',
      '어떤 게임을, 몇 단계로, 몇 장 인쇄할지 고릅니다.',
      '「만들기」를 누르면 인쇄 창이 열립니다.',
      '종이에 찍지 않고 파일로 두시려면, 인쇄 창의 프린터를 「Microsoft Print to PDF」나 「PDF로 저장」으로 바꾸세요.'
    ],
    printNote: '문제지에는 시간·점수 같은 화면용 정보가 인쇄되지 않습니다. 정답지도 함께 인쇄하실 수 있습니다.',
    printList: '인쇄 가능 문제지',
    pdfTitle: '문제지 내려받기 (PDF)',
    pdfLead: '아래에서 바로 내려받아 인쇄하실 수 있습니다. ' +
             '한 파일에 문제지 네 장과 정답지가 함께 들어 있습니다.',
    pdfFresh: '내려받는 파일은 미리 만들어 둔 것이라 늘 같은 문제입니다. ' +
              '누를 때마다 새 문제를 받으시려면 홈에서 「문제 인쇄」를 쓰십시오.',
    pdfEach: '내려받기',
    langNote: 'English',
    aboutTitle: '이 사이트는',
    story: '제가 치매를 앓으시는 어머니를 위해 인터넷에서 문제를 검색하다가 찾기가 너무 힘들어 ' +
           '직접 만들어 쓰던 것입니다. 다른 분들에게도 도움이 되면 좋겠다는 생각에 올려 봅니다.',
    shotCap: '실제로 인쇄되는 문제지입니다. 누를 때마다 새 문제가 만들어집니다.',
    shotList: '문제지 미리 보기'
  },
  en: {
    brand: 'Saerok',
    siteName: 'Saerok · Brain Training',
    home: 'Home',
    play: 'Play online — no app to install',
    printPage: 'Free printable worksheets',
    otherGames: 'Other games',
    levels: 'Five levels',
    scoring: 'Scoring',
    free: 'Everything is free. No sign-up.',
    intro: 'Saerok is a brain-training playground where games that help with early dementia and ' +
           'mild cognitive decline are free to play. It works on a computer, a tablet or a phone, ' +
           'and if the screen is hard to use you can print the puzzles instead.',
    printTitle: 'Free printable brain puzzles for seniors',
    printLead: 'Print as many A4 worksheets as you like — sudoku, word search, mental math, word order, ' +
               'colour by number and spot the difference. No sign-up, no cost.',
    printWho: 'Made for carers, care homes, day centres and families. Every sheet is generated fresh, ' +
              'so you never hand out the same worksheet twice.',
    printHow: 'How to print',
    printSteps: [
      'Open the home screen and tap “Print puzzles” near the bottom.',
      'Choose which game, which level and how many sheets.',
      'Tap “Make it” and the print window opens.',
      'To save a file instead of printing, set the printer to “Microsoft Print to PDF” or “Save as PDF”.'
    ],
    printNote: 'Times and scores are never printed on a worksheet. Answer sheets are optional.',
    printList: 'What you can print',
    pdfTitle: 'Download the worksheets (PDF)',
    pdfLead: 'Download and print straight away — no sign-up, no email. ' +
             'Each file holds four worksheets and the answer sheets.',
    pdfFresh: 'These files are prepared in advance, so they always hold the same puzzles. ' +
              'For a fresh set every time, use “Print puzzles” on the site itself.',
    pdfEach: 'Download',
    langNote: 'Korean',
    aboutTitle: 'About this site',
    story: 'I went looking online for puzzles for my mother, who lives with dementia, and found it ' +
           'far too hard to find good ones — so I made these for her. I am putting them here in the ' +
           'hope that they help someone else too.',
    shotCap: 'A real worksheet. Every sheet is generated fresh when you print.',
    shotList: 'Worksheet preview'
  },
  ja: {
    brand: 'サエロク',
    siteName: 'サエロク · 脳トレ',
    home: 'ホーム',
    play: 'いますぐ遊ぶ — インストール不要',
    printPage: '無料プリント',
    otherGames: 'ほかのゲーム',
    levels: 'レベルは 5 段階',
    scoring: '点数のルール',
    free: 'すべて無料です。登録もいりません。',
    intro: 'サエロクは、初期の認知症や軽い物忘れの予防に役立つゲームを無料で遊べる脳トレの広場です。' +
           'パソコン・タブレット・スマホのどれでも開け、画面が使いにくいときは問題を印刷して紙で解くこともできます。',
    printTitle: '高齢者向け 無料脳トレプリント',
    printLead: 'ナンプレ・計算ドリル・迷路・点つなぎ・まちがいさがし・数字ぬり絵などの A4 プリントを、' +
               '何枚でも無料で印刷できます。登録も費用もいりません。',
    printWho: '介護施設・デイサービス・ご家庭でそのままお使いいただけます。' +
              '押すたびに新しい問題が作られるので、同じプリントを配ることがありません。',
    printHow: '印刷のしかた',
    printSteps: [
      'ホーム画面の「プリント印刷」を押します。',
      'どのゲームを、どのレベルで、何枚印刷するかえらびます。',
      '「作る」を押すと印刷画面が開きます。',
      '紙に出さずファイルにするには、印刷画面のプリンターを「PDF に保存」に変えてください。'
    ],
    printNote: 'プリントに時間や点数は印刷されません。答えのページも一緒に印刷できます。',
    printList: '印刷できるプリント',
    pdfTitle: 'プリントのダウンロード (PDF)',
    pdfLead: 'ここからすぐダウンロードして印刷できます。' +
             '1 ファイルにプリント 4 枚と答えが入っています。',
    pdfFresh: 'ダウンロードのファイルは作りおきなので、いつも同じ問題です。' +
              '毎回新しい問題がほしいときは、ホームの「プリント印刷」をお使いください。',
    pdfEach: 'ダウンロード',
    langNote: '日本語',
    aboutTitle: 'このサイトについて',
    story: '認知症の母のために問題を探しても、なかなか良いものが見つからず、自分で作って使っていたものです。' +
           'ほかの方のお役にも立てばと思い、公開しています。',
    shotCap: '実際に印刷されるプリントです。押すたびに新しい問題が作られます。',
    shotList: 'プリントの見本'
  }
};

/* ================= 문제지 미리보기 그림 ================= *
 * 왜 넣는가 — 사람들은 '치매 문제지'를 이미지 검색으로 찾아 그림을 보고 들어옵니다.
 * 그러려면 진짜 문제지 그림이 페이지에 있어야 하고, alt(그림 설명)에
 * 찾을 만한 말이 들어 있어야 합니다. 그림은 tools/build-images.js 가 만듭니다.
 */
var SHOT_IDS = ['sudoku', 'wordsearch', 'math', 'wordorder', 'coloring', 'spot', 'maze', 'mathcross', 'copyfig', 'dot2dot', 'shapecount', 'clock'];

/** PNG 앞머리에서 가로·세로를 읽는다 (그림 파일 규칙상 늘 같은 자리에 있다) */
function pngSize(f) {
  try {
    var b = fs.readFileSync(path.join(ROOT, 'images', f));
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  } catch (e) { return null; }          /* 그림이 아직 없어도 페이지는 만들어져야 한다 */
}

/* 말마다 다른 것들을 한 곳에 모아 둔다 — 새 말을 더할 때 여기와 COPY 만 채우면 된다 */
var LX = {
  ko: { base: '',    qs: '',         tail: '',    og: 'saerok-og.png',    self: '한국어' },
  en: { base: '/en', qs: '?lang=en', tail: '-en', og: 'saerok-og-en.png', self: 'English' },
  ja: { base: '/ja', qs: '?lang=ja', tail: '-ja', og: 'saerok-og-ja.png', self: '日本語' }
};
var ALL_LANGS = ['ko', 'en', 'ja'];

/** 그 게임이 그 말에서 되는가 */
function playable(g, lang) { return !g.langs || g.langs.indexOf(lang) >= 0; }

/* 말별로 한 벌씩 — 영어 그림은 -en, 일본어 그림은 -ja 가 붙는다 */
var SHOT = { ko: {}, en: {}, ja: {} };
ALL_LANGS.forEach(function (lang) {
  var tail = LX[lang].tail;
  SHOT_IDS.forEach(function (id) {
    var f = id + '-worksheet' + tail + '.png';
    var d = pngSize(f);
    if (d) SHOT[lang][id] = { f: f, w: d.w, h: d.h };
  });
});

/** 그 게임·그 말의 문제지 그림 — 없으면 null */
function shot(id, lang) { return (SHOT[lang] || {})[id] || null; }

/** 카톡·페이스북에 나올 가로 그림 이름 */
function ogName(id, lang) { return id + '-og' + LX[lang].tail + '.png'; }

/** 그림 설명 — 검색에 걸리는 것은 사실상 이 문장이다 */
function shotAlt(name, lang) {
  if (lang === 'ko') return name + ' 무료 인쇄 문제지 — 어르신 치매 예방 두뇌 훈련 활동지 (A4 한 장)';
  if (lang === 'ja') return name + ' 無料プリント — 高齢者の認知症予防 脳トレ活動シート (A4 一枚)';
  return name + ' printable worksheet — free A4 brain training activity sheet for seniors';
}

/** 그림이 있으면 페이지에 붙일 조각을 돌려준다 */
function shotFigure(id, name, lang, C) {
  var sh = shot(id, lang);
  if (!sh) return '';
  return '<figure class="doc__shot">\n' +
    '  <img src="/images/' + sh.f + '" width="' + sh.w + '" height="' + sh.h + '" loading="lazy" ' +
      'alt="' + esc(shotAlt(name, lang)) + '">\n' +
    '  <figcaption>' + esc(C.shotCap) + '</figcaption>\n' +
    '</figure>\n';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 페이지 한 장의 뼈대.
 *  o.alts: [{lang, href}] — 이 페이지의 말별 주소들 (자기 자신 포함).
 *  구글이 나라에 맞는 말의 페이지를 보여 주게 하는 표시다. */
function page(o) {
  var alt = (o.alts || []).map(function (a) {
    return '<link rel="alternate" hreflang="' + a.lang + '" href="' + a.href + '">';
  }).join('\n');
  return '<!DOCTYPE html>\n' +
'<html lang="' + o.lang + '">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<meta name="naver-site-verification" content="f0a6ed93a3d035f79ca2cdc2ab93f8002d5d9ad0">\n' +
'<title>' + esc(o.title) + '</title>\n' +
'<meta name="description" content="' + esc(o.desc) + '">\n' +
'<link rel="canonical" href="' + o.url + '">\n' +
alt + (alt ? '\n' : '') +
'<link rel="alternate" hreflang="x-default" href="' + SITE + '/">\n' +
'<meta property="og:type" content="website">\n' +
'<meta property="og:title" content="' + esc(o.title) + '">\n' +
'<meta property="og:description" content="' + esc(o.desc) + '">\n' +
'<meta property="og:url" content="' + o.url + '">\n' +
'<meta property="og:site_name" content="' + esc(o.siteName || '') + '">\n' +
'<meta property="og:image" content="' + SITE + '/images/' + (o.image || LX[o.lang].og) + '">\n' +
'<meta property="og:image:width" content="1200">\n' +
'<meta property="og:image:height" content="630">\n' +
'<meta property="og:image:alt" content="' + esc(o.imageAlt || o.title) + '">\n' +
'<meta name="twitter:card" content="summary_large_image">\n' +
'<link rel="icon" href="/favicon.ico" sizes="any">\n' +
'<link rel="icon" href="/icons/favicon-32.png" sizes="32x32">\n' +
'<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;700;800;900&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">\n' +
'<link rel="stylesheet" href="/css/style.css">\n' +
'<link rel="stylesheet" href="/css/page.css">\n' +
'<script src="/js/analytics.js" defer></script>\n' +
'</head>\n' +
'<body class="doc">\n' +
o.body +
'\n</body>\n</html>\n';
}

function header(C, lang, altLinks) {
  var others = (altLinks || []).map(function (a) {
    return '  <a class="doc__lang" href="' + a.href + '">' + a.label + '</a>\n';
  }).join('');
  return '<header class="doc__top">\n' +
    '  <a class="doc__brand" href="/' + LX[lang].qs + '">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="26" fill="currentColor"></rect>' +
      '<g fill="#fff"><path d="M45 80 Q40.8 58.8 22 48 Q26.2 69.3 45 80 Z" opacity=".55"></path>' +
      '<path d="M56 80 Q75.2 66.4 77 43 Q57.8 56.6 56 80 Z" opacity=".78"></path>' +
      '<path d="M50 81 Q61.5 49 50 17 Q38.5 49 50 81 Z"></path></g></svg>' +
      '<span>' + C.brand + '</span></a>\n' +
    others +
    '</header>\n';
}

/** 같은 페이지의 다른 말 주소들 — 머리(눈에 보이는 링크)와 head(구글용)가 함께 쓴다 */
function altsOf(kind, lang, avail) {
  return (avail || ALL_LANGS).filter(function (l) { return l !== lang; }).map(function (l) {
    return { lang: l, label: LX[l].self, href: SITE + LX[l].base + '/' + kind + '/' };
  });
}

function footer(C, lang, games, hereId) {
  var links = games.filter(function (g) { return g.id !== hereId; }).map(function (g) {
    return '<a href="' + LX[lang].base + '/' + g.id + '/">' + esc(g.name) + '</a>';
  }).join('');
  return '<nav class="doc__more">\n' +
    '  <h2>' + C.otherGames + '</h2>\n' +
    '  <div class="doc__links">' + links + '</div>\n' +
    '</nav>\n' +
    '<footer class="doc__foot">\n' +
    '  <a href="/' + LX[lang].qs + '">' + C.home + '</a> · ' +
    '<a href="' + LX[lang].base + '/print/">' + C.printPage + '</a>\n' +
    '  <p>' + C.free + '</p>\n' +
    '</footer>\n';
}

/* ================= 내려받는 문제지(PDF) ================= *
 * 왜 넣는가 — 영어권 사람들은 인쇄 창이 아니라 **파일 받기**를 기대합니다.
 * 미리 만들어 둔 PDF 를 한 번 눌러 받게 해 두면 그냥 나가 버리는 일이 줄고,
 * 구글이 PDF 도 검색에 넣어 주므로 파일 하나하나가 들어오는 길이 됩니다.
 * 파일은 tools/build-pdf.js 가 만듭니다. 아직 없으면 이 자리는 통째로 사라집니다.
 */
var pdfUrls = [];                       /* sitemap 에 적을 목록 */

/** 그 게임·그 단계의 PDF 가 실제로 있으면 크기(KB)를 돌려준다 */
function pdfKb(lang, id, n) {
  try {
    return Math.round(fs.statSync(path.join(ROOT, 'pdf', lang, id + '-level' + n + '.pdf')).size / 1024);
  } catch (e) { return 0; }
}

/** 받았을 때 남을 파일 이름 — 주소는 영어로 두고, 이름만 알아보기 쉽게 준다 */
function pdfName(lang, g, n) {
  if (lang === 'ko') return g.name + '-' + n + '단계-문제지.pdf';
  if (lang === 'ja') return g.name + '-レベル' + n + '-プリント.pdf';
  return (g.name + ' level ' + n + ' worksheets').replace(/\s+/g, '-').toLowerCase() + '.pdf';
}

/** 게임 하나치 — 단계마다 단추 하나 */
function pdfRow(lang, g) {
  var links = g.order.map(function (k, i) {
    var L = g.levels[k], n = i + 1;
    var kb = pdfKb(lang, g.id, n);
    if (!kb) return '';
    var href = '/pdf/' + lang + '/' + g.id + '-level' + n + '.pdf';
    pdfUrls.push(href);
    return '<a class="doc__dl" href="' + href + '" download="' + esc(pdfName(lang, g, n)) + '">' +
      '<b>' + esc(lang === 'ko' ? L.step + '단계' : lang === 'ja' ? 'レベル' + L.step : L.step) + '</b>' +
      '<span>' + esc(L.name) + '</span>' +
      '<em>PDF · ' + kb + 'KB</em></a>';
  }).join('');
  if (!links) return '';
  return '<div class="doc__dlrow"><h3>' + esc(g.name) + '</h3>' +
    '<div class="doc__dls">' + links + '</div></div>';
}

/** 여러 게임치를 한 덩어리로 */
function pdfBlock(lang, C, list) {
  var rows = list.map(function (g) { return pdfRow(lang, g); }).join('');
  if (!rows) return '';
  return '<h2 id="download">' + esc(C.pdfTitle) + '</h2>\n' +
    '<p>' + esc(C.pdfLead) + '</p>\n' +
    '<div class="doc__dlwrap">' + rows + '</div>\n' +
    '<p class="doc__note">' + esc(C.pdfFresh) + '</p>\n';
}

/* ================= 게임 한 장 ================= */

function gamePage(g, lang, C, games) {
  var base = LX[lang].base;
  var url = SITE + base + '/' + g.id + '/';
  /* 이 게임이 되는 말들끼리만 서로 가리킨다 */
  var avail = ALL_LANGS.filter(function (l) { return playable(g, l); });
  var alts = altsOf(g.id, lang, avail);
  var appUrl = '/' + LX[lang].qs + '#' + g.id;

  var lv = g.order.map(function (k) {
    var L = g.levels[k];
    return '<li><b>' + esc((lang === 'ko' ? L.step + '단계 ' : lang === 'ja' ? 'レベル' + L.step + ' ' : L.step + '. ') + L.name) + '</b>' +
      (L.note ? ' — ' + esc(L.note) : '') + '</li>';
  }).join('');

  var rules = (g.rules && g.rules.lines || []).map(function (l) {
    return '<tr><th>' + esc(l[0]) + '</th><td>' + esc(l[1]) + '</td></tr>';
  }).join('');

  var body =
    header(C, lang, alts) +
    '<main class="doc__main">\n' +
    '<h1>' + esc(g.name) + '</h1>\n' +
    '<p class="doc__lead">' + esc(g.tagline) + '</p>\n' +
    '<p class="doc__cta"><a class="doc__btn" href="' + appUrl + '">' + C.play + '</a>' +
      (g.canPrint ? '<a class="doc__btn doc__btn--ghost" href="' + base + '/print/">' + C.printPage + '</a>' : '') +
    '</p>\n' +
    '<p>' + esc(C.intro) + '</p>\n' +
    shotFigure(g.id, g.name, lang, C) +
    (g.canPrint ? pdfBlock(lang, C, [g]) : '') +
    (lv ? '<h2>' + C.levels + '</h2>\n<ul class="doc__lv">' + lv + '</ul>\n' : '') +
    (rules ? '<h2>' + C.scoring + '</h2>\n<table class="doc__tbl"><tbody>' + rules + '</tbody></table>\n' : '') +
    '<p class="doc__note">' + esc(C.story) + '</p>\n' +
    '</main>\n' +
    footer(C, lang, games, g.id);

  return {
    dir: base + '/' + g.id,
    html: page({
      lang: lang, url: url,
      alts: avail.map(function (l) { return { lang: l, href: SITE + LX[l].base + '/' + g.id + '/' }; }),
      title: g.name + ' · ' + C.siteName,
      desc: g.tagline + ' — ' + C.free,
      siteName: C.siteName,
      image: shot(g.id, lang) && ogName(g.id, lang),        /* 그 게임 카드가 카톡에 나오게 */
      imageAlt: shotAlt(g.name, lang),
      body: body
    })
  };
}

/* ================= 문제지 안내 한 장 ================= */

function printPage(lang, C, games) {
  var base = LX[lang].base;
  var url = SITE + base + '/print/';
  var alts = altsOf('print', lang);

  var list = games.filter(function (g) { return g.canPrint; }).map(function (g) {
    return '<li><a href="' + base + '/' + g.id + '/"><b>' + esc(g.name) + '</b></a> — ' + esc(g.tagline) + '</li>';
  }).join('');

  var steps = C.printSteps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');

  /* 문제지 그림을 늘어놓는다 — 이미지 검색으로 들어오는 길이 된다 */
  var gallery = games.filter(function (g) { return shot(g.id, lang); }).map(function (g) {
    var sh = shot(g.id, lang);
    return '<a class="doc__tile" href="' + base + '/' + g.id + '/">' +
      '<img src="/images/' + sh.f + '" width="' + sh.w + '" height="' + sh.h + '" loading="lazy" ' +
        'alt="' + esc(shotAlt(g.name, lang)) + '">' +
      '<span>' + esc(g.name) + '</span></a>';
  }).join('');

  var body =
    header(C, lang, alts) +
    '<main class="doc__main">\n' +
    '<h1>' + esc(C.printTitle) + '</h1>\n' +
    '<p class="doc__lead">' + esc(C.printLead) + '</p>\n' +
    '<p class="doc__cta"><a class="doc__btn" href="/' + LX[lang].qs + '">' + C.play + '</a></p>\n' +
    '<p>' + esc(C.printWho) + '</p>\n' +
    pdfBlock(lang, C, games.filter(function (g) { return g.canPrint; })) +
    (gallery ? '<h2>' + C.shotList + '</h2>\n<div class="doc__tiles">' + gallery + '</div>\n' : '') +
    '<h2>' + C.printList + '</h2>\n<ul class="doc__lv">' + list + '</ul>\n' +
    '<h2>' + C.printHow + '</h2>\n<ol class="doc__lv">' + steps + '</ol>\n' +
    '<p>' + esc(C.printNote) + '</p>\n' +
    '<p class="doc__note">' + esc(C.story) + '</p>\n' +
    '</main>\n' +
    footer(C, lang, games, null);

  return {
    dir: base + '/print',
    html: page({
      lang: lang, url: url,
      alts: ALL_LANGS.map(function (l) { return { lang: l, href: SITE + LX[l].base + '/print/' }; }),
      title: C.printTitle + ' · ' + C.brand,
      desc: C.printLead,
      siteName: C.siteName,
      body: body
    })
  };
}

/* ================= 만들기 ================= */

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.readdirSync(p).forEach(function (f) {
    var q = path.join(p, f);
    if (fs.statSync(q).isDirectory()) rmrf(q); else fs.unlinkSync(q);
  });
  fs.rmdirSync(p);
}

function write(rel, html) {
  var dir = path.join(ROOT, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

var made = [];
var shots = {};          /* 페이지마다 딸린 그림 — 이미지 검색에 알리려고 */
ALL_LANGS.forEach(function (lang) {
  var loaded = loadGames(lang);
  var C = COPY[lang];
  var games = loaded.games;

  games.forEach(function (g) {
    var p = gamePage(g, lang, C, games);
    write(p.dir, p.html);
    made.push(p.dir + '/');
    var sh = shot(g.id, lang);
    if (sh) shots[p.dir + '/'] = [{ f: sh.f, alt: shotAlt(g.name, lang) }];
  });
  var pp = printPage(lang, C, games);
  write(pp.dir, pp.html);
  made.push(pp.dir + '/');
  /* 문제지 안내 페이지에는 그림이 다 모여 있다 */
  shots[pp.dir + '/'] = games.filter(function (g) { return shot(g.id, lang); }).map(function (g) {
    return { f: shot(g.id, lang).f, alt: shotAlt(g.name, lang) };
  });
});

/* sitemap.xml — 주소와 함께 그 페이지의 그림도 적는다.
   이미지 검색에 문제지 그림이 걸리려면 이 목록이 있는 편이 훨씬 빠르다. */
var urls = ['/'].concat(made).map(function (u) {
  var imgs = (shots[u] || []).map(function (im) {
    return '\n    <image:image><image:loc>' + SITE + '/images/' + im.f + '</image:loc>' +
      '<image:title>' + esc(im.alt) + '</image:title></image:image>';
  }).join('');
  return '  <url><loc>' + SITE + u + '</loc>' + imgs + (imgs ? '\n  ' : '') + '</url>';
}).join('\n');

/* 내려받는 문제지도 적는다 — 구글은 PDF 도 검색에 넣어 준다 */
if (pdfUrls.length) {
  /* 게임 페이지와 안내 페이지 양쪽에서 담기므로 겹치는 것을 걸러 낸다 */
  pdfUrls = pdfUrls.filter(function (u, i) { return pdfUrls.indexOf(u) === i; });
  urls += '\n' + pdfUrls.map(function (u) { return '  <url><loc>' + SITE + u + '</loc></url>'; }).join('\n');
}

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + urls + '\n</urlset>\n');

/* robots.txt */
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');

console.log('만든 페이지 ' + made.length + '장');
made.forEach(function (m) { console.log('  ' + m); });
console.log('sitemap.xml · robots.txt 도 새로 만들었습니다.');
