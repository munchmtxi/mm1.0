'use strict';
const { Model } = require('sequelize');
const paymentConstants = require('@constants/paymentConstants');

module.exports = (sequelize, DataTypes) => {
  class Wallet extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.hasMany(models.WalletTransaction, { foreignKey: 'wallet_id', as: 'transactions' });
    }
  }

  Wallet.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'staff', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: {
          args: [paymentConstants.WALLET_SETTINGS.MIN_BALANCE],
          msg: 'Balance cannot be negative',
        },
        max: {
          args: [paymentConstants.WALLET_SETTINGS.MAX_BALANCE],
          msg: 'Balance exceeds maximum limit',
        },
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: paymentConstants.WALLET_SETTINGS.DEFAULT_CURRENCY,
      validate: {
        isIn: {
          args: [paymentConstants.WALLET_SETTINGS.SUPPORTED_CURRENCIES],
          msg: 'Invalid currency',
        },
      },
    },
    type: {
      type: DataTypes.ENUM(...Object.values(paymentConstants.WALLET_SETTINGS.WALLET_TYPES)),
      allowNull: false,
      defaultValue: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.CUSTOMER,
    },
    bank_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Bank account details for withdrawals',
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Wallet',
    tableName: 'wallets',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['user_id'], name: 'wallets_user_id_unique' },
      { fields: ['staff_id'], name: 'wallets_staff_id_index' },
      { fields: ['merchant_id'], name: 'wallets_merchant_id_index' },
    ],
  });

  return Wallet;
};