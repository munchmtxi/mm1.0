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
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      points_required: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      type: { type: DataTypes.ENUM('discounts', 'free_services', 'crypto_rewards', 'exclusive_access', 'cash_bonus', 'priority_tasks'), allowNull: false },
      value: { type: DataTypes.JSONB, allowNull: true }, // e.g., { amount: 10, currency: 'USD' }
      roles: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true, comment: 'Roles eligible for reward (e.g., ["customer", "server"])' },
      tier: { type: DataTypes.ENUM('Explorer', 'Trailblazer', 'Master', 'Legend'), allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: true, comment: 'Expiration date for reward availability' },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Reward',
      tableName: 'rewards',
      underscored: true,
      indexes: [{ fields: ['type', 'tier', 'is_active'] }],
    }
  );

  return Reward;
};