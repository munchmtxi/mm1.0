'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Dispute extends Model {
    static associate(models) {
      Dispute.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
      Dispute.belongsTo(models.Booking, { foreignKey: 'service_id', constraints: false, as: 'booking' });
      Dispute.belongsTo(models.Order, { foreignKey: 'service_id', constraints: false, as: 'order' });
      Dispute.belongsTo(models.Ride, { foreignKey: 'service_id', constraints: false, as: 'ride' });
      Dispute.belongsTo(models.ParkingBooking, { foreignKey: 'service_id', constraints: false, as: 'parking_booking' });
      Dispute.belongsTo(models.InDiningOrder, { foreignKey: 'service_id', constraints: false, as: 'in_dining_order' });
      Dispute.belongsTo(models.TicketBooking, { foreignKey: 'service_id', constraints: false, as: 'ticket_booking' });
      Dispute.belongsTo(models.RoomBooking, { foreignKey: 'service_id', constraints: false, as: 'room_booking' });
      Dispute.belongsTo(models.Event, { foreignKey: 'service_id', constraints: false, as: 'event' });
    }
  }

  Dispute.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_type: {
        type: DataTypes.ENUM(
          'booking',
          'order',
          'ride',
          'parking',
          'in_dining',
          'ticket_booking',
          'room_booking',
          'event'
        ),
        allowNull: false,
      },
      issue: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          len: {
            args: [1, 500],
            msg: 'Issue must be between 1 and 500 characters',
          },
        },
      },
      issue_type: {
        type: DataTypes.ENUM('BOOKING', 'PAYMENT', 'SERVICE_QUALITY', 'PARKING', 'DINING', 'STAY', 'TICKET', 'OTHER'),
        allowNull: false,
      },
      priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
        allowNull: false,
        defaultValue: 'LOW',
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'RESOLVED', 'CLOSED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      resolution: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          len: {
            args: [0, 500],
            msg: 'Resolution must be up to 500 characters',
          },
        },
      },
      resolution_type: {
        type: DataTypes.ENUM('REFUND', 'COMPENSATION', 'APOLOGY', 'NO_ACTION', 'ACCOUNT_CREDIT', 'REPLACEMENT', 'ROOM_UPGRADE', 'TICKET_UPGRADE'),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Dispute',
      tableName: 'disputes',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate: async (dispute, options) => {
          const disputeCount = await sequelize.models.Dispute.count({
            where: {
              customer_id: dispute.customer_id,
              created_at: {
                [sequelize.Op.gte]: sequelize.literal("CURRENT_DATE"),
              },
            },
            transaction: options.transaction,
          });
          if (disputeCount >= 3) {
            throw new Error('Max disputes per day exceeded');
          }
        },
      },
    }
  );

  return Dispute;
};