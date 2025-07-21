'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RouteOptimization extends Model {
    static associate(models) {
      this.hasMany(models.Ride, { foreignKey: 'routeOptimizationId', as: 'rides' });
    }
  }
  RouteOptimization.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      totalDistance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      totalDuration: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      optimizedOrder: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      polyline: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      driverLocation: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      deliveryIds: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
      },
      trafficModel: {
        type: DataTypes.ENUM('best_guess', 'optimistic', 'pessimistic', 'historical'),
        allowNull: true,
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
      modelName: 'RouteOptimization',
      tableName: 'route_optimizations',
      underscored: true,
      indexes: [{ fields: ['created_at'] }],
    }
  );
  return RouteOptimization;
};