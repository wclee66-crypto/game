/* 새록 — 핀터레스트에 올릴 세로 그림 만들기
 *
 * 왜 만드는가
 *   영어권에서 '무료 인쇄 문제지'를 찾는 사람들은 핀터레스트에 모여 있습니다.
 *   핀터레스트는 사람(팔로워)이 아니라 **검색어**로 퍼지므로,
 *   오늘 계정을 만들어도 그림이 잘 걸리면 사람이 들어옵니다.
 *   대신 그림이 **세로로 길어야**(2:3) 크게 보입니다. 가로 그림은 작게 잘립니다.
 *
 *   node tools/build-pins.js
 *
 * 만들어지는 곳
 *   C:\coding\새록-핀터레스트\   (홈페이지에 올리는 것이 아니라, 손으로 올릴 그림입니다)
 *   함께 만들어지는 '올리는-법.txt' 에 제목·설명·링크가 다 적혀 있습니다.
 *
 * 어떻게 만드는가
 *   문제지를 미리 그림으로 찍어 두었다가 붙이는 것이 아니라,
 *   **핀 한 장을 그릴 때 그 자리에서 문제지를 만들어 넣습니다.**
 *   그래야 '과일 낱말찾기' '나비 색칠' 처럼 주제를 골라 뽑을 수 있습니다.
 *   주제가 곧 검색어이므로, 이것이 핀을 늘리는 가장 값싼 방법입니다.
 *
 * 크롬이 없으면 아무것도 만들지 않고 조용히 끝납니다.
 */
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var OUT = process.env.SAEROK_PINS || 'C:\\coding\\새록-핀터레스트';

var W = 1000, H = 1500;                 /* 핀터레스트가 가장 좋아하는 비율 2:3 */
var SITE = 'https://playsaerok.com';

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
 * (tools/build-pdf.js 와 같은 방식이다) */
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

/** css/style.css 의 @media print 안쪽만 꺼내 온다 — 문제지 모양이 거기 다 들어 있다 */
function printCss() {
  var css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  var i = css.indexOf('@media print');
  if (i < 0) return '';
  var depth = 0, start = css.indexOf('{', i), j = start;
  for (; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') { depth--; if (!depth) break; }
  }
  return css.slice(start + 1, j).replace(/@page[^}]*\}/g, '');
}

/* ================= 무엇을 만들까 =================
 * 핀터레스트에서는 **그림 위에 적힌 글자**가 곧 검색어입니다.
 * 그래서 사람들이 실제로 치는 말을 그대로 적습니다.
 *
 * 주제·그림을 갈라 놓으면, 낱말 하나 더 만들지 않고도 핀이 몇 배로 늘어납니다.
 * 「과일 낱말찾기」로 찾는 사람과 「동물 낱말찾기」로 찾는 사람은 서로 다른 사람입니다.
 */

/* 낱말찾기 — 주제마다 한 장 (id 는 js/data/words-en.js 의 것) */
var WS = [
  ['fruit', 'Fruit', 'apple, pear, grape, cherry and more', '과일'],
  ['vege', 'Vegetable', 'carrot, onion, potato, cabbage and more', '채소'],
  ['animal', 'Animal', 'cat, dog, horse, tiger and more', '동물'],
  ['bird', 'Bird', 'owl, robin, swan, parrot and more', '새'],
  ['flower', 'Flower', 'rose, lily, tulip, daisy and more', '꽃'],
  ['sea', 'Sea Life', 'crab, whale, salmon, dolphin and more', '바다 생물'],
  ['kitchen', 'Kitchen', 'pan, bowl, kettle, spoon and more', '부엌 살림'],
  ['cloth', 'Clothes', 'hat, coat, scarf, sweater and more', '옷'],
  ['weather', 'Weather', 'rain, snow, cloud, thunder and more', '날씨'],
  ['food', 'Food', 'bread, soup, cheese, pasta and more', '음식'],
  ['music', 'Music', 'drum, piano, violin, trumpet and more', '악기'],
  ['garden', 'Garden', 'seed, spade, hedge, blossom and more', '정원']
];

/* 색칠 공부 — 그림마다 한 장 (id 는 js/data/pictures.js 의 것) */
var COL = [
  ['butterfly', 'Butterfly', '나비'],
  ['flower', 'Sunflower', '해바라기'],
  ['fish', 'Fish', '물고기'],
  ['cat', 'Cat', '고양이'],
  ['train', 'Train', '기차'],
  ['rainbow', 'Rainbow', '무지개'],
  ['umbrella', 'Umbrella', '우산'],
  ['mandala', 'Mandala', '고운 무늬']
];

/* 한 장짜리 핀을 만드는 짧은 손잡이 */
function one(file, title, sub, game, opt, ko) {
  return { file: file, title: title, sub: sub, ko: ko || '', sheet: { game: game, opt: opt || {} } };
}

var PINS = [];

/* ---- 여러 게임을 한눈에 보여 주는 넉 장짜리 ---- */
PINS.push({
  file: 'pin-01-dementia-activities',
  title: 'Free Printable<br>Dementia Activities',
  sub: '7 puzzle types · 5 levels · play online or print',
  ko: '일곱 게임 모음 — 치매 활동지로 소개',
  link: SITE + '/?lang=en',
  sheets: [
    { game: 'wordsearch', opt: { level: 'easy', themeId: 'fruit' } },
    { game: 'coloring', opt: { level: 'normal', picId: 'butterfly' } },
    { game: 'sudoku', opt: { level: 'easy' } },
    { game: 'math', opt: { level: 'easy' } }
  ]
});
PINS.push({
  file: 'pin-02-brain-games-seniors',
  title: '7 Free Printable<br>Brain Games',
  sub: 'For seniors · play online free, or download the PDF',
  ko: '일곱 게임 모음 — 두뇌 게임으로 소개',
  link: SITE + '/?lang=en',
  sheets: [
    { game: 'sudoku', opt: { level: 'normal' } },
    { game: 'wordorder', opt: { level: 'easy' } },
    { game: 'spot', opt: { level: 'normal' } },
    { game: 'coloring', opt: { level: 'normal', picId: 'flower' } }
  ]
});
PINS.push({
  file: 'pin-09-carers',
  title: 'Activity Sheets<br>for Care Homes',
  sub: 'Generated fresh every time — never the same sheet twice',
  ko: '요양원·주간보호센터를 겨냥한 모음',
  link: SITE + '/?lang=en',
  sheets: [
    { game: 'coloring', opt: { level: 'normal', picId: 'cat' } },
    { game: 'wordsearch', opt: { level: 'easy', themeId: 'animal' } },
    { game: 'math', opt: { level: 'normal' } },
    { game: 'spot', opt: { level: 'easy' } }
  ]
});

/* ---- 게임마다 한 장 ---- */
PINS.push(one('pin-03-sudoku', 'Free Printable<br>Sudoku for Seniors',
  'Easy 4×4 up to full 9×9 · play online or print', 'sudoku', { level: 'easy' }, '스도쿠'));
PINS.push(one('pin-04-word-search', 'Free Printable<br>Word Search',
  'For seniors · 30 themes · play online or print', 'wordsearch', { level: 'easy', themeId: 'nature' }, '낱말찾기'));
PINS.push(one('pin-05-math', 'Free Printable<br>Math Worksheets',
  'For seniors · five levels · play online or print', 'math', { level: 'easy' }, '숫자 계산'));
PINS.push(one('pin-06-word-scramble', 'Free Printable<br>Word Scramble',
  'For seniors · 600 words · play online or print', 'wordorder', { level: 'easy' }, '단어 순서 바로잡기'));
PINS.push(one('pin-07-colour-by-number', 'Free Printable<br>Colour by Number',
  'For adults · 24 pictures · colour on screen or on paper', 'coloring', { level: 'normal', picId: 'mandala' }, '색칠 공부'));
PINS.push(one('pin-08-spot-the-difference', 'Free Printable<br>Spot the Difference',
  'For seniors · big, clear pictures · play online or print', 'spot', { level: 'normal' }, '틀린그림찾기'));

/* ---- 낱말찾기 주제별 ---- */
WS.forEach(function (t, i) {
  PINS.push(one('pin-' + (10 + i) + '-wordsearch-' + t[0],
    'Free Printable<br>' + t[1] + ' Word Search',
    'For seniors · ' + t[2],
    'wordsearch', { level: 'normal', themeId: t[0] }, '낱말찾기 — ' + t[3]));
});

/* ---- 색칠 공부 그림별 ---- */
COL.forEach(function (c, i) {
  PINS.push(one('pin-' + (22 + i) + '-colour-' + c[0],
    'Free Printable<br>' + c[1] + ' Colour by Number',
    'For adults and seniors · big, simple shapes',
    'coloring', { level: 'normal', picId: c[0] }, '색칠 공부 — ' + c[2]));
});

/* ---- 스도쿠 단계별 ---- */
[['easy', '9×9 Sudoku', 'level 3 · a gentle full-size grid', '9칸 · 쉬움'],
 ['step1', 'Easy 4×4 Sudoku', 'level 1 · for a first try, or when 9×9 is too much', '4칸 · 첫걸음'],
 ['hard', 'Hard 9×9 Sudoku', 'level 5 · for someone who wants a real challenge', '9칸 · 어려움']
].forEach(function (lv, i) {
  PINS.push(one('pin-' + (30 + i) + '-sudoku-' + lv[0],
    'Free Printable<br>' + lv[1],
    'For seniors · ' + lv[2],
    'sudoku', { level: lv[0] }, '스도쿠 — ' + lv[3]));
});

/* 핀마다 어디로 데려갈지 — 그 게임 화면으로 바로 들어가게 한다 */
var GOTO = {
  sudoku: '#sudoku', wordsearch: '#wordsearch', math: '#math',
  wordorder: '#wordorder', coloring: '#coloring', spot: '#spot'
};
PINS.forEach(function (p) {
  if (!p.link) p.link = SITE + '/?lang=en' + (GOTO[p.sheet.game] || '');
});

/* ================= 그림 한 장의 뼈대 =================
 * 홈페이지와 같은 모양을 지킵니다 — 흰 바탕 · 얇은 선 · 초록 하나.
 * 다만 핀터레스트는 작게 줄여 보이므로 글자를 훨씬 크게 잡습니다.
 *
 * 문제지는 794px 폭으로 그려지므로, 칸 크기에 맞춰 통째로 줄여 넣습니다.
 * (그림으로 찍었다가 붙이면 흐려지지만, 이렇게 하면 글자가 또렷합니다)
 */
var SHEET_W = 794;

function card(inner, boxW, boxH) {
  var k = (boxW / SHEET_W).toFixed(4);
  /* boxH 를 주면 그 높이에 맞춰 아래를 잘라 내고(넉 장짜리),
     안 주면 내용 높이만큼만 차지한다(한 장짜리). 아래가 허옇게 비지 않는다. */
  var h = boxH ? ';height:' + boxH + 'px' : '';
  return '<div class="card" style="width:' + boxW + 'px' + h + '">' +
    '<div class="sheet" style="zoom:' + k + '">' +
      '<div class="printRoot">' + inner + '</div>' +
    '</div></div>';
}

function pinHtml(p, sheets, css) {
  var many = sheets.length > 1;
  var pics = many
    ? '<div class="grid">' + sheets.map(function (h) { return card(h, 446, 452); }).join('') + '</div>'
    : card(sheets[0], 680);

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Gothic+A1:wght@400;500;700;800;900&display=swap" rel="stylesheet">' +
    '<style>' +
    'html,body{margin:0;padding:0}' +
    'body{width:' + W + 'px;height:' + H + 'px;background:#F5F8F6;overflow:hidden;' +
      'font-family:"Manrope","Gothic A1",sans-serif;display:flex;flex-direction:column}' +

    /* 맨 위 — 여기가 검색어다 */
    '.head{padding:58px 70px 0;text-align:center}' +
    '.badge{display:inline-block;font-size:21px;font-weight:800;letter-spacing:.16em;' +
      'color:#fff;background:#0E9E62;border-radius:999px;padding:11px 26px}' +
    '.t{font-size:70px;font-weight:800;line-height:1.1;letter-spacing:-.035em;color:#0F2A20;margin:26px 0 0}' +
    '.s{font-size:30px;font-weight:500;color:#4F6459;margin:22px 0 0;line-height:1.45}' +

    /* 가운데 — 진짜 문제지 */
    '.pics{flex:1;display:flex;align-items:center;justify-content:center;' +
      'padding:34px 44px;min-height:0}' +
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}' +
    '.card{overflow:hidden;max-height:100%;background:#fff;border:1px solid #D2E0D8;border-radius:12px;' +
      'box-shadow:0 14px 34px rgba(16,60,42,.15)}' +
    '.sheet{width:' + SHEET_W + 'px}' +
    '.printRoot{padding:26px 30px;background:#fff;color:#000;font-size:12pt;' +
      'font-family:"Gothic A1","Manrope",sans-serif}' +
    /* 문제지 모양은 홈페이지의 인쇄용 규칙을 그대로 쓴다 */
    css +
    '.ps-sheet{page-break-after:auto!important;break-after:auto!important}' +

    /* 맨 아래 — 주소. 이것을 보고 찾아온다 */
    '.foot{background:#0F2A20;color:#fff;text-align:center;padding:34px 0 36px}' +
    '.u{font-size:46px;font-weight:800;letter-spacing:-.02em;margin:0}' +
    '.n{font-size:24px;font-weight:500;color:#9FCBB6;margin:11px 0 0}' +
    '</style></head><body>' +
    '<div class="head">' +
      '<span class="badge">FREE · PLAY OR PRINT</span>' +
      '<p class="t">' + p.title + '</p>' +
      '<p class="s">' + p.sub + '</p>' +
    '</div>' +
    '<div class="pics">' + pics + '</div>' +
    '<div class="foot"><p class="u">playsaerok.com</p>' +
      '<p class="n">free · no sign-up · print at home</p></div>' +
    '</body></html>';
}

/* ================= 올리는 법 적어 두기 ================= */
function plain(t) { return t.replace(/<br>/g, ' '); }

/** 핀 하나의 설명글 — 그림 위의 글을 풀어 쓰고, 늘 같은 약속으로 끝맺는다 */
function describe(p) {
  return plain(p.title).replace(/^Free Printable /, 'Free printable ') + '. ' +
    p.sub.charAt(0).toUpperCase() + p.sub.slice(1) + '. ' +
    'Large clear print and five difficulty levels. ' +
    'Play online in any browser, or download the PDF and print at home — ' +
    'no sign-up, no email, no app to install. Made for seniors, ' +
    'people living with dementia, carers and care homes.';
}

function guide(list) {
  var BOARD = {
    A: 'Free Printable Dementia Activities',
    B: 'Brain Games for Seniors',
    C: 'Activity Ideas for Care Homes'
  };

  var out = [
    '════════════════════════════════════════════════════',
    '  핀터레스트에 그림 올리는 법',
    '  그림은 이 폴더 안에 있습니다.',
    '════════════════════════════════════════════════════',
    '',
    '',
    '■ 아래 영어 글은 읽으실 것이 아닙니다',
    '',
    '  미국·영국 사람에게 보여 줄 글이라 영어로 되어 있습니다.',
    '  뜻을 몰라도 괜찮습니다. 그냥 **복사해서 붙여 넣기만** 하시면 됩니다.',
    '  무엇을 어디에 넣는지는 [ ] 안에 한국어로 적어 두었습니다.',
    '',
    '',
    '■ 한 장 올리는 순서 (3분이면 됩니다)',
    '',
    '  1. 핀터레스트 왼쪽 줄에서 「+」 를 누르고 「핀」 을 고릅니다.',
    '  2. 이 폴더에서 그림 파일을 고릅니다.',
    '     (아래 목록의 「그림 파일」 에 적힌 이름 그대로)',
    '  3. [제목] 아래 한 줄을 복사해서, 핀터레스트의 「제목」 칸에 붙입니다.',
    '  4. [설명] 아래 글을 복사해서, 「설명」 칸에 붙입니다.',
    '  5. [링크] 아래 주소를 복사해서, 「링크」 칸에 붙입니다.',
    '  6. 「보드」 칸을 눌러 [보드] 에 적힌 이름을 고릅니다.',
    '  7. 「태그」 칸에 therapy 라고 쳐서 Therapy Worksheets 를 고릅니다.',
    '  8. 오른쪽 위 빨간 「게시」 를 누릅니다.  ← 끝!',
    '',
    '  ※ 복사하는 법 — 글을 마우스로 드래그해서 파랗게 만든 뒤,',
    '     Ctrl 키를 누른 채 C. 붙일 때는 Ctrl 키를 누른 채 V.',
    '',
    '',
    '■ 하루에 한두 장씩만 올리세요',
    '',
    '  한꺼번에 다 올리면 어르신 핀끼리 서로 자리를 뺏습니다.',
    '  하루 한두 장씩, 서두르지 말고 올리시면 됩니다.',
    '  다 올리는 데 3주쯤 걸립니다. 그게 정상입니다.',
    '',
    '  위에서부터 순서대로 하시면 됩니다. 어디까지 했는지 잊으실까 봐',
    '  번호를 붙여 두었습니다. 끝낸 줄에 V 표시라도 해 두시면 편합니다.',
    '',
    '',
    '■ 보드(서랍) 세 개 — 이미 만들어 두셨습니다',
    '',
    '  A. Free Printable Dementia Activities',
    '  B. Brain Games for Seniors',
    '  C. Activity Ideas for Care Homes',
    '',
    '',
    ''
  ];

  list.forEach(function (p, i) {
    var n = (i + 1 < 10 ? ' ' : '') + (i + 1);
    out.push('══════════════════════════════════════════════════');
    out.push('  ' + n + '번    ' + (p.ko || ''));
    out.push('══════════════════════════════════════════════════');
    out.push('');
    out.push('[그림 파일]  ' + p.file + '.png');
    out.push('[보드]       ' + BOARD[p.board]);
    out.push('');
    out.push('[제목]  ← 「제목」 칸에 붙여 넣으세요');
    out.push(plain(p.title));
    out.push('');
    out.push('[설명]  ← 「설명」 칸에 붙여 넣으세요');
    out.push(p.desc);
    out.push('');
    out.push('[링크]  ← 「링크」 칸에 붙여 넣으세요');
    out.push(p.link);
    out.push('');
    out.push('');
  });

  out.push('══════════════════════════════════════════════════');
  out.push('  다 올리셨습니다. 고생하셨습니다.');
  out.push('══════════════════════════════════════════════════');
  out.push('');
  out.push('  두세 달은 조용할 겁니다. 그게 정상입니다.');
  out.push('  구글 애널리틱스의 「트래픽 획득」 에 pinterest 가 보이기 시작하면');
  out.push('  걸린 것입니다.');
  out.push('');

  return out.join('\r\n');
}

/* ================= 만들기 ================= */

var chrome = findChrome();
if (!chrome) {
  console.log('크롬을 찾지 못해 핀터레스트 그림 만들기를 건너뜁니다.');
  process.exit(0);
}

var w = load('en');
var css = printCss();
fs.mkdirSync(OUT, { recursive: true });
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saerok-pin-'));
var made = [];

PINS.forEach(function (p) {
  var specs = p.sheets || [p.sheet];
  var html = [];
  var ok = true;
  specs.forEach(function (sp) {
    var got = '';
    try {
      got = w.Print.sheets(sp.game, {
        level: sp.opt.level, count: 1, answer: false,
        picId: sp.opt.picId || 'random', themeId: sp.opt.themeId || null
      });
    } catch (e) { got = ''; }
    if (!got) ok = false;
    html.push(got);
  });
  if (!ok) { console.log('  건너뜀 (문제지를 못 만듦): ' + p.file); return; }

  var f = path.join(tmp, p.file + '.html');
  fs.writeFileSync(f, pinHtml(p, html, css));

  var out = path.join(OUT, p.file + '.png');
  try {
    cp.execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=' + W + ',' + H,
      '--virtual-time-budget=6000', '--screenshot=' + out,
      'file:///' + f.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 60000 });
  } catch (e) {}

  if (fs.existsSync(out)) {
    /* 어느 서랍에 넣을지 — 색칠·틀린그림은 A(치매 활동지), 나머지는 B(두뇌 게임) */
    var g = (p.sheet && p.sheet.game) || '';
    p.board = p.file.indexOf('carers') >= 0 ? 'C'
            : (!g || g === 'coloring' || g === 'spot') ? 'A' : 'B';
    p.desc = describe(p);
    made.push(p);
    console.log('  만듦: ' + p.file + '.png');
  } else {
    console.log('  찍기 실패: ' + p.file);
  }
});

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

fs.writeFileSync(path.join(OUT, '올리는-법.txt'), '\uFEFF' + guide(made), 'utf8');

console.log('\n핀터레스트 그림 ' + made.length + '장을 만들었습니다.');
console.log(OUT);
