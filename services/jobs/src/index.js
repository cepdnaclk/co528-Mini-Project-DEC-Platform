const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jobRoutes = require('./routes/jobRoutes');

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware to check x-internal-token
const enforceInternalToken = (req, res, next) => {
  const path = req.path;
  const token = req.headers['x-internal-token'];
  if (token !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid internal token' });
  }
  next();
};

app.use('/api/v1/jobs', enforceInternalToken, jobRoutes);

// Database connection
mongoose.connect(MONGODB_URI, { dbName: 'decp_jobs' })
  .then(() => {
    console.log('Connected to decp_jobs MongoDB');
    app.listen(PORT, () => {
      console.log(`Jobs service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
