'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PaymentPartner extends Model {
    static associate(models) {
      // Association with Country
      PaymentPartner.belongsTo(models.Country, {
        foreignKey: 'countryCode',
        targetKey: 'code',
        as: 'country'
      });
      // Association with Address
      PaymentPartner.belongsTo(models.Address, {
        foreignKey: 'address_id',
        as: 'address'
      });
    }
  }
  
  PaymentPartner.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    countryCode: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'countries',
        key: 'code'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      validate: {
        isIn: [['US', 'GB', 'EU', 'CA', 'AU', 'MW', 'TZ', 'KE', 'MZ', 'ZA', 'IN', 'CM', 'GH', 'MX', 'ER']]
      }
    },
    address_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    taxType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['VAT', 'SALES_TAX', 'SERVICE_TAX', 'WITHHOLDING_TAX']]
      }
    },
    taxRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1
      }
    },
    taxCalculationMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['INCLUDED', 'EXCLUSIVE']]
      }
    },
    taxExemptStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['NON_PROFIT', 'GOVERNMENT', 'EXPORT', null]]
      }
    },
    taxReportPeriod: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['MONTHLY', 'QUARTERLY', 'YEARLY']]
      }
    },
    transactionType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['ORDER_PAYMENT', 'RIDE_PAYMENT', 'EVENT_PAYMENT', 'PARKING_PAYMENT', 'BOOKING_PAYMENT', 'REFUND']]
      }
    },
    notificationType: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['TAX_CALCULATED', 'TAX_REPORT_GENERATED', 'TAX_EXEMPT_APPLIED', null]]
      }
    },
    deliveryMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM', null]]
      }
    },
    priorityLevel: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['LOW', 'MEDIUM', null]]
      }
    },
    errorCode: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['INVALID_TAX_TYPE', 'INVALID_TAX_RATE', 'TAX_CALCULATION_FAILED', 'INVALID_EXEMPT_STATUS', null]]
      }
    },
    successMessage: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['TAX_CALCULATED', 'TAX_REPORT_GENERATED', 'TAX_EXEMPT_APPLIED', null]]
      }
    }
  }, {
    sequelize,
    modelName: 'PaymentPartner',
    tableName: 'payment_partners',
    timestamps: true,
    indexes: [
      { fields: ['countryCode'], name: 'payment_partners_country_code_index' },
      { fields: ['address_id'], name: 'payment_partners_address_id_index' }
    ]
  });

  return PaymentPartner;
};