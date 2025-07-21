'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductAttribute extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, { foreignKey: 'menu_item_id', as: 'menuItem' });
    }
  }

  ProductAttribute.init({
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        async serviceSpecificType(value) {
          const item = await sequelize.models.MenuInventory.findByPk(this.menu_item_id);
          if (!item) throw new Error('Invalid menu_item_id');
          const validTypes = {
            munch: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
            mpark: ['STANDARD', 'ACCESSIBLE', 'EV_CHARGING', 'OVERSIZED', 'PREMIUM', 'PRIVATE', 'MOTORBIKE', 'CCTV', 'GUARDED', 'GATED', 'LIGHTING', 'PATROLLED', 'BIOMETRIC', 'KEYPAD', 'TICKET', 'APP', 'LICENSE_PLATE', 'NFC', 'AUTOMATIC', 'MANUAL', 'OPEN'],
            mstays: ['STANDARD', 'SUITE', 'APARTMENT', 'VILLA', 'HOSTEL', 'ECO_LODGE', 'LUXURY', 'FAMILY', 'ACCESSIBLE', 'WIFI', 'AIR_CONDITIONING', 'HEATING', 'KITCHEN', 'PARKING', 'POOL', 'GYM', 'SPA', 'BREAKFAST', 'PET_FRIENDLY', 'EV_CHARGING', 'SUSTAINABLE', 'WORKSPACE', 'BALCONY', 'VIEW', 'LAUNDRY', 'CCTV', 'KEYCARD', 'SAFE', 'GUARDED', 'BIOMETRIC', 'SMART_LOCK'],
            mtables: ['INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BAR', 'PATIO', 'STANDARD', 'BOOTH', 'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'],
            mtickets: ['EVENT', 'ATTRACTION', 'TRANSPORT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'TOUR', 'THEATER', 'QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'PHYSICAL_TICKET', 'NFC']
          };
          if (!validTypes[item.service_type].includes(value)) {
            throw new Error(`Invalid attribute type for ${item.service_type}: ${value}`);
          }
        }
      }
    },
    value: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'ProductAttribute',
    tableName: 'product_attributes',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['menu_item_id'] }
    ]
  });

  return ProductAttribute;
};