'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class adminPermissions extends Model {
    static associate(models) {
      // Many-to-one with admin
      adminPermissions.belongsTo(models.admin, { foreignKey: 'admin_id', as: 'admin' });
      // Many-to-one with Permission
      adminPermissions.belongsTo(models.Permission, { foreignKey: 'permission_id', as: 'permission' });
    }
  }

  adminPermissions.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'admins',
          key: 'id',
        },
      },
      permission_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Permissions',
          key: 'id',
        },
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'adminPermissions',
      tableName: 'admin_permissions',
      timestamps: true,
      underscored: true,
    }
  );

  return adminPermissions;
};