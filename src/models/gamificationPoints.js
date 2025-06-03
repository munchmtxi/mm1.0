// src/models/GamificationPoints.js
'use strict';

const { Model, DataTypes } = require('sequelize');
const gamificationConstants = require('@constants/gamificationConstants');

module.exports = (sequelize) => {
  class GamificationPoints extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  GamificationPoints.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      sub_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [Object.values(gamificationConstants.CUSTOMER_ACTIONS).map(a => a.action).concat(['points_redeemed'])],
        },
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: -gamificationConstants.MAX_POINTS_PER_DAY,
          max: gamificationConstants.MAX_POINTS_PER_DAY,
        },
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'GamificationPoints',
      tableName: 'gamification_points',
      timestamps: true,
      underscored: true,
    }
  );

  return GamificationPoints;
};