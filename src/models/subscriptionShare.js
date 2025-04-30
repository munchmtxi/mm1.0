'use strict';
const { Model } = require('sequelize');
const { SUBSCRIPTION_SHARE_STATUSES } = require('@constants/common/subscriptionConstants');

module.exports = (sequelize, DataTypes) => {
  class SubscriptionShare extends Model {
    static associate(models) {
      this.belongsTo(models.Subscription, {
        foreignKey: 'subscription_id',
        as: 'subscription',
      });
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
    }
  }

  SubscriptionShare.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subscriptions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SUBSCRIPTION_SHARE_STATUSES)),
      allowNull: false,
      defaultValue: SUBSCRIPTION_SHARE_STATUSES.INVITED,
    },
    invited_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    responded_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: 'SubscriptionShare',
    tableName: 'subscription_shares',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['subscription_id'] },
      { fields: ['customer_id'] },
      { fields: ['status'] },
    ],
  });

  return SubscriptionShare;
};