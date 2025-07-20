'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
      this.belongsToMany(models.Role, {
        through: 'UserRoles',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });
      this.hasMany(models.Order, { foreignKey: 'customer_id', as: 'orders' });
      this.hasMany(models.Booking, { foreignKey: 'customer_id', as: 'bookings' });
      this.hasMany(models.InDiningOrder, { foreignKey: 'customer_id', as: 'inDiningOrders' });
      this.hasMany(models.ParkingBooking, { foreignKey: 'customer_id', as: 'parkingBookings' });
      this.hasMany(models.Payment, { foreignKey: 'customer_id', as: 'payments' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
      this.belongsTo(models.Address, { foreignKey: 'default_address_id', as: 'defaultAddress' });
      this.hasMany(models.Ride, { foreignKey: 'customer_id', as: 'rides' });
      this.hasMany(models.TicketBooking, { foreignKey: 'booked_by', as: 'ticketBookings' });
      this.hasMany(models.Tip, { foreignKey: 'customer_id', as: 'tips' });
      this.hasOne(models.Wallet, { foreignKey: 'user_id', as: 'wallet' });
      this.hasMany(models.RoomBooking, { foreignKey: 'booked_by', as: 'roomBookings' });
      this.hasMany(models.Event, { foreignKey: 'customer_id', as: 'events' });
    }
  }

  Customer.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'countries', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    services: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: ['mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets'],
      validate: {
        isIn: {
          args: [['mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets']],
          msg: 'Services must be one of: mtables, munch, mtxi, mevents, mpark, mstays, mtickets'
        }
      }
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPhoneNumber(value) {
          if (value) {
            const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
            try {
              const number = phoneUtil.parseAndKeepRawInput(value, 'US');
              if (!phoneUtil.isValidNumber(number)) {
                throw new Error('Invalid phone number');
              }
            } catch (error) {
              throw new Error('Invalid phone number format');
            }
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending_verification', 'suspended', 'banned'),
      defaultValue: 'pending_verification'
    },
    default_address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'addresses', key: 'id' }
    },
    preferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    underscored: true,
    paranoid: true
  });

  return Customer;
};