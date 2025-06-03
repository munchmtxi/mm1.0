// src/models/EventService.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EventService extends Model {
    static associate(models) {
      this.belongsTo(models.Event, { foreignKey: 'event_id' });
      this.belongsTo(models.Booking, { foreignKey: 'service_id', constraints: false });
      this.belongsTo(models.Order, { foreignKey: 'service_id', constraints: false });
      this.belongsTo(models.Ride, { foreignKey: 'service_id', constraints: false });
      this.belongsTo(models.InDiningOrder, { foreignKey: 'service_id', constraints: false });
    }
  }

  EventService.init(
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
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_type: {
        type: DataTypes.ENUM('mtables', 'munch', 'mtxi', 'in_dining'),
        allowNull: false,
      },
      payment_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: 'payments', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'SET NULL',
}
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
      modelName: 'EventService',
      tableName: 'event_services',
      underscored: true,
    }
  );

  return EventService;
};