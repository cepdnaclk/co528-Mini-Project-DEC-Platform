const mongoose = require('mongoose');

// A research project or idea posted by a user
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  domain: { type: String, required: true },   // e.g. "Machine Learning", "Embedded Systems"
  creatorId: { type: String, required: true },
  creatorName: { type: String, default: 'Unknown' },
  collaboratorIds: [{ type: String }],
  tags: [{ type: String }],
  status: { type: String, enum: ['open', 'in_progress', 'completed'], default: 'open' },
}, { timestamps: true });

module.exports = mongoose.model('ResearchProject', projectSchema);
