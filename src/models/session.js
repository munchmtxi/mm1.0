'use strict';
const authConstants = require('@constants/common/authConstants');

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {}

  Session.init(
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
        field: 'user_id',
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      token_type: {
        type: DataTypes.ENUM(...Object.values(authConstants.TOKEN_CONSTANTS.TOKEN_TYPES)),
        allowNull: false,
        defaultValue: authConstants.TOKEN_CONSTANTS.TOKEN_TYPES.ACCESS,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(authConstants.SESSION_CONSTANTS.SESSION_STATUSES)),
        defaultValue: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      last_active_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      device_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'devices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      location: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Stores resolved location data (e.g., formattedAddress, coordinates, countryCode)',
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
      modelName: 'Session',
      tableName: 'sessions',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [
        { fields: ['user_id'], name: 'sessions_user_id_index' },
        { fields: ['device_id'], name: 'sessions_device_id_index' },
        { fields: ['status'], name: 'sessions_status_index' }, // Added for faster queries
      ],
    }
  );

  Session.associate = (models) => {
    Session.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Session.belongsTo(models.Device, { foreignKey: 'device_id', as: 'device' });
  };

  return Session;
};