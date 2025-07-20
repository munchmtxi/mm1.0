'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Merchant extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
      this.belongsToMany(models.Role, {
        through: 'UserRoles',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });
      this.hasMany(models.MerchantBranch, { foreignKey: 'merchant_id', as: 'branches' });
      this.hasMany(models.Order, { foreignKey: 'merchant_id', as: 'orders' });
      this.hasMany(models.Booking, { foreignKey: 'merchant_id', as: 'bookings' });
      this.hasMany(models.ParkingBooking, { foreignKey: 'merchant_id', as: 'parkingBookings' });
      this.hasMany(models.RoomBooking, { foreignKey: 'merchant_id', as: 'roomBookings' });
    }
  }

  Merchant.init({
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
      defaultValue: ['mtables', 'munch', 'mevents', 'mpark', 'mstays', 'mtickets'],
      validate: {
        isIn: {
          args: [['mtables', 'munch', 'mevents', 'mpark', 'mstays', 'mtickets']],
          msg: 'Services must be one of: mtables, munch, mevents, mpark, mstays, mtickets'
        }
      }
    },
    type: {
      type: DataTypes.ENUM(
        'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery',
        'parking_lot', 'restaurant', 'accommodation_provider', 'ticket_provider'
      ),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
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
    modelName: 'Merchant',
    tableName: 'merchants',
    underscored: true,
    paranoid: true,
    hooks: {
      beforeValidate: (merchant, options) => {
        const allowedServices = {
          restaurant: ['mtables', 'munch'],
          dark_kitchen: ['munch'],
          caterer: ['munch', 'mevents'],
          cafe: ['munch'],
          bakery: ['munch'],
          butcher: ['munch'],
          grocery: ['munch'],
          parking_lot: ['mpark'],
          accommodation_provider: ['mstays'],
          ticket_provider: ['mtickets', 'mevents']
        };
        if (merchant.services && merchant.type) {
          const validServices = allowedServices[merchant.type] || [];
          merchant.services.forEach(service => {
            if (!validServices.includes(service)) {
              throw new Error(`Service ${service} is not allowed for merchant type ${merchant.type}`);
            }
          });
        }
      }
    }
  });

  return Merchant;
};