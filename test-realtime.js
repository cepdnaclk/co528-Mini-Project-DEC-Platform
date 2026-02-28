// test-realtime.js
const { io } = require('socket.io-client');
const axios = require('axios');

async function run() {
  console.log('1. Logging in as admin to get token...');
  const res = await axios.post('http://localhost:8082/api/v1/auth/login', {
    email: 'admin@decp.app',
    password: 'password123'
  });
  
  const token = res.data.data.accessToken;
  const userId = res.data.data.userId;
  
  console.log(`2. Connecting to realtime service at ws://localhost:8082/realtime (UserId: ${userId})`);
  
  // Note: we connect to the gateway and the gateway proxies the upgrade to the realtime service
  const socket = io('http://localhost:8082', {
    path: '/realtime/socket.io',
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('✅ Connected successfully! Socket ID:', socket.id);
  });

  socket.on('notification', (data) => {
    console.log('\n🔔 RECEIVED NOTIFICATION VIA WEBSOCKET:');
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on('message', (data) => {
    console.log('\n💬 RECEIVED CHAT MESSAGE VIA WEBSOCKET:');
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  });

  console.log('\n3. Waiting for events... (Run test-messaging.sh in another terminal to see it work)');
  
  // Just wait for 15 seconds to see if it connects and stays mounted
  setTimeout(() => {
    console.log('\nClosing connection. Test complete.');
    socket.disconnect();
    process.exit(0);
  }, 15000);
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
