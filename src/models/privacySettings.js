'use strict';

const { Model, DataTypes } = require('sequelize');

/**
 * PrivacySettings Model
 * Stores customer privacy settings, such as data anonymization preferences.
 * Associated with the User model for customer-specific settings.
 * Last Updated: May 18, 2025
 */
module.exports = (sequelize) => {
  class PrivacySettings extends Model {
    static associate(models) {
      // Define association with User model
      PrivacySettings.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
      });
    }
  }

  PrivacySettings.init(
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
        unique: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      anonymizeLocation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      anonymizeProfile: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      modelName: 'PrivacySettings',
      tableName: 'PrivacySettings',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['user_id'],
        },
      ],
    }
  );

  return PrivacySettings;
};