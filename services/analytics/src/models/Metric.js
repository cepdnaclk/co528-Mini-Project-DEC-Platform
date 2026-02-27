const mongoose = require('mongoose');

// A simple key-value metrics store. Each document holds a counter name and its value.
const metricSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Metric', metricSchema);
