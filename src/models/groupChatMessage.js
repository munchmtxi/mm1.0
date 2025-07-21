'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupChatMessage extends Model {
    static associate(models) {
      this.belongsTo(models.GroupChat, { foreignKey: 'chat_id', as: 'chat' });
      this.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
      this.belongsTo(models.Customer, { foreignKey: 'sender_id', as: 'sender_customer', targetKey: 'user_id' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications', sourceKey: 'sender_id' });
    }
  }

  GroupChatMessage.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    chat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'group_chats', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: { msg: 'Message content is required' } },
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Stores media type and URL, e.g., { type: "image", url: "url", size_mb: 10 }',
      validate: {
        isValidMedia(value) {
          if (value && !['IMAGE', 'VIDEO'].includes(value.type)) {
            throw new Error('INVALID_STORY');
          }
          if (value && value.size_mb && value.size_mb > 100) {
            throw new Error('Media size exceeds 100 MB');
          }
        },
      },
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
    modelName: 'GroupChatMessage',
    tableName: 'group_chat_messages',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['chat_id'] },
      { fields: ['sender_id'] },
      { fields: ['created_at'] },
    ],
  });

  return GroupChatMessage;
};