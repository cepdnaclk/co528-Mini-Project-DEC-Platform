require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { handlePubSubPush } = require('./controllers/analyticsController');

const app = express();
app.use(express.json());

// Pub/Sub push endpoint (receives events from emulator)
app.post('/pubsub/push', handlePubSubPush);

// Admin metrics API
app.use('/api/v1/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'analytics-service' }));

const PORT = process.env.PORT || 3008;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { dbName: 'decp_analytics' })
  .then(() => {
    console.log('Connected to decp_analytics MongoDB');
    app.listen(PORT, () => {
      console.log(`Analytics service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
