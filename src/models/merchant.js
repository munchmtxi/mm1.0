// Merchant.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Merchant extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.hasOne(models.MerchantSettings, { foreignKey: 'merchant_id', as: 'settings' });
      this.hasMany(models.MerchantBranch, { foreignKey: 'merchant_id', as: 'branches' });
      this.hasMany(models.Order, { foreignKey: 'merchant_id', as: 'orders' });
      this.hasMany(models.Booking, { foreignKey: 'merchant_id', as: 'bookings' });
      this.hasMany(models.ParkingBooking, { foreignKey: 'merchant_id', as: 'parkingBookings' });
      this.hasMany(models.RoomBooking, { foreignKey: 'merchant_id', as: 'roomBookings' });
      this.hasMany(models.MenuInventory, { foreignKey: 'merchant_id', as: 'menuItems' });
      this.hasMany(models.MenuVersion, { foreignKey: 'merchant_id', as: 'menuVersions' });
      this.hasMany(models.InventoryAdjustmentLog, { foreignKey: 'merchant_id', as: 'adjustmentLogs' });
      this.hasMany(models.InventoryAlert, { foreignKey: 'merchant_id', as: 'alerts' });
      this.hasMany(models.InventoryBulkUpdate, { foreignKey: 'merchant_id', as: 'bulkUpdates' });
      this.hasMany(models.ProductCategory, { foreignKey: 'merchant_id', as: 'categories' });
      this.hasMany(models.ProductDiscount, { foreignKey: 'merchant_id', as: 'discounts' });
      this.hasMany(models.Role, { foreignKey: 'merchant_id', as: 'roles' });
      this.hasMany(models.Review, { foreignKey: 'target_id', as: 'reviews', constraints: false, scope: { target_type: 'merchant' } });
      this.hasMany(models.ReviewInteraction, { foreignKey: 'interactor_id', as: 'review_interactions', constraints: false, scope: { interactor_type: 'merchant' } });
    }
  }

  Merchant.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    services: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: ['munch'],
      validate: {
        isIn: {
          args: [['mtables', 'munch', 'mevents', 'mpark', 'mstays', 'mtickets']],
          msg: 'Invalid services',
        },
      },
    },
    types: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      validate: {
        isIn: {
          args: [['bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery', 'parking_lot', 'restaurant', 'accommodation_provider', 'ticket_provider']],
          msg: 'Invalid merchant types',
        },
        notEmpty: { msg: 'At least one merchant type is required' },
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
    modelName: 'Merchant',
    tableName: 'merchants',
    underscored: true,
    paranoid: true,
    hooks: {
      beforeValidate: (merchant) => {
        const allowedServices = {
          restaurant: ['mtables', 'munch'],
          dark_kitchen: ['munch'],
          caterer: ['munch', 'mevents'],
          cafe: ['munch'],
          bakery: ['munch'],
          butcher: ['munch'],
          grocery: ['munch'],
          parking_lot: ['mpark'],
          accommodation_provider: ['mstays'],
          ticket_provider: ['mtickets', 'mevents'],
        };
        if (merchant.services && merchant.types) {
          const validServices = new Set();
          merchant.types.forEach(type => {
            if (allowedServices[type]) {
              allowedServices[type].forEach(service => validServices.add(service));
            }
          });
          merchant.services.forEach(service => {
            if (!validServices.has(service)) {
              throw new Error(`Service ${service} is not allowed for merchant types ${merchant.types.join(', ')}`);
            }
          });
        }
      },
    },
  });

  return Merchant;
};