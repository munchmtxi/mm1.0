// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\handlers\merchant\subscription\subscriptionHandler.js
'use strict';

const subscriptionEvents = require('@socket/events/merchant/subscription/subscriptionEvents');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(subscriptionEvents.PLAN_CREATED, (data) => {
      socket.to(`merchant:${data.merchantId}`).emit(subscriptionEvents.PLAN_CREATED, data);
    });

    socket.on(subscriptionEvents.TIERS_TRACKED, (data) => {
      socket.to(`customer:${data.customerId}`).emit(subscriptionEvents.TIERS_TRACKED, data);
    });

    socket.on(subscriptionEvents.SUBSCRIPTION_MANAGED, (data) => {
      socket.to(`customer:${data.customerId}`).emit(subscriptionEvents.SUBSCRIPTION_MANAGED, data);
    });
  });
}

module.exports = {
  setupSocketHandlers,
};