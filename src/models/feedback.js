'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Feedback extends Model {
    static associate(models) {
      // Reference Customer
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      // Reference Staff (optional)
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      // Reference Driver (optional)
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      // Reference Event (optional)
      this.belongsTo(models.Event, { foreignKey: 'event_id', as: 'event' });
      // Polymorphic associations for services
      this.belongsTo(models.Order, { foreignKey: 'service_id', as: 'order', constraints: false });
      this.belongsTo(models.InDiningOrder, { foreignKey: 'service_id', as: 'inDiningOrder', constraints: false });
      this.belongsTo(models.Booking, { foreignKey: 'service_id', as: 'booking', constraints: false });
      this.belongsTo(models.Ride, { foreignKey: 'service_id', as: 'ride', constraints: false });
      this.belongsTo(models.ParkingBooking, { foreignKey: 'service_id', as: 'parkingBooking', constraints: false });
      this.belongsTo(models.RoomBooking, { foreignKey: 'service_id', as: 'roomBooking', constraints: false });
    }
  }

  Feedback.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      event_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'events', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      service_type: {
        type: DataTypes.ENUM(['munch', 'mtables', 'mtxi', 'mpark', 'mstays', 'mtickets']), // From SERVICE_INTEGRATIONS
        allowNull: true,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: { len: [0, 1000] },
      },
      is_positive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      modelName: 'Feedback',
      tableName: 'feedback',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['customer_id'] },
        { fields: ['staff_id'] },
        { fields: ['driver_id'] },
        { fields: ['event_id'] },
        { fields: ['service_id', 'service_type'] },
      ],
      validate: {
        atLeastOneService() {
          if (
            !this.event_id &&
            (!this.service_id || !this.service_type)
          ) {
            throw new Error('Feedback must be associated with an event or a service (order, in_dining_order, booking, ride, parking_booking, room_booking).');
          }
        },
      },
    }
  );

  return Feedback;
};