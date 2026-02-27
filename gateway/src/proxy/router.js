const { createProxyMiddleware } = require('http-proxy-middleware');

const createServiceProxy = (targetUrl, prefix) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: {
      '^/api/v1/auth': '/api/v1/auth',
      '^/api/v1/users': '/api/v1/users',
      '^/api/v1/feed': '/api/v1/feed',
      '^/api/v1/jobs': '/api/v1/jobs',
      '^/api/v1/events': '/api/v1/events',
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Express drops the app.use() prefix; we force it back to ensure target gets full URL
        proxyReq.path = prefix + (req.url === '/' ? '' : req.url);
        
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
  if (process.env.NOTIFICATION_SERVICE_URL) {
    app.use('/api/v1/notifications', createServiceProxy(process.env.NOTIFICATION_SERVICE_URL, '/api/v1/notifications'));
  }
  if (process.env.ANALYTICS_SERVICE_URL) {
    app.use('/api/v1/analytics', createServiceProxy(process.env.ANALYTICS_SERVICE_URL, '/api/v1/analytics'));
  }
  if (process.env.MESSAGING_SERVICE_URL) {
    app.use('/api/v1/messages', createServiceProxy(process.env.MESSAGING_SERVICE_URL, '/api/v1/messages'));
  }
  if (process.env.RESEARCH_SERVICE_URL) {
    app.use('/api/v1/research', createServiceProxy(process.env.RESEARCH_SERVICE_URL, '/api/v1/research'));
  }
};
