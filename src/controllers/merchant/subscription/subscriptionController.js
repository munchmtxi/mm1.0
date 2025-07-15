// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\controllers\merchant\subscription\subscriptionController.js
'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const subscriptionService = require('@services/merchant/subscription/subscriptionManagementService');
const merchantConstants = require('@constants/merchantConstants');

async function createSubscriptionPlan(req, res) {
  try {
    const { merchantId } = req.params;
    const plan = req.body;
    const io = req.app.get('io');
    const result = await subscriptionService.createSubscriptionPlan(merchantId, plan, io, auditService, socketService, notificationService, pointService, req.ip);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, error: error.message, code: merchantConstants.ERROR_CODES[error.code] || 'UNKNOWN_ERROR' });
  }
}

async function trackSubscriptionTiers(req, res) {
  try {
    const { customerId } = req.params;
    const io = req.app.get('io');
    const result = await subscriptionService.trackSubscriptionTiers(customerId, io, auditService, socketService, pointService, req.ip);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, error: error.message, code: merchantConstants.ERROR_CODES[error.code] || 'UNKNOWN_ERROR' });
  }
}

async function manageSubscriptions(req, res) {
  try {
    const { customerId } = req.params;
    const action = req.body;
    const io = req.app.get('io');
    const result = await subscriptionService.manageSubscriptions(customerId, action, io, auditService, socketService, notificationService, pointService, req.ip);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, error: error.message, code: merchantConstants.ERROR_CODES[error.code] || 'UNKNOWN_ERROR' });
  }
}

module.exports = {
  createSubscriptionPlan,
  trackSubscriptionTiers,
  manageSubscriptions,
};