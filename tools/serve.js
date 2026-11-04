#!/usr/bin/env node
/*
 * public/ 을 내보내는 작은 정적 웹 서버(의존성 없음, Node 22). 내 컴퓨터에서 열어 보거나 고친 것을 확인할 때 쓴다.
 *
 *   node tools/serve.js                  http://localhost:8000/ (이 컴퓨터에서만 열린다)
 *   node tools/serve.js --port 8080      다른 포트(또는 환경 변수 PORT)
 *   node tools/serve.js --host 0.0.0.0   같은 네트워크의 다른 기기(휴대폰 등)에서도 열 수 있게
 *
 * 서비스용 서버가 아니다. 사이트로 내보낼 때는 public/ 을 웹 호스팅이나 nginx·Apache 에 올린다(README.md '웹에 올리기', deploy/).
 * 고친 파일이 바로 보이도록 모든 파일을 매번 확인하게 내보낸다(Cache-Control: no-cache, 바뀌지 않았으면 304).
 * GET/HEAD 만 받고, public/ 밖의 파일과 이름이 점(.)으로 시작하는 파일·폴더는 내보내지 않는다.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
};

function option(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}
const port = Number(option('--port', process.env.PORT || 8000));
const host = option('--host', '127.0.0.1');
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.log(`포트가 잘못되었습니다: ${option('--port', process.env.PORT)}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const send = (code, body, headers) => {
    res.writeHead(code, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }, headers));
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Method Not Allowed\n', { Allow: 'GET, HEAD' });
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (_) {
    return send(400, 'Bad Request\n');
  }
  if (pathname.includes('\0')) return send(400, 'Bad Request\n');
  const rel = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const file = path.join(ROOT, rel);
  // public/ 안의 파일만. 점으로 시작하는 이름(.htaccess, .taste-skill 등)은 없는 것으로 친다
  if (!file.startsWith(ROOT + path.sep) || path.relative(ROOT, file).split(path.sep).some((p) => p.startsWith('.'))) return send(404, 'Not Found\n');
  fs.stat(file, (err, st) => {
    if (err) return send(404, 'Not Found\n');
    if (st.isDirectory()) return send(301, '', { Location: encodeURI(pathname + '/') });
    const modified = new Date(Math.floor(st.mtimeMs / 1000) * 1000);
    const since = Date.parse(req.headers['if-modified-since'] || '');
    const headers = {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Last-Modified': modified.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
    };
    if (!Number.isNaN(since) && modified.getTime() <= since) return send(304, undefined, headers);
    headers['Content-Length'] = st.size;
    res.writeHead(200, Object.assign({ 'Cache-Control': 'no-cache' }, headers));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
});

server.on('error', (e) => {
  console.log(e.code === 'EADDRINUSE' ? `포트 ${port} 를 이미 쓰고 있습니다. --port 로 다른 포트를 주세요.` : `서버를 열지 못했습니다: ${e.message}`);
  process.exit(1);
});
server.listen(port, host, () => {
  const all = host === '0.0.0.0' || host === '::';
  const at = server.address().port;
  console.log(`열었습니다: http://${all || host === '127.0.0.1' ? 'localhost' : host}:${at}/  (public/ 을 내보냅니다. 멈추려면 Ctrl+C)`);
  if (all) console.log(`같은 네트워크의 다른 기기에서는 이 컴퓨터의 IP 주소로 엽니다(예: http://192.168.0.10:${at}/).`);
});
