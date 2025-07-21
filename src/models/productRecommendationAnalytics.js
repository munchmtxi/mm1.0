'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductRecommendationAnalytics extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MenuInventory, { foreignKey: 'product_id', as: 'product' });
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer', optional: true });
      this.belongsTo(models.MenuInventory, { foreignKey: 'source_product_id', as: 'sourceProduct', optional: true });
    }
  }

  ProductRecommendationAnalytics.init({
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
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'menu_inventories', key: 'id' }
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'customers', key: 'id' }
    },
    recommendation_type: {
      type: DataTypes.ENUM('trending', 'cross-sell', 'personalized', 'seasonal', 'upsell', 'event_based'),
      allowNull: false,
      validate: {
        async serviceSpecificType(value) {
          const product = await sequelize.models.MenuInventory.findByPk(this.product_id);
          if (!product) throw new Error('Invalid product_id');
          const validTypes = {
            munch: ['trending', 'cross-sell', 'personalized', 'seasonal', 'upsell'],
            mpark: ['trending', 'seasonal', 'event_based'],
            mstays: ['trending', 'cross-sell', 'seasonal', 'upsell'],
            mtables: ['trending', 'cross-sell', 'seasonal'],
            mtickets: ['trending', 'personalized', 'event_based']
          };
          if (!validTypes[product.service_type].includes(value)) {
            throw new Error(`Invalid recommendation type for ${product.service_type}: ${value}`);
          }
        }
      }
    },
    event_type: {
      type: DataTypes.ENUM('impression', 'click', 'add-to-cart', 'purchase', 'view', 'share'),
      allowNull: false
    },
    source_product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'menu_inventories', key: 'id' },
      validate: {
        async isValidSource(value) {
          if (value && this.recommendation_type === 'cross-sell') {
            const source = await sequelize.models.MenuInventory.findByPk(value);
            if (!source) throw new Error('Invalid source_product_id');
          }
        }
      }
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 }
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    device_type: {
      type: DataTypes.ENUM('mobile', 'desktop', 'tablet', 'other'),
      allowNull: true
    },
    platform: {
      type: DataTypes.ENUM('web', 'ios', 'android', 'pos'),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        validMetadata(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Metadata must be a valid JSON object');
          }
        }
      }
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
    modelName: 'ProductRecommendationAnalytics',
    tableName: 'product_recommendation_analytics',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['merchant_id'] },
      { fields: ['product_id'] },
      { fields: ['customer_id'] },
      { fields: ['recommendation_type'] },
      { fields: ['event_type'] },
      { fields: ['created_at'] },
      { fields: ['session_id'] }
    ]
  });

  return ProductRecommendationAnalytics;
};