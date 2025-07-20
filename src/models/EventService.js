'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EventService extends Model {
    static associate(models) {
      this.belongsTo(models.Event, { foreignKey: 'event_id' });
      this.belongsTo(models.Booking, { foreignKey: 'service_id', constraints: false }); // mtables
      this.belongsTo(models.Order, { foreignKey: 'service_id', constraints: false }); // munch
      this.belongsTo(models.Ride, { foreignKey: 'service_id', constraints: false }); // mtxi
      this.belongsTo(models.InDiningOrder, { foreignKey: 'service_id', constraints: false }); // mtables
      this.belongsTo(models.ParkingBooking, { foreignKey: 'service_id', constraints: false }); // mpark
      this.belongsTo(models.TicketBooking, { foreignKey: 'service_id', constraints: false }); // mtickets
      this.belongsTo(models.RoomBooking, { foreignKey: 'service_id', constraints: false }); // mstays
      this.belongsTo(models.Payment, { foreignKey: 'payment_id', as: 'payment' });
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
        type: DataTypes.ENUM(['mtables', 'munch', 'mtxi', 'in_dining', 'mpark', 'mtickets', 'mstays']), // SERVICE_INTEGRATIONS from meventsConstants
        allowNull: false,
      },
      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'payments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      modelName: 'EventService',
      tableName: 'event_services',
      underscored: true,
    }
  );

  return EventService;
};