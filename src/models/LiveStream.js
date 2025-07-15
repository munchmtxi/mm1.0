'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LiveStream extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Event, { foreignKey: 'event_id', as: 'event' });
    }
  }

  LiveStream.init({
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
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'events', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Title is required' } },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    privacy: {
      type: DataTypes.ENUM('public', 'friends', 'private'),
      allowNull: false,
      defaultValue: 'public',
    },
    platform: {
      type: DataTypes.ENUM('app', 'whatsapp', 'telegram', 'x'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'ended', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    modelName: 'LiveStream',
    tableName: 'live_streams',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['event_id'] },
      { fields: ['expires_at'] },
    ],
  });

  return LiveStream;
};