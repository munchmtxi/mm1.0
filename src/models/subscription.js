'use strict';
const { Model } = require('sequelize');
const logger = require('@utils/logger'); // adjust path to your logger

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.MenuInventory, {
        foreignKey: 'menu_item_id',
        as: 'menuItem',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.hasMany(models.Order, {
        foreignKey: 'subscription_id',
        as: 'orders',
      });
    }
  }

  Subscription.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'Customer ID is required' },
        },
      },
      menu_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'menu_inventories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          async isValidMenuItem(value) {
            if (value !== null) {
              const menuItem = await sequelize.models.MenuInventory.findByPk(value);
              if (!menuItem) {
                throw new Error('Invalid menu item ID');
              }
            }
          },
        },
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          async isValidMerchant(value) {
            if (value !== null) {
              const merchant = await sequelize.models.Merchant.findByPk(value);
              if (!merchant) {
                throw new Error('Invalid merchant ID');
              }
            }
          },
        },
      },
      schedule: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
        allowNull: false,
        validate: {
          notNull: { msg: 'Schedule is required' },
          isIn: {
            args: [['daily', 'weekly', 'monthly']],
            msg: 'Invalid schedule type',
          },
        },
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: { msg: 'Start date must be a valid date' },
        },
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: { msg: 'End date must be a valid date' },
          isAfterStart(value) {
            if (value && new Date(value) <= new Date(this.start_date)) {
              throw new Error('End date must be after start date');
            }
          },
        },
      },
      status: {
        type: DataTypes.ENUM('active', 'paused', 'canceled'),
        allowNull: false,
        defaultValue: 'active',
        validate: {
          notNull: { msg: 'Status is required' },
        },
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: { args: [0], msg: 'Total amount must be positive' },
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
      type: {
        type: DataTypes.ENUM('ride_standard', 'ride_premium'),
        allowNull: false,
        validate: {
          notNull: { msg: 'Subscription type is required' },
        },
      },
    },
    {
      sequelize,
      modelName: 'Subscription',
      tableName: 'subscriptions',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['customer_id'] },
        { fields: ['menu_item_id'] },
        { fields: ['merchant_id'] },
        { fields: ['status'] },
        { fields: ['start_date', 'end_date'] },
        { fields: ['type'] },
      ],
      hooks: {
        beforeValidate: (subscription) => {
          if (subscription.end_date && new Date(subscription.end_date) <= new Date(subscription.start_date)) {
            throw new Error('End date must be after start date');
          }
          // Ensure menu_item_id is NULL for ride subscriptions
          if (['ride_standard', 'ride_premium'].includes(subscription.type) && subscription.menu_item_id !== null) {
            throw new Error('Menu item ID must be NULL for ride subscriptions');
          }
          // Ensure merchant_id is NULL for ride subscriptions
          if (['ride_standard', 'ride_premium'].includes(subscription.type) && subscription.merchant_id !== null) {
            throw new Error('Merchant ID must be NULL for ride subscriptions');
          }
        },
        beforeFind: (options) => {
          logger.info('Subscription.findAll called', { where: options.where, stack: new Error().stack });
        },
      },
    }
  );

  return Subscription;
};
