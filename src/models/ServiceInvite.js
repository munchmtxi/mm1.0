'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceInvite extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.User, { foreignKey: 'friend_id', as: 'friend' });
      this.belongsTo(models.Booking, { foreignKey: 'service_id', as: 'booking', constraints: false });
      this.belongsTo(models.Order, { foreignKey: 'service_id', as: 'order', constraints: false });
      this.belongsTo(models.Ride, { foreignKey: 'service_id', as: 'ride', constraints: false });
      this.belongsTo(models.Event, { foreignKey: 'service_id', as: 'event', constraints: false });
      this.belongsTo(models.ParkingBooking, { foreignKey: 'service_id', as: 'parking', constraints: false });
    }
  }

  ServiceInvite.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    friend_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    service_type: {
      type: DataTypes.ENUM('mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets'),
      allowNull: false,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    method: {
      type: DataTypes.ENUM('app', 'sms', 'email', 'whatsapp', 'telegram'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('invited', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'invited',
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
    modelName: 'ServiceInvite',
    tableName: 'service_invites',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['customer_id', 'friend_id', 'service_type', 'service_id'], name: 'service_invites_unique' },
      { fields: ['customer_id'] },
      { fields: ['friend_id'] },
      { fields: ['service_type', 'service_id'] },
    ],
    hooks: {
      afterSave: async (invite, options) => {
        const logger = require('@utils/logger');
        logger.info('ServiceInvite saved', { id: invite.id, service_type: invite.service_type });
        const friend = await sequelize.models.User.findByPk(invite.friend_id, { transaction: options.transaction });
        if (!friend) {
          throw new Error('Friend ID does not exist');
        }
      }
    }
  });

  return ServiceInvite;
};