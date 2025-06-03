// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\models\tip.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tip extends Model {
    static associate(models) {
      this.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'ride' });
      this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
      this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
      this.belongsTo(models.EventService, { foreignKey: 'event_service_id', as: 'event_service' });
      this.belongsTo(models.InDiningOrder, { foreignKey: 'in_dining_order_id', as: 'in_dining_order' });
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.User, { foreignKey: 'recipient_id', as: 'recipient' }); // Changed to User for Staff/Driver
      this.belongsTo(models.Wallet, { foreignKey: 'wallet_id', as: 'wallet' });
    }
  }

  Tip.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    ride_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rides', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'orders', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bookings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    event_service_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'event_services', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    in_dining_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'in_dining_orders', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }, // References User (Staff or Driver)
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    wallet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'wallets', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MWK', // Changed to MWK per Order/InDiningOrder default
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
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
  }, {
    sequelize,
    modelName: 'Tip',
    tableName: 'tips',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['ride_id'] },
      { fields: ['order_id'] },
      { fields: ['booking_id'] },
      { fields: ['event_service_id'] },
      { fields: ['in_dining_order_id'] },
      { fields: ['customer_id'] },
      { fields: ['recipient_id'] },
      { fields: ['wallet_id'] },
    ],
    validate: {
      singleService() {
        const services = [this.ride_id, this.order_id, this.booking_id, this.event_service_id, this.in_dining_order_id];
        const definedServices = services.filter(id => id !== null && id !== undefined);
        if (definedServices.length !== 1) {
          throw new Error('Tip must be associated with exactly one service (ride, order, booking, event_service, or in_dining_order).');
        }
      },
    },
  });

  return Tip;
};