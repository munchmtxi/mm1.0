'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductModifier extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, { foreignKey: 'menu_item_id', as: 'menuItem' });
      this.hasMany(models.ProductModifierOption, { foreignKey: 'modifier_id', as: 'options' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      this.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updater' });
    }
  }

  ProductModifier.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'menu_inventories', key: 'id' }
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        async serviceSpecificType(value) {
          const item = await sequelize.models.MenuInventory.findByPk(this.menu_item_id);
          if (!item) throw new Error('Invalid menu_item_id');
          const validTypes = {
            munch: ['size', 'topping', 'spice_level', 'cooking_preference', 'side', 'sauce', 'portion'],
            mpark: ['duration', 'access_type', 'vehicle_type'],
            mstays: ['bed_type', 'view', 'check_in_time', 'check_out_time', 'meal_plan'],
            mtables: ['seating_preference', 'duration', 'party_size'],
            mtickets: ['ticket_class', 'access_method', 'seat_preference']
          };
          if (!validTypes[item.service_type].includes(value)) {
            throw new Error(`Invalid modifier type for ${item.service_type}: ${value}`);
          }
        }
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    min_selections: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        async serviceSpecificMinSelections(value) {
          const item = await sequelize.models.MenuInventory.findByPk(this.menu_item_id);
          if (!item) throw new Error('Invalid menu_item_id');
          if (this.is_required && value < 1) {
            throw new Error('min_selections must be at least 1 if is_required is true');
          }
          if (item.service_type === 'munch' && value > 10) {
            throw new Error('min_selections for munch cannot exceed 10');
          }
        }
      }
    },
    max_selections: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        async serviceSpecificMaxSelections(value) {
          const item = await sequelize.models.MenuInventory.findByPk(this.menu_item_id);
          if (!item) throw new Error('Invalid menu_item_id');
          if (item.service_type === 'munch' && value > 30) {
            throw new Error('max_selections for munch cannot exceed 30');
          }
          if (this.min_selections !== null && value < this.min_selections) {
            throw new Error('max_selections must be greater than or equal to min_selections');
          }
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProductModifier',
    tableName: 'product_modifiers',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['menu_item_id'] },
      { fields: ['merchant_id'] },
      { fields: ['type'] },
      { fields: ['is_active'] }
    ],
    hooks: {
      afterCreate: async (modifier, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            const item = await sequelize.models.MenuInventory.findByPk(modifier.menu_item_id);
            if (item) {
              await sequelize.models.ProductAuditLog.create({
                menu_item_id: modifier.menu_item_id,
                user_id: modifier.created_by,
                action: `${item.service_type}_modifier_create`,
                changes: {
                  name: modifier.name,
                  type: modifier.type,
                  is_required: modifier.is_required
                }
              }, { transaction: options.transaction });
            }
          }
        } catch (error) {
          console.error('Error creating modifier audit log:', error);
        }
      },
      afterUpdate: async (modifier, options) => {
        try {
          if (options.transaction && modifier.changed && modifier.changed() && sequelize.models.ProductAuditLog) {
            const item = await sequelize.models.MenuInventory.findByPk(modifier.menu_item_id);
            if (item) {
              const changedFields = {};
              modifier.changed().forEach(field => {
                changedFields[field] = modifier[field];
              });
              await sequelize.models.ProductAuditLog.create({
                menu_item_id: modifier.menu_item_id,
                user_id: modifier.updated_by || modifier.created_by,
                action: `${item.service_type}_modifier_update`,
                changes: changedFields
              }, { transaction: options.transaction });
            }
          }
        } catch (error) {
          console.error('Error creating modifier update audit log:', error);
        }
      },
      afterDestroy: async (modifier, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            const item = await sequelize.models.MenuInventory.findByPk(modifier.menu_item_id);
            if (item) {
              await sequelize.models.ProductAuditLog.create({
                menu_item_id: modifier.menu_item_id,
                user_id: options.deletedBy || modifier.updated_by || modifier.created_by,
                action: `${item.service_type}_modifier_delete`,
                changes: { deleted: true }
              }, { transaction: options.transaction });
            }
          }
        } catch (error) {
          console.error('Error creating modifier deletion audit log:', error);
        }
      }
    }
  });

  return ProductModifier;
};