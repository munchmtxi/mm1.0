'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TaxRecord extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
    }
  }
  TaxRecord.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    driver_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'drivers', key: 'id' } },
    period: { type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'), allowNull: false },
    taxable_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    tax_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
    country: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    sequelize,
    modelName: 'TaxRecord',
    tableName: 'tax_records',
    underscored: true,
    indexes: [{ fields: ['driver_id', 'period'] }],
  });
  return TaxRecord;
};