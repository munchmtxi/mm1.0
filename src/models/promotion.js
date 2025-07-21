'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Promotion extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer', optional: true });
      this.hasMany(models.WalletTransaction, { foreignKey: 'promotion_id', as: 'transactions' });
      this.hasMany(models.PromotionRedemption, { foreignKey: 'promotion_id', as: 'redemptions' });
    }
  }

  Promotion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    service_type: {
      type: DataTypes.ENUM('munch', 'mpark', 'mstays', 'mtables', 'mtickets', 'all'),
      allowNull: false,
      defaultValue: 'all',
      validate: {
        isIn: {
          args: [['munch', 'mpark', 'mstays', 'mtables', 'mtickets', 'all']],
          msg: 'Service type must be one of: munch, mpark, mstays, mtables, mtickets, all'
        }
      }
    },
    type: {
      type: DataTypes.ENUM('DISCOUNT', 'LOYALTY', 'REFERRAL', 'CASHBACK', 'GAMIFIED', 'BUNDLE'),
      allowNull: false,
      validate: {
        async serviceSpecificType(value) {
          const validTypes = {
            munch: ['DISCOUNT', 'LOYALTY', 'REFERRAL', 'CASHBACK', 'GAMIFIED', 'BUNDLE'],
            mpark: ['DISCOUNT', 'CASHBACK'],
            mstays: ['DISCOUNT', 'LOYALTY', 'CASHBACK', 'BUNDLE'],
            mtables: ['DISCOUNT', 'CASHBACK', 'BUNDLE'],
            mtickets: ['DISCOUNT', 'REFERRAL', 'GAMIFIED', 'BUNDLE']
          };
          if (this.service_type !== 'all' && !validTypes[this.service_type].includes(value)) {
            throw new Error(`Invalid promotion type for ${this.service_type}: ${value}`);
          }
        }
      }
    },
    reward_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        async serviceSpecificAmount(value) {
          if (value == null && ['DISCOUNT', 'CASHBACK'].includes(this.type)) {
            throw new Error('reward_amount is required for DISCOUNT and CASHBACK promotions');
          }
          if (value && this.service_type !== 'all') {
            const maxAmounts = {
              munch: 50,
              mpark: 20,
              mstays: 100,
              mtables: 50,
              mtickets: 200
            };
            if (value > maxAmounts[this.service_type]) {
              throw new Error(`Reward amount cannot exceed ${maxAmounts[this.service_type]} for ${this.service_type}`);
            }
          }
        }
      }
    },
    discount_percentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
        async serviceSpecificPercentage(value) {
          if (this.type === 'DISCOUNT' && value == null) {
            throw new Error('discount_percentage is required for DISCOUNT promotions');
          }
          if (value && this.service_type !== 'all') {
            const maxDiscounts = {
              munch: 50,
              mpark: 60,
              mstays: 50,
              mtables: 50,
              mtickets: 50
            };
            if (value > maxDiscounts[this.service_type]) {
              throw new Error(`Discount percentage cannot exceed ${maxDiscounts[this.service_type]}% for ${this.service_type}`);
            }
          }
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_reusable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'REDEEMED', 'EXPIRED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isFuture(value) {
          if (new Date(value) < new Date()) {
            throw new Error('Expiry date must be in the future');
          }
        }
      }
    },
    redeemed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Promotion',
    tableName: 'promotions',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['service_type'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['expiry_date'] }
    ],
    hooks: {
      beforeValidate: (promotion) => {
        if (promotion.type === 'GAMIFIED' && !promotion.is_reusable) {
          throw new Error('GAMIFIED promotions must be reusable');
        }
      },
      afterCreate: async (promotion, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: null,
              user_id: promotion.created_by,
              action: `${promotion.service_type}_promotion_create`,
              changes: {
                type: promotion.type,
                reward_amount: promotion.reward_amount,
                discount_percentage: promotion.discount_percentage
              }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating promotion audit log:', error);
        }
      }
    }
  });

  return Promotion;
};