require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const researchRoutes = require('./routes/researchRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/research', researchRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'research-service' }));

const PORT = process.env.PORT || 3009;
mongoose.connect(process.env.MONGODB_URI, { dbName: 'decp_research' })
  .then(() => {
    console.log('Connected to decp_research MongoDB');
    app.listen(PORT, () => console.log(`Research service running on port ${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });
