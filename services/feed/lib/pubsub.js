/**
 * Copy to `lib/pubsub.js` inside each service that publishes events.
 */
const { PubSub } = require('@google-cloud/pubsub');

// If PROJECT_ID is not set, it uses default application credentials or emulator
const pubsub = new PubSub({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'dummy-project' });

/**
 * Publishes a message to a specific topic.
 * @param {string} topicName 
 * @param {object} payload 
 */
async function publish(topicName, payload) {
  try {
    const dataBuffer = Buffer.from(JSON.stringify(payload));
    const messageId = await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
    console.log(`Message ${messageId} published to ${topicName}.`);
    return messageId;
  } catch (error) {
    console.error(`Received error while publishing to ${topicName}:`, error.message);
    // Failure must not crash the request
  }
}

module.exports = { publish };
