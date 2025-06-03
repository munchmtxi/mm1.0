C'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RideCustomer extends Model {
    static associate(models) {
      this.belongsTo(models.Ride, { foreignKey: 'rideId' });
      this.belongsTo(models.Customer, { foreignKey: 'customerId' });
    }
  }
  RideCustomer.init(
    {
      rideId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'rides', key: 'id' },
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
      },
    },
    { sequelize, modelName: 'RideCustomer', tableName: 'ride_customers', underscored: true }
  );
  return RideCustomer;
};