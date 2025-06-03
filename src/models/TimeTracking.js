'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TimeTracking extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      this.belongsTo(models.Shift, { foreignKey: 'shift_id', as: 'shift' });
    }
  }

  TimeTracking.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      shift_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'shifts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      clock_in: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      clock_out: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isAfterClockIn(value) {
            if (value && new Date(value) <= new Date(this.clock_in)) {
              throw new Error('Clock-out time must be after clock-in time');
            }
          },
        },
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duration in minutes',
        validate: {
          isPositive(value) {
            if (value && value <= 0) {
              throw new Error('Duration must be positive');
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
    },
    {
      sequelize,
      modelName: 'TimeTracking',
      tableName: 'time_trackings',
      underscored: true,
      indexes: [
        { fields: ['staff_id'] },
        { fields: ['shift_id'] },
        { fields: ['clock_in', 'clock_out'] },
      ],
      hooks: {
        beforeUpdate: (record) => {
          if (record.clock_out && record.clock_in) {
            record.duration = Math.round((new Date(record.clock_out) - new Date(record.clock_in)) / (1000 * 60));
          }
        },
      },
    }
  );

  return TimeTracking;
};