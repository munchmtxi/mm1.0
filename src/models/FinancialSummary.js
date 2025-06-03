'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FinancialSummary extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
    }
  }
  FinancialSummary.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    driver_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'drivers', key: 'id' } },
    period: { type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'), allowNull: false },
    total_earnings: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total_payouts: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total_taxes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    sequelize,
    modelName: 'FinancialSummary',
    tableName: 'financial_summaries',
    underscored: true,
    indexes: [{ fields: ['driver_id', 'period'] }],
  });
  return FinancialSummary;
};