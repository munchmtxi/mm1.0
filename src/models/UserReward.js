// src/models/UserReward.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserReward extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Reward, { foreignKey: 'reward_id', as: 'reward' });
    }
  }

  UserReward.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      reward_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'rewards', key: 'id' } },
      redeemed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      status: { type: DataTypes.ENUM('pending', 'completed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
    },
    {
      sequelize,
      modelName: 'UserReward',
      tableName: 'user_rewards',
      underscored: true,
      indexes: [{ fields: ['user_id', 'reward_id'] }],
    }
  );

  return UserReward;
};