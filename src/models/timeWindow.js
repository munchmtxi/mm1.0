'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TimeWindow extends Model {
    static associate(models) {
      // Define associations if needed.
    }
  }
  TimeWindow.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    interval: {
      type: DataTypes.STRING,
      allowNull: false
    },
    estimates: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    averageDuration: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    trafficConditions: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    optimalWindow: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TimeWindow',
    tableName: 'time_windows',
    underscored: true,
    indexes: [
      { name: 'idx_interval', fields: ['interval'] },
      { name: 'idx_optimal_window', fields: ['optimal_window'] }
    ]
  });
  return TimeWindow;
};
