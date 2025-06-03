// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\models\friendPermissions.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FriendPermissions extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.User, { foreignKey: 'friend_id', as: 'friend' });
    }
  }

  FriendPermissions.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    friend_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        view_profile: false,
        share_orders: false,
        view_bookings: false,
        view_rides: false,
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'FriendPermissions',
    tableName: 'friend_permissions',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['user_id', 'friend_id'], name: 'friend_permissions_unique' },
      { fields: ['user_id'] },
      { fields: ['friend_id'] },
    ],
  });

  return FriendPermissions;
};