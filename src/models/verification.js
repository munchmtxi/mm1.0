'use strict';

const { Model, DataTypes } = require('sequelize');
const authConstants = require('@constants/common/authConstants');

module.exports = (sequelize) => {
  class Verification extends Model {
    static associate(models) {
      Verification.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  Verification.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      method: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [Object.values(authConstants.VERIFICATION_CONSTANTS.VERIFICATION_METHODS)],
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.PENDING,
        validate: {
          isIn: [Object.values(authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES)],
        },
      },
      document_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [Object.values(authConstants.VERIFICATION_CONSTANTS.VERIFICATION_DOCUMENT_TYPES).flat()],
        },
      },
      document_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isUrl: true,
        },
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
      modelName: 'Verification',
      tableName: 'verifications',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      paranoid: true, // Enable soft deletes for compliance
    }
  );

  return Verification;
};