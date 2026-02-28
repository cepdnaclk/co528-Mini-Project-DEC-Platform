const z = require('zod');
const Message = require('../models/Message');
const { emitToUser } = require('../../lib/realtimeEmitter');

const sendSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1),
});

function getConversationId(userA, userB) {
  return [userA, userB].sort().join('_');
}

exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.headers['x-user-id'];
    if (!senderId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { recipientId, content } = sendSchema.parse(req.body);
    const conversationId = getConversationId(senderId, recipientId);

    const message = await Message.create({ senderId, recipientId, conversationId, content });

    // Push the new message to the RECIPIENT's browser in real-time (if connected)
    await emitToUser(recipientId, 'message', {
      _id: message._id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      conversationId: message.conversationId,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt,
    });

    // Also emit back to the SENDER so multi-tab sessions stay in sync
    await emitToUser(senderId, 'message:sent', {
      _id: message._id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, error: err.errors });
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { otherUserId } = req.params;
    const conversationId = getConversationId(userId, otherUserId);

    const limit = parseInt(req.query.limit) || 50;
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getInbox = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Return a list of the latest message from each unique conversation
    const messages = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { recipientId: userId }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversationId', latestMessage: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestMessage' } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 }
    ]);

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
