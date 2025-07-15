'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
      Review.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant', allowNull: true });
      Review.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff', allowNull: true });
      Review.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver', allowNull: true });
      Review.hasMany(models.ReviewInteraction, { foreignKey: 'review_id', as: 'interactions' });
    }
  }

  Review.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Merchants', key: 'id' },
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Staff', key: 'id' },
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Drivers', key: 'id' },
    },
    service_type: {
      type: DataTypes.ENUM('order', 'in_dining_order', 'booking', 'ride', 'parking_booking', 'event'),
      allowNull: false,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    target_type: {
      type: DataTypes.ENUM('merchant', 'staff', 'driver'),
      allowNull: false,
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000],
      },
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        len: [0, 150],
      },
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidPhotos(value) {
          if (value && (!Array.isArray(value) || value.length > 10 || value.some(url => typeof url !== 'string'))) {
            throw new Error('Invalid photos format');
          }
        },
      },
    },
    anonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Review',
    tableName: 'reviews',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['merchant_id'] },
      { fields: ['staff_id'] },
      { fields: ['driver_id'] },
      { fields: ['service_type', 'service_id'] },
      { fields: ['target_type', 'target_id'] },
      { fields: ['status'] },
    ],
  });

  return Review;
};