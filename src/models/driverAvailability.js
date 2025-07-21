'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DriverAvailability extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
    }
  }

  DriverAvailability.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Date is required' },
          isDate: { msg: 'Must be a valid date' },
        },
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: { notEmpty: { msg: 'Start time is required' } },
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'End time is required' },
          isAfterStart(value) {
            if (value && this.start_time && value <= this.start_time) {
              throw new Error('End time must be after start time');
            }
          },
          shiftDuration() {
            if (this.start_time && this.end_time) {
              const start = new Date(`1970-01-01T${this.start_time}Z`);
              const end = new Date(`1970-01-01T${this.end_time}Z`);
              const hours = (end - start) / 1000 / 60 / 60;
              if (hours < 2) {
                throw new Error('Shift must be at least 2 hours');
              }
              if (hours > 14) {
                throw new Error('Shift cannot exceed 14 hours');
              }
            }
          },
        },
      },
      status: {
        type: DataTypes.ENUM('available', 'busy', 'offline'),
        allowNull: false,
        defaultValue: 'available',
        validate: {
          isIn: {
            args: [['available', 'busy', 'offline']],
            msg: 'Status must be one of available, busy, offline',
          },
        },
      },
      isOnline: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastUpdated: {
        type: DataTypes.DATE,
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
    },
    {
      sequelize,
      modelName: 'DriverAvailability',
      tableName: 'driver_availability',
      underscored: true,
      paranoid: true,
    }
  );

  return DriverAvailability;
};