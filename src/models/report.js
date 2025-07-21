'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'generated_by', as: 'generator' });
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      // Polymorphic associations
      this.belongsTo(models.Order, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'order' } });
      this.belongsTo(models.InDiningOrder, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'in_dining_order' } });
      this.belongsTo(models.RoomBooking, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'room_booking' } });
      this.belongsTo(models.ParkingBooking, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'parking_booking' } });
      this.belongsTo(models.Ride, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'ride' } });
      this.belongsTo(models.Event, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'event' } });
      this.belongsTo(models.Booking, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'booking' } });
    }
  }

  Report.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    report_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [[
            'orders', 'in_dining_orders', 'room_bookings', 'parking_bookings', 'rides', 'events', 'bookings',
            'sales', 'inventory', 'customer_activity', 'staff_performance', 'ticket_sales', 'event_attendance',
            'occupancy_rate', 'revenue_per_room', 'ride_performance', 'tip_history'
          ]],
          msg: 'Invalid report type',
        },
      },
    },
    service_type: {
      type: DataTypes.ENUM('munch', 'mtables', 'mpark', 'mstays', 'mtxi', 'mtickets', 'mevents'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['munch', 'mtables', 'mpark', 'mstays', 'mtxi', 'mtickets', 'mevents']],
          msg: 'Invalid service type',
        },
      },
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    generated_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'staff', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchants', key: 'id' },
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
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    entity_type: {
      type: DataTypes.ENUM('order', 'in_dining_order', 'room_booking', 'parking_booking', 'ride', 'event', 'booking'),
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
  }, {
    sequelize,
    modelName: 'Report',
    tableName: 'reports',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['generated_by'] },
      { fields: ['customer_id'] },
      { fields: ['staff_id'] },
      { fields: ['merchant_id'] },
      { fields: ['driver_id'] },
      { fields: ['entity_id', 'entity_type'] },
    ],
  });

  return Report;
};