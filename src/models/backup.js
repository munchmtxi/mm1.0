'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Backup extends Model {
    static associate(models) {
      // Many-to-one with admin
      Backup.belongsTo(models.admin, { foreignKey: 'admin_id', as: 'admin' });
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
        allowNull: false,
        references: {
          model: 'admins',
          key: 'id',
        },
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
    }
  );

  return Backup;
};