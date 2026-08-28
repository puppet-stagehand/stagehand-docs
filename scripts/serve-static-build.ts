import { readFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const buildRoot = resolve(process.argv[2] ?? 'dist');
const port = Number.parseInt(process.argv[3] ?? '4321', 10);

const sendFile = async (response: ServerResponse, path: string, status: number) => {
  const body = await readFile(path);
  response.writeHead(status, {
    'content-length': body.byteLength,
    'content-type': contentTypes[extname(path)] ?? 'application/octet-stream',
  });
  response.end(body);
};

// AUTH-04: this server has no gate-simulation logic on purpose. It serves the
// local dist/ build directly, with no CloudFront in front of it — so
// redirect.js's tester-access gate (the KVS-backed check on
// /docs/testers-guide*) never runs here, and every path (gated or not) is
// served unconditionally. That is deliberate, not an oversight: this server
// never traverses CloudFront, so simulating the gate here would only test
// made-up local logic, not the real edge function. See
// docs/operations/tester-access.md's "AUTH-04" section for the full record.
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const requestedFile = resolve(buildRoot, relativePath.replace(/^\/+/, ''));
    if (requestedFile !== buildRoot && !requestedFile.startsWith(`${buildRoot}${sep}`)) {
      await sendFile(response, resolve(buildRoot, '404.html'), 404);
      return;
    }

    try {
      await sendFile(response, requestedFile, 200);
    } catch {
      await sendFile(response, resolve(buildRoot, '404.html'), 404);
    }
  } catch {
    response.writeHead(400).end('Bad request');
  }
});

const stop = () => server.close(() => process.exit(0));
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
server.listen(port, '127.0.0.1');
