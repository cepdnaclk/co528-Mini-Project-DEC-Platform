const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3100',
  process.env.WEB_CLIENT_URL,
  process.env.WEB_CLIENT_URL_PREVIEW
].filter(Boolean);


module.exports = cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});
