// src/services/disputeService.js
'use strict';

/**
 * Service for managing disputes across services (mtables, munch, mtxi, mpark, in_dining).
 */

const { sequelize } = require('@models');
const { Booking, Order, Ride, User, Dispute, ParkingBooking, InDiningOrder } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const rideConstants = require('@constants/common/mtxiConstants');
const disputeConstants = require('@constants/common/disputeConstants');
const mparkConstants = require('@constants/common/mparkConstants');

async function createDispute({ customerId, serviceId, issue, issueType, transaction }) {
  if (!disputeConstants.ISSUE_TYPES.includes(issueType)) {
    throw new Error(disputeConstants.ERROR_CODES.INVALID_ISSUE);
  }

  if (issue.length > disputeConstants.DISPUTE_SETTINGS.MAX_ISSUE_LENGTH) {
    throw new Error(disputeConstants.ERROR_CODES.INVALID_ISSUE);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const disputeCount = await Dispute.count({
    where: {
      customer_id: customerId,
      created_at: { [sequelize.Op.gte]: today },
    },
    transaction,
  });
  if (disputeCount >= disputeConstants.DISPUTE_SETTINGS.MAX_DISPUTES_PER_DAY) {
    throw new Error(disputeConstants.ERROR_CODES.MAX_DISPUTES_EXCEEDED);
  }

  const customer = await User.findByPk(customerId, {
    attributes: ['id', 'preferred_language', 'notification_preferences'],
    transaction,
  });
  if (!customer) throw new Error(disputeConstants.ERROR_CODES.INVALID_CUSTOMER);

  let serviceType, reference;

  let service = await Booking.findByPk(serviceId, { transaction });
  if (service) {
    serviceType = 'mtables';
    reference = service.reference;
    if (service.customer_id !== customerId) {
      throw new Error(disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
    }
  } else {
    service = await Order.findByPk(serviceId, { transaction });
    if (service) {
      serviceType = 'munch';
      reference = service.order_number;
      if (service.customer_id !== customerId) {
        throw new Error(disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
      }
    } else {
      service = await Ride.findByPk(serviceId, { transaction });
      if (service) {
        serviceType = 'mtxi';
        reference = service.id.toString();
        if (service.customerId !== customerId) {
          throw new Error(disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
        }
      } else {
        service = await ParkingBooking.findByPk(serviceId, { transaction });
        if (service) {
          serviceType = 'mpark';
          reference = service.id.toString();
          if (service.customer_id !== customerId) {
            throw new Error(disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
          }
        } else {
          service = await InDiningOrder.findByPk(serviceId, { transaction });
          if (service) {
            serviceType = 'in_dining';
            reference = service.order_number;
            if (service.customer_id !== customerId) {
              throw new Error(disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
            }
          } else {
            throw new Error(disputeConstants.ERROR_CODES.INVALID_SERVICE);
          }
        }
      }
    }
  }

  const dispute = await Dispute.create(
    {
      customer_id: customerId,
      service_id: serviceId,
      service_type: serviceType,
      issue,
      issue_type: issueType,
      status: disputeConstants.DISPUTE_STATUSES.PENDING,
    },
    { transaction }
  );

  return { dispute, serviceType, reference, customer };
}

async function trackDisputeStatus({ disputeId, customerId }) {
  const dispute = await Dispute.findByPk(disputeId, {
    attributes: ['id', 'status', 'service_type', 'issue', 'issue_type', 'resolution'],
    include: [{ model: User, as: 'customer', attributes: ['id'] }],
  });

  if (!dispute) throw new Error(disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND);
  if (dispute.customer_id !== customerId) {
    throw new Error(disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
  }

  return {
    id: dispute.id,
    status: dispute.status,
    serviceType: dispute.service_type,
    issue: dispute.issue,
    issueType: dispute.issue_type,
    resolution: dispute.resolution,
  };
}

async function resolveDispute({ disputeId, resolution, resolutionType, transaction }) {
  if (!disputeConstants.RESOLUTION_TYPES.includes(resolutionType)) {
    throw new Error(disputeConstants.ERROR_CODES.INVALID_RESOLUTION);
  }

  const dispute = await Dispute.findByPk(disputeId, {
    include: [{ model: User, as: 'customer', attributes: ['id', 'preferred_language', 'notification_preferences'] }],
    transaction,
  });
  if (!dispute) throw new Error(disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND);
  if (
    dispute.status === disputeConstants.DISPUTE_STATUSES.RESOLVED ||
    dispute.status === disputeConstants.DISPUTE_STATUSES.CLOSED
  ) {
    throw new Error(disputeConstants.ERROR_CODES.DISPUTE_ALREADY_RESOLVED);
  }

  await dispute.update(
    {
      status: disputeConstants.DISPUTE_STATUSES.RESOLVED,
      resolution,
      resolution_type: resolutionType,
    },
    { transaction }
  );

  return { dispute };
}

async function getParkingDisputes({ customerId, transaction }) {
  const disputes = await Dispute.findAll({
    where: {
      customer_id: customerId,
      service_type: 'mpark',
    },
    include: [
      { model: User, as: 'customer', attributes: ['id', 'preferred_language'] },
      { model: ParkingBooking, as: 'parking_booking', attributes: ['id', 'booking_type', 'status'] },
    ],
    transaction,
  });

  return disputes.map(dispute => ({
    id: dispute.id,
    serviceId: dispute.service_id,
    serviceType: dispute.service_type,
    issue: dispute.issue,
    issueType: dispute.issue_type,
    status: dispute.status,
    resolution: dispute.resolution,
    bookingDetails: dispute.parking_booking ? {
      bookingType: dispute.parking_booking.booking_type,
      status: dispute.parking_booking.status,
    } : null,
  }));
}

async function cancelParkingDispute({ disputeId, customerId, transaction }) {
  const dispute = await Dispute.findByPk(disputeId, {
    include: [{ model: User, as: 'customer', attributes: ['id'] }],
    transaction,
  });

  if (!dispute) throw new Error(disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND);
  if (dispute.customer_id !== customerId) throw new Error(disputeConstants.ERROR_CODES.UNAUTHORIZED_DISPUTE);
  if (dispute.status !== disputeConstants.DISPUTE_STATUSES.PENDING) {
    throw new Error(disputeConstants.ERROR_CODES.DISPUTE_ALREADY_RESOLVED);
  }

  await dispute.update(
    { status: disputeConstants.DISPUTE_STATUSES.CLOSED },
    { transaction }
  );

  return { dispute };
}

module.exports = {
  createDispute,
  trackDisputeStatus,
  resolveDispute,
  getParkingDisputes,
  cancelParkingDispute,
};