'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      this.hasMany(models.User, {
        foreignKey: 'role_id',
        as: 'users',
      });
      this.hasMany(models.Permission, {
        foreignKey: 'role_id',
        as: 'permissions',
      });
    }

    // Return an array of { action, resource } objects
    getPermissions() {
      return this.permissions.map(permission => ({
        action: permission.action,
        resource: permission.resource,
      }));
    }
  }

  Role.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Role name is required' },
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Role',
      tableName: 'roles',
      underscored: true,
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['name'],
          name: 'roles_name_unique',
        },
      ],
    }
  );

  return Role;
};