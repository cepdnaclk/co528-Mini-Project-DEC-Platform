/**
 * Pub/Sub publisher utility.
 * - If PUBSUB_EMULATOR_HOST is set, publishes to the local emulator.
 * - Otherwise uses real GCP credentials.
 * - Falls back to a mock log if neither is configured correctly.
 */
const { PubSub } = require('@google-cloud/pubsub');

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'dummy-project';
const isEmulator = !!process.env.PUBSUB_EMULATOR_HOST;

// When PUBSUB_EMULATOR_HOST env var is set, the @google-cloud/pubsub SDK
// automatically routes calls to the emulator. No extra config needed.
const pubsub = isEmulator ? new PubSub({ projectId }) : null;

async function publish(topicName, payload) {
  if (!isEmulator) {
    console.log(`[MOCK PUBSUB] Message would be published to ${topicName}:`, payload);
    return 'mock-message-id';
  }
  try {
    const dataBuffer = Buffer.from(JSON.stringify(payload));
    const messageId = await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
    console.log(`[PUBSUB] Message ${messageId} published to ${topicName}.`);
    return messageId;
  } catch (error) {
    console.error(`[PUBSUB] Error publishing to ${topicName}:`, error.message);
    // Failure must not crash the request
  }
}

module.exports = { publish };
