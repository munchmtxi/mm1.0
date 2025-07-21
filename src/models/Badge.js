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
      criteria: { type: DataTypes.JSONB, allowNull: false }, // e.g., { action: 'booking_created', count: 10, points: 100 }
      points_required: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
      level: { type: DataTypes.ENUM('Explorer', 'Trailblazer', 'Master', 'Legend'), allowNull: true },
      roles: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true, comment: 'Roles eligible for badge (e.g., ["customer", "server"])' },
      image_url: { type: DataTypes.STRING, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Badge',
      tableName: 'badges',
      underscored: true,
      indexes: [{ fields: ['level', 'is_active'] }],
    }
  );

  return Badge;
};