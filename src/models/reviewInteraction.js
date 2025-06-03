// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\models\reviewInteraction.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReviewInteraction extends Model {
    static associate(models) {
      this.belongsTo(models.Review, { foreignKey: 'review_id', as: 'review' });
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
    }
  }

  ReviewInteraction.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    review_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'reviews', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    action: {
      type: DataTypes.ENUM('upvote', 'comment'),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
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
    modelName: 'ReviewInteraction',
    tableName: 'review_interactions',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['review_id'] },
      { fields: ['customer_id'] },
      { fields: ['action'] },
    ],
  });

  return ReviewInteraction;
};