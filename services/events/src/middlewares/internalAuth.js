const internalAuth = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid internal token' });
  }
  next();
};
module.exports = internalAuth;
