'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsToMany(models.Role, {
        through: 'UserRole',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles',
      });
      this.hasMany(models.Ride, { foreignKey: 'driver_id', as: 'rides' });
      this.hasMany(models.Order, { foreignKey: 'driver_id', as: 'orders' });
      this.hasMany(models.Event, { foreignKey: 'customer_id', as: 'events' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
      this.hasMany(models.DriverAvailability, { foreignKey: 'driver_id', as: 'availability' });
      this.hasMany(models.DriverEarnings, { foreignKey: 'driver_id', as: 'earnings' });
      this.hasMany(models.DriverPerformanceMetric, { foreignKey: 'driver_id', as: 'performanceMetrics' });
      this.hasMany(models.DriverRatings, { foreignKey: 'driver_id', as: 'ratings' });
      this.hasMany(models.DriverSafetyIncident, { foreignKey: 'driver_id', as: 'safetyIncidents' });
      this.hasMany(models.DriverSupportTicket, { foreignKey: 'driver_id', as: 'supportTickets' });
      this.hasMany(models.Vehicle, { foreignKey: 'driver_id', as: 'vehicles' });
      this.hasMany(models.Dispute, { foreignKey: 'driver_id', as: 'disputes' });
      this.belongsToMany(models.DeliveryHotspot, {
        through: 'DriverHotspotAssignments',
        foreignKey: 'driver_id',
        otherKey: 'hotspot_id',
        as: 'deliveryHotspots',
      });
      this.hasMany(models.Review, {
        foreignKey: 'target_id',
        as: 'reviews',
        constraints: false,
        scope: { target_type: 'driver' },
      });
      this.hasMany(models.ReviewInteraction, {
        foreignKey: 'interactor_id',
        as: 'review_interactions',
        constraints: false,
        scope: { interactor_type: 'driver' },
      });
      this.hasMany(models.Tip, { foreignKey: 'recipient_id', as: 'tips_received' });
    }
  }

  Driver.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      services: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: ['mtxi', 'munch', 'mevents'],
        validate: {
          isIn: {
            args: [['mtxi', 'munch', 'mevents']],
            msg: 'Invalid services',
          },
        },
      },
      status: {
        type: DataTypes.ENUM('available', 'on_ride', 'on_delivery', 'offline', 'pending_verification', 'suspended', 'banned'),
        allowNull: false,
        defaultValue: 'pending_verification',
      },
      vehicle_type: {
        type: DataTypes.ENUM('car', 'motorbike', 'bicycle', 'van', 'electric_scooter'),
        allowNull: false,
      },
      certifications: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        validate: {
          isValidCertifications(value) {
            const requiredCertifications = ['drivers_license', 'vehicle_insurance', 'food_safety_driver', 'background_check'];
            if (!Array.isArray(value)) {
              throw new Error('Certifications must be an array');
            }
            const invalidCert = value.find(cert => !requiredCertifications.includes(cert));
            if (invalidCert) {
              throw new Error(`Invalid certification: ${invalidCert}`);
            }
          },
        },
      },
      onboarding_status: {
        type: DataTypes.ENUM('pending', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      max_active_tasks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7,
        validate: { max: 7 },
      },
      kyc_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    },
    {
      sequelize,
      modelName: 'Driver',
      tableName: 'drivers',
      underscored: true,
      paranoid: true,
      validate: {
        maxVehicles() {
          if (this.vehicles && this.vehicles.length > 3) {
            throw new Error('Maximum vehicles per driver cannot exceed 3');
          }
        },
      },
    }
  );

  return Driver;
};