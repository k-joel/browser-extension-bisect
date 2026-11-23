import http from 'node:http';

const PAGES = {
  '/': `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Fixture Home</title></head>
  <body>
    <h1 id="title">Fixture Home</h1>
    <form id="fixture-form">
      <label for="name">Name</label>
      <input id="name" name="name" type="text" />
      <button id="submit" type="submit">Submit</button>
    </form>
  </body>
</html>`,
  '/form': `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Fixture Form</title></head>
  <body>
    <h1 id="title">Fixture Form</h1>
    <input id="email" name="email" type="email" />
    <button id="save" type="button">Save</button>
  </body>
</html>`,
  '/dynamic': `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Fixture Dynamic</title></head>
  <body>
    <h1 id="title">Fixture Dynamic</h1>
    <div id="mount"></div>
    <script>
      const node = document.createElement('p');
      node.id = 'dynamic-content';
      node.textContent = 'dynamic content ready';
      document.getElementById('mount').appendChild(node);
    </script>
  </body>
</html>`,
};

const HEALTH_BODY = JSON.stringify({ status: 'ok' });

function createHandler() {
  return (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = url.pathname;

    if (pathname === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(HEALTH_BODY);
      return;
    }

    const page = PAGES[pathname];
    if (page !== undefined) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(page);
      return;
    }

    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found');
  };
}

export async function startFixtureServer() {
  const server = http.createServer(createHandler());

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Fixture server failed to bind to a TCP port');
  }

  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve(undefined)));
      }),
  };
}
