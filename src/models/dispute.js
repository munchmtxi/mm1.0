// src/models/Dispute.js
'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Dispute extends Model {
    static associate(models) {
      Dispute.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
      Dispute.belongsTo(models.Booking, { foreignKey: 'service_id', constraints: false });
      Dispute.belongsTo(models.Order, { foreignKey: 'service_id', constraints: false });
      Dispute.belongsTo(models.Ride, { foreignKey: 'service_id', constraints: false });
      Dispute.belongsTo(models.ParkingBooking, { foreignKey: 'service_id', as: 'parking_booking', constraints: false });
      Dispute.belongsTo(models.InDiningOrder, { foreignKey: 'service_id', constraints: false });
    }
  }

  Dispute.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_type: {
        type: DataTypes.ENUM('mtables', 'munch', 'mtxi', 'mpark', 'in_dining'),
        allowNull: false,
      },
      issue: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      issue_type: {
        type: DataTypes.ENUM('BOOKING', 'PAYMENT', 'SERVICE_QUALITY', 'PARKING', 'DINING', 'OTHER'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'RESOLVED', 'CLOSED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      resolution: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      resolution_type: {
        type: DataTypes.ENUM('REFUND', 'COMPENSATION', 'APOLOGY', 'NO_ACTION', 'ACCOUNT_CREDIT', 'REPLACEMENT'),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Dispute',
      tableName: 'disputes',
      timestamps: true,
      underscored: true,
    }
  );

  return Dispute;
};