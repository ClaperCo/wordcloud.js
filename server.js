import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Set(['demo.html', 'claper-wordcloud.js']);
const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  const file = pathname === '/' ? 'demo.html' : pathname.slice(1);
  if (!files.has(file)) { response.writeHead(404).end('Not found'); return; }
  try {
    const body = await readFile(new URL(file, import.meta.url));
    response.writeHead(200, {
      'Content-Type': file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
      'Content-Length': body.length,
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(500).end('Unable to read file'); }
});
server.listen(Number(process.env.PORT ?? 5173), '127.0.0.1', () => {
  console.log(`Wordcloud: http://127.0.0.1:${server.address().port}`);
});
