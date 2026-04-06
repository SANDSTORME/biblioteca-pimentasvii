const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = '127.0.0.1';
const port = 4173;
const root = path.resolve(__dirname, '..', 'dist');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const sendFile = (filePath, response) => {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Erro ao carregar o arquivo.');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(content);
  });
};

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\\/])+/, '');
  const requestedPath = path.join(root, safePath === path.sep ? 'index.html' : safePath);

  if (requestedPath.startsWith(root) && fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    sendFile(requestedPath, response);
    return;
  }

  // Fallback para SPA: qualquer rota nao encontrada entrega o index principal.
  sendFile(path.join(root, 'index.html'), response);
});

server.listen(port, host);
