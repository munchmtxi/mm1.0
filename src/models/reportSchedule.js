'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReportSchedule extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
    }

    calculateNextRunDate() {
      const now = new Date();
      switch (this.frequency) {
        case 'daily': return new Date(now.setDate(now.getDate() + 1));
        case 'weekly': return new Date(now.setDate(now.getDate() + 7));
        case 'monthly': return new Date(now.setMonth(now.getMonth() + 1));
        case 'quarterly': return new Date(now.setMonth(now.getMonth() + 3));
        default: return new Date(now.setDate(now.getDate() + 1));
      }
    }

    validateScheduleConfig() {
      const validReportTypes = [
        'orders', 'in_dining_orders', 'room_bookings', 'parking_bookings', 'rides', 'events', 'bookings',
        'sales', 'inventory', 'customer_activity', 'staff_performance', 'ticket_sales', 'event_attendance',
        'occupancy_rate', 'revenue_per_room', 'ride_performance', 'tip_history'
      ];
      const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
      const validServiceTypes = ['munch', 'mtables', 'mpark', 'mstays', 'mtxi', 'mtickets', 'mevents'];

      if (!validReportTypes.includes(this.report_type)) throw new Error('Invalid report type');
      if (!validFrequencies.includes(this.frequency)) throw new Error('Invalid frequency');
      if (!validServiceTypes.includes(this.service_type)) throw new Error('Invalid service type');
      if (this.filters) {
        try {
          JSON.parse(this.filters);
        } catch (error) {
          throw new Error('Invalid filters format');
        }
      }
    }
  }

  ReportSchedule.init({
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
    frequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly'),
      allowNull: false,
    },
    filters: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidJSON(value) {
          if (value) {
            try {
              JSON.parse(value);
            } catch (error) {
              throw new Error('Invalid JSON format for filters');
            }
          }
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: { msg: 'Invalid email format' } },
    },
    next_run_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: { msg: 'Invalid date format for next run' },
        isFuture(value) {
          if (value <= new Date()) throw new Error('Next run date must be in the future');
        },
      },
    },
    last_run_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'active',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
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
    error_log: {
      type: DataTypes.TEXT,
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
    modelName: 'ReportSchedule',
    tableName: 'report_schedules',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['customer_id'] },
      { fields: ['staff_id'] },
      { fields: ['merchant_id'] },
      { fields: ['driver_id'] },
      { fields: ['next_run_at'] },
      { fields: ['status'] },
    ],
    hooks: {
      beforeValidate: async (schedule) => {
        if (!schedule.next_run_at) {
          schedule.next_run_at = schedule.calculateNextRunDate();
        }
      },
      beforeCreate: async (schedule) => {
        schedule.validateScheduleConfig();
      },
      beforeUpdate: async (schedule) => {
        if (schedule.changed('frequency')) {
          schedule.next_run_at = schedule.calculateNextRunDate();
        }
        schedule.validateScheduleConfig();
      },
    },
  });

  return ReportSchedule;
};