'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError/utils');
const logger = require('@utils/logging/logger');
const catchAsync = require('@utils/catchAsync');
const meventsConstants = require('@constants/middleware/meventsConstants');
const { Event, EventParticipant } = require('@models');

const validateEventAccess = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const eventId = req.body.eventId || req.params.eventId;

  logger.info('Validating event access', { eventId, customerId });

  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new AppError('Event not found', 404, meventsConstants.ERROR_CODES.ME_NOT_FOUND);
  }
  if (event.customer_id !== customerId) {
    throw new AppError('Unauthorized event access', 403, meventsConstants.ERROR_CODES.UNAUTHORIZED_EVENT);
  }

  next();
});

const validateParticipantAccess = catchAsync(async (req, res, next) => {
  const { eventId, participantIds } = req.body;

  logger.info('Validating participantIds access', { eventId, participantIds });

  const event = await Event.findByPk(eventId, {
    include: [{ model: EventParticipant, as: 'participants' }],
  });
  if (!event) {
    throw new AppError('Event not found', 404, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
  }

  const validParticipants = event.participants.filter(
    (p) => participantIds.includes(p.user_id) && p.status === meventsConstants.PARTICIPANT_STATUSES.ACCEPTED
  );
  if (validParticipants.length !== participantIds.length) {
    throw new AppError('Invalid participant', 404, meventsConstants.ERROR_CODES.INVALID_PARTICIPANT);
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  validateEventAccess,
  validateParticipantAccess,
};