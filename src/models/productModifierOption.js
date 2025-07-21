'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductModifierOption extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, { foreignKey: 'menu_item_id', as: 'menuItem' });
      this.belongsTo(models.ProductModifier, { foreignKey: 'modifier_id', as: 'modifier' });
    }
  }

  ProductModifierOption.init({
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
    modifier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'product_modifiers', key: 'id' }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        async serviceSpecificName(value) {
          const modifier = await sequelize.models.ProductModifier.findByPk(this.modifier_id, {
            include: [{ model: sequelize.models.MenuInventory, as: 'menuItem' }]
          });
          if (!modifier || !modifier.menuItem) throw new Error('Invalid modifier_id or menu_item_id');
          const validNames = {
            munch: {
              size: ['small', 'medium', 'large', 'extra_large'],
              topping: ['cheese', 'pepperoni', 'mushrooms', 'olives', 'peppers'],
              spice_level: ['mild', 'medium', 'hot', 'extra_hot'],
              cooking_preference: ['well_done', 'medium', 'rare'],
              side: ['fries', 'salad', 'soup'],
              sauce: ['tomato', 'pesto', 'alfredo'],
              portion: ['half', 'full']
            },
            mpark: {
              duration: ['1_hour', '2_hours', 'daily', 'weekly'],
              access_type: ['APP', 'TICKET', 'LICENSE_PLATE', 'NFC'],
              vehicle_type: ['car', 'motorbike', 'truck']
            },
            mstays: {
              bed_type: ['single', 'double', 'queen', 'king'],
              view: ['city', 'ocean', 'garden', 'mountain'],
              check_in_time: ['early', 'standard', 'late'],
              check_out_time: ['standard', 'late'],
              meal_plan: ['breakfast', 'half_board', 'full_board']
            },
            mtables: {
              seating_preference: ['window', 'booth', 'outdoor', 'private'],
              duration: ['1_hour', '2_hours', '3_hours'],
              party_size: ['2', '4', '6', '8', '10']
            },
            mtickets: {
              ticket_class: ['standard', 'vip', 'premium'],
              access_method: ['QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'PHYSICAL_TICKET'],
              seat_preference: ['front', 'middle', 'back', 'aisle', 'window']
            }
          };
          const serviceType = modifier.menuItem.service_type;
          const modifierType = modifier.type;
          if (!validNames[serviceType][modifierType].includes(value)) {
            throw new Error(`Invalid option name for ${serviceType} modifier ${modifierType}: ${value}`);
          }
        }
      }
    },
    additional_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        async serviceSpecificPrice(value) {
          const modifier = await sequelize.models.ProductModifier.findByPk(this.modifier_id, {
            include: [{ model: sequelize.models.MenuInventory, as: 'menuItem' }]
          });
          if (!modifier || !modifier.menuItem) throw new Error('Invalid modifier_id or menu_item_id');
          if (modifier.menuItem.service_type === 'munch' && value > 10) {
            throw new Error('Additional price for munch modifiers cannot exceed 10');
          }
          if (modifier.menuItem.service_type === 'mpark' && value > 20) {
            throw new Error('Additional price for mpark modifiers cannot exceed 20');
          }
          if (modifier.menuItem.service_type === 'mstays' && value > 50) {
            throw new Error('Additional price for mstays modifiers cannot exceed 50');
          }
          if (modifier.menuItem.service_type === 'mtables' && value > 30) {
            throw new Error('Additional price for mtables modifiers cannot exceed 30');
          }
          if (modifier.menuItem.service_type === 'mtickets' && value > 100) {
            throw new Error('Additional price for mtickets modifiers cannot exceed 100');
          }
        }
      }
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    max_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        async serviceSpecificMaxQuantity(value) {
          const modifier = await sequelize.models.ProductModifier.findByPk(this.modifier_id, {
            include: [{ model: sequelize.models.MenuInventory, as: 'menuItem' }]
          });
          if (!modifier || !modifier.menuItem) throw new Error('Invalid modifier_id or menu_item_id');
          if (modifier.menuItem.service_type === 'munch' && value > 30) {
            throw new Error('Max modifier quantity for munch cannot exceed 30');
          }
          if (modifier.menuItem.service_type === 'mpark' && value > 10) {
            throw new Error('Max modifier quantity for mpark cannot exceed 10');
          }
          if (modifier.menuItem.service_type === 'mstays' && value > 5) {
            throw new Error('Max modifier quantity for mstays cannot exceed 5');
          }
          if (modifier.menuItem.service_type === 'mtables' && value > 10) {
            throw new Error('Max modifier quantity for mtables cannot exceed 10');
          }
          if (modifier.menuItem.service_type === 'mtickets' && value > 20) {
            throw new Error('Max modifier quantity for mtickets cannot exceed 20');
          }
        }
      }
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
    }
  }, {
    sequelize,
    modelName: 'ProductModifierOption',
    tableName: 'product_modifier_options',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['menu_item_id'] },
      { fields: ['modifier_id'] }
    ],
    hooks: {
      afterCreate: async (option, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            const modifier = await sequelize.models.ProductModifier.findByPk(option.modifier_id, {
              include: [{ model: sequelize.models.MenuInventory, as: 'menuItem' }]
            });
            if (modifier && modifier.menuItem) {
              await sequelize.models.ProductAuditLog.create({
                menu_item_id: option.menu_item_id,
                user_id: modifier.created_by,
                action: `${modifier.menuItem.service_type}_modifier_option_create`,
                changes: {
                  name: option.name,
                  additional_price: option.additional_price,
                  modifier_type: modifier.type
                }
              }, { transaction: options.transaction });
            }
          }
        } catch (error) {
          console.error('Error creating modifier option audit log:', error);
        }
      },
      afterUpdate: async (option, options) => {
        try {
          if (options.transaction && option.changed && option.changed() && sequelize.models.ProductAuditLog) {
            const modifier = await sequelize.models.ProductModifier.findByPk(option.modifier_id, {
              include: [{ model: sequelize.models.MenuInventory, as: 'menuItem' }]
            });
            if (modifier && modifier.menuItem) {
              const changedFields = {};
              option.changed().forEach(field => {
                changedFields[field] = option[field];
              });
              await sequelize.models.ProductAuditLog.create({
                menu_item_id: option.menu_item_id,
                user_id: modifier.updated_by || modifier.created_by,
                action: `${modifier.menuItem.service_type}_modifier_option_update`,
                changes: changedFields
              }, { transaction: options.transaction });
            }
          }
        } catch (error) {
          console.error('Error creating modifier option update audit log:', error);
        }
      }
    }
  });

  return ProductModifierOption;
};