'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchPermission extends Model {
    static associate(models) {
      this.belongsTo(models.BranchStaffRole, {
        foreignKey: 'staff_role_id',
        as: 'staffRole'
      });

      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });

      this.belongsTo(models.User, {
        foreignKey: 'granted_by',
        as: 'granter'
      });
    }
  }

  BranchPermission.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    staff_role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branch_staff_roles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    permission: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values({
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
          })],
          msg: 'Invalid permission'
        }
      }
    },
    granted_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    conditions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Optional conditions/restrictions for the permission, e.g., time-based or service-specific restrictions'
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
    modelName: 'BranchPermission',
    tableName: 'branch_permissions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['staff_role_id', 'permission', 'branch_id'],
        unique: true,
        where: {
          is_active: true
        }
      },
      {
        fields: ['branch_id', 'is_active']
      },
      {
        fields: ['granted_by']
      }
    ]
  });

  return BranchPermission;
};