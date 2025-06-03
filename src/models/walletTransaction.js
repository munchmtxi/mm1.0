'use strict';

const { Model, DataTypes } = require('sequelize');
const paymentConstants = require('@constants/common/paymentConstants');

/**
 * WalletTransaction Model
 * Represents a transaction record for a customer's wallet, including deposits, withdrawals,
 * payments, and gamification rewards. Integrates with the Wallet model for relational data.
 * Last Updated: May 18, 2025
 */
module.exports = (sequelize) => {
  class WalletTransaction extends Model {
    static associate(models) {
      // Define association with Wallet model
      WalletTransaction.belongsTo(models.Wallet, {
        foreignKey: 'wallet_id',
        as: 'wallet',
        onDelete: 'CASCADE',
      });
    }
  }

  WalletTransaction.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      wallet_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Wallets',
          key: 'id',
        },
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.values(paymentConstants.TRANSACTION_TYPES)],
            msg: 'Invalid transaction type',
          },
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Amount must be positive',
          },
        },
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        validate: {
          isIn: {
            args: [[paymentConstants.CURRENCY_TYPES.USD]], // Add other currencies as needed
            msg: 'Invalid currency',
          },
        },
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: paymentConstants.TRANSACTION_STATUSES.PENDING,
        validate: {
          isIn: {
            args: [Object.values(paymentConstants.TRANSACTION_STATUSES)],
            msg: 'Invalid transaction status',
          },
        },
      },
      payment_method_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Optional for gamification rewards or wallet transfers
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true, // Used for gamification reward descriptions
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
      modelName: 'WalletTransaction',
      tableName: 'WalletTransactions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          fields: ['wallet_id'],
        },
        {
          fields: ['type'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['created_at'],
        },
      ],
    }
  );

  return WalletTransaction;
};