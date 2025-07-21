'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RideCustomer extends Model {
    static associate(models) {
      this.belongsTo(models.Ride, { foreignKey: 'rideId', as: 'ride' });
      this.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
    }
  }
  RideCustomer.init(
    {
      rideId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'rides', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at',
      },
    },
    {
      sequelize,
      modelName: 'RideCustomer',
      tableName: 'ride_customers',
      underscored: true,
    }
  );
  return RideCustomer;
};