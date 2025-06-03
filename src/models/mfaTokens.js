'use strict';

const { Model, DataTypes } = require('sequelize');
const adminSystemConstants = require('@constants/admin/adminSystemConstants');

module.exports = (sequelize) => {
  class mfaTokens extends Model {
    static associate(models) {
      // Many-to-one with User
      mfaTokens.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  mfaTokens.init(
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
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      method: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [adminSystemConstants.SECURITY_CONSTANTS.MFA_METHODS],
        },
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
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
    },
    {
      sequelize,
      modelName: 'mfaTokens',
      tableName: 'mfa_tokens',
      timestamps: true,
      underscored: true,
    }
  );

  return mfaTokens;
};