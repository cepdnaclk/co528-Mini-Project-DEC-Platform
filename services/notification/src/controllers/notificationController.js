const Notification = require('../models/Notification');
const z = require('zod');
const { emitToUser } = require('../../lib/realtimeEmitter');


// Schema for fetching notifications
const fetchQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.preprocess((val) => parseInt(val, 10), z.number().min(1).max(50)).default(20),
});

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized: No user info' });

    const validatedQuery = fetchQuerySchema.parse(req.query);
    const limit = validatedQuery.limit;
    
    let query = { recipientId: userId };
    if (validatedQuery.cursor) {
      query._id = { $lt: validatedQuery.cursor };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasNextPage = notifications.length > limit;
    const items = hasNextPage ? notifications.slice(0, -1) : notifications;
    const nextCursor = hasNextPage ? items[items.length - 1]._id : null;

    res.json({
      success: true,
      data: items,
      nextCursor
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const notificationId = req.params.id;

    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const notif = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });

    res.json({ success: true, data: notif });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Pub/Sub HTTP Push Endpoint handler
// https://cloud.google.com/pubsub/docs/push
exports.handlePubSubPush = async (req, res) => {
  try {
    const token = req.query.token;
    if (token !== process.env.PUBSUB_VERIFICATION_TOKEN) {
       return res.status(403).send('Invalid token');
    }

    const message = req.body.message;
    if (!message || !message.data) {
      return res.status(400).send('Bad Request: invalid payload');
    }

    // Decode from base64
    const stringData = Buffer.from(message.data, 'base64').toString('utf8');
    const event = JSON.parse(stringData);

    console.log(`Received Notification Event on topic. Event Type: ${event.type}`);

    // Very simple dynamic notification mapping based on the event payload shape.
    let notificationsToCreate = [];

    switch (event.type) {
      case 'decp.post.created':
        // Perhaps notify followers if we had a following system. Let's ignore this baseline event.
        break;
      case 'decp.post.liked':
        if (event.authorId && event.authorId !== event.likerId) {
          notificationsToCreate.push({
            recipientId: event.authorId,
            type: 'post_like',
            content: `Someone liked your post.`,
            link: `/posts/${event.postId}`
          });
        }
        break;
      case 'decp.job.applied':
        if (event.posterId) {
            notificationsToCreate.push({
                recipientId: event.posterId,
                type: 'job_application',
                content: `A new student applied to your job posting.`,
                link: `/jobs/${event.jobId}/applications`
            });
        }
        break;
      case 'decp.event.rsvp':
        if (event.creatorId) {
            notificationsToCreate.push({
                recipientId: event.creatorId,
                type: 'event_rsvp',
                content: `Someone RSVP'd to your event.`,
                link: `/events/${event.eventId}`
            });
        }
        break;
      default:
        console.log(`Unhandled Notification event type: ${event.type}`);
    }

    if (notificationsToCreate.length > 0) {
      const saved = await Notification.insertMany(notificationsToCreate);

      // Push each notification to the recipient's browser in real-time
      for (const notif of saved) {
        await emitToUser(notif.recipientId, 'notification', {
          _id: notif._id,
          type: notif.type,
          content: notif.content,
          link: notif.link,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
        });
      }
    }

    // Acknowledge the message by returning 200/204
    res.status(204).send();
  } catch (error) {
    console.error('Error handling pubsub push:', error);
    // Returning 500 tells Pub/Sub to retry
    res.status(500).send();
  }
};
