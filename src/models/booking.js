'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch',
      });
      this.belongsTo(models.Table, {
        foreignKey: 'table_id',
        as: 'table',
      });
      this.hasMany(models.BookingPartyMember, {
        foreignKey: 'booking_id',
        as: 'partyMembers',
      });
      this.belongsTo(models.BookingTimeSlot, {
        foreignKey: 'time_slot_id',
        as: 'timeSlot',
      });
      this.hasMany(models.InDiningOrder, {
        foreignKey: 'booking_id',
        as: 'inDiningOrders',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'booking_id',
        as: 'notifications',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'booking_id',
        as: 'payments',
      });
      this.belongsTo(models.Staff, {
        foreignKey: 'assigned_staff_id',
        as: 'assignedStaff',
      });
      this.hasMany(models.Review, { foreignKey: 'service_id', as: 'reviews', constraints: false, scope: { service_type: 'booking' } });
    }
  }

  Booking.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'Customer ID is required' },
          isInt: { msg: 'Customer ID must be an integer' },
        },
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'Merchant ID is required' },
          isInt: { msg: 'Merchant ID must be an integer' },
        },
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'merchant_branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'Branch ID is required' },
          isInt: { msg: 'Branch ID must be an integer' },
        },
      },
      table_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'tables',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Table ID must be an integer' },
        },
      },
      time_slot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'booking_time_slots',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Time slot ID must be an integer' },
        },
      },
      booking_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Booking number is required' },
        },
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show']],
            msg: 'Invalid booking status',
          },
        },
      },
      party_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: { args: [1], msg: 'Party size must be at least 1' },
          isInt: { msg: 'Party size must be an integer' },
        },
      },
      booking_type: {
        type: DataTypes.ENUM('TABLE', 'PRIVATE_ROOM', 'EVENT_SPACE'),
        allowNull: false,
        defaultValue: 'TABLE',
        validate: {
          isIn: {
            args: [['TABLE', 'PRIVATE_ROOM', 'EVENT_SPACE']],
            msg: 'Invalid booking type',
          },
        },
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: { msg: 'Start time is required' },
          isDate: { msg: 'Start time must be a valid date' },
        },
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: { msg: 'End time is required' },
          isDate: { msg: 'End time must be a valid date' },
        },
      },
      check_in_method: {
        type: DataTypes.ENUM('QR_CODE', 'MANUAL', 'NFC'),
        allowNull: false,
        defaultValue: 'MANUAL',
        validate: {
          isIn: {
            args: [['QR_CODE', 'MANUAL', 'NFC']],
            msg: 'Invalid check-in method',
          },
        },
      },
      deposit_amount: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Deposit amount must be positive' },
        },
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'MWK',
        validate: {
          notEmpty: { msg: 'Currency is required' },
        },
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      assigned_staff_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'staff',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Assigned staff ID must be an integer' },
        },
      },
      preferences: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Stores customer preferences like seating preferences or dietary needs',
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
      modelName: 'Booking',
      tableName: 'bookings',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['customer_id'], name: 'bookings_customer_id_index' },
        { fields: ['merchant_id'], name: 'bookings_merchant_id_index' },
        { fields: ['branch_id'], name: 'bookings_branch_id_index' },
        { fields: ['table_id'], name: 'bookings_table_id_index' },
        { fields: ['time_slot_id'], name: 'bookings_time_slot_id_index' },
        { unique: true, fields: ['booking_number'], name: 'bookings_booking_number_unique' },
        { fields: ['status'], name: 'bookings_status_index' },
        { fields: ['start_time', 'end_time'], name: 'bookings_time_range_index' },
        { fields: ['assigned_staff_id'], name: 'bookings_assigned_staff_id_index' },
      ],
      hooks: {
        beforeValidate: (booking, options) => {
          if (booking.start_time && booking.end_time && booking.start_time >= booking.end_time) {
            throw new Error('End time must be after start time');
          }
        },
        afterSave: async (booking, options) => {
          const logger = require('@utils/logger');
          logger.info('Booking afterSave triggered', {
            id: booking.id,
            customer_id: booking.customer_id,
            branch_id: booking.branch_id,
          });
          try {
            const blackoutDate = await sequelize.models.BookingBlackoutDate.findOne({
              where: {
                branch_id: booking.branch_id,
                blackout_date: sequelize.fn('DATE', booking.start_time),
              },
              transaction: options.transaction,
            });
            if (blackoutDate) {
              logger.warn('Booking conflicts with blackout date', {
                booking_id: booking.id,
                blackout_date: blackoutDate.blackout_date,
              });
              throw new Error('Booking date conflicts with a blackout date');
            }
            if (booking.time_slot_id) {
              const timeSlot = await sequelize.models.BookingTimeSlot.findByPk(booking.time_slot_id, {
                transaction: options.transaction,
              });
              if (timeSlot && booking.start_time) {
                const slotStart = new Date(`${sequelize.fn('DATE', booking.start_time)} ${timeSlot.start_time}`);
                const slotEnd = new Date(`${sequelize.fn('DATE', booking.start_time)} ${timeSlot.end_time}`);
                if (booking.start_time < slotStart || booking.end_time > slotEnd) {
                  logger.warn('Booking time outside of time slot', {
                    booking_id: booking.id,
                    time_slot_id: booking.time_slot_id,
                  });
                  throw new Error('Booking time is outside the assigned time slot');
                }
              }
            }
          } catch (error) {
            logger.error('Booking hook error', { message: error.message, stack: error.stack });
            throw error;
          }
        },
      },
    }
  );

  return Booking;
};