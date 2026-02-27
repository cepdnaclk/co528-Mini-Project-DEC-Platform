const mongoose = require('mongoose');

// A message in a 1:1 or group conversation
const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true }, // For 1:1 chats, this is the other user
  conversationId: { type: String, required: true }, // sorted(senderId, recipientId).join('_')
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
