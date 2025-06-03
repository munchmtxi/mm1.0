'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payout extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      this.belongsTo(models.Wallet, { foreignKey: 'wallet_id', as: 'wallet' });
    }
  }
  Payout.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    driver_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'drivers', key: 'id' } },
    wallet_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'wallets', key: 'id' } },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
    method: { type: DataTypes.ENUM('bank_transfer', 'wallet_transfer', 'mobile_money'), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), allowNull: false, defaultValue: 'pending' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    sequelize,
    modelName: 'Payout',
    tableName: 'payouts',
    underscored: true,
  });
  return Payout;
};