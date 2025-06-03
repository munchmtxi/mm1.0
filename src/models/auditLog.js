'use strict';
const { Model, DataTypes } = require('sequelize');
const authConstants = require('@constants/common/authConstants');

module.exports = (sequelize) => {
  class AuditLog extends Model {
    static associate(models) {
      // Optional relation to User
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  AuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      log_type: {
        type: DataTypes.ENUM(...Object.values(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES)),
        allowNull: false,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional log details',
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Originating IP address for the log event',
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
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [
        { fields: ['user_id'], name: 'audit_logs_user_id_index' },
        { fields: ['log_type'], name: 'audit_logs_log_type_index' },
      ],
    }
  );

  return AuditLog;
};
