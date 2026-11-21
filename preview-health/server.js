// 시안 파일과 기존 앱을 별도 주소에서 열어 운영 사이트와 구분합니다.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(root, relative || 'index.html');
    if (!file.startsWith(root + path.sep) || relative.startsWith('.')) {
      response.writeHead(404).end();
      return;
    }
    let body = await fs.readFile(file);
    if (file === path.join(root, 'index.html')) {
      body = body.toString().replace(/<script src="js\/analytics\.js"><\/script>[\s\S]*?<\/body>/,
        '<link rel="stylesheet" href="/preview-health/design.css"><script src="/preview-health/design.js"></script></body>');
    }
    const type = types[path.extname(file)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type + (type.startsWith('image/') ? '' : '; charset=utf-8'),
      'Cache-Control': 'no-store' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(18496, '127.0.0.1', () => console.log('http://127.0.0.1:18496/?mode=care&preview=health#home'));
