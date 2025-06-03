'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Media extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
    }
  }

  Media.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchant_branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['menu_photos', 'promotional_media', 'branch_media', 'banner', 'promo_video']],
          msg: 'Invalid media type',
        },
      },
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Media',
    tableName: 'media',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['branch_id'] },
      { fields: ['merchant_id'] },
      { fields: ['type'] },
    ],
  });

  return Media;
};