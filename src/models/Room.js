'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.hasMany(models.RoomBooking, { foreignKey: 'room_id', as: 'bookings' });
      this.hasMany(models.Message, { foreignKey: 'room_id', as: 'messages' });
      this.belongsToMany(models.User, {
        through: models.RoomParticipant,
        foreignKey: 'room_id',
        otherKey: 'user_id',
        as: 'participants',
      });
    }
  }

  Room.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: true },
    type: {
      type: DataTypes.ENUM('STANDARD', 'SUITE', 'APARTMENT', 'VILLA', 'HOSTEL', 'ECO_LODGE', 'LUXURY', 'FAMILY', 'ACCESSIBLE'),
      allowNull: false,
      defaultValue: 'STANDARD',
    },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'CLEANING'),
      defaultValue: 'AVAILABLE',
    },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: {
      type: DataTypes.ENUM('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'),
      defaultValue: 'USD',
    },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    merchant_id: { type: DataTypes.INTEGER, allowNull: true },
    amenities: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    security_features: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    access_type: {
      type: DataTypes.ENUM('KEYCARD', 'SMART_LOCK', 'MOBILE_APP', 'MANUAL', 'NFC'),
      allowNull: true,
    },
    bed_type: { type: DataTypes.STRING, allowNull: true },
    size_sqft: { type: DataTypes.INTEGER, allowNull: true },
    view_type: { type: DataTypes.STRING, allowNull: true },
    sustainability_certifications: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    accessibility_features: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Room',
    tableName: 'rooms',
    underscored: true,
    paranoid: true,
  });

  return Room;
};