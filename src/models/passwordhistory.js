'use strict';
const { Model, DataTypes } = require('sequelize');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');

module.exports = (sequelize) => {
  class PasswordHistory extends Model {
    static associate(models) {
      // Many-to-one with User
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  PasswordHistory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: adminCoreConstants.USER_MANAGEMENT_CONSTANTS.USER_TYPES.MERCHANT,
        validate: {
          isIn: {
            args: [Object.values(adminCoreConstants.USER_MANAGEMENT_CONSTANTS.USER_TYPES)],
            msg: 'Invalid user type',
          },
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Password hash is required' },
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PasswordHistory',
      tableName: 'password_histories',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        attributes: {
          exclude: ['password_hash'],
        },
      },
      indexes: [
        { fields: ['user_id'] },
      ],
    }
  );

  return PasswordHistory;
};