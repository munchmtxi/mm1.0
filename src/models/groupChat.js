'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupChat extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'creator_id', as: 'creator' });
      this.belongsTo(models.Customer, { foreignKey: 'creator_id', as: 'creator_customer', targetKey: 'user_id' });
      this.belongsToMany(models.User, {
        through: 'GroupChatMembers',
        foreignKey: 'chat_id',
        otherKey: 'user_id',
        as: 'members',
      });
      this.belongsToMany(models.Customer, {
        through: 'GroupChatMembers',
        foreignKey: 'chat_id',
        otherKey: 'user_id',
        as: 'customer_members',
        targetKey: 'user_id',
      });
      this.hasMany(models.GroupChatMessage, { foreignKey: 'chat_id', as: 'messages' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications', sourceKey: 'creator_id' });
    }
  }

  GroupChat.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Chat name is required' } },
    },
    status: {
      type: DataTypes.ENUM('active', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    },
    platform: {
      type: DataTypes.ENUM('in_app', 'whatsapp', 'telegram', 'facebook', 'instagram', 'x', 'snapchat', 'tiktok'),
      allowNull: false,
      defaultValue: 'in_app',
    },
    max_participants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: { max: 100 },
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
    modelName: 'GroupChat',
    tableName: 'group_chats',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['status'] },
      { fields: ['platform'] },
    ],
  });

  return GroupChat;
};