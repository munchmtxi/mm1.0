'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      this.hasMany(models.Customer, { foreignKey: 'default_address_id', as: 'customers' });
      this.hasMany(models.MerchantBranch, { foreignKey: 'address_id', as: 'branches' });
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.hasOne(models.User, { foreignKey: 'address_id', as: 'default_user' }); // Added
      this.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
    }
  }

  Address.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      country_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'countries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      formattedAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'formattedAddress',
      },
      placeId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
      },
      components: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      countryCode: {
        type: DataTypes.ENUM('US', 'CA', 'GB', 'MW', 'TZ', 'KE', 'MZ', 'ZA', 'IN', 'CM', 'GH', 'MX', 'ER'),
        allowNull: true,
      },
      validatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      validationStatus: {
        type: DataTypes.ENUM('PENDING', 'VALID', 'INVALID', 'NEEDS_CORRECTION'),
        defaultValue: 'PENDING',
      },
      validationDetails: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      suggestionCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      nearbyValidAddresses: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      locationType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Google Maps location type (ROOFTOP, RANGE_INTERPOLATED, etc.)',
      },
      confidenceLevel: {
        type: DataTypes.ENUM('HIGH', 'MEDIUM', 'LOW'),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt',
      },
    },
    {
      sequelize,
      modelName: 'Address',
      tableName: 'addresses',
      underscored: false,
      indexes: [
        { fields: ['user_id'], name: 'addresses_user_id_index' },
        { fields: ['country_id'], name: 'addresses_country_id_index' },
        { fields: ['placeId'], name: 'addresses_place_id_index' },
        { fields: ['latitude', 'longitude'], name: 'addresses_coordinates_index' },
        { fields: ['validationStatus'], name: 'addresses_validation_status_index' },
        { fields: ['confidenceLevel'], name: 'addresses_confidence_level_index' },
      ],
      scopes: {
        validated: {
          where: { validatedAt: { [Op.ne]: null } },
        },
      },
      hooks: {
        beforeValidate: (address) => {
          if (address.components && typeof address.components !== 'string') {
            address.components = JSON.stringify(address.components);
          }
        },
      },
    }
  );

  return Address;
};