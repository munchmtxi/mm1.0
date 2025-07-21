'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuInventory extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.belongsTo(models.ProductCategory, { foreignKey: 'category_id', as: 'category' });
      this.hasMany(models.ProductModifier, { foreignKey: 'menu_item_id', as: 'modifiers' });
      this.hasMany(models.ProductAttribute, { foreignKey: 'menu_item_id', as: 'attributes' });
      this.hasMany(models.ProductDiscount, { foreignKey: 'menu_item_id', as: 'discounts' });
      this.hasMany(models.ProductAuditLog, { foreignKey: 'menu_item_id', as: 'auditLogs' });
      this.hasMany(models.InventoryAdjustmentLog, { foreignKey: 'menu_item_id', as: 'adjustmentLogs' });
      this.hasMany(models.InventoryAlert, { foreignKey: 'menu_item_id', as: 'alerts' });
      this.hasOne(models.ProductDraft, { foreignKey: 'menu_item_id', as: 'draft' });
      this.hasMany(models.OrderItem, { foreignKey: 'menu_item_id', as: 'orderItems' });
      this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      this.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updater' });
    }

    async calculateFinalPrice() {
      let self = this;
      if (!self.discounts) {
        self = await self.sequelize.models.MenuInventory.findByPk(self.id, {
          include: [{ model: self.sequelize.models.ProductDiscount, as: 'discounts' }]
        });
      }
      if (!self.discounts || self.discounts.length === 0) {
        return self.price;
      }

      const activeDiscounts = self.discounts.filter(discount => {
        const now = new Date();
        if (!discount.is_active) return false;
        if (discount.start_date && new Date(discount.start_date) > now) return false;
        if (discount.end_date && new Date(discount.end_date) < now) return false;
        return true;
      });

      if (activeDiscounts.length === 0) {
        return self.price;
      }

      let bestPrice = self.price;
      for (const discount of activeDiscounts) {
        let discountedPrice = self.price;
        if (discount.type === 'percentage') {
          discountedPrice = self.price * (1 - (discount.value / 100));
        } else if (discount.type === 'flat') {
          discountedPrice = self.price - discount.value;
        }
        if (discountedPrice < bestPrice) {
          bestPrice = discountedPrice;
        }
      }

      return Math.max(bestPrice, 0);
    }
  }

  MenuInventory.init({
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
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'product_categories', key: 'id' },
      validate: {
        async isValidCategory(value) {
          if (value !== null) {
            const category = await sequelize.models.ProductCategory.findByPk(value);
            if (!category) throw new Error('Invalid category_id');
          }
        }
      }
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        serviceSpecificPrice(value) {
          if (this.service_type === 'mpark' && (value < 0.5 || value > 75)) {
            throw new Error('Parking space price must be between 0.5 and 75');
          }
          if (this.service_type === 'mstays' && (value < 10 || value > 1000)) {
            throw new Error('Room price must be between 10 and 1000');
          }
          if (this.service_type === 'mtickets' && (value < 1 || value > 5000)) {
            throw new Error('Ticket price must be between 1 and 5000');
          }
          if (this.service_type === 'mtables' && (value < 5 || value > 1000)) {
            throw new Error('Table booking price must be between 5 and 1000');
          }
        }
      }
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 }
    },
    availability_status: {
      type: DataTypes.ENUM(
        'in-stock', 'out-of-stock', 'pre-order', // munch
        'AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', // mpark, mtables
        'AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'CLEANING', // mstays
        'AVAILABLE', 'RESERVED', 'SOLD', 'USED', 'CANCELLED', 'REFUNDED' // mtickets
      ),
      allowNull: false,
      defaultValue: 'in-stock',
      validate: {
        serviceSpecificStatus(value) {
          const validStatuses = {
            munch: ['in-stock', 'out-of-stock', 'pre-order'],
            mpark: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'],
            mstays: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'CLEANING'],
            mtables: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'],
            mtickets: ['AVAILABLE', 'RESERVED', 'SOLD', 'USED', 'CANCELLED', 'REFUNDED']
          };
          if (!validStatuses[this.service_type].includes(value)) {
            throw new Error(`Invalid availability_status for ${this.service_type}`);
          }
        }
      }
    },
    measurement_unit: {
      type: DataTypes.ENUM(
        'piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'dozen', 'bottle', 'box', // munch
        'space', // mpark
        'room', // mstays
        'seat', // mtables
        'ticket' // mtickets
      ),
      allowNull: false,
      defaultValue: 'piece',
      validate: {
        serviceSpecificUnit(value) {
          const validUnits = {
            munch: ['piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'dozen', 'bottle', 'box'],
            mpark: ['space'],
            mstays: ['room'],
            mtables: ['seat'],
            mtickets: ['ticket']
          };
          if (!validUnits[this.service_type].includes(value)) {
            throw new Error(`Invalid measurement_unit for ${this.service_type}`);
          }
        }
      }
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        serviceSpecificQuantity(value) {
          if (this.service_type === 'mpark' && value > 2000) {
            throw new Error('Parking spaces cannot exceed 2000 per lot');
          }
          if (this.service_type === 'mstays' && value > 1000) {
            throw new Error('Rooms cannot exceed 1000 per property');
          }
          if (this.service_type === 'mtables' && value > 30) {
            throw new Error('Table seats cannot exceed 30');
          }
          if (this.service_type === 'mtickets' && value > 10000) {
            throw new Error('Tickets cannot exceed 10000 per event');
          }
        }
      }
    },
    minimum_stock_level: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 }
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      validate: {
        validImages(value) {
          if (value && Array.isArray(value)) {
            value.forEach(img => {
              if (!img.url || !['jpg', 'png', 'jpeg'].includes(img.type)) {
                throw new Error('Invalid image format or missing URL');
              }
            });
          }
        }
      }
    },
    thumbnail_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    preparation_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        serviceSpecificPrepTime(value) {
          if (this.service_type === 'munch' && value && (value < 5 || value > 120)) {
            throw new Error('Food preparation time must be between 5 and 120 minutes');
          }
          if (this.service_type === 'mtables' && value && (value < 30 || value > 360)) {
            throw new Error('Table booking duration must be between 30 and 360 minutes');
          }
        }
      }
    },
    nutritional_info: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        serviceSpecificNutritional(value) {
          if (this.service_type !== 'munch' && value) {
            throw new Error('Nutritional info is only applicable for munch service');
          }
        }
      }
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      validate: {
        serviceSpecificTags(value) {
          const validTags = {
            munch: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
            mpark: ['STANDARD', 'ACCESSIBLE', 'EV_CHARGING', 'OVERSIZED', 'PREMIUM', 'PRIVATE', 'MOTORBIKE'],
            mstays: ['STANDARD', 'SUITE', 'APARTMENT', 'VILLA', 'HOSTEL', 'ECO_LODGE', 'LUXURY', 'FAMILY', 'ACCESSIBLE'],
            mtables: ['INDOOR', 'OUTDOOR', 'ROOFTOP', 'BALCONY', 'WINDOW', 'BAR', 'PATIO', 'STANDARD', 'BOOTH', 'HIGH_TOP', 'BAR', 'LOUNGE', 'PRIVATE', 'COMMUNAL'],
            mtickets: ['EVENT', 'ATTRACTION', 'TRANSPORT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'TOUR', 'THEATER']
          };
          if (value && Array.isArray(value)) {
            value.forEach(tag => {
              if (!validTags[this.service_type].includes(tag)) {
                throw new Error(`Invalid tag for ${this.service_type}: ${tag}`);
              }
            });
          }
        }
      }
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_taxable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    modelName: 'MenuInventory',
    tableName: 'menu_inventories',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['sku'], where: { deleted_at: null } },
      { fields: ['merchant_id'] },
      { fields: ['branch_id'] },
      { fields: ['category_id'] },
      { fields: ['service_type'] },
      { fields: ['availability_status'] },
      { fields: ['is_published'] },
      { fields: ['is_featured'] },
      { fields: ['created_at'] }
    ],
    hooks: {
      beforeCreate: async (product) => {
        if (!product.sku) {
          const prefix = product.merchant_id.toString().padStart(3, '0');
          const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
          product.sku = `${prefix}-${product.service_type}-${randomString}`;
        }
      },
      afterCreate: async (product, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: product.id,
              user_id: product.created_by,
              action: `${product.service_type}_create`,
              changes: {
                name: product.name,
                price: product.price,
                service_type: product.service_type,
                availability_status: product.availability_status
              }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating product audit log:', error);
        }
      },
      afterUpdate: async (product, options) => {
        try {
          if (options.transaction && product.changed && product.changed() && sequelize.models.ProductAuditLog) {
            const changedFields = {};
            product.changed().forEach(field => {
              changedFields[field] = product[field];
            });
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: product.id,
              user_id: product.updated_by || product.created_by,
              action: `${product.service_type}_update`,
              changes: changedFields
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating product update audit log:', error);
        }
      },
      afterDestroy: async (product, options) => {
        try {
          if (options.transaction && sequelize.models.ProductAuditLog) {
            await sequelize.models.ProductAuditLog.create({
              menu_item_id: product.id,
              user_id: options.deletedBy || product.updated_by || product.created_by,
              action: `${product.service_type}_delete`,
              changes: { deleted: true }
            }, { transaction: options.transaction });
          }
        } catch (error) {
          console.error('Error creating product deletion audit log:', error);
        }
      }
    }
  });

  return MenuInventory;
};