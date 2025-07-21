'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductDraft extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, { foreignKey: 'menu_item_id', as: 'menuItem', optional: true });
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
    }
  }

  ProductDraft.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'menu_inventories', key: 'id' }
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' }
    },
    draft_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        async validateDraftData(value) {
          if (!value.service_type || !['munch', 'mpark', 'mstays', 'mtables', 'mtickets'].includes(value.service_type)) {
            throw new Error('draft_data must include a valid service_type');
          }
          const validTags = {
            munch: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
            mpark: ['STANDARD', 'ACCESSIBLE', 'EV_CHARGING', 'OVERSIZED', 'PREMIUM', 'PRIVATE', 'MOTORBIKE'],
            mstays: ['STANDARD', 'SUITE', 'APARTMENT', 'VILLA', 'HOSTEL', 'ECO_LODGE', 'LUXURY', 'FAMILY', 'ACCESSIBLE'],
            mtables: ['INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BAR', 'PATIO', 'STANDARD', 'BOOTH', 'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'],
            mtickets: ['EVENT', 'ATTRACTION', 'TRANSPORT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'TOUR', 'THEATER']
          };
          if (value.tags && !value.tags.every(tag => validTags[value.service_type].includes(tag))) {
            throw new Error(`Invalid tags for ${value.service_type}`);
          }
          if (value.price) {
            const priceRanges = {
              munch: [0.5, 100],
              mpark: [0.5, 75],
              mstays: [10, 1000],
              mtables: [5, 1000],
              mtickets: [1, 5000]
            };
            const [min, max] = priceRanges[value.service_type];
            if (value.price < min || value.price > max) {
              throw new Error(`Price for ${value.service_type} must be between ${min} and ${max}`);
            }
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending_review', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'draft'
    },
    preview_key: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
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
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProductDraft',
    tableName: 'product_drafts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['menu_item_id'] },
      { fields: ['merchant_id'] },
      { fields: ['created_by'] },
      { unique: true, fields: ['preview_key'] }
    ],
    hooks: {
      afterCreate: async (draft, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: draft.menu_item_id,
              user_id: draft.created_by,
              action: `${draft.draft_data.service_type}_draft_create`,
              changes: {
                status: draft.status,
                draft_data: draft.draft_data
              }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating draft audit log:', error);
        }
      }
    }
  });

  return ProductDraft;
};