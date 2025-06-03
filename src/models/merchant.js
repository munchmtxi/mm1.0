'use strict';
require('module-alias/register');
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');
const { TYPES: BUSINESS_TYPES, CODES: BUSINESS_TYPE_CODES } = require('@constants/merchant/businessTypes');

module.exports = (sequelize, DataTypes) => {
  class Merchant extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.hasMany(models.Staff, { foreignKey: 'merchant_id', as: 'staff' });
      this.hasMany(models.Order, { foreignKey: 'merchant_id', as: 'orders' });
      this.hasMany(models.MenuInventory, { foreignKey: 'merchant_id', as: 'menu_items' });
      this.hasMany(models.Booking, { foreignKey: 'merchant_id', as: 'bookings' });
      this.hasMany(models.Payment, { foreignKey: 'merchant_id', as: 'payments' });
      // Media Association: support media uploads
      this.hasMany(models.Media, { foreignKey: 'merchant_id', as: 'media' });
      // Remove incorrect Notification association; rely on User.notifications via merchant.user_id
      // this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });

      this.belongsTo(models.Geofence, { foreignKey: 'geofence_id', as: 'geofence' });
      this.hasMany(models.PasswordHistory, {
        foreignKey: 'user_id',
        constraints: false,
        scope: { user_type: 'merchant' },
      });
      this.hasMany(models.PasswordResetLog, {
        foreignKey: 'user_id',
        constraints: false,
        scope: { user_type: 'merchant' },
      });
      this.belongsTo(models.Address, { foreignKey: 'address_id', as: 'addressRecord' });
      this.hasMany(models.MerchantBranch, {
        foreignKey: 'merchant_id',
        as: 'branches',
        onDelete: 'CASCADE',
      });
    }

    format_phone_for_whatsapp() {
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
      try {
        const number = phoneUtil.parse(this.phone_number);
        return `+${number.getCountryCode()}${number.getNationalNumber()}`;
      } catch (error) {
        throw new Error('Invalid phone number format');
      }
    }

    format_business_hours() {
      if (!this.business_hours) return null;
      const { open, close } = this.business_hours;
      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date.toLocaleTimeString('en-US', {
          timeZone: this.time_zone,
          hour: '2-digit',
          minute: '2-digit',
        });
      };
      return {
        open: open ? parseTime(open) : null,
        close: close ? parseTime(close) : null,
      };
    }

    getBusinessTypeConfig() {
      return BUSINESS_TYPES[this.business_type.toUpperCase()];
    }

    validateBusinessTypeDetails() {
      const typeConfig = this.getBusinessTypeConfig();
      if (!typeConfig) return false;
      const details = this.business_type_details || {};
      const hasAllRequired = typeConfig.requiredFields.every(field => details[field] !== undefined && details[field] !== null);
      const hasValidServices = details.service_types
        ? details.service_types.every(service => typeConfig.allowedServiceTypes.includes(service))
        : true;
      const hasRequiredLicenses = details.licenses
        ? typeConfig.requiredLicenses.every(license => details.licenses.includes(license))
        : true;
      return hasAllRequired && hasValidServices && hasRequiredLicenses;
    }
  }

  Merchant.init({
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    business_name: { type: DataTypes.STRING, allowNull: false },
    business_type: {
      type: DataTypes.ENUM(BUSINESS_TYPE_CODES),
      allowNull: false,
      defaultValue: 'cafe',
    },
    business_type_details: { type: DataTypes.JSONB, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: false },
    address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'addresses', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    phone_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    last_password_update: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    password_strength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    failed_password_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    password_lock_until: { type: DataTypes.DATE, allowNull: true },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'MWK' },
    time_zone: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Africa/Blantyre' },
    // Preferred language for localization support
    preferred_language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en',
      validate: {
        isIn: [['en', 'fr', 'es']], // add supported languages
      },
    },
    // Business hours with validation
    business_hours: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidHours(value) {
          if (value && (!value.open || !value.close)) {
            throw new Error('Business hours must include open and close times');
          }
        },
      },
    },
    notification_preferences: { type: DataTypes.JSON, allowNull: true },
    whatsapp_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    logo_url: { type: DataTypes.STRING, allowNull: true },
    banner_url: { type: DataTypes.STRING, allowNull: true },
    storefront_url: { type: DataTypes.STRING, allowNull: true },
    delivery_area: { type: DataTypes.JSONB, allowNull: true },
    location: { type: DataTypes.GEOMETRY('POINT'), allowNull: true },
    service_radius: { type: DataTypes.DECIMAL, allowNull: true, defaultValue: 5.0 },
    geofence_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'geofences', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Merchant',
    tableName: 'merchants',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['user_id'], name: 'merchants_user_id_unique' },
      { unique: true, fields: ['phone_number'], name: 'merchants_phone_number_unique' },
    ],
    hooks: {
      afterSave: async (merchant, options) => {
        const logger = require('@utils/logger');
        logger.info('Merchant afterSave triggered', {
          id: merchant.id,
          address_id: merchant.address_id
        });
        try {
          if (merchant.address_id && merchant.changed('address_id')) {
            logger.info('Fetching address for merchant', { address_id: merchant.address_id });
            const address = await sequelize.models.Address.findByPk(merchant.address_id, { transaction: options.transaction });
            logger.info('Merchant address fetched', { formattedAddress: address ? address.formattedAddress : null });
            if (address && merchant.address !== address.formattedAddress) {
              logger.info('Updating Merchant address', { newAddress: address.formattedAddress });
              merchant.address = address.formattedAddress;
              await merchant.save({ transaction: options.transaction, hooks: false });
            }
          }
        } catch (error) {
          logger.error('Merchant hook error', { message: error.message, stack: error.stack });
        }
      }
    }
  });

  return Merchant;
};
