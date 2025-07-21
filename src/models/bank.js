'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Bank extends Model {
    static associate(models) {
      // Association with Country
      Bank.belongsTo(models.Country, {
        foreignKey: 'countryCode',
        targetKey: 'code',
        as: 'country'
      });
      // Association with Address
      Bank.belongsTo(models.Address, {
        foreignKey: 'address_id',
        as: 'address'
      });
    }
  }

  Bank.init({
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
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN']]
      }
    },
    currencySymbol: {
      type: DataTypes.STRING,
      allowNull: false
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti']]
      }
    },
    timeZone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dateFormat: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['MM/DD/YYYY', 'DD/MM/YYYY']]
      }
    },
    timeFormat: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['12h', '24h']]
      }
    },
    decimalSeparator: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['.', ',']]
      }
    },
    thousandSeparator: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [[',', '.', ' ']]
      }
    },
    measurementSystem: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['imperial', 'metric']]
      }
    },
    weekendDays: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      validate: {
        isIn: [[['Saturday', 'Sunday'], ['Friday', 'Saturday']]]
      }
    },
    phoneCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    addressFormat: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [[
          'New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco',
          'London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh',
          'Berlin', 'Paris', 'Amsterdam', 'Rome', 'Madrid',
          'Toronto', 'Vancouver', 'Montreal', 'Calgary',
          'Sydney', 'Melbourne', 'Brisbane', 'Perth',
          'Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba',
          'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza',
          'Nairobi', 'Mombasa', 'Kisumu', 'Eldoret',
          'Maputo', 'Beira', 'Nampula', 'Matola',
          'Johannesburg', 'Cape Town', 'Durban', 'Pretoria',
          'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad',
          'Douala', 'Yaoundé',
          'Accra', 'Kumasi',
          'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla',
          'Asmara', 'Keren', 'Massawa'
        ]]
      }
    },
    mapProvider: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['google_maps', 'openstreetmap']]
      }
    }
  }, {
    sequelize,
    modelName: 'Bank',
    tableName: 'banks_branches',
    timestamps: true,
    indexes: [
      { fields: ['countryCode'], name: 'banks_branches_country_code_index' },
      { fields: ['address_id'], name: 'banks_branches_address_id_index' }
    ]
  });

  return Bank;
};