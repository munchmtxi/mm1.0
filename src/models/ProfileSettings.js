// ProfileSettings.js
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ProfileSettings extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  ProfileSettings.init(
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
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'customer', // From Roles.js allowed roles
        validate: {
          isIn: {
            args: [['admin', 'customer', 'merchant', 'staff', 'driver']],
            msg: 'Invalid user type',
          },
        },
      },
      display_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      profile_picture: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to profile picture',
        validate: {
          isIn: [['jpg', 'png', 'jpeg', 'webp']], // From munchConstants.SOCIAL_MEDIA_INTEGRATION (implied media types)
        },
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 2000], // From socialConstants.SOCIAL_SETTINGS.MAX_POST_LENGTH
        },
      },
      preferred_language: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'en', // From munchConstants/mtxiConstants/mticketsConstants/mtablesConstants/mparkConstants/mstaysConstants.DEFAULT_LANGUAGE
        validate: {
          isIn: [['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti']], // From SUPPORTED_LANGUAGES
        },
      },
      preferred_timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UTC', // From munchConstants/mtxiConstants/mticketsConstants/mtablesConstants/mparkConstants/mstaysConstants.DEFAULT_TIMEZONE
        comment: 'User’s preferred timezone',
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ProfileSettings',
      tableName: 'profile_settings',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id'] }],
    }
  );

  return ProfileSettings;
};