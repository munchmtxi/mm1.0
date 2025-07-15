'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.hasMany(models.PostReaction, { foreignKey: 'post_id', as: 'reactions' });
      this.belongsTo(models.Booking, { foreignKey: 'service_id', as: 'booking', constraints: false });
      this.belongsTo(models.Order, { foreignKey: 'service_id', as: 'order', constraints: false });
      this.belongsTo(models.Ride, { foreignKey: 'service_id', as: 'ride', constraints: false });
      this.belongsTo(models.Event, { foreignKey: 'service_id', as: 'event', constraints: false });
      this.belongsTo(models.ParkingBooking, { foreignKey: 'service_id', as: 'parking', constraints: false });
    }
  }

  Post.init({
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
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Stores media type and URLs, e.g., { type: "image", urls: ["url1", "url2"] }',
    },
    privacy: {
      type: DataTypes.ENUM('public', 'friends', 'private'),
      allowNull: false,
      defaultValue: 'public',
    },
    service_type: {
      type: DataTypes.ENUM('booking', 'order', 'ride', 'event', 'parking'),
      allowNull: true,
    },
    service_id: {
      type: DataTypes.INTEGER,
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
    modelName: 'Post',
    tableName: 'posts',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['service_type', 'service_id'] },
    ],
  });

  return Post;
};