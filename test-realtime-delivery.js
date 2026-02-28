// ws-verify.js — Uses correct passwords from test-messaging.sh
const { io } = require('socket.io-client');
const axios = require('axios');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const results = { wsConnected: false, wsMessageReceived: false, wsNotifReceived: false, directEmitDelivered: false };

  // Login as admin (password from test-messaging.sh: secret123)
  const adminLogin = await axios.post('http://localhost:8082/api/v1/auth/login', {
    email: 'admin@decp.app', password: 'secret123'
  });
  const adminToken = adminLogin.data.data.accessToken;
  const adminId = adminLogin.data.data.userId;
  console.log(`[WS] Admin logged in: ${adminId}`);

  // Connect to socket.io via the Gateway
  const socket = io('http://localhost:8082', {
    path: '/realtime/socket.io',
    auth: { token: adminToken },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    results.wsConnected = true;
    console.log(`[WS] ✅ WebSocket CONNECTED (sid=${socket.id})`);
  });
  socket.on('message', d => {
    results.wsMessageReceived = true;
    console.log('[WS] 💬 Chat message received via WebSocket:', JSON.stringify(d));
  });
  socket.on('notification', d => {
    results.wsNotifReceived = true;
    console.log('[WS] 🔔 Notification received via WebSocket:', JSON.stringify(d));
  });
  socket.on('connect_error', e => console.error('[WS] ❌ connect_error:', e.message));

  await sleep(1500);
  if (!results.wsConnected) { console.error('[WS] FATAL: WebSocket did not connect'); process.exit(1); }

  // Send chat message from chatuser to admin
  const stuLogin = await axios.post('http://localhost:8082/api/v1/auth/login', {
    email: 'chatuser@decp.app', password: 'pass1234'
  });
  const stuToken = stuLogin.data.data.accessToken;
  console.log('[WS] chatuser logged in. Sending message to admin...');

  const msgResp = await axios.post('http://localhost:8082/api/v1/messages/send',
    { recipientId: adminId, content: 'WebSocket E2E delivery test!' },
    { headers: { Authorization: `Bearer ${stuToken}` } }
  );
  console.log('[WS] Message POST result:', JSON.stringify(msgResp.data));

  await sleep(1500);

  // Test /emit directly on the realtime service
  const health = await axios.get('http://localhost:3010/health');
  console.log('[WS] Realtime health:', JSON.stringify(health.data));

  const emitResp = await axios.post('http://localhost:3010/emit',
    { userId: adminId, event: 'notification', payload: { type: 'test', content: 'Direct emit verification' } },
    { headers: { 'x-internal-token': 'dev-secret' } }
  );
  console.log('[WS] Direct /emit response:', JSON.stringify(emitResp.data));
  if (emitResp.data.delivered) results.directEmitDelivered = true;

  await sleep(1000);
  socket.disconnect();

  console.log('\n=== WEBSOCKET TEST RESULTS ===');
  console.log('WS_CONNECTED:', results.wsConnected);
  console.log('WS_MSG_RECEIVED:', results.wsMessageReceived);
  console.log('WS_NOTIF_RECEIVED:', results.wsNotifReceived);
  console.log('DIRECT_EMIT_DELIVERED:', results.directEmitDelivered);

  process.exit(results.wsConnected ? 0 : 1);
}

run().catch(e => { console.error('[WS] Fatal:', e.message); process.exit(1); });
