require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const messagingRoutes = require('./routes/messagingRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/messages', messagingRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'messaging-service' }));

const PORT = process.env.PORT || 3006;
mongoose.connect(process.env.MONGODB_URI, { dbName: 'decp_messaging' })
  .then(() => {
    console.log('Connected to decp_messaging MongoDB');
    app.listen(PORT, () => console.log(`Messaging service running on port ${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });
