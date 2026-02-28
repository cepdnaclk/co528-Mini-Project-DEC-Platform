/**
 * realtimeEmitter.js
 * Shared utility for services that need to push events to connected browser clients.
 * Calls the internal /emit endpoint on the Realtime service.
 */
const http = require('http');

const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://realtime:3010';
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'dev-secret';

/**
 * Pushes a real-time event to a specific user's browser over WebSocket.
 * Non-throwing — failures are logged but do not crash the calling service.
 *
 * @param {string} userId - The MongoDB user ID to deliver to
 * @param {string} event  - Socket.io event name (e.g. 'notification', 'message')
 * @param {object} payload - Data to send to the client
 */
async function emitToUser(userId, event, payload) {
  const body = JSON.stringify({ userId, event, payload });
  const url = new URL('/emit', REALTIME_SERVICE_URL);

  return new Promise((resolve) => {
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-internal-token': INTERNAL_SECRET,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.delivered) {
              console.log(`[REALTIME EMITTER] Delivered '${event}' to user ${userId}`);
            } else {
              console.log(`[REALTIME EMITTER] User ${userId} not connected (event '${event}' not delivered live)`);
            }
          } catch (_) {}
          resolve();
        });
      }
    );

    req.on('error', (err) => {
      // Realtime service being down must NEVER crash the calling service
      console.warn(`[REALTIME EMITTER] Could not reach realtime service: ${err.message}`);
      resolve();
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.warn('[REALTIME EMITTER] Timeout reaching realtime service');
      resolve();
    });

    req.write(body);
    req.end();
  });
}

module.exports = { emitToUser };
