'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Staff extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
      this.belongsToMany(models.Role, {
        through: 'UserRoles',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });
      this.hasMany(models.Order, { foreignKey: 'staff_id', as: 'orders' });
      this.hasMany(models.Booking, { foreignKey: 'assigned_staff_id', as: 'bookings' });
      this.hasMany(models.InDiningOrder, { foreignKey: 'staff_id', as: 'inDiningOrders' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
    }
  }

  Staff.init({
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
    staff_type: {
      type: DataTypes.ENUM(
        'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
        'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
        'back_of_house', 'car_park_operative', 'front_desk', 'housekeeping', 'concierge',
        'ticket_agent', 'event_coordinator'
      ),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending_onboarding', 'suspended', 'terminated'),
      defaultValue: 'pending_onboarding'
    },
    certifications: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
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
    modelName: 'Staff',
    tableName: 'staff',
    underscored: true,
    paranoid: true,
    hooks: {
      beforeValidate: (staff, options) => {
        const allowedServices = {
          server: ['mtables', 'munch'],
          host: ['mtables', 'munch'],
          chef: ['mtables', 'munch', 'mevents'],
          manager: ['mtables', 'munch', 'mevents', 'mpark', 'mstays', 'mtickets'],
          butcher: ['munch'],
          barista: ['munch'],
          stock_clerk: ['munch'],
          picker: ['munch'],
          cashier: ['munch', 'mstays', 'mtickets'],
          driver: ['munch', 'mevents'],
          packager: ['munch'],
          event_staff: ['mevents', 'munch', 'mstays', 'mtickets'],
          consultant: ['mevents', 'mstays', 'mtickets'],
          front_of_house: ['mtables', 'munch', 'mevents', 'mpark', 'mstays', 'mtickets'],
          back_of_house: ['mtables', 'munch', 'mevents', 'mpark', 'mstays', 'mtickets'],
          car_park_operative: ['mpark'],
          front_desk: ['mstays'],
          housekeeping: ['mstays'],
          concierge: ['mstays'],
          ticket_agent: ['mtickets'],
          event_coordinator: ['mtickets', 'mevents']
        };
        if (staff.services && staff.staff_type) {
          const validServices = allowedServices[staff.staff_type] || [];
          staff.services.forEach(service => {
            if (!validServices.includes(service)) {
              throw new Error(`Service ${service} is not allowed for staff type ${staff.staff_type}`);
            }
          });
        }
      }
    }
  });

  return Staff;
};