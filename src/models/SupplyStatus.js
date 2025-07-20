'use strict';
const { Model } = require('sequelize');
const { getCurrentTimestamp } = require('@utils/dateTimeUtils');

module.exports = (sequelize, DataTypes) => {
  class SupplyStatus extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.belongsTo(models.Staff, { foreignKey: 'checked_by', as: 'checker' });
    }
  }

  SupplyStatus.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('ready', 'pending', 'insufficient'),
        allowNull: false,
        defaultValue: 'pending',
      },
      checked_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      checked_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional details about the supply status',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      modelName: 'SupplyStatus',
      tableName: 'supply_statuses',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['branch_id'] },
        { fields: ['checked_by'] },
        { fields: ['status'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return SupplyStatus;
};