'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductDiscount extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, { foreignKey: 'menu_item_id', as: 'menuItem' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    }
  }

  ProductDiscount.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'menu_inventories', key: 'id' }
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' }
    },
    type: {
      type: DataTypes.ENUM(
        'percentage', 'flat', 'bogo', 'seasonal', 'early_bird', 'referral', 'social_media',
        'long_term', 'loyalty', 'event_bundle', 'group', 'promo_code'
      ),
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        async serviceSpecificValue(value) {
          const item = await sequelize.models.MenuInventory.findByPk(this.menu_item_id);
          if (!item) throw new Error('Invalid menu_item_id');
          if (this.type === 'percentage') {
            const maxDiscounts = {
              munch: 50,
              mpark: 60,
              mstays: 50,
              mtables: 50,
              mtickets: 50
            };
            if (value > maxDiscounts[item.service_type]) {
              throw new Error(`Discount percentage cannot exceed ${maxDiscounts[item.service_type]}% for ${item.service_type}`);
            }
          }
        }
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 }
    },
    max_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 }
    },
    min_order_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 }
    },
    customer_type: {
      type: DataTypes.ENUM('all', 'new', 'returning', 'loyalty'),
      allowNull: false,
      defaultValue: 'all'
    },
    coupon_code: {
      type: DataTypes.STRING,
      allowNull: true
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
    modelName: 'ProductDiscount',
    tableName: 'product_discounts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['menu_item_id'] },
      { fields: ['merchant_id'] },
      { fields: ['type'] },
      { fields: ['start_date', 'end_date'] },
      { fields: ['is_active'] }
    ],
    hooks: {
      beforeValidate: (discount) => {
        if (discount.start_date && discount.end_date) {
          if (new Date(discount.start_date) > new Date(discount.end_date)) {
            throw new Error('End date must be after start date');
          }
        }
        if (discount.min_quantity !== null && discount.max_quantity !== null) {
          if (discount.min_quantity > discount.max_quantity) {
            throw new Error('Maximum quantity must be greater than or equal to minimum quantity');
          }
        }
      },
      afterCreate: async (discount, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: discount.menu_item_id,
              user_id: discount.created_by,
              action: 'discount_create',
              changes: {
                name: discount.name,
                type: discount.type,
                value: discount.value
              }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating discount audit log:', error);
        }
      },
      afterUpdate: async (discount, options) => {
        try {
          if (options.transaction && discount.changed && discount.changed() && sequelize.models.ProductAuditLog) {
            const changedFields = {};
            discount.changed().forEach(field => {
              changedFields[field] = discount[field];
            });
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: discount.menu_item_id,
              user_id: discount.created_by,
              action: 'discount_update',
              changes: changedFields
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating discount update audit log:', error);
        }
      }
    }
  });

  return ProductDiscount;
};