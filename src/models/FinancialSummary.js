'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FinancialSummary extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
      this.belongsTo(models.Wallet, { foreignKey: 'wallet_id', as: 'wallet' });
      this.belongsTo(models.Payment, { foreignKey: 'payment_id', as: 'payment' });
    }
  }
  FinancialSummary.init({
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true, 
      allowNull: false 
    },
    user_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      references: { model: 'roles', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    wallet_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      references: { model: 'wallets', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    payment_id: { 
      type: DataTypes.INTEGER, 
      allowNull: true, 
      references: { model: 'payments', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    period: { 
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'), 
      allowNull: false 
    },
    transaction_type: { 
      type: DataTypes.ENUM(
        'deposit', 'ride_payment', 'order_payment', 'event_payment', 'parking_payment', 
        'booking_payment', 'refund', 'withdrawal', 'tip', 'social_bill_split', 
        'ride_earning', 'delivery_earning', 'payout', 'bonus', 
        'salary_payment', 'bonus_payment', 'stay_earnings', 'ticket_earnings'
      ), 
      allowNull: false 
    },
    total_earnings: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false, 
      defaultValue: 0 
    },
    total_payouts: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false, 
      defaultValue: 0 
    },
    total_taxes: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false, 
      defaultValue: 0 
    },
    transaction_count: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    },
    refund_rate: { 
      type: DataTypes.DECIMAL(5, 2), 
      allowNull: false, 
      defaultValue: 0 
    },
    currency: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      defaultValue: 'USD' 
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
    modelName: 'FinancialSummary',
    tableName: 'financial_summaries',
    underscored: true,
    indexes: [
      { fields: ['user_id', 'role_id', 'wallet_id', 'payment_id', 'period', 'transaction_type'] },
      { fields: ['role_id', 'period'] },
      { fields: ['wallet_id', 'transaction_type'] },
      { fields: ['payment_id'], where: { payment_id: { [sequelize.Op.ne]: null } } }
    ]
  });
  return FinancialSummary;
};