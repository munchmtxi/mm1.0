'use strict';

const { Model, DataTypes } = require('sequelize');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * AccessibilitySettings Model
 * Stores customer accessibility settings, such as screen reader support, font size, and UI language.
 * Associated with the User model for customer-specific settings.
 * Last Updated: May 18, 2025
 */
module.exports = (sequelize) => {
  class AccessibilitySettings extends Model {
    static associate(models) {
      // Define association with User model
      AccessibilitySettings.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
      });
    }
  }

  AccessibilitySettings.init(
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
      screenReaderEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      fontSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min,
        validate: {
          min: {
            args: [customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min],
            msg: `Font size must be at least ${customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.min}`,
          },
          max: {
            args: [customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max],
            msg: `Font size must not exceed ${customerConstants.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE.max}`,
          },
        },
      },
      language: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
        validate: {
          isIn: {
            args: [customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES],
            msg: 'Invalid language code',
          },
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
      modelName: 'AccessibilitySettings',
      tableName: 'AccessibilitySettings',
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

  return AccessibilitySettings;
};