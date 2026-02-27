const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  coverLetter: { type: String, required: true },
  cvUrl: { type: String, required: true }
}, { timestamps: true });

const jobSchema = new mongoose.Schema({
  posterId: { type: String, required: true },
  posterName: { type: String, required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true, enum: ['internship', 'full-time', 'part-time', 'contract'] },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  active: { type: Boolean, default: true },
  applications: [applicationSchema],
  applicationCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
