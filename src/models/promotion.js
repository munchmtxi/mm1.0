'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Promotion extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
    }
  }

  Promotion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: {
            args: [['active', 'inactive', 'expired']],
            msg: 'Status must be one of: active, inactive, expired',
          },
        },
      },
      valid_until: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: { msg: 'Valid until must be a valid date' },
        },
      },
      ride_type: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: {
            args: [['STANDARD', 'PREMIUM', 'FREE', 'XL', 'ECO', 'MOTORBIKE', 'SCHEDULED']],
            msg: 'Ride type must be one of: STANDARD, PREMIUM, FREE, XL, ECO, MOTORBIKE, SCHEDULED',
          },
        },
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      discount_percentage: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Discount percentage must be non-negative' },
          max: { args: [100], msg: 'Discount percentage cannot exceed 100' },
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
    },
    {
      sequelize,
      modelName: 'Promotion',
      tableName: 'promotions',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['status'], name: 'promotions_status_index' },
        { fields: ['valid_until'], name: 'promotions_valid_until_index' },
      ],
    }
  );

  return Promotion;
};