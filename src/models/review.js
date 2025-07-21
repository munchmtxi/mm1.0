'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'reviewer' });
      Review.belongsTo(models.Merchant, { foreignKey: 'target_id', as: 'target_merchant', constraints: false, scope: { target_type: 'merchant' } });
      Review.belongsTo(models.Driver, { foreignKey: 'target_id', as: 'target_driver', constraints: false, scope: { target_type: 'driver' } });
      Review.belongsTo(models.MerchantBranch, { foreignKey: 'target_id', as: 'target_branch', constraints: false, scope: { target_type: 'branch' } });
      Review.belongsTo(models.Event, { foreignKey: 'target_id', as: 'target_event', constraints: false, scope: { target_type: 'event' } });
      Review.hasMany(models.ReviewInteraction, { foreignKey: 'review_id', as: 'interactions' });
    }
  }

  Review.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID of the customer creating the review',
    },
    service_type: {
      type: DataTypes.ENUM('order', 'in_dining_order', 'room_booking', 'ride', 'parking_booking', 'event', 'booking'),
      allowNull: false,
      comment: 'Type of service being reviewed',
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the service being reviewed (e.g., Order ID, Ride ID)',
    },
    target_type: {
      type: DataTypes.ENUM('merchant', 'driver', 'branch', 'event'),
      allowNull: false,
      comment: 'Type of entity being reviewed (merchant, driver, branch, or event)',
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the target entity (references Merchant, Driver, MerchantBranch, or Event)',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: { len: [0, 2000] },
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: { len: [0, 150] },
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidPhotos(value) {
          if (value) {
            if (!Array.isArray(value) || value.length > 10) {
              throw new Error('Invalid photos: Max 10 files allowed');
            }
            value.forEach(url => {
              const ext = url.split('.').pop().toLowerCase();
              if (!['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'].includes(ext)) {
                throw new Error('Unsupported file format');
              }
            });
          }
        },
      },
    },
    anonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
      comment: 'Managed by admin (PENDING, APPROVED, REJECTED)',
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
    modelName: 'Review',
    tableName: 'reviews',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['service_type', 'service_id'] },
      { fields: ['target_type', 'target_id'] },
      { fields: ['status'] },
    ],
    hooks: {
      beforeCreate: async (review) => {
        const customer = await sequelize.models.Customer.findByPk(review.customer_id);
        if (!customer) throw new Error('Invalid customer ID');
        if (review.target_type === 'merchant') {
          const merchant = await sequelize.models.Merchant.findByPk(review.target_id);
          if (!merchant) throw new Error('Invalid merchant target');
        } else if (review.target_type === 'driver') {
          const driver = await sequelize.models.Driver.findByPk(review.target_id);
          if (!driver) throw new Error('Invalid driver target');
        } else if (review.target_type === 'branch') {
          const branch = await sequelize.models.MerchantBranch.findByPk(review.target_id);
          if (!branch) throw new Error('Invalid branch target');
        } else if (review.target_type === 'event') {
          const event = await sequelize.models.Event.findByPk(review.target_id);
          if (!event) throw new Error('Invalid event target');
        }
        const serviceModel = {
          order: 'Order',
          in_dining_order: 'InDiningOrder',
          room_booking: 'RoomBooking',
          ride: 'Ride',
          parking_booking: 'ParkingBooking',
          event: 'Event',
          booking: 'Booking',
        }[review.service_type];
        if (serviceModel) {
          const service = await sequelize.models[serviceModel].findByPk(review.service_id);
          if (!service) throw new Error(`Invalid ${review.service_type} ID`);
        }
        const existingReview = await Review.findOne({
          where: { customer_id: review.customer_id, service_type: review.service_type, service_id: review.service_id },
        });
        if (existingReview) throw new Error('Review already submitted');
      },
    },
  });

  return Review;
};