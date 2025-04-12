'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class admin extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  admin.init(
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
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'User ID is required' },
          isInt: { msg: 'User ID must be an integer' },
        },
      },
      permissions: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          can_manage_users: true,
          can_view_reports: true,
          can_update_settings: true,
        },
        comment: 'admin-specific permissions',
      },
      last_activity_at: {
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
      modelName: 'admin',
      tableName: 'admins',
      underscored: true,
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id'],
          name: 'admins_user_id_unique',
        },
      ],
    }
  );

  return admin;
};