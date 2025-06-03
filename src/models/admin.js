'use strict';
const { Model, DataTypes } = require('sequelize');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const { validatePhoneNumber } = require('@validators/phoneValidator'); // Make sure this import exists

module.exports = (sequelize) => {
  class admin extends Model {
    static associate(models) {
      // One-to-one with User
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      // Many-to-one with Role
      this.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
      // One-to-many with adminPermissions
      this.hasMany(models.adminPermissions, { foreignKey: 'admin_id', as: 'permissions' });
      // One-to-one with adminAccessibility
      this.hasOne(models.adminAccessibility, { foreignKey: 'admin_id', as: 'accessibility' });
      // One-to-many with Backup
      this.hasMany(models.Backup, { foreignKey: 'admin_id', as: 'backups' });
    }
  }

  admin.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'User ID is required' },
          isInt: { msg: 'User ID must be an integer' },
        },
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
        },
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isPhoneNumber: validatePhoneNumber, // Reuse User’s phone validation
        },
      },
      country_code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: adminCoreConstants.ADMIN_SETTINGS.DEFAULT_CURRENCY,
        validate: { isIn: [adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_CURRENCIES] },
      },
      language_code: {
        type: DataTypes.STRING(2),
        allowNull: false,
        defaultValue: adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
        validate: { isIn: [adminCoreConstants.ADMIN_SETTINGS.SUPPORTED_LANGUAGES] },
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: adminCoreConstants.ADMIN_STATUSES.ACTIVE,
        validate: { isIn: [Object.values(adminCoreConstants.ADMIN_STATUSES)] },
      },
      notification_preferences: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: { email: true, push: true, sms: false },
      },
      last_activity_at: {
        type: DataTypes.DATE,
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
      modelName: 'admin',
      tableName: 'admins',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['user_id'], name: 'admins_user_id_unique' },
      ],
    }
  );

  return admin;
};
