'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.Payment, { foreignKey: 'payment_id', as: 'payment' });
      this.hasMany(models.Ride, { foreignKey: 'subscription_id', as: 'rides' });
      this.hasMany(models.Order, { foreignKey: 'subscription_id', as: 'orders' });
    }
  }

  Subscription.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'payments', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    service_type: {
      type: DataTypes.ENUM('mtxi', 'munch', 'mtables'),
      allowNull: false,
      defaultValue: 'mtxi',
    },
    plan: {
      type: DataTypes.ENUM('BASIC', 'PREMIUM'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'canceled'),
      allowNull: false,
      defaultValue: 'active',
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    sharing_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: 'Subscription',
    tableName: 'subscriptions',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['service_type'] },
      { fields: ['status'] },
      { fields: ['start_date', 'end_date'] },
    ],
  });

  return Subscription;
};