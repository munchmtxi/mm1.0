'use strict';
const { Model, DataTypes } = require('sequelize');
const { STAFF_TASK_STATUSES, STAFF_TASK_TYPES } = require('@constants/staff/staffRolesConstants');

module.exports = (sequelize) => {
  class Task extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
    }
  }

  Task.init(
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
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      task_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.keys(STAFF_TASK_TYPES).flatMap(role => 
              Object.values(STAFF_TASK_TYPES[role]).flatMap(service => 
                service.map(task => task.id)
              )
            )],
            msg: 'Invalid task type',
          },
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(Object.values(STAFF_TASK_STATUSES)),
        allowNull: false,
        defaultValue: STAFF_TASK_STATUSES.ASSIGNED,
      },
      due_date: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isFuture(value) {
            if (new Date(value) <= new Date()) {
              throw new Error('Due date must be in the future');
            }
          },
        },
      },
      completed_at: {
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
    },
    {
      sequelize,
      modelName: 'Task',
      tableName: 'tasks',
      underscored: true,
      indexes: [
        { fields: ['staff_id'] },
        { fields: ['branch_id'] },
        { fields: ['status'] },
        { fields: ['due_date'] },
      ],
      hooks: {
        beforeUpdate: (task) => {
          if (task.status === STAFF_TASK_STATUSES.COMPLETED && !task.completed_at) {
            task.completed_at = new Date();
          }
        },
      },
    }
  );

  return Task;
};