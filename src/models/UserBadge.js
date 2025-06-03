// src/models/UserBadge.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserBadge extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Badge, { foreignKey: 'badge_id', as: 'badge' });
    }
  }

  UserBadge.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      badge_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'badges', key: 'id' } },
      awarded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'UserBadge',
      tableName: 'user_badges',
      underscored: true,
      indexes: [{ fields: ['user_id', 'badge_id'] }],
    }
  );

  return UserBadge;
};