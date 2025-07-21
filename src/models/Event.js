'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'creator' });
      this.hasMany(models.EventParticipant, { foreignKey: 'event_id', as: 'participants' });
      this.hasMany(models.EventService, { foreignKey: 'event_id', as: 'services' });
      this.hasMany(models.Notification, { foreignKey: 'event_id', as: 'notifications' });
      this.hasMany(models.TicketBooking, { foreignKey: 'event_id', as: 'ticket_bookings' });
      this.hasMany(models.Review, { foreignKey: 'service_id', as: 'reviews', constraints: false, scope: { service_type: 'event' } });
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
        references: { model: 'customers', key: 'id' },
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 150] },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: { len: [0, 2000] },
      },
      occasion: {
        type: DataTypes.ENUM([
          'BIRTHDAY', 'ANNIVERSARY', 'CORPORATE', 'SOCIAL', 'WEDDING', 'CONFERENCE',
          'BABY_SHOWER', 'GRADUATION', 'FESTIVAL', 'CHARITY', 'CONCERT', 'SPORTS', 'THEATER', 'OTHER'
        ]),
        allowNull: false,
      },
      payment_type: {
        type: DataTypes.ENUM(['SOLO', 'SPLIT', 'SPONSOR', 'CROWDFUNDED']),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(['DRAFT', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'POSTPONED']),
        allowNull: false,
        defaultValue: 'DRAFT',
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