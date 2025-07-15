'use strict';

const { sequelize, Op } = require('sequelize');
const {
  User,
  Customer,
  Event,
  InDiningOrder,
  ParkingBooking,
  ParkingSpace,
  EventTracking,
} = require('@models');
const meventsTrackingConstants = require('@constants/meventsTrackingConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');

async function trackUserInteractions({ customerId, eventId, interactionType, metadata = {}, transaction }) {
  // Validate customer
  const customer = await User.findByPk(customerId, {
    attributes: ['id', 'preferred_language', 'notification_preferences'],
    include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
    transaction,
  });
  if (!customer || !customer.customer_profile) {
    throw new Error(meventsConstants.ERROR_TYPES.INVALID_CUSTOMER);
  }

  // Validate interaction type
  if (!Object.values(meventsTrackingConstants.INTERACTION_TYPES).includes(interactionType)) {
    throw new Error(meventsTrackingConstants.ERROR_TYPES.INVALID_INTERACTION_TYPE);
  }

  // Validate event (if provided)
  let event = null;
  if (eventId) {
    event = await Event.findByPk(eventId, { transaction });
    if (!event) throw new Error(meventsConstants.ERROR_TYPES.EVENT_NOT_FOUND);
    if (event.customer_id !== customerId) throw new Error(meventsConstants.ERROR_TYPES.UNAUTHORIZED_EVENT);
  }

  // Validate service interactions
  if (interactionType === meventsTrackingConstants.INTERACTION_TYPES.IN_DINING_ORDER_ADDED) {
    const inDiningOrderId = metadata.inDiningOrderId;
    if (!inDiningOrderId) throw new Error(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    const inDiningOrder = await InDiningOrder.findByPk(inDiningOrderId, {
      include: [{ model: Customer, as: 'customer', attributes: ['user_id'] }],
      transaction,
    });
    if (!inDiningOrder || inDiningOrder.customer.user_id !== customerId) {
      throw new Error(mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }
  } else if (interactionType === meventsTrackingConstants.INTERACTION_TYPES.PARKING_BOOKING_ADDED) {
    const parkingBookingId = metadata.parkingBookingId;
    if (!parkingBookingId) throw new Error(mparkConstants.ERROR_TYPES.PARKING_BOOKING_NOT_FOUND);
    const parkingBooking = await ParkingBooking.findByPk(parkingBookingId, {
      include: [{ model: ParkingSpace, as: 'space', attributes: ['id', 'status'] }],
      transaction,
    });
    if (
      !parkingBooking ||
      parkingBooking.customer_id !== customerId ||
      parkingBooking.space.status !== mparkConstants.SPACE_CONFIG.SPACE_STATUSES.AVAILABLE
    ) {
      throw new Error(mparkConstants.ERROR_TYPES.PARKING_NOT_AVAILABLE);
    }
  }

  // Check daily interaction limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const interactionCount = await EventTracking.count({
    where: {
      customer_id: customerId,
      created_at: { [Op.gte]: today },
    },
    transaction,
  });
  if (interactionCount >= meventsTrackingConstants.TRACKING_SETTINGS.MAX_INTERACTIONS_PER_DAY) {
    throw new Error(meventsTrackingConstants.ERROR_TYPES.MAX_INTERACTIONS_EXCEEDED);
  }

  // Create tracking record
  const tracking = await EventTracking.create(
    {
      customer_id: customerId,
      event_id: eventId,
      interaction_type: interactionType,
      metadata,
    },
    { transaction }
  );

  return { tracking, customer };
}

async function analyzeEngagement({ customerId }) {
  const periodDays = meventsTrackingConstants.TRACKING_SETTINGS.ENGAGEMENT_ANALYSIS_PERIOD_DAYS;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Validate customer
  const customer = await User.findByPk(customerId, {
    attributes: ['id', 'preferred_language', 'notification_preferences'],
    include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
  });
  if (!customer || !customer.customer_profile) {
    throw new Error(meventsConstants.ERROR_TYPES.INVALID_CUSTOMER);
  }

  // Fetch interactions
  const interactions = await EventTracking.findAll({
    where: {
      customer_id: customerId,
      created_at: { [Op.gte]: startDate },
    },
    include: [{ model: Event, as: 'event', attributes: ['id', 'occasion'] }],
  });

  if (interactions.length < meventsTrackingConstants.TRACKING_SETTINGS.MIN_INTERACTIONS_FOR_ANALYSIS) {
    throw new Error(meventsTrackingConstants.ERROR_TYPES.INSUFFICIENT_INTERACTIONS);
  }

  // Analyze interactions
  const metrics = {
    totalInteractions: interactions.length,
    interactionTypes: {},
    eventCount: 0,
    occasions: {},
    services: { mtables: 0, munch: 0, mtxi: 0, in_dining: 0, mpark: 0 },
  };

  const eventIds = new Set();
  interactions.forEach((interaction) => {
    metrics.interactionTypes[interaction.interaction_type] =
      (metrics.interactionTypes[interaction.interaction_type] || 0) + 1;

    if (interaction.event_id && !eventIds.has(interaction.event_id)) {
      eventIds.add(interaction.event_id);
      metrics.eventCount++;
      const occasion = interaction.event?.occasion || 'unknown';
      metrics.occasions[occasion] = (metrics.occasions[occasion] || 0) + 1;
    }

    if (interaction.interaction_type === meventsTrackingConstants.INTERACTION_TYPES.BOOKING_ADDED) {
      metrics.services.mtables++;
    } else if (interaction.interaction_type === meventsTrackingConstants.INTERACTION_TYPES.ORDER_ADDED) {
      metrics.services.munch++;
    } else if (interaction.interaction_type === meventsTrackingConstants.INTERACTION_TYPES.RIDE_ADDED) {
      metrics.services.mtxi++;
    } else if (interaction.interaction_type === meventsTrackingConstants.INTERACTION_TYPES.IN_DINING_ORDER_ADDED) {
      metrics.services.in_dining++;
    } else if (interaction.interaction_type === meventsTrackingConstants.INTERACTION_TYPES.PARKING_BOOKING_ADDED) {
      metrics.services.mpark++;
    }
  });

  return { metrics, customer };
}

module.exports = {
  trackUserInteractions,
  analyzeEngagement,
};