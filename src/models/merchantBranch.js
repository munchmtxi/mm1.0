// MerchantBranch.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantBranch extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantSettings, { foreignKey: 'merchant_settings_id', as: 'settings', constraints: false });
      this.hasOne(models.Address, { foreignKey: 'branch_id', as: 'address' });
      this.hasMany(models.Media, { foreignKey: 'branch_id', as: 'media' });
      this.hasMany(models.BranchStaffRole, { foreignKey: 'branch_id', as: 'staffRoles' });
      this.hasMany(models.Order, { foreignKey: 'branch_id', as: 'orders' });
      this.hasMany(models.Booking, { foreignKey: 'branch_id', as: 'bookings' });
      this.hasMany(models.ParkingBooking, { foreignKey: 'branch_id', as: 'parkingBookings' });
      this.hasMany(models.RoomBooking, { foreignKey: 'branch_id', as: 'roomBookings' });
      this.hasMany(models.MenuInventory, { foreignKey: 'branch_id', as: 'menuItems' });
      this.hasMany(models.MenuVersion, { foreignKey: 'branch_id', as: 'menuVersions' });
      this.hasMany(models.InventoryAdjustmentLog, { foreignKey: 'branch_id', as: 'adjustmentLogs' });
      this.hasMany(models.InventoryAlert, { foreignKey: 'branch_id', as: 'alerts' });
      this.hasMany(models.InventoryBulkUpdate, { foreignKey: 'branch_id', as: 'bulkUpdates' });
      this.hasMany(models.ProductCategory, { foreignKey: 'branch_id', as: 'categories' });
      this.hasMany(models.Review, { foreignKey: 'target_id', as: 'reviews', constraints: false, scope: { target_type: 'branch' } });
    }
  }

  MerchantBranch.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    merchant_settings_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchant_settings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    branch_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    contact_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
    },
    geofence_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'geofences', key: 'id' },
    },
    operating_hours: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidHours(value) {
          if (value && (!value.open || !value.close)) {
            throw new Error('Operating hours must include open and close times');
          }
        },
      },
    },
    delivery_radius: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      validate: {
        maxDeliveryRadius(value) {
          if (value && value > 25) {
            throw new Error('Delivery radius cannot exceed 25 km');
          }
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    payment_methods: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        validPaymentMethods(value) {
          const allowedMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'MOBILE_MONEY', 'CRYPTO'];
          if (value && Array.isArray(value)) {
            value.forEach(method => {
              if (!allowedMethods.includes(method)) {
                throw new Error(`Invalid payment method: ${method}`);
              }
            });
          }
        },
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        isIn: {
          args: [['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN']],
          msg: 'Invalid currency',
        },
      },
    },
    preferred_language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en',
      validate: {
        isIn: {
          args: [['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti']],
          msg: 'Invalid language',
        },
      },
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
    modelName: 'MerchantBranch',
    tableName: 'merchant_branches',
    underscored: true,
    paranoid: true,
    hooks: {
      afterSave: async (branch, options) => {
        const logger = require('@utils/logger');
        if (branch.address && sequelize.models.Address) {
          await sequelize.models.Address.create({
            branch_id: branch.id,
            address: branch.address,
            location: branch.location,
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: options.transaction });
        }
        logger.info('MerchantBranch afterSave triggered', { id: branch.id });
      },
    },
  });

  return MerchantBranch;
};