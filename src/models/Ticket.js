'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ticket extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      this.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignee' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.hasMany(models.TicketBooking, { foreignKey: 'ticket_id', as: 'bookings' });
      this.hasMany(models.TicketMessage, { foreignKey: 'ticket_id', as: 'messages' });
      this.belongsTo(models.Event, { foreignKey: 'event_id', as: 'event' });
    }
  }

  Ticket.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'USED', 'CANCELLED', 'REFUNDED'),
      defaultValue: 'AVAILABLE',
    },
    type: {
      type: DataTypes.ENUM('EVENT', 'ATTRACTION', 'TRANSPORT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'TOUR', 'THEATER'),
      defaultValue: 'EVENT',
    },
    access_method: {
      type: DataTypes.ENUM('QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'PHYSICAL_TICKET', 'NFC'),
      allowNull: true,
    },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: {
      type: DataTypes.ENUM('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'),
      defaultValue: 'USD',
    },
    event_id: { type: DataTypes.INTEGER, allowNull: true },
    merchant_id: { type: DataTypes.INTEGER, allowNull: true },
    branch_id: { type: DataTypes.INTEGER, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    assigned_to: { type: DataTypes.INTEGER, allowNull: true },
    seat_number: { type: DataTypes.STRING, allowNull: true },
    entry_time: { type: DataTypes.DATE, allowNull: true },
    dietary_preferences: { type: DataTypes.JSON, allowNull: true },
    accessibility_features: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Ticket',
    tableName: 'tickets',
    underscored: true,
    paranoid: true,
  });

  return Ticket;
};