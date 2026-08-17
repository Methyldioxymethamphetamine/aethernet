import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach WebSocket Server
  const wss = new WebSocketServer({ server });

  // Connect to Redis
  const subscriber = createClient({
    url: 'redis://localhost:6379'
  });

  subscriber.on('error', (err) => console.log('Redis Client Error', err));
  
  try {
      await subscriber.connect();
      console.log('✅ Connected to Redis PubSub');
  } catch (e) {
      console.error("Failed to connect to Redis. Ensure Redis is running.", e);
  }

  wss.on('connection', (ws) => {
    console.log('✅ UI Client connected via WebSocket');
    
    ws.send(JSON.stringify({
        type: 'log',
        data: '\x1b[32m[SYSTEM]\x1b[0m Connected to AetherNet Node server.'
    }));

    ws.on('close', () => {
      console.log('❌ UI Client disconnected');
    });
  });

  // Subscribe to stream and broadcast
  try {
      await subscriber.subscribe('metrics:stream', (message) => {
        const payload = {
            type: 'metrics',
            data: JSON.parse(message)
        };
        const strPayload = JSON.stringify(payload);
        
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(strPayload);
            }
        });
      });
  } catch (e) {
      console.error("Redis subscribe failed", e);
  }

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
