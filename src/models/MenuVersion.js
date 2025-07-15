'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuVersion extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch', constraints: false });
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    }
  }

  MenuVersion.init({
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
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchant_branches', key: 'id' }
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    menu_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Snapshot of menu items, categories, modifiers, attributes'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
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
    modelName: 'MenuVersion',
    tableName: 'menu_versions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['merchant_id'] },
      { fields: ['branch_id'] },
      { fields: ['version_number'] }
    ]
  });

  return MenuVersion;
};