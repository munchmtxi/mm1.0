'use strict';
const { Model, DataTypes } = require('sequelize');
const notificationConstants = require('@constants/common/notificationConstants');

module.exports = (sequelize) => {
  class Notification extends Model {
    static associate(models) {
      // Many-to-one with User
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      // Many-to-one with Merchant
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      // Optional relations
      if (models.Order) {
        this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
      }
      if (models.Booking) {
        this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
      }
      if (models.Template) {
        this.belongsTo(models.Template, { foreignKey: 'template_id', as: 'template' });
      }
      // Notification logs
      if (models.NotificationLog) {
        this.hasMany(models.NotificationLog, { foreignKey: 'notification_id', as: 'logs' });
      }
    }
  }

  Notification.init(
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
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: { isInt: { msg: 'User ID must be an integer' } },
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: { isInt: { msg: 'Order ID must be an integer' } },
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: { isInt: { msg: 'Booking ID must be an integer' } },
      },
      template_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'templates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: { isUUID: 4, msg: 'Template ID must be a valid UUID' },
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.values(notificationConstants.NOTIFICATION_TYPES)],
            msg: 'Invalid notification type',
          },
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: { msg: 'Notification message is required' } },
      },
      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.values(notificationConstants.PRIORITY_LEVELS)],
            msg: 'Invalid priority level',
          },
        },
      },
      read_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM('not_sent', 'sent', 'failed'),
        allowNull: false,
        defaultValue: 'not_sent',
      },
      language_code: {
        type: DataTypes.STRING(2),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Language code is required' },
          isIn: {
            args: [notificationConstants.NOTIFICATION_SETTINGS.SUPPORTED_LANGUAGES],
            msg: 'Invalid language code',
          },
        },
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
      modelName: 'Notification',
      tableName: 'notifications',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [
        { fields: ['user_id'], name: 'notifications_user_id_index' },
        { fields: ['merchant_id'], name: 'notifications_merchant_id_index' },
        { fields: ['order_id'], name: 'notifications_order_id_index' },
        { fields: ['booking_id'], name: 'notifications_booking_id_index' },
        { fields: ['template_id'], name: 'notifications_template_id_index' },
        { fields: ['type'], name: 'notifications_type_index' },
      ],
    }
  );

  return Notification;
};