const { createProxyMiddleware } = require('http-proxy-middleware');

const createServiceProxy = (targetUrl, prefix) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: (path) => prefix + path,
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (req.headers['x-user-id']) proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        if (req.headers['x-user-role']) proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        if (req.headers['x-internal-token']) proxyReq.setHeader('x-internal-token', req.headers['x-internal-token']);
      }
    }
  });
};

module.exports = (app) => {
  if (process.env.AUTH_SERVICE_URL) {
    app.use('/api/v1/auth', createServiceProxy(process.env.AUTH_SERVICE_URL, '/api/v1/auth'));
  }
  if (process.env.USER_SERVICE_URL) {
    app.use('/api/v1/users', createServiceProxy(process.env.USER_SERVICE_URL, '/api/v1/users'));
  }
  if (process.env.FEED_SERVICE_URL) {
    app.use('/api/v1/feed', createServiceProxy(process.env.FEED_SERVICE_URL, '/api/v1/feed'));
  }
  if (process.env.JOBS_SERVICE_URL) {
    app.use('/api/v1/jobs', createServiceProxy(process.env.JOBS_SERVICE_URL, '/api/v1/jobs'));
  }
  if (process.env.EVENTS_SERVICE_URL) {
    app.use('/api/v1/events', createServiceProxy(process.env.EVENTS_SERVICE_URL, '/api/v1/events'));
  }
};
