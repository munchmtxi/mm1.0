'use strict';
const { Model, DataTypes } = require('sequelize');
const authConstants = require('@constants/common/authConstants');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');

module.exports = (sequelize) => {
  class Permission extends Model {
    static associate(models) {
      // General role-based permissions
      this.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
      // Staff permissions through join table
      if (models.StaffPermissions && models.Staff) {
        this.belongsToMany(models.Staff, {
          through: models.StaffPermissions,
          foreignKey: 'permission_id',
          otherKey: 'staff_id',
          as: 'staff',
        });
      }
      // Admin-specific permissions
      if (models.adminPermissions) {
        this.hasMany(models.adminPermissions, { foreignKey: 'permission_id', as: 'adminPermissions' });
      }
      // Branch-specific permissions
      this.hasMany(models.BranchPermission, { foreignKey: 'permission_id', as: 'branchPermissions' });
    }
  }

  Permission.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      // Role association for general permissions
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          isInt: { msg: 'Role ID must be an integer' },
        },
      },
      // Permission name
      name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        validate: {
          isIn: {
            args: [['manage_merchant', ...Object.values(adminCoreConstants.ADMIN_PERMISSIONS)]],
            msg: 'Invalid permission',
          },
        },
      },
      // General permission action/resource
      action: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'Action is required for general permissions' },
        },
      },
      resource: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'Resource is required for general permissions' },
        },
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Permission',
      tableName: 'permissions',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [
        // Unique constraints for general permissions
        { unique: true, fields: ['role_id', 'action', 'resource'], name: 'unique_role_action_resource' },
        // Unique constraint for permission names
        { unique: true, fields: ['name'], name: 'permissions_name_unique' },
      ],
    }
  );

  return Permission;
};