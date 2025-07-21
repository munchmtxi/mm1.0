'use strict';

const { Model, DataTypes } = require('sequelize');
const accessibilityConstants = require('@constants/accessibilityConstants');


 */
module.exports = (sequelize) => {
  class AccessibilitySettings extends Model {
    static associate(models) {
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
          model: 'users',
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
        defaultValue: accessibilityConstants.FONT_SIZE_RANGE.min,
        validate: {
          min: {
            args: [accessibilityConstants.FONT_SIZE_RANGE.min],
            msg: `Font size must be at least ${accessibilityConstants.FONT_SIZE_RANGE.min}`,
          },
          max: {
            args: [accessibilityConstants.FONT_SIZE_RANGE.max],
            msg: `Font size must not exceed ${accessibilityConstants.FONT_SIZE_RANGE.max}`,
          },
        },
      },
      language: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: accessibilityConstants.DEFAULT_LANGUAGE,
        validate: {
          isIn: {
            args: [accessibilityConstants.SUPPORTED_LANGUAGES],
            msg: 'Invalid language code',
          },
        },
      },
      theme: {
        type: DataTypes.ENUM('light', 'dark', 'system'),
        allowNull: false,
        defaultValue: 'system',
        validate: {
          isIn: {
            args: [['light', 'dark', 'system']],
            msg: 'Invalid theme option',
          },
        },
      },
      highContrastMode: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      colorBlindMode: {
        type: DataTypes.ENUM('none', 'protanopia', 'deuteranopia', 'tritanopia'),
        allowNull: false,
        defaultValue: 'none',
        validate: {
          isIn: {
            args: [['none', 'protanopia', 'deuteranopia', 'tritanopia']],
            msg: 'Invalid color blind mode',
          },
        },
      },
      textToSpeechEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      keyboardNavigationEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      animationReduced: {
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
      modelName: 'AccessibilitySettings',
      tableName: 'accessibility_settings',
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