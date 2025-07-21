'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionMenuItem extends Model {
    static associate(models) {
      this.belongsTo(models.ProductPromotion, { foreignKey: 'promotion_id', as: 'promotion' });
      this.belongsTo(models.MenuInventory, { foreignKey: 'menu_item_id', as: 'menuItem' });
    }
  }

  PromotionMenuItem.init({
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'product_promotions', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'menu_inventories', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
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
    modelName: 'PromotionMenuItem',
    tableName: 'promotion_menu_items',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['promotion_id'] },
      { fields: ['menu_item_id'] }
    ],
    hooks: {
      beforeCreate: async (item) => {
        const promotion = await sequelize.models.ProductPromotion.findByPk(item.promotion_id);
        const menuItem = await sequelize.models.MenuInventory.findByPk(item.menu_item_id);
        if (!promotion || !menuItem) {
          throw new Error('Invalid promotion_id or menu_item_id');
        }
        if (promotion.service_type !== 'all' && promotion.service_type !== menuItem.service_type) {
          throw new Error(`Menu item service_type (${menuItem.service_type}) must match promotion service_type (${promotion.service_type})`);
        }
      }
    }
  });

  return PromotionMenuItem;
};