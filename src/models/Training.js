'use strict';
const { Model, DataTypes } = require('sequelize');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');

module.exports = (sequelize) => {
  class Training extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
    }
  }

  Training.init(
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
      category: {
        type: DataTypes.ENUM(Object.keys(staffRolesConstants.STAFF_TRAINING_CATEGORIES)),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('assigned', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'assigned',
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
      modelName: 'Training',
      tableName: 'trainings',
      underscored: true,
      indexes: [
        { fields: ['staff_id'] },
        { fields: ['category'] },
        { fields: ['status'] },
      ],
      hooks: {
        beforeUpdate: (training) => {
          if (training.status === 'completed' && !training.completed_at) {
            training.completed_at = new Date();
          }
        },
      },
    }
  );

  return Training;
};