'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchStaffRole extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff'
      });
      
      this.belongsTo(models.BranchRole, {
        foreignKey: 'role_id',
        as: 'role'
      });

      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });

      this.belongsTo(models.User, {
        foreignKey: 'assigned_by',
        as: 'assignedBy'
      });

      this.hasMany(models.BranchPermission, {
        foreignKey: 'staff_role_id',
        as: 'permissions'
      });
    }
  }

  BranchStaffRole.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branch_roles',
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
    assigned_by: {
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
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true
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
    modelName: 'BranchStaffRole',
    tableName: 'branch_staff_roles',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['staff_id', 'branch_id', 'role_id', 'is_active']
      },
      {
        fields: ['valid_from', 'valid_until']
      },
      {
        fields: ['assigned_by']
      }
    ],
    hooks: {
      beforeCreate: async (staffRole) => {
        const existingRole = await BranchStaffRole.findOne({
          where: {
            staff_id: staffRole.staff_id,
            branch_id: staffRole.branch_id,
            is_active: true
          }
        });

        if (existingRole) {
          await existingRole.update({ 
            is_active: false,
            valid_until: new Date()
          });
        }
      }
    }
  });

  return BranchStaffRole;
};