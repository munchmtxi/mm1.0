'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Backup extends Model {
    static associate(models) {
      // Many-to-one with Admin
      Backup.belongsTo(models.Admin, { foreignKey: 'admin_id', as: 'admin' });
      // Many-to-one with Driver
      Backup.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      // Many-to-one with Merchant
      Backup.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
    }
  }

  Backup.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null since only one of admin_id, driver_id, or merchant_id will be set
        references: {
          model: 'admins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for same reason
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for same reason
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Backup',
      tableName: 'backups',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['admin_id'], name: 'backups_admin_id_index' },
        { fields: ['driver_id'], name: 'backups_driver_id_index' },
        { fields: ['merchant_id'], name: 'backups_merchant_id_index' },
      ],
      hooks: {
        beforeValidate: (backup) => {
          // Ensure only one of admin_id, driver_id, or merchant_id is set
          const ids = [backup.admin_id, backup.driver_id, backup.merchant_id];
          const setIds = ids.filter(id => id !== null && id !== undefined);
          if (setIds.length > 1) {
            throw new Error('Only one of admin_id, driver_id, or merchant_id can be set');
          }
        },
      },
    }
  );

  return Backup;
};