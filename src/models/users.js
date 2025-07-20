'use strict';
const { Model, DataTypes } = require('sequelize');
const libphonenumber = require('google-libphonenumber');
const bcrypt = require('bcryptjs');

// Utility function for phone number validation
const validatePhoneNumber = (value) => {
  if (value) {
    const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
    try {
      const number = phoneUtil.parse(value);
      if (!phoneUtil.isValidNumber(number)) {
        throw new Error('Invalid phone number format');
      }
    } catch (error) {
      throw new Error('Invalid phone number format');
    }
  }
};

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      this.hasOne(models.Wallet, { foreignKey: 'user_id', as: 'wallet' });
      this.belongsTo(models.User, { as: 'managed_by', foreignKey: 'manager_id' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
      this.hasMany(models.PasswordHistory, { foreignKey: 'user_id', as: 'password_history' });
      this.hasMany(models.Session, { foreignKey: 'user_id', as: 'sessions' });
      this.hasMany(models.AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
      this.hasMany(models.mfaTokens, { foreignKey: 'user_id', as: 'mfaTokens' });
      this.hasMany(models.GamificationPoints, { foreignKey: 'user_id', as: 'gamificationPoints' });
      this.hasMany(models.Verification, { foreignKey: 'user_id', as: 'verifications' });
    }

    getFullName() {
      return `${this.first_name} ${this.last_name}`;
    }

    valid_password(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'First name is required' },
          len: { args: [2, 50], msg: 'First name must be between 2 and 50 characters' },
        },
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Last name is required' },
          len: { args: [2, 50], msg: 'Last name must be between 2 and 50 characters' },
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: { msg: 'Email address already in use!' },
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email is required' },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isValidPassword(value) {
            const passwordValidator = require('password-validator');
            const schema = new passwordValidator();
            schema
              .is().min(8)
              .is().max(100)
              .has().uppercase(1)
              .has().lowercase(1)
              .has().digits(1)
              .has().symbols(1);
            if (!schema.validate(value)) {
              throw new Error('Password does not meet complexity requirements');
            }
          },
        },
      },
      preferred_language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'en',
        validate: {
          isIn: {
            args: [['en', 'fr', 'es']],
            msg: 'Invalid language',
          },
        },
      },
      google_location: { type: DataTypes.JSON, allowNull: true },
      detected_location: { type: DataTypes.JSONB, allowNull: true, comment: 'Automatically detected location from IP/GPS' },
      manual_location: { type: DataTypes.JSONB, allowNull: true, comment: 'User-specified location override' },
      location_source: { type: DataTypes.ENUM('ip', 'gps', 'manual'), allowNull: true, comment: 'Source of the current location data' },
      location_updated_at: { type: DataTypes.DATE, allowNull: true },
      phone: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        validate: { isPhoneNumber: validatePhoneNumber },
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Country is required' },
          isIn: {
            args: [['US', 'CA', 'UK', 'MW']],
            msg: 'Invalid country',
          },
        },
      },
      is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
      manager_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isValidManager(value) {
            if (value && value === this.id) {
              throw new Error('A user cannot manage themselves');
            }
          },
        },
      },
      two_factor_secret: { type: DataTypes.STRING, allowNull: true },
      mfa_method: {
        type: DataTypes.ENUM('email', 'sms', 'authenticator'),
        allowNull: true,
      },
      mfa_status: {
        type: DataTypes.ENUM('enabled', 'disabled'),
        defaultValue: 'disabled',
      },
      mfa_backup_codes: { type: DataTypes.JSONB, allowNull: true, comment: 'Encrypted backup codes for MFA' },
      password_reset_token: { type: DataTypes.STRING, allowNull: true },
      password_reset_expires: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isFutureDate(value) {
            if (value && new Date(value) <= new Date()) {
              throw new Error('Password reset expiration must be in the future');
            }
          },
        },
      },
      avatar_url: { type: DataTypes.STRING, allowNull: true },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
      last_password_change: { type: DataTypes.DATE, allowNull: true, comment: 'Tracks last password change' },
      failed_login_attempts: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Tracks failed login attempts' },
      lockout_until: { type: DataTypes.DATE, allowNull: true, comment: 'Account lockout duration' },
      notification_preferences: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          email: true,
          sms: false,
          push: false,
          whatsapp: false,
        },
        validate: {
          isValidPreferences(value) {
            const allowed = ['email', 'sms', 'push', 'whatsapp'];
            if (value && Object.keys(value).some(key => !allowed.includes(key))) {
              throw new Error('Invalid notification preference');
            }
          },
        },
      },
      privacy_settings: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          location_visibility: 'app_only',
          data_sharing: 'analytics',
        },
        validate: {
          isValidPrivacySettings(value) {
            const allowedLocation = ['app_only', 'anonymized', 'none'];
            const allowedDataSharing = ['analytics', 'marketing', 'none'];
            if (value) {
              if (!allowedLocation.includes(value.location_visibility)) {
                throw new Error('Invalid location visibility setting');
              }
              if (!allowedDataSharing.includes(value.data_sharing)) {
                throw new Error('Invalid data sharing setting');
              }
            }
          },
        },
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: ['password', 'two_factor_secret', 'mfa_backup_codes', 'password_reset_token', 'password_reset_expires'],
        },
      },
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
            user.last_password_change = new Date();
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            if (!user.password.match(/^\$2[aby]\$/)) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
              user.last_password_change = new Date();
            }
          }
        },
      },
    }
  );

  return User;
};