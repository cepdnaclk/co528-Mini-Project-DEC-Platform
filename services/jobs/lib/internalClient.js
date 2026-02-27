/**
 * Copy to `lib/internalClient.js` inside each service that makes internal HTTP calls.
 */
const axios = require('axios');

const internalClient = axios.create({
  timeout: 5000,
  headers: {
    'X-Internal-Token': process.env.INTERNAL_SERVICE_SECRET || 'dev-secret'
  }
});

module.exports = internalClient;
