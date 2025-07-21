'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionRule extends Model {
    static associate(models) {
      this.belongsTo(models.ProductPromotion, { foreignKey: 'promotion_id', as: 'promotion' });
    }
  }

  PromotionRule.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'product_promotions', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    rule_type: {
      type: DataTypes.ENUM('product_quantity', 'category', 'customer_type', 'time_based', 'loyalty_points', 'service_type'),
      allowNull: false
    },
    conditions: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        async validateConditions(value) {
          const promotion = await sequelize.models.ProductPromotion.findByPk(this.promotion_id);
          if (!promotion) throw new Error('Invalid promotion_id');
          if (this.rule_type === 'service_type' && !['munch', 'mpark', 'mstays', 'mtables', 'mtickets'].includes(value.service_type)) {
            throw new Error('Invalid service_type in conditions');
          }
          if (this.rule_type === 'product_quantity' && (!value.quantity || value.quantity < 1)) {
            throw new Error('product_quantity rule requires a valid quantity');
          }
          if (this.rule_type === 'category') {
            const category = await sequelize.models.ProductCategory.findByPk(value.category_id);
            if (!category) throw new Error('Invalid category_id in conditions');
          }
        }
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 }
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
    modelName: 'PromotionRule',
    tableName: 'promotion_rules',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['promotion_id'] },
      { fields: ['rule_type'] }
    ]
  });

  return PromotionRule;
};