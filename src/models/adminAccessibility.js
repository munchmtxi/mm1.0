'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class adminAccessibility extends Model {
    static associate(models) {
      // One-to-one with admin
      adminAccessibility.belongsTo(models.admin, { foreignKey: 'admin_id', as: 'admin' });
    }
  }

  adminAccessibility.init(
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
        unique: true,
        references: {
          model: 'admins',
          key: 'id',
        },
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
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
      modelName: 'adminAccessibility',
      tableName: 'admin_accessibility',
      timestamps: true,
      underscored: true,
    }
  );

  return adminAccessibility;
};