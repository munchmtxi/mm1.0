'use strict';

const io = require('socket.io-client');
const config = require('./config'); // Path to config.js

const initializeSocket = (userId, role, token) => {
  const socket = io(config.BASE_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(`[${role}] 🏯 Connected! socket.id=${socket.id}`);
    console.log(`[${role}] Current transport=${socket.io.engine.transport.name}`);
    console.log(`[${role}] Auth payload=`, { token: token ? '✅' : '❌' });

    // Request current rooms for debugging
    console.log(`[${role}] → Emitting 'debug:rooms'`);
    socket.emit('debug:rooms', (response) => {
      console.log(`[${role}] ← Current rooms:`, response.rooms);
    });

    // Join dynamic rooms
    if (role === 'admin') {
      // Join admin:taxi
      console.log(`[${role}] → Emitting 'joinAdminRoom' with taxi`);
      socket.emit('joinAdminRoom', 'taxi', (response) => {
        console.log(`[${role}] ← Ack for 'joinAdminRoom':`, response);
      });

      // Join ride rooms
      ['1', '2'].forEach((rideId) => {
        console.log(`[${role}] → Emitting 'joinRideRoom' with ${rideId}`);
        socket.emit('joinRideRoom', rideId, (response) => {
          console.log(`[${role}] ← Ack for 'joinRideRoom':`, response);
        });
      });
    } else if (role === 'customer') {
      // Join ride rooms
      ['1', '2'].forEach((rideId) => {
        console.log(`[${role}] → Emitting 'joinRideRoom' with ${rideId}`);
        socket.emit('joinRideRoom', rideId, (response) => {
          console.log(`[${role}] ← Ack for 'joinRideRoom':`, response);
        });
      });

      // Join subscription rooms
      ['1', '4'].forEach((subscriptionId) => {
        console.log(`[${role}] → Emitting 'joinSubscriptionRoom' with ${subscriptionId}`);
        socket.emit('joinSubscriptionRoom', subscriptionId, (response) => {
          console.log(`[${role}] ← Ack for 'joinSubscriptionRoom':`, response);
        });
      });
    } else if (role === 'driver') {
      // Join ride rooms (only rideId: 2, as rideId: 1 is PENDING and unassigned)
      console.log(`[${role}] → Emitting 'joinRideRoom' with 2`);
      socket.emit('joinRideRoom', '2', (response) => {
        console.log(`[${role}] ← Ack for 'joinRideRoom':`, response);
      });
    } else if (role === 'merchant') {
      // Join merchant room (merchantId=36)
      console.log(`[${role}] → Emitting 'joinMerchantRoom' with 36`);
      socket.emit('joinMerchantRoom', '36', (response) => {
        console.log(`[${role}] ← Ack for 'joinMerchantRoom':`, response);
      });
    } else if (role === 'staff') {
      // Join staff room (merchantId=36)
      console.log(`[${role}] → Emitting 'joinStaffRoom' with 36`);
      socket.emit('joinStaffRoom', '36', (response) => {
        console.log(`[${role}] ← Ack for 'joinStaffRoom':`, response);
      });
    }
  });

  socket.on('error', (error) => {
    console.error(`[${role}] Socket error:`, error);
  });

  socket.on('connect_error', (error) => {
    console.error(`[${role}] Connection error:`, error.message);
  });

  socket.on('pong', () => {
    console.log(`[${role}] 🏓 ping sent`);
  });

  return socket;
};

// Example usage
console.log('⚔️🦾 Starting socketTestClient.js...');
console.log('🗡️📡 Environment variables loaded:', {
  BASE_URL: config.BASE_URL,
  ADMIN_TOKEN: config.ADMIN_TOKEN ? '✅' : '❌',
  CUSTOMER_TOKEN: config.CUSTOMER_TOKEN ? '✅' : '❌',
  DRIVER_TOKEN: config.DRIVER_TOKEN ? '✅' : '❌',
  MERCHANT_TOKEN: config.MERCHANT_TOKEN ? '✅' : '❌',
  STAFF_TOKEN: config.STAFF_TOKEN ? '✅' : '❌',
});

console.log(`[admin] 🛡️🪄 Initializing socket for userId=57`);
const adminSocket = initializeSocket(57, 'admin', config.ADMIN_TOKEN);

console.log(`[customer] 🛡️🪄 Initializing socket for userId=54`);
const customerSocket = initializeSocket(54, 'customer', config.CUSTOMER_TOKEN);

console.log(`[driver] 🛡️🪄 Initializing socket for userId=49`);
const driverSocket = initializeSocket(49, 'driver', config.DRIVER_TOKEN);

console.log(`[merchant] 🛡️🪄 Initializing socket for userId=43`);
const merchantSocket = initializeSocket(43, 'merchant', config.MERCHANT_TOKEN);

console.log(`[staff] 🛡️🪄 Initializing socket for userId=48`);
const staffSocket = initializeSocket(48, 'staff', config.STAFF_TOKEN);