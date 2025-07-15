'use strict';

const crmEvents = require('@socket/events/merchant/crm/crmEvents');
const logger = require('@utils');

function setupCRMHandlers(io, socket) {
  socket.on(crmEvents.CUSTOMERS_SEGMENTED, (data) => {
    logger.info('Customer segmentation event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(crmEvents.CUSTOMERS_SEGMENTED, data);
  });

  socket.on(crmEvents.BEHAVIOR_ANALYZED, (data) => {
    logger.info('Behavior analysis event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(crmEvents.BEHAVIOR_ANALYZED, data);
  });

  socket.on(crmEvents.OFFERS_TARGETED, (data) => {
    logger.info('Targeted offers event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(crmEvents.OFFERS_TARGETED, data);
  });

  socket.on(crmEvents.REVIEW_COLLECTED, (data) => {
    logger.info('Review collected event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(crmEvents.REVIEW_COLLECTED, data);
  });

  socket.on(crmEvents.INTERACTION_MANAGED, (data) => {
    logger.info('Community interaction event received', { reviewId: data.reviewId });
    socket.to(`merchant:${data.merchantId}`).emit(crmEvents.INTERACTION_MANAGED, data);
  });

  socket.on(crmEvents.FEEDBACK_RESPONDED, (data) => {
    logger.info('Feedback responded event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(crmEvents.FEEDBACK_RESPONDED, data);
  });

  socket.on(crmEvents.CUSTOMER_ALERT_SENT, (data) => {
    logger.info('Customer alert sent event received', { customerId: data.customerId });
    socket.to(`customer:${data.customerId}`).emit(crmEvents.CUSTOMER_ALERT_SENT, data);
  });

  socket.on(crmEvents.STAFF_NOTIFICATION_SENT, (data) => {
    logger.info('Staff notification sent event received', { staffId: data.staffId });
    socket.to(`staff:${data.staffId}`).emit(crmEvents.STAFF_NOTIFICATION_SENT, data);
  });

  socket.on(crmEvents.DRIVER_NOTIFICATION_SENT, (data) => {
    logger.info('Driver notification sent event received', { driverId: data.driverId });
    socket.to(`driver:${data.driverId}`).emit(crmEvents.DRIVER_NOTIFICATION_SENT, data);
  });
}

module.exports = { setupCRMHandlers };