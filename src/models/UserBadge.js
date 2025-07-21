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
      points_earned: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: 'Points earned for this badge' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'UserBadge',
      tableName: 'user_badges',
      underscored: true,
      indexes: [{ fields: ['user_id', 'badge_id'] }],
      hooks: {
        beforeCreate: async (userBadge, options) => {
          const user = await sequelize.models.User.findByPk(userBadge.user_id, { transaction: options.transaction });
          if (!user || !user.opt_in_gamification) {
            throw new Error('User not found or opted out of gamification');
          }
        },
      },
    }
  );

  return UserBadge;
};