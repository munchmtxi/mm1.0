'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
      this.belongsToMany(models.Role, {
        through: 'UserRoles',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
    }
  }

  Admin.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'countries', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    services: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: ['mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets'],
      validate: {
        isIn: {
          args: [['mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets']],
          msg: 'Services must be one of: mtables, munch, mtxi, mevents, mpark, mstays, mtickets'
        }
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    underscored: true,
    paranoid: true
  });

  return Admin;
};