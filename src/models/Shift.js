'use strict';
const { Model, DataTypes } = require('sequelize');
const staffConstants = require('@constants/staff/staffSystemConstants');

module.exports = (sequelize) => {
  class Shift extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff', nullable: true });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch', nullable: true });
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver', nullable: true });
    }
  }

  Shift.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isAfterStart(value) {
            if (new Date(value) <= new Date(this.start_time)) {
              throw new Error('End time must be after start time');
            }
          },
        },
      },
      shift_type: {
        type: DataTypes.ENUM(Object.values(staffConstants.STAFF_SHIFT_SETTINGS.SHIFT_TYPES)),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
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
      modelName: 'Shift',
      tableName: 'shifts',
      underscored: true,
      indexes: [
        { fields: ['staff_id'] },
        { fields: ['driver_id'] },
        { fields: ['branch_id'] },
        { fields: ['start_time', 'end_time'] },
      ],
      validate: {
        async checkShiftConstraints() {
          if (!this.staff_id && !this.driver_id) {
            throw new Error('Either staff_id or driver_id must be provided');
          }
          if (this.staff_id && this.driver_id) {
            throw new Error('Cannot assign both staff_id and driver_id');
          }
          if (this.driver_id && this.branch_id) {
            throw new Error('Driver shifts cannot be tied to a branch');
          }

          const durationHours = (new Date(this.end_time) - new Date(this.start_time)) / (1000 * 60 * 60);
          if (durationHours < staffConstants.STAFF_SHIFT_SETTINGS.MIN_SHIFT_HOURS) {
            throw new Error(`Shift duration must be at least ${staffConstants.STAFF_SHIFT_SETTINGS.MIN_SHIFT_HOURS} hours`);
          }
          if (durationHours > staffConstants.STAFF_SHIFT_SETTINGS.MAX_SHIFT_HOURS) {
            throw new Error(`Shift duration cannot exceed ${staffConstants.STAFF_SHIFT_SETTINGS.MAX_SHIFT_HOURS} hours`);
          }

          const weekStart = new Date(this.start_time);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weeklyShifts = await Shift.count({
            where: {
              [sequelize.Op.or]: [
                { staff_id: this.staff_id || null },
                { driver_id: this.driver_id || null },
              ],
              start_time: { [sequelize.Op.between]: [weekStart, weekEnd] },
              status: { [sequelize.Op.ne]: 'cancelled' },
            },
          });

          if (weeklyShifts >= staffConstants.STAFF_SHIFT_SETTINGS.MAX_SHIFTS_PER_WEEK) {
            throw new Error(`Cannot exceed ${staffConstants.STAFF_SHIFT_SETTINGS.MAX_SHIFTS_PER_WEEK} shifts per week`);
          }
        },
      },
    }
  );

  return Shift;
};