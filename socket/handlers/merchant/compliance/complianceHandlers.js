'use strict';

const complianceEvents = require('@socket/events/merchant/compliance/complianceEvents.js');
const logger = require('@utils/logger');

function setupComplianceHandlers(io, socket) {
  socket.on(complianceEvents.DATA_ENCRYPTED, (data) => {
    logger.info('Data encrypted event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(complianceEvents.DATA_ENCRYPTED, data);
  });

  socket.on(complianceEvents.GDPR_ENFORCED, (data) => {
    logger.info('GDPR compliance event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(complianceEvents.GDPR_ENFORCED, data);
  });

  socket.on(complianceEvents.DATA_ACCESS_CONTROLLED, (data) => {
    logger.info('Data access managed event received', { data: merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(complianceEvents.DATA_ACCESS_CONTROLLED, data);
  });

  socket.on(complianceEvents.CERTIFICATIONS_FOUND, (data) => {
    logger.info('Certification managed event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(complianceEvents.CERTIFICATIONS_FOUND, data);
  });

  socket.on(complianceEvents.STAFF_COMPLETED_VERIFIED, (data)) => {
    logger.info('Staff compliance event received', { staffId: data.staffId });
    socket.to(`staff:${data.staffId}`).emit(complianceEvents.STAFF_COMPLETED_VERIFIED, data);
  });

  socket.on(complianceEvents.DRIVER_COMPLETED_VERIFIED, (data)) => {
    logger.info('Driver compliance event received', { driverId: data.driverId });
    socket.to(`driver:${data.driverId}`).emit(complianceEvents.DRIVER_COMPLETED_VERIFIED, data);
  });

  socket.on(complianceEvents.COMPLIANCE_COMPLETED, (data)) => {
    logger.info('Compliance audited event received', { merchantId: data.merchantId });
    socket.to(`merchant:${data.merchantId}`).emit(complianceEvents.COMPLIANCE_COMPLETED, data);
  });
}

module.exports = { setupComplianceHandlers };