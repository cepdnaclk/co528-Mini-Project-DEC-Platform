const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'alumni', 'admin'], default: 'student' },
  refreshTokens: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
