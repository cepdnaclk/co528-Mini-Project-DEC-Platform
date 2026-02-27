const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const eventRoutes = require('./routes/eventRoutes');

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3005;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware to check x-internal-token
const enforceInternalToken = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (token !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid internal token' });
  }
  next();
};

app.use('/api/v1/events', enforceInternalToken, eventRoutes);

// Database connection
mongoose.connect(MONGODB_URI, { dbName: 'decp_events' })
  .then(() => {
    console.log('Connected to decp_events MongoDB');
    app.listen(PORT, () => {
      console.log(`Events service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
