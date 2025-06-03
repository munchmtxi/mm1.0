// src/models/EventParticipant.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EventParticipant extends Model {
    static associate(models) {
      this.belongsTo(models.Event, { foreignKey: 'event_id' });
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'participant' });
    }
  }

  EventParticipant.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      event_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'events', key: 'id' },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      status: {
        type: DataTypes.ENUM('invited', 'accepted', 'declined'),
        allowNull: false,
        defaultValue: 'invited',
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
      modelName: 'EventParticipant',
      tableName: 'event_participants',
      underscored: true,
    }
  );

  return EventParticipant;
};