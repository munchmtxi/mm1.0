'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchRole extends Model {
    static associate(models) {
      this.hasMany(models.BranchStaffRole, {
        foreignKey: 'role_id',
        as: 'staffAssignments'
      });
      
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }

    hasPermission(permission) {
      const roleConfig = require('./staff_roles').STAFF_ROLES[this.name];
      return roleConfig?.permissions.includes(permission) || this.custom_permissions?.includes(permission);
    }

    getAllPermissions() {
      const roleConfig = require('./staff_roles').STAFF_ROLES[this.name];
      return [...new Set([...(roleConfig?.permissions || []), ...(this.custom_permissions || [])])];
    }
  }

  BranchRole.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchant_branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [require('./staff_roles').STAFF_CONSTANTS.DEFAULT_ROLES],
          msg: 'Invalid role name'
        }
      }
    },
    custom_permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidPermissions(value) {
          if (!value) return;
          const allPermissions = Object.values({
            ...require('./staff_roles').STAFF_ROLES.server.permissions,
            ...require('./staff_roles').STAFF_ROLES.host.permissions,
            ...require('./staff_roles').STAFF_ROLES.chef.permissions,
            ...require('./staff_roles').STAFF_ROLES.manager.permissions,
            ...require('./staff_roles').STAFF_ROLES.butcher.permissions,
            ...require('./staff_roles').STAFF_ROLES.barista.permissions,
            ...require('./staff_roles').STAFF_ROLES.stock_clerk.permissions,
            ...require('./staff_roles').STAFF_ROLES.picker.permissions,
            ...require('./staff_roles').STAFF_ROLES.cashier.permissions,
            ...require('./staff_roles').STAFF_ROLES.driver.permissions,
            ...require('./staff_roles').STAFF_ROLES.packager.permissions,
            ...require('./staff_roles').STAFF_ROLES.event_staff.permissions,
            ...require('./staff_roles').STAFF_ROLES.consultant.permissions,
            ...require('./staff_roles').STAFF_ROLES.front_of_house.permissions,
            ...require('./staff_roles').STAFF_ROLES.back_of_house.permissions,
            ...require('./staff_roles').STAFF_ROLES.car_park_operative.permissions,
            ...require('./staff_roles').STAFF_ROLES.front_desk.permissions,
            ...require('./staff_roles').STAFF_ROLES.housekeeping.permissions,
            ...require('./staff_roles').STAFF_ROLES.concierge.permissions,
            ...require('./staff_roles').STAFF_ROLES.ticket_agent.permissions,
            ...require('./staff_roles').STAFF_ROLES.event_coordinator.permissions
          });
          const invalidPermissions = value.filter(perm => !allPermissions.includes(perm));
          if (invalidPermissions.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
          }
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'BranchRole',
    tableName: 'branch_roles',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['branch_id', 'name', 'is_active']
      },
      {
        fields: ['name']
      }
    ]
  });

  return BranchRole;
};