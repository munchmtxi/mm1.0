'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Promotion extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.hasMany(models.WalletTransaction, { foreignKey: 'promotion_id', as: 'transactions' });
    }
  }

  Promotion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    service_type: {
      type: DataTypes.ENUM('mtxi', 'munch', 'mtables', 'all'),
      allowNull: false,
      defaultValue: 'all',
    },
    type: {
      type: DataTypes.ENUM('DISCOUNT', 'LOYALTY', 'REFERRAL', 'CASHBACK'),
      allowNull: false,
    },
    reward_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 },
    },
    discount_percentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 100 },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_reusable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'REDEEMED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    redeemed_at: {
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
    modelName: 'Promotion',
    tableName: 'promotions',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['service_type'] },
      { fields: ['status'] },
      { fields: ['expiry_date'] },
    ],
  });

  return Promotion;
};