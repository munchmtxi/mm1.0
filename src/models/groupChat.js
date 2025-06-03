// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\models\groupChat.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupChat extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'creator_id', as: 'creator' });
      this.belongsToMany(models.User, {
        through: 'GroupChatMembers',
        foreignKey: 'chat_id',
        otherKey: 'user_id',
        as: 'members',
      });
      this.hasMany(models.GroupChatMessage, { foreignKey: 'chat_id', as: 'messages' });
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
    ],
  });

  return GroupChat;
};