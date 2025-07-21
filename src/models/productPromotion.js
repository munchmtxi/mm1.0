'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductPromotion extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      this.belongsToMany(models.MenuInventory, {
        through: models.PromotionMenuItem,
        foreignKey: 'promotion_id',
        otherKey: 'menu_item_id',
        as: 'promotionItems'
      });
      this.hasMany(models.PromotionRedemption, { foreignKey: 'promotion_id', as: 'redemptions' });
      this.hasMany(models.PromotionRule, { foreignKey: 'promotion_id', as: 'rules' });
    }
  }

  ProductPromotion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' }
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM(
        'percentage', 'flat', 'bogo', 'seasonal', 'early_bird', 'referral',
        'social_media', 'long_term', 'loyalty', 'event_bundle', 'group', 'promo_code'
      ),
      allowNull: false,
      validate: {
        async serviceSpecificType(value) {
          const validTypes = {
            munch: ['percentage', 'flat', 'bogo', 'seasonal', 'referral', 'social_media', 'loyalty', 'promo_code'],
            mpark: ['percentage', 'flat', 'seasonal', 'long_term'],
            mstays: ['percentage', 'flat', 'seasonal', 'long_term', 'group'],
            mtables: ['percentage', 'flat', 'seasonal', 'group'],
            mtickets: ['percentage', 'flat', 'early_bird', 'event_bundle', 'group', 'promo_code']
          };
          if (this.service_type !== 'all' && !validTypes[this.service_type].includes(value)) {
            throw new Error(`Invalid promotion type for ${this.service_type}: ${value}`);
          }
        }
      }
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        async serviceSpecificValue(value) {
          if (value == null && !['bogo', 'group'].includes(this.type)) {
            throw new Error('Value is required for non-bogo and non-group promotions');
          }
          if (this.type === 'percentage') {
            const maxDiscounts = {
              munch: 50,
              mpark: 60,
              mstays: 50,
              mtables: 50,
              mtickets: 50
            };
            if (this.service_type !== 'all' && value > maxDiscounts[this.service_type]) {
              throw new Error(`Discount percentage cannot exceed ${maxDiscounts[this.service_type]}% for ${this.service_type}`);
            }
          }
        }
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    min_purchase_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0 }
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 }
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    },
    is_flash_sale: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    customer_eligibility: {
      type: DataTypes.ENUM('all', 'new', 'returning', 'loyalty'),
      allowNull: false,
      defaultValue: 'all'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
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
    }
  }, {
    sequelize,
    modelName: 'ProductPromotion',
    tableName: 'product_promotions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['merchant_id'] },
      { fields: ['service_type'] },
      { fields: ['type'] },
      { unique: true, fields: ['code'], where: { code: { [Op.ne]: null } } },
      { fields: ['start_date', 'end_date'] },
      { fields: ['is_active'] }
    ],
    hooks: {
      beforeValidate: async (promotion) => {
        if (promotion.start_date && promotion.end_date) {
          if (new Date(promotion.start_date) > new Date(promotion.end_date)) {
            throw new Error('End date must be after start date');
          }
        }
        if (promotion.is_flash_sale && (!promotion.start_date || !promotion.end_date)) {
          throw new Error('Flash sales require start_date and end_date');
        }
        if (promotion.type === 'percentage' && promotion.value > 100) {
          promotion.value = 100;
        }
      },
      afterCreate: async (promotion, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: null, // Promotion-level audit
              user_id: promotion.created_by,
              action: `${promotion.service_type}_promotion_create`,
              changes: {
                name: promotion.name,
                type: promotion.type,
                value: promotion.value
              }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating promotion audit log:', error);
        }
      }
    }
  });

  return ProductPromotion;
};