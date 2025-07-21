'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductActivityLog extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, { foreignKey: 'productId', as: 'product' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'merchantBranchId', as: 'branch' });
      this.belongsTo(models.User, { foreignKey: 'actorId', as: 'actor' });
      this.belongsTo(models.OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
    }
  }

  ProductActivityLog.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'menu_inventories', key: 'id' }
    },
    merchantBranchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchant_branches', key: 'id' }
    },
    orderItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'order_items', key: 'id' }
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    actorType: {
      type: DataTypes.ENUM('merchant', 'staff', 'customer', 'system', 'admin'),
      allowNull: false
    },
    actionType: {
      type: DataTypes.ENUM(
        'created', 'updated', 'deleted', 'price_changed', 'description_updated',
        'stock_adjusted', 'added_to_cart', 'viewed', 'reviewed', 'rollback'
      ),
      allowNull: false
    },
    previousState: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    newState: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'ProductActivityLog',
    tableName: 'product_activity_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['productId'] },
      { fields: ['merchantBranchId'] },
      { fields: ['orderItemId'] },
      { fields: ['actorId', 'actorType'] },
      { fields: ['actionType'] },
      { fields: ['timestamp'] },
      { fields: ['version'] }
    ]
  });

  return ProductActivityLog;
};