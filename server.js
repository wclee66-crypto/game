/* 로컬에서 확인할 때 쓰는 아주 작은 정적 파일 서버.
 * 실행: node server.js  →  http://localhost:8123
 * (게임 자체는 서버 없이 index.html 을 바로 열어도 동작합니다.)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8123;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  /* 건의하기는 배포한 곳(Netlify)이 받아 준다. 여기서는 받는 곳이 없으므로
     정직하게 못 받았다고 알린다 — 그래야 실패했을 때 화면이 어떻게 되는지 확인할 수 있다. */
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('확인용 서버에는 건의 받는 곳이 없습니다 (배포한 주소에서는 됩니다)');
    return;
  }
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('없는 파일: ' + rel); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('새록 → http://localhost:' + PORT));
