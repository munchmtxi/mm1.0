'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductCategory extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.hasMany(models.MenuInventory, { foreignKey: 'category_id', as: 'products' });
      this.belongsTo(models.ProductCategory, { foreignKey: 'parent_id', as: 'parent' });
      this.hasMany(models.ProductCategory, { foreignKey: 'parent_id', as: 'subcategories' });
    }
  }

  ProductCategory.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' }
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchant_branches', key: 'id' }
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'product_categories', key: 'id' }
    },
    service_type: {
      type: DataTypes.ENUM('munch', 'mpark', 'mstays', 'mtables', 'mtickets'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['munch', 'mpark', 'mstays', 'mtables', 'mtickets']],
          msg: 'Service type must be one of: munch, mpark, mstays, mtables, mtickets'
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
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    icon_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProductCategory',
    tableName: 'product_categories',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['merchant_id'] },
      { fields: ['branch_id'] },
      { fields: ['parent_id'] },
      { fields: ['service_type'] },
      { fields: ['is_active'] },
      { fields: ['display_order'] }
    ],
    hooks: {
      beforeCreate: async (category, options) => {
        if (category.parent_id) {
          let parentId = category.parent_id;
          const checkedIds = new Set();
          while (parentId) {
            if (checkedIds.has(parentId)) {
              throw new Error('Circular reference detected in category hierarchy');
            }
            checkedIds.add(parentId);
            const parentCategory = await sequelize.models.ProductCategory.findByPk(parentId, {
              attributes: ['id', 'parent_id'],
              raw: true
            });
            if (!parentCategory) break;
            parentId = parentCategory.parent_id;
          }
        }
      }
    }
  });

  return ProductCategory;
};