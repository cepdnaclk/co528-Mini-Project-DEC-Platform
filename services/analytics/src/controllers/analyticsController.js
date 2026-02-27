const Metric = require('../models/Metric');

// Helper to increment a counter atomically (upsert)
async function increment(key, amount = 1) {
  await Metric.findOneAndUpdate(
    { key },
    { $inc: { value: amount } },
    { upsert: true, new: true }
  );
}

exports.getMetrics = async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admins only' });
    }

    const metrics = await Metric.find({}).sort({ key: 1 }).lean();
    const result = {};
    for (const m of metrics) result[m.key] = m.value;

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Pub/Sub HTTP Push handler
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

    const stringData = Buffer.from(message.data, 'base64').toString('utf8');
    const event = JSON.parse(stringData);

    // Map topic names to counter keys
    const counterMap = {
      'decp.user.registered': 'totalUsers',
      'decp.post.created': 'totalPosts',
      'decp.post.liked': 'totalLikes',
      'decp.job.posted': 'totalJobsPosted',
      'decp.job.applied': 'totalApplications',
      'decp.event.created': 'totalEvents',
      'decp.event.rsvp': 'totalRSVPs',
    };

    // Map subscription names → topic names as a fallback when payload has no `type`
    const subTopicMap = {
      'decp-analytics-post-sub': 'decp.post.created',
      'decp-analytics-like-sub': 'decp.post.liked',
      'decp-analytics-job-sub': 'decp.job.posted',
      'decp-analytics-applied-sub': 'decp.job.applied',
      'decp-analytics-event-sub': 'decp.event.created',
      'decp-analytics-rsvp-sub': 'decp.event.rsvp',
      'decp-analytics-user-sub': 'decp.user.registered',
    };

    // Determine event type: explicit field → message attributes → subscription name
    let eventType = event.type || message.attributes?.eventType;
    if (!eventType && req.body.subscription) {
      // subscription = "projects/dummy-project/subscriptions/decp-analytics-post-sub"
      const subName = req.body.subscription.split('/').pop();
      eventType = subTopicMap[subName];
    }

    console.log(`[ANALYTICS] Received event type: ${eventType || 'unknown'}`);
    const counterKey = counterMap[eventType];

    if (counterKey) {
      await increment(counterKey);
      console.log(`[ANALYTICS] Incremented counter: ${counterKey}`);
    } else {
      console.log(`[ANALYTICS] No counter mapped for event type: ${eventType}`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[ANALYTICS] Error handling pubsub push:', error);
    res.status(500).send();
  }
};
