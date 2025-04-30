'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RideParticipant extends Model {
    static associate(models) {
      this.belongsTo(models.Ride, {
        foreignKey: 'ride_id',
        as: 'ride',
      });
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
    }
  }

  RideParticipant.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    ride_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rides',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
    },
    status: {
      type: DataTypes.ENUM('invited', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'invited',
    },
    invited_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    responded_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: 'RideParticipant',
    tableName: 'ride_participants',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['ride_id'] },
      { fields: ['customer_id'] },
      { fields: ['status'] },
    ],
  });

  return RideParticipant;
};