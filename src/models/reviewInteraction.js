'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReviewInteraction extends Model {
    static associate(models) {
      this.belongsTo(models.Review, { foreignKey: 'review_id', as: 'review' });
      this.belongsTo(models.Merchant, { foreignKey: 'interactor_id', as: 'merchant', constraints: false, scope: { interactor_type: 'merchant' } });
      this.belongsTo(models.Driver, { foreignKey: 'interactor_id', as: 'driver', constraints: false, scope: { interactor_type: 'driver' } });
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
    interactor_type: {
      type: DataTypes.ENUM('merchant', 'driver'),
      allowNull: false,
      comment: 'Type of entity interacting with the review (merchant or driver)',
    },
    interactor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the merchant or driver interacting with the review',
    },
    action: {
      type: DataTypes.ENUM('UPVOTE', 'COMMENT', 'SHARE'),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: { len: [0, 2000] },
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
      { fields: ['interactor_type', 'interactor_id'] },
      { fields: ['action'] },
    ],
    hooks: {
      beforeCreate: async (interaction) => {
        if (interaction.interactor_type === 'merchant') {
          const merchant = await sequelize.models.Merchant.findByPk(interaction.interactor_id);
          if (!merchant) throw new Error('Invalid merchant ID');
        } else if (interaction.interactor_type === 'driver') {
          const driver = await sequelize.models.Driver.findByPk(interaction.interactor_id);
          if (!driver) throw new Error('Invalid driver ID');
        }
        const review = await sequelize.models.Review.findByPk(interaction.review_id);
        if (!review || review.status !== 'APPROVED') throw new Error('Review not approved');
        if (interaction.action === 'COMMENT' && !interaction.comment) {
          throw new Error('Comment required for COMMENT action');
        }
        if (interaction.action === 'UPVOTE') {
          const existingUpvote = await ReviewInteraction.findOne({
            where: { review_id: interaction.review_id, interactor_type: interaction.interactor_type, interactor_id: interaction.interactor_id, action: 'UPVOTE' },
          });
          if (existingUpvote) throw new Error('Already upvoted');
        }
      },
    },
  });

  return ReviewInteraction;
};