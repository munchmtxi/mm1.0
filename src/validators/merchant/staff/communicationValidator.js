// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\validators\merchant\staff\communicationValidator.js
'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

const sendMessageValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('senderId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid sender ID'),
  body('content').notEmpty().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid content'),
  body('channelId').optional().isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid channel ID'),
];

const announceShiftValidation = [
  param('scheduleId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid shift ID'),
  body('content').notEmpty().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'Invalid content'),
];

const manageChannelsValidation = [
  param('restaurantId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch ID'),
  body('name').notEmpty().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid channel name'),
  body('type').isIn(Object.values(staffConstants.CHANNEL_TYPES || {})).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid channel type'),
];

const trackCommunicationValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
];

module.exports = {
  sendMessageValidation,
  announceShiftValidation,
  manageChannelsValidation,
  trackCommunicationValidation,
};