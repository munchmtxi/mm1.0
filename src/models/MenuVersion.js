'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuVersion extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    }
  }

  MenuVersion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' }
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchant_branches', key: 'id' },
      validate: {
        async isValidBranch(value) {
          if (value !== null) {
            const branch = await sequelize.models.MerchantBranch.findByPk(value);
            if (!branch) throw new Error('Invalid branch_id');
          }
        }
      }
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    service_type: {
      type: DataTypes.ENUM('munch', 'mpark', 'mstays', 'mtables', 'mtickets'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['munch', 'mpark', 'mstays', 'mtables', 'mtickets']],
          msg: 'Service type must be one of: munch, mpark, mstays, mtables, mtickets'
        }
      }
    },
    menu_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Snapshot of menu items, categories, modifiers, attributes',
      validate: {
        async validateMenuData(value) {
          if (!value.items || !Array.isArray(value.items)) {
            throw new Error('menu_data must contain an items array');
          }
          const validTags = {
            munch: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
            mpark: ['STANDARD', 'ACCESSIBLE', 'EV_CHARGING', 'OVERSIZED', 'PREMIUM', 'PRIVATE', 'MOTORBIKE'],
            mstays: ['STANDARD', 'SUITE', 'APARTMENT', 'VILLA', 'HOSTEL', 'ECO_LODGE', 'LUXURY', 'FAMILY', 'ACCESSIBLE'],
            mtables: ['INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BAR', 'PATIO', 'STANDARD', 'BOOTH', 'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'],
            mtickets: ['EVENT', 'ATTRACTION', 'TRANSPORT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'TOUR', 'THEATER']
          };
          const validUnits = {
            munch: ['piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'dozen', 'bottle', 'box'],
            mpark: ['space'],
            mstays: ['room'],
            mtables: ['seat'],
            mtickets: ['ticket']
          };
          for (const item of value.items) {
            if (!item.id || !item.name || !item.price || !item.service_type) {
              throw new Error('Menu item must include id, name, price, and service_type');
            }
            if (!validTags[item.service_type].includes(item.tag)) {
              throw new Error(`Invalid tag for ${item.service_type}: ${item.tag}`);
            }
            if (!validUnits[item.service_type].includes(item.measurement_unit)) {
              throw new Error(`Invalid measurement_unit for ${item.service_type}: ${item.measurement_unit}`);
            }
            if (item.service_type === 'mpark' && item.price < 0.5 || item.price > 75) {
              throw new Error('Parking space price must be between 0.5 and 75');
            }
            if (item.service_type === 'mstays' && item.price < 10 || item.price > 1000) {
              throw new Error('Room price must be between 10 and 1000');
            }
            if (item.service_type === 'mtickets' && item.price < 1 || item.price > 5000) {
              throw new Error('Ticket price must be between 1 and 5000');
            }
            if (item.service_type === 'mtables' && item.price < 5 || item.price > 1000) {
              throw new Error('Table booking price must be between 5 and 1000');
            }
          }
        }
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
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
    }
  }, {
    sequelize,
    modelName: 'MenuVersion',
    tableName: 'menu_versions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['merchant_id'] },
      { fields: ['branch_id'] },
      { fields: ['version_number'] },
      { fields: ['service_type'] }
    ]
  });

  return MenuVersion;
};