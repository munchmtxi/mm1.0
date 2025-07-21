'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Route extends Model {
    static associate(models) {
      this.hasMany(models.Order, { foreignKey: 'route_id', as: 'orders' });
      this.hasMany(models.Driver, { foreignKey: 'active_route_id', as: 'drivers' });
      this.belongsTo(models.Ride, { foreignKey: 'rideId', as: 'ride' });
    }
  }
  Route.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      origin: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      destination: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      waypoints: {
        type: DataTypes.JSONB,
        allowNull: true,
        validate: {
          maxWaypoints(value) {
            if (value && value.length > 7) {
              throw new Error('Maximum waypoints exceeded (7)');
            }
          },
        },
      },
      distance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      duration: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      polyline: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      steps: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      trafficModel: {
        type: DataTypes.ENUM('best_guess', 'optimistic', 'pessimistic', 'historical'),
        allowNull: true,
      },
      rideId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'rides', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'ride_id',
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
      modelName: 'Route',
      tableName: 'routes',
      underscored: true,
      indexes: [{ fields: ['origin', 'destination'] }],
      scopes: {
        active: {
          where: sequelize.literal(`"routes"."created_at" >= NOW() - INTERVAL '24 hours'`),
        },
      },
    }
  );
  return Route;
};