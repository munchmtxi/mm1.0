// src/models/Reward.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Reward extends Model {
    static associate(models) {
      this.hasMany(models.UserReward, { foreignKey: 'reward_id', as: 'userRewards' });
    }
  }

  Reward.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      points_required: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.ENUM('wallet_credit'), allowNull: false },
      value: { type: DataTypes.JSONB, allowNull: true }, // e.g., { amount: 10, currency: 'USD' }
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Reward',
      tableName: 'rewards',
      underscored: true,
    }
  );

  return Reward;
};