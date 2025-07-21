'use strict';
const { Model } = require('sequelize');
const { GAMIFICATION_ACTIONS } = require('../constants/gamificationConstants');

module.exports = (sequelize, DataTypes) => {
  class GamificationPoints extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  GamificationPoints.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      points: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 }, comment: 'Points awarded for action' },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.keys(GAMIFICATION_ACTIONS)],
            msg: 'Invalid action type',
          },
        },
        comment: 'Action that triggered points (e.g., booking_created)',
      },
      description: { type: DataTypes.TEXT, allowNull: true, comment: 'Description of the action' },
      awarded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      expires_at: { type: DataTypes.DATE, allowNull: true, comment: 'Expiration date for points' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'GamificationPoints',
      tableName: 'gamification_points',
      underscored: true,
      indexes: [{ fields: ['user_id', 'action', 'awarded_at'] }],
      hooks: {
        beforeCreate: async (point, options) => {
          const user = await sequelize.models.User.findByPk(point.user_id, { transaction: options.transaction });
          const actionConfig = GAMIFICATION_ACTIONS[point.action];
          if (!user || !actionConfig || !user.opt_in_gamification) {
            throw new Error('User not found, invalid action, or user opted out of gamification');
          }
          const userRoles = await sequelize.models.UserRole.findAll({
            where: { user_id: point.user_id },
            include: [{ model: sequelize.models.Role, attributes: ['name'] }],
            transaction: options.transaction,
          });
          const userRoleNames = userRoles.map(ur => ur.Role.name);
          userRoleNames.push(user.role); // Include primary role
          if (!actionConfig.roles.some(role => userRoleNames.includes(role))) {
            throw new Error('Invalid action for user role');
          }
        },
        afterCreate: async (point, options) => {
          const user = await sequelize.models.User.findByPk(point.user_id, { transaction: options.transaction });
          if (user.opt_in_gamification) {
            await user.increment('total_points', { by: point.points, transaction: options.transaction });
          }
        },
        afterDestroy: async (point, options) => {
          const user = await sequelize.models.User.findByPk(point.user_id, { transaction: options.transaction });
          if (user.opt_in_gamification) {
            await user.decrement('total_points', { by: point.points, transaction: options.transaction });
          }
        },
      },
    }
  );

  return GamificationPoints;
};