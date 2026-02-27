const { PubSub } = require('@google-cloud/pubsub');
const dotenv = require('dotenv');
dotenv.config({ path: '../docker-compose.env' }); // load shared env

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'dummy-project';

// We explicitly instruct the library to hit our emulator running on port 8085 locally, 
// rather than using ADC credentials.
const pubsub = new PubSub({
  projectId,
  apiEndpoint: 'localhost:8085',
});

const topics = [
  'decp.user.registered',
  'decp.post.created',
  'decp.post.liked',
  'decp.job.posted',
  'decp.job.applied',
  'decp.event.created',
  'decp.event.rsvp'
];

async function setup() {
  console.log(`Ensuring ${topics.length} topics exist in emulator...`);
  
  for (const topicName of topics) {
    try {
      await pubsub.createTopic(topicName);
      console.log(`Created topic: ${topicName}`);
    } catch (e) {
      if (e.code === 6) { // ALREADY_EXISTS
        console.log(`Topic already exists: ${topicName}`);
      } else {
        console.error(`Failed to create topic ${topicName}:`, e);
      }
    }
  }

  // We will create the push subscriptions pointing to local container names
  // e.g., pointing to the `notification` and `analytics` services that we will build in Phase 11.
  const subscriptions = [
    { topic: 'decp.post.created', sub: 'decp-notification-post-sub', pushEndpoint: 'http://notification:3007/pubsub/push' },
    { topic: 'decp.post.liked', sub: 'decp-notification-like-sub', pushEndpoint: 'http://notification:3007/pubsub/push' },
    { topic: 'decp.job.posted', sub: 'decp-notification-job-sub', pushEndpoint: 'http://notification:3007/pubsub/push' },
    { topic: 'decp.job.applied', sub: 'decp-notification-applied-sub', pushEndpoint: 'http://notification:3007/pubsub/push' },
    { topic: 'decp.event.created', sub: 'decp-notification-event-sub', pushEndpoint: 'http://notification:3007/pubsub/push' },
    { topic: 'decp.event.rsvp', sub: 'decp-notification-rsvp-sub', pushEndpoint: 'http://notification:3007/pubsub/push' },
    
    { topic: 'decp.post.created', sub: 'decp-analytics-post-sub', pushEndpoint: 'http://analytics:3008/pubsub/push' },
    { topic: 'decp.job.posted', sub: 'decp-analytics-job-sub', pushEndpoint: 'http://analytics:3008/pubsub/push' },
    { topic: 'decp.job.applied', sub: 'decp-analytics-applied-sub', pushEndpoint: 'http://analytics:3008/pubsub/push' },
    { topic: 'decp.event.created', sub: 'decp-analytics-event-sub', pushEndpoint: 'http://analytics:3008/pubsub/push' },
    { topic: 'decp.event.rsvp', sub: 'decp-analytics-rsvp-sub', pushEndpoint: 'http://analytics:3008/pubsub/push' },
    { topic: 'decp.user.registered', sub: 'decp-analytics-user-sub', pushEndpoint: 'http://analytics:3008/pubsub/push' },
  ];

  const verificationToken = process.env.PUBSUB_VERIFICATION_TOKEN || 'dummy-token-123';

  console.log(`Ensuring ${subscriptions.length} push subscriptions exist...`);
  
  for (const config of subscriptions) {
    try {
      const topic = pubsub.topic(config.topic);
      await topic.createSubscription(config.sub, {
        pushConfig: {
          pushEndpoint: `${config.pushEndpoint}?token=${verificationToken}`
        }
      });
      console.log(`Created subscription ${config.sub} on ${config.topic} -> ${config.pushEndpoint}`);
    } catch (e) {
      if (e.code === 6) { // ALREADY_EXISTS
        console.log(`Subscription already exists: ${config.sub}`);
      } else {
        console.error(`Failed to create sub ${config.sub}:`, e);
      }
    }
  }

  console.log('Pub/Sub emulator topology initialized.');
}

setup().catch(console.error);
