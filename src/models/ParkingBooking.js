'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ParkingBooking extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.ParkingSpace, { foreignKey: 'space_id', as: 'space' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.hasOne(models.Payment, { foreignKey: 'booking_id', as: 'payment' });
      this.hasMany(models.Review, { foreignKey: 'service_id', as: 'reviews', constraints: false, scope: { service_type: 'parking_booking' } });
    }
  }

  ParkingBooking.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' },
    },
    space_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'parking_spaces', key: 'id' },
    },
    booking_type: {
      type: DataTypes.ENUM(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'EVENT']),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(['PENDING', 'CONFIRMED', 'OCCUPIED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    check_in_method: {
      type: DataTypes.ENUM(['QR_CODE', 'LICENSE_PLATE', 'MANUAL', 'NFC']),
      allowNull: false,
    },
    vehicle_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'License plate, vehicle type, etc.',
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
  }, {
    sequelize,
    modelName: 'ParkingBooking',
    tableName: 'parking_bookings',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['merchant_id'] },
      { fields: ['space_id'] },
      { fields: ['status'] },
      { fields: ['start_time'] },
    ],
  });

  return ParkingBooking;
};