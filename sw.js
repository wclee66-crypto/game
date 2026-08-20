/* 맑은뜰 — 오프라인에서도 열리도록 파일을 저장해 둡니다.
 *
 * 인터넷이 되면 항상 새 파일을 먼저 받아 오고(그래야 고친 내용이 바로 반영됩니다),
 * 인터넷이 없거나 서버가 꺼져 있으면 저장해 둔 파일로 실행합니다.
 * 파일을 고친 뒤에는 아래 VERSION 을 올려 주세요. (js/app.js 의 APP_VERSION 도 같이)
 */
var VERSION = 'malgeunddeul-v14';
var ASSETS = [
  './', './index.html', './manifest.json',
  './css/style.css',
  './js/storage.js', './js/ui.js', './js/app.js',
  './js/data/quiz-data.js', './js/data/words.js',
  './js/games/sudoku.js', './js/games/wordsearch.js', './js/games/quiz.js',
  './icons/favicon-32.png', './icons/favicon-64.png', './icons/apple-touch-icon.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
                             .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* 네트워크 우선 — 새 파일이 있으면 바로 쓰고, 안 되면 저장본으로.
 *
 * 주의: 서버가 죽었을 때 오류 페이지(502·530 등)가 '응답'으로 돌아오기도 한다.
 * 그것을 그대로 내보내면 앱이 깨지므로, 정상 응답이 아니면 저장본을 먼저 쓴다.
 * (임시 주소로 설치한 앱이 그 주소가 사라진 뒤에도 살아 있으려면 이 처리가 꼭 필요하다.)
 */
/* 저장본도 없고 연결도 안 될 때 보여 줄 안내 화면 */
function offlinePage() {
  var html =
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>맑은뜰</title><style>' +
    'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4EEE2;color:#23262E;' +
    'font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;padding:2rem;text-align:center}' +
    '.b{max-width:22rem}.s{width:3.4rem;height:3.4rem;border-radius:10px;background:#C8452F;color:#FBF3E4;' +
    'display:grid;place-items:center;font-size:1.7rem;font-weight:700;margin:0 auto 1.2rem;font-family:serif}' +
    'h1{font-size:1.25rem;margin:0 0 .8rem}p{color:#5C6474;line-height:1.75;font-size:.95rem;margin:0 0 1.4rem}' +
    'button{background:#C8452F;color:#FDF6E9;border:0;border-radius:14px;padding:.9rem 1.6rem;' +
    'font-size:1rem;font-weight:700}</style></head><body><div class="b">' +
    '<div class="s">맑</div><h1>지금은 열 수 없습니다</h1>' +
    '<p>인터넷에 연결되어 있지 않거나,<br>앱을 내려받은 주소에 연결할 수 없습니다.<br>' +
    '잠시 뒤 다시 열어 보세요.</p>' +
    '<button onclick="location.reload()">다시 시도</button>' +
    '</div></body></html>';
  return new Response(html, {
    status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function fromCache(req) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    if (req.mode === 'navigate') return caches.match('./index.html');
    return null;
  });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;  // 글꼴 등 바깥 주소는 그대로

  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.ok) {                       // 200번대일 때만 새 파일로 인정
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        return res;
      }
      return fromCache(e.request).then(function (hit) { return hit || res; });
    }).catch(function () {                        // 아예 연결이 안 될 때
      return fromCache(e.request).then(function (hit) {
        if (hit) return hit;
        if (e.request.mode === 'navigate') return offlinePage();
        return new Response('', { status: 503 });
      });
    })
  );
});

/* 앱에서 '최신으로 받기'를 눌렀을 때 */
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
