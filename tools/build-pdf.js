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
  run('js/i18n.js'); run('js/lang/en.js'); w.I18N.set(lang);
  run('js/data/quiz-data.js'); run('js/data/quiz-data-en.js');
  run('js/data/words.js'); run('js/data/words-en.js');
  run('js/data/order-words.js'); run('js/data/order-words-en.js');
  run('js/data/pictures.js');
  ['sudoku', 'wordsearch', 'math', 'wordorder', 'quiz', 'coloring', 'spot', 'maze'].forEach(function (id) {
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

/* 통째로 지웠다가 다시 만든다 — 없어진 단계의 파일이 남아 있으면 안 된다 */
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (e) {}

var made = [];
var LANGS = ['ko', 'en'];

LANGS.forEach(function (lang) {
  var w = load(lang);
  var dir = path.join(OUT, lang);
  fs.mkdirSync(dir, { recursive: true });

  Object.keys(w.Games).forEach(function (id) {
    var G = w.Games[id];
    if (!G.makeForPrint) return;                       /* 종이로 못 푸는 게임은 건너뛴다 */
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

console.log('\nPDF ' + made.length + '개를 만들었습니다.');
