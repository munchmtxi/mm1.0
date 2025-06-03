// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\models\groupChatMessage.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupChatMessage extends Model {
    static associate(models) {
      this.belongsTo(models.GroupChat, { foreignKey: 'chat_id', as: 'chat' });
      this.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
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
    ],
  });

  return GroupChatMessage;
};