'use strict';
const { Model } = require('sequelize');
const driverConstants = require('@constants/driverConstants');

module.exports = (sequelize, DataTypes) => {
  class DriverSupportTicket extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      this.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'ride' });
      this.belongsTo(models.Order, { foreignKey: 'delivery_order_id', as: 'deliveryOrder' });
      this.belongsTo(models.Staff, { foreignKey: 'assigned_staff_id', as: 'assignedStaff' });
    }
  }

  DriverSupportTicket.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ride_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'rides', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ticket_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      service_type: {
        type: DataTypes.ENUM('mtxi', 'munch'),
        allowNull: false,
        validate: {
          isIn: {
            args: [driverConstants.SUPPORT_CONSTANTS.SERVICE_TYPES],
            msg: 'Invalid service type',
          },
        },
      },
      issue_type: {
        type: DataTypes.ENUM(
          'PAYMENT_ISSUE',
          'SERVICE_QUALITY',
          'CANCELLATION',
          'DELIVERY_ISSUE',
          'ORDER_ISSUE',
          'OTHER'
        ),
        allowNull: false,
        validate: {
          isIn: {
            args: [driverConstants.SUPPORT_CONSTANTS.ISSUE_TYPES],
            msg: 'Invalid issue type',
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Description is required' },
          len: { args: [10, 1000], msg: 'Description must be between 10 and 1000 characters' },
        },
      },
      status: {
        type: DataTypes.ENUM('open', 'in_progress', 'escalated', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium',
      },
      resolution_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DriverSupportTicket',
      tableName: 'driver_support_tickets',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['driver_id'] },
        { fields: ['ride_id'] },
        { fields: ['delivery_order_id'] },
        { fields: ['assigned_staff_id'] },
        { fields: ['ticket_number'], unique: true },
        { fields: ['service_type'] },
        { fields: ['status'] },
      ],
      validate: {
        oneServiceReference() {
          const refs = [this.ride_id, this.delivery_order_id].filter((id) => id != null).length;
          if (refs > 1) {
            throw new Error('Ticket must be associated with only one of ride or delivery order.');
          }
        },
        serviceTypeMatchesReference() {
          if (this.ride_id && this.service_type !== 'mtxi') {
            throw new Error('ride_id requires service_type to be mtxi');
          }
          if (this.delivery_order_id && this.service_type !== 'munch') {
            throw new Error('delivery_order_id requires service_type to be munch');
          }
        },
      },
    }
  );

  return DriverSupportTicket;
};