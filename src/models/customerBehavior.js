'use strict';

const { Model, DataTypes } = require('sequelize');

/**
 * CustomerBehavior Model
 * Tracks customer interaction patterns across various services.
 * Last Updated: July 20, 2025
 */
module.exports = (sequelize) => {
  class CustomerBehavior extends Model {
    static associate(models) {
      CustomerBehavior.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
      });
      CustomerBehavior.hasMany(models.Booking, {
        foreignKey: 'customer_id',
        as: 'bookings',
      });
      CustomerBehavior.hasMany(models.InDiningOrder, {
        foreignKey: 'customer_id',
        as: 'inDiningOrders',
      });
      CustomerBehavior.hasMany(models.ParkingBooking, {
        foreignKey: 'customer_id',
        as: 'parkingBookings',
      });
      CustomerBehavior.hasMany(models.Ride, {
        foreignKey: 'customer_id',
        as: 'rides',
      });
      CustomerBehavior.hasMany(models.RoomBooking, {
        foreignKey: 'booked_by',
        as: 'roomBookings',
      });
      CustomerBehavior.hasMany(models.TicketBooking, {
        foreignKey: 'booked_by',
        as: 'ticketBookings',
      });
      CustomerBehavior.hasMany(models.Review, {
        foreignKey: 'customer_id',
        as: 'reviews',
      });
    }
  }

  CustomerBehavior.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      bookingFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Booking frequency cannot be negative' },
        },
      },
      orderFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Order frequency cannot be negative' },
        },
      },
      rideFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Ride frequency cannot be negative' },
        },
      },
      parkingBookingFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Parking booking frequency cannot be negative' },
        },
      },
      roomBookingFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Room booking frequency cannot be negative' },
        },
      },
      ticketBookingFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Ticket booking frequency cannot be negative' },
        },
      },
      reviewFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Review frequency cannot be negative' },
        },
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
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
      modelName: 'CustomerBehavior',
      tableName: 'customer_behaviors',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { unique: true, fields: ['user_id'] },
      ],
    }
  );

  return CustomerBehavior;
};