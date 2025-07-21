'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Role extends Model {
    static associate(models) {
      this.belongsToMany(models.User, { through: 'UserRole', foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });
      this.hasMany(models.BranchRole, { foreignKey: 'role_id', as: 'branchRoles' });
      this.hasMany(models.Merchant, { foreignKey: 'role_id', as: 'merchants' }); // Added
    }
  }

  Role.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          isIn: {
            args: [['admin', 'customer', 'merchant', 'staff', 'driver']],
            msg: 'Invalid role',
          },
        },
      },
      staff_types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        validate: {
          isValidTypes(value) {
            const allowedStaffTypes = [
              'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
              'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
              'back_of_house', 'car_park_operative', 'front_desk', 'housekeeping', 'concierge',
              'ticket_agent', 'event_coordinator',
            ];
            if (value && !value.every(type => allowedStaffTypes.includes(type))) {
              throw new Error('Invalid staff type');
            }
          },
        },
        comment: 'Array of staff-specific roles (e.g., ["server", "chef"])',
      },
      merchant_types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        validate: {
          isValidTypes(value) {
            const allowedMerchantTypes = [
              'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery', 'parking_lot',
              'restaurant', 'accommodation_provider', 'ticket_provider',
            ];
            if (value && !value.every(type => allowedMerchantTypes.includes(type))) {
              throw new Error('Invalid merchant type');
            }
          },
        },
        comment: 'Array of merchant types for merchant role (e.g., ["restaurant", "cafe"])',
      },
      actions: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        validate: {
          isValidActions(value) {
            const allowedActions = [
              'serve_table', 'process_orders', 'manage_check_ins', 'handle_support_requests',
              'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues',
              'manage_bookings', 'table_assignment', 'view_orders', 'update_order_statuses',
              'prepare_food', 'view_kitchen_inventory', 'manage_staff', 'approve_withdrawals',
              'view_analytics', 'audit_operations', 'train_staff', 'prepare_meat', 'customize_order',
              'coordinate_suppliers', 'prepare_beverage', 'assist_customers', 'stock_shelves',
              'verify_deliveries', 'report_discrepancies', 'pick_order', 'handle_substitutions',
              'process_checkout', 'view_transactions', 'process_refunds', 'process_deliveries',
              'verify_orders', 'monitor_parking', 'package_order', 'event_setup', 'serve_event',
              'client_consultation', 'customize_menu', 'customize_stays', 'customize_tickets',
              'coordinate_drivers', 'check_tickets', 'manage_supplies', 'process_delivery_packages',
              'verify_driver_credentials', 'view_restocking_alerts', 'manage_room_inventory',
              'manage_ticket_inventory', 'assist_parking', 'process_payments', 'report_issues',
              'process_check_in_out', 'clean_rooms', 'report_maintenance', 'update_room_status',
              'provide_recommendations', 'coordinate_services', 'process_ticket_sales',
              'coordinate_vendors', 'manage_ticket_bookings', 'manage_users', 'view_reports',
              'configure_system', 'place_order', 'book_service', 'view_bookings',
            ];
            if (value && !value.every(action => allowedActions.includes(action))) {
              throw new Error('Invalid action');
            }
          },
        },
        comment: 'Array of actions associated with the role (e.g., ["serve_table", "process_orders"])',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Role',
      tableName: 'roles',
      underscored: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ['name'], name: 'roles_name_unique' },
      ],
    }
  );

  return Role;
};