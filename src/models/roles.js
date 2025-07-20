'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Role extends Model {
    static associate(models) {
      // One-to-many with BranchRole
      this.hasMany(models.BranchRole, { foreignKey: 'role_id', as: 'branchRoles' });
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
            args: [[
              'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
              'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
              'back_of_house', 'car_park_operative', 'front_desk', 'housekeeping', 'concierge',
              'ticket_agent', 'event_coordinator', 'customer', 'admin',
              'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery', 'parking_lot',
              'restaurant', 'accommodation_provider', 'ticket_provider'
            ]],
            msg: 'Invalid role',
          },
        },
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        validate: {
          isValidTypes(value) {
            const allowedStaffTypes = [
              'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
              'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
              'back_of_house', 'car_park_operative', 'front_desk', 'housekeeping', 'concierge',
              'ticket_agent', 'event_coordinator'
            ];
            const allowedMerchantTypes = [
              'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery', 'parking_lot',
              'restaurant', 'accommodation_provider', 'ticket_provider'
            ];
            if (value && !value.every(type => allowedStaffTypes.includes(type) || allowedMerchantTypes.includes(type))) {
              throw new Error('Invalid staff or merchant type');
            }
          },
        },
        comment: 'Array of staff or merchant types (e.g., ["server", "chef"] or ["restaurant", "cafe"])',
      },
      action: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        validate: {
          isValidActions(value) {
            const allowedActions = [
              // Server actions
              'serve_table', 'process_orders', 'manage_check_ins', 'handle_support_requests',
              'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues',
              // Host actions
              'manage_bookings', 'table_assignment',
              // Chef actions
              'view_orders', 'update_order_statuses', 'prepare_food', 'view_kitchen_inventory',
              // Manager actions
              'manage_staff', 'approve_withdrawals', 'view_analytics', 'audit_operations', 'train_staff',
              // Butcher actions
              'prepare_meat', 'customize_order', 'coordinate_suppliers',
              // Barista actions
              'prepare_beverage', 'prepare_food', 'assist_customers',
              // Stock Clerk actions
              'stock_shelves', 'verify_deliveries', 'report_discrepancies',
              // Picker actions
              'pick_order', 'handle_substitutions',
              // Cashier actions
              'process_checkout', 'view_transactions', 'process_refunds',
              // Driver actions
              'process_deliveries', 'verify_orders', 'monitor_parking',
              // Packager actions
              'package_order',
              // Event Staff actions
              'event_setup', 'serve_event',
              // Consultant actions
              'client_consultation', 'customize_menu', 'customize_stays', 'customize_tickets',
              // Front of House actions
              'coordinate_drivers', 'check_tickets',
              // Back of House actions
              'manage_supplies', 'process_delivery_packages', 'verify_driver_credentials',
              'view_restocking_alerts', 'manage_room_inventory', 'manage_ticket_inventory',
              // Car Park Operative actions
              'assist_parking', 'process_payments', 'report_issues',
              // Front Desk actions
              'process_check_in_out',
              // Housekeeping actions
              'clean_rooms', 'report_maintenance', 'update_room_status',
              // Concierge actions
              'provide_recommendations', 'coordinate_services',
              // Ticket Agent actions
              'process_ticket_sales',
              // Event Coordinator actions
              'coordinate_vendors', 'manage_ticket_bookings',
              // Admin actions
              'manage_users', 'view_reports', 'configure_system',
              // Customer actions
              'place_order', 'book_service', 'view_bookings'
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
      timestamps: true,
      indexes: [
        { unique: true, fields: ['name'], name: 'roles_name_unique' },
      ],
    }
  );

  return Role;
};