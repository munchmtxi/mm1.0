// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\models\OfflineCache.js
'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class OfflineCache extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
    }
  }

  OfflineCache.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      data_type: {
        type: DataTypes.ENUM('order', 'booking'),
        allowNull: false,
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: { notEmpty: { msg: 'Data is required' } },
      },
      status: {
        type: DataTypes.ENUM('pending', 'synced', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
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
    },
    {
      sequelize,
      modelName: 'OfflineCache',
      tableName: 'offline_cache',
      underscored: true,
      indexes: [
        { fields: ['merchant_id'] },
        { fields: ['branch_id'] },
        { fields: ['data_type', 'status'] },
      ],
    }
  );

  return OfflineCache;
};