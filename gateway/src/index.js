require('dotenv').config();
const http = require('http');
const express = require('express');
const corsMiddleware = require('./middleware/cors');
const rateLimitMiddleware = require('./middleware/rateLimit');
const authMiddleware = require('./middleware/auth');
const setupProxies = require('./proxy/router');

const app = express();

app.use(corsMiddleware);
app.use(rateLimitMiddleware);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway' }));

app.use(authMiddleware);

// Create an explicit HTTP server so we can attach the WebSocket upgrade
// handler for the realtime service proxy
const server = http.createServer(app);

setupProxies(app, server);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
