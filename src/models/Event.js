// src/models/Event.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'customer_id', as: 'creator' });
      this.hasMany(models.EventParticipant, { foreignKey: 'event_id', as: 'participants' });
      this.hasMany(models.EventService, { foreignKey: 'event_id', as: 'services' });
      this.hasMany(models.Notification, { foreignKey: 'event_id', as: 'notifications' });
    }
  }

  Event.init(
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
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      occasion: {
        type: DataTypes.ENUM('corporate', 'pleasure', 'travel', 'other'),
        allowNull: false,
      },
      payment_type: {
        type: DataTypes.ENUM('solo', 'split'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'confirmed', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
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
      modelName: 'Event',
      tableName: 'events',
      underscored: true,
      paranoid: true,
      indexes: [{ fields: ['customer_id', 'status'] }],
    }
  );

  return Event;
};