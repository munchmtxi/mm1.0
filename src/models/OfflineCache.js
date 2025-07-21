'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class OfflineCache extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  OfflineCache.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      data_type: {
        type: DataTypes.ENUM(
          'order', 'booking', 'ride', 'parking_booking', 'room_booking', 'event', // Merchant/Customer-related
          'driver_availability', 'driver_delivery', // Driver-related
          'in_dining_order', 'staff_task', // Staff-related
          'admin_action', 'notification' // Admin-related
        ),
        allowNull: false,
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Data is required' },
          isValidData(value) {
            if (!value || typeof value !== 'object') {
              throw new Error('Data must be a JSON object');
            }
          },
        },
      },
      status: {
        type: DataTypes.ENUM('pending', 'synced', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
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
      modelName: 'OfflineCache',
      tableName: 'offline_cache',
      underscored: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['data_type', 'status'] },
      ],
      validate: {
        async roleDataTypeConsistency() {
          const user = await sequelize.models.User.findByPk(this.user_id);
          if (!user) {
            throw new Error('Associated user not found');
          }
          const role = user.role;
          const allowedDataTypes = {
            customer: ['order', 'booking', 'ride', 'parking_booking', 'room_booking', 'event'],
            merchant: ['order', 'booking', 'parking_booking', 'room_booking', 'event'],
            driver: ['ride', 'driver_availability', 'driver_delivery'],
            staff: ['in_dining_order', 'staff_task'],
            admin: ['admin_action', 'notification'],
          };
          if (!allowedDataTypes[role].includes(this.data_type)) {
            throw new Error(`Data type ${this.data_type} is not allowed for role ${role}`);
          }
        },
      },
    }
  );

  return OfflineCache;
};