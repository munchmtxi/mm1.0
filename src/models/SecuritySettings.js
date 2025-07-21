// SecuritySettings.js
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SecuritySettings extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  SecuritySettings.init(
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
      },
      user_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'customer', // From Roles.js allowed roles
        validate: {
          isIn: {
            args: [['admin', 'customer', 'merchant', 'staff', 'driver']],
            msg: 'Invalid user type',
          },
        },
      },
      two_factor_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Enable two-factor authentication',
      },
      two_factor_method: {
        type: DataTypes.ENUM('sms', 'email', 'auth_app', 'biometric', 'nfc'), // From MfaTokens.js and mticketsConstants.TICKET_CONFIG.ACCESS_METHODS
        allowNull: true,
        defaultValue: null,
        validate: {
          isIn: [['sms', 'email', 'auth_app', 'biometric', 'nfc']],
        },
      },
      session_timeout: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60, // From munchConstants (implied security standard)
        comment: 'Session timeout in minutes',
        validate: { min: 5, max: 1440 },
      },
      max_login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5, // From munchConstants (implied security standard)
        validate: { min: 3, max: 10 },
      },
      lockout_duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15, // From munchConstants (implied security standard)
        validate: { min: 5, max: 60 },
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
      modelName: 'SecuritySettings',
      tableName: 'security_settings',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id'] }],
    }
  );

  return SecuritySettings;
};