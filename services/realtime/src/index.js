require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // Allow connections from any origin in local dev.
    // In production: restrict to your frontend domain.
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// --------------------------------------------------------------------------
// In-memory connection registry: userId → Set of socket IDs
// In production (multi-instance Cloud Run), replace with Redis.
// --------------------------------------------------------------------------
const userSockets = new Map(); // Map<userId, Set<socketId>>

function registerUser(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function unregisterUser(userId, socketId) {
  if (!userSockets.has(userId)) return;
  userSockets.get(userId).delete(socketId);
  if (userSockets.get(userId).size === 0) userSockets.delete(userId);
}

function emitToUser(userId, event, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) {
    console.log(`[REALTIME] No connected sockets for userId: ${userId}`);
    return false;
  }
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
  console.log(`[REALTIME] Emitted '${event}' to ${sockets.size} socket(s) for user ${userId}`);
  return true;
}

// --------------------------------------------------------------------------
// Socket.io connection handler
// --------------------------------------------------------------------------
io.use((socket, next) => {
  // Auth: client sends JWT token in handshake auth
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { userId } = socket;
  console.log(`[REALTIME] User ${userId} connected (socket: ${socket.id})`);
  registerUser(userId, socket.id);

  // Join a per-user room so we can easily target this user
  socket.join(`user:${userId}`);

  socket.on('disconnect', () => {
    console.log(`[REALTIME] User ${userId} disconnected (socket: ${socket.id})`);
    unregisterUser(userId, socket.id);
  });
});

// --------------------------------------------------------------------------
// Internal HTTP endpoint: other services POST here to emit events to users
// Called by: Notification service, Messaging service
// --------------------------------------------------------------------------
app.post('/emit', (req, res) => {
  const internalToken = req.headers['x-internal-token'];
  if (internalToken !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  const { userId, event, payload } = req.body;
  if (!userId || !event || !payload) {
    return res.status(400).json({ success: false, error: 'Missing userId, event, or payload' });
  }

  const delivered = emitToUser(userId, event, payload);
  res.json({ success: true, delivered, connectedSockets: userSockets.get(userId)?.size ?? 0 });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'realtime-service',
    connectedUsers: userSockets.size,
  });
});

// --------------------------------------------------------------------------
// Start server
// --------------------------------------------------------------------------
const PORT = process.env.PORT || 3010;
server.listen(PORT, () => {
  console.log(`[REALTIME] Realtime service (socket.io) running on port ${PORT}`);
});
