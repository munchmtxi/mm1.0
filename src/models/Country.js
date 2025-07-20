'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Country extends Model {
    static associate(models) {
      this.hasMany(models.Customer, { foreignKey: 'country_id', as: 'customers' });
      this.hasMany(models.Driver, { foreignKey: 'country_id', as: 'drivers' });
      this.hasMany(models.Merchant, { foreignKey: 'country_id', as: 'merchants' });
      this.hasMany(models.Staff, { foreignKey: 'country_id', as: 'staff' });
      this.hasMany(models.Admin, { foreignKey: 'country_id', as: 'admins' });
      this.hasMany(models.Bank, { foreignKey: 'country_id', as: 'banks' });
      this.hasMany(models.PaymentPartner, { foreignKey: 'country_id', as: 'paymentPartners' });
      this.hasMany(models.TaxRecord, { foreignKey: 'country_id', as: 'taxRecords' });
      // Associate Country with DeliveryHotspot (one-to-many)
      this.hasMany(models.DeliveryHotspot, { foreignKey: 'country_id', as: 'deliveryHotspots' });
    }
  }

  Country.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      unique: true,
      validate: {
        isIn: [['US', 'GB', 'EU', 'CA', 'AU', 'MW', 'TZ', 'KE', 'MZ', 'ZA', 'IN', 'CM', 'GH', 'MX', 'ER']],
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN']],
      },
    },
    currency_symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti']],
      },
    },
    time_zone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date_format: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['MM/DD/YYYY', 'DD/MM/YYYY']],
      },
    },
    time_format: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['12h', '24h']],
      },
    },
    number_format: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Number format is required' },
      },
    },
    measurement_system: {
      type: DataTypes.ENUM('metric', 'imperial'),
      allowNull: false,
    },
    weekend_days: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Weekend days are required' },
      },
    },
    phone_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address_format: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    supported_cities: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Supported cities are required' },
      },
    },
    map_provider: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['google_maps', 'openstreetmap']],
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
    modelName: 'Country',
    tableName: 'countries',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'countries_code_unique' },
    ],
  });

  return Country;
};