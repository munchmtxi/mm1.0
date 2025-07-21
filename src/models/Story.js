'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Story extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Booking, { foreignKey: 'service_id', as: 'booking', constraints: false });
      this.belongsTo(models.Order, { foreignKey: 'service_id', as: 'order', constraints: false });
      this.belongsTo(models.Ride, { foreignKey: 'service_id', as: 'ride', constraints: false });
      this.belongsTo(models.Event, { foreignKey: 'service_id', as: 'event', constraints: false });
      this.belongsTo(models.ParkingBooking, { foreignKey: 'service_id', as: 'parking', constraints: false });
      this.belongsTo(models.RoomBooking, { foreignKey: 'service_id', as: 'roomBooking', constraints: false }); // Added
    }
  }

  Story.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Stores media type and URL, e.g., { type: "image", url: "url" }',
      validate: {
        isValidMedia(value) {
          if (!value.type || !value.url) {
            throw new Error('Media must include type and URL');
          }
        }
      }
    },
    service_type: {
      type: DataTypes.ENUM('mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets'),
      allowNull: true,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isFutureDate(value) {
          if (new Date(value) <= new Date()) {
            throw new Error('Expiration must be in the future');
          }
        }
      }
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
    modelName: 'Story',
    tableName: 'stories',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['expires_at'] },
      { fields: ['service_type', 'service_id'] },
    ],
  });

  return Story;
};