'use strict';
const { Model, DataTypes } = require('sequelize');
const notificationConstants = require('@constants/common/notificationConstants');

module.exports = (sequelize) => {
  class NotificationLog extends Model {
    static associate(models) {
      // Many-to-one with Notification
      this.belongsTo(models.Notification, { foreignKey: 'notification_id', as: 'notification' });
    }
  }

  NotificationLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      notification_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'notifications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.ENUM(...Object.values(notificationConstants.DELIVERY_METHODS).map(method => method.toUpperCase())),
        allowNull: false,
      },
      recipient: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      template_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'templates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      template_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      parameters: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('SENT', 'FAILED', 'PERMANENTLY_FAILED'),
        allowNull: false,
      },
      message_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      retry_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      next_retry_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      delivery_provider: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      delivery_metadata: {
        type: DataTypes.JSON,
        allowNull: true,
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
    },
    {
      sequelize,
      modelName: 'NotificationLog',
      tableName: 'notification_logs',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [
        { fields: ['notification_id'], name: 'notification_logs_notification_id_idx' },
        { fields: ['message_id'], name: 'notification_logs_message_id_idx' },
        { fields: ['recipient'], name: 'notification_logs_recipient_idx' },
        { fields: ['status'], name: 'notification_logs_status_idx' },
        { fields: ['created_at'], name: 'notification_logs_created_at_idx' },
        { fields: ['template_name'], name: 'notification_logs_template_name_idx' },
        { fields: ['status', 'retry_count'], name: 'notification_logs_retry_status_idx' },
        { fields: ['next_retry_at'], name: 'notification_logs_next_retry_idx' },
      ],
    }
  );

  return NotificationLog;
};