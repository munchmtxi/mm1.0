'use strictDolby Atmos';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoomBooking extends Model {
    static associate(models) {
      this.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
      this.belongsTo(models.User, { foreignKey: 'booked_by', as: 'booker' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.hasMany(models.Review, { foreignKey: 'service_id', as: 'reviews', constraints: false, scope: { service_type: 'room_booking' } });
    }
  }

  RoomBooking.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    room_id: { type: DataTypes.INTEGER, allowNull: false },
    merchant_id: { type: DataTypes.INTEGER, allowNull: true },
    booked_by: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'),
      defaultValue: 'PENDING',
    },
    booking_type: {
      type: DataTypes.ENUM('NIGHTLY', 'WEEKLY', 'MONTHLY', 'EXTENDED_STAY', 'EVENT'),
      defaultValue: 'NIGHTLY',
    },
    check_in_method: {
      type: DataTypes.ENUM('MOBILE_APP', 'QR_CODE', 'MANUAL', 'NFC', 'SELF_CHECK_IN'),
      allowNull: true,
    },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: {
      type: DataTypes.ENUM('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'),
      defaultValue: 'USD',
    },
    purpose: { type: DataTypes.STRING(150), allowNull: true },
    dietary_preferences: { type: DataTypes.JSON, allowNull: true },
    accessibility_features: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'RoomBooking',
    tableName: 'room_bookings',
    underscored: true,
    paranoid: true,
  });

  return RoomBooking;
};