'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportTicket extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'user_id', as: 'user', constraints: false });
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'user', constraints: false });
      this.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'ride' });
      this.belongsTo(models.Order, { foreignKey: 'delivery_order_id', as: 'deliveryOrder' });
      this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
      this.belongsTo(models.InDiningOrder, { foreignKey: 'in_dining_order_id', as: 'inDiningOrder' });
      this.belongsTo(models.Staff, { foreignKey: 'assigned_role_id', as: 'assignedTo' });
    }
  }

  SupportTicket.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      in_dining_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'in_dining_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assigned_role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ticket_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      service_type: {
        type: DataTypes.ENUM('mtxi', 'munch', 'mtables'),
        allowNull: false,
      },
      issue_type: {
        type: DataTypes.ENUM(
          'PAYMENT_ISSUE',
          'SERVICE_QUALITY',
          'CANCELLATION',
          'DELIVERY_ISSUE',
          'BOOKING_ISSUE',
          'ORDER_ISSUE',
          'STAFF_ISSUE',
          'OTHER'
        ),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
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
      modelName: 'SupportTicket',
      tableName: 'support_tickets',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['driver_id'] },
        { fields: ['ride_id'] },
        { fields: ['delivery_order_id'] },
        { fields: ['booking_id'] },
        { fields: ['in_dining_order_id'] },
        { fields: ['assigned_role_id'] },
        { fields: ['ticket_number'], unique: true },
        { fields: ['service_type'] },
        { fields: ['status'] },
      ],
      validate: {
        oneUserReference() {
          if ((this.user_id && this.driver_id) || (!this.user_id && !this.driver_id)) {
            throw new Error('Ticket must be associated with exactly one of customer_id or driver_id.');
          }
        },
        oneServiceReference() {
          const refs = [
            this.ride_id,
            this.delivery_order_id,
            this.booking_id,
            this.in_dining_order_id,
          ].filter((id) => id != null).length;
          if (refs > 1) {
            throw new Error(
              'Ticket must be associated with only one of ride, delivery order, booking, or in-dining order.'
            );
          }
        },
        serviceTypeMatchesReference() {
          if (this.ride_id && this.service_type !== 'mtxi') {
            throw new Error('ride_id requires service_type to be mtxi');
          }
          if (this.delivery_order_id && this.service_type !== 'munch') {
            throw new Error('delivery_order_id requires service_type to be munch');
          }
          if (
            (this.booking_id || this.in_dining_order_id) &&
            this.service_type !== 'mtables'
          ) {
            throw new Error(
              'booking_id or in_dining_order_id requires service_type to be mtables'
            );
          }
        },
      },
    }
  );

  return SupportTicket;
};