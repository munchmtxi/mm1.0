'use strict';
const { Model, DataTypes } = require('sequelize');
const staffConstants = require('@constants/staff/staffSystemConstants');

module.exports = (sequelize) => {
  class Staff extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.belongsTo(models.Geofence, { foreignKey: 'geofence_id', as: 'geofence' });
      this.hasOne(models.Wallet, { foreignKey: 'staff_id', as: 'wallet' });

      this.belongsToMany(models.Permission, {
        through: models.StaffPermissions,
        foreignKey: 'staff_id',
        otherKey: 'permission_id',
        as: 'permissions',
      });
    }
  }

  Staff.init(
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
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      // NEW: Staff types array
      staff_types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Staff types are required' },
          isValidTypes(value) {
            const allowed = staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES;
            if (!Array.isArray(value) || !value.every(type => allowed.includes(type))) {
              throw new Error('One or more staff types are invalid');
            }
          },
        },
        comment: 'Multiple staff roles (e.g. ["driver", "barista"])',
      },

      certifications: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        validate: {
          isValidCertifications(value) {
            const allowed = staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS;
            if (value && !value.every(cert => allowed.includes(cert))) {
              throw new Error('Invalid certifications');
            }
          },
        },
      },

      assigned_area: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Specific area within the merchant',
      },

      work_location: {
        type: DataTypes.GEOMETRY('POINT'),
        allowNull: true,
        comment: 'Current or last known work location',
      },

      geofence_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'geofences', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      availability_status: {
        type: DataTypes.ENUM('available', 'busy', 'on_break', 'offline'),
        allowNull: false,
        defaultValue: 'offline',
      },

      performance_metrics: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Performance data (e.g., tasks completed, ratings)',
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
      modelName: 'Staff',
      tableName: 'staff',
      underscored: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ['user_id'], name: 'staff_user_id_unique' },
        { fields: ['merchant_id'], name: 'staff_merchant_id_index' },
        { fields: ['branch_id'], name: 'staff_branch_id_index' },
        { fields: ['geofence_id'], name: 'staff_geofence_id_index' },
      ],
    }
  );

  return Staff;
};
