import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';

function fetchTarget(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const outgoing = request({ hostname: '127.0.0.1', port, path, method, agent: false }, incoming => {
      const chunks = [];
      incoming.on('data', chunk => chunks.push(chunk));
      incoming.on('error', reject);
      incoming.on('end', () => resolve({ status: incoming.statusCode, headers: incoming.headers, body: Buffer.concat(chunks) }));
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}

test('server survives malformed targets and confines supported requests to demo files', { timeout: 10000 }, async t => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const closed = once(child, 'close');
    child.kill();
    await closed;
  });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    let errors = '';
    child.on('error', reject);
    child.stderr.on('data', chunk => { errors += chunk; });
    child.once('exit', code => reject(new Error(`Server exited ${code}: ${errors}`)));
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) resolve(Number(match[1]));
    });
  });

  assert.equal((await fetchTarget(port, 'http://[')).status, 400);
  const page = await fetchTarget(port, '/');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  assert.match(page.body.toString(), /<!doctype html>/i);

  for (const path of ['/package.json', '/server.js', '/../package.json', '/%2e%2e%2fpackage.json']) {
    assert.equal((await fetchTarget(port, path)).status, 404, path);
  }
  const rejected = await fetchTarget(port, '/', 'POST');
  assert.equal(rejected.status, 405);
  assert.deepEqual(rejected.headers.allow.split(/,\s*/).sort(), ['GET', 'HEAD']);

  const head = await fetchTarget(port, '/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), page.body.length);
  assert.equal(head.headers['content-type'], page.headers['content-type']);
  const script = await fetchTarget(port, '/claper-wordcloud.js');
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /^text\/javascript/);
});
