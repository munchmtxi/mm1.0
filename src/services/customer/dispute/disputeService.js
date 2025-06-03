'use strict';

const { sequelize } = require('@models');
const { Booking, Order, Ride, User, Dispute } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const rideConstants = require('@constants/common/rideConstants');
const disputeConstants = require('@constants/common/disputeConstants');

const disputeService = {
  async createDispute({ customerId, serviceId, issue, issueType, transaction }) {
    // Validate issue type
    if (!Object.values(disputeConstants.ISSUE_TYPES).includes(issueType)) {
      throw new Error('Invalid issue type');
    }

    // Validate issue length
    if (issue.length > disputeConstants.DISPUTE_SETTINGS.MAX_ISSUE_LENGTH) {
      throw new Error('Issue description too long');
    }

    // Check daily dispute limit
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
      throw new Error('Maximum disputes per day exceeded');
    }

    // Fetch customer
    const customer = await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language', 'notification_preferences'],
      transaction,
    });
    if (!customer) throw new Error('Customer not found');

    let serviceType, reference;

    // Check Booking (mtables)
    let service = await Booking.findByPk(serviceId, { transaction });
    if (service) {
      serviceType = 'mtables';
      reference = service.reference;
      if (service.customer_id !== customerId) {
        throw new Error('Unauthorized dispute');
      }
    } else {
      // Check Order (munch)
      service = await Order.findByPk(serviceId, { transaction });
      if (service) {
        serviceType = 'munch';
        reference = service.order_number;
        if (service.customer_id !== customerId) {
          throw new Error('Unauthorized dispute');
        }
      } else {
        // Check Ride (mtxi)
        service = await Ride.findByPk(serviceId, { transaction });
        if (service) {
          serviceType = 'mtxi';
          reference = service.id.toString();
          if (service.customerId !== customerId) {
            throw new Error('Unauthorized dispute');
          }
        } else {
          throw new Error('Service not found');
        }
      }
    }

    // Create dispute
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
  },

  async trackDisputeStatus({ disputeId, customerId }) {
    const dispute = await Dispute.findByPk(disputeId, {
      attributes: ['id', 'status', 'service_type', 'issue', 'issue_type', 'resolution'],
      include: [{ model: User, as: 'customer', attributes: ['id'] }],
    });

    if (!dispute) throw new Error('Dispute not found');
    if (dispute.customer_id !== customerId) {
      throw new Error('Unauthorized dispute');
    }

    return {
      id: dispute.id,
      status: dispute.status,
      serviceType: dispute.service_type,
      issue: dispute.issue,
      issueType: dispute.issue_type,
      resolution: dispute.resolution,
    };
  },

  async resolveDispute({ disputeId, resolution, resolutionType, transaction }) {
    // Validate resolution type
    if (!Object.values(disputeConstants.RESOLUTION_TYPES).includes(resolutionType)) {
      throw new Error('Invalid resolution type');
    }

    const dispute = await Dispute.findByPk(disputeId, {
      include: [{ model: User, as: 'customer', attributes: ['id', 'preferred_language', 'notification_preferences'] }],
      transaction,
    });
    if (!dispute) throw new Error('Dispute not found');
    if (
      dispute.status === disputeConstants.DISPUTE_STATUSES.RESOLVED ||
      dispute.status === disputeConstants.DISPUTE_STATUSES.CLOSED
    ) {
      throw new Error('Dispute already resolved');
    }

    // Update dispute
    await dispute.update(
      {
        status: disputeConstants.DISPUTE_STATUSES.RESOLVED,
        resolution,
        resolution_type: resolutionType,
      },
      { transaction }
    );

    return { dispute };
  },
};

module.exports = disputeService;