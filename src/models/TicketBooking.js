'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TicketBooking extends Model {
    static associate(models) {
      this.belongsTo(models.Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
      this.belongsTo(models.User, { foreignKey: 'booked_by', as: 'booker' });
      this.belongsTo(models.Event, { foreignKey: 'event_id', as: 'event' });
    }
  }

  TicketBooking.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ticket_id: { type: DataTypes.INTEGER, allowNull: false },
    event_id: { type: DataTypes.INTEGER, allowNull: true },
    booked_by: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'USED', 'CANCELLED', 'NO_SHOW'),
      defaultValue: 'PENDING',
    },
    booking_type: {
      type: DataTypes.ENUM('SINGLE', 'GROUP', 'SEASON_PASS', 'VIP'),
      defaultValue: 'SINGLE',
    },
    entry_method: {
      type: DataTypes.ENUM('MOBILE_APP', 'QR_CODE', 'NFC', 'MANUAL'),
      allowNull: true,
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: {
      type: DataTypes.ENUM('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'),
      defaultValue: 'USD',
    },
    scheduled_at: { type: DataTypes.DATE, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'TicketBooking',
    tableName: 'ticket_bookings',
    underscored: true,
    paranoid: true,
  });

  return TicketBooking;
};