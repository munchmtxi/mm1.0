// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\models\review.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      this.hasMany(models.ReviewInteraction, { foreignKey: 'review_id', as: 'interactions' });
    }
  }

  Review.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'drivers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'staff', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    service_type: {
      type: DataTypes.ENUM('order', 'in_dining_order', 'booking', 'ride'),
      allowNull: false,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
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
    modelName: 'Review',
    tableName: 'reviews',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['merchant_id'] },
      { fields: ['driver_id'] },
      { fields: ['staff_id'] },
      { fields: ['service_type', 'service_id'] },
    ],
  });

  return Review;
};