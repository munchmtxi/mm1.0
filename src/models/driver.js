'use strict';
const { Model, Op } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.hasMany(models.Order, { foreignKey: 'driver_id', as: 'orders' });
      this.hasMany(models.Payment, { foreignKey: 'driver_id', as: 'payments' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
      this.belongsTo(models.Route, { foreignKey: 'active_route_id', as: 'activeRoute' });
      this.hasMany(models.DriverAvailability, { foreignKey: 'driver_id', as: 'availability' });
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
  }

  Driver.init({
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
      validate: {
        notNull: { msg: 'User ID is required' },
        isInt: { msg: 'User ID must be an integer' },
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
            const number = phoneUtil.parse(value);
            if (!phoneUtil.isValidNumber(number)) {
              throw new Error('Invalid phone number format');
            }
          } catch (error) {
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
    profile_picture_url: { type: DataTypes.STRING, allowNull: true },
    license_picture_url: { type: DataTypes.STRING, allowNull: true },
    routes: { type: DataTypes.JSON, allowNull: true },
    availability_status: {
      type: DataTypes.ENUM('available', 'unavailable', 'busy'),
      allowNull: false,
      defaultValue: 'available',
    },
    current_location: { type: DataTypes.JSONB, allowNull: true },
    last_location_update: { type: DataTypes.DATE, allowNull: true },
    active_route_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'routes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    service_area: { type: DataTypes.JSONB, allowNull: true },
    preferred_zones: { type: DataTypes.JSONB, allowNull: true },
    status: {
      type: DataTypes.ENUM('active', 'busy'),
      allowNull: false,
      defaultValue: 'active',
    },
    rating: { type: DataTypes.DECIMAL, allowNull: true },
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
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Driver',
    tableName: 'drivers',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['user_id'], name: 'drivers_user_id_unique' },
      { unique: true, fields: ['phone_number'], name: 'drivers_phone_number_unique' },
      { unique: true, fields: ['license_number'], name: 'drivers_license_number_unique' },
      { fields: ['active_route_id'], name: 'drivers_active_route_id_index' },
    ],
  });

  Driver.addHook('afterUpdate', async (driver, options) => {
    try {
      console.log(`afterUpdate hook triggered for driver_id: ${driver.id}`);
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0];
      const { DriverAvailability } = sequelize.models;

      const availability = await DriverAvailability.findOne({
        where: {
          driver_id: driver.id,
          date: currentDate,
          start_time: { [Op.lte]: currentTime },
          end_time: { [Op.gte]: currentTime },
        },
        order: [['last_updated', 'DESC']],
      });

      if (availability) {
        const newStatus = availability.status === 'available' ? 'available' :
                         availability.status === 'busy' ? 'busy' : 'unavailable';
        console.log(`Availability found: ${availability.status}, calculated newStatus: ${newStatus}`);

        // Only update if status has changed
        if (driver.availability_status !== newStatus) {
          console.log(`Updating availability_status from ${driver.availability_status} to ${newStatus}`);
          await sequelize.query(
            `UPDATE drivers SET availability_status = :status, updated_at = :updatedAt WHERE id = :id`,
            {
              replacements: {
                status: newStatus,
                updatedAt: new Date(),
                id: driver.id,
              },
              type: sequelize.QueryTypes.UPDATE,
            }
          );
          console.log(`Updated availability_status for driver_id: ${driver.id} to ${newStatus}`);
        } else {
          console.log(`No status change needed for driver_id: ${driver.id}, current: ${driver.availability_status}`);
        }
      } else {
        console.log(`No matching availability record found for driver_id: ${driver.id}`);
      }
    } catch (error) {
      console.error('Error in Driver afterUpdate hook:', error);
    }
  });

  return Driver;
};