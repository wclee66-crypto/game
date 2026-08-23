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
 *
 * 크롬이 없으면 아무것도 만들지 않고 조용히 끝납니다.
 */
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var IMG = path.join(ROOT, 'images');
var OUT = process.env.SAEROK_PINS || 'C:\\coding\\새록-핀터레스트';

var W = 1000, H = 1500;                 /* 핀터레스트가 가장 좋아하는 비율 2:3 */

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

/* ================= 무엇을 적을까 =================
 * 핀터레스트에서는 **그림 위에 적힌 글자**가 곧 검색어입니다.
 * 그래서 사람들이 실제로 치는 말을 그대로 적습니다 —
 * 'free printable', 'for seniors', 'dementia'.
 *
 * shots 가 넉 장이면 격자로 늘어놓고, 한 장이면 크게 보여 줍니다.
 * (부챗살처럼 겹쳐 보았더니 옆이 잘려 무엇인지 안 읽혔습니다)
 */
var PINS = [
  { file: 'pin-01-dementia-activities',
    shots: ['wordsearch-worksheet-en', 'coloring-worksheet-en',
            'sudoku-worksheet-en', 'math-worksheet-en'],
    title: 'Free Printable<br>Dementia Activities',
    sub: '7 puzzle types · 5 levels · play online or print',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-02-brain-games-seniors',
    shots: ['sudoku-worksheet-en', 'wordorder-worksheet-en',
            'spot-worksheet-en', 'coloring-worksheet-en'],
    title: '7 Free Printable<br>Brain Games',
    sub: 'For seniors · play online free, or download the PDF',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-03-sudoku', shot: 'sudoku-worksheet-en',
    title: 'Free Printable<br>Sudoku for Seniors',
    sub: 'Easy 4×4 up to full 9×9 · play online or print',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-04-word-search', shot: 'wordsearch-worksheet-en',
    title: 'Free Printable<br>Word Search',
    sub: 'For seniors · 30 themes · play online or print',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-05-math', shot: 'math-worksheet-en',
    title: 'Free Printable<br>Math Worksheets',
    sub: 'For seniors · five levels · play online or print',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-06-word-scramble', shot: 'wordorder-worksheet-en',
    title: 'Free Printable<br>Word Scramble',
    sub: 'For seniors · 600 words · play online or print',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-07-colour-by-number', shot: 'coloring-worksheet-en',
    title: 'Free Printable<br>Colour by Number',
    sub: 'For adults · 24 pictures · colour on screen or on paper',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-08-spot-the-difference', shot: 'spot-worksheet-en',
    title: 'Free Printable<br>Spot the Difference',
    sub: 'For seniors · big, clear pictures · play online or print',
    badge: 'FREE · PLAY OR PRINT' },

  { file: 'pin-09-carers',
    shots: ['coloring-worksheet-en', 'wordsearch-worksheet-en',
            'math-worksheet-en', 'spot-worksheet-en'],
    title: 'Activity Sheets<br>for Care Homes',
    sub: 'Generated fresh every time — never the same sheet twice',
    badge: 'FREE · PLAY OR PRINT' }
];

/* ================= 그림 한 장의 뼈대 =================
 * 홈페이지와 같은 모양을 지킵니다 — 흰 바탕 · 얇은 선 · 초록 하나.
 * 다만 핀터레스트는 작게 줄여 보이므로 글자를 훨씬 크게 잡습니다.
 */
function pinHtml(p) {
  var shots = p.shots || [p.shot];
  var many = shots.length > 1;

  var pics = many
    ? '<div class="grid">' + shots.slice(0, 4).map(function (n) {
        return '<img src="' + n + '.png">';
      }).join('') + '</div>'
    : '<img class="one" src="' + shots[0] + '.png">';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Gothic+A1:wght@700;800;900&display=swap" rel="stylesheet">' +
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
    '.pics img{border:1px solid #D2E0D8;border-radius:12px;background:#fff;' +
      'box-shadow:0 14px 34px rgba(16,60,42,.15)}' +
    /* 한 장이면 세로를 꽉 채운다 (비율은 그대로 둔다 — 잘리면 무엇인지 안 읽힌다) */
    '.pics img.one{height:100%;width:auto;max-width:100%;object-fit:contain}' +
    /* 넉 장이면 두 줄 두 칸. 위에서부터 담고 아래만 잘라 낸다 */
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;width:100%;height:100%}' +
    '.grid img{width:100%;height:100%;object-fit:cover;object-position:left top}' +

    /* 맨 아래 — 주소. 이것을 보고 찾아온다 */
    '.foot{background:#0F2A20;color:#fff;text-align:center;padding:34px 0 36px}' +
    '.u{font-size:46px;font-weight:800;letter-spacing:-.02em;margin:0}' +
    '.n{font-size:24px;font-weight:500;color:#9FCBB6;margin:11px 0 0}' +
    '</style></head><body>' +
    '<div class="head">' +
      '<span class="badge">' + p.badge + '</span>' +
      '<p class="t">' + p.title + '</p>' +
      '<p class="s">' + p.sub + '</p>' +
    '</div>' +
    '<div class="pics">' + pics + '</div>' +
    '<div class="foot"><p class="u">playsaerok.com</p>' +
      '<p class="n">free · no sign-up · print at home</p></div>' +
    '</body></html>';
}

/* ================= 만들기 ================= */

var chrome = findChrome();
if (!chrome) {
  console.log('크롬을 찾지 못해 핀터레스트 그림 만들기를 건너뜁니다.');
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
var made = [];

PINS.forEach(function (p) {
  var need = p.shots || [p.shot];
  var miss = need.filter(function (n) { return !fs.existsSync(path.join(IMG, n + '.png')); });
  if (miss.length) { console.log('  건너뜀 (문제지 그림 없음): ' + p.file); return; }

  /* 문제지 그림을 읽어야 하므로 images/ 안에 임시로 둔다 */
  var f = path.join(IMG, '_pin.html');
  fs.writeFileSync(f, pinHtml(p));

  var out = path.join(OUT, p.file + '.png');
  try {
    cp.execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=' + W + ',' + H,
      '--virtual-time-budget=6000', '--screenshot=' + out,
      'file:///' + f.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 60000 });
  } catch (e) {}
  try { fs.unlinkSync(f); } catch (e) {}

  if (fs.existsSync(out)) { made.push(p.file); console.log('  만듦: ' + p.file + '.png'); }
  else { console.log('  찍기 실패: ' + p.file); }
});

console.log('\n핀터레스트 그림 ' + made.length + '장을 만들었습니다.');
console.log(OUT);
