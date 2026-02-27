const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, default: 'New User' },
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  skills: [{ type: String }],
  role: { type: String, enum: ['student', 'alumni', 'admin'], default: 'student' }
}, { timestamps: true });

module.exports = mongoose.model('User', userProfileSchema);
