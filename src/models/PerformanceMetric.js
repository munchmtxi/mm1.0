'use strict';
const { Model, DataTypes } = require('sequelize');
const staffSystemConstants = require('@constants/staff/staffSystemConstants');

module.exports = (sequelize) => {
  class PerformanceMetric extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
    }
  }

  PerformanceMetric.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      metric_type: {
        type: DataTypes.ENUM(Object.values(staffSystemConstants.STAFF_ANALYTICS_CONSTANTS.METRICS)),
        allowNull: false,
      },
      value: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: { min: 0 },
      },
      recorded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
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
      modelName: 'PerformanceMetric',
      tableName: 'performance_metrics',
      underscored: true,
      indexes: [
        { fields: ['staff_id'] },
        { fields: ['metric_type'] },
        { fields: ['recorded_at'] },
      ],
    }
  );

  return PerformanceMetric;
};