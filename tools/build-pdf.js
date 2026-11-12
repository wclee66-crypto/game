/* 새록 — 내려받는 문제지(PDF) 만들기
 *
 * 왜 만드는가
 *   영어권에서 '무료 인쇄 문제지'를 찾는 사람들은 **파일을 받아 두었다가** 나중에 뽑습니다.
 *   인쇄 창만 열리면 "파일은 어디 있지?" 하고 그냥 나가 버립니다.
 *   그래서 미리 만들어 둔 PDF 를 한 번 눌러 받을 수 있게 둡니다.
 *   구글은 PDF 도 검색에 넣어 주므로, 파일 하나하나가 들어오는 길이 됩니다.
 *
 *   node tools/build-pdf.js
 *
 * 만들어지는 것 (통째로 지웠다가 다시 만듭니다)
 *   /pdf/ko/<게임>-level<N>.pdf   한국어 · 게임마다 5단계
 *   /pdf/en/<게임>-level<N>.pdf   영어
 *
 * 한 파일에 문제지 4장 + 정답지가 들어갑니다.
 * 정답지는 뒤로 몰아 둡니다 — 문제·정답이 번갈아 나오면 그대로 나눠 드릴 수가 없습니다.
 *
 * 크롬이 없으면 아무것도 만들지 않고 조용히 끝납니다 (배포가 멈추면 안 되므로).
 */
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var OUT = path.join(ROOT, 'pdf');

var SHEETS_PER_FILE = 4;          /* 한 파일에 담을 문제지 장수 */

function findChrome() {
  var c = [
    process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (var i = 0; i < c.length; i++) {
    try { if (c[i] && fs.existsSync(c[i])) return c[i]; } catch (e) {}
  }
  return null;
}

/* ================= 게임 파일 읽어 오기 =================
 * 게임 코드는 브라우저에서 도는 것이라, 없는 것을 흉내 내 준다.
 * (tools/build-seo.js 와 같은 방식이다) */
function load(lang) {
  var w = {};
  w.window = w;
  w.navigator = { language: lang };
  w.location = { search: '', hash: '', href: '', pathname: '/' };
  w.history = { replaceState: function () {} };
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
    esc: function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
    h: function () { return w.document.createElement(); },
    toast: function () {}, modal: function () { return { card: w.document, close: function () {} }; },
    confirm: function () {}, beep: function () {}, comma: function (n) { return n; },
    fmtTime: function () { return ''; }, resultModal: function () {}, barChart: function () { return ''; }
  };
  w.App = { go: function () {}, showRules: function () {}, gameSwitcher: function () {}, version: function () { return ''; } };
  w.Suggest = { open: function () {}, ready: function () { return false; } };

  function run(rel) {
    var code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    (new Function('window', 'with (window) { ' + code + '\n }'))(w);
  }
  run('js/i18n.js'); run('js/lang/en.js'); run('js/lang/ja.js'); w.I18N.set(lang);
  run('js/data/quiz-data.js'); run('js/data/quiz-data-en.js');
  run('js/data/words.js'); run('js/data/words-en.js');
  run('js/data/order-words.js'); run('js/data/order-words-en.js');
  run('js/data/pictures.js');
  ['sudoku', 'wordsearch', 'math', 'wordorder', 'quiz', 'coloring', 'spot', 'maze', 'mathcross', 'copyfig', 'dot2dot', 'shapecount', 'clock', 'numsearch', 'shadow', 'numpair', 'numrule', 'numpath', 'cardmatch', 'nonogram', 'queens'].forEach(function (id) {
    run('js/games/' + id + '.js');
  });
  run('js/print.js');
  return w;
}

/** 정답지를 뒤로 몰아 둔다 — 문제·정답이 번갈아 나오면 그대로 나눠 드릴 수가 없다.
 *  문제지 한 장이 `<section class="ps-sheet …">` 로 시작하므로 그 자리에서 자른다. */
function answersLast(html) {
  var MARK = '<section class="ps-sheet';
  var parts = html.split(MARK);
  var head = parts.shift();                     /* 첫 조각은 보통 빈 글자다 */
  var q = [], a = [];
  parts.forEach(function (p) {
    (p.indexOf('ps-sheet--ans') === 0 || p.slice(0, 40).indexOf('--ans') >= 0 ? a : q).push(MARK + p);
  });
  return head + q.join('') + a.join('');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 인쇄용 한 장짜리 문서 — 진짜 css/style.css 를 그대로 쓴다.
 *  크롬의 PDF 만들기는 `@media print` 를 그대로 따르므로, 화면에서 인쇄한 것과 똑같이 나온다. */
function docHtml(lang, title, inner) {
  var css = 'file:///' + path.join(ROOT, 'css/style.css').replace(/\\/g, '/');
  return '<!DOCTYPE html>\n<html lang="' + lang + '">\n<head>\n' +
    '<meta charset="utf-8">\n<title>' + esc(title) + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;700;800;900' +
      '&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="' + css + '">\n' +
    /* 화면용 규칙에서 #printRoot 가 숨겨져 있어도 PDF 에서는 보여야 한다 */
    '<style>#printRoot{display:block}</style>\n' +
    '</head>\n<body>\n<div id="printRoot">' + inner + '</div>\n</body>\n</html>\n';
}

/* ================= 만들기 ================= */

var chrome = findChrome();
if (!chrome) {
  console.log('크롬을 찾지 못해 PDF 만들기를 건너뜁니다. (배포는 그대로 진행됩니다)');
  process.exit(0);
}

/* 통째로 지웠다가 다시 만든다 — 없어진 단계의 파일이 남아 있으면 안 된다.
   다만 게임 하나만 새로 만들 때(G=numsearch node tools/build-pdf.js)는
   그 게임 것만 만들고 나머지는 그대로 둔다 — 185개를 다시 찍을 까닭이 없다. */
var ONLY = process.env.G || '';
if (!ONLY) { try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (e) {} }

var made = [];
var LANGS = ['ko', 'en', 'ja'];

LANGS.forEach(function (lang) {
  var w = load(lang);
  var dir = path.join(OUT, lang);
  fs.mkdirSync(dir, { recursive: true });

  Object.keys(w.Games).forEach(function (id) {
    var G = w.Games[id];
    if (ONLY && id !== ONLY) return;                   /* 한 게임만 만들 때 */
    if (!G.makeForPrint) return;                       /* 종이로 못 푸는 게임은 건너뛴다 */
    if (G.langs && G.langs.indexOf(lang) < 0) return;  /* 그 말의 문제 은행이 없는 게임도 */
    var order = G.levelOrder || Object.keys(G.levels || {});

    order.forEach(function (lv, i) {
      var L = (G.levels || {})[lv] || {};
      var title = G.name + ' · ' + (L.name || lv);

      var inner;
      try {
        inner = w.Print.sheets(id, { level: lv, count: SHEETS_PER_FILE, answer: true, picId: 'random' });
      } catch (e) { inner = ''; }
      if (!inner) { console.log('  건너뜀: ' + lang + '/' + id + ' ' + lv); return; }

      var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saerok-pdf-'));
      var f = path.join(tmp, 'sheet.html');
      fs.writeFileSync(f, docHtml(lang, title, answersLast(inner)));

      var name = id + '-level' + (i + 1) + '.pdf';
      var out = path.join(dir, name);
      try {
        cp.execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
          '--no-pdf-header-footer', '--virtual-time-budget=8000',
          '--print-to-pdf=' + out, 'file:///' + f.replace(/\\/g, '/')],
          { stdio: 'ignore', timeout: 120000 });
      } catch (e) {}

      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

      if (fs.existsSync(out)) {
        var kb = Math.round(fs.statSync(out).size / 1024);
        made.push(lang + '/' + name + ' (' + kb + 'KB)');
        console.log('  ' + lang + '/' + name + '  ' + kb + 'KB');
      } else {
        console.log('  실패: ' + lang + '/' + name);
      }
    });
  });
});

/* ================= 묶음 문제지 (2026-11-13) =================
 * 게임 하나·단계 하나짜리 파일과 달리, 여러 게임을 섞어 한 파일로 묶는다.
 *  - 크리스마스·겨울 묶음 — 영어권에서 11~12월에 가장 많이 찾는 활동지
 *  - 30일 묶음 — 하루 한 장씩 30일. 요양 기관·가족이 '하루 한 장씩 드리면 되는' 것을 찾는다.
 *    맨 앞에 30칸 체크표, 정답은 모두 맨 뒤.
 * 이것만 다시 만들려면  G=packs node tools/build-pdf.js
 * 파일 이름은 늘 같다 — 검색용 페이지(build-seo.js 의 PACKS)가 이 이름으로 찾는다.
 */
var PACK_COPY = {
  ko: { xmas: '크리스마스·겨울 두뇌 활동지', xmasSub: '낱말찾기 · 색칠 공부 · 미로 · 스도쿠',
        d30: '30일 두뇌 훈련 문제지', d30Sub: '하루 한 장씩, 여러 게임을 골고루',
        easy: '쉬움', normal: '보통', day: '{n}일째', check: '다 푼 날에 표시하세요',
        how: '하루에 한 장씩 풀어 보세요. 정답은 맨 뒤에 모아 두었습니다.',
        contents: '들어 있는 것' },
  en: { xmas: 'Christmas & Winter Brain Activities', xmasSub: 'Word search · colour by number · mazes · sudoku',
        d30: '30-Day Brain Activity Pack', d30Sub: 'One page a day, a different puzzle each day',
        easy: 'Easy', normal: 'Medium', day: 'Day {n}', check: 'Tick each day when it is done',
        how: 'Do one page a day. All the answers are at the back.',
        contents: 'Inside' },
  ja: { xmas: 'クリスマス・冬の脳トレプリント', xmasSub: 'ぬり絵 · 迷路 · ナンプレ · 計算',
        d30: '30日間 脳トレプリント', d30Sub: '1日1枚、毎日ちがうパズル',
        easy: 'やさしい', normal: 'ふつう', day: '{n}日目', check: '解いた日に印をつけましょう',
        how: '1日1枚ずつ解いてみましょう。答えは最後にまとめてあります。',
        contents: '入っているもの' }
};

/** 표지 한 장 — 제목·설명, 30일 묶음이면 체크표 */
function packCover(C, title, sub, checks) {
  var grid = '';
  if (checks) {
    grid = '<p style="margin:9mm 0 3mm;font-size:12pt;font-weight:800">' + esc(C.check) + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:2.5mm">';
    for (var i = 1; i <= checks; i++) {
      grid += '<div style="border:1pt solid #000;border-radius:2mm;height:19mm;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:space-between;padding:1.5mm 0 2mm;font-size:10pt;font-weight:700">' +
        esc(C.day.replace('{n}', i)) + '<span style="width:7mm;height:7mm;border:1pt solid #000;border-radius:1mm"></span></div>';
    }
    grid += '</div>';
  }
  return '<section class="ps-sheet ps-cover" style="text-align:center;padding-top:16mm">' +
    '<p style="margin:0;font-size:12pt;font-weight:800;letter-spacing:.2em">SAEROK · playsaerok.com</p>' +
    '<h1 style="margin:8mm 0 0;font-size:30pt;line-height:1.2;font-weight:900">' + esc(title) + '</h1>' +
    '<p style="margin:5mm 0 0;font-size:15pt;font-weight:700">' + esc(sub) + '</p>' +
    '<p style="margin:7mm 0 0;font-size:12pt">' + esc(C.how) + '</p>' +
    grid +
    '</section>';
}

/** 문제지 제목 옆 단계 글씨에 「3일째」 를 덧붙인다 — 칸을 더 쓰지 않으려고 제목 줄 안에 넣는다 */
function tagDay(html, label) {
  return html.replace(/(<span class="ps-title">[^<]*)<em>([^<]*)<\/em>/g, '$1<em>$2 · ' + esc(label) + '</em>');
}

function writePdf(lang, name, title, inner) {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saerok-pdf-'));
  var f = path.join(tmp, 'sheet.html');
  fs.writeFileSync(f, docHtml(lang, title, inner));
  var out = path.join(OUT, lang, name);
  try {
    cp.execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--no-pdf-header-footer', '--virtual-time-budget=20000',
      '--print-to-pdf=' + out, 'file:///' + f.replace(/\\/g, '/')],
      { stdio: 'ignore', timeout: 240000 });
  } catch (e) {}
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  if (fs.existsSync(out)) {
    var kb = Math.round(fs.statSync(out).size / 1024);
    made.push(lang + '/' + name + ' (' + kb + 'KB)');
    console.log('  ' + lang + '/' + name + '  ' + kb + 'KB');
  } else {
    console.log('  실패: ' + lang + '/' + name);
  }
}

if (!ONLY || ONLY === 'packs') LANGS.forEach(function (lang) {
  var w = load(lang), C = PACK_COPY[lang];
  fs.mkdirSync(path.join(OUT, lang), { recursive: true });
  function sheet(id, o) {
    var G = w.Games[id];
    if (!G || !G.makeForPrint || (G.langs && G.langs.indexOf(lang) < 0)) return '';
    var lv = o.level;
    if (!G.levels || !G.levels[lv]) { var ord = G.levelOrder || []; lv = ord[Math.min(ord.length - 1, 2)]; }
    try {
      return w.Print.sheets(id, { level: lv, count: 1, answer: true, picId: o.picId || 'random', themeId: o.themeId || null });
    } catch (e) { return ''; }
  }

  /* ---- 크리스마스·겨울 ---- */
  var X = [
    ['wordsearch', { level: 'easy', themeId: 'christmas' }],
    ['coloring', { level: 'normal', picId: 'xtree' }],
    ['wordsearch', { level: 'easy', themeId: 'winter' }],
    ['coloring', { level: 'normal', picId: 'gift' }],
    ['maze', { level: 'easy' }],
    ['coloring', { level: 'normal', picId: 'snowman' }],
    ['wordsearch', { level: 'normal', themeId: 'christmas' }],
    ['sudoku', { level: 'easy' }],
    ['math', { level: 'easy' }]                        /* 일본어는 낱말찾기가 없어 이것으로 채운다 */
  ];
  var xs = X.map(function (x) { return sheet(x[0], x[1]); }).filter(Boolean);
  if (lang !== 'ja') xs = xs.slice(0, 8);
  var xTitle = C.xmas;
  writePdf(lang, 'christmas-winter-pack.pdf', xTitle,
    packCover(C, xTitle, C.xmasSub, 0) + answersLast(xs.join('')));

  /* ---- 30일 ---- */
  var POOL = ['sudoku', 'math', 'maze', 'wordsearch', 'spot', 'mathcross', 'coloring', 'shapecount',
              'numsearch', 'wordorder', 'dot2dot', 'nonogram', 'clock', 'numrule', 'queens', 'copyfig',
              'numpair', 'numpath', 'shadow'];
  POOL = POOL.filter(function (id) {
    var G = w.Games[id];
    return G && G.makeForPrint && (!G.langs || G.langs.indexOf(lang) >= 0);
  });
  [['easy', ['step2', 'easy']], ['normal', ['easy', 'normal']]].forEach(function (pk) {
    var days = [];
    for (var d = 1; d <= 30; d++) {
      var id = POOL[(d - 1) % POOL.length];
      var html = sheet(id, { level: pk[1][d % 2] });
      if (html) days.push(tagDay(html, C.day.replace('{n}', d)));
    }
    var title = C.d30 + ' (' + C[pk[0]] + ')';
    writePdf(lang, '30day-pack-' + pk[0] + '.pdf', title,
      packCover(C, title, C.d30Sub, 30) + answersLast(days.join('')));
  });
});

console.log('\nPDF ' + made.length + '개를 만들었습니다.');
