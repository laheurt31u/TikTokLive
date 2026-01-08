/**
 * Serveur personnalisé Next.js avec intégration WebSocket
 * Nécessaire pour Socket.io avec Next.js
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { webSocketServer } = require('./lib/websocket/server');

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialiser le serveur WebSocket
  webSocketServer.initialize(server);

  const port = process.env.PORT || 3000;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> WebSocket server initialized`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});