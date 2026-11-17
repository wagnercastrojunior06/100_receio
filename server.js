const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end('Método não permitido.'); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); } catch { response.writeHead(400).end('Endereço inválido.'); return; }
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const segments = relativePath.replace(/\\/g, '/').split('/');
  if (!(relativePath === 'index.html' || ['css', 'js', 'images'].includes(segments[0])) || segments.some((segment) => segment.startsWith('.'))) { response.writeHead(404).end('Página não encontrada.'); return; }
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end('Acesso negado.'); return; }
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end('Página não encontrada.'); return; }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': path.extname(filePath).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' });
    if (request.method === 'HEAD') { response.end(); return; }
    fs.createReadStream(filePath).on('error', () => { if (!response.headersSent) response.writeHead(500); response.end('Erro ao ler o arquivo.'); }).pipe(response);
  });
});
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT precisa ser um número inteiro entre 1 e 65535.');
server.listen(port, '0.0.0.0', () => console.log(`Site disponível na porta ${port} (local: http://127.0.0.1:${port})`));
