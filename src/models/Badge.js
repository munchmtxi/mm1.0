// src/models/Badge.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Badge extends Model {
    static associate(models) {
      this.hasMany(models.UserBadge, { foreignKey: 'badge_id', as: 'userBadges' });
    }
  }

  Badge.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      criteria: { type: DataTypes.JSONB, allowNull: false }, // e.g., { action: 'check_in', count: 10 }
      image_url: { type: DataTypes.STRING, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Badge',
      tableName: 'badges',
      underscored: true,
    }
  );

  return Badge;
};