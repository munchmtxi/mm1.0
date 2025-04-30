// src/models/driver.js
'use strict';
const { Model, Op } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      // Core associations
      this.belongsTo(models.User,       { foreignKey: 'user_id',        as: 'user' });
      this.hasMany(models.Ride,          { foreignKey: 'driver_id',      as: 'rides' });
      this.hasMany(models.DriverRatings, { foreignKey: 'driver_id',      as: 'ratings' });
      this.hasOne(models.Vehicle,        { foreignKey: 'driver_id',      as: 'vehicle' });
      this.hasMany(models.DriverAvailability, { foreignKey: 'driver_id', as: 'availabilities' });

      // Order, payments, notifications, route
      this.hasMany(models.Order,         { foreignKey: 'driver_id',      as: 'orders' });
      this.hasMany(models.Payment,       { foreignKey: 'driver_id',      as: 'payments' });
      this.hasMany(models.Notification,  { foreignKey: 'user_id',        as: 'notifications' });
      this.belongsTo(models.Route,       { foreignKey: 'active_route_id', as: 'activeRoute' });
    }

    format_phone_for_whatsapp() {
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
      try {
        const number = phoneUtil.parse(this.phone_number);
        return `+${number.getCountryCode()}${number.getNationalNumber()}`;
      } catch {
        throw new Error('Invalid phone number format');
      }
    }
  }

  Driver.init({
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
        isInt:   { msg: 'User ID must be an integer' },
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Name is required' } },
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Phone number is required' },
        isPhoneNumber(value) {
          const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
          try {
            const num = phoneUtil.parse(value);
            if (!phoneUtil.isValidNumber(num)) throw new Error();
          } catch {
            throw new Error('Invalid phone number format');
          }
        },
      },
    },
    vehicle_info: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: { notEmpty: { msg: 'Vehicle information is required' } },
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { notEmpty: { msg: 'License number is required' } },
    },
    profile_picture_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isUrl:   { msg: 'Profile picture URL must be a valid URL' } },
    },
    license_picture_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isUrl:   { msg: 'License picture URL must be a valid URL' } },
    },
    routes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    availability_status: {
      type: DataTypes.ENUM('available', 'busy', 'offline'),
      allowNull: false,
      defaultValue: 'offline',
    },
    status: {
      type: DataTypes.ENUM('active', 'busy'),
      allowNull: false,
      defaultValue: 'active',
    },
    current_location: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    last_location_update: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    active_route_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'routes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    service_area: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    preferred_zones: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    rating: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    total_rides: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_deliveries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
  }, {
    sequelize,
    modelName: 'Driver',
    tableName: 'drivers',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['user_id'] },
      { unique: true, fields: ['phone_number'] },
      { unique: true, fields: ['license_number'] },
      { fields: ['active_route_id'] },
      { fields: ['availability_status'] },
    ],
  });

  Driver.addHook('afterUpdate', async (driver) => {
    try {
      const now = new Date();
      const today = now.toISOString().slice(0,10);
      const currentTime = now.toTimeString().split(' ')[0];
      const { DriverAvailability } = sequelize.models;

      const avail = await DriverAvailability.findOne({
        where: {
          driver_id: driver.id,
          date: today,
          start_time: { [Op.lte]: currentTime },
          end_time:   { [Op.gte]: currentTime },
        },
        order: [['last_updated','DESC']],
      });

      if (avail) {
        const newStatus = avail.status === 'available' ? 'available'
                         : avail.status === 'busy'      ? 'busy'
                         : 'offline';
        if (driver.availability_status !== newStatus) {
          await sequelize.query(
            `UPDATE drivers SET availability_status = :status, updated_at = :now WHERE id = :id`, {
              replacements: { status: newStatus, now, id: driver.id },
              type: sequelize.QueryTypes.UPDATE,
            }
          );
        }
      }
    } catch (err) {
      console.error('Driver afterUpdate hook error:', err);
    }
  });

  return Driver;
};
