require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const feedRoutes = require('./routes/feedRoutes');

const app = express();
app.use(express.json());

app.use('/api/v1/feed', feedRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'feed-service' }));

const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018';

mongoose.connect(MONGODB_URI, { dbName: 'decp_feed' })
  .then(() => {
    console.log('Connected to decp_feed MongoDB');
    app.listen(PORT, () => console.log(`Feed service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
