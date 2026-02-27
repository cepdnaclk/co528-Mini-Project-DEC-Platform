require('dotenv').config();
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

setupProxies(app);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
