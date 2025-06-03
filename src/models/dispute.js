// src/models/Dispute.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Dispute extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.Booking, { foreignKey: 'service_id', as: 'booking', constraints: false });
      this.belongsTo(models.Order, { foreignKey: 'service_id', as: 'order', constraints: false });
      this.belongsTo(models.Ride, { foreignKey: 'service_id', as: 'ride', constraints: false });
      this.hasMany(models.Notification, { foreignKey: 'dispute_id', as: 'notifications' });
    }
  }

  Dispute.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_type: {
        type: DataTypes.ENUM('mtables', 'munch', 'mtxi'),
        allowNull: false,
      },
      issue: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: { msg: 'Issue description is required' } },
      },
      issue_type: {
        type: DataTypes.ENUM(
          'service_quality',
          'payment',
          'cancellation',
          'safety',
          'other'
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'in_review', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      resolution: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolution_type: {
        type: DataTypes.ENUM('refund', 'compensation', 'apology', 'no_action'),
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Dispute',
      tableName: 'disputes',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['customer_id'] },
        { fields: ['service_id', 'service_type'] },
        { fields: ['status'] },
      ],
    }
  );

  return Dispute;
};