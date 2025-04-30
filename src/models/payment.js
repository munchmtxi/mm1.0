'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      this.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order',
      });
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.belongsTo(models.Driver, {
        foreignKey: 'driver_id',
        as: 'driver',
      });
      this.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff',
      });
      this.belongsTo(models.InDiningOrder, {
        foreignKey: 'in_dining_order_id',
        as: 'inDiningOrder',
      });
      this.belongsTo(models.Ride, {
        foreignKey: 'ride_id',
        as: 'ride',
      });
    }
  }

  Payment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          isInt: { msg: 'Order ID must be an integer' },
        },
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
        validate: {
          notNull: { msg: 'Customer ID is required' },
          isInt: { msg: 'Customer ID must be an integer' },
        },
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          isInt: { msg: 'Merchant ID must be an integer' },
        },
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Driver ID must be an integer' },
        },
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'staff',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Staff ID must be an integer' },
        },
      },
      in_dining_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'in_dining_orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'In-Dining Order ID must be an integer' },
        },
      },
      ride_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'rides',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Ride ID must be an integer' },
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Amount must be positive',
          },
        },
      },
      payment_method: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Payment method is required' },
        },
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'processing',
          'authorized',
          'completed',
          'failed',
          'refunded',
          'cancelled',
          'verified'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      risk_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      risk_factors: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      verification_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      verification_details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Payment provider (Airtel, TNM, MTN, M-Pesa, Bank Name, etc.)',
      },
      payment_details: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Provider-specific payment details including bank reference',
      },
      bank_reference: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Bank transaction reference number',
      },
      daily_transaction_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Daily transaction counter for limits',
      },
      refund_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processed'),
        allowNull: true,
      },
      refund_details: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Stores refund reason, approver, timestamp, etc.',
      },
      dispute_details: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Details of any payment dispute',
      },
      tip_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      tip_allocation: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Stores tip distribution details among staff/drivers',
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'payment',
        validate: {
          isIn: {
            args: [['payment', 'tip', 'fare']],
            msg: 'Type must be one of: payment, tip, fare',
          },
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
      modelName: 'Payment',
      tableName: 'payments',
      underscored: true,
      paranoid: true,
      validate: {
        atLeastOneOrderReference() {
          // Skip validation for subscription payments
          if (this.payment_details?.type === 'subscription') {
            return;
          }
          if (!this.order_id && !this.in_dining_order_id && !this.ride_id) {
            throw new Error('At least one of Order ID, In-Dining Order ID, or Ride ID is required');
          }
        },
      },
      indexes: [
        { fields: ['order_id'], name: 'payments_order_id_index' },
        { fields: ['customer_id'], name: 'payments_customer_id_index' },
        { fields: ['merchant_id'], name: 'payments_merchant_id_index' },
        { fields: ['driver_id'], name: 'payments_driver_id_index' },
        { unique: true, fields: ['transaction_id'], name: 'payments_transaction_id_unique' },
        { fields: ['bank_reference'], name: 'payments_bank_reference_index' },
        { fields: ['provider'], name: 'payments_provider_index' },
        { fields: ['in_dining_order_id'], name: 'payments_in_dining_order_id_index' },
        { fields: ['ride_id'], name: 'payments_ride_id_index' },
      ],
    }
  );

  return Payment;
};