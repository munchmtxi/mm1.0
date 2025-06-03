'use strict';
const { Model, DataTypes } = require('sequelize');
const driverConstants = require('@constants/driverConstants');

module.exports = (sequelize) => {
  class DriverPerformanceMetric extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
    }
  }

  DriverPerformanceMetric.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      metric_type: {
        type: DataTypes.ENUM(Object.values(driverConstants.ANALYTICS_CONSTANTS.METRICS)),
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
      modelName: 'DriverPerformanceMetric',
      tableName: 'driver_performance_metrics',
      underscored: true,
      indexes: [
        { fields: ['driver_id'] },
        { fields: ['metric_type'] },
        { fields: ['recorded_at'] },
      ],
    }
  );

  return DriverPerformanceMetric;
};