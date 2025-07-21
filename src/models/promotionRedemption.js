'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionRedemption extends Model {
    static associate(models) {
      this.belongsTo(models.ProductPromotion, { foreignKey: 'promotion_id', as: 'productPromotion', optional: true });
      this.belongsTo(models.Promotion, { foreignKey: 'promotion_id', as: 'promotion', optional: true });
      this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
    }
  }

  PromotionRedemption.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'promotions', // References both product_promotions and promotions
        key: 'id'
      }
    },
    promotion_type: {
      type: DataTypes.ENUM('product_promotion', 'general_promotion'),
      allowNull: false,
      validate: {
        async validatePromotionType() {
          const isProductPromotion = await sequelize.models.ProductPromotion.findByPk(this.promotion_id);
          const isGeneralPromotion = await sequelize.models.Promotion.findByPk(this.promotion_id);
          if (isProductPromotion && this.promotion_type !== 'product_promotion') {
            throw new Error('promotion_type must be product_promotion for ProductPromotion ID');
          }
          if (isGeneralPromotion && this.promotion_type !== 'general_promotion') {
            throw new Error('promotion_type must be general_promotion for Promotion ID');
          }
          if (!isProductPromotion && !isGeneralPromotion) {
            throw new Error('Invalid promotion_id');
          }
        }
      }
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' }
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' }
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        async serviceSpecificAmount() {
          const order = await sequelize.models.Order.findByPk(this.order_id, {
            include: [{ model: sequelize.models.OrderItem, as: 'orderItems' }]
          });
          if (!order || !order.orderItems.length) throw new Error('Invalid order_id');
          const serviceType = order.orderItems[0].menuItem?.service_type;
          if (serviceType) {
            const maxDiscounts = {
              munch: 50,
              mpark: 20,
              mstays: 100,
              mtables: 50,
              mtickets: 200
            };
            if (this.discount_amount > maxDiscounts[serviceType]) {
              throw new Error(`Discount amount cannot exceed ${maxDiscounts[serviceType]} for ${serviceType}`);
            }
          }
        }
      }
    },
    promotion_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    redeemed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
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
    modelName: 'PromotionRedemption',
    tableName: 'promotion_redemptions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['promotion_id'] },
      { fields: ['order_id'] },
      { fields: ['customer_id'] },
      { fields: ['promotion_type'] },
      { fields: ['redeemed_at'] }
    ],
    hooks: {
      afterCreate: async (redemption, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            const promotion = redemption.promotion_type === 'product_promotion'
              ? await sequelize.models.ProductPromotion.findByPk(redemption.promotion_id)
              : await sequelize.models.Promotion.findByPk(redemption.promotion_id);
            if (promotion) {
              await sequelize.models.ProductAuditLog.create({
                menu_item_id: null,
                user_id: redemption.customer_id,
                action: `${promotion.service_type}_promotion_redeemed`,
                changes: {
                  promotion_id: redemption.promotion_id,
                  discount_amount: redemption.discount_amount,
                  promotion_type: redemption.promotion_type
                }
              }, { transaction: options.transaction });
            }
          }
        } catch (error) {
          console.error('Error creating redemption audit log:', error);
        }
      }
    }
  });

  return PromotionRedemption;
};