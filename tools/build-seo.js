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
  w.I18N.set(lang);
  run('js/data/quiz-data.js');
  run('js/data/quiz-data-en.js');
  run('js/data/words.js');
  run('js/data/order-words.js');
  run('js/data/pictures.js');

  ['sudoku', 'wordsearch', 'math', 'wordorder', 'quiz', 'coloring', 'spot'].forEach(function (id) {
    run('js/games/' + id + '.js');
  });

  var out = [];
  Object.keys(w.Games).forEach(function (id) {
    var G = w.Games[id];
    if (G.langs && G.langs.indexOf(lang) < 0) return;       /* 그 말로 못 하는 게임은 뺀다 */
    out.push({
      id: id, name: G.name, tagline: G.tagline || '',
      rules: G.rules, levels: G.levels, order: G.levelOrder || [],
      canPrint: !!G.makeForPrint
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
    printPage: '종이 문제지 받기',
    otherGames: '다른 게임',
    levels: '난이도 5단계',
    scoring: '점수 규칙',
    free: '모두 무료입니다. 회원가입도 필요 없습니다.',
    intro: '새록은 치매를 예방하고 인지 능력을 지키는 데 도움이 되도록 만든 두뇌 훈련 놀이터입니다. ' +
           '컴퓨터·휴대폰·태블릿 어디서나 열리고, 화면이 불편하시면 문제를 종이에 뽑아 연필로 푸셔도 됩니다.',
    printTitle: '무료 인쇄 활동지 — 어르신 두뇌 훈련 문제지',
    printLead: '스도쿠·낱말찾기·숫자 계산·단어 순서·색칠 공부·틀린그림찾기 문제지를 ' +
               'A4 용지에 몇 장이든 공짜로 뽑을 수 있습니다. 회원가입도, 돈도 들지 않습니다.',
    printWho: '요양보호사·사회복지사·주간보호센터·노인복지관에서 그대로 쓰실 수 있습니다. ' +
              '누를 때마다 새 문제가 만들어지므로 같은 문제지를 다시 쓸 일이 없습니다.',
    printHow: '뽑는 방법',
    printSteps: [
      '홈 화면 아래쪽의 「문제 출력」을 누릅니다.',
      '어떤 게임을, 몇 단계로, 몇 장 뽑을지 고릅니다.',
      '「만들기」를 누르면 인쇄 창이 열립니다.',
      '종이에 찍지 않고 파일로 두시려면, 인쇄 창의 프린터를 「Microsoft Print to PDF」나 「PDF로 저장」으로 바꾸세요.'
    ],
    printNote: '문제지에는 시간·점수 같은 화면용 정보가 인쇄되지 않습니다. 정답지도 함께 뽑을 수 있습니다.',
    printList: '뽑을 수 있는 문제지',
    langNote: 'English',
    aboutTitle: '이 사이트는',
    shotCap: '실제로 뽑히는 문제지입니다. 누를 때마다 새 문제가 만들어집니다.',
    shotList: '문제지 미리 보기'
  },
  en: {
    brand: 'Saerok',
    siteName: 'Saerok · Brain Training',
    home: 'Home',
    play: 'Play now',
    printPage: 'Free printable worksheets',
    otherGames: 'Other games',
    levels: 'Five levels',
    scoring: 'Scoring',
    free: 'Everything is free. No sign-up.',
    intro: 'Saerok is a brain-training playground built to help prevent dementia and keep the mind sharp. ' +
           'It works on a computer, a phone or a tablet, and you can print the puzzles and solve them with a pencil.',
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
    langNote: '한국어',
    aboutTitle: 'About this site',
    shotCap: 'A real worksheet. Every sheet is generated fresh when you print.',
    shotList: 'Worksheet preview'
  }
};

/* ================= 문제지 미리보기 그림 ================= *
 * 왜 넣는가 — 사람들은 '치매 문제지'를 이미지 검색으로 찾아 그림을 보고 들어옵니다.
 * 그러려면 진짜 문제지 그림이 페이지에 있어야 하고, alt(그림 설명)에
 * 찾을 만한 말이 들어 있어야 합니다. 그림은 tools/build-images.js 가 만듭니다.
 */
var SHOT = {
  sudoku:     { f: 'sudoku-worksheet.png' },
  wordsearch: { f: 'wordsearch-worksheet.png' },
  math:       { f: 'math-worksheet.png' },
  wordorder:  { f: 'wordorder-worksheet.png' },
  coloring:   { f: 'coloring-worksheet.png' },
  spot:       { f: 'spot-worksheet.png' }
};

/** PNG 앞머리에서 가로·세로를 읽는다 (그림 파일 규칙상 늘 같은 자리에 있다) */
function pngSize(f) {
  try {
    var b = fs.readFileSync(path.join(ROOT, 'images', f));
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  } catch (e) { return { w: 794, h: 1000 }; }        /* 그림이 아직 없어도 페이지는 만들어져야 한다 */
}
Object.keys(SHOT).forEach(function (id) {
  var d = pngSize(SHOT[id].f);
  SHOT[id].w = d.w; SHOT[id].h = d.h;
});

/** 그림 설명 — 검색에 걸리는 것은 사실상 이 문장이다 */
function shotAlt(name, lang) {
  return lang === 'ko'
    ? name + ' 무료 인쇄 문제지 — 어르신 치매 예방 두뇌 훈련 활동지 (A4 한 장)'
    : name + ' printable worksheet — free A4 brain training activity sheet for seniors';
}

/** 그림이 있으면 페이지에 붙일 조각을 돌려준다 */
function shotFigure(id, name, lang, C) {
  var sh = SHOT[id];
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

/** 페이지 한 장의 뼈대 */
function page(o) {
  var alt = o.altUrl
    ? '<link rel="alternate" hreflang="' + (o.lang === 'ko' ? 'en' : 'ko') + '" href="' + o.altUrl + '">'
    : '';
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
'<meta property="og:image" content="' + SITE + '/images/' + (o.image || (o.lang === 'ko' ? 'saerok-og.png' : 'saerok-og-en.png')) + '">\n' +
'<meta property="og:image:width" content="1200">\n' +
'<meta property="og:image:height" content="630">\n' +
'<meta property="og:image:alt" content="' + esc(o.imageAlt || o.title) + '">\n' +
'<meta name="twitter:card" content="summary_large_image">\n' +
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

function header(C, lang, altUrl) {
  return '<header class="doc__top">\n' +
    '  <a class="doc__brand" href="' + (lang === 'ko' ? '/' : '/?lang=en') + '">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="26" fill="currentColor"></rect>' +
      '<g fill="#fff"><path d="M45 80 Q40.8 58.8 22 48 Q26.2 69.3 45 80 Z" opacity=".55"></path>' +
      '<path d="M56 80 Q75.2 66.4 77 43 Q57.8 56.6 56 80 Z" opacity=".78"></path>' +
      '<path d="M50 81 Q61.5 49 50 17 Q38.5 49 50 81 Z"></path></g></svg>' +
      '<span>' + C.brand + '</span></a>\n' +
    (altUrl ? '  <a class="doc__lang" href="' + altUrl + '">' + C.langNote + '</a>\n' : '') +
    '</header>\n';
}

function footer(C, lang, games, hereId) {
  var links = games.filter(function (g) { return g.id !== hereId; }).map(function (g) {
    return '<a href="' + (lang === 'ko' ? '' : '/en') + '/' + g.id + '/">' + esc(g.name) + '</a>';
  }).join('');
  return '<nav class="doc__more">\n' +
    '  <h2>' + C.otherGames + '</h2>\n' +
    '  <div class="doc__links">' + links + '</div>\n' +
    '</nav>\n' +
    '<footer class="doc__foot">\n' +
    '  <a href="' + (lang === 'ko' ? '/' : '/?lang=en') + '">' + C.home + '</a> · ' +
    '<a href="' + (lang === 'ko' ? '' : '/en') + '/print/">' + C.printPage + '</a>\n' +
    '  <p>' + C.free + '</p>\n' +
    '</footer>\n';
}

/* ================= 게임 한 장 ================= */

function gamePage(g, lang, C, games) {
  var base = lang === 'ko' ? '' : '/en';
  var url = SITE + base + '/' + g.id + '/';
  var altUrl = SITE + (lang === 'ko' ? '/en' : '') + '/' + g.id + '/';
  var appUrl = '/' + (lang === 'ko' ? '' : '?lang=en') + '#' + g.id;

  var lv = g.order.map(function (k) {
    var L = g.levels[k];
    return '<li><b>' + esc(L.step + (lang === 'ko' ? '단계 ' : '. ') + L.name) + '</b>' +
      (L.note ? ' — ' + esc(L.note) : '') + '</li>';
  }).join('');

  var rules = (g.rules && g.rules.lines || []).map(function (l) {
    return '<tr><th>' + esc(l[0]) + '</th><td>' + esc(l[1]) + '</td></tr>';
  }).join('');

  var body =
    header(C, lang, altUrl) +
    '<main class="doc__main">\n' +
    '<h1>' + esc(g.name) + '</h1>\n' +
    '<p class="doc__lead">' + esc(g.tagline) + '</p>\n' +
    '<p class="doc__cta"><a class="doc__btn" href="' + appUrl + '">' + C.play + '</a>' +
      (g.canPrint ? '<a class="doc__btn doc__btn--ghost" href="' + base + '/print/">' + C.printPage + '</a>' : '') +
    '</p>\n' +
    '<p>' + esc(C.intro) + '</p>\n' +
    shotFigure(g.id, g.name, lang, C) +
    (lv ? '<h2>' + C.levels + '</h2>\n<ul class="doc__lv">' + lv + '</ul>\n' : '') +
    (rules ? '<h2>' + C.scoring + '</h2>\n<table class="doc__tbl"><tbody>' + rules + '</tbody></table>\n' : '') +
    '</main>\n' +
    footer(C, lang, games, g.id);

  return {
    dir: base + '/' + g.id,
    html: page({
      lang: lang, url: url, altUrl: altUrl,
      title: g.name + ' · ' + C.siteName,
      desc: g.tagline + ' — ' + C.free,
      siteName: C.siteName,
      image: SHOT[g.id] && (g.id + '-og.png'),        /* 그 게임 카드가 카톡에 나오게 */
      imageAlt: shotAlt(g.name, lang),
      body: body
    })
  };
}

/* ================= 문제지 안내 한 장 ================= */

function printPage(lang, C, games) {
  var base = lang === 'ko' ? '' : '/en';
  var url = SITE + base + '/print/';
  var altUrl = SITE + (lang === 'ko' ? '/en' : '') + '/print/';

  var list = games.filter(function (g) { return g.canPrint; }).map(function (g) {
    return '<li><a href="' + base + '/' + g.id + '/"><b>' + esc(g.name) + '</b></a> — ' + esc(g.tagline) + '</li>';
  }).join('');

  var steps = C.printSteps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');

  /* 문제지 그림을 늘어놓는다 — 이미지 검색으로 들어오는 길이 된다 */
  var gallery = games.filter(function (g) { return SHOT[g.id]; }).map(function (g) {
    return '<a class="doc__tile" href="' + base + '/' + g.id + '/">' +
      '<img src="/images/' + SHOT[g.id].f + '" width="' + SHOT[g.id].w + '" height="' + SHOT[g.id].h + '" loading="lazy" ' +
        'alt="' + esc(shotAlt(g.name, lang)) + '">' +
      '<span>' + esc(g.name) + '</span></a>';
  }).join('');

  var body =
    header(C, lang, altUrl) +
    '<main class="doc__main">\n' +
    '<h1>' + esc(C.printTitle) + '</h1>\n' +
    '<p class="doc__lead">' + esc(C.printLead) + '</p>\n' +
    '<p class="doc__cta"><a class="doc__btn" href="/' + (lang === 'ko' ? '' : '?lang=en') + '">' + C.play + '</a></p>\n' +
    '<p>' + esc(C.printWho) + '</p>\n' +
    (gallery ? '<h2>' + C.shotList + '</h2>\n<div class="doc__tiles">' + gallery + '</div>\n' : '') +
    '<h2>' + C.printList + '</h2>\n<ul class="doc__lv">' + list + '</ul>\n' +
    '<h2>' + C.printHow + '</h2>\n<ol class="doc__lv">' + steps + '</ol>\n' +
    '<p>' + esc(C.printNote) + '</p>\n' +
    '</main>\n' +
    footer(C, lang, games, null);

  return {
    dir: base + '/print',
    html: page({
      lang: lang, url: url, altUrl: altUrl,
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
['ko', 'en'].forEach(function (lang) {
  var loaded = loadGames(lang);
  var C = COPY[lang];
  var games = loaded.games;

  games.forEach(function (g) {
    var p = gamePage(g, lang, C, games);
    write(p.dir, p.html);
    made.push(p.dir + '/');
    if (SHOT[g.id]) shots[p.dir + '/'] = [{ f: SHOT[g.id].f, alt: shotAlt(g.name, lang) }];
  });
  var pp = printPage(lang, C, games);
  write(pp.dir, pp.html);
  made.push(pp.dir + '/');
  /* 문제지 안내 페이지에는 그림이 다 모여 있다 */
  shots[pp.dir + '/'] = games.filter(function (g) { return SHOT[g.id]; }).map(function (g) {
    return { f: SHOT[g.id].f, alt: shotAlt(g.name, lang) };
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
