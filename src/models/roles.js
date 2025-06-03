'use strict';
const { Model, DataTypes } = require('sequelize');
const authConstants = require('@constants/common/authConstants');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const adminEngagementConstants = require('@constants/admin/adminEngagementConstants');

module.exports = (sequelize) => {
  class Role extends Model {
    static associate(models) {
      // One-to-many with Users
      this.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
      // One-to-many with Permissions (general)
      if (models.Permission) {
        this.hasMany(models.Permission, { foreignKey: 'role_id', as: 'permissions' });
      }
      // One-to-many with Admins (admin-specific)
      if (models.admin) {
        this.hasMany(models.admin, { foreignKey: 'role_id', as: 'admins' });
      }
      // One-to-many with BranchRole
      this.hasMany(models.BranchRole, { foreignKey: 'role_id', as: 'branchRoles' });
    }

    // Utility to fetch permission names
    getPermissions() {
      return this.permissions ? this.permissions.map((perm) => perm.name) : [];
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
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          isIn: {
            args: [['merchant', 'staff', 'admin', 'customer', 'driver']],
            msg: 'Invalid role',
          },
        },
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      // New role attribute to match roleActionConfig keys
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['admin', 'customer', 'driver', 'staff']], // Match roleActionConfig keys
        },
      },
      // New action attribute with full role-based validation
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [
            Object.values(adminEngagementConstants.GAMIFICATION_CONSTANTS.ADMIN_ACTIONS)
              .concat(
                Object.values(adminEngagementConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS)
              )
              .concat(
                Object.values(adminEngagementConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS)
              )
              .concat(
                Object.values(adminEngagementConstants.GAMIFICATION_CONSTANTS.STAFF_ACTIONS)
              )
              .map((a) => a.action),
          ],
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        typedefaultValue: DataTypes.NOW,
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
      timestamps: true,
      indexes: [
        { unique: true, fields: ['name'], name: 'roles_name_unique' },
      ],
    }
  );

  return Role;
};