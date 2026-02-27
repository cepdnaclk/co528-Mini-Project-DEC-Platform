const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per `window`
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true, 
  legacyHeaders: false,
});
