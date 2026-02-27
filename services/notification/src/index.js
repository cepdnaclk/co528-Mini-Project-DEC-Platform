require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const notificationRoutes = require('./routes/notificationRoutes');
const { handlePubSubPush } = require('./controllers/notificationController');

const app = express();

app.use(express.json());
app.use(cookieParser());

// Pub/Sub push route (must not be blocked by user authentication middleware)
// Bypasses gateway typically but we will map it locally.
app.post('/pubsub/push', handlePubSubPush);

// User authenticated routes (relies on API Gateway adding x-user-id)
app.use('/api/v1/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

const PORT = process.env.PORT || 3007;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { dbName: 'decp_notifications' })
  .then(() => {
    console.log('Connected to decp_notifications MongoDB');
    app.listen(PORT, () => {
      console.log(`Notification service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
