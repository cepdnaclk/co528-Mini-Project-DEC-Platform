/**
 * realtimeEmitter.js — Feed service
 * Broadcasts events to connected clients via the Realtime service.
 */
const http = require('http');

const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://realtime:3010';
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'dev-secret';

function postToRealtime(body) {
  const raw = JSON.stringify(body);
  const url = new URL('/emit', REALTIME_SERVICE_URL);

  return new Promise((resolve) => {
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(raw),
        'x-internal-token': INTERNAL_SECRET,
      },
    }, (res) => {
      res.resume();
      res.on('end', resolve);
    });

    req.on('error', (err) => {
      console.warn(`[REALTIME EMITTER] Could not reach realtime service: ${err.message}`);
      resolve();
    });
    req.setTimeout(3000, () => { req.destroy(); resolve(); });
    req.write(raw);
    req.end();
  });
}

/** Push an event to a single user's sockets. */
async function emitToUser(userId, event, payload) {
  return postToRealtime({ userId, event, payload });
}

/** Broadcast an event to ALL connected clients (e.g. feed:new_post). */
async function broadcastToAll(event, payload) {
  return postToRealtime({ event, payload });
}

module.exports = { emitToUser, broadcastToAll };
