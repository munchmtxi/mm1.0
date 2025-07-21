'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductAuditLog extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, { foreignKey: 'menu_item_id', as: 'menuItem' });
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  ProductAuditLog.init({
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        async serviceSpecificAction(value) {
          const item = await sequelize.models.MenuInventory.findByPk(this.menu_item_id);
          if (!item) throw new Error('Invalid menu_item_id');
          const prefix = item.service_type;
          if (!value.startsWith(prefix)) {
            throw new Error(`Action must start with service type prefix: ${prefix}`);
          }
        }
      }
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'ProductAuditLog',
    tableName: 'product_audit_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['menu_item_id'] },
      { fields: ['user_id'] }
    ]
  });

  return ProductAuditLog;
};