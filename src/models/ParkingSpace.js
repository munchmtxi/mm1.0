'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ParkingSpace extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.hasMany(models.ParkingBooking, { foreignKey: 'space_id', as: 'bookings' });
    }
  }

  ParkingSpace.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' },
    },
    space_type: {
      type: DataTypes.ENUM(['STANDARD', 'ACCESSIBLE', 'EV_CHARGING', 'OVERSIZED', 'PREMIUM', 'PRIVATE', 'MOTORBIKE']),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']),
      allowNull: false,
      defaultValue: 'AVAILABLE',
    },
    security_features: {
      type: DataTypes.ARRAY(DataTypes.ENUM(['CCTV', 'GUARDED', 'GATED', 'LIGHTING', 'PATROLLED', 'BIOMETRIC', 'NONE'])),
      allowNull: true,
    },
    access_type: {
      type: DataTypes.ENUM(['KEYPAD', 'TICKET', 'APP', 'MANUAL', 'LICENSE_PLATE', 'NFC']),
      allowNull: false,
    },
    egress_type: {
      type: DataTypes.ENUM(['AUTOMATIC', 'MANUAL', 'OPEN']),
      allowNull: false,
    },
    dimensions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Width, length, height restrictions',
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Geographic coordinates or lot-specific location',
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
    modelName: 'ParkingSpace',
    tableName: 'parking_spaces',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['merchant_id'] },
      { fields: ['space_type'] },
      { fields: ['status'] },
    ],
  });

  return ParkingSpace;
};