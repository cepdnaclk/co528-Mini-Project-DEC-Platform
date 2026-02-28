const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Auth service doesn't need a token (it IS the login endpoint)
  // Realtime service performs its own JWT check on the socket.io handshake
  if (req.path.startsWith('/api/v1/auth') || req.path.startsWith('/realtime')) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-internal-token'] = process.env.INTERNAL_SERVICE_SECRET;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};
