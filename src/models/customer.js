'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsToMany(models.Role, {
        through: 'UserRole',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles',
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
      this.hasMany(models.Review, { foreignKey: 'customer_id', as: 'reviews' });
    }
  }

  Customer.init(
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
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      services: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: ['mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets'],
        validate: {
          isIn: {
            args: [['mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets']],
            msg: 'Invalid services',
          },
        },
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'pending_verification', 'suspended', 'banned'),
        defaultValue: 'pending_verification',
      },
      default_address_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'addresses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      preferences: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        validate: {
          isValidPreferences(value) {
            if (value && value.dietary_preferences) {
              const allowed = ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'];
              value.dietary_preferences.forEach(pref => {
                if (!allowed.includes(pref)) {
                  throw new Error('Invalid dietary preferences');
                }
              });
            }
          },
        },
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
      modelName: 'Customer',
      tableName: 'customers',
      underscored: true,
      paranoid: true,
      validate: {
        maxActiveRides() {
          if (this.rides && this.rides.length > 3) {
            throw new Error('Maximum active rides per customer cannot exceed 3');
          }
        },
      },
    }
  );

  return Customer;
};