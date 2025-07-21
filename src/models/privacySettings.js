// PrivacySettings.js
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PrivacySettings extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
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
            msg: 'Invalid user type', // Align with Roles.js
          },
        },
      },
      data_sharing_consent: {
        type: DataTypes.ENUM('explicit', 'implicit', 'opt_in', 'opt_out'),
        allowNull: false,
        defaultValue: 'opt_out', // From munchConstants (implied consent methods)
        validate: {
          isIn: [['explicit', 'implicit', 'opt_in', 'opt_out']],
        },
      },
      profile_visibility: {
        type: DataTypes.ENUM('public', 'friends', 'private'), // From socialConstants.SOCIAL_SETTINGS.POST_PRIVACY
        allowNull: false,
        defaultValue: 'private',
      },
      activity_tracking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Allow tracking of user activity for analytics',
      },
      data_retention_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 730, // From mticketsConstants/mparkConstants/mstaysConstants/meventsConstants.ANALYTICS_CONFIG.DATA_RETENTION_DAYS
        validate: { min: 90, max: 730 },
      },
      social_permissions: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
        validate: {
          isIn: [
            [
              'view_profile', 'view_bookings', 'view_orders', 'view_rides', 'view_events',
              'view_parking', 'view_stays', 'view_tickets', 'split_payment', 'send_invites', 'share_posts',
            ],
          ], // From socialConstants.SOCIAL_SETTINGS.PERMISSION_TYPES
        },
        comment: 'Permissions for social interactions',
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
      modelName: 'PrivacySettings',
      tableName: 'privacy_settings',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id'] }],
    }
  );

  return PrivacySettings;
};