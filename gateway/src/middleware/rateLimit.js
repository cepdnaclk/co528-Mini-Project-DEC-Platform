const rateLimit = require('express-rate-limit');

// TODO: re-enable rate limiting for production (max: 200 per 15 min)
module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000, // effectively unlimited for testing
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
