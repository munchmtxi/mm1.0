'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantBranch extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.Address, { foreignKey: 'address_id', as: 'addressRecord' });
    }
  }

  MerchantBranch.init({
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'addresses', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    name: { type: DataTypes.STRING, allowNull: false },
    branch_code: { type: DataTypes.STRING, allowNull: false, unique: true },
    contact_email: { type: DataTypes.STRING, allowNull: true },
    contact_phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.GEOMETRY('POINT'), allowNull: true },
    operating_hours: { type: DataTypes.JSON, allowNull: true },
    delivery_radius: { type: DataTypes.DECIMAL, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    payment_methods: { type: DataTypes.JSON, allowNull: true },
    media: { type: DataTypes.JSON, allowNull: true },
    geofence_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'geofences', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'MerchantBranch',
    tableName: 'merchant_branches',
    underscored: true,
    paranoid: true,
    hooks: {
      afterSave: async (branch, options) => {
        const logger = require('@utils/logger');
        logger.info('MerchantBranch afterSave triggered', {
          id: branch.id,
          address_id: branch.address_id
        });
        try {
          if (branch.address_id && branch.changed('address_id')) {
            logger.info('Fetching address for branch', { address_id: branch.address_id });
            const address = await sequelize.models.Address.findByPk(branch.address_id, { transaction: options.transaction });
            logger.info('Branch address fetched', { formattedAddress: address ? address.formattedAddress : null });
            if (address && branch.address !== address.formattedAddress) {
              logger.info('Updating Branch address', { newAddress: address.formattedAddress });
              branch.address = address.formattedAddress;
              await branch.save({ transaction: options.transaction, hooks: false });
            }
          }
        } catch (error) {
          logger.error('Branch hook error', { message: error.message, stack: error.stack });
        }
      }
    }
  });

  return MerchantBranch;
};