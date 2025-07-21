'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Message extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, { foreignKey: 'sender_id', as: 'sender' });
      this.belongsTo(models.Staff, { foreignKey: 'receiver_id', as: 'receiver' });
      this.belongsTo(models.Channel, { foreignKey: 'channel_id', as: 'channel' });
    }
  }

  Message.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      receiverято

System: receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      channel_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'channels', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      content: {
        type: DataTypes.TEXT,
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
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'messages',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['sender_id'] },
        { fields: ['receiver_id'] },
        { fields: ['channel_id'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return Message;
};