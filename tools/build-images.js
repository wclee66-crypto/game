/* 새록 — 문제지 미리보기 그림 만들기
 *
 * 왜 필요한가
 *   1) 사람들은 '치매 환자 문제지'를 **이미지 검색**으로 찾습니다.
 *      그림을 보고 눌러 들어오므로, 검색에 걸릴 그림이 실제로 있어야 합니다.
 *   2) 카톡·페이스북에 주소를 보낼 때 나오는 그림(og:image)으로도 씁니다.
 *      그림이 없으면 글자만 나와서 눌러 보지 않습니다.
 *
 *   node tools/build-images.js
 *
 * 하는 일
 *   - 게임마다 진짜 문제지를 한 판 만들어 HTML 로 그린 뒤
 *   - 크롬을 화면 없이 돌려 PNG 로 찍습니다
 *   - images/ 에 넣습니다
 *
 * 크롬이 없으면 그냥 건너뜁니다 (배포가 멈추지 않도록).
 */
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var OUT = path.join(ROOT, 'images');

/* ---------- 크롬 찾기 ---------- */
function findChrome() {
  var c = [
    process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env['ProgramFiles'] + '\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (var i = 0; i < c.length; i++) { try { if (fs.existsSync(c[i])) return c[i]; } catch (e) {} }
  return null;
}

/* ---------- 게임 파일 읽어 오기 (build-seo.js 와 같은 방식) ---------- */
function loadAll(lang) {
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
    esc: function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
    h: function () { return w.document.createElement(); },
    toast: function () {}, modal: function () { return { card: w.document, close: function () {} }; },
    confirm: function () {}, beep: function () {}, comma: function (n) { return n; },
    fmtTime: function () { return ''; }, resultModal: function () {}, barChart: function () { return ''; }
  };
  w.App = { go: function () {}, showRules: function () {}, gameSwitcher: function () {}, version: function () { return ''; } };
  w.Suggest = { open: function () {} };

  function run(rel) {
    var code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    (new Function('window', 'with (window) { ' + code + '\n }'))(w);
  }

  run('js/i18n.js'); run('js/lang/en.js'); w.I18N.set(lang);
  run('js/data/quiz-data.js'); run('js/data/quiz-data-en.js');
  run('js/data/words.js'); run('js/data/words-en.js'); run('js/data/order-words.js');
  run('js/data/order-words-en.js'); run('js/data/pictures.js');
  ['sudoku', 'wordsearch', 'math', 'wordorder', 'quiz', 'coloring', 'spot', 'maze', 'mathcross', 'copyfig', 'dot2dot', 'shapecount'].forEach(function (id) {
    run('js/games/' + id + '.js');
  });
  run('js/print.js');
  return w;
}

/* ---------- 찍을 목록 ---------- */
/* 이미지 검색에서 실제로 찾는 것들. 파일 이름도 검색어에 맞춘다. */
/* 1단계는 너무 비어 보여 눌러 보지 않는다.
   이미지 검색에서는 '알차 보이는가'가 곧 눌러 보는 비율이다. */
/* 어떤 문제지를 찍을까 — 말마다 한 벌씩이다.
 * 영어 페이지에 한글 문제지를 붙여 두면 들어온 사람이 그대로 나가 버린다.
 * 영어 그림은 이름 뒤에 -en 을 붙인다. */
var PICKS = [
  { id: 'sudoku',     level: 'easy' },
  { id: 'wordsearch', level: 'easy' },
  { id: 'math',       level: 'easy' },
  { id: 'wordorder',  level: 'easy' },
  { id: 'coloring',   level: 'normal' },
  { id: 'spot',       level: 'normal' },
  { id: 'maze',       level: 'easy' },
  { id: 'mathcross',  level: 'normal' },
  { id: 'copyfig',    level: 'normal' },
  { id: 'dot2dot',    level: 'easy' },
  { id: 'shapecount', level: 'easy' }
];
var SHOTS = [];
['ko', 'en'].forEach(function (lang) {
  PICKS.forEach(function (q) {
    SHOTS.push({ id: q.id, lang: lang, level: q.level,
      file: q.id + '-worksheet' + (lang === 'ko' ? '' : '-en') });
  });
});

function sheetHtml(css, inner, lang) {
  return '<!DOCTYPE html><html lang="' + (lang || 'ko') + '"><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;700;800;900&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">' +
    '<style>' +
    'html,body{margin:0;padding:0;background:#fff;}' +
    'body{width:794px;font-family:"Gothic A1","Manrope",sans-serif;}' +
    '#printRoot{display:block;padding:34px 40px;}' +
    css +
    /* 종이 한 장만 찍으므로 쪽 나눔은 없앤다 */
    '.ps-sheet{page-break-after:auto!important;break-after:auto!important;}' +
    '</style></head><body><div id="printRoot">' + inner + '</div>' +
    /* 내용 높이를 제목에 적어 둔다 — 크롬에게 물어보는 유일한 방법이다 */
    '<script>document.title = "H" + Math.ceil(document.getElementById("printRoot").getBoundingClientRect().height + 34);<\/script>' +
    '</body></html>';
}

/** 크롬을 한 번 돌려 내용 높이를 잰다. 못 재면 0 을 돌려준다. */
function measure(file) {
  try {
    var dom = cp.execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--window-size=794,1400', '--virtual-time-budget=4000', '--dump-dom',
      'file:///' + file.replace(/\\/g, '/')
    ], { timeout: 60000, maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
    var m = /<title>H(\d+)<\/title>/.exec(dom);
    return m ? parseInt(m[1], 10) : 0;
  } catch (e) { return 0; }
}

/** css/style.css 의 @media print 안에 있는 규칙만 뽑아 온다 */
function printCss() {
  var css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  var i = css.indexOf('@media print');
  if (i < 0) return '';
  var depth = 0, start = css.indexOf('{', i), j = start;
  for (; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') { depth--; if (!depth) break; }
  }
  var body = css.slice(start + 1, j);
  return body.replace(/@page[^}]*\}/g, '');            /* @page 는 화면에서 뜻이 없다 */
}

/* ---------- 만들기 ---------- */
var chrome = findChrome();
if (!chrome) {
  console.log('크롬을 찾지 못해 그림 만들기를 건너뜁니다. (있던 그림은 그대로 씁니다)');
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
var css = printCss();
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saerok-shot-'));
var made = [];

SHOTS.forEach(function (s) {
  var w = loadAll(s.lang);
  var G = w.Games[s.id];
  if (!G || !G.makeForPrint) { console.log('  건너뜀: ' + s.id); return; }

  var grabbed = w.Print.sheets(s.id, { level: s.level, count: 1, answer: false });
  if (!grabbed) { console.log('  못 만듦: ' + s.id); return; }

  var file = path.join(tmp, s.file + '.html');
  fs.writeFileSync(file, sheetHtml(css, grabbed, s.lang));

  var h = measure(file) || 1000;
  if (h < 560) h = 560;                    /* 너무 납작하면 오히려 안 보인다 */
  if (h > 1123) h = 1123;                  /* A4 한 장을 넘지 않는다 */
  s.h = h;

  var out = path.join(OUT, s.file + '.png');
  try {
    cp.execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=794,' + h,
      '--virtual-time-budget=4000',
      '--screenshot=' + out,
      'file:///' + file.replace(/\\/g, '/')
    ], { stdio: 'ignore', timeout: 60000 });
    if (fs.existsSync(out)) { made.push(s.file + '.png'); console.log('  만듦: ' + s.file + '.png'); }
  } catch (e) {
    console.log('  찍기 실패: ' + s.id + ' (' + e.message.split('\n')[0] + ')');
  }
});

/* ---------- 카톡·페이스북에 나올 가로 그림 (1200×630) ---------- */
function ogHtml(lang) {
  var C = lang === 'en'
    ? { t: 'Saerok', s: 'Free brain puzzles for seniors', f: 'Play free · Print free · No sign-up' }
    : { t: '새록', s: '치매 예방 두뇌 훈련 · 무료 인쇄 문제지', f: '가입 없이 무료 · 문제지도 공짜' };
  var tail = lang === 'ko' ? '' : '-en';
  var pics = ['sudoku-worksheet' + tail, 'wordsearch-worksheet' + tail, 'coloring-worksheet' + tail];
  var cards = pics.map(function (n, i) {
    var rot = [-7, 0, 7][i], top = [40, 14, 40][i];
    return '<img src="' + n + '.png" style="width:236px;border:1px solid #D8E4DC;border-radius:10px;' +
      'box-shadow:0 10px 26px rgba(20,60,40,.13);transform:rotate(' + rot + 'deg);margin-top:' + top + 'px">';
  }).join('');
  return '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;700;800;900&family=Manrope:wght@700;800&display=swap" rel="stylesheet">' +
    '<style>html,body{margin:0;padding:0}' +
    'body{width:1200px;height:630px;background:#F5F8F6;font-family:"Gothic A1","Manrope",sans-serif;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}' +
    '.t{font-size:62px;font-weight:900;letter-spacing:-.04em;color:#123;margin:0}' +
    '.s{font-size:27px;font-weight:700;color:#0E9E62;margin:10px 0 0}' +
    '.row{display:flex;gap:22px;align-items:flex-start;margin-top:26px}' +
    '.f{font-size:20px;font-weight:700;color:#4F6459;margin:24px 0 0}' +
    '</style></head><body>' +
    '<p class="t">' + C.t + '</p><p class="s">' + C.s + '</p>' +
    '<div class="row">' + cards + '</div>' +
    '<p class="f">' + C.f + '</p>' +
    '</body></html>';
}

['ko', 'en'].forEach(function (lang) {
  var f = path.join(OUT, '_og-' + lang + '.html');       /* 그림 옆에 두어야 문제지 그림을 읽는다 */
  fs.writeFileSync(f, ogHtml(lang));
  var out = path.join(OUT, 'saerok-og' + (lang === 'ko' ? '' : '-en') + '.png');
  try {
    cp.execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=5000',
      '--screenshot=' + out, 'file:///' + f.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 60000 });
    if (fs.existsSync(out)) { made.push(path.basename(out)); console.log('  만듦: ' + path.basename(out)); }
  } catch (e) { console.log('  찍기 실패: og ' + lang); }
  try { fs.unlinkSync(f); } catch (e) {}
});

/* ---------- 게임마다 카톡용 가로 그림 (1200×630) ----------
 * 카톡·페이스북은 가로로 넓은 그림만 크게 보여 줍니다.
 * 문제지는 세로라 그대로 쓰면 작게 잘려 나오므로, 옆에 이름을 적어 한 장으로 만듭니다. */
function cardHtml(shot, title, sub, lang) {
  var foot = lang === 'en' ? 'playsaerok.com · free, no sign-up' : 'playsaerok.com · 가입 없이 무료';
  return '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;700;800;900&family=Manrope:wght@700;800&display=swap" rel="stylesheet">' +
    '<style>html,body{margin:0;padding:0}' +
    'body{width:1200px;height:630px;background:#F5F8F6;font-family:"Gothic A1","Manrope",sans-serif;' +
    'display:flex;align-items:center;gap:64px;padding:0 84px;box-sizing:border-box;overflow:hidden}' +
    'img{width:360px;border:1px solid #D8E4DC;border-radius:12px;background:#fff;' +
    'box-shadow:0 14px 34px rgba(20,60,40,.14);transform:rotate(-3deg)}' +
    '.txt{flex:1}' +
    '.t{font-size:66px;font-weight:900;letter-spacing:-.04em;color:#123;margin:0;line-height:1.1}' +
    '.s{font-size:28px;font-weight:700;color:#0E9E62;margin:16px 0 0;line-height:1.4}' +
    '.f{font-size:21px;font-weight:700;color:#4F6459;margin:40px 0 0}' +
    '</style></head><body>' +
    '<img src="' + shot + '">' +
    '<div class="txt"><p class="t">' + title + '</p><p class="s">' + sub + '</p>' +
    '<p class="f">' + foot + '</p></div>' +
    '</body></html>';
}

function shoot(html, name, w2, h2) {
  var f = path.join(OUT, '_tmp.html');            /* 그림 옆에 두어야 문제지 그림을 읽는다 */
  fs.writeFileSync(f, html);
  var out = path.join(OUT, name + '.png');
  try {
    cp.execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=' + w2 + ',' + h2,
      '--virtual-time-budget=5000', '--screenshot=' + out,
      'file:///' + f.replace(/\\\\/g, '/')], { stdio: 'ignore', timeout: 60000 });
    if (fs.existsSync(out)) { made.push(name + '.png'); console.log('  만듦: ' + name + '.png'); }
  } catch (e) { console.log('  찍기 실패: ' + name); }
  try { fs.unlinkSync(f); } catch (e) {}
}

SHOTS.forEach(function (s) {
  if (made.indexOf(s.file + '.png') < 0) return;  /* 문제지 그림이 없으면 만들 수 없다 */
  var w = loadAll(s.lang);
  var G = w.Games[s.id];
  shoot(cardHtml(s.file + '.png', G.name, G.tagline || '', s.lang),
        s.id + '-og' + (s.lang === 'ko' ? '' : '-en'), 1200, 630);
});

console.log('\n그림 ' + made.length + '장을 images/ 에 넣었습니다.');
